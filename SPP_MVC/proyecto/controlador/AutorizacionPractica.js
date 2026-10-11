'use strict';
const PracticaDAO = require('../modelado/dao/PracticaDAO');
const ErrorHttp = require('./ErrorHttp');

/**
 * Regla única de "quién puede tocar qué práctica", reutilizada por todos los controladores.
 *  - director: todo
 *  - estudiante: solo su práctica
 *  - tutor / asesor: solo las que tienen asignadas
 */
class AutorizacionPractica {
  constructor() {
    this.practicas = new PracticaDAO();
  }

  esParticipante(u, p) {
    switch (u.rol) {
      case 'director': return true;
      case 'estudiante': return p.docestudiante === u.numDocumento;
      case 'tutor': return p.doctutor === u.numDocumento;
      case 'asesor': return p.docasesor === u.numDocumento;
      default: return false;
    }
  }

  /** Carga la práctica y verifica acceso. Responde 404 (no 403) para no revelar la existencia. */
  async cargar(usuario, idPractica) {
    const p = await this.practicas.obtener(idPractica);
    if (!p || !this.esParticipante(usuario, p)) throw ErrorHttp.noEncontrado('Práctica no encontrada');
    return p;
  }
}

module.exports = AutorizacionPractica;
