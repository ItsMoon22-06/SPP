'use strict';
const BaseController = require('./BaseController');
const ErrorHttp = require('./ErrorHttp');
const IndicadorDAO = require('../modelado/dao/IndicadorDAO');

/** Informes e indicadores de acreditación (solo Director). */
class InformeController extends BaseController {
  constructor() {
    super();
    this.indicadores = new IndicadorDAO();
  }

  // GET /api/informes/resumen
  async resumen(_req, res) {
    this.ok(res, { resumen: await this.indicadores.resumenGeneral() });
  }

  // GET /api/informes?anio=2026   -> indicadores guardados en MongoDB
  async listar(req, res) {
    const anio = req.query.anio ? this.entero(req.query.anio, { campo: 'año', min: 2000, max: 2100 }) : undefined;
    this.ok(res, { indicadores: await this.indicadores.listar(anio) });
  }

  // POST /api/informes/generar { anio }  -> calcula desde PostgreSQL y guarda en MongoDB
  async generar(req, res) {
    const anio = this.entero(req.body?.anio ?? new Date().getFullYear(), { campo: 'año', min: 2000, max: 2100 });
    const calculados = await this.indicadores.calcular(anio);
    try {
      await this.indicadores.guardar(anio, calculados);
    } catch (err) {
      throw new ErrorHttp(502, 'Se calcularon los indicadores pero no se pudieron guardar en MongoDB');
    }
    this.ok(res, { indicadores: calculados });
  }

  // GET /api/auditoria?idPractica=
  async verAuditoria(req, res) {
    const idPractica = req.query.idPractica ? this.entero(req.query.idPractica, { campo: 'práctica' }) : undefined;
    this.ok(res, { registros: await this.auditoria.listar({ idPractica }) });
  }
}

module.exports = InformeController;
