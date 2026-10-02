const mongoose = require('mongoose');
const { conexionBase2 } = require('../config/MongoConexion');

const notificacionSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['PracticaAsignada'] // agrega mas valores aqui cuando definan nuevos tipos de notificacion
  },
  destinatario: {
    numDocumento: { type: String, required: true },
    correo: { type: String, required: true },
    nombreCompleto: { type: String, required: true }
  },
  idPractica: {
    type: Number,
    required: true
  },
  asunto: {
    type: String,
    required: true
  },
  contenido: {
    type: String,
    required: true
  },
  fechaCreacion: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaEnvio: {
    type: Date,
    required: false // no se conoce hasta que el correo sale correctamente
  }
});

const Notificacion = conexionBase2.model('Notificacion', notificacionSchema, 'notificaciones');

module.exports = Notificacion;
