/* =========================================================================
   shell.js — Carcasa compartida (sidebar, topbar, menú móvil, tema).
   La usan TODOS los paneles con sesión iniciada (estudiante, tutor, etc).
   No pongas aquí nada específico de un panel; si un panel necesita su
   propio JS (por ejemplo tutor.js), cárgalo APARTE, después de este archivo.
   ========================================================================= */

// --- Altura real visible en móvil ---
// En varios navegadores Android, "dvh" no se recalcula bien al cargar. --app-vh
// corrige eso con visualViewport. OJO: cuando abre el teclado, visualViewport
// se encoge; si aplicamos esa altura al .app-shell, la barra superior parece
// "desaparecer" hasta salir de la pantalla. Por eso, con un campo enfocado y
// teclado abierto, mantenemos la altura de layout (sin teclado).
let layoutViewportHeight = window.innerHeight;

function isMobileLayout() {
    return window.innerWidth <= 900 || window.innerHeight <= 500;
}

function isFormField(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        el.isContentEditable;
}

function isLikelyKeyboardOpen(vv) {
    if (!vv) return false;
    return vv.height < layoutViewportHeight * 0.72;
}

function setAppViewportHeight() {
    const vv = window.visualViewport;
    const typing = isFormField(document.activeElement);
    let height = window.innerHeight;

    if (vv) {
        if (typing && isLikelyKeyboardOpen(vv)) {
            height = layoutViewportHeight;
        } else {
            height = vv.height;
            if (!isLikelyKeyboardOpen(vv)) {
                layoutViewportHeight = Math.max(window.innerHeight, vv.height);
            }
        }
    }

    document.documentElement.style.setProperty('--app-vh', (height * 0.01) + 'px');
}

/** Desplaza solo .app-shell hacia abajo para mostrar un elemento (sin scrollIntoView). */
function scrollAppShellToReveal(element, margin = 16) {
    const shell = document.querySelector('.app-shell');
    if (!shell || !element) return;
    const shellRect = shell.getBoundingClientRect();
    const elRect = element.getBoundingClientRect();
    if (elRect.bottom > shellRect.bottom - margin) {
        shell.scrollTop += elRect.bottom - shellRect.bottom + margin;
    }
}

function updateAppTopbarOffset() {
    if (!isMobileLayout()) {
        document.documentElement.style.removeProperty('--app-topbar-offset');
        return;
    }
    let topbar = null;
    document.querySelectorAll('.app-content').forEach((section) => {
        if (window.getComputedStyle(section).display === 'none') return;
        topbar = section.querySelector('.app-topbar');
    });
    if (topbar) {
        document.documentElement.style.setProperty('--app-topbar-offset', topbar.offsetHeight + 'px');
    }
}

function refreshMobileChromeMetrics() {
    setAppViewportHeight();
    updateAppTopbarOffset();
}

refreshMobileChromeMetrics();
window.addEventListener('resize', refreshMobileChromeMetrics);
window.addEventListener('orientationchange', () => {
    layoutViewportHeight = window.innerHeight;
    setTimeout(refreshMobileChromeMetrics, 120);
});
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppViewportHeight);
}

document.addEventListener('focusout', (e) => {
    if (!isFormField(e.target)) return;
    setTimeout(() => {
        layoutViewportHeight = window.innerHeight;
        refreshMobileChromeMetrics();
    }, 120);
});

