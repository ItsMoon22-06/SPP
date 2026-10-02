'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const SupabaseCliente = require('../modelado/config/SupabaseCliente');
const Entorno = require('../modelado/config/Entorno');
const UsuarioDAO = require('../modelado/dao/UsuarioDAO');

const ESTADOS = ['activo', 'pendiente', 'inactivo'];
const TIPOS_DOC = ['CC', 'TI', 'CE', 'PA'];

/** Gestión de usuarios (solo Director). Crea la cuenta en Supabase Auth y el perfil en PostgreSQL. */
class UsuarioController extends BaseController {
  constructor() {
    super();
    this.usuarios = new UsuarioDAO();
  }

  #validarClave(clave) {
    if (typeof clave !== 'string' || clave.length < 8 || clave.length > 72 ||
        !/[a-z]/.test(clave) || !/[A-Z]/.test(clave) || !/\d/.test(clave)) {
      throw ErrorHttp.solicitud('La contraseña debe tener 8 a 72 caracteres, con mayúscula, minúscula y número');
    }
    return clave;
  }

  #correo(valor) {
    const v = this.texto(valor, { campo: 'correo', max: 150 }).toLowerCase();
    const completo = v.includes('@') ? v : `${v}@${Entorno.dominio}`;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(completo)) throw ErrorHttp.solicitud('Correo inválido');
    return completo;
  }

  #datos(b, { conClave }) {
    const rol = b.rol;
    if (!UsuarioDAO.ROLES.includes(rol)) throw ErrorHttp.solicitud('Rol inválido');
    const estado = ESTADOS.includes(b.estado) ? b.estado : 'activo';
    const docTipo = TIPOS_DOC.includes(b.docTipo) ? b.docTipo : 'CC';
    const numDocumento = this.texto(b.docNumero, { campo: 'documento', max: 20 });
    if (!/^[0-9A-Za-z-]+$/.test(numDocumento)) throw ErrorHttp.solicitud('Documento inválido');
    const d = {
      rol, estado, docTipo, numDocumento,
      nombres: this.texto(b.nombres, { campo: 'nombres', max: 100 }),
      apellidos: this.texto(b.apellidos, { campo: 'apellidos', max: 100 }),
      programa: this.texto(b.programa, { campo: 'programa', max: 150, requerido: false })
    };
    if (conClave) {
      d.correo = this.#correo(b.correo);
      d.pass = this.#validarClave(b.pass);
    }
    return d;
  }

  // GET /api/usuarios?rol=&estado=&q=
  async listar(req, res) {
    const { rol, estado, q } = req.query;
    if (rol && !UsuarioDAO.ROLES.includes(rol)) throw ErrorHttp.solicitud('Rol inválido');
    if (estado && !ESTADOS.includes(estado)) throw ErrorHttp.solicitud('Estado inválido');
    const filas = await this.usuarios.listar({ rol, estado, q: typeof q === 'string' ? q.slice(0, 80) : undefined });
    this.ok(res, { usuarios: filas.map(UsuarioDAO.aVista) });
  }

  // GET /api/usuarios/programas
  async programas(_req, res) {
    this.ok(res, { programas: await this.usuarios.listarProgramas() });
  }

  // POST /api/usuarios
  async crear(req, res) {
    const d = this.#datos(req.body || {}, { conClave: true });
    if (await this.usuarios.buscarPorDocumento(d.numDocumento)) throw ErrorHttp.conflicto('Ya existe un usuario con ese documento');
    if (await this.usuarios.buscarPorCorreo(d.correo)) throw ErrorHttp.conflicto('Ya existe un usuario con ese correo');

    const admin = SupabaseCliente.admin();
    const { data, error } = await admin.auth.admin.createUser({
      email: d.correo,
      password: d.pass,
      email_confirm: true,
      app_metadata: { rol: d.rol },
      user_metadata: { nombres: d.nombres, apellidos: d.apellidos }
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw ErrorHttp.conflicto('Ese correo ya tiene cuenta de acceso');
      throw ErrorHttp.solicitud(`No se pudo crear la cuenta: ${error.message}`);
    }

    try {
      await this.usuarios.crear(d.rol, { ...d, supabaseUid: data.user.id });
    } catch (err) {
      // Compensación: si falla el perfil, se elimina la cuenta de Supabase para no dejar huérfanos
      await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
      throw err;
    }

    this.auditar(req, { entidad: 'Usuario', idEntidad: d.numDocumento, idPractica: 0, accion: 'Insertar' });
    const fila = await this.usuarios.buscarPorDocumento(d.numDocumento);
    this.ok(res, { usuario: UsuarioDAO.aVista(fila) }, 201);
  }

  // PUT /api/usuarios/:doc   (el rol y el correo no se cambian aquí)
  async actualizar(req, res) {
    const doc = this.texto(req.params.doc, { campo: 'documento', max: 20 });
    const actual = await this.usuarios.buscarPorDocumento(doc);
    if (!actual) throw ErrorHttp.noEncontrado('Usuario no encontrado');
    const d = this.#datos({ ...req.body, rol: actual.rol, docNumero: doc }, { conClave: false });
    if (actual.supabase_uid === req.usuario.uid && d.estado !== 'activo') throw ErrorHttp.conflicto('No puedes desactivar tu propia cuenta');

    await this.usuarios.actualizar(actual.rol, doc, d);

    // Si el Director envía una contraseña nueva, se actualiza en Supabase
    if (req.body.pass) {
      const { error } = await SupabaseCliente.admin().auth.admin.updateUserById(actual.supabase_uid, { password: this.#validarClave(req.body.pass) });
      if (error) throw ErrorHttp.solicitud(`No se pudo cambiar la contraseña: ${error.message}`);
    }
    this.auditar(req, { entidad: 'Usuario', idEntidad: doc, idPractica: 0, accion: 'Modificar' });
    this.ok(res, { usuario: UsuarioDAO.aVista(await this.usuarios.buscarPorDocumento(doc)) });
  }

  // PATCH /api/usuarios/:doc/estado  { estado }
  async cambiarEstado(req, res) {
    const doc = this.texto(req.params.doc, { campo: 'documento', max: 20 });
    const estado = req.body?.estado;
    if (!ESTADOS.includes(estado)) throw ErrorHttp.solicitud('Estado inválido');
    const actual = await this.usuarios.buscarPorDocumento(doc);
    if (!actual) throw ErrorHttp.noEncontrado('Usuario no encontrado');
    if (actual.supabase_uid === req.usuario.uid && estado !== 'activo') throw ErrorHttp.conflicto('No puedes desactivar tu propia cuenta');
    await this.usuarios.cambiarEstado(actual.rol, doc, estado);
    this.auditar(req, { entidad: 'Usuario', idEntidad: doc, idPractica: 0, accion: 'Modificar' });
    this.ok(res, { usuario: UsuarioDAO.aVista(await this.usuarios.buscarPorDocumento(doc)) });
  }

  // DELETE /api/usuarios/:doc
  async eliminar(req, res) {
    const doc = this.texto(req.params.doc, { campo: 'documento', max: 20 });
    const actual = await this.usuarios.buscarPorDocumento(doc);
    if (!actual) throw ErrorHttp.noEncontrado('Usuario no encontrado');
    if (actual.supabase_uid === req.usuario.uid) throw ErrorHttp.conflicto('No puedes eliminar tu propia cuenta');
    try {
      await this.usuarios.eliminar(actual.rol, doc);
    } catch (err) {
      if (err.code === '23503') throw ErrorHttp.conflicto('El usuario tiene prácticas asociadas. Desactívalo en lugar de eliminarlo');
      throw err;
    }
    if (actual.supabase_uid) {
      await SupabaseCliente.admin().auth.admin.deleteUser(actual.supabase_uid).catch((e) => console.warn('[supabase] deleteUser:', e.message));
    }
    this.auditar(req, { entidad: 'Usuario', idEntidad: doc, idPractica: 0, accion: 'Eliminar' });
    this.ok(res, { ok: true });
  }
}

module.exports = UsuarioController;
