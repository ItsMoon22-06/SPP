'use strict';
const BaseDAO = require('./BaseDAO');

class RetroalimentacionDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  listarPorActividad(idActividad) {
    return this.consultar(
      `SELECT idretro, idactividad, docautor, rolautor, texto, fecha
         FROM retroalimentacion WHERE idactividad = $1 ORDER BY fecha DESC`,
      [idActividad]
    );
  }

  async crear({ idActividad, docAutor, rolAutor, texto }) {
    const f = await this.una(
      `INSERT INTO retroalimentacion (idactividad, docautor, rolautor, texto) VALUES ($1,$2,$3,$4)
       RETURNING idretro, idactividad, docautor, rolautor, texto, fecha`,
      [idActividad, docAutor, rolAutor, texto]
    );
    return f;
  }
}

module.exports = RetroalimentacionDAO;
