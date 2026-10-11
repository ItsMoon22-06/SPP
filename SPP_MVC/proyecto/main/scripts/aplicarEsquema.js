'use strict';
// Uso: npm run esquema   -> crea las tablas propuestas en ambas bases de PostgreSQL (idempotente: IF NOT EXISTS)
const fs = require('fs');
const path = require('path');
const PostgresConexion = require('../../modelado/config/PostgresConexion');

(async () => {
  const dir = path.join(__dirname, '..', '..', 'modelado', 'sql');
  const trabajos = [['practica', 'schema_practica.sql'], ['evaluacion', 'schema_evaluacion.sql']];
  for (const [base, archivo] of trabajos) {
    await PostgresConexion.pool(base).query(fs.readFileSync(path.join(dir, archivo), 'utf8'));
    console.log(`OK  ${archivo} aplicado en la base "${base}"`);
  }
  await PostgresConexion.cerrar();
})().catch((e) => { console.error(e.message); process.exit(1); });
