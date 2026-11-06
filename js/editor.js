/* ============================================================
   RPRMS — editor.js
   Editor Dashboard + Oracle Database
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* =========================================================
       ELEMENTS
       ========================================================= */

    const paperSelect =
        document.getElementById("aPaper");

    const reviewerSelect =
        document.getElementById("aReviewer");

    const assignForm =
        document.getElementById("assignForm");

    const decisionForm =
        document.getElementById("decisionForm");


    /* =========================================================
       LOAD DASHBOARD
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

            const totalPapers =
                document.getElementById("totalPapers");

            const pendingDecisions =
                document.getElementById("pendingDecisions");

            const activeReviewers =
                document.getElementById("activeReviewers");

            const totalTracks =
                document.getElementById("totalTracks");


            if (totalPapers) {
                totalPapers.textContent =
                    data.total_papers;
            }

            if (pendingDecisions) {
                pendingDecisions.textContent =
                    data.pending_decisions;
            }

            if (activeReviewers) {
                activeReviewers.textContent =
                    data.active_reviewers;
            }

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


            tableBody.innerHTML = "";


            data.reviewers.forEach((reviewer) => {

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

            });

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



    /* =========================================================
       LOAD PAPERS
       ========================================================= */

    async function loadPapers() {

        const tableBody =
            document.getElementById(
                "papersTableBody"
            );

        if (!tableBody) {
            return;
        }

        try {

            const response = await fetch(
                "api/editor.php?action=papers"
            );

            const data = await response.json();

            if (!data.success) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            ${data.error || "Unable to load papers."}
                        </td>
                    </tr>
                `;

                return;
            }


            if (!data.papers ||
                data.papers.length === 0) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            No papers found.
                        </td>
                    </tr>
                `;

                return;
            }


            tableBody.innerHTML = "";


            data.papers.forEach((paper) => {

                const row =
                    document.createElement("tr");

                row.innerHTML = `
                    <td class="mono">
                        P-${paper.paper_id}
                    </td>

                    <td>
                        ${paper.title}
                    </td>

                    <td>
                        ${paper.track || ""}
                    </td>

                    <td>
                        ${paper.status || ""}
                    </td>

                    <td>
                        ${paper.review_count}
                    </td>

                    <td>
                        <button
                            type="button"
                            class="btn-ghost">
                            View
                        </button>
                    </td>
                `;

                tableBody.appendChild(row);

            });

        } catch (error) {

            console.error(
                "Paper loading error:",
                error
            );

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        Backend connection failed.
                    </td>
                </tr>
            `;

        }
    }



    /* =========================================================
       LOAD ASSIGN REVIEWER DATA
       ========================================================= */

    async function loadAssignData() {

        if (!paperSelect || !reviewerSelect) {
            return;
        }

        try {

            paperSelect.innerHTML =
                '<option value="">Loading papers...</option>';

            reviewerSelect.innerHTML =
                '<option value="">Loading reviewers...</option>';


            const response = await fetch(
                "api/editor.php?action=assign_data"
            );

            const data = await response.json();


            if (!data.success) {

                throw new Error(
                    data.error ||
                    "Failed to load assignment data."
                );

            }


            /* PAPERS */

            paperSelect.innerHTML =
                '<option value="">Select a paper</option>';


            data.papers.forEach((paper) => {

                const option =
                    document.createElement("option");

                option.value =
                    paper.paper_id;

                option.textContent =
                    "P-" +
                    paper.paper_id +
                    " — " +
                    paper.title;

                paperSelect.appendChild(option);

            });


            /* REVIEWERS */

            reviewerSelect.innerHTML =
                '<option value="">Select a reviewer</option>';


            data.reviewers.forEach((reviewer) => {

                const option =
                    document.createElement("option");

                option.value =
                    reviewer.reviewer_id;

                option.textContent =
                    "R-" +
                    reviewer.reviewer_id +
                    " — " +
                    reviewer.name +
                    " (" +
                    reviewer.expertise +
                    ")";

                reviewerSelect.appendChild(option);

            });

        } catch (error) {

            console.error(
                "Assign data loading error:",
                error
            );

            paperSelect.innerHTML =
                '<option value="">Failed to load papers</option>';

            reviewerSelect.innerHTML =
                '<option value="">Failed to load reviewers</option>';

        }
    }



    /* =========================================================
       ASSIGN REVIEWER
       ========================================================= */

    if (assignForm) {

        assignForm.addEventListener(
            "submit",
            async function(event) {

                event.preventDefault();

                const formMsg =
                    assignForm.querySelector(".form-msg");


                const formData =
                    new FormData(assignForm);


                const requestData =
                    Object.fromEntries(
                        formData.entries()
                    );


                try {

                    const response =
                        await fetch(
                            "api/editor.php?action=assign_reviewer",
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify(
                                        requestData
                                    )
                            }
                        );


                    const result =
                        await response.json();


                    if (result.success) {

                        if (formMsg) {

                            formMsg.textContent =
                                "Reviewer assigned successfully!";

                            formMsg.style.color =
                                "green";
                        }


                        assignForm.reset();

                        await loadAssignData();

                        await loadReviewers();

                    } else {

                        if (formMsg) {

                            formMsg.textContent =
                                result.error ||
                                "Failed to assign reviewer.";

                            formMsg.style.color =
                                "red";
                        }

                    }

                } catch (error) {

                    console.error(
                        "Assign reviewer error:",
                        error
                    );

                    if (formMsg) {

                        formMsg.textContent =
                            "Server error. Please try again.";

                        formMsg.style.color =
                            "red";
                    }

                }

            }
        );
    }



    /* =========================================================
       LOAD RECORDED DECISIONS
       ========================================================= */

    async function loadDecisions() {

        const tableBody =
            document.getElementById(
                "decisionsTableBody"
            );

        if (!tableBody) {
            return;
        }

        try {

            const response =
                await fetch(
                    "api/editor.php?action=decisions"
                );


            const data =
                await response.json();


            if (!data.success) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            ${data.error || "Unable to load decisions."}
                        </td>
                    </tr>
                `;

                return;
            }


            if (!data.decisions ||
                data.decisions.length === 0) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            No decisions found.
                        </td>
                    </tr>
                `;

                return;
            }


            tableBody.innerHTML = "";


            data.decisions.forEach((decision) => {

                const row =
                    document.createElement("tr");


                row.innerHTML = `
                    <td class="mono">
                        D-${decision.decision_id}
                    </td>

                    <td class="mono">
                        P-${decision.paper_id}
                    </td>

                    <td>
                        ${decision.title || ""}
                    </td>

                    <td>
                        ${decision.final_status}
                    </td>

                    <td>
                        ${decision.decision_date}
                    </td>

                    <td>
                        ${decision.remarks || ""}
                    </td>
                `;


                tableBody.appendChild(row);

            });

        } catch (error) {

            console.error(
                "Decision loading error:",
                error
            );

            tableBody.innerHTML = `
                <tr>
                    <td colspan="6">
                        Backend connection failed.
                    </td>
                </tr>
            `;

        }
    }



    /* =========================================================
       LOAD UNDECIDED PAPERS
       ========================================================= */

    async function loadDecisionPapers() {

        const select =
            document.getElementById("dPaper");


        if (!select) {
            return;
        }


        try {

            select.innerHTML =
                '<option value="">Loading papers...</option>';


            const paperResponse =
                await fetch(
                    "api/editor.php?action=assign_data"
                );


            const paperData =
                await paperResponse.json();


            const decisionResponse =
                await fetch(
                    "api/editor.php?action=decisions"
                );


            const decisionData =
                await decisionResponse.json();


            if (!paperData.success) {

                throw new Error(
                    paperData.error ||
                    "Unable to load papers."
                );

            }


            if (!decisionData.success) {

                throw new Error(
                    decisionData.error ||
                    "Unable to load decisions."
                );

            }


            const decidedIds =
                new Set(
                    decisionData.decisions.map(
                        decision =>
                            String(
                                decision.paper_id
                            )
                    )
                );


            select.innerHTML =
                '<option value="">Select a paper</option>';


            let count = 0;


            paperData.papers.forEach((paper) => {

                if (
                    decidedIds.has(
                        String(paper.paper_id)
                    )
                ) {

                    return;

                }


                const option =
                    document.createElement("option");


                option.value =
                    paper.paper_id;


                option.textContent =
                    "P-" +
                    paper.paper_id +
                    " — " +
                    paper.title;


                select.appendChild(option);


                count++;

            });


            if (count === 0) {

                select.innerHTML =
                    '<option value="">No papers awaiting decision</option>';

            }

        } catch (error) {

            console.error(
                "Decision paper loading error:",
                error
            );

            select.innerHTML =
                '<option value="">Failed to load papers</option>';

        }
    }

/* =========================================================
   RECORD FINAL DECISION
   ========================================================= */

const recordDecisionBtn =
    document.getElementById("recordDecisionBtn");


if (decisionForm && recordDecisionBtn) {

    console.log("Decision form and button found.");

    recordDecisionBtn.addEventListener(
        "click",
        async function() {

            console.log(
                "RECORD DECISION BUTTON CLICKED"
            );


            let formMsg =
    decisionForm.querySelector(".form-msg");

if (!formMsg) {
    formMsg = document.createElement("div");
    formMsg.className = "form-msg";
    formMsg.style.marginTop = "10px";
    formMsg.style.fontWeight = "500";

    decisionForm.appendChild(formMsg);
}


            const paperId =
                document.getElementById(
                    "dPaper"
                ).value;

            const finalStatus =
                document.getElementById(
                    "dStatus"
                ).value;

            const decisionDate =
                document.getElementById(
                    "dDate"
                ).value;

            const remarks =
                document.getElementById(
                    "dRemarks"
                ).value.trim();


            console.log(
                "Paper:",
                paperId
            );

            console.log(
                "Status:",
                finalStatus
            );

            console.log(
                "Date:",
                decisionDate
            );

            console.log(
                "Remarks:",
                remarks
            );


            /* =========================
               FRONTEND VALIDATION
               ========================= */

            if (!paperId) {

                formMsg.textContent =
                    "Please select a paper.";

                formMsg.style.color =
                    "red";

                return;
            }


            if (!finalStatus) {

                formMsg.textContent =
                    "Please select a final status.";

                formMsg.style.color =
                    "red";

                return;
            }


            if (!decisionDate) {

                formMsg.textContent =
                    "Please select the decision date.";

                formMsg.style.color =
                    "red";

                return;
            }


            if (!remarks) {

                formMsg.textContent =
                    "Please enter remarks.";

                formMsg.style.color =
                    "red";

                return;
            }


            /* =========================
               SHOW SAVING
               ========================= */

            formMsg.textContent =
                "Saving decision...";

            formMsg.style.color =
                "blue";


            /* =========================
               REQUEST DATA
               ========================= */

            const requestData = {

                paper_id:
                    paperId,

                final_status:
                    finalStatus,

                decision_date:
                    decisionDate,

                remarks:
                    remarks

            };


            console.log(
                "Sending decision:",
                requestData
            );


            try {

                const response =
                    await fetch(
                        "api/editor.php?action=record_decision",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify(
                                    requestData
                                )
                        }
                    );


                console.log(
                    "Response status:",
                    response.status
                );


                const result =
                    await response.json();


                console.log(
                    "Decision API response:",
                    result
                );


                if (result.success) {

                    formMsg.textContent =
                        "Decision recorded successfully!";

                    formMsg.style.color =
                        "green";


                    decisionForm.reset();


                    await loadDecisions();

                    await loadDecisionPapers();

                    await loadDashboard();

                    await loadPapers();


                } else {

                    formMsg.textContent =
                        result.error ||
                        "Failed to record decision.";

                    formMsg.style.color =
                        "red";

                }


            } catch (error) {

                console.error(
                    "Decision submission error:",
                    error
                );


                formMsg.textContent =
                    "Server error: " +
                    error.message;

                formMsg.style.color =
                    "red";

            }

        }
    );

} else {

    console.error(
        "Decision form or button not found."
    );

}
    /* =========================================================
       INITIAL LOAD
       ========================================================= */

    loadDashboard();

    loadReviewers();

    loadPapers();

    loadAssignData();

    loadDecisions();

    loadDecisionPapers();

});