'use strict';
const BaseDAO = require('./BaseDAO');

class EvidenciaDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  listarPorActividad(idActividad) {
    return this.consultar(
      `SELECT idevidencia, urlarchivo, nombrearchivo, descripcion, idactividad, fechasubida
         FROM evidenciaactividad WHERE idactividad = $1 ORDER BY fechasubida DESC`,
      [idActividad]
    );
  }

  /** Devuelve también la práctica dueña, para verificar permisos en el controlador. */
  obtener(idEvidencia) {
    return this.una(
      `SELECT ev.*, a.idpractica FROM evidenciaactividad ev JOIN actividad a ON a.idactividad = ev.idactividad
        WHERE ev.idevidencia = $1`,
      [idEvidencia]
    );
  }

  // Mismas columnas que el INSERT original de evidenciasRoutes.js (+ publicid/resourcetype)
  crear({ idEvidencia, urlArchivo, nombreArchivo, descripcion, idActividad, publicId, resourceType }) {
    return this.ejecutar(
      `INSERT INTO evidenciaactividad (idevidencia, urlarchivo, nombrearchivo, descripcion, idactividad, publicid, resourcetype)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [idEvidencia, urlArchivo, nombreArchivo, descripcion, idActividad, publicId, resourceType]
    );
  }

  actualizarDescripcion(idEvidencia, descripcion) {
    return this.ejecutar('UPDATE evidenciaactividad SET descripcion = $2 WHERE idevidencia = $1', [idEvidencia, descripcion]);
  }

  eliminar(idEvidencia) {
    return this.ejecutar('DELETE FROM evidenciaactividad WHERE idevidencia = $1', [idEvidencia]);
  }
}

module.exports = EvidenciaDAO;
