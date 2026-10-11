'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const RetroalimentacionDAO = require('../modelado/dao/RetroalimentacionDAO');
const ActividadDAO = require('../modelado/dao/ActividadDAO');
const AutorizacionPractica = require('./AutorizacionPractica');

class RetroalimentacionController extends BaseController {
  constructor() {
    super();
    this.retros = new RetroalimentacionDAO();
    this.actividades = new ActividadDAO();
    this.acceso = new AutorizacionPractica();
  }

  async #actividad(req) {
    const act = await this.actividades.obtener(this.idParam(req, 'idActividad'));
    if (!act) throw ErrorHttp.noEncontrado('Actividad no encontrada');
    const practica = await this.acceso.cargar(req.usuario, act.idpractica);
    return { act, practica };
  }

  // GET /api/actividades/:idActividad/retroalimentaciones
  async listar(req, res) {
    const { act } = await this.#actividad(req);
    const filas = await this.retros.listarPorActividad(act.idactividad);
    this.ok(res, {
      retroalimentaciones: filas.map((r) => ({ id: r.idretro, rol: r.rolautor, texto: r.texto, fecha: r.fecha }))
    });
  }

  // POST /api/actividades/:idActividad/retroalimentaciones  { texto } — tutor/asesor asignado
  async crear(req, res) {
    const { act, practica } = await this.#actividad(req);
    if (!['tutor', 'asesor'].includes(req.usuario.rol)) throw ErrorHttp.prohibido('Solo el tutor o el asesor asignado pueden retroalimentar');
    const texto = this.texto(req.body?.texto, { campo: 'comentario', max: 2000 });
    const r = await this.retros.crear({ idActividad: act.idactividad, docAutor: req.usuario.numDocumento, rolAutor: req.usuario.rol, texto });
    this.auditar(req, { entidad: 'Retroalimentacion', idEntidad: r.idretro, idPractica: practica.idpractica, accion: 'Insertar' });
    this.ok(res, { retroalimentacion: { id: r.idretro, rol: r.rolautor, texto: r.texto, fecha: r.fecha } }, 201);
  }
}

module.exports = RetroalimentacionController;
