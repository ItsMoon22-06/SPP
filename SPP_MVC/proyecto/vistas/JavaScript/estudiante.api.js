/* =========================================================================
   estudiante.api.js — Conecta el panel del ESTUDIANTE con el controlador (/api).
   estudiante.js sigue encargándose de la navegación entre paneles; este archivo
   solo trae/guarda datos y rellena el HTML existente.
   ========================================================================= */
document.addEventListener('DOMContentLoaded', async () => {
    const TEMAS = { pedagogia: 'Pedagogía', didactica: 'Didáctica', evaluacion: 'Evaluación' };
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const poner = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v == null ? '' : v; el.readOnly = true; } };

    let practica = null;
    let actividadActual = null;

    // ---------- plantillas tomadas del HTML original ----------
    const evPanel = $('#evidencias-panel');
    const tplEv = $('.ev-card', evPanel) ? $('.ev-card', evPanel).cloneNode(true) : null;
    const tplRetro = $('.retro-card', evPanel) ? $('.retro-card', evPanel).cloneNode(true) : null;
    const mpList = $('#mpList');
    const tplPend = mpList ? $('.mp-card[data-estado="pendiente"]', mpList).cloneNode(true) : null;
    const tplResp = mpList ? $('.mp-card[data-estado="respondida"]', mpList).cloneNode(true) : null;

    // ---------- 1) Práctica y bitácora ----------
    try {
        const { practicas } = await SPP.get('/api/practicas');
        practica = practicas.find((p) => p.estado === 'activa') || practicas[0] || null;
    } catch (e) { SPP.error(e); return; }

    const btnEntrar = $('.practice-submit');
    if (!practica) {
        if (btnEntrar) { btnEntrar.disabled = true; btnEntrar.title = 'Aún no tienes una práctica asignada'; }
        const h = $('#practice-title');
        if (h) h.textContent = 'Información de Práctica — aún no tienes una práctica asignada';
        return;
    }

    poner('nombre-practica', practica.nombre);
    poner('tutor', practica.tutor);
    poner('horas', practica.horas);
    poner('institucion', practica.institucion);
    poner('asesor', practica.asesor);
    poner('semestre', practica.semestre);
    poner('fecha-inicio', SPP.fecha(practica.fechaInicio));
    poner('fecha-final', SPP.fecha(practica.fechaFin));
    poner('codigo', practica.codigo);

    const badge = $('.status-badge');
    if (badge) {
        badge.title = practica.estado;
        badge.style.backgroundColor = { activa: '#265c48', finalizada: '#6b7280', cancelada: '#b3261e' }[practica.estado] || '';
    }

    const infoB = $$('#bitacora-panel .b-info-value');
    if (infoB.length >= 4) {
        infoB[0].textContent = SPP.fecha(practica.bitacora.creada);
        infoB[1].textContent = practica.bitacora.notaFinal != null ? Number(practica.bitacora.notaFinal).toFixed(1) : 'Sin calificar';
        infoB[2].textContent = practica.bitacora.observacionGeneral || 'Sin observaciones';
        infoB[3].textContent = practica.bitacora.estado === 'activa' ? 'Activa' : 'Cerrada';
    }

    // ---------- 2) Actividades ----------
    async function cargarActividades() {
        const { actividades } = await SPP.get(`/api/practicas/${practica.id}/actividades`);
        $$('#actividades-panel .actividad-entrar-btn').forEach((btn) => {
            const card = btn.closest('.bitacora-action-card');
            const act = actividades.find((a) => String(a.numero) === btn.getAttribute('data-actividad'));
            if (!act) { if (card) card.style.display = 'none'; return; }
            btn.dataset.id = act.idactividad;
            btn.addEventListener('click', () => { actividadActual = act; cargarEvidencias(); });
        });
    }

    // ---------- 3) Evidencias + retroalimentaciones ----------
    function montarSubida() {
        if (!evPanel || $('.ev-subir', evPanel)) return;
        const caja = document.createElement('div');
        caja.className = 'ev-subir';
        caja.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin:0 0 18px;padding:16px;border:2px dashed #288360;border-radius:12px';
        caja.innerHTML =
            '<strong>Subir nueva evidencia</strong>' +
            '<input type="file" class="ev-archivo" accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx">' +
            '<textarea class="mp-answer-input ev-desc" maxlength="1000" placeholder="Descripción de la evidencia (opcional)"></textarea>' +
            '<div><button type="button" class="b-action-btn ev-subir-btn">Subir evidencia</button></div>';
        const cabecera = evPanel.firstElementChild;
        cabecera.insertAdjacentElement('afterend', caja);
        $('.ev-subir-btn', caja).addEventListener('click', subirEvidencia);
    }

    async function subirEvidencia() {
        const input = $('.ev-archivo', evPanel);
        const desc = $('.ev-desc', evPanel);
        const btn = $('.ev-subir-btn', evPanel);
        if (!input.files.length) { alert('Selecciona un archivo.'); return; }
        const fd = new FormData();
        fd.append('archivo', input.files[0]);
        fd.append('descripcion', desc.value);
        btn.disabled = true; btn.textContent = 'Subiendo...';
        try {
            await SPP.pedir(`/api/actividades/${actividadActual.idactividad}/evidencias`, { metodo: 'POST', formData: fd });
            input.value = ''; desc.value = '';
            await cargarEvidencias();
        } catch (e) { SPP.error(e); }
        btn.disabled = false; btn.textContent = 'Subir evidencia';
    }

    function tarjetaEvidencia(ev) {
        const c = tplEv.cloneNode(true);
        $('.ev-card-title', c).textContent = 'Archivo: ' + ev.nombre;
        const d = ev.descripcion || 'Sin descripción';
        $('.ev-card-desc', c).textContent = d.length > 70 ? d.slice(0, 67) + '...' : d;
        SPP.vincularMenu(c);
        $('.ev-item--ver', c).addEventListener('click', () => window.open(ev.url, '_blank', 'noopener'));
        $('.ev-item--editar', c).addEventListener('click', async () => {
            const nueva = prompt('Descripción de la evidencia:', ev.descripcion);
            if (nueva === null) return;
            try { await SPP.put(`/api/evidencias/${encodeURIComponent(ev.id)}`, { descripcion: nueva }); await cargarEvidencias(); } catch (e) { SPP.error(e); }
        });
        $('.ev-item--eliminar', c).addEventListener('click', async () => {
            if (!confirm('¿Eliminar la evidencia "' + ev.nombre + '"?')) return;
            try { await SPP.del(`/api/evidencias/${encodeURIComponent(ev.id)}`); await cargarEvidencias(); } catch (e) { SPP.error(e); }
        });
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
        if (!actividadActual || !evPanel) return;
        montarSubida();
        const [e, r] = await Promise.all([
            SPP.get(`/api/actividades/${actividadActual.idactividad}/evidencias`),
            SPP.get(`/api/actividades/${actividadActual.idactividad}/retroalimentaciones`)
        ]);
        const seccion = $('.retro-section', evPanel);
        $$('.ev-card', evPanel).forEach((n) => n.remove());
        $$('.retro-card', evPanel).forEach((n) => n.remove());

        if (!e.evidencias.length) {
            const vacio = document.createElement('p');
            vacio.className = 'ev-card ev-vacio';
            vacio.style.cssText = 'padding:16px;opacity:.7';
            vacio.textContent = 'Aún no has subido evidencias para esta actividad.';
            seccion.insertAdjacentElement('beforebegin', vacio);
        }
        e.evidencias.forEach((ev) => seccion.insertAdjacentElement('beforebegin', tarjetaEvidencia(ev)));
        r.retroalimentaciones.forEach((x) => seccion.appendChild(tarjetaRetro(x)));
        if (!r.retroalimentaciones.length) {
            const vacio = document.createElement('p');
            vacio.className = 'retro-card';
            vacio.style.cssText = 'padding:12px;opacity:.7';
            vacio.textContent = 'Aún no hay retroalimentaciones.';
            seccion.appendChild(vacio);
        }
    }

    // ---------- 4) Preguntas ----------
    let preguntas = [];

    function abrirDetalle(p) {
        $('#mpDetalleNum').textContent = 'Pregunta #' + p.numero;
        $('#mpDetalleCategoria').textContent = 'Categoría: ' + (TEMAS[p.tema] || p.tema);
        $('#mpDetallePregunta').textContent = p.enunciado;
        $('#mpDetalleObservacion').textContent = p.observacion || 'Sin observaciones aún.';
        $('#mis-preguntas-panel').style.display = 'none';
        $('#mp-detalle-panel').style.display = 'flex';
        window.scrollTo(0, 0);
    }

    async function enviar(p, tarjeta, definitivo) {
        const texto = $('.mp-answer-input', tarjeta).value.trim();
        if (definitivo && !texto) { alert('Por favor escribe una respuesta antes de enviar.'); return; }
        try {
            await SPP.put(`/api/respuestas/${p.id}`, { texto, enviar: definitivo });
            alert(definitivo ? 'Respuesta enviada con éxito' : 'Borrador guardado');
            await cargarPreguntas();
        } catch (e) { SPP.error(e); }
    }

    function tarjetaPregunta(p) {
        const respondida = p.estado === 'respondida';
        const c = (respondida ? tplResp : tplPend).cloneNode(true);
        c.dataset.estado = respondida ? 'respondida' : 'pendiente';
        $('.mp-card-num', c).textContent = 'Pregunta #' + p.numero;
        $('.mp-card-cat', c).textContent = 'Categoría: ' + (TEMAS[p.tema] || p.tema);
        $('.mp-card-question', c).textContent = p.enunciado;
        if (respondida) {
            const t = $('.mp-answer-text', c);
            t.textContent = p.respuesta.length > 140 ? p.respuesta.slice(0, 137) + '...' : p.respuesta;
            const hist = $('.mp-btn--historial', c);
            const ver = $('.mp-ver-link', c);
            if (hist) hist.addEventListener('click', () => abrirDetalle(p));
            if (ver) ver.addEventListener('click', () => abrirDetalle(p));
            const acciones = $('.mp-card-actions', c);
            if (acciones) acciones.remove(); // una respuesta enviada ya no se edita
        } else {
            $('.mp-answer-input', c).value = p.respuesta || '';
            $('.mp-btn--enviar', c).addEventListener('click', () => enviar(p, c, true));
            $('.mp-btn--borrador', c).addEventListener('click', () => enviar(p, c, false));
        }
        return c;
    }

    function aplicarFiltro() {
        const activo = $('#mis-preguntas-panel .mp-tab--active');
        const f = activo ? activo.getAttribute('data-filter') : 'todas';
        $$('#mpList .mp-card').forEach((c) => c.classList.toggle('mp-card--hidden', !(f === 'todas' || f === c.dataset.estado)));
    }

    async function cargarPreguntas() {
        if (!mpList) return;
        const r = await SPP.get(`/api/practicas/${practica.id}/preguntas`);
        preguntas = r.preguntas;
        mpList.innerHTML = '';
        if (!preguntas.length) {
            const v = document.createElement('p');
            v.style.cssText = 'padding:16px;opacity:.7';
            v.textContent = 'Tu tutor aún no te ha asignado preguntas.';
            mpList.appendChild(v);
            return;
        }
        preguntas.forEach((p) => mpList.appendChild(tarjetaPregunta(p)));
        aplicarFiltro();
    }
    $$('#mis-preguntas-panel .mp-tab').forEach((t) => t.addEventListener('click', () => setTimeout(aplicarFiltro, 0)));

    try {
        await Promise.all([cargarActividades(), cargarPreguntas()]);
    } catch (e) { SPP.error(e); }
});
