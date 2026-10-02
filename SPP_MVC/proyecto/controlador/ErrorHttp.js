'use strict';

/** Error con código HTTP; el manejador global lo convierte en respuesta JSON. */
class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
    this.name = 'ErrorHttp';
  }
  static solicitud(m = 'Solicitud inválida') { return new ErrorHttp(400, m); }
  static noAutenticado(m = 'Sesión no válida') { return new ErrorHttp(401, m); }
  static prohibido(m = 'No tienes permiso para esta acción') { return new ErrorHttp(403, m); }
  static noEncontrado(m = 'Recurso no encontrado') { return new ErrorHttp(404, m); }
  static conflicto(m = 'Conflicto con el estado actual') { return new ErrorHttp(409, m); }
}

module.exports = ErrorHttp;
