'use strict';
const BaseDAO = require('./BaseDAO');

const COLS = `idpregunta, 'PRG-' || lpad(idpregunta::text, 3, '0') AS codigo, enunciado, tema, tipopractica, tipopregunta, valor, docautor, fecha`;

class PreguntaDAO extends BaseDAO {
  constructor() {
    super('evaluacion');
  }

  listar({ q, tema } = {}) {
    const cond = [];
    const params = [];
    if (tema && tema !== 'todas') { params.push(tema); cond.push(`tema = $${params.length}`); }
    if (q) { params.push(`%${q}%`); cond.push(`enunciado ILIKE $${params.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    return this.consultar(`SELECT ${COLS} FROM pregunta ${where} ORDER BY idpregunta DESC`, params);
  }

  obtener(id) {
    return this.una(`SELECT ${COLS} FROM pregunta WHERE idpregunta = $1`, [id]);
  }

  crear(d) {
    return this.una(
      `INSERT INTO pregunta (enunciado, tema, tipopractica, tipopregunta, valor, docautor)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${COLS}`,
      [d.enunciado, d.tema, d.tipoPractica, d.tipoPregunta, d.valor, d.docAutor]
    );
  }

  actualizar(id, d) {
    return this.ejecutar(
      'UPDATE pregunta SET enunciado=$2, tema=$3, tipopractica=$4, tipopregunta=$5, valor=$6 WHERE idpregunta=$1',
      [id, d.enunciado, d.tema, d.tipoPractica, d.tipoPregunta, d.valor]
    );
  }

  eliminar(id) {
    return this.ejecutar('DELETE FROM pregunta WHERE idpregunta=$1', [id]);
  }
}

module.exports = PreguntaDAO;
