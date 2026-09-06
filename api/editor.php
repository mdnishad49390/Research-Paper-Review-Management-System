<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

require_once 'db.php';

$conn = get_db_connection();

$action = $_GET['action'] ?? '';



/* =====================================================
   DASHBOARD
   ===================================================== */

if ($action === 'dashboard') {

    /*
       Total Papers
    */

    $sqlTotalPapers = "
        SELECT COUNT(*) AS TOTAL
        FROM PAPER
    ";

    $stmtTotalPapers =
        oci_parse($conn, $sqlTotalPapers);

    oci_execute($stmtTotalPapers);

    $rowTotalPapers =
        oci_fetch_assoc($stmtTotalPapers);

    $totalPapers =
        intval($rowTotalPapers['TOTAL']);



    /*
       Pending Decisions

       Papers which do not have a final
       decision yet.
    */

    $sqlPending = "
        SELECT COUNT(*) AS TOTAL
        FROM PAPER P
        WHERE NOT EXISTS (
            SELECT 1
            FROM DECISION D
            WHERE D.PAPER_ID = P.PAPER_ID
        )
    ";

    $stmtPending =
        oci_parse($conn, $sqlPending);

    oci_execute($stmtPending);

    $rowPending =
        oci_fetch_assoc($stmtPending);

    $pendingDecisions =
        intval($rowPending['TOTAL']);



    /*
       Active Reviewers

       Reviewers having at least one
       active/pending assignment.
    */

    $sqlActiveReviewers = "
        SELECT COUNT(DISTINCT REVIEWER_ID) AS TOTAL
        FROM REVIEW_ASSIGNMENT
        WHERE UPPER(ASSIGNMENT_STATUS) = 'PENDING'
    ";

    $stmtActiveReviewers =
        oci_parse($conn, $sqlActiveReviewers);

    oci_execute($stmtActiveReviewers);

    $rowActiveReviewers =
        oci_fetch_assoc($stmtActiveReviewers);

    $activeReviewers =
        intval($rowActiveReviewers['TOTAL']);



    /*
       Total Tracks
    */

    $sqlTracks = "
        SELECT COUNT(*) AS TOTAL
        FROM TRACK
    ";

    $stmtTracks =
        oci_parse($conn, $sqlTracks);

    oci_execute($stmtTracks);

    $rowTracks =
        oci_fetch_assoc($stmtTracks);

    $totalTracks =
        intval($rowTracks['TOTAL']);



    /*
       Return JSON
    */

    echo json_encode([

        "success" => true,

        "total_papers" =>
            $totalPapers,

        "pending_decisions" =>
            $pendingDecisions,

        "active_reviewers" =>
            $activeReviewers,

        "tracks" =>
            $totalTracks

    ]);


    oci_free_statement($stmtTotalPapers);
    oci_free_statement($stmtPending);
    oci_free_statement($stmtActiveReviewers);
    oci_free_statement($stmtTracks);

    oci_close($conn);

    exit;
}

/* =====================================================
   REVIEWER DIRECTORY
   ===================================================== */

if ($action === 'reviewers') {

    $sql = "
        SELECT
            R.REVIEWER_ID AS RID,
            R.REVIEWER_NAME AS RNAME,
            R.REVIEWER_EMAIL AS REMAIL,
            R.EXPERTISE AS REXPERTISE,

            (
                SELECT COUNT(*)
                FROM REVIEW_ASSIGNMENT RA
                WHERE RA.REVIEWER_ID = R.REVIEWER_ID
                  AND UPPER(RA.ASSIGNMENT_STATUS) = 'PENDING'
            ) AS ACTIVE_COUNT

        FROM REVIEWER R

        ORDER BY R.REVIEWER_ID
    ";

    $stmt = oci_parse($conn, $sql);

    if (!oci_execute($stmt)) {

        $error = oci_error($stmt);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($stmt);
        oci_close($conn);
        exit;
    }

    $reviewers = [];

    while ($row = oci_fetch_assoc($stmt)) {

        $reviewers[] = [
            "reviewer_id" => $row["RID"],
            "name" => $row["RNAME"],
            "email" => $row["REMAIL"],
            "expertise" => $row["REXPERTISE"],
            "active_assignments" => $row["ACTIVE_COUNT"]
        ];
    }

    echo json_encode([
        "success" => true,
        "count" => count($reviewers),
        "reviewers" => $reviewers
    ]);

    oci_free_statement($stmt);
    oci_close($conn);

    exit;
}
/* =====================================================
   PAPERS
   ===================================================== */

if ($action === 'papers') {

    $sql = "
        SELECT
            P.PAPER_ID,
            P.TITLE,
            T.TRACK_NAME,
            P.PAPER_STATUS,

            (
                SELECT COUNT(*)
                FROM REVIEW_ASSIGNMENT RA
                WHERE RA.PAPER_ID = P.PAPER_ID
            ) AS REVIEW_COUNT

        FROM PAPER P
        LEFT JOIN TRACK T
            ON P.TRACK_ID = T.TRACK_ID

        ORDER BY P.PAPER_ID DESC
    ";

    $stmt = oci_parse($conn, $sql);

    if (!oci_execute($stmt)) {

        $error = oci_error($stmt);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($stmt);
        oci_close($conn);
        exit;
    }

    $papers = [];

    while ($row = oci_fetch_assoc($stmt)) {

        $papers[] = [
            "paper_id" => $row["PAPER_ID"],
            "title" => $row["TITLE"],
            "track" => $row["TRACK_NAME"],
            "status" => $row["PAPER_STATUS"],
            "review_count" => $row["REVIEW_COUNT"]
        ];
    }

    echo json_encode([
        "success" => true,
        "count" => count($papers),
        "papers" => $papers
    ]);

    oci_free_statement($stmt);
    oci_close($conn);
    exit;
}

/* =====================================================
   INVALID ACTION
   ===================================================== */

echo json_encode([

    "success" => false,

    "error" =>
        "Invalid action."

]);


oci_close($conn);

?>