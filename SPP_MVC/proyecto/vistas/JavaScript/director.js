document.addEventListener('DOMContentLoaded', () => {
    const btnCancel = document.querySelector('#crear-practica .cp-btn-cancel');
    const btnSave = document.querySelector('#crear-practica .cp-btn-save');
    const formInputs = document.querySelectorAll('#crear-practica input, #crear-practica select');
    const successModal = document.getElementById('successModal');
    const modalAceptar = document.getElementById('modalAceptar');

    const crearRoot = document.querySelector('#crear-practica');

    if (btnCancel && crearRoot) {
        btnCancel.addEventListener('click', () => {
            formInputs.forEach(input => {
                if (input.tagName === 'SELECT') {
                    input.selectedIndex = 0;
                } else {
                    input.value = '';
                }
            });
            resetCustomSelectsInRoot(crearRoot);
        });
    }

    if (btnSave) {
        btnSave.addEventListener('click', () => {
            successModal.style.display = 'flex';
        });
    }

    if (modalAceptar) {
        modalAceptar.addEventListener('click', () => {
            successModal.style.display = 'none';
            if (btnCancel) btnCancel.click();
        });
    }

    document.querySelectorAll('.cp-date-input').forEach(input => {
        input.addEventListener('click', function () {
            if (typeof this.showPicker === 'function') {
                try { this.showPicker(); } catch (e) { /* noop */ }
            }
        });
    });

    function resetCustomSelectsInRoot(root) {
        root.querySelectorAll('.cp-input-wrap select').forEach(select => {
            const trigger = select.parentElement.querySelector('.custom-select-trigger');
            const firstOption = select.options[0];
            const chevron = select.parentElement.querySelector('.right-icon');
            select.selectedIndex = 0;
            if (trigger && firstOption) {
                trigger.textContent = firstOption.text;
                if (firstOption.disabled) trigger.classList.add('is-placeholder');
                else trigger.classList.remove('is-placeholder');
            }
            if (chevron) chevron.style.transform = 'rotate(0deg)';
        });
    }

    const CP_SELECT_VISIBLE_ROWS = 5;
    let cpSelectScrollLockHost = null;
    let cpSelectScrollAllowEl = null;
    let cpSelectMobileSheet = null;
    let cpSelectMobileChevron = null;

    function isMobileSelectLayout() {
        return window.innerWidth <= 900 || window.innerHeight <= 500;
    }

    /* Escritorio compacto (portátiles < ~15", ventanas reducidas). No incluye celular. */
    function isCompactComputerSelectLayout() {
        if (isMobileSelectLayout()) return false;
        return window.innerWidth <= 1536 || window.innerHeight <= 864;
    }

    function usesCpSelectOverlaySheet() {
        return isMobileSelectLayout() || isCompactComputerSelectLayout();
    }

    function blockCpSelectBackgroundScroll(event) {
        if (cpSelectScrollAllowEl && cpSelectScrollAllowEl.contains(event.target)) return;
        event.preventDefault();
    }

    function lockCpSelectBackgroundScroll(scrollContainer) {
        unlockCpSelectBackgroundScroll();
        cpSelectScrollAllowEl = scrollContainer;
        cpSelectScrollLockHost = document.querySelector('.app-shell') || document;
        cpSelectScrollLockHost.addEventListener('wheel', blockCpSelectBackgroundScroll, { passive: false });
        cpSelectScrollLockHost.addEventListener('touchmove', blockCpSelectBackgroundScroll, { passive: false });
    }

    function unlockCpSelectBackgroundScroll() {
        if (cpSelectScrollLockHost) {
            cpSelectScrollLockHost.removeEventListener('wheel', blockCpSelectBackgroundScroll);
            cpSelectScrollLockHost.removeEventListener('touchmove', blockCpSelectBackgroundScroll);
        }
        cpSelectScrollLockHost = null;
        cpSelectScrollAllowEl = null;
    }

    function ensureCpSelectOptionHeight() {
        if (document.documentElement.dataset.cpSelectOptionHeight) return;
        const probe = document.createElement('div');
        probe.className = 'custom-option';
        probe.textContent = 'M';
        probe.style.visibility = 'hidden';
        probe.style.position = 'absolute';
        probe.style.pointerEvents = 'none';
        document.body.appendChild(probe);
        const height = Math.ceil(probe.getBoundingClientRect().height) || 44;
        probe.remove();
        document.documentElement.dataset.cpSelectOptionHeight = String(height);
        document.documentElement.style.setProperty('--cp-select-option-height', `${height}px`);
        document.documentElement.style.setProperty('--cp-select-visible-rows', String(CP_SELECT_VISIBLE_ROWS));
    }

    function ensureCpSelectMobileSheet() {
        if (cpSelectMobileSheet) return cpSelectMobileSheet;

        const root = document.createElement('div');
        root.className = 'cp-select-sheet-root';
        root.id = 'cpSelectSheetRoot';
        root.hidden = true;
        root.innerHTML = `
            <div class="cp-select-sheet-backdrop" data-cp-select-dismiss tabindex="-1" aria-hidden="true"></div>
            <div class="cp-select-sheet" role="dialog" aria-modal="true" aria-labelledby="cpSelectSheetTitle" tabindex="-1">
                <div class="cp-select-sheet-handle" aria-hidden="true"></div>
                <p class="cp-select-sheet-title" id="cpSelectSheetTitle"></p>
                <div class="cp-select-sheet-list"></div>
            </div>`;
        document.body.appendChild(root);

        root.querySelector('[data-cp-select-dismiss]').addEventListener('click', closeCpSelectMobileSheet);
        root.querySelector('.cp-select-sheet').addEventListener('click', (e) => e.stopPropagation());

        cpSelectMobileSheet = {
            root,
            title: root.querySelector('.cp-select-sheet-title'),
            list: root.querySelector('.cp-select-sheet-list'),
            dialog: root.querySelector('.cp-select-sheet'),
        };
        return cpSelectMobileSheet;
    }

    function closeCpSelectMobileSheet() {
        if (!cpSelectMobileSheet || cpSelectMobileSheet.root.hidden) return;
        cpSelectMobileSheet.root.hidden = true;
        cpSelectMobileSheet.root.classList.remove('cp-select-sheet-root--center');
        cpSelectMobileSheet.list.replaceChildren();
        if (cpSelectMobileChevron) {
            cpSelectMobileChevron.style.transform = 'rotate(0deg)';
            cpSelectMobileChevron = null;
        }
        unlockCpSelectBackgroundScroll();
    }

    function closeAllCpSelects() {
        document.querySelectorAll('.custom-options').forEach(opt => opt.classList.remove('open'));
        document.querySelectorAll('.cp-input-wrap .right-icon').forEach(ic => {
            ic.style.transform = 'rotate(0deg)';
        });
        closeCpSelectMobileSheet();
        unlockCpSelectBackgroundScroll();
    }

    function getCpSelectFieldLabel(select) {
        const field = select.closest('.cp-field');
        const label = field?.querySelector('label');
        if (label?.textContent) return label.textContent.trim();
        const first = select.options[0];
        return first ? first.text.trim() : 'Seleccionar';
    }

    function applyCpSelectValue(select, trigger, chevron, option) {
        select.value = option.value;
        trigger.textContent = option.text;
        if (option.disabled) trigger.classList.add('is-placeholder');
        else trigger.classList.remove('is-placeholder');
        closeAllCpSelects();
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function openCpSelectOverlaySheet({ select, trigger, chevron }) {
        const sheet = ensureCpSelectMobileSheet();
        closeAllCpSelects();

        const centered = isCompactComputerSelectLayout() && !isMobileSelectLayout();
        sheet.root.classList.toggle('cp-select-sheet-root--center', centered);

        sheet.title.textContent = getCpSelectFieldLabel(select);
        sheet.list.replaceChildren();

        Array.from(select.options).forEach((option) => {
            if (option.disabled && option.value === '') return;

            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            optionDiv.textContent = option.text;
            optionDiv.dataset.value = option.value;
            if (select.value === option.value) optionDiv.classList.add('selected');

            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                applyCpSelectValue(select, trigger, chevron, option);
            });
            sheet.list.appendChild(optionDiv);
        });

        sheet.root.hidden = false;
        cpSelectMobileChevron = chevron;
        if (chevron) chevron.style.transform = 'rotate(180deg)';
        lockCpSelectBackgroundScroll(sheet.list);
        sheet.dialog.focus({ preventScroll: true });
    }

    function initCustomSelects(rootSelector) {
        const root = document.querySelector(rootSelector);
        if (!root) return;

        ensureCpSelectOptionHeight();

        const selects = root.querySelectorAll('.cp-input-wrap select');
        selects.forEach(select => {
            if (select.classList.contains('hidden-select')) return;

            select.classList.add('hidden-select');
            const wrapper = select.parentElement;
            const chevron = wrapper.querySelector('.right-icon');

            const customSelectContainer = document.createElement('div');
            customSelectContainer.className = 'custom-select-container';

            const trigger = document.createElement('div');
            trigger.className = 'custom-select-trigger';
            trigger.setAttribute('role', 'button');
            trigger.setAttribute('tabindex', '0');
            trigger.setAttribute('aria-haspopup', 'listbox');

            const selectedOption = select.options[select.selectedIndex] || select.options[0];
            trigger.textContent = selectedOption ? selectedOption.text : '';
            if (selectedOption && selectedOption.disabled) {
                trigger.classList.add('is-placeholder');
            }

            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'custom-options';
            optionsContainer.setAttribute('role', 'listbox');

            Array.from(select.options).forEach((option) => {
                if (option.disabled && option.value === '') return;

                const optionDiv = document.createElement('div');
                optionDiv.className = 'custom-option';
                optionDiv.setAttribute('role', 'option');
                optionDiv.textContent = option.text;
                optionDiv.dataset.value = option.value;

                optionDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    applyCpSelectValue(select, trigger, chevron, option);
                });
                optionsContainer.appendChild(optionDiv);
            });

            function toggleDropdown(e) {
                e.stopPropagation();

                if (usesCpSelectOverlaySheet()) {
                    if (cpSelectMobileSheet && !cpSelectMobileSheet.root.hidden && cpSelectMobileChevron === chevron) {
                        closeAllCpSelects();
                        return;
                    }
                    openCpSelectOverlaySheet({ select, trigger, chevron });
                    return;
                }

                const wasOpen = optionsContainer.classList.contains('open');
                closeAllCpSelects();

                if (!wasOpen) {
                    optionsContainer.classList.add('open');
                    if (chevron) chevron.style.transform = 'rotate(180deg)';
                    lockCpSelectBackgroundScroll(optionsContainer);
                }
            }

            trigger.addEventListener('click', toggleDropdown);
            trigger.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleDropdown(e);
                }
            });

            if (chevron) {
                chevron.style.cursor = 'pointer';
                chevron.style.transition = 'transform 0.2s ease';
                chevron.addEventListener('click', toggleDropdown);
            }

            customSelectContainer.appendChild(trigger);
            customSelectContainer.appendChild(optionsContainer);
            wrapper.appendChild(customSelectContainer);
        });
    }

    if (!document.documentElement.dataset.customSelectOutsideBound) {
        document.documentElement.dataset.customSelectOutsideBound = '1';
        document.addEventListener('click', () => {
            closeAllCpSelects();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllCpSelects();
        });
        window.addEventListener('resize', () => {
            if (!usesCpSelectOverlaySheet()) closeCpSelectMobileSheet();
        });
    }

    initCustomSelects('#crear-practica');
    initCustomSelects('#gestionar-practicas');
    initCustomSelects('#gestionar-instituciones');
    initCustomSelects('#gestionar-usuarios');

    const informesTabIds = ['tab-general', 'tab-tipos', 'tab-bitacoras', 'tab-retro', 'tab-instituciones'];
    const informesTabBtns = document.querySelectorAll('#informes .informes-tab-btn');

    informesTabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            informesTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            informesTabIds.forEach((panelId, panelIdx) => {
                const panel = document.getElementById(panelId);
                if (!panel) return;
                panel.style.display = panelIdx === idx ? '' : 'none';
            });
        });
    });

    const gtpTabBtns = document.querySelectorAll('#gestionar-practicas .gtp-tab-btn');
    gtpTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.getAttribute('data-gtp-panel');
            if (!panelId) return;

            gtpTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('#gestionar-practicas .gtp-panel').forEach(panel => {
                panel.style.display = panel.id === panelId ? '' : 'none';
            });
        });
    });

    const gtpForm = document.getElementById('gtp-form-registrar');
    const gtpCancel = document.getElementById('gtp-btn-cancel');
    const gtpRoot = document.querySelector('#gestionar-practicas');

    function clearGtpForm() {
        if (!gtpForm) return;
        gtpForm.reset();
        if (gtpRoot) resetCustomSelectsInRoot(gtpRoot);
    }

    if (gtpCancel) {
        gtpCancel.addEventListener('click', clearGtpForm);
    }

    const gtpHorasInput = document.getElementById('gtp-horas');
    if (gtpHorasInput) {
        gtpHorasInput.addEventListener('input', () => {
            gtpHorasInput.value = gtpHorasInput.value.replace(/\D/g, '');
        });
    }

    const gtpTypeList = document.getElementById('gtp-type-list');

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function nextGtpCodigo() {
        const cards = gtpTypeList ? gtpTypeList.querySelectorAll('.gtp-type-card') : [];
        let max = 0;
        cards.forEach(card => {
            const code = card.getAttribute('data-codigo') || '';
            const match = code.match(/TIP-(\d+)/i);
            if (match) max = Math.max(max, parseInt(match[1], 10));
        });
        return `TIP-${String(max + 1).padStart(3, '0')}`;
    }

    function buildGtpTypeCard(nombre, semestre, horas, codigo) {
        const article = document.createElement('article');
        article.className = 'ev-card gtp-type-card';
        article.setAttribute('data-codigo', codigo);
        article.innerHTML = `
            <div class="ev-card-body gtp-type-card-body">
                <p class="gtp-type-label">Tipo de práctica</p>
                <p class="ev-card-title gtp-type-name">${escapeHtml(nombre)}</p>
                <p class="gtp-type-meta">
                    <span class="gtp-meta-item"><span class="gtp-meta-key">Código de Práctica</span> ${escapeHtml(codigo)}</span>
                    <span class="gtp-meta-sep" aria-hidden="true">|</span>
                    <span class="gtp-meta-item"><span class="gtp-meta-key">Semestre</span> ${escapeHtml(semestre)}</span>
                    <span class="gtp-meta-sep" aria-hidden="true">|</span>
                    <span class="gtp-meta-item"><span class="gtp-meta-key">Horas</span> ${escapeHtml(horas)}</span>
                </p>
            </div>
            <div class="ev-menu-wrapper">
                <button type="button" class="ev-menu-btn" aria-label="Opciones del tipo de práctica" aria-expanded="false">
                    <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
                </button>
                <div class="ev-dropdown" role="menu">
                    <button type="button" class="ev-dropdown-item ev-item--ver" role="menuitem"><i class="fa-solid fa-eye" aria-hidden="true"></i> Ver</button>
                    <button type="button" class="ev-dropdown-item ev-item--editar" role="menuitem"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar</button>
                    <button type="button" class="ev-dropdown-item ev-item--eliminar" role="menuitem"><i class="fa-solid fa-trash" aria-hidden="true"></i> Eliminar</button>
                </div>
            </div>`;
        return article;
    }

    function setEvMenuState(btn, open) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        const dd = btn.nextElementSibling;
        if (dd) dd.classList.toggle('is-open', open);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-ellipsis', !open);
            icon.classList.toggle('fa-arrow-left', open);
        }
    }

    function closeAllEntityDropdowns(exceptBtn) {
        document.querySelectorAll('#gestionar-practicas .ev-menu-btn, #gestionar-instituciones .ev-menu-btn, #practica .ev-menu-btn').forEach(btn => {
            if (btn === exceptBtn) return;
            setEvMenuState(btn, false);
        });
    }

    function bindEntityListInteractions(root, cardSelector) {
        if (!root) return;
        root.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.ev-menu-btn');
            if (menuBtn && root.contains(menuBtn)) {
                e.stopPropagation();
                const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
                closeAllEntityDropdowns(menuBtn);
                setEvMenuState(menuBtn, !isOpen);
                return;
            }

            const verBtn = e.target.closest('.ev-item--ver');
            if (verBtn && root.contains(verBtn)) {
                const title = verBtn.closest('.ev-card')?.querySelector('.ev-card-title')?.textContent;
                console.log('Ver:', title);
                closeAllEntityDropdowns(null);
                return;
            }

            const editBtn = e.target.closest('.ev-item--editar');
            if (editBtn && root.contains(editBtn)) {
                const title = editBtn.closest('.ev-card')?.querySelector('.ev-card-title')?.textContent;
                console.log('Editar:', title);
                closeAllEntityDropdowns(null);
                return;
            }

            const elimBtn = e.target.closest('.ev-item--eliminar');
            if (elimBtn && root.contains(elimBtn)) {
                const card = elimBtn.closest(cardSelector);
                const title = card?.querySelector('.ev-card-title')?.textContent;
                console.log('Eliminar:', title);
                if (card) card.remove();
                closeAllEntityDropdowns(null);
            }
        });
    }

    bindEntityListInteractions(gtpRoot, '.gtp-type-card');
    document.addEventListener('click', () => closeAllEntityDropdowns(null));

    if (gtpForm) {
        gtpForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = document.getElementById('gtp-nombre')?.value.trim();
            const semestre = document.getElementById('gtp-semestre')?.value;
            const horas = document.getElementById('gtp-horas')?.value.trim();
            if (!nombre || !semestre || !horas || !/^\d+$/.test(horas)) return;

            if (gtpTypeList) {
                const codigo = nextGtpCodigo();
                gtpTypeList.appendChild(buildGtpTypeCard(nombre, semestre, horas, codigo));
            }

            clearGtpForm();
        });
    }

    const instTabBtns = document.querySelectorAll('#gestionar-instituciones .inst-tab-btn');
    instTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const panelId = btn.getAttribute('data-inst-panel');
            if (!panelId) return;

            instTabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('#gestionar-instituciones .inst-panel').forEach(panel => {
                panel.style.display = panel.id === panelId ? '' : 'none';
            });
        });
    });

    const instForm = document.getElementById('inst-form-registrar');
    const instCancel = document.getElementById('inst-btn-cancel');
    const instRoot = document.querySelector('#gestionar-instituciones');
    const instEntityList = document.getElementById('inst-entity-list');
    const instNitInput = document.getElementById('inst-nit');

    function clearInstForm() {
        if (!instForm) return;
        instForm.reset();
    }

    if (instCancel) {
        instCancel.addEventListener('click', clearInstForm);
    }

    if (instNitInput) {
        instNitInput.addEventListener('input', () => {
            instNitInput.value = instNitInput.value.replace(/[^\d-]/g, '');
        });
    }

    function buildInstEntityCard(nit, encargado, direccion, nombre, correo) {
        const article = document.createElement('article');
        article.className = 'ev-card inst-entity-card';
        article.setAttribute('data-nit', nit);
        article.innerHTML = `
            <div class="ev-card-body">
                <p class="entity-card-label">Institución</p>
                <p class="ev-card-title">${escapeHtml(nombre)}</p>
                <p class="entity-card-meta">
                    <span class="entity-meta-item"><span class="entity-meta-key">NIT</span> ${escapeHtml(nit)}</span>
                    <span class="entity-meta-sep" aria-hidden="true">|</span>
                    <span class="entity-meta-item"><span class="entity-meta-key">Encargado</span> ${escapeHtml(encargado)}</span>
                    <span class="entity-meta-sep" aria-hidden="true">|</span>
                    <span class="entity-meta-item"><span class="entity-meta-key">Correo</span> ${escapeHtml(correo)}</span>
                </p>
                <p class="entity-card-desc">${escapeHtml(direccion)}</p>
            </div>
            <div class="ev-menu-wrapper">
                <button type="button" class="ev-menu-btn" aria-label="Opciones de la institución" aria-expanded="false">
                    <i class="fa-solid fa-ellipsis" aria-hidden="true"></i>
                </button>
                <div class="ev-dropdown" role="menu">
                    <button type="button" class="ev-dropdown-item ev-item--ver" role="menuitem"><i class="fa-solid fa-eye" aria-hidden="true"></i> Ver</button>
                    <button type="button" class="ev-dropdown-item ev-item--editar" role="menuitem"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar</button>
                    <button type="button" class="ev-dropdown-item ev-item--eliminar" role="menuitem"><i class="fa-solid fa-trash" aria-hidden="true"></i> Eliminar</button>
                </div>
            </div>`;
        return article;
    }

    bindEntityListInteractions(instRoot, '.inst-entity-card');

    if (instForm) {
        instForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nit = document.getElementById('inst-nit')?.value.trim();
            const encargado = document.getElementById('inst-encargado')?.value.trim();
            const direccion = document.getElementById('inst-direccion')?.value.trim();
            const nombre = document.getElementById('inst-nombre')?.value.trim();
            const correo = document.getElementById('inst-correo')?.value.trim();
            if (!nit || !encargado || !direccion || !nombre || !correo) return;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return;

            if (instEntityList) {
                instEntityList.appendChild(buildInstEntityCard(nit, encargado, direccion, nombre, correo));
            }

            clearInstForm();
        });
    }

    // ── Panel de Práctica (misma navegación que estudiante) ───────────────
    const btnEntrar = document.querySelector('#practica .practice-submit');
    const practicePanel = document.querySelector('#practica .practice-panel');
    const bitacoraPanel = document.getElementById('bitacora-panel');
    const bitacoraBackBtn = document.getElementById('bitacoraBack');
    const actividadesPanel = document.getElementById('actividades-panel');
    const actividadesBackBtn = document.getElementById('actividadesBack');
    const actividadesBtns = document.querySelectorAll('#practica .actividad-entrar-btn');
    const preguntasPanel = document.getElementById('preguntas-panel');
    const preguntasBackBtn = document.getElementById('preguntasBack');
    const evidenciasPanel = document.getElementById('evidencias-panel');
    const evidenciasBackBtn = document.getElementById('evidenciasBack');
    const evidenciasTitleEl = document.getElementById('evidencias-title');
    const practicaRoot = document.getElementById('practica');

    const bitacoraActionBtns = bitacoraPanel
        ? bitacoraPanel.querySelectorAll('.b-action-btn')
        : [];
    const actividadesEntrarBitacora = bitacoraActionBtns[0] || null;
    const preguntasBtn = bitacoraActionBtns[1] || null;

    const preguntasActionBtns = preguntasPanel
        ? preguntasPanel.querySelectorAll('.b-action-btn')
        : [];
    const preguntasEntrarActividades = preguntasActionBtns[0] || null;
    const preguntasEntrarPreguntas = preguntasActionBtns[1] || null;

    function resetPracticeScroll() {
        window.scrollTo(0, 0);
        const wrapper = document.querySelector('#practica .practice-content-wrapper');
        if (wrapper) wrapper.scrollTop = 0;
        const appShell = document.querySelector('.app-shell');
        if (appShell) appShell.scrollTop = 0;
    }

    if (btnEntrar && practicePanel && bitacoraPanel) {
        btnEntrar.addEventListener('click', () => {
            practicePanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetPracticeScroll();
        });
    }

    if (bitacoraBackBtn && practicePanel && bitacoraPanel) {
        bitacoraBackBtn.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            practicePanel.style.display = 'block';
            resetPracticeScroll();
        });
    }

    if (actividadesEntrarBitacora && bitacoraPanel && actividadesPanel) {
        actividadesEntrarBitacora.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            actividadesPanel.style.display = 'flex';
            resetPracticeScroll();
        });
    }

    if (preguntasEntrarActividades) {
        preguntasEntrarActividades.addEventListener('click', () => {
            alert('Sección en construcción');
        });
    }

    if (preguntasEntrarPreguntas) {
        preguntasEntrarPreguntas.addEventListener('click', () => {
            alert('Sección en construcción');
        });
    }

    if (actividadesBackBtn && bitacoraPanel && actividadesPanel) {
        actividadesBackBtn.addEventListener('click', () => {
            actividadesPanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetPracticeScroll();
        });
    }

    if (actividadesBtns.length > 0 && actividadesPanel && evidenciasPanel) {
        actividadesBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const numActividad = btn.getAttribute('data-actividad');
                if (evidenciasTitleEl) {
                    evidenciasTitleEl.textContent = `Evidencias — Actividad #${numActividad}`;
                }
                actividadesPanel.style.display = 'none';
                evidenciasPanel.style.display = 'flex';
                resetPracticeScroll();
            });
        });
    }

    if (evidenciasBackBtn && actividadesPanel && evidenciasPanel) {
        evidenciasBackBtn.addEventListener('click', () => {
            evidenciasPanel.style.display = 'none';
            actividadesPanel.style.display = 'flex';
            resetPracticeScroll();
        });
    }

    if (preguntasBtn && bitacoraPanel && preguntasPanel) {
        preguntasBtn.addEventListener('click', () => {
            bitacoraPanel.style.display = 'none';
            preguntasPanel.style.display = 'flex';
            resetPracticeScroll();
        });
    }

    if (preguntasBackBtn && bitacoraPanel && preguntasPanel) {
        preguntasBackBtn.addEventListener('click', () => {
            preguntasPanel.style.display = 'none';
            bitacoraPanel.style.display = 'flex';
            resetPracticeScroll();
        });
    }

    if (practicaRoot) {
        practicaRoot.addEventListener('click', (e) => {
            const menuBtn = e.target.closest('.ev-menu-btn');
            if (menuBtn && practicaRoot.contains(menuBtn)) {
                e.stopPropagation();
                const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
                closeAllEntityDropdowns(menuBtn);
                setEvMenuState(menuBtn, !isOpen);
                return;
            }

            const verBtn = e.target.closest('.ev-item--ver');
            if (verBtn && practicaRoot.contains(verBtn)) {
                console.log('Abrir evidencia (ver)');
                closeAllEntityDropdowns(null);
                return;
            }

            const editBtn = e.target.closest('.ev-item--editar');
            if (editBtn && practicaRoot.contains(editBtn)) {
                console.log('Abrir evidencia (editar)');
                closeAllEntityDropdowns(null);
                return;
            }

            const elimBtn = e.target.closest('.ev-item--eliminar');
            if (elimBtn && practicaRoot.contains(elimBtn)) {
                const title = elimBtn.closest('.ev-card')?.querySelector('.ev-card-title')?.textContent;
                console.log('Eliminar evidencia:', title);
                closeAllEntityDropdowns(null);
            }
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
