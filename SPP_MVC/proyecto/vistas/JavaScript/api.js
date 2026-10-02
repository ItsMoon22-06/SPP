/* =========================================================================
   api.js — Cliente de la API del controlador (compartido por TODAS las vistas).
   Las vistas no tocan la base de datos: solo hablan con /api/* (Express).
   La sesión viaja en una cookie httpOnly (la gestiona Supabase en el servidor).
   ========================================================================= */
(function () {
    'use strict';
    const SPP = {};

    /** Petición JSON/multipart a la API. Lanza Error(mensaje) si la respuesta no es 2xx. */
    SPP.pedir = async function (url, opciones) {
        const o = opciones || {};
        const init = { method: o.metodo || 'GET', headers: { 'X-SPP': '1' }, credentials: 'same-origin' };
        if (o.formData) {
            init.body = o.formData;
        } else if (o.cuerpo !== undefined) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(o.cuerpo);
        }
        let resp;
        try {
            resp = await fetch(url, init);
        } catch (e) {
            throw new Error('No hay conexión con el servidor');
        }
        let datos = {};
        try { datos = await resp.json(); } catch (e) { /* respuesta sin cuerpo */ }
        if (resp.status === 401 && !o.sinRedirigir) {
            window.location.href = '/index.html';
            throw new Error('Sesión expirada');
        }
        if (!resp.ok) throw new Error(datos.error || 'Error ' + resp.status);
        return datos;
    };
    SPP.get = (url) => SPP.pedir(url);
    SPP.post = (url, cuerpo) => SPP.pedir(url, { metodo: 'POST', cuerpo: cuerpo || {} });
    SPP.put = (url, cuerpo) => SPP.pedir(url, { metodo: 'PUT', cuerpo: cuerpo || {} });
    SPP.patch = (url, cuerpo) => SPP.pedir(url, { metodo: 'PATCH', cuerpo: cuerpo || {} });
    SPP.del = (url) => SPP.pedir(url, { metodo: 'DELETE' });

    /** Escapa texto para insertarlo en innerHTML (anti-XSS). */
    SPP.esc = function (t) {
        const d = document.createElement('div');
        d.textContent = t == null ? '' : String(t);
        return d.innerHTML;
    };

    /** '2026-04-18' o ISO -> '18/04/2026' */
    SPP.fecha = function (v) {
        if (!v) return '—';
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
        if (m && String(v).length === 10) return m[3] + '/' + m[2] + '/' + m[1];
        const d = new Date(v);
        if (isNaN(d)) return '—';
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    SPP.fechaHora = function (v) {
        if (!v) return 'Nunca';
        const d = new Date(v);
        return isNaN(d) ? 'Nunca' : d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    SPP.ROLES = { estudiante: 'Estudiante', tutor: 'Tutor Académico', asesor: 'Asesor Pedagógico', director: 'Director' };

    let promesaSesion = null;
    /** Datos del usuario autenticado (una sola petición por página). */
    SPP.sesion = function () {
        if (!promesaSesion) promesaSesion = SPP.get('/api/auth/sesion').then((d) => d);
        return promesaSesion;
    };

    SPP.cerrarSesion = async function () {
        try { await SPP.pedir('/api/auth/logout', { metodo: 'POST', cuerpo: {}, sinRedirigir: true }); } catch (e) { /* aun así salimos */ }
        window.location.href = '/index.html';
    };

    SPP.error = function (e) {
        alert(e && e.message ? e.message : 'Ocurrió un error');
    };

    /** Menú "..." de las tarjetas de evidencia/retro (misma mecánica que ya usaban las vistas). */
    SPP.vincularMenu = function (tarjeta) {
        const btn = tarjeta.querySelector('.ev-menu-btn');
        if (!btn) return;
        const cerrarOtros = () => document.querySelectorAll('.ev-menu-btn').forEach((b) => { if (b !== btn) poner(b, false); });
        function poner(b, abierto) {
            b.setAttribute('aria-expanded', abierto ? 'true' : 'false');
            const dd = b.nextElementSibling;
            if (dd) dd.classList.toggle('is-open', abierto);
            const icono = b.querySelector('i');
            if (icono) { icono.classList.toggle('fa-ellipsis', !abierto); icono.classList.toggle('fa-arrow-left', abierto); }
        }
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const abierto = btn.getAttribute('aria-expanded') === 'true';
            cerrarOtros();
            poner(btn, !abierto);
        });
    };

    /** Vacía un <select> y lo llena con opciones; conserva el placeholder (primera opción deshabilitada). */
    SPP.llenarSelect = function (select, items, valor, texto, placeholder) {
        if (!select) return;
        select.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = ''; ph.disabled = true; ph.selected = true;
        ph.textContent = placeholder || 'Selecciona';
        select.appendChild(ph);
        items.forEach((it) => {
            const op = document.createElement('option');
            op.value = String(it[valor]);
            op.textContent = typeof texto === 'function' ? texto(it) : it[texto];
            select.appendChild(op);
        });
        SPP.reconstruirSelectPersonalizado(select);
    };

    /**
     * director.js convierte los <select> en listas propias (custom-select) al cargar.
     * Si cambiamos las opciones después, hay que reconstruir esa lista visual.
     */
    SPP.reconstruirSelectPersonalizado = function (select) {
        const cont = select.parentElement && select.parentElement.querySelector('.custom-select-container');
        if (!cont) return;
        const trigger = cont.querySelector('.custom-select-trigger');
        const lista = cont.querySelector('.custom-options');
        const primera = select.options[0];
        trigger.textContent = primera ? primera.text : '';
        trigger.classList.toggle('is-placeholder', !!(primera && primera.disabled));
        lista.innerHTML = '';
        Array.from(select.options).forEach((op) => {
            if (op.disabled && op.value === '') return;
            const div = document.createElement('div');
            div.className = 'custom-option';
            div.setAttribute('role', 'option');
            div.textContent = op.text;
            div.dataset.value = op.value;
            div.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = op.value;
                trigger.textContent = op.text;
                trigger.classList.remove('is-placeholder');
                select.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof lista.classList !== 'undefined') lista.classList.remove('is-open', 'open', 'show');
                cont.classList.remove('is-open', 'open', 'show');
            });
            lista.appendChild(div);
        });
    };

    window.SPP = SPP;
})();
