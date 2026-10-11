'use strict';
const BaseDAO = require('./BaseDAO');

/**
 * Indicadores de acreditación: se CALCULAN desde PostgreSQL y se GUARDAN en MongoDB (base 1,
 * colección indicadoresacreditacion) con la forma exacta del schema original.
 */
class IndicadorDAO extends BaseDAO {
  constructor() {
    super('practica');
  }

  get modelo() {
    return require('../mongo/IndicadorAcreditacion');
  }

  /** Calcula un indicador por programa para el año dado. */
  async calcular(anio) {
    const programas = await this.consultar(
      `SELECT pr.idprograma, pr.nombre,
              COUNT(DISTINCT e.numdocumento) FILTER (WHERE e.estado = 'activo')::int AS activos
         FROM programa pr LEFT JOIN estudiante e ON e.idprograma = pr.idprograma
        GROUP BY pr.idprograma, pr.nombre ORDER BY pr.nombre`
    );
    const salida = [];
    for (const pr of programas) {
      const p = [pr.idprograma, anio];
      const porTipo = await this.consultar(
        `SELECT COALESCE(tp.nombre,'Sin tipo') AS tipo, COUNT(*)::int AS cantidad,
                ROUND(AVG(p.notafinal),2)::float AS "promedioNota",
                ROUND(100.0 * COUNT(*) FILTER (WHERE p.notafinal >= 3) / NULLIF(COUNT(*) FILTER (WHERE p.notafinal IS NOT NULL),0), 1)::float AS "porcentajeAprobacion"
           FROM practica p JOIN estudiante e ON e.numdocumento = p.docestudiante
           LEFT JOIN tipopractica tp ON tp.idtipo = p.idtipo
          WHERE e.idprograma = $1 AND EXTRACT(YEAR FROM p.fechainicio) = $2 GROUP BY tp.nombre`, p);
      const notas = await this.consultar(
        `SELECT rango, COUNT(*)::int AS "cantidadEstudiantes" FROM (
           SELECT CASE WHEN p.notafinal >= 4 THEN '4.0-5.0' WHEN p.notafinal >= 3 THEN '3.0-3.9' ELSE '0.0-2.9' END AS rango
             FROM practica p JOIN estudiante e ON e.numdocumento = p.docestudiante
            WHERE e.idprograma = $1 AND EXTRACT(YEAR FROM p.fechainicio) = $2 AND p.notafinal IS NOT NULL) x GROUP BY rango`, p);
      const retro = await this.una(
        `SELECT COUNT(*) FILTER (WHERE r.rolautor = 'tutor')::int AS tutor, COUNT(*) FILTER (WHERE r.rolautor = 'asesor')::int AS asesor
           FROM retroalimentacion r JOIN actividad a ON a.idactividad = r.idactividad
           JOIN practica p ON p.idpractica = a.idpractica JOIN estudiante e ON e.numdocumento = p.docestudiante
          WHERE e.idprograma = $1 AND EXTRACT(YEAR FROM p.fechainicio) = $2`, p);
      const entidades = await this.consultar(
        `SELECT COALESCE(i.nombre,'Sin institución') AS "nombreEntidad", COUNT(*)::int AS "cantidadPracticas"
           FROM practica p JOIN estudiante e ON e.numdocumento = p.docestudiante
           LEFT JOIN institucion i ON i.idinstitucion = p.idinstitucion
          WHERE e.idprograma = $1 AND EXTRACT(YEAR FROM p.fechainicio) = $2 GROUP BY i.nombre`, p);
      const gen = await this.una(
        `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE p.estado = 'cancelada')::int AS canceladas,
                COALESCE(ROUND(AVG(p.fechafin - p.fechainicio))::int, 0) AS dias
           FROM practica p JOIN estudiante e ON e.numdocumento = p.docestudiante
          WHERE e.idprograma = $1 AND EXTRACT(YEAR FROM p.fechainicio) = $2`, p);

      salida.push({
        anio, idPrograma: pr.idprograma, nombrePrograma: pr.nombre, totalEstudiantesActivos: pr.activos,
        practicasPorTipo: porTipo, distribucionNotas: notas,
        acompanamientoDocente: { retroalimentacionesTutor: retro.tutor, retroalimentacionesAsesor: retro.asesor },
        entidadesVinculadas: entidades,
        tasaDesercion: gen.total ? Math.round((1000 * gen.canceladas) / gen.total) / 10 : 0,
        duracionPromedioPracticasDias: gen.dias
      });
    }
    return salida;
  }

  /** Reemplaza los indicadores del año en MongoDB. */
  async guardar(anio, indicadores) {
    await this.modelo.deleteMany({ anio });
    return indicadores.length ? this.modelo.insertMany(indicadores) : [];
  }

  listar(anio) {
    return this.modelo.find(anio ? { anio } : {}).sort({ anio: -1, nombrePrograma: 1 }).lean();
  }

  /** Resumen general en vivo (no depende de Mongo). */
  async resumenGeneral() {
    return this.una(
      `SELECT (SELECT COUNT(*)::int FROM practica) AS practicas,
              (SELECT COUNT(*)::int FROM practica WHERE estado='activa') AS activas,
              (SELECT COUNT(*)::int FROM estudiante WHERE estado='activo') AS estudiantes,
              (SELECT COUNT(*)::int FROM tutoracademico WHERE estado='activo') AS tutores,
              (SELECT COUNT(*)::int FROM asesorpedagogico WHERE estado='activo') AS asesores,
              (SELECT COUNT(*)::int FROM institucion) AS instituciones,
              (SELECT ROUND(AVG(notafinal),2)::float FROM practica WHERE notafinal IS NOT NULL) AS promedionota`
    );
  }
}

module.exports = IndicadorDAO;
