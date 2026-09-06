/* ============================================================
   RPRMS — editor.js
   Connects Editor Dashboard with Oracle database
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     LOAD DASHBOARD DATA
     ========================================================= */

  async function loadDashboard() {

    try {

      const response = await fetch(
        "api/editor.php?action=dashboard"
      );

      const data = await response.json();

      if (!data.success) {
        console.error(data.error);
        return;
      }

      /* Total Papers */

      const totalPapers =
        document.getElementById("totalPapers");

      if (totalPapers) {
        totalPapers.textContent =
          data.total_papers;
      }


      /* Pending Decisions */

      const pendingDecisions =
        document.getElementById("pendingDecisions");

      if (pendingDecisions) {
        pendingDecisions.textContent =
          data.pending_decisions;
      }


      /* Active Reviewers */

      const activeReviewers =
        document.getElementById("activeReviewers");

      if (activeReviewers) {
        activeReviewers.textContent =
          data.active_reviewers;
      }


      /* Tracks */

      const totalTracks =
        document.getElementById("totalTracks");

      if (totalTracks) {
        totalTracks.textContent =
          data.tracks;
      }

    } catch (error) {

      console.error(
        "Dashboard loading error:",
        error
      );

    }
  }



  /* =========================================================
     LOAD REVIEWERS
     ========================================================= */

  async function loadReviewers() {

    const tableBody =
      document.getElementById(
        "reviewersTableBody"
      );

    if (!tableBody) {
      return;
    }

    try {

      const response = await fetch(
        "api/editor.php?action=reviewers"
      );

      const data = await response.json();

      if (!data.success) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="5">
              ${data.error || "Unable to load reviewers."}
            </td>
          </tr>
        `;

        return;
      }


      /* No reviewers */

      if (!data.reviewers ||
          data.reviewers.length === 0) {

        tableBody.innerHTML = `
          <tr>
            <td colspan="5">
              No reviewers found.
            </td>
          </tr>
        `;

        return;
      }


      /* Clear table */

      tableBody.innerHTML = "";


      /* Add reviewers */

      data.reviewers.forEach(
        (reviewer) => {

          const row =
            document.createElement("tr");

          row.innerHTML = `
            <td class="mono">
              R-${reviewer.reviewer_id}
            </td>

            <td>
              ${reviewer.name}
            </td>

            <td>
              ${reviewer.email}
            </td>

            <td>
              ${reviewer.expertise}
            </td>

            <td>
              ${reviewer.active_assignments}
            </td>
          `;

          tableBody.appendChild(row);
        }
      );

    } catch (error) {

      console.error(
        "Reviewer loading error:",
        error
      );

      tableBody.innerHTML = `
        <tr>
          <td colspan="5">
            Backend connection failed.
          </td>
        </tr>
      `;
    }
  }

async function loadPapers() {

  const tableBody = document.getElementById("papersTableBody");

  if (!tableBody) return;

  try {

    const response = await fetch(
      "api/editor.php?action=papers"
    );

    const data = await response.json();

    if (!data.success) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">${data.error || "Unable to load papers."}</td>
        </tr>
      `;
      return;
    }

    if (!data.papers || data.papers.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6">No papers found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = "";

    data.papers.forEach((paper) => {

      const row = document.createElement("tr");

      row.innerHTML = `
        <td class="mono">P-${paper.paper_id}</td>
        <td>${paper.title}</td>
        <td>${paper.track}</td>
        <td>${paper.status}</td>
        <td>${paper.review_count}</td>
        <td>
          <button class="btn-ghost">View</button>
        </td>
      `;

      tableBody.appendChild(row);
    });

  } catch (error) {

    console.error("Paper loading error:", error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="6">Backend connection failed.</td>
      </tr>
    `;
  }
}

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  loadDashboard();

  loadReviewers();

  loadPapers();

});