'use strict';
const { createClient } = require('@supabase/supabase-js');
const Entorno = require('./Entorno');

/**
 * Supabase se usa SOLO para autenticación.
 *  - publico(): cliente con anon key  -> login (signInWithPassword), refresh, validar token.
 *  - admin():   cliente con service role -> el Director crea/edita/bloquea/elimina usuarios.
 * Se crea un cliente nuevo por operación de login para no compartir sesión entre usuarios.
 */
class SupabaseCliente {
  static #opciones = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
  static #admin = null;

  static publico() {
    return createClient(Entorno.requerir('SUPABASE_URL'), Entorno.requerir('SUPABASE_ANON_KEY'), SupabaseCliente.#opciones);
  }

  static admin() {
    if (!SupabaseCliente.#admin) {
      SupabaseCliente.#admin = createClient(
        Entorno.requerir('SUPABASE_URL'),
        Entorno.requerir('SUPABASE_SERVICE_ROLE_KEY'),
        SupabaseCliente.#opciones
      );
    }
    return SupabaseCliente.#admin;
  }
}

module.exports = SupabaseCliente;
