'use strict';
const BaseDAO = require('./BaseDAO');

class TipoPracticaDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  listar() {
    return this.consultar('SELECT idtipo, codigo, nombre, semestre, horas FROM tipopractica ORDER BY codigo');
  }

  async crear(d) {
    return this.transaccion(async (c) => {
      const codigo = d.codigo || (await this.#siguienteCodigo(c));
      const r = await c.query(
        `INSERT INTO tipopractica (codigo, nombre, semestre, horas) VALUES ($1,$2,$3,$4)
         RETURNING idtipo, codigo, nombre, semestre, horas`,
        [codigo, d.nombre, d.semestre, d.horas]
      );
      return r.rows[0];
    });
  }

  async #siguienteCodigo(c) {
    const r = await c.query('SELECT COALESCE(MAX(idtipo),0) + 1 AS n FROM tipopractica');
    return `GTP-${String(r.rows[0].n).padStart(3, '0')}`;
  }

  actualizar(id, d) {
    return this.ejecutar('UPDATE tipopractica SET nombre=$2, semestre=$3, horas=$4 WHERE idtipo=$1', [id, d.nombre, d.semestre, d.horas]);
  }

  eliminar(id) {
    return this.ejecutar('DELETE FROM tipopractica WHERE idtipo=$1', [id]);
  }
}

module.exports = TipoPracticaDAO;
