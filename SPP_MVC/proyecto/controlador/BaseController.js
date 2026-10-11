'use strict';
const ErrorHttp = require('./ErrorHttp');
const AuditoriaDAO = require('../modelado/dao/AuditoriaDAO');

/**
 * Base de los controladores. Los métodos públicos de cada controlador se registran con
 * `this.accion(this.metodo)`, que enlaza `this` y captura errores async (Express 4 no lo hace solo).
 */
class BaseController {
  constructor() {
    this.auditoria = new AuditoriaDAO();
  }

  accion(fn) {
    return (req, res, next) => Promise.resolve(fn.call(this, req, res, next)).catch(next);
  }

  ok(res, datos = {}, estado = 200) {
    return res.status(estado).json(datos);
  }

  // ---------- validación ----------
  texto(valor, { campo, max = 255, requerido = true } = {}) {
    const v = typeof valor === 'string' ? valor.trim() : '';
    if (!v) {
      if (requerido) throw ErrorHttp.solicitud(`El campo "${campo}" es obligatorio`);
      return '';
    }
    if (v.length > max) throw ErrorHttp.solicitud(`El campo "${campo}" no puede superar ${max} caracteres`);
    return v;
  }

  entero(valor, { campo, min = 1, max = 2147483647 } = {}) {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < min || n > max) throw ErrorHttp.solicitud(`El campo "${campo}" no es válido`);
    return n;
  }

  fecha(valor, campo) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(Date.parse(valor))) {
      throw ErrorHttp.solicitud(`El campo "${campo}" debe tener formato AAAA-MM-DD`);
    }
    return valor;
  }

  idParam(req, nombre = 'id') {
    return this.entero(req.params[nombre], { campo: nombre });
  }

  nombreCompleto(u) {
    return `${u.nombres} ${u.apellidos}`.trim();
  }

  /** Auditoría en Mongo (no bloquea la respuesta). */
  auditar(req, { entidad, idEntidad, idPractica, accion }) {
    const u = req.usuario;
    return this.auditoria.registrar({
      usuario: { numDocumento: u.numDocumento, rol: u.rol, nombreCompleto: this.nombreCompleto(u) },
      entidad, idEntidad, idPractica, accion
    });
  }
}

module.exports = BaseController;
