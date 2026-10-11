'use strict';
const { Pool, types } = require('pg');

// DATE (oid 1082) se entrega como texto 'AAAA-MM-DD' para evitar corrimientos de zona horaria
types.setTypeParser(1082, (v) => v);
const Entorno = require('./Entorno');

/**
 * Administra los pools de PostgreSQL (Neon). Singleton por base.
 *  - 'practica'   -> DATABASE_URL_ESTUDIANTE  (estudiante, practica, actividad, evidencias, retroalimentación...)
 *  - 'evaluacion' -> DATABASE_URL_EVALUACION  (pregunta, evaluacion, respuesta, retropregunta)
 */
class PostgresConexion {
  static #pools = new Map();

  static #variables = {
    practica: 'DATABASE_URL_ESTUDIANTE',
    evaluacion: 'DATABASE_URL_EVALUACION'
  };

  static pool(base) {
    if (!PostgresConexion.#variables[base]) throw new Error(`Base desconocida: ${base}`);
    if (!PostgresConexion.#pools.has(base)) {
      const pool = new Pool({
        connectionString: Entorno.requerir(PostgresConexion.#variables[base]),
        ssl: Entorno.obtener('DB_SSL', 'true') === 'false' ? false : { rejectUnauthorized: false }, // Neon exige SSL (DB_SSL=false solo para desarrollo local)
        max: 10,
        idleTimeoutMillis: 30000
      });
      pool.on('error', (err) => console.error(`[pg:${base}]`, err.message));
      PostgresConexion.#pools.set(base, pool);
    }
    return PostgresConexion.#pools.get(base);
  }

  static async cerrar() {
    await Promise.all([...PostgresConexion.#pools.values()].map((p) => p.end()));
    PostgresConexion.#pools.clear();
  }
}

module.exports = PostgresConexion;
