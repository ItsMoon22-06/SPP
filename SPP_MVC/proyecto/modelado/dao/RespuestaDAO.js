'use strict';
const BaseDAO = require('./BaseDAO');

/** Evaluación de una práctica + sus preguntas asignadas, respuestas y retroalimentación de preguntas. */
class RespuestaDAO extends BaseDAO {
  constructor() {
    super('evaluacion');
  }

  async asegurarEvaluacion(idPractica) {
    const f = await this.una(
      `INSERT INTO evaluacion (idpractica) VALUES ($1)
       ON CONFLICT (idpractica) DO UPDATE SET idpractica = EXCLUDED.idpractica RETURNING idevaluacion`,
      [idPractica]
    );
    return f.idevaluacion;
  }

  /** Asigna una pregunta del banco a la práctica (idempotente). */
  async asignarPregunta(idPractica, idPregunta) {
    const idEvaluacion = await this.asegurarEvaluacion(idPractica);
    return this.una(
      `INSERT INTO respuesta (idevaluacion, idpregunta) VALUES ($1,$2)
       ON CONFLICT (idevaluacion, idpregunta) DO UPDATE SET idpregunta = EXCLUDED.idpregunta
       RETURNING idrespuesta`,
      [idEvaluacion, idPregunta]
    );
  }

  listarPorPractica(idPractica) {
    return this.consultar(
      `SELECT r.idrespuesta, r.texto, r.estado, r.fecha,
              p.idpregunta, p.enunciado, p.tema, p.valor,
              (SELECT rp.texto FROM retropregunta rp WHERE rp.idrespuesta = r.idrespuesta ORDER BY rp.fecha DESC LIMIT 1) AS observacion
         FROM evaluacion ev
         JOIN respuesta r ON r.idevaluacion = ev.idevaluacion
         JOIN pregunta p  ON p.idpregunta = r.idpregunta
        WHERE ev.idpractica = $1
        ORDER BY r.idrespuesta`,
      [idPractica]
    );
  }

  obtener(idRespuesta) {
    return this.una(
      `SELECT r.idrespuesta, r.texto, r.estado, ev.idpractica
         FROM respuesta r JOIN evaluacion ev ON ev.idevaluacion = r.idevaluacion
        WHERE r.idrespuesta = $1`,
      [idRespuesta]
    );
  }

  guardar(idRespuesta, texto, estado) {
    return this.ejecutar('UPDATE respuesta SET texto=$2, estado=$3, fecha=now() WHERE idrespuesta=$1', [idRespuesta, texto, estado]);
  }

  listarRetro(idRespuesta) {
    return this.consultar('SELECT idretro, docautor, texto, fecha FROM retropregunta WHERE idrespuesta=$1 ORDER BY fecha DESC', [idRespuesta]);
  }

  crearRetro(idRespuesta, docAutor, texto) {
    return this.una(
      'INSERT INTO retropregunta (idrespuesta, docautor, texto) VALUES ($1,$2,$3) RETURNING idretro, docautor, texto, fecha',
      [idRespuesta, docAutor, texto]
    );
  }
}

module.exports = RespuestaDAO;
