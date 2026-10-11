/* =========================================================================
   tutor.api.js — Lo que es propio del TUTOR: banco de preguntas (CRUD en la base de
   datos), asignación de preguntas a la práctica del estudiante y registro de nota.
   (La parte común con el asesor está en docente.api.js.)
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const TEMAS = { pedagogia: 'Pedagogía', didactica: 'Didáctica', evaluacion: 'Evaluación' };

    const panelBanco = $('#banco-preguntas-panel');
    const panelCrear = $('#crear-pregunta-panel');
    const lista = $('#bpList');
    if (!lista) return;
    const plantilla = $('.bp-card', lista).cloneNode(true);
    const buscar = $('#bpSearchInput');
    const filtro = $('#bpFilterTema');
    const volverArriba = () => { window.scrollTo(0, 0); const s = $('.app-shell'); if (s) s.scrollTop = 0; };

    let editandoId = null;
    let preguntas = [];

    // ---------- el formulario original no pedía "tema": se agrega ----------
    const campoTipoPractica = $('#cpTipoPractica').closest('.cp-field');
    const campoTema = campoTipoPractica.cloneNode(true);
    const labelTema = $('label', campoTema);
    if (labelTema) { labelTema.textContent = 'Tema'; labelTema.setAttribute('for', 'cpTema'); }
    const selTema = $('select', campoTema);
    selTema.id = 'cpTema';
    selTema.innerHTML = '<option value="" selected disabled>Selecciona el tema</option>' +
        Object.entries(TEMAS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('');
    campoTipoPractica.insertAdjacentElement('beforebegin', campoTema);

    const f = {
        enunciado: $('#cpEnunciado'), tema: selTema, tipoPractica: $('#cpTipoPractica'),
        tipoPregunta: $('#cpTipoPregunta'), valor: $('#cpValor')
    };
    const limpiar = () => {
        f.enunciado.value = '';
        [f.tema, f.tipoPractica, f.tipoPregunta, f.valor].forEach((s) => { s.selectedIndex = 0; });
        editandoId = null;
        const t = $('#crear-pregunta-title'); if (t) t.textContent = 'Crear Pregunta';
    };

    // Copias limpias de los botones (descartan los manejadores de demostración de tutor.js)
    function reemplazar(sel) { const b = $(sel); const c = b.cloneNode(true); b.replaceWith(c); return c; }
    const btnCrear = reemplazar('#bpCrearBtn');
    const btnCancelar = reemplazar('#cpCancelarBtn');
    const btnGuardar = reemplazar('#cpGuardarBtn');

    function mostrarForm(visible) {
        panelBanco.style.display = visible ? 'none' : 'flex';
        panelCrear.style.display = visible ? 'flex' : 'none';
        volverArriba();
    }
    btnCrear.addEventListener('click', () => { limpiar(); mostrarForm(true); });
    btnCancelar.addEventListener('click', () => { limpiar(); mostrarForm(false); });

    btnGuardar.addEventListener('click', async () => {
        const cuerpo = {
            enunciado: f.enunciado.value, tema: f.tema.value, tipoPractica: f.tipoPractica.value,
            tipoPregunta: f.tipoPregunta.value, valor: f.valor.value
        };
        if (!cuerpo.enunciado.trim()) { alert('Por favor escribe el enunciado de la pregunta.'); return; }
        if (!cuerpo.tema) { alert('Selecciona el tema de la pregunta.'); return; }
        if (!cuerpo.tipoPregunta) { alert('Selecciona el tipo de pregunta.'); return; }
        if (!cuerpo.valor) { alert('Selecciona el valor de la pregunta.'); return; }
        try {
            if (editandoId) await SPP.put(`/api/preguntas/${editandoId}`, cuerpo);
            else await SPP.post('/api/preguntas', cuerpo);
            alert('Pregunta guardada con éxito');
            limpiar(); mostrarForm(false);
            await cargar();
        } catch (e) { SPP.error(e); }
    });

    // ---------- listado ----------
    function tarjeta(p) {
        const c = plantilla.cloneNode(true);
        c.dataset.tema = p.tema;
        const spans = $$('.bp-card-head > span', c);
        if (spans[0]) spans[0].textContent = 'ID: ' + p.codigo;
        const tag = $('.bp-tag', c); if (tag) tag.textContent = TEMAS[p.tema] || p.tema;
        $('.bp-card-question', c).textContent = p.enunciado;
        $('.bp-card-date', c).textContent = 'Fecha: ' + SPP.fecha(p.fecha);

        $('.bp-icon-del', c).addEventListener('click', async () => {
            if (!confirm('¿Eliminar la pregunta "' + p.enunciado + '"?')) return;
            try { await SPP.del(`/api/preguntas/${p.id}`); await cargar(); } catch (e) { SPP.error(e); }
        });
        $('.bp-icon-edit', c).addEventListener('click', () => {
            editandoId = p.id;
            f.enunciado.value = p.enunciado;
            f.tema.value = p.tema; f.tipoPractica.value = p.tipoPractica || ''; f.tipoPregunta.value = p.tipoPregunta; f.valor.value = String(p.valor);
            const t = $('#crear-pregunta-title'); if (t) t.textContent = 'Editar Pregunta';
            mostrarForm(true);
        });
        $('.bp-icon-dup', c).addEventListener('click', async () => {
            try {
                await SPP.post('/api/preguntas', { enunciado: p.enunciado, tema: p.tema, tipoPractica: p.tipoPractica, tipoPregunta: p.tipoPregunta, valor: p.valor });
                await cargar();
            } catch (e) { SPP.error(e); }
        });

        // Botón nuevo: asignar esta pregunta a la práctica seleccionada (el estudiante la verá en "Mis Preguntas")
        const asignar = document.createElement('button');
        asignar.type = 'button';
        asignar.className = 'bp-icon-btn bp-icon-asignar';
        asignar.title = 'Asignar a la práctica seleccionada';
        asignar.setAttribute('aria-label', 'Asignar pregunta a la práctica');
        asignar.innerHTML = '<i class="fa-solid fa-paper-plane"></i>';
        asignar.addEventListener('click', async () => {
            const practica = window.SPP_DOCENTE && window.SPP_DOCENTE.estado.practica;
            if (!practica) { alert('Primero selecciona una práctica.'); return; }
            if (!confirm('¿Asignar esta pregunta a ' + practica.estudiante + '?')) return;
            try { await SPP.post(`/api/practicas/${practica.id}/preguntas`, { idPregunta: p.id }); alert('Pregunta asignada'); } catch (e) { SPP.error(e); }
        });
        $('.bp-card-actions', c).appendChild(asignar);
        return c;
    }

    async function cargar() {
        const q = new URLSearchParams();
        if (buscar && buscar.value.trim()) q.set('q', buscar.value.trim());
        if (filtro && filtro.value !== 'todas') q.set('tema', filtro.value);
        try { preguntas = (await SPP.get('/api/preguntas?' + q.toString())).preguntas; } catch (e) { SPP.error(e); return; }
        lista.innerHTML = '';
        if (!preguntas.length) {
            const v = document.createElement('p'); v.style.cssText = 'padding:16px;opacity:.7'; v.textContent = 'No hay preguntas en el banco.';
            lista.appendChild(v); return;
        }
        preguntas.forEach((p) => lista.appendChild(tarjeta(p)));
    }
    let espera = null;
    if (buscar) buscar.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(cargar, 250); });
    if (filtro) filtro.addEventListener('change', cargar);

    // ---------- nota final y observación de la bitácora ----------
    const panelBitacora = $('#bitacora-panel');
    if (panelBitacora) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'b-action-btn';
        btn.style.margin = '12px 0 0';
        btn.textContent = 'Registrar nota y observación';
        $('.bitacora-info-card', panelBitacora).insertAdjacentElement('afterend', btn);
        btn.addEventListener('click', async () => {
            const est = window.SPP_DOCENTE && window.SPP_DOCENTE.estado;
            if (!est || !est.practica) return;
            const actual = est.practica.bitacora;
            const nota = prompt('Nota final (0.0 a 5.0):', actual.notaFinal != null ? actual.notaFinal : '');
            if (nota === null) return;
            const obs = prompt('Observación general:', actual.observacionGeneral || '');
            if (obs === null) return;
            try {
                await SPP.patch(`/api/practicas/${est.practica.id}/bitacora`, { notaFinal: nota, observacionGeneral: obs });
                await window.SPP_DOCENTE.recargarBitacora();
            } catch (e) { SPP.error(e); }
        });
    }

    cargar();
});
