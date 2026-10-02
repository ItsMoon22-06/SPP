'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const PracticaDAO = require('../modelado/dao/PracticaDAO');
const ActividadDAO = require('../modelado/dao/ActividadDAO');
const UsuarioDAO = require('../modelado/dao/UsuarioDAO');
const NotificacionDAO = require('../modelado/dao/NotificacionDAO');
const AutorizacionPractica = require('./AutorizacionPractica');

const TOTAL_ACTIVIDADES = 6; // la vista del estudiante muestra 6 actividades por bitácora

class PracticaController extends BaseController {
  constructor() {
    super();
    this.practicas = new PracticaDAO();
    this.actividades = new ActividadDAO();
    this.usuarios = new UsuarioDAO();
    this.notificaciones = new NotificacionDAO();
    this.acceso = new AutorizacionPractica();
  }

  /** Formato que consumen las vistas. */
  static aVista(p) {
    return {
      id: p.idpractica, codigo: p.codigo, nombre: p.nombre, estado: p.estado,
      tipo: p.tipo || '', idTipo: p.idtipo, horas: p.horas, semestre: p.semestre,
      institucion: p.institucion || '', idInstitucion: p.idinstitucion,
      fechaInicio: p.fechainicio, fechaFin: p.fechafin,
      estudiante: p.estudiante, docEstudiante: p.docestudiante,
      tutor: p.tutor || '', docTutor: p.doctutor,
      asesor: p.asesor || '', docAsesor: p.docasesor,
      bitacora: {
        creada: p.bitacora_creada, notaFinal: p.notafinal, observacionGeneral: p.observaciongeneral, estado: p.estadobitacora
      },
      estudianteDetalle: { docTipo: p.est_doctipo, correo: p.est_correo, programa: p.est_programa, estado: p.est_estado }
    };
  }

  // GET /api/practicas  -> según el rol del usuario
  async listar(req, res) {
    const u = req.usuario;
    const filtro = {
      estudiante: { docEstudiante: u.numDocumento },
      tutor: { docTutor: u.numDocumento },
      asesor: { docAsesor: u.numDocumento },
      director: {}
    }[u.rol];
    const filas = await this.practicas.listar(filtro);
    this.ok(res, { practicas: filas.map(PracticaController.aVista) });
  }

  // GET /api/practicas/:id
  async obtener(req, res) {
    const p = await this.acceso.cargar(req.usuario, this.idParam(req));
    this.ok(res, { practica: PracticaController.aVista(p) });
  }

  // GET /api/practicas/:id/actividades
  async actividadesDe(req, res) {
    const p = await this.acceso.cargar(req.usuario, this.idParam(req));
    this.ok(res, { actividades: await this.actividades.listarPorPractica(p.idpractica) });
  }

  async #validar(b) {
    const d = {
      nombre: this.texto(b.nombre, { campo: 'nombre', max: 200, requerido: false }),
      idTipo: this.entero(b.idTipo, { campo: 'tipo de práctica' }),
      idInstitucion: this.entero(b.idInstitucion, { campo: 'institución' }),
      docEstudiante: this.texto(b.docEstudiante, { campo: 'estudiante', max: 20 }),
      docTutor: this.texto(b.docTutor, { campo: 'tutor', max: 20 }),
      docAsesor: this.texto(b.docAsesor, { campo: 'asesor', max: 20 }),
      fechaInicio: this.fecha(b.fechaInicio, 'fecha de inicio'),
      fechaFin: this.fecha(b.fechaFin, 'fecha final'),
      estado: ['activa', 'finalizada', 'cancelada'].includes(b.estado) ? b.estado : 'activa'
    };
    if (d.fechaFin < d.fechaInicio) throw ErrorHttp.solicitud('La fecha final no puede ser anterior a la fecha de inicio');

