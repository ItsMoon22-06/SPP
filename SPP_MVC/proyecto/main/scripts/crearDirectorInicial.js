'use strict';
// Uso: npm run crear-director  (lee DIRECTOR_* del .env). Crea el primer Director en Supabase + PostgreSQL.
const Entorno = require('../../modelado/config/Entorno');
const SupabaseCliente = require('../../modelado/config/SupabaseCliente');
const PostgresConexion = require('../../modelado/config/PostgresConexion');
const UsuarioDAO = require('../../modelado/dao/UsuarioDAO');

(async () => {
  const usuario = Entorno.requerir('DIRECTOR_USUARIO').toLowerCase();
  const correo = usuario.includes('@') ? usuario : `${usuario}@${Entorno.dominio}`;
  const password = Entorno.requerir('DIRECTOR_PASSWORD');
  const nombres = Entorno.requerir('DIRECTOR_NOMBRES');
  const apellidos = Entorno.requerir('DIRECTOR_APELLIDOS');
  const numDocumento = Entorno.requerir('DIRECTOR_DOCUMENTO');

  const dao = new UsuarioDAO();
  if (await dao.buscarPorCorreo(correo)) { console.log('Ese director ya existe.'); return; }

  const { data, error } = await SupabaseCliente.admin().auth.admin.createUser({
    email: correo, password, email_confirm: true, app_metadata: { rol: 'director' }
  });
  if (error) throw new Error(`Supabase: ${error.message}`);
  try {
    await dao.crear('director', { numDocumento, docTipo: 'CC', nombres, apellidos, correo, programa: 'Dirección de Prácticas Pedagógicas', estado: 'activo', supabaseUid: data.user.id });
  } catch (e) {
    await SupabaseCliente.admin().auth.admin.deleteUser(data.user.id).catch(() => {});
    throw e;
  }
  console.log(`Director creado: ${correo}`);
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => PostgresConexion.cerrar());
