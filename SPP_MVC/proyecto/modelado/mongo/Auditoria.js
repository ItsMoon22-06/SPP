const mongoose = require('mongoose');
const { conexionBase1 } = require('../config/MongoConexion');

const auditoriaSchema = new mongoose.Schema({
  usuario: {
    numDocumento: { type: String, required: true },
    rol: { type: String, required: true },
    nombreCompleto: { type: String, required: true }
  },
  entidad: {
    type: String,
    required: true,
    enum: ['Practica', 'Bitacora', 'Evidencia', 'Retroalimentacion', 'Respuesta', 'Usuario']
  },
  idEntidad: {
    type: String, // viene de MySQL/Postgres, por eso es String y no ObjectId
    required: true
  },
  idPractica: {
    type: Number,
    required: true
  },
  accion: {
    type: String,
    required: true,
    enum: ['Insertar', 'Modificar', 'Eliminar']
  },
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  anio: {
    type: Number,
    required: true
  },
  mes: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  }
});

// anio y mes se pueden autocompletar a partir de 'fecha' antes de guardar
auditoriaSchema.pre('validate', function (next) {
  if (this.fecha) {
    this.anio = this.fecha.getFullYear();
    this.mes = this.fecha.getMonth() + 1;
  }
  next();
});

const Auditoria = conexionBase1.model('Auditoria', auditoriaSchema, 'auditoria');

module.exports = Auditoria;