document.addEventListener('DOMContentLoaded', () => {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const mobileMenuToggles = document.querySelectorAll('.mobile-menu-toggle');
    const shell = document.querySelector('.app-shell');
    const sidebar = document.querySelector('.app-sidebar');
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');

    // Theme toggle
    if (themeToggleBtns.length > 0) {
        themeToggleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                document.body.classList.toggle('dark-theme');
                const isDark = document.body.classList.contains('dark-theme');
                
                themeToggleBtns.forEach(toggleBtn => {
                    const icon = toggleBtn.querySelector('i:first-child');
                    const text = toggleBtn.querySelector('span');

                    if (isDark) {
                        icon.classList.remove('fa-sun', 'fa-regular');
                        icon.classList.add('fa-moon', 'fa-solid');
                        text.textContent = 'Oscuro';
                    } else {
                        icon.classList.remove('fa-moon', 'fa-solid');
                        icon.classList.add('fa-sun', 'fa-regular');
                        text.textContent = 'Claro';
                    }
                });
            });
        });
    }

    // Tab Navigation
    const navLinks = document.querySelectorAll('.app-nav-link');
    const sections = document.querySelectorAll('.app-content');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            
            // Actualizar enlaces
            navLinks.forEach(nav => {
                nav.classList.remove('app-nav-link--active');
                nav.removeAttribute('aria-current');
            });
            link.classList.add('app-nav-link--active');
            link.setAttribute('aria-current', 'page');
            
            // Mostrar sección correspondiente
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.style.display = 'flex'; // Usamos flex porque las secciones tienen display: flex en desktop
                    const wrapper = section.querySelector('.practice-content-wrapper');
                    if (wrapper) wrapper.style.display = ''; // restaurar visibilidad
                } else {
                    section.style.display = 'none';
                }
            });

            // Volver arriba al cambiar de sección. .app-shell es el único
            // contenedor que realmente hace scroll (todas las secciones viven
            // apiladas dentro de él, solo se les cambia display); si no se
            // reinicia aquí, la sección nueva "hereda" el scroll de la que
            // se estaba viendo antes y puede aparecer ya desplazada hacia el
            // final en vez de empezar arriba.
            window.scrollTo(0, 0);
            if (shell) shell.scrollTop = 0;
            updateAppTopbarOffset();

            // En móvil, cerrar el menú al seleccionar una opción
            if (isMobileLayout() && shell.classList.contains('sidebar-open')) {
                closeMobileMenu();
            }
        });
    });

    // Al cargar: no dejar ninguna opción seleccionada en el menú.
    // Para que no desaparezca la barra superior (topbar) en móvil,
    // dejamos visible la primera sección pero ocultamos su contenido.
    navLinks.forEach(nav => {
        nav.classList.remove('app-nav-link--active');
        nav.removeAttribute('aria-current');
    });
    sections.forEach((section, index) => {
        if (index === 0) {
            section.style.display = 'flex';
            const wrapper = section.querySelector('.practice-content-wrapper');
            if (wrapper) wrapper.style.display = 'none';
        } else {
            section.style.display = 'none';
        }
    });

    updateAppTopbarOffset();

    // --- Menú móvil ---
    // isMobileLayout() está definida arriba (compartida con métricas de viewport).

    // .app-shell es el contenedor que hace scroll en móvil (ver CSS).
    // En vez de cambiar su "overflow" para bloquear el scroll de fondo
    // (eso hace aparecer/desaparecer la barra de scroll y provoca un
    // reacomodo visible del contenido), se bloquea el gesto de scroll
    // directamente, dejando pasar libremente el que ocurre dentro del menú.
    function blockBackgroundScroll(event) {
        if (sidebar && !sidebar.contains(event.target)) {
            event.preventDefault();
        }
    }

    function openMobileMenu() {
        shell.classList.add('sidebar-open');
        shell.addEventListener('wheel', blockBackgroundScroll, { passive: false });
        shell.addEventListener('touchmove', blockBackgroundScroll, { passive: false });
    }

    function closeMobileMenu() {
        shell.classList.remove('sidebar-open');
        shell.removeEventListener('wheel', blockBackgroundScroll);
        shell.removeEventListener('touchmove', blockBackgroundScroll);
    }

    function toggleMobileMenu() {
        if (shell.classList.contains('sidebar-open')) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    // Toggle for desktop/tablet (collapse sidebar) or mobile (open drawer)
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            if (!isMobileLayout()) {
                shell.classList.toggle('sidebar-collapsed');
            } else {
                toggleMobileMenu();
            }
        });
    }

    // Toggle for mobile (open sidebar from topbar)
    mobileMenuToggles.forEach(toggle => {
        toggle.addEventListener('click', toggleMobileMenu);
    });

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (event) => {
        if (!shell) return;
        if (isMobileLayout()) {
            let clickedOnMobileToggle = false;
            mobileMenuToggles.forEach(toggle => {
                if (toggle.contains(event.target)) {
                    clickedOnMobileToggle = true;
                }
            });

            if (shell.classList.contains('sidebar-open') &&
                sidebar && !sidebar.contains(event.target) &&
                (!sidebarToggle || !sidebarToggle.contains(event.target)) &&
                !clickedOnMobileToggle) {
                closeMobileMenu();
            }
        }
    });

    // Si la ventana pasa a tamaño de escritorio con el menú móvil abierto, se limpia
    window.addEventListener('resize', () => {
        if (!isMobileLayout() && shell?.classList.contains('sidebar-open')) {
            closeMobileMenu();
        }
    });

    // Toggle de la visibilidad de contraseña en el Login
    const togglePassword = document.querySelector('.btn-visibility');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            } else {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            }
        });
    }

    // Login form logic (redirect based on selected role)
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const checkedRole = document.querySelector('input[name="role"]:checked');
            if (checkedRole) {
                window.location.href = `HTML/${checkedRole.id}.html`;
            }
        });
    }

});

