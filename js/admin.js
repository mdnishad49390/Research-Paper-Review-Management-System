/* ============================================================
   RPRMS — admin.js
   Admin Dashboard & Full System Control
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* --- Security Check (Admin Only) --- */
    const currentUser = JSON.parse(sessionStorage.getItem("rpms_user") || "null");
    if (!currentUser || currentUser.role !== "admin") {
        // If not logged in as admin, redirect to login page
        // window.location.href = "index.html";
        // (Allowed in development so direct URL testing works, but warning in console)
        console.warn("Current user is not admin:", currentUser);
    }

    /* =========================================================
       HELPERS & NOTIFICATIONS
       ========================================================= */
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showMsg(el, msg, isSuccess) {
        if (!el) return;
        el.textContent = msg;
        el.style.color = isSuccess ? "var(--success, #2e7d32)" : "var(--crimson, #d32f2f)";
        el.style.fontWeight = "500";
        el.style.marginTop = "8px";
        setTimeout(() => {
            if (el.textContent === msg) el.textContent = "";
        }, 5000);
    }

    function getBadgeClass(status) {
        const s = (status || "").toLowerCase();
        if (s.includes("accept")) return "badge-accepted";
        if (s.includes("reject")) return "badge-rejected";
        if (s.includes("revision")) return "badge-revision";
        if (s.includes("review")) return "badge-review";
        return "badge-submitted";
    }

    /* =========================================================
       1. SYSTEM STATS (OVERVIEW)
       ========================================================= */
    async function loadStats() {
        try {
            const res = await fetch("api/admin.php?action=stats");
            const data = await res.json();
            if (data.success && data.stats) {
                const s = data.stats;
                const setEl = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = val;
                };
                setEl("statUsers", s.total_users);
                setEl("statPapers", s.total_papers);
                setEl("statReviews", s.total_reviews);
                setEl("statTracks", s.total_tracks);
                setEl("statReviewers", s.total_reviewers);
                setEl("statAuthors", s.total_authors);
                setEl("statPendingDecisions", s.pending_decisions);
                setEl("statAcceptedPapers", s.accepted_papers);
            }
        } catch (e) {
            console.error("Stats load error:", e);
        }
    }

    /* =========================================================
       2. USERS MANAGEMENT
       ========================================================= */
    const usersTableBody = document.getElementById("usersTableBody");
    const userCountEl = document.getElementById("userCount");
    const createUserForm = document.getElementById("createUserForm");
    const createUserMsg = document.getElementById("createUserMsg");
    const refreshUsersBtn = document.getElementById("refreshUsersBtn");

    async function loadUsers() {
        if (!usersTableBody) return;
        usersTableBody.innerHTML = `<tr><td colspan="8">Loading users...</td></tr>`;

        try {
            const res = await fetch("api/admin.php?action=get_users");
            const data = await res.json();

            if (!data.success || !data.users || data.users.length === 0) {
                usersTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--muted);">No registered users found.</td></tr>`;
                if (userCountEl) userCountEl.textContent = "0";
                return;
            }

            if (userCountEl) userCountEl.textContent = data.users.length;

            usersTableBody.innerHTML = data.users.map(u => `
                <tr>
                    <td class="mono">${escapeHtml(u.user_id)}</td>
                    <td><strong>${escapeHtml(u.username)}</strong></td>
                    <td>${escapeHtml(u.full_name)}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>
                        <span class="badge ${u.role === 'admin' ? 'badge-rejected' : (u.role === 'editor' ? 'badge-revision' : 'badge-submitted')}">
                            ${escapeHtml(u.role).toUpperCase()}
                        </span>
                    </td>
                    <td class="mono">${escapeHtml(u.role_id)}</td>
                    <td class="muted">${escapeHtml(u.created_at || '—')}</td>
                    <td>
                        <button class="btn-ghost delete-user-btn" data-id="${u.user_id}" data-username="${escapeHtml(u.username)}" style="padding: 4px 8px; color: var(--crimson);">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("");

            // Bind delete events
            usersTableBody.querySelectorAll(".delete-user-btn").forEach(btn => {
                btn.addEventListener("click", () => deleteUser(btn.dataset.id, btn.dataset.username));
            });

        } catch (e) {
            usersTableBody.innerHTML = `<tr><td colspan="8" style="color: var(--crimson);">Error loading users: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    async function deleteUser(id, username) {
        if (!confirm(`Are you sure you want to delete user account '${username}' (ID: ${id})?`)) {
            return;
        }

        try {
            const res = await fetch("api/admin.php?action=delete_user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: id })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message || "User deleted.");
                loadUsers();
                loadStats();
            } else {
                alert(data.error || "Failed to delete user.");
            }
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    if (createUserForm) {
        createUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const formData = {
                full_name: document.getElementById("uFullName").value.trim(),
                email: document.getElementById("uEmail").value.trim(),
                username: document.getElementById("uUsername").value.trim(),
                password: document.getElementById("uPassword").value.trim(),
                role: document.getElementById("uRole").value
            };

            try {
                const res = await fetch("api/admin.php?action=create_user", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });
                const data = await res.json();
                if (data.success) {
                    showMsg(createUserMsg, data.message, true);
                    createUserForm.reset();
                    loadUsers();
                    loadStats();
                } else {
                    showMsg(createUserMsg, data.error || "Failed to create user.", false);
                }
            } catch (err) {
                showMsg(createUserMsg, "Server error: " + err.message, false);
            }
        });
    }

    if (refreshUsersBtn) refreshUsersBtn.addEventListener("click", loadUsers);

    /* =========================================================
       3. PAPERS CONTROL
       ========================================================= */
    const adminPapersTableBody = document.getElementById("adminPapersTableBody");
    const paperCountEl = document.getElementById("paperCount");
    const refreshPapersBtn = document.getElementById("refreshPapersBtn");

    async function loadAdminPapers() {
        if (!adminPapersTableBody) return;
        adminPapersTableBody.innerHTML = `<tr><td colspan="9">Loading papers...</td></tr>`;

        try {
            const res = await fetch("api/admin.php?action=get_papers");
            const data = await res.json();

            if (!data.success || !data.papers || data.papers.length === 0) {
                adminPapersTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--muted);">No submitted papers found.</td></tr>`;
                if (paperCountEl) paperCountEl.textContent = "0";
                return;
            }

            if (paperCountEl) paperCountEl.textContent = data.papers.length;

            const statusOptions = ["Submitted", "Under Review", "Revision Required", "Accepted", "Rejected"];

            adminPapersTableBody.innerHTML = data.papers.map(p => `
                <tr>
                    <td class="mono">P-${escapeHtml(p.paper_id)}</td>
                    <td>
                        <strong>${escapeHtml(p.title)}</strong>
                        <div class="muted" style="font-size: 11px; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${escapeHtml(p.abstract)}
                        </div>
                    </td>
                    <td>${escapeHtml(p.author_name)}</td>
                    <td><span class="badge badge-submitted">${escapeHtml(p.track_name)}</span></td>
                    <td class="mono">${escapeHtml(p.page_count)}</td>
                    <td><span class="badge ${getBadgeClass(p.paper_status)}">${escapeHtml(p.paper_status)}</span></td>
                    <td class="mono">${escapeHtml(p.assignment_count)}</td>
                    <td>
                        <select class="change-status-select" data-id="${p.paper_id}" style="padding: 4px 6px; font-size: 12px; border-radius: 4px;">
                            ${statusOptions.map(opt => `
                                <option value="${opt}" ${opt.toLowerCase() === (p.paper_status || '').toLowerCase() ? 'selected' : ''}>${opt}</option>
                            `).join("")}
                        </select>
                    </td>
                    <td>
                        <button class="btn-ghost delete-paper-btn" data-id="${p.paper_id}" style="padding: 4px 8px; color: var(--crimson);">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("");

            // Change status listener
            adminPapersTableBody.querySelectorAll(".change-status-select").forEach(sel => {
                sel.addEventListener("change", async (e) => {
                    const newStatus = e.target.value;
                    const paperId = sel.dataset.id;
                    try {
                        const res = await fetch("api/admin.php?action=update_paper_status", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ paper_id: paperId, status: newStatus })
                        });
                        const resData = await res.json();
                        if (resData.success) {
                            loadAdminPapers();
                            loadStats();
                        } else {
                            alert(resData.error || "Update failed.");
                        }
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                });
            });

            // Delete paper listener
            adminPapersTableBody.querySelectorAll(".delete-paper-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const paperId = btn.dataset.id;
                    if (!confirm(`Are you sure you want to permanently delete Paper #P-${paperId} and its review assignments?`)) return;
                    try {
                        const res = await fetch("api/admin.php?action=delete_paper", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ paper_id: paperId })
                        });
                        const resData = await res.json();
                        if (resData.success) {
                            alert(resData.message || "Paper deleted.");
                            loadAdminPapers();
                            loadStats();
                        } else {
                            alert(resData.error || "Delete failed.");
                        }
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                });
            });

        } catch (e) {
            adminPapersTableBody.innerHTML = `<tr><td colspan="9" style="color: var(--crimson);">Error loading papers: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    if (refreshPapersBtn) refreshPapersBtn.addEventListener("click", loadAdminPapers);

    /* =========================================================
       4. TRACKS MANAGEMENT
       ========================================================= */
    const tracksTableBody = document.getElementById("tracksTableBody");
    const createTrackForm = document.getElementById("createTrackForm");
    const createTrackMsg = document.getElementById("createTrackMsg");
    const refreshTracksBtn = document.getElementById("refreshTracksBtn");

    async function loadTracks() {
        if (!tracksTableBody) return;
        tracksTableBody.innerHTML = `<tr><td colspan="4">Loading tracks...</td></tr>`;

        try {
            const res = await fetch("api/admin.php?action=get_tracks");
            const data = await res.json();

            if (!data.success || !data.tracks || data.tracks.length === 0) {
                tracksTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--muted);">No tracks configured.</td></tr>`;
                return;
            }

            tracksTableBody.innerHTML = data.tracks.map(t => `
                <tr>
                    <td class="mono">${escapeHtml(t.track_id)}</td>
                    <td><strong>${escapeHtml(t.track_name)}</strong></td>
                    <td class="mono">${escapeHtml(t.paper_count)}</td>
                    <td>
                        <button class="btn-ghost delete-track-btn" data-id="${t.track_id}" data-name="${escapeHtml(t.track_name)}" style="padding: 4px 8px; color: var(--crimson);">
                            Delete
                        </button>
                    </td>
                </tr>
            `).join("");

            tracksTableBody.querySelectorAll(".delete-track-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    const name = btn.dataset.name;
                    if (!confirm(`Delete track '${name}' (ID: ${id})?`)) return;
                    try {
                        const res = await fetch("api/admin.php?action=delete_track", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ track_id: id })
                        });
                        const resData = await res.json();
                        if (resData.success) {
                            alert(resData.message || "Track deleted.");
                            loadTracks();
                            loadStats();
                        } else {
                            alert(resData.error || "Cannot delete track.");
                        }
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                });
            });

        } catch (e) {
            tracksTableBody.innerHTML = `<tr><td colspan="4" style="color: var(--crimson);">Error loading tracks: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    if (createTrackForm) {
        createTrackForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const trackName = document.getElementById("trackName").value.trim();
            try {
                const res = await fetch("api/admin.php?action=create_track", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ track_name: trackName })
                });
                const data = await res.json();
                if (data.success) {
                    showMsg(createTrackMsg, data.message, true);
                    createTrackForm.reset();
                    loadTracks();
                    loadStats();
                } else {
                    showMsg(createTrackMsg, data.error || "Failed to create track.", false);
                }
            } catch (err) {
                showMsg(createTrackMsg, "Error: " + err.message, false);
            }
        });
    }

    if (refreshTracksBtn) refreshTracksBtn.addEventListener("click", loadTracks);

    /* =========================================================
       5. REVIEWERS DIRECTORY
       ========================================================= */
    const adminReviewersTableBody = document.getElementById("adminReviewersTableBody");
    const createReviewerForm = document.getElementById("createReviewerForm");
    const createReviewerMsg = document.getElementById("createReviewerMsg");
    const refreshReviewersBtn = document.getElementById("refreshReviewersBtn");

    async function loadAdminReviewers() {
        if (!adminReviewersTableBody) return;
        adminReviewersTableBody.innerHTML = `<tr><td colspan="6">Loading reviewers...</td></tr>`;

        try {
            const res = await fetch("api/admin.php?action=get_reviewers");
            const data = await res.json();

            if (!data.success || !data.reviewers || data.reviewers.length === 0) {
                adminReviewersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--muted);">No reviewers found.</td></tr>`;
                return;
            }

            adminReviewersTableBody.innerHTML = data.reviewers.map(r => `
                <tr>
                    <td class="mono">${escapeHtml(r.reviewer_id)}</td>
                    <td><strong>${escapeHtml(r.name)}</strong></td>
                    <td>${escapeHtml(r.email)}</td>
                    <td><span class="badge badge-submitted">${escapeHtml(r.expertise)}</span></td>
                    <td class="mono">${escapeHtml(r.active_reviews)}</td>
                    <td>
                        <button class="btn-ghost delete-rev-btn" data-id="${r.reviewer_id}" data-name="${escapeHtml(r.name)}" style="padding: 4px 8px; color: var(--crimson);">
                            Remove
                        </button>
                    </td>
                </tr>
            `).join("");

            adminReviewersTableBody.querySelectorAll(".delete-rev-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.dataset.id;
                    const name = btn.dataset.name;
                    if (!confirm(`Remove reviewer '${name}' (ID: ${id}) from reviewer pool?`)) return;
                    try {
                        const res = await fetch("api/admin.php?action=delete_reviewer", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ reviewer_id: id })
                        });
                        const resData = await res.json();
                        if (resData.success) {
                            alert(resData.message || "Reviewer removed.");
                            loadAdminReviewers();
                            loadStats();
                        } else {
                            alert(resData.error || "Cannot delete reviewer.");
                        }
                    } catch (err) {
                        alert("Error: " + err.message);
                    }
                });
            });

        } catch (e) {
            adminReviewersTableBody.innerHTML = `<tr><td colspan="6" style="color: var(--crimson);">Error loading reviewers: ${escapeHtml(e.message)}</td></tr>`;
        }
    }

    if (createReviewerForm) {
        createReviewerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById("revName").value.trim(),
                email: document.getElementById("revEmail").value.trim(),
                expertise: document.getElementById("revExp").value.trim()
            };
            try {
                const res = await fetch("api/admin.php?action=create_reviewer", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    showMsg(createReviewerMsg, data.message, true);
                    createReviewerForm.reset();
                    loadAdminReviewers();
                    loadStats();
                } else {
                    showMsg(createReviewerMsg, data.error || "Failed to create reviewer.", false);
                }
            } catch (err) {
                showMsg(createReviewerMsg, "Error: " + err.message, false);
            }
        });
    }

    if (refreshReviewersBtn) refreshReviewersBtn.addEventListener("click", loadAdminReviewers);

    /* =========================================================
       6. REVIEWS & DECISIONS AUDIT
       ========================================================= */
    const adminReviewsTableBody = document.getElementById("adminReviewsTableBody");
    const refreshReviewsBtn = document.getElementById("refreshReviewsBtn");

    async function loadAdminReviews() {
        if (!adminReviewsTableBody) return;
        adminReviewsTableBody.innerHTML = `<tr><td colspan="7">Loading reviews...</td></tr>`;

        try {
            const res = await fetch("api/admin.php?action=get_reviews");
            const data = await res.json();

            if (!data.success || !data.reviews || data.reviews.length === 0) {
                adminReviewsTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--muted);">No reviews submitted yet.</td></tr>`;
                return;
            }

            adminReviewsTableBody.innerHTML = data.reviews.map(r => `
                <tr>
                    <td class="mono">R-${escapeHtml(r.review_id)}</td>
                    <td><strong>P-${escapeHtml(r.paper_id)}: ${escapeHtml(r.paper_title)}</strong></td>
                    <td>${escapeHtml(r.reviewer_name)}</td>
                    <td class="mono"><strong>${escapeHtml(r.score)} / 10</strong></td>
                    <td><span class="badge ${getBadgeClass(r.recommendation)}">${escapeHtml(r.recommendation)}</span></td>
                    <td style="max-width: 250px; font-size: 12px;">${escapeHtml(r.comments)}</td>
                    <td class="muted">${escapeHtml(r.review_date || '—')}</td>
                </tr>
            `).join("");

        } catch (e) {
            adminReviewsTableBody.innerHTML = `<tr><td colspan="7" style="color: var(--crimson);">Error loading reviews: ${escapeHtml(e.message)}</td></tr>`;
        }
    }
    if (refreshReviewsBtn) refreshReviewsBtn.addEventListener("click", loadAdminReviews);

    const adminDecisionsTableBody = document.getElementById("adminDecisionsTableBody");
    const refreshDecisionsBtn = document.getElementById("refreshDecisionsBtn");

    async function loadAdminDecisions() {
        if (!adminDecisionsTableBody) return;
        adminDecisionsTableBody.innerHTML = `<tr><td colspan="6">Loading decisions...</td></tr>`;

        try {
            const res = await fetch("api/admin.php?action=get_decisions");
            const data = await res.json();

            if (!data.success || !data.decisions || data.decisions.length === 0) {
                adminDecisionsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--muted);">No decisions recorded yet.</td></tr>`;
                return;
            }

            adminDecisionsTableBody.innerHTML = data.decisions.map(d => `
                <tr>
                    <td class="mono">D-${escapeHtml(d.decision_id)}</td>
                    <td><strong>P-${escapeHtml(d.paper_id)}: ${escapeHtml(d.paper_title)}</strong></td>
                    <td><span class="badge ${getBadgeClass(d.final_status)}">${escapeHtml(d.final_status)}</span></td>
                    <td>${escapeHtml(d.decision_date || '—')}</td>
                    <td style="max-width: 250px; font-size: 12px;">${escapeHtml(d.remarks)}</td>
                    <td class="mono">E-${escapeHtml(d.editor_id)}</td>
                </tr>
            `).join("");

        } catch (e) {
            adminDecisionsTableBody.innerHTML = `<tr><td colspan="6" style="color: var(--crimson);">Error loading decisions: ${escapeHtml(e.message)}</td></tr>`;
        }
    }
    if (refreshDecisionsBtn) refreshDecisionsBtn.addEventListener("click", loadAdminDecisions);

    /* =========================================================
       INITIAL LOAD & NAVIGATION LISTENER
       ========================================================= */
    loadStats();
    loadUsers();
    loadAdminPapers();
    loadTracks();
    loadAdminReviewers();
    loadAdminReviews();
    loadAdminDecisions();

    // Listen to tab navigation to refresh current view
    document.querySelectorAll(".sb-link[data-page]").forEach(btn => {
        btn.addEventListener("click", () => {
            const page = btn.dataset.page;
            if (page === "overview") loadStats();
            else if (page === "users") loadUsers();
            else if (page === "papers") loadAdminPapers();
            else if (page === "tracks") loadTracks();
            else if (page === "reviewers") loadAdminReviewers();
            else if (page === "reviews") loadAdminReviews();
            else if (page === "decisions") loadAdminDecisions();
        });
    });

    // Handle Quick Action data-goto buttons
    document.querySelectorAll("[data-goto]").forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.goto;
            const targetBtn = document.querySelector(`.sb-link[data-page="${target}"]`);
            if (targetBtn) {
                targetBtn.click();
            }
        });
    });

});

