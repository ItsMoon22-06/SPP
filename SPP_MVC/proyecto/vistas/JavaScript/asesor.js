// Lógica específica para la vista de Asesor
document.addEventListener('DOMContentLoaded', () => {
    const btnEntrar = document.querySelector('.practice-submit');
    const practicePanel = document.querySelector('.practice-panel');
    const bitacoraPanel = document.getElementById('bitacora-panel');
    const bitacoraBackBtn = document.getElementById('bitacoraBack');

    const actividadesPanel = document.getElementById('actividades-panel');
    const actividadesBackBtn = document.getElementById('actividadesBack');
    // querySelectorAll captura los 6 botones "Entrar" (uno por actividad)
    const actividadesBtns = document.querySelectorAll('.actividad-entrar-btn');

    const evidenciasPanel = document.getElementById('evidencias-panel');
    const evidenciasBackBtn = document.getElementById('evidenciasBack');
    const evidenciasTitleEl = document.getElementById('evidencias-title');

    // El bitacora-panel del asesor tiene UN solo .b-action-btn: Actividades
    const actividadesEntrarBitacora = bitacoraPanel
        ? bitacoraPanel.querySelector('.b-action-btn')
        : null;

    function resetScroll() {
        window.scrollTo(0, 0);
        // En móvil el scroll está en .app-shell
        const appShell = document.querySelector('.app-shell');
        if (appShell) appShell.scrollTop = 0;
        const wrapper = document.querySelector('.practice-content-wrapper');
        if (wrapper) wrapper.scrollTop = 0;
    }

    // Entrar a Bitácora desde Práctica
    if (btnEntrar && practicePanel && bitacoraPanel) {
        btnEntrar.addEventListener('click', () => {
            practicePanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // Volver a Práctica desde Bitácora
    if (bitacoraBackBtn && practicePanel && bitacoraPanel) {
        bitacoraBackBtn.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            practicePanel.style.display = 'block';
            resetScroll();
        });
    }

    // Entrar a Actividades desde Bitácora
    if (actividadesEntrarBitacora && bitacoraPanel && actividadesPanel) {
        actividadesEntrarBitacora.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            actividadesPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // Volver a Bitácora desde Actividades
    if (actividadesBackBtn && bitacoraPanel && actividadesPanel) {
        actividadesBackBtn.addEventListener('click', () => {
            actividadesPanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetScroll();
        });
    }

    // ── Entrar a Evidencias desde cualquier botón de Actividad (#1 al #6) ─
    if (actividadesBtns.length > 0 && actividadesPanel && evidenciasPanel) {
        actividadesBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                // Intentamos sacar el número, si no existe usamos el índice + 1
                const numActividad = btn.getAttribute('data-actividad') || (index + 1);

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

    // ── Enviar / Cancelar Retroalimentación ─────────────────────────────
    const retroBtnSubmit = document.querySelector('.retro-btn-submit');
    const retroBtnCancel = document.querySelector('.retro-btn-cancel');
    const retroTextarea = document.querySelector('.retro-textarea');

    // Auto-crecer textarea y mantener visible el botón "Cancelar" mientras se escribe.
    // Antes se llamaba scrollIntoView({behavior:'smooth'}) en CADA tecla; como cada
    // llamada dispara su propia animación, escribir rápido apilaba varias animaciones
    // de scroll pisándose entre sí — eso era el texto "brincando" (y en el fondo, la
    // misma causa del bug de la barra superior en móvil: el contenedor de scroll
    // quedaba en un estado intermedio inconsistente hasta salir y volver a entrar).
    // Ahora: (1) se agrupan los eventos por fotograma con requestAnimationFrame en vez
    // de reaccionar a cada tecla suelta, (2) solo se mueve el scroll si el botón
    // realmente ya no es visible, y (3) el scroll es instantáneo (sin "smooth"), para
    // que nunca haya dos animaciones corriendo a la vez.
    if (retroTextarea) {
        let retroScrollRaf = null;
        retroTextarea.addEventListener('input', () => {
            retroTextarea.style.height = 'auto';
            retroTextarea.style.height = Math.min(retroTextarea.scrollHeight, 200) + 'px';

            if (!retroBtnCancel) return;
            if (retroScrollRaf) cancelAnimationFrame(retroScrollRaf);
            retroScrollRaf = requestAnimationFrame(() => {
                if (typeof scrollAppShellToReveal === 'function') {
                    scrollAppShellToReveal(retroBtnCancel);
                }
            });
        });
    }

    if (retroBtnSubmit && retroTextarea) {
        retroBtnSubmit.addEventListener('click', () => {
            const text = retroTextarea.value.trim();
            if (text) {
                console.log('Enviando retroalimentación:', text);
                retroTextarea.value = '';
                retroTextarea.style.height = 'auto';
                alert('Retroalimentación enviada con éxito');
            } else {
                alert('Por favor ingrese un comentario antes de enviar.');
            }
        });
    }

    if (retroBtnCancel && retroTextarea) {
        retroBtnCancel.addEventListener('click', () => {
            retroTextarea.value = '';
            retroTextarea.style.height = 'auto';
            console.log('Edición de retroalimentación cancelada');
        });
    }
});
/* --- Credencial Estudiante en Bitacora --- */
function plantillaCredencialBitacora(u) {
   const nombre = u.nombres + ' ' + u.apellidos;
   const doc = (u.docTipo || '-') + '  •  ' + (u.docNumero || '—');
   const estado = (u.estado || 'activo');
   const anio = new Date().getFullYear();
   return '' +
      '<article class="b-cred">' +
      '  <header class="b-cred-top">' +
      '    <div class="b-cred-brand">' +
      '      <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>' +
      '      <p>Credencial<br>universitaria <em>' + anio + '</em></p>' +
      '    </div>' +
      '    <span class="b-cred-state b-cred-state--' + estado + '">' + (estado.toUpperCase()) + '</span>' +
      '  </header>' +
      '  <div class="b-cred-body">' +
      '    <h3 class="b-cred-name">' + nombre + '</h3>' +
      '    <p class="b-cred-doc">' + doc + '</p>' +
      '    <span class="b-cred-role"><i class="fa-solid fa-user-graduate" aria-hidden="true"></i>Estudiante</span>' +
      '    <dl class="b-cred-meta">' +
      '      <div><dt>Programa académico</dt><dd>' + (u.programa || 'Sin asignar') + '</dd></div>' +
      '      <div><dt>Correo</dt><dd class="is-mono">' + (u.correo || 'usuario@unicesar.edu.co') + '</dd></div>' +
      '    </dl>' +
      '  </div>' +
      '</article>' +
      '<button type="button" class="b-modal-close" onclick="document.getElementById(\'b-modal-credencial\').style.display=\'none\'">Cerrar</button>';
}

document.addEventListener('click', (e) => {
   const studentNameEl = e.target.closest('.b-student-name');
   if (studentNameEl) {
      const mockStudent = window.SPP_ESTUDIANTE_ACTUAL || {
         nombres: 'Edwin',
         apellidos: 'Pruebas',
         docTipo: 'CC',
         docNumero: '123456789',
         estado: 'activo',
         programa: 'Ingeniería de Sistemas',
         correo: 'epruebas@unicesar.edu.co'
      };
      const modal = document.getElementById('b-modal-credencial');
      const body = document.getElementById('b-modal-credencial-body');
      if (modal && body) {
         body.innerHTML = plantillaCredencialBitacora(mockStudent);
         modal.style.display = 'flex';
      }
   }
});