    // Cada documento debe existir y tener el rol correcto
    const [est, tut, ase] = await Promise.all([
      this.usuarios.buscarPorDocumento(d.docEstudiante), this.usuarios.buscarPorDocumento(d.docTutor), this.usuarios.buscarPorDocumento(d.docAsesor)
    ]);
    if (!est || est.rol !== 'estudiante' || est.estado !== 'activo') throw ErrorHttp.solicitud('El estudiante seleccionado no es válido o no está activo');
    if (!tut || tut.rol !== 'tutor' || tut.estado !== 'activo') throw ErrorHttp.solicitud('El tutor seleccionado no es válido o no está activo');
    if (!ase || ase.rol !== 'asesor' || ase.estado !== 'activo') throw ErrorHttp.solicitud('El asesor seleccionado no es válido o no está activo');
    return { d, est, tut, ase };
  }

  // POST /api/practicas  (Director)
  async crear(req, res) {
    const { d, est, tut, ase } = await this.#validar(req.body || {});
    if (!d.nombre) {
      const tipo = (await this.practicas.consultar('SELECT nombre FROM tipopractica WHERE idtipo=$1', [d.idTipo]))[0];
      if (!tipo) throw ErrorHttp.solicitud('Tipo de práctica no encontrado');
      d.nombre = tipo.nombre;
    }
    const id = await this.practicas.crear(d, TOTAL_ACTIVIDADES);
    this.auditar(req, { entidad: 'Practica', idEntidad: id, idPractica: id, accion: 'Insertar' });

    // Notificación "PracticaAsignada" a los tres participantes (MongoDB, microservicio de correo)
    const asunto = `Práctica asignada: ${d.nombre}`;
    for (const [persona, rolTxt] of [[est, 'estudiante'], [tut, 'tutor académico'], [ase, 'asesor pedagógico']]) {
      this.notificaciones.crearPracticaAsignada({
        destinatario: { numDocumento: persona.numdocumento, correo: persona.correo, nombreCompleto: `${persona.nombres} ${persona.apellidos}` },
        idPractica: id, asunto,
        contenido: `Se te asignó la práctica "${d.nombre}" como ${rolTxt}. Vigencia: ${d.fechaInicio} a ${d.fechaFin}.`
      });
    }
    const p = await this.practicas.obtener(id);
    this.ok(res, { practica: PracticaController.aVista(p) }, 201);
  }

  // PUT /api/practicas/:id  (Director)
  async actualizar(req, res) {
    const id = this.idParam(req);
    const existe = await this.practicas.obtener(id);
    if (!existe) throw ErrorHttp.noEncontrado('Práctica no encontrada');
    const { d } = await this.#validar(req.body || {});
    if (!d.nombre) d.nombre = existe.nombre;
    await this.practicas.actualizar(id, d);
    this.auditar(req, { entidad: 'Practica', idEntidad: id, idPractica: id, accion: 'Modificar' });
    this.ok(res, { practica: PracticaController.aVista(await this.practicas.obtener(id)) });
  }

  // DELETE /api/practicas/:id  (Director)
  async eliminar(req, res) {
    const id = this.idParam(req);
    if (!(await this.practicas.obtener(id))) throw ErrorHttp.noEncontrado('Práctica no encontrada');
    await this.practicas.eliminar(id);
    this.auditar(req, { entidad: 'Practica', idEntidad: id, idPractica: id, accion: 'Eliminar' });
    this.ok(res, { ok: true });
  }

  // PATCH /api/practicas/:id/bitacora  (Tutor asignado o Director)
  async actualizarBitacora(req, res) {
    const p = await this.acceso.cargar(req.usuario, this.idParam(req));
    if (!['tutor', 'director'].includes(req.usuario.rol)) throw ErrorHttp.prohibido();
    const b = req.body || {};
    let nota = null;
    if (b.notaFinal !== undefined && b.notaFinal !== null && b.notaFinal !== '') {
      nota = Number(b.notaFinal);
      if (Number.isNaN(nota) || nota < 0 || nota > 5) throw ErrorHttp.solicitud('La nota debe estar entre 0.0 y 5.0');
    }
    await this.practicas.actualizarBitacora(p.idpractica, {
      notaFinal: nota,
      observacionGeneral: this.texto(b.observacionGeneral, { campo: 'observación', max: 2000, requerido: false }) || null,
      estadoBitacora: ['activa', 'cerrada'].includes(b.estado) ? b.estado : null
    });
    this.auditar(req, { entidad: 'Bitacora', idEntidad: p.idpractica, idPractica: p.idpractica, accion: 'Modificar' });
    this.ok(res, { practica: PracticaController.aVista(await this.practicas.obtener(p.idpractica)) });
  }
}

module.exports = PracticaController;
