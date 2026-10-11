/* =========================================================================
   login.js — Solo para index.html (pantalla de inicio de sesión).
   No tiene nada que ver con la carcasa (sidebar/topbar); eso vive en
   shell.js y lo cargan estudiante.html/tutor.html/etc, no esta página.
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Toggle de la visibilidad de contraseña en el Login
    const togglePassword = document.querySelector('.btn-visibility');
    const passwordInput = document.getElementById('password');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            if (type === 'password') {
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    }

    // Login: el controlador valida usuario/contraseña con Supabase y el rol con la base de datos
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        const boton = loginForm.querySelector('.btn-submit');
        const aviso = document.createElement('p');
        aviso.className = 'login-error';
        aviso.setAttribute('role', 'alert');
        aviso.style.cssText = 'color:#b3261e;font-size:14px;font-weight:600;margin:8px 0 0;min-height:18px';
        boton.parentNode.insertBefore(aviso, boton);

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            aviso.textContent = '';
            const checkedRole = document.querySelector('input[name="role"]:checked');
            if (!checkedRole) { aviso.textContent = 'Selecciona tu rol.'; return; }

            boton.disabled = true;
            try {
                const r = await SPP.pedir('/api/auth/login', {
                    metodo: 'POST',
                    sinRedirigir: true,
                    cuerpo: {
                        usuario: document.getElementById('usuario').value,
                        password: document.getElementById('password').value,
                        rol: checkedRole.id
                    }
                });
                window.location.href = r.destino;
            } catch (err) {
                aviso.textContent = err.message;
                boton.disabled = false;
            }
        });
    }
});

/* ── Splash screen ── */
(function () {
    const splash = document.getElementById('spp-splash');
    if (!splash) return;

    let shouldShow = false;
    try {
        if (!sessionStorage.getItem('spp-intro-shown')) {
            sessionStorage.setItem('spp-intro-shown', '1');
            shouldShow = true;
        }
    } catch (e) {
        shouldShow = true; // Fallback
    }

    if (shouldShow) {
        splash.classList.remove('is-hidden');
        setTimeout(function () {
            splash.classList.add('splash-out');
            splash.addEventListener('animationend', function () {
                splash.remove();
            }, { once: true });
        }, 1700);
    } else {
        splash.remove();
    }
})();
