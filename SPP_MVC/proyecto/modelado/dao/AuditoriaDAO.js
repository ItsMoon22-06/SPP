'use strict';

/** Registra auditoría en MongoDB (base 1). Nunca debe romper la operación principal: si Mongo falla, solo avisa. */
class AuditoriaDAO {
  get modelo() {
    return require('../mongo/Auditoria');
  }

  /**
   * @param {{usuario:{numDocumento,rol,nombreCompleto}, entidad, idEntidad, idPractica, accion}} d
   * entidad ∈ Practica|Bitacora|Evidencia|Retroalimentacion|Respuesta|Usuario ; accion ∈ Insertar|Modificar|Eliminar
   */
  async registrar(d) {
    try {
      await this.modelo.create({ ...d, idEntidad: String(d.idEntidad), idPractica: d.idPractica ?? 0 });
    } catch (err) {
      console.warn('[auditoria] no se pudo registrar:', err.message);
    }
  }

  async listar({ idPractica, limite = 100 } = {}) {
    const filtro = idPractica ? { idPractica: Number(idPractica) } : {};
    return this.modelo.find(filtro).sort({ fecha: -1 }).limit(limite).lean();
  }
}

module.exports = AuditoriaDAO;
