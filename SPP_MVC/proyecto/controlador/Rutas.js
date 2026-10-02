'use strict';
const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const AuthMiddleware = require('./middleware/AuthMiddleware');
const AuthController = require('./AuthController');
const UsuarioController = require('./UsuarioController');
const PracticaController = require('./PracticaController');
const CatalogoController = require('./CatalogoController');
const EvidenciaController = require('./EvidenciaController');
const RetroalimentacionController = require('./RetroalimentacionController');
const PreguntaController = require('./PreguntaController');
const InformeController = require('./InformeController');
const VistaController = require('./VistaController');

const { rol } = AuthMiddleware;

/** Registra TODAS las rutas de la aplicación y las conecta con sus controladores. */
class Rutas {
  constructor() {
    this.auth = new AuthMiddleware();
    this.c = {
      auth: new AuthController(),
      usuario: new UsuarioController(),
      practica: new PracticaController(),
      catalogo: new CatalogoController(),
      evidencia: new EvidenciaController(),
      retro: new RetroalimentacionController(),
      pregunta: new PreguntaController(),
      informe: new InformeController(),
      vista: new VistaController()
    };
    this.subida = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: EvidenciaController.MAX_BYTES, files: 1 },
      fileFilter: EvidenciaController.filtroArchivo
    });
  }

  /** Páginas HTML (protegidas por rol). */
  paginas() {
    const r = express.Router();
    const v = this.c.vista;
    const inicio = (req, res, next) => { req.autenticador = this.auth; v.inicio(req, res, next); };
    r.get(['/', '/index.html'], inicio);
    r.get('/HTML/:pagina.html', this.auth.pagina, (req, res) => v.panel(req, res));
    return r;
  }

  /** API JSON. */
  api() {
    const r = express.Router();
    const { auth } = this;
    const c = this.c;
    const a = (ctl, fn) => ctl.accion(fn);
    const director = [auth.api, rol('director')];
    const autenticado = [auth.api];

    r.use(AuthMiddleware.csrf);

    // --- Autenticación (Supabase) ---
    const limitadorLogin = rateLimit({
      windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
      message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }
    });
    r.post('/auth/login', limitadorLogin, a(c.auth, c.auth.login));
    r.post('/auth/logout', a(c.auth, c.auth.logout));
    r.get('/auth/sesion', autenticado, a(c.auth, c.auth.sesion));

    // --- Usuarios (Director) ---
    r.get('/usuarios/programas', director, a(c.usuario, c.usuario.programas));
    r.get('/usuarios', director, a(c.usuario, c.usuario.listar));
    r.post('/usuarios', director, a(c.usuario, c.usuario.crear));
    r.put('/usuarios/:doc', director, a(c.usuario, c.usuario.actualizar));
    r.patch('/usuarios/:doc/estado', director, a(c.usuario, c.usuario.cambiarEstado));
    r.delete('/usuarios/:doc', director, a(c.usuario, c.usuario.eliminar));

    // --- Catálogos (Director) ---
    r.get('/instituciones', director, a(c.catalogo, c.catalogo.listarInstituciones));
    r.post('/instituciones', director, a(c.catalogo, c.catalogo.crearInstitucion));
    r.put('/instituciones/:id', director, a(c.catalogo, c.catalogo.actualizarInstitucion));
    r.delete('/instituciones/:id', director, a(c.catalogo, c.catalogo.eliminarInstitucion));
    r.get('/tipos-practica', director, a(c.catalogo, c.catalogo.listarTipos));
    r.post('/tipos-practica', director, a(c.catalogo, c.catalogo.crearTipo));
    r.put('/tipos-practica/:id', director, a(c.catalogo, c.catalogo.actualizarTipo));
    r.delete('/tipos-practica/:id', director, a(c.catalogo, c.catalogo.eliminarTipo));

    // --- Prácticas ---
    r.get('/practicas', autenticado, a(c.practica, c.practica.listar));
    r.post('/practicas', director, a(c.practica, c.practica.crear));
    r.get('/practicas/:id', autenticado, a(c.practica, c.practica.obtener));
    r.put('/practicas/:id', director, a(c.practica, c.practica.actualizar));
    r.delete('/practicas/:id', director, a(c.practica, c.practica.eliminar));
    r.patch('/practicas/:id/bitacora', autenticado, a(c.practica, c.practica.actualizarBitacora));
    r.get('/practicas/:id/actividades', autenticado, a(c.practica, c.practica.actividadesDe));

    // --- Evidencias (Cloudinary + PostgreSQL) ---
    r.get('/actividades/:idActividad/evidencias', autenticado, a(c.evidencia, c.evidencia.listar));
    r.post('/actividades/:idActividad/evidencias', autenticado, this.subida.single('archivo'), a(c.evidencia, c.evidencia.subir));
    r.put('/evidencias/:idEvidencia', autenticado, a(c.evidencia, c.evidencia.editar));
    r.delete('/evidencias/:idEvidencia', autenticado, a(c.evidencia, c.evidencia.eliminar));

    // --- Retroalimentación de actividades ---
    r.get('/actividades/:idActividad/retroalimentaciones', autenticado, a(c.retro, c.retro.listar));
    r.post('/actividades/:idActividad/retroalimentaciones', autenticado, a(c.retro, c.retro.crear));

    // --- Preguntas ---
    const docente = [auth.api, rol('tutor', 'director')];
    r.get('/preguntas', docente, a(c.pregunta, c.pregunta.listar));
    r.post('/preguntas', docente, a(c.pregunta, c.pregunta.crear));
    r.put('/preguntas/:id', docente, a(c.pregunta, c.pregunta.actualizar));
    r.delete('/preguntas/:id', docente, a(c.pregunta, c.pregunta.eliminar));
    r.get('/practicas/:id/preguntas', autenticado, a(c.pregunta, c.pregunta.deLaPractica));
    r.post('/practicas/:id/preguntas', docente, a(c.pregunta, c.pregunta.asignar));
    r.put('/respuestas/:idRespuesta', autenticado, a(c.pregunta, c.pregunta.responder));
    r.post('/respuestas/:idRespuesta/retro', autenticado, a(c.pregunta, c.pregunta.retroalimentar));

    // --- Informes (Director) ---
    r.get('/informes/resumen', director, a(c.informe, c.informe.resumen));
    r.get('/informes', director, a(c.informe, c.informe.listar));
    r.post('/informes/generar', director, a(c.informe, c.informe.generar));
    r.get('/auditoria', director, a(c.informe, c.informe.verAuditoria));

    return r;
  }
}

module.exports = Rutas;
