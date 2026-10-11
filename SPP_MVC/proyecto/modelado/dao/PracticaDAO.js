'use strict';
const BaseDAO = require('./BaseDAO');

const SELECT_DETALLE = `
  SELECT p.idpractica, p.codigo, p.nombre, p.fechainicio, p.fechafin, p.estado,
         p.bitacora_creada, p.notafinal, p.observaciongeneral, p.estadobitacora,
         p.docestudiante, p.doctutor, p.docasesor, p.idtipo, p.idinstitucion,
         tp.nombre AS tipo, tp.horas, tp.semestre,
         i.nombre AS institucion,
         e.nombres || ' ' || e.apellidos AS estudiante, e.tipodocumento AS est_doctipo, e.correo AS est_correo,
         pr.nombre AS est_programa, e.estado AS est_estado,
         t.nombres || ' ' || t.apellidos AS tutor,
         a.nombres || ' ' || a.apellidos AS asesor
    FROM practica p
    JOIN estudiante e              ON e.numdocumento = p.docestudiante
    LEFT JOIN programa pr          ON pr.idprograma = e.idprograma
    LEFT JOIN tipopractica tp      ON tp.idtipo = p.idtipo
    LEFT JOIN institucion i        ON i.idinstitucion = p.idinstitucion
    LEFT JOIN tutoracademico t     ON t.numdocumento = p.doctutor
    LEFT JOIN asesorpedagogico a   ON a.numdocumento = p.docasesor`;

class PracticaDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  async obtener(id) {
    return this.una(`${SELECT_DETALLE} WHERE p.idpractica = $1`, [id]);
  }

  async listar({ docEstudiante, docTutor, docAsesor } = {}) {
    const cond = [];
    const params = [];
    if (docEstudiante) { params.push(docEstudiante); cond.push(`p.docestudiante = $${params.length}`); }
    if (docTutor) { params.push(docTutor); cond.push(`p.doctutor = $${params.length}`); }
    if (docAsesor) { params.push(docAsesor); cond.push(`p.docasesor = $${params.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    return this.consultar(`${SELECT_DETALLE} ${where} ORDER BY p.fechainicio DESC, p.idpractica DESC`, params);
  }

  /** Crea la práctica y sus N actividades iniciales en una sola transacción. */
  async crear(d, totalActividades = 6) {
    return this.transaccion(async (c) => {
      const codigo = d.codigo || (await this.#siguienteCodigo(c));
      const r = await c.query(
        `INSERT INTO practica (codigo, nombre, idtipo, idinstitucion, docestudiante, doctutor, docasesor, fechainicio, fechafin)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING idpractica`,
        [codigo, d.nombre, d.idTipo, d.idInstitucion, d.docEstudiante, d.docTutor || null, d.docAsesor || null, d.fechaInicio, d.fechaFin]
      );
      const id = r.rows[0].idpractica;
      for (let n = 1; n <= totalActividades; n++) {
        await c.query('INSERT INTO actividad (idpractica, numero, titulo) VALUES ($1,$2,$3)', [id, n, `Actividad #${n}`]);
      }
      return id;
    });
  }

  async #siguienteCodigo(cliente) {
    const r = await cliente.query(`SELECT COALESCE(MAX(idpractica),0) + 1 AS n FROM practica`);
    return `PRA-${new Date().getFullYear()}-${String(r.rows[0].n).padStart(4, '0')}`;
  }

  async actualizar(id, d) {
    return this.ejecutar(
      `UPDATE practica SET nombre=$2, idtipo=$3, idinstitucion=$4, docestudiante=$5, doctutor=$6, docasesor=$7,
              fechainicio=$8, fechafin=$9, estado=$10 WHERE idpractica=$1`,
      [id, d.nombre, d.idTipo, d.idInstitucion, d.docEstudiante, d.docTutor || null, d.docAsesor || null, d.fechaInicio, d.fechaFin, d.estado || 'activa']
    );
  }

  async actualizarBitacora(id, { notaFinal, observacionGeneral, estadoBitacora }) {
    return this.ejecutar(
      `UPDATE practica SET notafinal = $2, observaciongeneral = $3, estadobitacora = COALESCE($4, estadobitacora) WHERE idpractica=$1`,
      [id, notaFinal, observacionGeneral, estadoBitacora || null]
    );
  }

  async eliminar(id) {
    return this.ejecutar('DELETE FROM practica WHERE idpractica=$1', [id]);
  }
}

module.exports = PracticaDAO;
