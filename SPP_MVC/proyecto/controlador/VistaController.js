'use strict';
const path = require('path');
const BaseController = require('./BaseController');
const UsuarioDAO = require('../modelado/dao/UsuarioDAO');

const DIR_VISTAS = path.join(__dirname, '..', 'vistas');

/** Entrega las páginas HTML. Cada panel solo se sirve al rol que le corresponde. */
class VistaController extends BaseController {
  static get DIR_VISTAS() { return DIR_VISTAS; }

  // GET /HTML/:pagina.html
  panel(req, res) {
    const { pagina } = req.params;
    if (!UsuarioDAO.ROLES.includes(pagina)) return res.status(404).send('No encontrado');
    if (req.usuario.rol !== pagina) return res.redirect(`/HTML/${req.usuario.rol}.html`);
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(DIR_VISTAS, 'HTML', `${pagina}.html`));
  }

  // GET /  y  /index.html  -> si ya hay sesión, va directo a su panel
  async inicio(req, res, next) {
    try {
      const u = await req.autenticador.resolver(req, res);
      if (u) return res.redirect(`/HTML/${u.rol}.html`);
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(DIR_VISTAS, 'index.html'));
    } catch (err) { next(err); }
  }
}

module.exports = VistaController;
