'use strict';

/** Notificaciones (MongoDB base 2 / microservicio). Se guardan con fechaEnvio vacío hasta que el servicio de correo las envíe. */
class NotificacionDAO {
  get modelo() {
    return require('../mongo/Notificacion');
  }

  async crearPracticaAsignada({ destinatario, idPractica, asunto, contenido }) {
    try {
      return await this.modelo.create({ tipo: 'PracticaAsignada', destinatario, idPractica, asunto, contenido });
    } catch (err) {
      console.warn('[notificacion] no se pudo registrar:', err.message);
      return null;
    }
  }

  async listarPorDocumento(numDocumento, limite = 30) {
    try {
      return await this.modelo.find({ 'destinatario.numDocumento': numDocumento }).sort({ fechaCreacion: -1 }).limit(limite).lean();
    } catch (err) {
      console.warn('[notificacion] no se pudo listar:', err.message);
      return [];
    }
  }
}

module.exports = NotificacionDAO;
