'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const InstitucionDAO = require('../modelado/dao/InstitucionDAO');
const TipoPracticaDAO = require('../modelado/dao/TipoPracticaDAO');

/** Instituciones y tipos de práctica (catálogos que administra el Director). */
class CatalogoController extends BaseController {
  constructor() {
    super();
    this.instituciones = new InstitucionDAO();
    this.tipos = new TipoPracticaDAO();
  }

  #violacion(err, mensaje) {
    if (err.code === '23505') throw ErrorHttp.conflicto(mensaje);
    if (err.code === '23503') throw ErrorHttp.conflicto('Está en uso por una o más prácticas y no se puede eliminar');
    throw err;
  }

  // ---------- Instituciones ----------
  async listarInstituciones(_req, res) {
    this.ok(res, { instituciones: await this.instituciones.listar() });
  }

  #datosInstitucion(b) {
    const correo = this.texto(b.correo, { campo: 'correo', max: 150 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw ErrorHttp.solicitud('Correo inválido');
    return {
      nit: this.texto(b.nit, { campo: 'NIT', max: 30 }),
      nombre: this.texto(b.nombre, { campo: 'nombre', max: 200 }),
      encargado: this.texto(b.encargado, { campo: 'encargado', max: 150 }),
      direccion: this.texto(b.direccion, { campo: 'dirección', max: 200 }),
      correo
    };
  }

  async crearInstitucion(req, res) {
    try {
      this.ok(res, { institucion: await this.instituciones.crear(this.#datosInstitucion(req.body || {})) }, 201);
    } catch (e) { this.#violacion(e, 'Ya existe una institución con ese NIT'); }
  }

  async actualizarInstitucion(req, res) {
    const id = this.idParam(req);
    try {
      if (!(await this.instituciones.actualizar(id, this.#datosInstitucion(req.body || {})))) throw ErrorHttp.noEncontrado('Institución no encontrada');
    } catch (e) { if (e instanceof ErrorHttp) throw e; this.#violacion(e, 'Ya existe una institución con ese NIT'); }
    this.ok(res, { institucion: await this.instituciones.obtener(id) });
  }

  async eliminarInstitucion(req, res) {
    try {
      if (!(await this.instituciones.eliminar(this.idParam(req)))) throw ErrorHttp.noEncontrado('Institución no encontrada');
    } catch (e) { if (e instanceof ErrorHttp) throw e; this.#violacion(e); }
    this.ok(res, { ok: true });
  }

  // ---------- Tipos de práctica ----------
  async listarTipos(_req, res) {
    this.ok(res, { tipos: await this.tipos.listar() });
  }

  #datosTipo(b) {
    return {
      nombre: this.texto(b.nombre, { campo: 'nombre', max: 150 }),
      semestre: this.entero(b.semestre, { campo: 'semestre', min: 1, max: 12 }),
      horas: this.entero(b.horas, { campo: 'horas', min: 1, max: 5000 })
    };
  }

  async crearTipo(req, res) {
    try {
      this.ok(res, { tipo: await this.tipos.crear(this.#datosTipo(req.body || {})) }, 201);
    } catch (e) { this.#violacion(e, 'Ya existe un tipo con ese código'); }
  }

  async actualizarTipo(req, res) {
    if (!(await this.tipos.actualizar(this.idParam(req), this.#datosTipo(req.body || {})))) throw ErrorHttp.noEncontrado('Tipo no encontrado');
    this.ok(res, { ok: true });
  }

  async eliminarTipo(req, res) {
    try {
      if (!(await this.tipos.eliminar(this.idParam(req)))) throw ErrorHttp.noEncontrado('Tipo no encontrado');
    } catch (e) { if (e instanceof ErrorHttp) throw e; this.#violacion(e); }
    this.ok(res, { ok: true });
  }
}

module.exports = CatalogoController;
