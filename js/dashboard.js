/* ============================================================
   RPRMS — dashboard.js
   Shared by author.html / reviewer.html / editor.html.
   Handles sidebar page-switching, sign-out, and today's-date
   defaults. Forms are wired to log the payload for now — swap
   the console.log() blocks for fetch() calls once api/*.php
   exist (see the TODO comments).
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Sidebar navigation ---------- */
  const navButtons = document.querySelectorAll(".sb-link[data-page]");
  const pages = document.querySelectorAll(".dash-page");
  const pageTitle = document.getElementById("pageTitle");

  function goToPage(pageId) {
    pages.forEach((p) => p.classList.toggle("active", p.id === "page-" + pageId));
    navButtons.forEach((b) => b.classList.toggle("active", b.dataset.page === pageId));
    const activeBtn = document.querySelector(`.sb-link[data-page="${pageId}"]`);
    if (activeBtn && pageTitle) pageTitle.textContent = activeBtn.dataset.title || activeBtn.textContent.trim();
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => goToPage(btn.dataset.page));
  });

  // Buttons elsewhere on the page (e.g. table row actions) can also jump pages
  document.querySelectorAll("[data-goto]").forEach((el) => {
    el.addEventListener("click", () => goToPage(el.dataset.goto));
  });

  /* ---------- Sign out ---------- */
  const signOutBtn = document.querySelector(".sb-signout");
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      // TODO: call api/auth.php?action=logout to destroy the session
      window.location.href = "index.html";
    });
  }

  /* ---------- Default date fields to today ---------- */
  document.querySelectorAll('input[type="date"][data-default-today]').forEach((input) => {
    input.value = new Date().toISOString().slice(0, 10);
  });

  /* ---------- Generic mock-submit handler ---------- */
  document.querySelectorAll("form[data-mock-submit]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      console.log(`[${form.id || "form"}] would POST to api/${form.dataset.mockSubmit}:`, data);

      const msg = form.querySelector(".form-msg");
      if (msg) {
        msg.textContent = "Saved (demo only — connect api/" + form.dataset.mockSubmit + " to make this live).";
        msg.classList.add("success");
      }
      form.reset();
    });
  });
});
