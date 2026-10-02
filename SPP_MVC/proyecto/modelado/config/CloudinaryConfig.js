'use strict';
const cloudinary = require('cloudinary').v2;
const Entorno = require('./Entorno');

cloudinary.config({
  cloud_name: Entorno.obtener('CLOUDINARY_CLOUD_NAME'),
  api_key: Entorno.obtener('CLOUDINARY_API_KEY'),
  api_secret: Entorno.obtener('CLOUDINARY_API_SECRET')
});

module.exports = cloudinary;
