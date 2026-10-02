'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const SupabaseCliente = require('../modelado/config/SupabaseCliente');
const Entorno = require('../modelado/config/Entorno');
const UsuarioDAO = require('../modelado/dao/UsuarioDAO');
const AuthMiddleware = require('./middleware/AuthMiddleware');

class AuthController extends BaseController {
  constructor() {
    super();
    this.usuarios = new UsuarioDAO();
  }

  /** "m.cardenas" -> "m.cardenas@universidad.edu.co"; si ya trae @, se respeta. */
  #aCorreo(usuario) {
    const u = usuario.trim().toLowerCase();
    return u.includes('@') ? u : `${u}@${Entorno.dominio}`;
  }

  /** POST /api/auth/login  { usuario, password, rol } */
  async login(req, res) {
    const { usuario, password, rol } = req.body || {};
    if (typeof usuario !== 'string' || typeof password !== 'string' || !usuario.trim() || !password) {
      throw ErrorHttp.solicitud('Ingresa tu usuario y contraseña');
    }
    if (!UsuarioDAO.ROLES.includes(rol)) throw ErrorHttp.solicitud('Selecciona un rol válido');
    if (usuario.length > 150 || password.length > 200) throw ErrorHttp.solicitud('Credenciales inválidas');

    // 1) Supabase valida usuario y contraseña
    const { data, error } = await SupabaseCliente.publico().auth.signInWithPassword({
      email: this.#aCorreo(usuario),
      password
    });
    if (error || !data?.session) throw ErrorHttp.noAutenticado('Usuario o contraseña incorrectos');

    // 2) La base de datos dice quién es y qué rol tiene
    const fila = await this.usuarios.buscarPorUid(data.user.id);
    if (!fila) throw ErrorHttp.prohibido('Tu cuenta no está registrada en el sistema de prácticas');
    if (fila.estado !== 'activo') throw ErrorHttp.prohibido('Tu cuenta no está activa. Comunícate con la Dirección de Prácticas');
    if (fila.rol !== rol) throw ErrorHttp.prohibido('El rol seleccionado no corresponde a tu cuenta');

    await this.usuarios.registrarAcceso(fila.rol, fila.numdocumento);
    AuthMiddleware.escribirSesion(res, data.session);
    this.ok(res, { rol: fila.rol, destino: `/HTML/${fila.rol}.html` });
  }

  /** POST /api/auth/logout */
  async logout(req, res) {
    const token = req.cookies?.[AuthMiddleware.COOKIE_ACCESO];
    if (token) {
      try { await SupabaseCliente.admin().auth.admin.signOut(token); } catch (_) { /* el token puede haber expirado */ }
    }
    AuthMiddleware.limpiarSesion(res);
    this.ok(res, { ok: true });
  }

  /** GET /api/auth/sesion */
  async sesion(req, res) {
    const u = req.usuario;
    this.ok(res, {
      rol: u.rol, nombres: u.nombres, apellidos: u.apellidos, docTipo: u.docTipo, docNumero: u.numDocumento,
      correo: u.correo, programa: u.programa, estado: u.estado
    });
  }
}

module.exports = AuthController;
