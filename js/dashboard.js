/* ============================================================
   RPRMS — dashboard.js

   Shared by:
   - author.html
   - reviewer.html
   - editor.html

   Handles:
   - Sidebar navigation
   - Sign out
   - Author paper submission
   - Author paper loading
   - Reviewer assignment loading
   - Reviewer review submission

   Temporary IDs:
   AUTHOR_ID   = 2
   REVIEWER_ID = 2
   ============================================================ */


document.addEventListener("DOMContentLoaded", () => {


  /* ============================================================
     BASIC NAVIGATION
     ============================================================ */

  const navButtons =
    document.querySelectorAll(".sb-link[data-page]");

  const pages =
    document.querySelectorAll(".dash-page");

  const pageTitle =
    document.getElementById("pageTitle");


  function goToPage(pageId) {

    pages.forEach((page) => {

      page.classList.toggle(
        "active",
        page.id === "page-" + pageId
      );

    });


    navButtons.forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );

    });


    const activeButton =
      document.querySelector(
        `.sb-link[data-page="${pageId}"]`
      );


    if (activeButton && pageTitle) {

      pageTitle.textContent =
        activeButton.dataset.title ||
        activeButton.textContent.trim();

    }

  }


  navButtons.forEach((button) => {

    button.addEventListener("click", () => {

      goToPage(button.dataset.page);

    });

  });



  /* ============================================================
     OTHER PAGE BUTTONS
     ============================================================ */

  document.querySelectorAll("[data-goto]").forEach((element) => {

    element.addEventListener("click", () => {

      goToPage(element.dataset.goto);

    });

  });



  /* ============================================================
     SIGN OUT
     ============================================================ */

  const signOutButton =
    document.querySelector(".sb-signout");


  if (signOutButton) {

    signOutButton.addEventListener("click", () => {

      window.location.href = "index.html";

    });

  }



  /* ============================================================
     HTML ESCAPE
     ============================================================ */

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }



  /* ============================================================
     STATUS BADGE
     ============================================================ */

  function getStatusBadge(status) {

    const cleanStatus =
      String(status || "").trim();

    const lowerStatus =
      cleanStatus.toLowerCase();


    let badgeClass =
      "badge-review";


    if (lowerStatus === "accepted") {

      badgeClass =
        "badge-accepted";

    }
    else if (lowerStatus === "rejected") {

      badgeClass =
        "badge-rejected";

    }
    else if (lowerStatus.includes("revision")) {

      badgeClass =
        "badge-revision";

    }
    else if (lowerStatus.includes("pending")) {

      badgeClass =
        "badge-pending";

    }
    else if (lowerStatus.includes("completed")) {

      badgeClass =
        "badge-completed";

    }


    return `
      <span class="badge ${badgeClass}">
        ${escapeHtml(cleanStatus)}
      </span>
    `;

  }



  /* ============================================================
     TEMPORARY USER IDs
     ============================================================ */

  const AUTHOR_ID = 2;

  const REVIEWER_ID = 2;



  /* ============================================================
     TRACK NAMES
     ============================================================ */

  const trackNames = {

    1: "Artificial Intelligence",
    2: "Machine Learning",
    3: "Data Science",
    4: "Cyber Security",
    5: "Cloud Computing"

  };



  /* ============================================================
     ROLE DETECTION
     ============================================================ */

  const userRole =
    document.body.dataset.role;



  /* ============================================================
     AUTHOR SECTION
     ============================================================ */

  async function loadAuthorPapers() {

    const myPapersBody =
      document.getElementById(
        "myPapersBody"
      );


    const recentBody =
      document.getElementById(
        "recentSubmissionsBody"
      );


    try {

      const response =
        await fetch(
          `api/author.php?action=my_papers&author_id=${AUTHOR_ID}`
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result.success
      ) {

        throw new Error(
          result.error ||
          "Unable to load papers."
        );

      }


      const papers =
        result.papers || [];



      /* --------------------------------------------------------
         AUTHOR STATISTICS
         -------------------------------------------------------- */

      const total =
        papers.length;


      const underReview =
        papers.filter((paper) => {

          return String(
            paper.paper_status
          )
            .toLowerCase()
            .includes("review");

        }).length;


      const accepted =
        papers.filter((paper) => {

          return String(
            paper.paper_status
          )
            .toLowerCase() === "accepted";

        }).length;


      const rejected =
        papers.filter((paper) => {

          return String(
            paper.paper_status
          )
            .toLowerCase() === "rejected";

        }).length;



      const totalElement =
        document.getElementById(
          "totalPapers"
        );


      const reviewElement =
        document.getElementById(
          "underReviewPapers"
        );


      const acceptedElement =
        document.getElementById(
          "acceptedPapers"
        );


      const rejectedElement =
        document.getElementById(
          "rejectedPapers"
        );


      if (totalElement) {

        totalElement.textContent =
          total;

      }


      if (reviewElement) {

        reviewElement.textContent =
          underReview;

      }


      if (acceptedElement) {

        acceptedElement.textContent =
          accepted;

      }


      if (rejectedElement) {

        rejectedElement.textContent =
          rejected;

      }



      /* --------------------------------------------------------
         MY PAPERS TABLE
         -------------------------------------------------------- */

      if (myPapersBody) {

        if (papers.length === 0) {

          myPapersBody.innerHTML = `
            <tr>
              <td colspan="5">
                No papers submitted yet.
              </td>
            </tr>
          `;

        }
        else {

          myPapersBody.innerHTML =
            papers.map((paper) => {

              const track =
                trackNames[paper.track_id] ||
                "Unknown Track";


              return `
                <tr>

                  <td class="mono">
                    P-${escapeHtml(
                      paper.paper_id
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      paper.title
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      track
                    )}
                  </td>

                  <td>
                    ${getStatusBadge(
                      paper.paper_status
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      paper.submission_date
                    )}
                  </td>

                </tr>
              `;

            }).join("");

        }

      }



      /* --------------------------------------------------------
         RECENT SUBMISSIONS
         -------------------------------------------------------- */

      if (recentBody) {

        const recentPapers =
          papers.slice(0, 3);


        if (recentPapers.length === 0) {

          recentBody.innerHTML = `
            <tr>
              <td colspan="5">
                No recent submissions.
              </td>
            </tr>
          `;

        }
        else {

          recentBody.innerHTML =
            recentPapers.map((paper) => {

              const track =
                trackNames[paper.track_id] ||
                "Unknown Track";


              return `
                <tr>

                  <td class="mono">
                    P-${escapeHtml(
                      paper.paper_id
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      paper.title
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      track
                    )}
                  </td>

                  <td>
                    ${getStatusBadge(
                      paper.paper_status
                    )}
                  </td>

                  <td>
                    ${escapeHtml(
                      paper.submission_date
                    )}
                  </td>

                </tr>
              `;

            }).join("");

        }

      }


    }
    catch (error) {

      console.error(
        "Author paper loading error:",
        error
      );


      if (myPapersBody) {

        myPapersBody.innerHTML = `
          <tr>
            <td colspan="5">
              Failed to load papers from database.
            </td>
          </tr>
        `;

      }


      if (recentBody) {

        recentBody.innerHTML = `
          <tr>
            <td colspan="5">
              Failed to load recent submissions.
            </td>
          </tr>
        `;

      }

    }

  }



  /* ============================================================
     AUTHOR PAPER SUBMISSION
     ============================================================ */

  const submitPaperForm =
    document.getElementById(
      "submitPaperForm"
    );


  if (submitPaperForm) {

    submitPaperForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const message =
          submitPaperForm.querySelector(
            ".form-msg"
          );


        if (message) {

          message.textContent = "";

          message.classList.remove(
            "success"
          );

        }


        try {

          /*
             FormData is required because
             the form contains PDF/DOCX.
          */

          const formData =
            new FormData(
              submitPaperForm
            );


          const response =
            await fetch(
              "api/author.php?action=submit_paper",
              {
                method: "POST",
                body: formData
              }
            );


          const result =
            await response.json();


          if (
            !response.ok ||
            !result.success
          ) {

            if (message) {

              message.textContent =
                result.error ||
                "Something went wrong.";

            }

            return;

          }


          if (message) {

            message.textContent =
              result.message ||
              "Paper submitted successfully.";

            message.classList.add(
              "success"
            );

          }


          submitPaperForm.reset();


          /*
             Reload Oracle data
          */

          await loadAuthorPapers();

        }
        catch (error) {

          console.error(
            "Paper submission error:",
            error
          );


          if (message) {

            message.textContent =
              "Backend connection failed.";

          }

        }

      }
    );

  }



  /* ============================================================
     REVIEWER — LOAD ASSIGNMENTS
     ============================================================ */

  let reviewerAssignments = [];


  async function loadReviewerAssignments() {

    const pendingBody =
      document.getElementById(
        "pendingAssignmentsBody"
      );


    const allBody =
      document.getElementById(
        "allAssignmentsBody"
      );


    try {

      const response =
        await fetch(
          `api/reviewer.php?action=my_assignments&reviewer_id=${REVIEWER_ID}`
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result.success
      ) {

        throw new Error(
          result.error ||
          "Unable to load assignments."
        );

      }


      reviewerAssignments =
        result.assignments || [];



      /* --------------------------------------------------------
         SEPARATE PENDING ASSIGNMENTS
         -------------------------------------------------------- */

      const pendingAssignments =
        reviewerAssignments.filter(
          (assignment) => {

            return String(
              assignment.assignment_status
            )
              .toLowerCase() === "pending";

          }
        );


      const completedAssignments =
        reviewerAssignments.filter(
          (assignment) => {

            return String(
              assignment.assignment_status
            )
              .toLowerCase() === "completed";

          }
        );



      /* --------------------------------------------------------
         STATISTICS
         -------------------------------------------------------- */

      const totalElement =
        document.getElementById(
          "totalAssignments"
        );


      const pendingElement =
        document.getElementById(
          "pendingAssignments"
        );


      const completedElement =
        document.getElementById(
          "completedAssignments"
        );


      if (totalElement) {

        totalElement.textContent =
          reviewerAssignments.length;

      }


      if (pendingElement) {

        pendingElement.textContent =
          pendingAssignments.length;

      }


      if (completedElement) {

        completedElement.textContent =
          completedAssignments.length;

      }



      /* ========================================================
         PENDING ASSIGNMENTS TABLE
         ======================================================== */

      if (pendingBody) {

        if (pendingAssignments.length === 0) {

          pendingBody.innerHTML = `
            <tr>
              <td colspan="5">
                No pending assignments.
              </td>
            </tr>
          `;

        }
        else {

          pendingBody.innerHTML =
            pendingAssignments.map(
              (assignment) => {

                return `
                  <tr>

                    <td class="mono">
                      A-${escapeHtml(
                        assignment.assignment_id
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        assignment.title
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        assignment.assignment_date
                      )}
                    </td>

                    <td>
                      ${getStatusBadge(
                        assignment.assignment_status
                      )}
                    </td>

                    <td>
                      <button
                        class="btn-ghost reviewer-review-btn"
                        data-assignment-id="${escapeHtml(
                          assignment.assignment_id
                        )}">

                        Review

                      </button>
                    </td>

                  </tr>
                `;

              }
            ).join("");



          /*
             Review buttons
          */

          pendingBody
            .querySelectorAll(
              ".reviewer-review-btn"
            )
            .forEach((button) => {

              button.addEventListener(
                "click",
                () => {

                  const assignmentId =
                    button.dataset.assignmentId;


                  selectAssignmentForReview(
                    assignmentId
                  );

                }
              );

            });

        }

      }



      /* ========================================================
         ALL ASSIGNMENTS TABLE
         ======================================================== */

      if (allBody) {

        if (reviewerAssignments.length === 0) {

          allBody.innerHTML = `
            <tr>
              <td colspan="5">
                No assignments found.
              </td>
            </tr>
          `;

        }
        else {

          allBody.innerHTML =
            reviewerAssignments.map(
              (assignment) => {

                const status =
                  String(
                    assignment.assignment_status
                  )
                    .toLowerCase();


                let actionCell = "";


                if (status === "pending") {

                  actionCell = `
                    <button
                      class="btn-ghost reviewer-review-btn"
                      data-assignment-id="${escapeHtml(
                        assignment.assignment_id
                      )}">

                      Review

                    </button>
                  `;

                }
                else {

                  actionCell = `
                    <span class="mono">
                      Score:
                      ${escapeHtml(
                        assignment.score ?? "-"
                      )}
                    </span>
                  `;

                }


                return `
                  <tr>

                    <td class="mono">
                      A-${escapeHtml(
                        assignment.assignment_id
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        assignment.title
                      )}
                    </td>

                    <td>
                      ${escapeHtml(
                        assignment.assignment_date
                      )}
                    </td>

                    <td>
                      ${getStatusBadge(
                        assignment.assignment_status
                      )}
                    </td>

                    <td>
                      ${actionCell}
                    </td>

                  </tr>
                `;

              }
            ).join("");



          /*
             Review buttons
          */

          allBody
            .querySelectorAll(
              ".reviewer-review-btn"
            )
            .forEach((button) => {

              button.addEventListener(
                "click",
                () => {

                  const assignmentId =
                    button.dataset.assignmentId;


                  selectAssignmentForReview(
                    assignmentId
                  );

                }
              );

            });

        }

      }



      /* ========================================================
         REVIEW ASSIGNMENT DROPDOWN
         ======================================================== */

      const assignmentSelect =
        document.getElementById(
          "rAssignment"
        );


      if (assignmentSelect) {

        assignmentSelect.innerHTML = `
          <option value="">
            Select a pending assignment
          </option>
        `;


        pendingAssignments.forEach(
          (assignment) => {

            const option =
              document.createElement(
                "option"
              );


            option.value =
              assignment.assignment_id;


            option.textContent =
              `A-${assignment.assignment_id} — ${assignment.title}`;


            assignmentSelect.appendChild(
              option
            );

          }
        );

      }


    }
    catch (error) {

      console.error(
        "Reviewer assignment loading error:",
        error
      );


      if (pendingBody) {

        pendingBody.innerHTML = `
          <tr>
            <td colspan="5">
              Failed to load assignments from database.
            </td>
          </tr>
        `;

      }


      if (allBody) {

        allBody.innerHTML = `
          <tr>
            <td colspan="5">
              Failed to load assignments from database.
            </td>
          </tr>
        `;

      }

    }

  }



  /* ============================================================
     SELECT ASSIGNMENT FOR REVIEW
     ============================================================ */

  function selectAssignmentForReview(
    assignmentId
  ) {

    const assignmentSelect =
      document.getElementById(
        "rAssignment"
      );


    if (!assignmentSelect) {

      return;

    }


    assignmentSelect.value =
      String(assignmentId);


    goToPage("review");


    /*
       Put cursor in score field
    */

    const scoreInput =
      document.getElementById(
        "rScore"
      );


    if (scoreInput) {

      setTimeout(() => {

        scoreInput.focus();

      }, 100);

    }

  }



  /* ============================================================
     REVIEW SUBMISSION
     ============================================================ */

  const reviewForm =
    document.getElementById(
      "reviewForm"
    );


  if (reviewForm) {

    reviewForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();


        const message =
          reviewForm.querySelector(
            ".form-msg"
          );


        if (message) {

          message.textContent = "";

          message.classList.remove(
            "success"
          );

        }


        /*
           Convert form fields to object
        */

        const formData =
          new FormData(
            reviewForm
          );


        const data =
          Object.fromEntries(
            formData.entries()
          );


        /*
           Convert assignment_id and score
           to numbers
        */

        data.assignment_id =
          Number(
            data.assignment_id
          );


        data.score =
          Number(
            data.score
          );


        try {

          const response =
            await fetch(
              "api/reviewer.php?action=submit_review",
              {

                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify(data)

              }
            );


          const result =
            await response.json();


          if (
            !response.ok ||
            !result.success
          ) {

            if (message) {

              message.textContent =
                result.error ||
                "Unable to submit review.";

            }

            return;

          }


          if (message) {

            message.textContent =
              result.message ||
              "Review submitted successfully.";

            message.classList.add(
              "success"
            );

          }


          /*
             Clear form
          */

          reviewForm.reset();


          /*
             Reload assignments
             from Oracle
          */

          await loadReviewerAssignments();


        }
        catch (error) {

          console.error(
            "Review submission error:",
            error
          );


          if (message) {

            message.textContent =
              "Backend connection failed.";

          }

        }

      }
    );

  }



  /* ============================================================
     INITIALIZE AUTHOR
     ============================================================ */

  if (
    userRole === "author"
  ) {

    loadAuthorPapers();

  }



  /* ============================================================
     INITIALIZE REVIEWER
     ============================================================ */

  if (
    userRole === "reviewer"
  ) {

    loadReviewerAssignments();

  }


});