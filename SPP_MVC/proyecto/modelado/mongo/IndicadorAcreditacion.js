const mongoose = require('mongoose');
const { conexionBase1 } = require('../config/MongoConexion');

const indicadorAcreditacionSchema = new mongoose.Schema({
  anio: {
    type: Number,
    required: true
  },
  idPrograma: {
    type: Number,
    required: true
  },
  nombrePrograma: {
    type: String,
    required: true
  },
  totalEstudiantesActivos: {
    type: Number,
    required: true
  },
  practicasPorTipo: {
    // Ej: [{ tipo: "Formativa", cantidad: 40, promedioNota: 4.2, porcentajeAprobacion: 92 }]
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  distribucionNotas: {
    // Ej: [{ rango: "4.0-5.0", cantidadEstudiantes: 25 }]
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  acompanamientoDocente: {
    type: mongoose.Schema.Types.Mixed, // Object libre: retro tutor/asesor, tiempos de respuesta
    required: true
  },
  entidadesVinculadas: {
    // Ej: [{ nombreEntidad: "Colegio X", cantidadPracticas: 10 }]
    type: [mongoose.Schema.Types.Mixed],
    required: true
  },
  tasaDesercion: {
    type: Number, // porcentaje, ej 12.5
    required: true
  },
  duracionPromedioPracticasDias: {
    type: Number,
    required: true
  },
  observaciones: {
    type: String,
    required: false
  }
});

const IndicadorAcreditacion = conexionBase1.model(
  'IndicadorAcreditacion',
  indicadorAcreditacionSchema,
  'indicadoresacreditacion'
);

module.exports = IndicadorAcreditacion;
