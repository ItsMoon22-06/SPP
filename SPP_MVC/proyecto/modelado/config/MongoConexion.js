'use strict';
const mongoose = require('mongoose');
const Entorno = require('./Entorno');

/**
 * Dos conexiones independientes dentro del mismo cluster (igual que mongoConnection.js original):
 *  - conexionBase1: auditoria + indicadoresacreditacion
 *  - conexionBase2: notificaciones (microservicio)
 * Se crean de forma perezosa (solo si existe la URI), así la app arranca aunque Mongo no esté configurado.
 */
class MongoConexion {
  static #crear(variable, etiqueta) {
    const uri = Entorno.obtener(variable);
    if (!uri) {
      console.warn(`[mongo] ${variable} no definida: ${etiqueta} deshabilitada`);
      return null;
    }
    const con = mongoose.createConnection(uri);
    con.on('connected', () => console.log(`Conectado a ${etiqueta}`));
    con.on('error', (err) => console.error(`Error conectando a ${etiqueta}:`, err.message));
    return con;
  }

  static #base1 = null;
  static #base2 = null;

  static get conexionBase1() {
    if (!MongoConexion.#base1) MongoConexion.#base1 = MongoConexion.#crear('MONGO_URI_BASE1', 'base_mongo_1');
    return MongoConexion.#base1;
  }

  static get conexionBase2() {
    if (!MongoConexion.#base2) MongoConexion.#base2 = MongoConexion.#crear('MONGO_URI_BASE2', 'base_mongo_2');
    return MongoConexion.#base2;
  }
}

// Mantiene la misma forma de exportación que usan los modelos originales: { conexionBase1, conexionBase2 }
module.exports = {
  get conexionBase1() { return MongoConexion.conexionBase1; },
  get conexionBase2() { return MongoConexion.conexionBase2; },
  MongoConexion
};
