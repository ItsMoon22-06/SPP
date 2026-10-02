'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const cloudinary = require('../modelado/config/CloudinaryConfig');
const EvidenciaDAO = require('../modelado/dao/EvidenciaDAO');
const ActividadDAO = require('../modelado/dao/ActividadDAO');
const AutorizacionPractica = require('./AutorizacionPractica');

const MIME_PERMITIDOS = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
]);
const MAX_BYTES = 10 * 1024 * 1024;

/** Evidencias de actividades: archivo en Cloudinary + metadatos en PostgreSQL (misma lógica que evidenciasRoutes.js). */
class EvidenciaController extends BaseController {
  constructor() {
    super();
    this.evidencias = new EvidenciaDAO();
    this.actividades = new ActividadDAO();
    this.acceso = new AutorizacionPractica();
  }

  static get MAX_BYTES() { return MAX_BYTES; }

  static filtroArchivo(_req, file, cb) {
    if (!MIME_PERMITIDOS.has(file.mimetype)) return cb(ErrorHttp.solicitud('Tipo de archivo no permitido (PDF, imágenes, Word, Excel, PowerPoint o texto)'));
    cb(null, true);
  }

  async #actividadAutorizada(req) {
    const act = await this.actividades.obtener(this.idParam(req, 'idActividad'));
    if (!act) throw ErrorHttp.noEncontrado('Actividad no encontrada');
    const practica = await this.acceso.cargar(req.usuario, act.idpractica);
    return { act, practica };
  }

  static aVista(f) {
    return { id: f.idevidencia, url: f.urlarchivo, nombre: f.nombrearchivo, descripcion: f.descripcion || '', fecha: f.fechasubida };
  }

  // GET /api/actividades/:idActividad/evidencias
  async listar(req, res) {
    const { act } = await this.#actividadAutorizada(req);
    const filas = await this.evidencias.listarPorActividad(act.idactividad);
    this.ok(res, { evidencias: filas.map(EvidenciaController.aVista) });
  }

  // POST /api/actividades/:idActividad/evidencias   (multipart: archivo, descripcion)  — solo el estudiante dueño
  async subir(req, res) {
    const { act, practica } = await this.#actividadAutorizada(req);
    if (req.usuario.rol !== 'estudiante') throw ErrorHttp.prohibido('Solo el estudiante puede subir evidencias');
    if (!req.file) throw ErrorHttp.solicitud('No se recibió ningún archivo');
    const descripcion = this.texto(req.body?.descripcion, { campo: 'descripción', max: 1000, requerido: false });
    const nombreOriginal = Buffer.from(req.file.originalname, 'latin1').toString('utf8').slice(0, 200);

    const subida = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `evidencias-practicas/${practica.idpractica}`, resource_type: 'auto' },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const idEvidencia = `EV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    try {
      await this.evidencias.crear({
        idEvidencia, urlArchivo: subida.secure_url, nombreArchivo: nombreOriginal, descripcion,
        idActividad: act.idactividad, publicId: subida.public_id, resourceType: subida.resource_type
      });
    } catch (err) {
      await cloudinary.uploader.destroy(subida.public_id, { resource_type: subida.resource_type }).catch(() => {});
      throw err;
    }
    this.auditar(req, { entidad: 'Evidencia', idEntidad: idEvidencia, idPractica: practica.idpractica, accion: 'Insertar' });
    const f = await this.evidencias.obtener(idEvidencia);
    this.ok(res, { mensaje: 'Evidencia subida correctamente', evidencia: EvidenciaController.aVista(f) }, 201);
  }

  async #propia(req) {
    const ev = await this.evidencias.obtener(String(req.params.idEvidencia).slice(0, 40));
    if (!ev) throw ErrorHttp.noEncontrado('Evidencia no encontrada');
    const practica = await this.acceso.cargar(req.usuario, ev.idpractica);
    if (!['estudiante', 'director'].includes(req.usuario.rol)) throw ErrorHttp.prohibido();
    return { ev, practica };
  }

  // PUT /api/evidencias/:idEvidencia  { descripcion }
  async editar(req, res) {
    const { ev, practica } = await this.#propia(req);
    const descripcion = this.texto(req.body?.descripcion, { campo: 'descripción', max: 1000, requerido: false });
    await this.evidencias.actualizarDescripcion(ev.idevidencia, descripcion);
    this.auditar(req, { entidad: 'Evidencia', idEntidad: ev.idevidencia, idPractica: practica.idpractica, accion: 'Modificar' });
    this.ok(res, { evidencia: EvidenciaController.aVista(await this.evidencias.obtener(ev.idevidencia)) });
  }

  // DELETE /api/evidencias/:idEvidencia
  async eliminar(req, res) {
    const { ev, practica } = await this.#propia(req);
    await this.evidencias.eliminar(ev.idevidencia);
    if (ev.publicid) {
      await cloudinary.uploader.destroy(ev.publicid, { resource_type: ev.resourcetype || 'image' }).catch((e) => console.warn('[cloudinary] destroy:', e.message));
    }
    this.auditar(req, { entidad: 'Evidencia', idEntidad: ev.idevidencia, idPractica: practica.idpractica, accion: 'Eliminar' });
    this.ok(res, { ok: true });
  }
}

module.exports = EvidenciaController;
