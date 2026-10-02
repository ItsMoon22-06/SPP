/* =========================================================================
   director.api.js — Conecta el panel del DIRECTOR con el controlador (/api):
   crear práctica, tipos de práctica, instituciones, consulta de prácticas e informes.
   (Gestión de usuarios: usuarios.js, también conectado a la API.)
   Se carga DESPUÉS de director.js y reemplaza sus manejadores de demostración.
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const $ = (s, r) => (r || document).querySelector(s);
    const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    const esc = SPP.esc;

    /** Quita los manejadores de demostración de un elemento reemplazándolo por una copia. */
    const limpio = (el) => { if (!el) return el; const c = el.cloneNode(true); el.replaceWith(c); return c; };

    /** Intercepta clics del menú "..." (ver/editar/eliminar) antes que los manejadores de demostración de director.js. */
    function interceptar(raiz, selectorTarjeta, acciones) {
        if (!raiz) return;
        raiz.addEventListener('click', (e) => {
            for (const [clase, fn] of Object.entries(acciones)) {
                const b = e.target.closest(clase);
                if (b && raiz.contains(b)) {
                    const card = b.closest(selectorTarjeta);
                    if (!card) return;
                    e.stopImmediatePropagation();
                    $$('.ev-menu-btn').forEach((m) => { m.setAttribute('aria-expanded', 'false'); if (m.nextElementSibling) m.nextElementSibling.classList.remove('is-open'); });
                    fn(card);
                    return;
                }
            }
        }, true);
    }

    // =====================================================================
    // 1) CREAR PRÁCTICA
    // =====================================================================
    const crear = $('#crear-practica');
    const selCrear = $$('.cp-input-wrap select', crear); // tipo, institución, estudiante, tutor, asesor
    const [selTipo, selInst, selEst, selTut, selAse] = selCrear;
    const [fIni, fFin] = $$('.cp-date-input', crear);
    let tipos = [];
    let instituciones = [];

    async function cargarOpcionesCrear() {
        try {
            const [t, i, u] = await Promise.all([
                SPP.get('/api/tipos-practica'), SPP.get('/api/instituciones'), SPP.get('/api/usuarios?estado=activo')
            ]);
            tipos = t.tipos; instituciones = i.instituciones;
            const por = (rol) => u.usuarios.filter((x) => x.rol === rol);
            SPP.llenarSelect(selTipo, tipos, 'idtipo', 'nombre', 'Selecciona Tipo de Práctica');
            SPP.llenarSelect(selInst, instituciones, 'idinstitucion', 'nombre', 'Selecciona la Institución');
            const nom = (x) => x.nombres + ' ' + x.apellidos;
            SPP.llenarSelect(selEst, por('estudiante'), 'docNumero', nom, 'Selecciona al Estudiante');
            SPP.llenarSelect(selTut, por('tutor'), 'docNumero', nom, 'Selecciona al Tutor');
            SPP.llenarSelect(selAse, por('asesor'), 'docNumero', nom, 'Selecciona al Asesor');
        } catch (e) { SPP.error(e); }
    }

    const btnGuardar = limpio($('.cp-btn-save', crear));
    const btnCancelarCrear = $('.cp-btn-cancel', crear);
    btnGuardar.addEventListener('click', async () => {
        const f = {
            idTipo: selTipo.value, idInstitucion: selInst.value, docEstudiante: selEst.value,
            docTutor: selTut.value, docAsesor: selAse.value, fechaInicio: fIni.value, fechaFin: fFin.value
        };
        if (Object.values(f).some((v) => !v)) { alert('Completa todos los campos de la práctica.'); return; }
        btnGuardar.disabled = true;
        try {
            await SPP.post('/api/practicas', f);
            $('#successModal').style.display = 'flex'; // modal original "Práctica creada exitosamente"
            await cargarPracticas();
        } catch (e) { SPP.error(e); }
        btnGuardar.disabled = false;
    });
    // "Aceptar" del modal ya limpia el formulario (director.js); además refrescamos los selects
    const aceptar = $('#modalAceptar');
    if (aceptar) aceptar.addEventListener('click', cargarOpcionesCrear);
    if (btnCancelarCrear) btnCancelarCrear.addEventListener('click', () => setTimeout(cargarOpcionesCrear, 0));

    // =====================================================================
    // 2) TIPOS DE PRÁCTICA
    // =====================================================================
    const gtpRoot = $('#gestionar-practicas');
    const gtpForm = limpio($('#gtp-form-registrar'));
    const gtpLista = $('#gtp-type-list');
    const plantillaTipo = $('.gtp-type-card', gtpLista) ? $('.gtp-type-card', gtpLista).cloneNode(true) : null;
    let editandoTipo = null;

    function tarjetaTipo(t) {
        const c = plantillaTipo.cloneNode(true);
        c.dataset.id = t.idtipo;
        c.dataset.codigo = t.codigo;
        $('.gtp-type-name', c).textContent = t.nombre;
        const items = $$('.gtp-meta-item', c);
        if (items[0]) items[0].innerHTML = '<span class="gtp-meta-key">Código de Práctica</span> ' + esc(t.codigo);
        if (items[1]) items[1].innerHTML = '<span class="gtp-meta-key">Semestre</span> ' + esc(t.semestre);
        if (items[2]) items[2].innerHTML = '<span class="gtp-meta-key">Horas</span> ' + esc(t.horas);
        return c;
    }

    async function cargarTipos() {
        try { tipos = (await SPP.get('/api/tipos-practica')).tipos; } catch (e) { SPP.error(e); return; }
        gtpLista.innerHTML = '';
        if (!tipos.length) gtpLista.innerHTML = '<p style="padding:16px;opacity:.7">Aún no hay tipos de práctica registrados.</p>';
        tipos.forEach((t) => gtpLista.appendChild(tarjetaTipo(t)));
    }

    function resetFormTipo() {
        gtpForm.reset();
        editandoTipo = null;
        $$('.cp-input-wrap select', gtpRoot).forEach((s) => { s.selectedIndex = 0; SPP.reconstruirSelectPersonalizado(s); });
    }
    const btnCancelTipo = limpio($('#gtp-btn-cancel'));
    btnCancelTipo.addEventListener('click', resetFormTipo);
    const horas = $('#gtp-horas');
    horas.addEventListener('input', () => { horas.value = horas.value.replace(/\D/g, ''); });

    gtpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cuerpo = { nombre: $('#gtp-nombre').value, semestre: $('#gtp-semestre').value, horas: horas.value };
        if (!cuerpo.nombre.trim() || !cuerpo.semestre || !cuerpo.horas) { alert('Completa nombre, semestre y horas.'); return; }
        try {
            if (editandoTipo) await SPP.put(`/api/tipos-practica/${editandoTipo}`, cuerpo);
            else await SPP.post('/api/tipos-practica', cuerpo);
            resetFormTipo();
            await cargarTipos();
            await cargarOpcionesCrear();
        } catch (err) { SPP.error(err); }
    });

    interceptar(gtpRoot, '.gtp-type-card', {
        '.ev-item--ver': (c) => {
            const t = tipos.find((x) => String(x.idtipo) === c.dataset.id);
            if (t) alert(`${t.nombre}\nCódigo: ${t.codigo}\nSemestre: ${t.semestre}\nHoras: ${t.horas}`);
        },
        '.ev-item--editar': (c) => {
            const t = tipos.find((x) => String(x.idtipo) === c.dataset.id);
            if (!t) return;
            editandoTipo = t.idtipo;
            $('#gtp-nombre').value = t.nombre; $('#gtp-semestre').value = String(t.semestre); horas.value = t.horas;
            SPP.reconstruirSelectPersonalizado($('#gtp-semestre'));
            const tr = $('#gtp-semestre').parentElement.querySelector('.custom-select-trigger');
            if (tr) { tr.textContent = String(t.semestre); tr.classList.remove('is-placeholder'); }
            const tab = $('[data-gtp-panel="gtp-panel-registrar"]', gtpRoot); if (tab) tab.click();
            window.scrollTo(0, 0);
        },
        '.ev-item--eliminar': async (c) => {
            if (!confirm('¿Eliminar este tipo de práctica?')) return;
            try { await SPP.del(`/api/tipos-practica/${c.dataset.id}`); await cargarTipos(); await cargarOpcionesCrear(); } catch (err) { SPP.error(err); }
        }
    });

    // =====================================================================
    // 3) INSTITUCIONES
    // =====================================================================
    const instRoot = $('#gestionar-instituciones');
    const instForm = limpio($('#inst-form-registrar'));
    const instLista = $('#inst-entity-list');
    const plantillaInst = $('.inst-entity-card', instLista) ? $('.inst-entity-card', instLista).cloneNode(true) : null;
    let editandoInst = null;

    function tarjetaInst(i) {
        const c = plantillaInst.cloneNode(true);
        c.dataset.id = i.idinstitucion;
        $('.ev-card-title', c).textContent = i.nombre;
        const m = $$('.entity-meta-item', c);
        if (m[0]) m[0].innerHTML = '<span class="entity-meta-key">NIT</span> ' + esc(i.nit);
        if (m[1]) m[1].innerHTML = '<span class="entity-meta-key">Encargado</span> ' + esc(i.encargado);
        if (m[2]) m[2].innerHTML = '<span class="entity-meta-key">Correo</span> ' + esc(i.correo);
        $('.entity-card-desc', c).textContent = i.direccion;
        return c;
    }

    async function cargarInstituciones() {
        try { instituciones = (await SPP.get('/api/instituciones')).instituciones; } catch (e) { SPP.error(e); return; }
        instLista.innerHTML = '';
        if (!instituciones.length) instLista.innerHTML = '<p style="padding:16px;opacity:.7">Aún no hay instituciones registradas.</p>';
        instituciones.forEach((i) => instLista.appendChild(tarjetaInst(i)));
    }

    const btnCancelInst = limpio($('#inst-btn-cancel'));
    btnCancelInst.addEventListener('click', () => { instForm.reset(); editandoInst = null; });
    const nit = $('#inst-nit');
    nit.addEventListener('input', () => { nit.value = nit.value.replace(/[^\d-]/g, ''); });

    instForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const cuerpo = {
            nit: nit.value, encargado: $('#inst-encargado').value, direccion: $('#inst-direccion').value,
            nombre: $('#inst-nombre').value, correo: $('#inst-correo').value
        };
        try {
            if (editandoInst) await SPP.put(`/api/instituciones/${editandoInst}`, cuerpo);
            else await SPP.post('/api/instituciones', cuerpo);
            instForm.reset(); editandoInst = null;
            await cargarInstituciones();
            await cargarOpcionesCrear();
        } catch (err) { SPP.error(err); }
    });

    interceptar(instRoot, '.inst-entity-card', {
        '.ev-item--ver': (c) => {
            const i = instituciones.find((x) => String(x.idinstitucion) === c.dataset.id);
            if (i) alert(`${i.nombre}\nNIT: ${i.nit}\nEncargado: ${i.encargado}\nCorreo: ${i.correo}\nDirección: ${i.direccion}`);
        },
        '.ev-item--editar': (c) => {
            const i = instituciones.find((x) => String(x.idinstitucion) === c.dataset.id);
            if (!i) return;
            editandoInst = i.idinstitucion;
            nit.value = i.nit; $('#inst-encargado').value = i.encargado; $('#inst-direccion').value = i.direccion;
            $('#inst-nombre').value = i.nombre; $('#inst-correo').value = i.correo;
            const tab = $('[data-inst-panel]', instRoot); if (tab) tab.click();
            window.scrollTo(0, 0);
        },
        '.ev-item--eliminar': async (c) => {
            if (!confirm('¿Eliminar esta institución?')) return;
            try { await SPP.del(`/api/instituciones/${c.dataset.id}`); await cargarInstituciones(); await cargarOpcionesCrear(); } catch (err) { SPP.error(err); }
        }
    });

    // =====================================================================
    // 4) PRÁCTICAS (panel "Prácticas" del Director: consulta de cualquier práctica)
    // =====================================================================
    const poner = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v == null ? '' : v; el.readOnly = true; } };
    const panelPractica = $('#practica .practice-panel');
    let practicas = [];
    const caja = document.createElement('div');
    caja.className = 'practice-field';
    caja.style.margin = '0 0 24px';
    caja.innerHTML = '<label for="practica-selector">Práctica (estudiante)</label>' +
        '<select id="practica-selector" style="width:100%;height:56px;padding:0 16px;border:0;border-radius:12px;background:var(--input-bg);box-shadow:var(--input-shadow);color:var(--input-text);font-family:var(--font-serif);font-size:16px;font-weight:700"></select>';
    $('.practice-form', panelPractica).insertAdjacentElement('beforebegin', caja);
    const selector = $('#practica-selector', caja);

    function mostrarPractica(id) {
        const p = practicas.find((x) => x.id === Number(id));
        if (!p) return;
        poner('nombre-practica', p.nombre); poner('tutor', p.tutor); poner('horas', p.horas); poner('institucion', p.institucion);
        poner('asesor', p.asesor); poner('semestre', p.semestre); poner('fecha-inicio', SPP.fecha(p.fechaInicio));
        poner('fecha-final', SPP.fecha(p.fechaFin)); poner('codigo', p.codigo);
        const badge = $('#practica .status-badge');
        if (badge) { badge.title = p.estado; badge.style.backgroundColor = { activa: '#265c48', finalizada: '#6b7280', cancelada: '#b3261e' }[p.estado] || ''; }
        const info = $$('#practica #bitacora-panel .b-info-value');
        if (info.length >= 4) {
            info[0].textContent = SPP.fecha(p.bitacora.creada);
            info[1].textContent = p.bitacora.notaFinal != null ? Number(p.bitacora.notaFinal).toFixed(1) : 'Sin calificar';
            info[2].textContent = p.bitacora.observacionGeneral || 'Sin observaciones';
            info[3].textContent = p.bitacora.estado === 'activa' ? 'Activa' : 'Cerrada';
        }
        const nombre = $('#practica .b-student-name'); if (nombre) nombre.textContent = '- ' + p.estudiante;
        window.SPP_ESTUDIANTE_ACTUAL = {
            nombres: p.estudiante, apellidos: '', docTipo: p.estudianteDetalle.docTipo, docNumero: p.docEstudiante,
            estado: p.estudianteDetalle.estado, programa: p.estudianteDetalle.programa, correo: p.estudianteDetalle.correo
        };
    }

    async function cargarPracticas() {
        try { practicas = (await SPP.get('/api/practicas')).practicas; } catch (e) { SPP.error(e); return; }
        const btn = $('#practica .practice-submit');
        if (!practicas.length) {
            selector.innerHTML = '<option>No hay prácticas creadas</option>'; selector.disabled = true;
            if (btn) btn.disabled = true;
            return;
        }
        selector.disabled = false; if (btn) btn.disabled = false;
        const previo = selector.value;
        selector.innerHTML = practicas.map((p) => `<option value="${p.id}">${esc(p.estudiante)} — ${esc(p.codigo)} (${esc(p.estado)})</option>`).join('');
        if (previo && practicas.some((p) => String(p.id) === previo)) selector.value = previo;
        mostrarPractica(selector.value);
    }
    selector.addEventListener('change', () => mostrarPractica(selector.value));

    // =====================================================================
    // 5) INFORMES (indicadores de acreditación: PostgreSQL -> MongoDB)
    // =====================================================================
    const wrapper = $('#informes .informes-wrapper');
    const barra = document.createElement('section');
    barra.style.cssText = 'margin:0 0 24px;padding:18px 20px;border-radius:14px;background:var(--input-bg);box-shadow:var(--input-shadow)';
    barra.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">' +
        '<strong style="font-family:var(--font-serif);font-size:18px">Indicadores de acreditación (datos reales)</strong>' +
        '<div style="display:flex;gap:10px;align-items:center"><label for="ind-anio">Año</label>' +
        '<input id="ind-anio" type="number" min="2000" max="2100" style="width:90px;height:40px;border-radius:8px;border:1px solid #ccc;padding:0 8px">' +
        '<button type="button" class="cp-btn cp-btn-save" id="ind-generar" style="margin:0">Generar y guardar</button></div></div>' +
        '<div id="ind-resumen" style="display:flex;flex-wrap:wrap;gap:12px;margin-top:14px"></div>' +
        '<div id="ind-detalle" style="margin-top:14px;overflow-x:auto"></div>';
    $('.informes-tabs', wrapper).insertAdjacentElement('beforebegin', barra);
    $('#ind-anio').value = new Date().getFullYear();

    function pintarResumen(r) {
        const k = (t, v) => `<div style="padding:10px 16px;border-radius:10px;background:rgba(40,131,96,.12);min-width:130px"><div style="font-size:12px;opacity:.75">${t}</div><div style="font-size:22px;font-weight:700">${esc(v == null ? '—' : v)}</div></div>`;
        $('#ind-resumen').innerHTML = k('Prácticas', r.practicas) + k('Activas', r.activas) + k('Estudiantes activos', r.estudiantes) +
            k('Tutores', r.tutores) + k('Asesores', r.asesores) + k('Instituciones', r.instituciones) + k('Nota promedio', r.promedionota);
    }

    function pintarIndicadores(lista) {
        if (!lista.length) { $('#ind-detalle').innerHTML = '<p style="opacity:.7">Aún no hay indicadores guardados para este año. Pulsa "Generar y guardar".</p>'; return; }
        const filas = lista.map((i) =>
            `<tr><td>${esc(i.nombrePrograma)}</td><td>${esc(i.totalEstudiantesActivos)}</td><td>${esc(i.practicasPorTipo.reduce((a, x) => a + x.cantidad, 0))}</td>` +
            `<td>${esc(i.tasaDesercion)}%</td><td>${esc(i.duracionPromedioPracticasDias)} d</td>` +
            `<td>${esc(i.acompanamientoDocente.retroalimentacionesTutor)} / ${esc(i.acompanamientoDocente.retroalimentacionesAsesor)}</td></tr>`).join('');
        $('#ind-detalle').innerHTML = '<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr style="text-align:left;border-bottom:2px solid #288360">' +
            '<th>Programa</th><th>Est. activos</th><th>Prácticas</th><th>Deserción</th><th>Duración prom.</th><th>Retro tutor / asesor</th></tr></thead><tbody>' + filas + '</tbody></table>';
    }

    async function cargarInformes() {
        try {
            pintarResumen((await SPP.get('/api/informes/resumen')).resumen);
            pintarIndicadores((await SPP.get('/api/informes?anio=' + encodeURIComponent($('#ind-anio').value))).indicadores);
        } catch (e) { $('#ind-detalle').innerHTML = '<p style="color:#b3261e">' + esc(e.message) + '</p>'; }
    }
    $('#ind-generar').addEventListener('click', async (e) => {
        e.target.disabled = true;
        try {
            const r = await SPP.post('/api/informes/generar', { anio: Number($('#ind-anio').value) });
            pintarIndicadores(r.indicadores);
            pintarResumen((await SPP.get('/api/informes/resumen')).resumen);
        } catch (err) { SPP.error(err); }
        e.target.disabled = false;
    });
    $('#ind-anio').addEventListener('change', cargarInformes);

    // ---------- arranque ----------
    cargarOpcionesCrear();
    cargarTipos();
    cargarInstituciones();
    cargarPracticas();
    cargarInformes();
});
