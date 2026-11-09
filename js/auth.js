/* ============================================================
   RPRMS — auth.js
   Handles tab switching + login/register form submission.
   Currently talks to api/auth.php via fetch(). Until that file
   exists this will fail gracefully and just show a message —
   build api/auth.php + api/db.php next to make it live.
   ============================================================ */

/* ── Eye / password toggle ── */
document.querySelectorAll(".eye-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const input = document.getElementById(targetId);
    if (!input) return;

    const isHidden = input.type === "password";
    input.type = isHidden ? "text" : "password";

    const open   = btn.querySelector(".eye-open");
    const closed = btn.querySelector(".eye-closed");
    if (open)   open.style.display   = isHidden ? "none"  : "";
    if (closed) closed.style.display = isHidden ? ""      : "none";
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

loginForm.addEventListener(\"submit\", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";
  loginMsg.classList.remove("success");

  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;

  if (!username || !password) {
    loginMsg.textContent = "Enter your username and password.";
    return;
  }

  const submitBtn = loginForm.querySelector("button[type=submit]");
  const origText  = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  try {
    const res = await fetch("api/auth.php?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok || !data.success || data.error) {
      loginMsg.textContent = data.error || "Invalid username or password.";
      submitBtn.disabled = false;
      submitBtn.textContent = origText;
      return;
    }

    // Save user info in sessionStorage
    if (data.user) {
      sessionStorage.setItem("rpms_user", JSON.stringify(data.user));
    }

    // Redirect based on role
    const roleRedirects = {
      author: "author.html",
      reviewer: "reviewer.html",
      editor: "editor.html",
      admin: "admin.html",
    };
    window.location.href = roleRedirects[data.role] || "author.html";

  } catch (err) {
    loginMsg.textContent = "Server connection failed. Please check that Apache is running.";
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
  }
});

/* ---------------- Register (Author) ---------------- */
const registerForm = document.getElementById("registerForm");
const registerMsg = document.getElementById("registerMsg");

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

    registerMsg.textContent = "Account created — you can sign in now.";
    registerMsg.classList.add("success");
    registerForm.reset();

  } catch (err) {
    registerMsg.textContent =
      "Backend not connected yet — build api/auth.php + api/db.php to make registration live.";
  }
});