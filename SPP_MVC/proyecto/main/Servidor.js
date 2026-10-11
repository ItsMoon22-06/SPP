'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const Entorno = require('../modelado/config/Entorno');
const PostgresConexion = require('../modelado/config/PostgresConexion');
const Rutas = require('../controlador/Rutas');
const ErrorHttp = require('../controlador/ErrorHttp');

/** Aplicación Express: ensambla middlewares, rutas (controlador) y archivos estáticos (vistas). */
class Servidor {
  constructor() {
    this.app = express();
    this.puerto = Number(Entorno.obtener('PORT', 3000));
    this.rutas = new Rutas();
    this.http = null;
    this.#middlewares();
    this.#rutas();
    this.#errores();
  }

  #middlewares() {
    const app = this.app;
    app.disable('x-powered-by');
    app.set('trust proxy', 1); // detrás de proxy (Render, Railway, etc.) para que el rate limit vea la IP real
    app.use(helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'script-src': ["'self'"],
          'script-src-attr': ["'unsafe-inline'"], // la vista usa algunos onclick="..."
          'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
          'font-src': ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
          'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
          'frame-src': ["'self'", 'https://res.cloudinary.com'],
          'connect-src': ["'self'"],
          'upgrade-insecure-requests': Entorno.produccion ? [] : null
        }
      }
    }));
    app.use(express.json({ limit: '100kb' }));
    app.use(cookieParser());
  }

  #rutas() {
    const app = this.app;
    const vistas = path.join(__dirname, '..', 'vistas');

    // Páginas (protegidas) antes que los estáticos, para que /HTML/*.html nunca se sirva sin sesión
    app.use(this.rutas.paginas());
    app.use('/api', this.rutas.api());

    // Solo recursos públicos de la vista (nunca la carpeta HTML ni index.html directamente)
    for (const carpeta of ['CSS', 'JavaScript', 'img']) {
      app.use(`/${carpeta}`, express.static(path.join(vistas, carpeta), { maxAge: Entorno.produccion ? '1h' : 0 }));
    }
    app.use('/api', (_req, _res, next) => next(ErrorHttp.noEncontrado('Ruta no encontrada')));
  }

  #errores() {
    // eslint-disable-next-line no-unused-vars
    this.app.use((err, req, res, _next) => {
      let estado = err.estado || 500;
      let mensaje = err.estado ? err.message : 'Error interno del servidor';

      if (err.code === 'LIMIT_FILE_SIZE') { estado = 413; mensaje = 'El archivo supera el tamaño máximo de 10 MB'; }
      else if (err.name === 'MulterError') { estado = 400; mensaje = 'Archivo inválido'; }
      else if (err.type === 'entity.parse.failed') { estado = 400; mensaje = 'JSON inválido'; }
      else if (err.code === '23505') { estado = 409; mensaje = 'Ya existe un registro con esos datos'; }
      else if (err.code === '23503') { estado = 409; mensaje = 'El registro está relacionado con otros datos'; }
      else if (err.code === '23514' || err.code === '22P02') { estado = 400; mensaje = 'Datos inválidos'; }

      if (estado >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);
      if (req.originalUrl.startsWith('/api')) return res.status(estado).json({ error: mensaje });
      res.status(estado).send(mensaje);
    });
  }

  iniciar() {
    this.http = this.app.listen(this.puerto, () => console.log(`SPP escuchando en http://localhost:${this.puerto}`));
    const apagar = async () => {
      console.log('Cerrando...');
      this.http.close();
      await PostgresConexion.cerrar().catch(() => {});
      process.exit(0);
    };
    process.on('SIGINT', apagar);
    process.on('SIGTERM', apagar);
    return this;
  }
}

module.exports = Servidor;
