'use strict';
const PostgresConexion = require('../config/PostgresConexion');

/**
 * Clase base de todos los DAO relacionales.
 * Solo se usan consultas parametrizadas ($1, $2...) -> sin riesgo de inyección SQL.
 */
class BaseDAO {
  /** @param {'practica'|'evaluacion'} base */
  constructor(base) {
    this.base = base;
  }

  get pool() {
    return PostgresConexion.pool(this.base);
  }

  async consultar(sql, params = []) {
    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async una(sql, params = []) {
    const rows = await this.consultar(sql, params);
    return rows[0] || null;
  }

  async ejecutar(sql, params = []) {
    const r = await this.pool.query(sql, params);
    return r.rowCount;
  }

  /** Ejecuta `fn(cliente)` dentro de una transacción (COMMIT / ROLLBACK automático). */
  async transaccion(fn) {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await fn(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw err;
    } finally {
      cliente.release();
    }
  }
}

module.exports = BaseDAO;
