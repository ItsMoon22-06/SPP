'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

/** Acceso centralizado y validado a las variables de entorno. */
class Entorno {
  static obtener(nombre, porDefecto) {
    const v = process.env[nombre];
    return v === undefined || v === '' ? porDefecto : v;
  }

  static requerir(nombre) {
    const v = process.env[nombre];
    if (!v) throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
    return v;
  }

  static get produccion() {
    return process.env.NODE_ENV === 'production';
  }

  static get dominio() {
    return Entorno.obtener('DOMINIO_INSTITUCIONAL', 'universidad.edu.co');
  }
}

module.exports = Entorno;
