/* ============================================================
   RPRMS — auth.js  (v3 — fully rewritten, no inline onclick needed)
   ============================================================ */

/* ── 1. Password visibility toggle ── */
function togglePasswordVisibility(targetId, btn) {
  var input = document.getElementById(targetId);
  if (!input) return;

  var nowVisible = (input.type === 'text');
  input.type = nowVisible ? 'password' : 'text';

  var openIcon   = btn.querySelector('.eye-open');
  var closedIcon = btn.querySelector('.eye-closed');
  if (openIcon)   openIcon.style.display   = nowVisible ? 'inline' : 'none';
  if (closedIcon) closedIcon.style.display = nowVisible ? 'none'   : 'inline';

  input.focus();
}

/* ── 2. Alert helpers ── */
function showAlert(boxId, msg, isSuccess) {
  var box = document.getElementById(boxId);
  if (!box) return;
  box.textContent  = msg;
  box.className    = 'auth-alert ' + (isSuccess ? 'success' : 'error');
  box.style.display = 'flex';
}

function clearAlert(boxId) {
  var box = document.getElementById(boxId);
  if (!box) return;
  box.textContent   = '';
  box.style.display = 'none';
  box.className     = 'auth-alert';
}

/* ── 3. All logic after DOM is ready ── */
document.addEventListener('DOMContentLoaded', function () {

  /* ── 3a. Eye-toggle buttons via event delegation ── */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.eye-btn');
    if (!btn) return;

    /* Stop form submission */
    e.preventDefault();
    e.stopPropagation();

    /* Get targetId from onclick attr or data-target */
    /* We rely on onclick attr so this is a safety net */
    var wrap  = btn.closest('.input-eye-wrap');
    if (!wrap) return;
    var input = wrap.querySelector('input');
    if (!input) return;

    var nowVisible = (input.type === 'text');
    input.type = nowVisible ? 'password' : 'text';

    var openIcon   = btn.querySelector('.eye-open');
    var closedIcon = btn.querySelector('.eye-closed');
    if (openIcon)   openIcon.style.display   = nowVisible ? 'inline' : 'none';
    if (closedIcon) closedIcon.style.display = nowVisible ? 'none'   : 'inline';

    input.focus();
  });

  /* ── 3b. Tab switching ── */
  var tabButtons = document.querySelectorAll('.tab-btn');
  var paneLogin    = document.getElementById('pane-login');
  var paneRegister = document.getElementById('pane-register');
  var formTitle    = document.getElementById('formTitle');
  var formSub      = document.getElementById('formSub');

  tabButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.getAttribute('data-tab');

      tabButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');

      if (paneLogin)    paneLogin.classList.toggle('active',    tab === 'login');
      if (paneRegister) paneRegister.classList.toggle('active', tab === 'register');

      if (formTitle) formTitle.textContent = tab === 'login' ? 'Sign in' : 'Create an author account';
      if (formSub)   formSub.textContent   = tab === 'login'
        ? 'Enter your credentials to access your dashboard.'
        : 'Register to submit papers for review.';

      clearAlert('loginAlert');
      clearAlert('registerAlert');
    });
  });

  /* ── 3c. LOGIN form ── */
  var loginForm = document.getElementById('loginForm');

  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();   /* ← MUST stop GET submit */
      clearAlert('loginAlert');

      var username = (document.getElementById('loginUser').value || '').trim();
      var password = document.getElementById('loginPass').value || '';

      if (!username || !password) {
        showAlert('loginAlert', 'Please enter both your username and password.', false);
        return;
      }

      var submitBtn = loginForm.querySelector('button[type="submit"]');
      var origText  = submitBtn ? submitBtn.textContent : 'Sign In';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Signing in…'; }

      fetch('api/auth.php?action=login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ username: username, password: password })
      })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        var ok   = result.ok;
        var data = result.data;

        if (!ok || data.status === 'error' || data.success === false) {
          var errMsg = data.message || data.error || 'Invalid credentials. Please try again.';
          showAlert('loginAlert', errMsg, false);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
          return;
        }

        /* Success */
        showAlert('loginAlert', 'Sign in successful! Redirecting…', true);
        if (data.user) sessionStorage.setItem('rpms_user', JSON.stringify(data.user));

        var redirects = { author: 'author.html', reviewer: 'reviewer.html', editor: 'editor.html', admin: 'admin.html' };
        var target    = redirects[data.role] || 'author.html';
        setTimeout(function () { window.location.href = target; }, 500);
      })
      .catch(function (err) {
        showAlert('loginAlert', 'Connection error: ' + err.message + '. Is XAMPP running?', false);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      });
    });
  }

  /* ── 3d. Password strength + confirm match ── */
  var regPassInput  = document.getElementById('regPass');
  var regPass2Input = document.getElementById('regPass2');
  var strengthMeter = document.getElementById('passStrengthMeter');
  var strengthBar   = document.getElementById('strengthBar');
  var strengthLabel = document.getElementById('strengthLabel');
  var passMatchLabel = document.getElementById('passMatchLabel');

  function evalStrength(pw) {
    var s = 0;
    if (!pw) return 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  }

  function checkMatch() {
    if (!regPass2Input || !passMatchLabel) return;
    var p1 = regPassInput ? regPassInput.value : '';
    var p2 = regPass2Input.value;
    if (!p2) { passMatchLabel.textContent = ''; return; }
    if (p1 === p2) {
      passMatchLabel.textContent = '✓ Passwords match';
      passMatchLabel.style.color = 'var(--success, #2e7d32)';
    } else {
      passMatchLabel.textContent = '✗ Passwords do not match';
      passMatchLabel.style.color = 'var(--crimson, #d32f2f)';
    }
  }

  if (regPassInput) {
    regPassInput.addEventListener('input', function () {
      var val   = regPassInput.value;
      if (!val) { if (strengthMeter) strengthMeter.style.display = 'none'; return; }
      if (strengthMeter) strengthMeter.style.display = 'block';
      var score = evalStrength(val);
      if (score <= 2) {
        strengthBar.style.width = '30%'; strengthBar.style.backgroundColor = '#d32f2f';
        strengthLabel.textContent = 'Weak (use 8+ chars, numbers, uppercase)'; strengthLabel.style.color = '#d32f2f';
      } else if (score <= 4) {
        strengthBar.style.width = '65%'; strengthBar.style.backgroundColor = '#e67e22';
        strengthLabel.textContent = 'Moderate'; strengthLabel.style.color = '#e67e22';
      } else {
        strengthBar.style.width = '100%'; strengthBar.style.backgroundColor = '#2e7d32';
        strengthLabel.textContent = 'Strong password ✓'; strengthLabel.style.color = '#2e7d32';
      }
      checkMatch();
    });
  }

  if (regPass2Input) {
    regPass2Input.addEventListener('input', checkMatch);
  }

  /* ── 3e. REGISTER form ── */
  var registerForm = document.getElementById('registerForm');

  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAlert('registerAlert');

      var name        = (document.getElementById('regName').value  || '').trim();
      var email       = (document.getElementById('regEmail').value || '').trim();
      var affiliation = (document.getElementById('regAffil').value || '').trim();
      var username    = (document.getElementById('regUser').value  || '').trim();
      var password    = document.getElementById('regPass').value  || '';
      var password2   = document.getElementById('regPass2').value || '';

      if (!name || !email || !username || !password) {
        showAlert('registerAlert', 'Please fill in all required fields.', false); return;
      }
      if (password.length < 6) {
        showAlert('registerAlert', 'Password must be at least 6 characters.', false); return;
      }
      if (password !== password2) {
        showAlert('registerAlert', 'Passwords do not match.', false); return;
      }

      var submitBtn = registerForm.querySelector('button[type="submit"]');
      var origText  = submitBtn ? submitBtn.textContent : 'Create Author Account';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating Account…'; }

      fetch('api/auth.php?action=register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({ name: name, email: email, affiliation: affiliation, username: username, password: password })
      })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        var ok   = result.ok;
        var data = result.data;

        if (!ok || data.success === false || data.error) {
          showAlert('registerAlert', data.error || data.message || 'Could not create account.', false);
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
          return;
        }

        showAlert('registerAlert', data.message || 'Account created! Redirecting to dashboard…', true);
        registerForm.reset();
        if (strengthMeter) strengthMeter.style.display = 'none';
        if (passMatchLabel) passMatchLabel.textContent = '';

        if (data.user) sessionStorage.setItem('rpms_user', JSON.stringify(data.user));
        setTimeout(function () { window.location.href = 'author.html'; }, 1000);
      })
      .catch(function (err) {
        showAlert('registerAlert', 'Connection error: ' + err.message + '. Is XAMPP running?', false);
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
      });
    });
  }

}); /* end DOMContentLoaded */
