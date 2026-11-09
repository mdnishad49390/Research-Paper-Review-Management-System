/* ============================================================
   RPRMS — auth.js
   Handles tab switching + login/register form submission + eye toggle.
   ============================================================ */

/* Global eye toggle function for direct onclick support */
function togglePasswordVisibility(targetId, btn) {
  const input = document.getElementById(targetId);
  if (!input) return;

  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";

  const openIcon = btn.querySelector(".eye-open");
  const closedIcon = btn.querySelector(".eye-closed");

  if (openIcon) openIcon.style.display = isPassword ? "none" : "block";
  if (closedIcon) closedIcon.style.display = isPassword ? "block" : "none";

  input.focus();
}

document.addEventListener("DOMContentLoaded", () => {

  /* ── Eye / password toggle ── */
  document.querySelectorAll(".eye-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      const isPassword = input.getAttribute("type") === "password";
      input.setAttribute("type", isPassword ? "text" : "password");

      const openIcon   = btn.querySelector(".eye-open");
      const closedIcon = btn.querySelector(".eye-closed");

      if (openIcon) {
        openIcon.style.display = isPassword ? "none" : "block";
      }
      if (closedIcon) {
        closedIcon.style.display = isPassword ? "block" : "none";
      }

      // Keep focus on input for smooth typing
      input.focus();
    });
  });

  const tabButtons = document.querySelectorAll(".tab-btn");
  const panes = {
    login: document.getElementById("pane-login"),
    register: document.getElementById("pane-register"),
  };
  const formTitle = document.getElementById("formTitle");
  const formSub = document.getElementById("formSub");

  const titles = {
    login: ["Sign in", "Enter your credentials to access your dashboard."],
    register: ["Create an author account", "Register to submit papers for review."],
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;

      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      Object.values(panes).forEach((p) => p.classList.remove("active"));
      panes[tab].classList.add("active");

      formTitle.textContent = titles[tab][0];
      formSub.textContent = titles[tab][1];
    });
  });

  /* ---------------- Sign in ---------------- */
  const loginForm = document.getElementById("loginForm");
  const loginMsg = document.getElementById("loginMsg");
  const loginAlert = document.getElementById("loginAlert");

  function showLoginAlert(msg, isSuccess = false) {
    if (loginAlert) {
      loginAlert.textContent = msg;
      loginAlert.className = isSuccess ? "auth-alert success" : "auth-alert error";
      loginAlert.style.display = "flex";
    }
    if (loginMsg) {
      loginMsg.textContent = msg;
      loginMsg.className = isSuccess ? "form-msg success" : "form-msg";
    }
  }

  function clearLoginAlert() {
    if (loginAlert) {
      loginAlert.textContent = "";
      loginAlert.style.display = "none";
    }
    if (loginMsg) {
      loginMsg.textContent = "";
      loginMsg.classList.remove("success");
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearLoginAlert();

      const username = document.getElementById("loginUser").value.trim();
      const password = document.getElementById("loginPass").value;

      if (!username || !password) {
        showLoginAlert("Please enter both your username and password.");
        return;
      }

      const submitBtn = loginForm.querySelector("button[type=submit]");
      const origText  = submitBtn ? submitBtn.textContent : "Sign In";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Signing in…";
      }

      try {
        const res = await fetch("api/auth.php?action=login", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ username, password }),
        });

        let data = {};
        try {
          data = await res.json();
        } catch (jsonErr) {
          throw new Error("Server returned an invalid response. Please verify Apache/PHP logs.");
        }

        // Check if backend returned error or non-success
        if (!res.ok || data.status === "error" || data.success === false || data.error) {
          const errMsg = data.message || data.error || "Invalid credentials. Please try again.";
          showLoginAlert(errMsg, false);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = origText;
          }
          return;
        }

        // Successful authentication
        showLoginAlert("Sign in successful! Redirecting to your dashboard...", true);

        // Save user info in sessionStorage
        if (data.user) {
          sessionStorage.setItem("rpms_user", JSON.stringify(data.user));
        }

        // Role-based destination matrix
        const roleRedirects = {
          author: "author.html",
          reviewer: "reviewer.html",
          editor: "editor.html",
          admin: "admin.html",
        };

        const targetPage = roleRedirects[data.role] || "author.html";
        setTimeout(() => {
          window.location.href = targetPage;
        }, 500);

      } catch (err) {
        console.error("Login submission error:", err);
        showLoginAlert("Connection error: " + err.message + ". Please verify XAMPP Apache is running.", false);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = origText;
        }
      }
    });
  }

  /* ---------------- Client-side Validation & Strength Meter ---------------- */
  const regPassInput = document.getElementById("regPass");
  const regPass2Input = document.getElementById("regPass2");
  const strengthMeter = document.getElementById("passStrengthMeter");
  const strengthBar = document.getElementById("strengthBar");
  const strengthLabel = document.getElementById("strengthLabel");
  const passMatchLabel = document.getElementById("passMatchLabel");

  function evaluatePasswordStrength(password) {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }

  if (regPassInput) {
    regPassInput.addEventListener("input", () => {
      const val = regPassInput.value;
      if (!val) {
        if (strengthMeter) strengthMeter.style.display = "none";
        return;
      }
      if (strengthMeter) strengthMeter.style.display = "block";
      const score = evaluatePasswordStrength(val);

      if (score <= 2) {
        strengthBar.style.width = "30%";
        strengthBar.style.backgroundColor = "var(--crimson, #d32f2f)";
        strengthLabel.textContent = "Weak password (use 8+ chars, numbers, uppercase)";
        strengthLabel.style.color = "var(--crimson, #d32f2f)";
      } else if (score <= 4) {
        strengthBar.style.width = "65%";
        strengthBar.style.backgroundColor = "#e67e22";
        strengthLabel.textContent = "Moderate password";
        strengthLabel.style.color = "#e67e22";
      } else {
        strengthBar.style.width = "100%";
        strengthBar.style.backgroundColor = "var(--success, #2e7d32)";
        strengthLabel.textContent = "Strong password";
        strengthLabel.style.color = "var(--success, #2e7d32)";
      }

      checkMatch();
    });
  }

  function checkMatch() {
    if (!regPass2Input || !passMatchLabel) return;
    const p1 = regPassInput ? regPassInput.value : "";
    const p2 = regPass2Input.value;
    if (!p2) {
      passMatchLabel.textContent = "";
      return;
    }
    if (p1 === p2) {
      passMatchLabel.textContent = "✓ Passwords match";
      passMatchLabel.style.color = "var(--success, #2e7d32)";
    } else {
      passMatchLabel.textContent = "✗ Passwords do not match";
      passMatchLabel.style.color = "var(--crimson, #d32f2f)";
    }
  }

  if (regPass2Input) {
    regPass2Input.addEventListener("input", checkMatch);
  }

  /* ---------------- Register (Author) ---------------- */
  const registerForm = document.getElementById("registerForm");
  const registerMsg = document.getElementById("registerMsg");

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      registerMsg.textContent = "";
      registerMsg.classList.remove("success");

      const name = document.getElementById("regName").value.trim();
      const email = document.getElementById("regEmail").value.trim();
      const affiliation = document.getElementById("regAffil").value.trim();
      const username = document.getElementById("regUser").value.trim();
      const password = document.getElementById("regPass").value;
      const password2 = document.getElementById("regPass2").value;

      if (!name || !email || !username || !password) {
        registerMsg.textContent = "Fill in all required fields.";
        return;
      }
      if (password !== password2) {
        registerMsg.textContent = "Passwords do not match.";
        return;
      }

      try {
        const res = await fetch("api/auth.php?action=register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, affiliation, username, password }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          registerMsg.textContent = data.error || "Could not create account.";
          return;
        }

        registerMsg.textContent = data.message || "Account created successfully! Redirecting...";
        registerMsg.classList.add("success");
        registerForm.reset();

        // Save session if returned and redirect directly to author dashboard
        if (data.user) {
          sessionStorage.setItem("rpms_user", JSON.stringify(data.user));
        }

        setTimeout(() => {
          window.location.href = "author.html";
        }, 1200);

      } catch (err) {
        registerMsg.textContent =
          "Backend not connected yet — build api/auth.php + api/db.php to make registration live.";
      }
    });
  }

});
