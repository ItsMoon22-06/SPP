/* =========================================================================
   sesion.js — Se carga en los 4 paneles (después de api.js).
   Comprueba la sesión, pinta el nombre/rol/perfil del usuario y activa "Cerrar Sesión".
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('.app-logout').forEach((a) => {
        a.addEventListener('click', (e) => { e.preventDefault(); SPP.cerrarSesion(); });
    });

    let u;
    try { u = await SPP.sesion(); } catch (e) { return; }
    const nombre = (u.nombres + ' ' + u.apellidos).trim();

    document.querySelectorAll('.app-account strong').forEach((el) => { el.textContent = nombre; });
    document.querySelectorAll('.app-account small').forEach((el) => { el.textContent = SPP.ROLES[u.rol] || u.rol; });

    // Perfil: se rellena por la etiqueta de cada dato (el HTML ya trae el diseño)
    document.querySelectorAll('.profile-info-text').forEach((bloque) => {
        const etiqueta = (bloque.querySelector('.profile-info-label') || {}).textContent || '';
        const valor = bloque.querySelector('.profile-info-value');
        if (!valor) return;
        const e = etiqueta.toLowerCase();
        if (e.includes('nombre')) valor.textContent = nombre;
        else if (e.includes('identificaci')) valor.textContent = u.docTipo + ' ' + u.docNumero;
        else if (e.includes('correo')) valor.textContent = u.correo;
        else if (e.includes('programa')) valor.textContent = u.programa || 'Sin asignar';
        else if (e.includes('estado')) valor.textContent = u.estado.charAt(0).toUpperCase() + u.estado.slice(1);
    });
});
