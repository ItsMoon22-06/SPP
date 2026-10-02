/* =========================================================================
   docente.api.js — Lógica compartida por los paneles de TUTOR y ASESOR.
   Ambos ven las prácticas que tienen asignadas, revisan evidencias y escriben
   retroalimentaciones. Los datos vienen del controlador (/api).
   Expone window.SPP_DOCENTE para que tutor.api.js agregue lo propio del tutor.
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const poner = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v == null ? '' : v; el.readOnly = true; } };

    const estado = { practicas: [], practica: null, actividades: [], actividad: null };
    window.SPP_DOCENTE = { estado, recargarBitacora: null };

    const evPanel = $('#evidencias-panel');
    const tplEv = $('.ev-card', evPanel).cloneNode(true);
    const tplRetro = $('.retro-card', evPanel).cloneNode(true);
    const seccionRetro = $('.retro-section', evPanel);
    let formRetro = $('.retro-form-section', evPanel);

    // ---------- selector de práctica (el diseño original mostraba una sola, fija) ----------
    const panelPractica = $('.practice-panel');
    const formulario = $('.practice-form', panelPractica);
    const caja = document.createElement('div');
    caja.className = 'practice-field';
    caja.style.margin = '0 0 24px';
    caja.innerHTML = '<label for="practica-selector">Práctica asignada (estudiante)</label>' +
        '<select id="practica-selector" style="width:100%;height:56px;padding:0 16px;border:0;border-radius:12px;background:var(--input-bg);box-shadow:var(--input-shadow);color:var(--input-text);font-family:var(--font-serif);font-size:16px;font-weight:700"></select>';
    formulario.insertAdjacentElement('beforebegin', caja);
    const selector = $('#practica-selector', caja);

    try {
        estado.practicas = (await SPP.get('/api/practicas')).practicas;
    } catch (e) { SPP.error(e); return; }

    const btnEntrar = $('.practice-submit');
    if (!estado.practicas.length) {
        selector.innerHTML = '<option>No tienes prácticas asignadas</option>';
        selector.disabled = true;
        if (btnEntrar) btnEntrar.disabled = true;
        return;
    }
    selector.innerHTML = estado.practicas
        .map((p) => `<option value="${p.id}">${SPP.esc(p.estudiante)} — ${SPP.esc(p.codigo)}</option>`).join('');

    // ---------- rellenar práctica + bitácora ----------
    async function seleccionar(id) {
        const p = estado.practicas.find((x) => x.id === Number(id));
        if (!p) return;
        estado.practica = p;
        poner('nombre-practica', p.nombre);
        poner('tutor', p.tutor);
        poner('horas', p.horas);
        poner('institucion', p.institucion);
        poner('asesor', p.asesor);
        poner('semestre', p.semestre);
        poner('fecha-inicio', SPP.fecha(p.fechaInicio));
        poner('fecha-final', SPP.fecha(p.fechaFin));
        poner('codigo', p.codigo);
        const badge = $('.status-badge');
        if (badge) { badge.title = p.estado; badge.style.backgroundColor = { activa: '#265c48', finalizada: '#6b7280', cancelada: '#b3261e' }[p.estado] || ''; }

        pintarBitacora();
        // La credencial del estudiante (clic en su nombre) usa estos datos reales
        window.SPP_ESTUDIANTE_ACTUAL = {
            nombres: p.estudiante, apellidos: '', docTipo: p.estudianteDetalle.docTipo, docNumero: p.docEstudiante,
            estado: p.estudianteDetalle.estado, programa: p.estudianteDetalle.programa, correo: p.estudianteDetalle.correo
        };
        const nombre = $('.b-student-name');
        if (nombre) nombre.textContent = '- ' + p.estudiante;

        try { estado.actividades = (await SPP.get(`/api/practicas/${p.id}/actividades`)).actividades; } catch (e) { SPP.error(e); }
        $$('#actividades-panel .actividad-entrar-btn').forEach((btn) => {
            const existe = estado.actividades.some((a) => String(a.numero) === btn.getAttribute('data-actividad'));
            const card = btn.closest('.bitacora-action-card');
            if (card) card.style.display = existe ? '' : 'none';
        });
        document.dispatchEvent(new CustomEvent('spp:practica', { detail: p }));
    }

    function pintarBitacora() {
        const p = estado.practica;
        const info = $$('#bitacora-panel .b-info-value');
        if (info.length < 4) return;
        info[0].textContent = SPP.fecha(p.bitacora.creada);
        info[1].textContent = p.bitacora.notaFinal != null ? Number(p.bitacora.notaFinal).toFixed(1) : 'Sin calificar';
        info[2].textContent = p.bitacora.observacionGeneral || 'Sin observaciones';
        info[3].textContent = p.bitacora.estado === 'activa' ? 'Activa' : 'Cerrada';
    }
    window.SPP_DOCENTE.recargarBitacora = async () => {
        const p = (await SPP.get(`/api/practicas/${estado.practica.id}`)).practica;
        const i = estado.practicas.findIndex((x) => x.id === p.id);
        estado.practicas[i] = p; estado.practica = p;
        pintarBitacora();
    };

    selector.addEventListener('change', () => seleccionar(selector.value));

    // ---------- evidencias y retroalimentaciones de la actividad ----------
    function tarjetaEv(ev) {
        const c = tplEv.cloneNode(true);
        $('.ev-card-title', c).textContent = 'Archivo: ' + ev.nombre;
        const d = ev.descripcion || 'Sin descripción';
        $('.ev-card-desc', c).textContent = d.length > 70 ? d.slice(0, 67) + '...' : d;
        SPP.vincularMenu(c);
        const ver = $('.ev-item--ver', c);
        if (ver) ver.addEventListener('click', () => window.open(ev.url, '_blank', 'noopener'));
        return c;
    }

    function tarjetaRetro(r) {
        const c = tplRetro.cloneNode(true);
        $('.retro-role', c).textContent = r.rol === 'asesor' ? 'Asesor' : 'Tutor';
        $('.retro-date', c).textContent = SPP.fecha(r.fecha);
        $('.retro-content', c).textContent = r.texto;
        SPP.vincularMenu(c);
        const ver = $('.ev-item--ver', c);
        if (ver) ver.addEventListener('click', () => alert(r.texto));
        return c;
    }

    async function cargarEvidencias() {
        const a = estado.actividad;
        const [e, r] = await Promise.all([
            SPP.get(`/api/actividades/${a.idactividad}/evidencias`),
            SPP.get(`/api/actividades/${a.idactividad}/retroalimentaciones`)
        ]);
        $$('.ev-card, .ev-vacio', evPanel).forEach((n) => n.remove());
        $$('.retro-card, .retro-vacio', seccionRetro).forEach((n) => n.remove());

        if (!e.evidencias.length) {
            const v = document.createElement('p');
            v.className = 'ev-vacio';
            v.style.cssText = 'padding:16px;opacity:.7';
            v.textContent = 'El estudiante aún no ha subido evidencias para esta actividad.';
            seccionRetro.insertAdjacentElement('beforebegin', v);
        }
        e.evidencias.forEach((ev) => seccionRetro.insertAdjacentElement('beforebegin', tarjetaEv(ev)));
        r.retroalimentaciones.forEach((x) => formRetro.insertAdjacentElement('beforebegin', tarjetaRetro(x)));
    }

    $$('#actividades-panel .actividad-entrar-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            estado.actividad = estado.actividades.find((a) => String(a.numero) === btn.getAttribute('data-actividad'));
            if (!estado.actividad) return;
            try { await cargarEvidencias(); } catch (e) { SPP.error(e); }
        });
    });

    // ---------- formulario de retroalimentación ----------
    // Se reemplaza el formulario por una copia limpia: así se descartan los manejadores de demostración originales.
    const form = formRetro.cloneNode(true);
    formRetro.replaceWith(form);
    formRetro = form;
    const area = $('.retro-textarea', form);
    area.addEventListener('input', () => { area.style.height = 'auto'; area.style.height = Math.min(area.scrollHeight, 200) + 'px'; });
    $('.retro-btn-cancel', form).addEventListener('click', () => { area.value = ''; area.style.height = 'auto'; });
    $('.retro-btn-submit', form).addEventListener('click', async () => {
        const texto = area.value.trim();
        if (!texto) { alert('Por favor ingrese un comentario antes de enviar.'); return; }
        try {
            await SPP.post(`/api/actividades/${estado.actividad.idactividad}/retroalimentaciones`, { texto });
            area.value = ''; area.style.height = 'auto';
            alert('Retroalimentación enviada con éxito');
            await cargarEvidencias();
        } catch (e) { SPP.error(e); }
    });

    await seleccionar(selector.value);
});
