/* ============================================================
   RPRMS — auth.js
   Handles tab switching + login/register form submission.
   Currently talks to api/auth.php via fetch(). Until that file
   exists this will fail gracefully and just show a message —
   build api/auth.php + api/db.php next to make it live.
   ============================================================ */

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

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMsg.textContent = "";
  loginMsg.classList.remove("success");

  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value;

  if (!username || !password) {
    loginMsg.textContent = "Enter your username and password.";
    return;
  }

  try {
    const res = await fetch("api/auth.php?action=login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      loginMsg.textContent = data.error || "Invalid username or password.";
      return;
    }

    // Redirect based on role, same pattern as api/auth.php sets in $_SESSION
    const roleRedirects = {
      author: "author.html",
      reviewer: "reviewer.html",
      editor: "editor.html",
      admin: "admin.html",
    };
    window.location.href = roleRedirects[data.role] || "index.html";

  } catch (err) {
    loginMsg.textContent =
      "Backend not connected yet — build api/auth.php + api/db.php to make sign-in live.";
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