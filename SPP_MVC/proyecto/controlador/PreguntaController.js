'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const PreguntaDAO = require('../modelado/dao/PreguntaDAO');
const RespuestaDAO = require('../modelado/dao/RespuestaDAO');
const AutorizacionPractica = require('./AutorizacionPractica');

const TEMAS = ['pedagogia', 'didactica', 'evaluacion'];
const TIPOS_PREGUNTA = ['abierta', 'opcion-multiple', 'verdadero-falso'];

/** Banco de preguntas (tutor/director) + preguntas asignadas a una práctica y sus respuestas (estudiante). */
class PreguntaController extends BaseController {
  constructor() {
    super();
    this.preguntas = new PreguntaDAO();
    this.respuestas = new RespuestaDAO();
    this.acceso = new AutorizacionPractica();
  }

  static preguntaAVista(p) {
    return {
      id: p.idpregunta, codigo: p.codigo, enunciado: p.enunciado, tema: p.tema, tipoPractica: p.tipopractica,
      tipoPregunta: p.tipopregunta, valor: p.valor, fecha: p.fecha
    };
  }

  #datos(b) {
    const tema = TEMAS.includes(b.tema) ? b.tema : null;
    if (!tema) throw ErrorHttp.solicitud('Selecciona un tema válido');
    const tipoPregunta = TIPOS_PREGUNTA.includes(b.tipoPregunta) ? b.tipoPregunta : null;
    if (!tipoPregunta) throw ErrorHttp.solicitud('Selecciona un tipo de pregunta válido');
    return {
      enunciado: this.texto(b.enunciado, { campo: 'enunciado', max: 2000 }),
      tema, tipoPregunta,
      tipoPractica: this.texto(b.tipoPractica, { campo: 'tipo de práctica', max: 30, requerido: false }) || null,
      valor: this.entero(b.valor, { campo: 'valor', min: 1, max: 5 })
    };
  }

  // ---------- Banco ----------
  // GET /api/preguntas?q=&tema=
  async listar(req, res) {
    const { q, tema } = req.query;
    const filas = await this.preguntas.listar({
      q: typeof q === 'string' ? q.slice(0, 100) : undefined,
      tema: TEMAS.includes(tema) ? tema : undefined
    });
    this.ok(res, { preguntas: filas.map(PreguntaController.preguntaAVista) });
  }

  // POST /api/preguntas
  async crear(req, res) {
    const p = await this.preguntas.crear({ ...this.#datos(req.body || {}), docAutor: req.usuario.numDocumento });
    this.ok(res, { pregunta: PreguntaController.preguntaAVista(p) }, 201);
  }

  // PUT /api/preguntas/:id
  async actualizar(req, res) {
    const id = this.idParam(req);
    if (!(await this.preguntas.actualizar(id, this.#datos(req.body || {})))) throw ErrorHttp.noEncontrado('Pregunta no encontrada');
    this.ok(res, { pregunta: PreguntaController.preguntaAVista(await this.preguntas.obtener(id)) });
  }

  // DELETE /api/preguntas/:id
  async eliminar(req, res) {
    if (!(await this.preguntas.eliminar(this.idParam(req)))) throw ErrorHttp.noEncontrado('Pregunta no encontrada');
    this.ok(res, { ok: true });
  }

  // ---------- Preguntas de una práctica ----------
  // POST /api/practicas/:id/preguntas { idPregunta }   (tutor asignado / director)
  async asignar(req, res) {
    const practica = await this.acceso.cargar(req.usuario, this.idParam(req));
    const idPregunta = this.entero(req.body?.idPregunta, { campo: 'pregunta' });
    if (!(await this.preguntas.obtener(idPregunta))) throw ErrorHttp.noEncontrado('Pregunta no encontrada');
    const r = await this.respuestas.asignarPregunta(practica.idpractica, idPregunta);
    this.ok(res, { idRespuesta: r.idrespuesta }, 201);
  }

  static respuestaAVista(r, indice) {
    return {
      id: r.idrespuesta, numero: indice + 1, idPregunta: r.idpregunta, enunciado: r.enunciado, tema: r.tema, valor: r.valor,
      respuesta: r.texto || '', estado: r.estado, observacion: r.observacion || ''
    };
  }

  // GET /api/practicas/:id/preguntas
  async deLaPractica(req, res) {
    const practica = await this.acceso.cargar(req.usuario, this.idParam(req));
    const filas = await this.respuestas.listarPorPractica(practica.idpractica);
    this.ok(res, { preguntas: filas.map(PreguntaController.respuestaAVista) });
  }

  async #respuestaAutorizada(req) {
    const r = await this.respuestas.obtener(this.idParam(req, 'idRespuesta'));
    if (!r) throw ErrorHttp.noEncontrado('Pregunta no encontrada');
    const practica = await this.acceso.cargar(req.usuario, r.idpractica);
    return { r, practica };
  }

  // PUT /api/respuestas/:idRespuesta { texto, enviar }   — estudiante dueño
  async responder(req, res) {
    const { r, practica } = await this.#respuestaAutorizada(req);
    if (req.usuario.rol !== 'estudiante') throw ErrorHttp.prohibido('Solo el estudiante puede responder');
    const enviar = req.body?.enviar === true;
    const texto = this.texto(req.body?.texto, { campo: 'respuesta', max: 5000, requerido: enviar });
    await this.respuestas.guardar(r.idrespuesta, texto, enviar ? 'respondida' : (texto ? 'borrador' : 'pendiente'));
    this.auditar(req, { entidad: 'Respuesta', idEntidad: r.idrespuesta, idPractica: practica.idpractica, accion: 'Modificar' });
    this.ok(res, { ok: true, estado: enviar ? 'respondida' : 'borrador' });
  }

  // POST /api/respuestas/:idRespuesta/retro { texto }   — tutor asignado
  async retroalimentar(req, res) {
    const { r, practica } = await this.#respuestaAutorizada(req);
    if (req.usuario.rol !== 'tutor') throw ErrorHttp.prohibido('Solo el tutor asignado puede retroalimentar preguntas');
    const retro = await this.respuestas.crearRetro(r.idrespuesta, req.usuario.numDocumento, this.texto(req.body?.texto, { campo: 'comentario', max: 2000 }));
    this.auditar(req, { entidad: 'Retroalimentacion', idEntidad: retro.idretro, idPractica: practica.idpractica, accion: 'Insertar' });
    this.ok(res, { retro }, 201);
  }
}

module.exports = PreguntaController;
