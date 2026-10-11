// Lógica específica para la vista de Estudiante
document.addEventListener('DOMContentLoaded', () => {
    const btnEntrar = document.querySelector('.practice-submit');
    const practicePanel = document.querySelector('.practice-panel');
    const bitacoraPanel = document.getElementById('bitacora-panel');
    const bitacoraBackBtn = document.getElementById('bitacoraBack');

    const actividadesPanel = document.getElementById('actividades-panel');
    const actividadesBackBtn = document.getElementById('actividadesBack');
    // querySelectorAll captura los 6 botones "Entrar" (uno por actividad)
    const actividadesBtns = document.querySelectorAll('.actividad-entrar-btn');

    const preguntasPanel = document.getElementById('preguntas-panel');
    const preguntasBackBtn = document.getElementById('preguntasBack');

    const misPreguntasPanel = document.getElementById('mis-preguntas-panel');
    const misPreguntasBackBtn = document.getElementById('misPreguntasBack');
    const mpDetallePanel = document.getElementById('mp-detalle-panel');
    const mpDetalleBackBtn = document.getElementById('mpDetalleBack');

    const evidenciasPanel = document.getElementById('evidencias-panel');
    const evidenciasBackBtn = document.getElementById('evidenciasBack');
    const evidenciasTitleEl = document.getElementById('evidencias-title');

    // Botones de acción de la bitácora identificados por contexto
    const bitacoraActionBtns = bitacoraPanel
        ? bitacoraPanel.querySelectorAll('.b-action-btn')
        : [];
    const actividadesEntrarBitacora = bitacoraActionBtns[0] || null;
    const preguntasBtn = bitacoraActionBtns[1] || null;

    // Botones de acción del panel de preguntas
    const preguntasActionBtns = preguntasPanel
        ? preguntasPanel.querySelectorAll('.b-action-btn')
        : [];
    const preguntasEntrarActividades = preguntasActionBtns[0] || null;
    const preguntasEntrarPreguntas = preguntasActionBtns[1] || null;

    function resetScroll() {
        window.scrollTo(0, 0);
        const wrapper = document.querySelector('.practice-content-wrapper');
        if (wrapper) wrapper.scrollTop = 0;
        const appShell = document.querySelector('.app-shell');
        if (appShell) appShell.scrollTop = 0;
    }

    // ── Entrar a Bitácora desde Práctica ──────────────────────────────────
    if (btnEntrar && practicePanel && bitacoraPanel) {
        btnEntrar.addEventListener('click', () => {
            practicePanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Volver a Práctica desde Bitácora ──────────────────────────────────
    if (bitacoraBackBtn && practicePanel && bitacoraPanel) {
        bitacoraBackBtn.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            practicePanel.style.display = 'block';
            resetScroll();
        });
    }

    // ── Entrar a Actividades desde Bitácora o Preguntas ───────────────────────────────
    if (actividadesEntrarBitacora && bitacoraPanel && actividadesPanel) {
        actividadesEntrarBitacora.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            actividadesPanel.style.display = 'flex';
            resetScroll();
        });
    }
    if (preguntasEntrarActividades) {
        preguntasEntrarActividades.addEventListener('click', () => {
            alert('Sección en construcción');
        });
    }
    // ── Entrar a "Mis Preguntas de Práctica" desde Sección de Preguntas ───
    if (preguntasEntrarPreguntas && preguntasPanel && misPreguntasPanel) {
        preguntasEntrarPreguntas.addEventListener('click', () => {
            preguntasPanel.style.display = 'none';
            misPreguntasPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Volver a Sección de Preguntas desde Mis Preguntas de Práctica ─────
    if (misPreguntasBackBtn && preguntasPanel && misPreguntasPanel) {
        misPreguntasBackBtn.addEventListener('click', () => {
            misPreguntasPanel.style.display = 'none';
            preguntasPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Tabs: Todas / Por Responder / Respondidas ─────────────────────────
    const mpTabs = misPreguntasPanel ? misPreguntasPanel.querySelectorAll('.mp-tab') : [];
    const mpCards = misPreguntasPanel ? misPreguntasPanel.querySelectorAll('.mp-card') : [];
    mpTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            mpTabs.forEach(t => {
                t.classList.remove('mp-tab--active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('mp-tab--active');
            tab.setAttribute('aria-selected', 'true');

            const filter = tab.getAttribute('data-filter');
            mpCards.forEach(card => {
                const estado = card.getAttribute('data-estado');
                const visible = (filter === 'todas') || (filter === estado);
                card.classList.toggle('mp-card--hidden', !visible);
            });
        });
    });

    // ── Ver retroalimentación del tutor (Ver Historial / Ver) ─────────────
    function abrirDetallePregunta(card) {
        if (!mpDetallePanel) return;
        const num = card.getAttribute('data-num') || 'Pregunta';
        const categoria = card.getAttribute('data-categoria') || '';
        const pregunta = card.getAttribute('data-pregunta') || '';
        const observacion = card.getAttribute('data-observacion') || 'Sin observaciones aún.';

        const elNum = document.getElementById('mpDetalleNum');
        const elCat = document.getElementById('mpDetalleCategoria');
        const elPregunta = document.getElementById('mpDetallePregunta');
        const elObs = document.getElementById('mpDetalleObservacion');
        if (elNum) elNum.textContent = num;
        if (elCat) elCat.textContent = categoria;
        if (elPregunta) elPregunta.textContent = pregunta;
        if (elObs) elObs.textContent = observacion;

        if (misPreguntasPanel) misPreguntasPanel.style.display = 'none';
        mpDetallePanel.style.display = 'flex';
        resetScroll();
    }

    mpCards.forEach(card => {
        const historialBtn = card.querySelector('.mp-btn--historial');
        const verLink = card.querySelector('.mp-ver-link');
        if (historialBtn) historialBtn.addEventListener('click', () => abrirDetallePregunta(card));
        if (verLink) verLink.addEventListener('click', () => abrirDetallePregunta(card));
    });

    if (mpDetalleBackBtn && mpDetallePanel && misPreguntasPanel) {
        mpDetalleBackBtn.addEventListener('click', () => {
            mpDetallePanel.style.display = 'none';
            misPreguntasPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Enviar respuesta / Guardar borrador ────────────────────────────────
    mpCards.forEach(card => {
        const textarea = card.querySelector('.mp-answer-input');
        const enviarBtn = card.querySelector('.mp-btn--enviar');
        const borradorBtn = card.querySelector('.mp-btn--borrador');

        if (enviarBtn) {
            enviarBtn.addEventListener('click', () => {
                const texto = textarea ? textarea.value.trim() : '';
                if (textarea && !texto) {
                    alert('Por favor escribe una respuesta antes de enviar.');
                    return;
                }
                alert('Respuesta enviada con éxito');
                if (textarea) textarea.value = '';
            });
        }
        if (borradorBtn) {
            borradorBtn.addEventListener('click', () => {
                console.log('Borrador guardado:', textarea ? textarea.value : '');
                alert('Borrador guardado');
            });
        }
    });

    // ── Volver a Bitácora desde Actividades ───────────────────────────────
    if (actividadesBackBtn && bitacoraPanel && actividadesPanel) {
        actividadesBackBtn.addEventListener('click', () => {
            actividadesPanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Entrar a Evidencias desde cualquier botón de Actividad (#1 al #6) ─
    if (actividadesBtns.length > 0 && actividadesPanel && evidenciasPanel) {
        actividadesBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const numActividad = btn.getAttribute('data-actividad');
                // Actualiza el título para mostrar a qué actividad pertenecen las evidencias
                if (evidenciasTitleEl) {
                    evidenciasTitleEl.textContent = `Evidencias — Actividad #${numActividad}`;
                }
                actividadesPanel.style.display = 'none';
                evidenciasPanel.style.display = 'flex';
                resetScroll();
            });
        });
    }

    // ── Volver a Actividades desde Evidencias ─────────────────────────────
    if (evidenciasBackBtn && actividadesPanel && evidenciasPanel) {
        evidenciasBackBtn.addEventListener('click', () => {
            evidenciasPanel.style.display = 'none';
            actividadesPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Entrar a Preguntas desde Bitácora ─────────────────────────────────
    if (preguntasBtn && bitacoraPanel && preguntasPanel) {
        preguntasBtn.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            preguntasPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Volver a Bitácora desde Preguntas ─────────────────────────────────
    if (preguntasBackBtn && bitacoraPanel && preguntasPanel) {
        preguntasBackBtn.addEventListener('click', () => {
            preguntasPanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Menú "..." en tarjetas de Evidencias y Retroalimentaciones ────────
    // Panel flotante a la izquierda del botón (estilo director); el botón
    // permanece fijo al final y pasa a flecha ← al abrir.
    function setEvMenuState(btn, open) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');

        const dd = btn.nextElementSibling; // .ev-dropdown
        if (dd) dd.classList.toggle('is-open', open);

        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-ellipsis', !open);
            icon.classList.toggle('fa-arrow-left', open);
        }
    }

    function closeAllEvDropdowns(exceptBtn) {
        document.querySelectorAll('.ev-menu-btn').forEach(btn => {
            if (btn === exceptBtn) return;
            setEvMenuState(btn, false);
        });
    }

    document.querySelectorAll('.ev-menu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = btn.getAttribute('aria-expanded') === 'true';
            closeAllEvDropdowns(btn);
            setEvMenuState(btn, !isOpen);
        });
    });

    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', () => closeAllEvDropdowns(null));


    // ── Abrir modal de "Ver evidencia" ──────────────────────────────────
    document.querySelectorAll('.ev-item--ver').forEach(btn => {
        btn.addEventListener('click', () => {
            // Opcional: aquí puedes abrir un modal con un <iframe> o la imagen
            console.log('Abrir evidencia (ver)');
        });
    });

    // ── Abrir modal/área de "Editar evidencia" ───────────────────────────
    document.querySelectorAll('.ev-item--editar').forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Abrir evidencia (editar)');
        });
    });

    // ── Abrir modal de confirmación para "Eliminar evidencia" ─────────────
    document.querySelectorAll('.ev-item--eliminar').forEach(btn => {
        btn.addEventListener('click', () => {
            const evidenciaTitle = btn.closest('.ev-card').querySelector('.ev-card-title').textContent;
            console.log('Eliminar evidencia:', evidenciaTitle);
            // Aquí puedes mostrar un modal de confirmación antes de eliminar
        });
    });
});