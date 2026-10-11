'use strict';
const SupabaseCliente = require('../../modelado/config/SupabaseCliente');
const Entorno = require('../../modelado/config/Entorno');
const UsuarioDAO = require('../../modelado/dao/UsuarioDAO');
const ErrorHttp = require('../ErrorHttp');

const COOKIE_ACCESO = 'spp_at';
const COOKIE_REFRESCO = 'spp_rt';
const TTL_CACHE_MS = 60 * 1000;

/**
 * Autenticación con Supabase Auth.
 * El navegador solo guarda el JWT en una cookie httpOnly (JavaScript de las vistas no puede leerlo).
 * El rol y el estado SIEMPRE se leen de la base de datos (fuente de verdad), no del token.
 */
class AuthMiddleware {
  constructor() {
    this.usuarios = new UsuarioDAO();
    this.cache = new Map(); // token -> { uid, hasta }
  }

  static opcionesCookie(maxAgeMs) {
    return { httpOnly: true, sameSite: 'lax', secure: Entorno.produccion, path: '/', maxAge: maxAgeMs };
  }

  static escribirSesion(res, sesion) {
    res.cookie(COOKIE_ACCESO, sesion.access_token, AuthMiddleware.opcionesCookie((sesion.expires_in || 3600) * 1000));
    res.cookie(COOKIE_REFRESCO, sesion.refresh_token, AuthMiddleware.opcionesCookie(30 * 24 * 3600 * 1000));
  }

  static limpiarSesion(res) {
    res.clearCookie(COOKIE_ACCESO, { path: '/' });
    res.clearCookie(COOKIE_REFRESCO, { path: '/' });
  }

  /** Devuelve el uid de Supabase para un token (con caché corta) o null. */
  async #uidDeToken(token) {
    const c = this.cache.get(token);
    if (c && c.hasta > Date.now()) return c.uid;
    const { data, error } = await SupabaseCliente.publico().auth.getUser(token);
    if (error || !data?.user) return null;
    this.cache.set(token, { uid: data.user.id, hasta: Date.now() + TTL_CACHE_MS });
    if (this.cache.size > 5000) this.cache.clear();
    return data.user.id;
  }

  /** Intenta resolver la sesión (renovando con el refresh token si hace falta). No responde: solo llena req.usuario. */
  async resolver(req, res) {
    let uid = null;
    const acceso = req.cookies?.[COOKIE_ACCESO];
    if (acceso) uid = await this.#uidDeToken(acceso);

    if (!uid && req.cookies?.[COOKIE_REFRESCO]) {
      const { data, error } = await SupabaseCliente.publico().auth.refreshSession({ refresh_token: req.cookies[COOKIE_REFRESCO] });
      if (!error && data?.session) {
        AuthMiddleware.escribirSesion(res, data.session);
        uid = data.user?.id || data.session.user?.id || null;
      }
    }
    if (!uid) return null;

    const fila = await this.usuarios.buscarPorUid(uid);
    if (!fila || fila.estado !== 'activo') return null;
    return {
      uid,
      rol: fila.rol,
      numDocumento: fila.numdocumento,
      docTipo: fila.tipodocumento,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      correo: fila.correo,
      programa: fila.programa || '',
      estado: fila.estado
    };
  }

  /** Para endpoints /api: 401 si no hay sesión. */
  api = async (req, res, next) => {
    try {
      const u = await this.resolver(req, res);
      if (!u) return next(ErrorHttp.noAutenticado());
      req.usuario = u;
      next();
    } catch (err) { next(err); }
  };

  /** Para páginas HTML: redirige al login. */
  pagina = async (req, res, next) => {
    try {
      const u = await this.resolver(req, res);
      if (!u) return res.redirect('/index.html');
      req.usuario = u;
      next();
    } catch (err) { next(err); }
  };

  /** Autorización por rol. */
  static rol(...roles) {
    return (req, _res, next) => (roles.includes(req.usuario?.rol) ? next() : next(ErrorHttp.prohibido()));
  }

  /**
   * Mitigación CSRF: toda petición que modifica datos debe traer la cabecera X-SPP.
   * Un sitio externo no puede enviarla (no hay CORS habilitado) y las cookies son SameSite=Lax.
   */
  static csrf(req, _res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('X-SPP') !== '1') return next(ErrorHttp.prohibido('Petición no permitida'));
    next();
  }
}

AuthMiddleware.COOKIE_ACCESO = COOKIE_ACCESO;
AuthMiddleware.COOKIE_REFRESCO = COOKIE_REFRESCO;
module.exports = AuthMiddleware;
