'use strict';
const BaseDAO = require('./BaseDAO');

class ActividadDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  listarPorPractica(idPractica) {
    return this.consultar(
      `SELECT a.idactividad, a.idpractica, a.numero, a.titulo, a.descripcion,
              (SELECT COUNT(*)::int FROM evidenciaactividad ev WHERE ev.idactividad = a.idactividad) AS evidencias
         FROM actividad a WHERE a.idpractica = $1 ORDER BY a.numero`,
      [idPractica]
    );
  }

  obtener(idActividad) {
    return this.una('SELECT idactividad, idpractica, numero, titulo, descripcion FROM actividad WHERE idactividad = $1', [idActividad]);
  }
}

module.exports = ActividadDAO;
