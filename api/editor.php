<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

require_once 'db.php';

$conn = get_db_connection();

$action = $_GET['action'] ?? '';



/* =====================================================
   DASHBOARD
   ===================================================== */

if ($action === 'dashboard') {

    /* Total Papers */

    $sqlTotalPapers = "
        SELECT COUNT(*) AS TOTAL
        FROM PAPER
    ";

    $stmtTotalPapers = oci_parse($conn, $sqlTotalPapers);
    oci_execute($stmtTotalPapers);

    $rowTotalPapers = oci_fetch_assoc($stmtTotalPapers);

    $totalPapers = intval($rowTotalPapers['TOTAL']);


    /* Pending Decisions */

    $sqlPending = "
        SELECT COUNT(*) AS TOTAL
        FROM PAPER P
        WHERE NOT EXISTS (
            SELECT 1
            FROM DECISION D
            WHERE D.PAPER_ID = P.PAPER_ID
        )
    ";

    $stmtPending = oci_parse($conn, $sqlPending);
    oci_execute($stmtPending);

    $rowPending = oci_fetch_assoc($stmtPending);

    $pendingDecisions = intval($rowPending['TOTAL']);


    /* Active Reviewers */

    $sqlActiveReviewers = "
        SELECT COUNT(DISTINCT REVIEWER_ID) AS TOTAL
        FROM REVIEW_ASSIGNMENT
        WHERE UPPER(ASSIGNMENT_STATUS) = 'PENDING'
    ";

    $stmtActiveReviewers = oci_parse($conn, $sqlActiveReviewers);
    oci_execute($stmtActiveReviewers);

    $rowActiveReviewers = oci_fetch_assoc($stmtActiveReviewers);

    $activeReviewers = intval($rowActiveReviewers['TOTAL']);


    /* Total Tracks */

    $sqlTracks = "
        SELECT COUNT(*) AS TOTAL
        FROM TRACK
    ";

    $stmtTracks = oci_parse($conn, $sqlTracks);
    oci_execute($stmtTracks);

    $rowTracks = oci_fetch_assoc($stmtTracks);

    $totalTracks = intval($rowTracks['TOTAL']);


    echo json_encode([

        "success" => true,

        "total_papers" => $totalPapers,

        "pending_decisions" => $pendingDecisions,

        "active_reviewers" => $activeReviewers,

        "tracks" => $totalTracks

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
   ASSIGN REVIEWER DATA
   ===================================================== */

if ($action === 'assign_data') {

    /* ---------- Papers ---------- */

    $paperSql = "
        SELECT
            P.PAPER_ID,
            P.TITLE
        FROM PAPER P
        ORDER BY P.PAPER_ID DESC
    ";

    $paperStmt = oci_parse($conn, $paperSql);

    if (!oci_execute($paperStmt)) {

        $error = oci_error($paperStmt);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_close($conn);
        exit;
    }

    $papers = [];

    while ($row = oci_fetch_assoc($paperStmt)) {

        $papers[] = [
            "paper_id" => $row["PAPER_ID"],
            "title" => $row["TITLE"]
        ];
    }


    /* ---------- Reviewers ---------- */

    $reviewerSql = "
        SELECT
            REVIEWER_ID,
            REVIEWER_NAME,
            EXPERTISE
        FROM REVIEWER
        ORDER BY REVIEWER_ID
    ";

    $reviewerStmt = oci_parse($conn, $reviewerSql);

    if (!oci_execute($reviewerStmt)) {

        $error = oci_error($reviewerStmt);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_close($conn);
        exit;
    }

    $reviewers = [];

    while ($row = oci_fetch_assoc($reviewerStmt)) {

        $reviewers[] = [
            "reviewer_id" => $row["REVIEWER_ID"],
            "name" => $row["REVIEWER_NAME"],
            "expertise" => $row["EXPERTISE"]
        ];
    }


    echo json_encode([
        "success" => true,
        "papers" => $papers,
        "reviewers" => $reviewers
    ]);

    oci_free_statement($paperStmt);
    oci_free_statement($reviewerStmt);
    oci_close($conn);

    exit;
}



/* =====================================================
   ASSIGN REVIEWER
   ===================================================== */

if ($action === "assign_reviewer") {

    $input = json_decode(
        file_get_contents("php://input"),
        true
    );

    $paper_id = isset($input["paper_id"])
        ? (int)$input["paper_id"]
        : 0;

    $reviewer_id = isset($input["reviewer_id"])
        ? (int)$input["reviewer_id"]
        : 0;

    $assignment_date = isset($input["assignment_date"])
        ? trim($input["assignment_date"])
        : "";

    if (
        $paper_id <= 0 ||
        $reviewer_id <= 0 ||
        $assignment_date === ""
    ) {

        echo json_encode([
            "success" => false,
            "error" =>
                "Paper, reviewer and assignment date are required."
        ]);

        exit;
    }

    try {

        /* Check duplicate assignment */

        $checkSql = "
            SELECT COUNT(*) AS CNT
            FROM REVIEW_ASSIGNMENT
            WHERE PAPER_ID = :paper_id
              AND REVIEWER_ID = :reviewer_id
        ";

        $checkStmt = oci_parse(
            $conn,
            $checkSql
        );

        oci_bind_by_name(
            $checkStmt,
            ":paper_id",
            $paper_id
        );

        oci_bind_by_name(
            $checkStmt,
            ":reviewer_id",
            $reviewer_id
        );

        oci_execute($checkStmt);

        $checkRow =
            oci_fetch_assoc($checkStmt);

        if ((int)$checkRow["CNT"] > 0) {

            echo json_encode([
                "success" => false,
                "error" =>
                    "This reviewer is already assigned to this paper."
            ]);

            exit;
        }


        /* Insert assignment */

        $sql = "
            INSERT INTO REVIEW_ASSIGNMENT
            (
                ASSIGNMENT_ID,
                ASSIGNMENT_DATE,
                ASSIGNMENT_STATUS,
                PAPER_ID,
                REVIEWER_ID
            )
            VALUES
            (
                SEQ_ASSIGNMENT.NEXTVAL,
                TO_DATE(:assignment_date, 'YYYY-MM-DD'),
                'Pending',
                :paper_id,
                :reviewer_id
            )
        ";

        $stmt = oci_parse(
            $conn,
            $sql
        );

        oci_bind_by_name(
            $stmt,
            ":assignment_date",
            $assignment_date
        );

        oci_bind_by_name(
            $stmt,
            ":paper_id",
            $paper_id
        );

        oci_bind_by_name(
            $stmt,
            ":reviewer_id",
            $reviewer_id
        );


        if (!oci_execute(
            $stmt,
            OCI_COMMIT_ON_SUCCESS
        )) {

            $error = oci_error($stmt);

            echo json_encode([
                "success" => false,
                "error" => $error["message"]
            ]);

            exit;
        }


        echo json_encode([
            "success" => true,
            "message" =>
                "Reviewer assigned successfully."
        ]);

        exit;

    } catch (Exception $e) {

        echo json_encode([
            "success" => false,
            "error" => $e->getMessage()
        ]);

        exit;
    }
}



/* =====================================================
   DECISIONS
   ===================================================== */

if ($action === 'decisions') {

    $sql = "
        SELECT
            D.DECISION_ID,
            D.DECISION_DATE,
            D.FINAL_STATUS,
            D.REMARKS,
            D.PAPER_ID,
            D.EDITOR_ID,
            P.TITLE

        FROM DECISION D

        LEFT JOIN PAPER P
            ON D.PAPER_ID = P.PAPER_ID

        ORDER BY D.DECISION_ID DESC
    ";

    $stmt = oci_parse(
        $conn,
        $sql
    );

    if (!oci_execute($stmt)) {

        $error = oci_error($stmt);

        echo json_encode([
            "success" => false,
            "error" => $error["message"]
        ]);

        oci_free_statement($stmt);
        oci_close($conn);

        exit;
    }

    $decisions = [];

    while ($row = oci_fetch_assoc($stmt)) {

        $decisions[] = [

            "decision_id" =>
                $row["DECISION_ID"],

            "decision_date" =>
                $row["DECISION_DATE"],

            "final_status" =>
                $row["FINAL_STATUS"],

            "remarks" =>
                $row["REMARKS"],

            "paper_id" =>
                $row["PAPER_ID"],

            "editor_id" =>
                $row["EDITOR_ID"],

            "title" =>
                $row["TITLE"]
        ];
    }

    echo json_encode([

        "success" => true,

        "count" =>
            count($decisions),

        "decisions" =>
            $decisions

    ]);

    oci_free_statement($stmt);
    oci_close($conn);

    exit;
}



/* =====================================================
   RECORD DECISION
   ===================================================== */

if ($action === 'record_decision') {

    $input = json_decode(
        file_get_contents("php://input"),
        true
    );

    $paper_id = isset($input["paper_id"])
        ? (int)$input["paper_id"]
        : 0;

    $final_status = isset($input["final_status"])
        ? trim($input["final_status"])
        : "";

    $remarks = isset($input["remarks"])
        ? trim($input["remarks"])
        : "";

    $decision_date = isset($input["decision_date"])
        ? trim($input["decision_date"])
        : "";

    $editor_id = intval($input["editor_id"] ?? ($_SESSION["role_id"] ?? 1));
    if ($editor_id <= 0) {
        $editor_id = 1;
    }


    /* Validation */

    $allowedStatuses = [
        "Accepted",
        "Rejected",
        "Minor Revision",
        "Major Revision"
    ];

    if (
        $paper_id <= 0 ||
        $final_status === "" ||
        $decision_date === ""
    ) {

        echo json_encode([
            "success" => false,
            "error" =>
                "Paper, final status and decision date are required."
        ]);

        exit;
    }


    if (!in_array(
        $final_status,
        $allowedStatuses
    )) {

        echo json_encode([
            "success" => false,
            "error" =>
                "Invalid final status."
        ]);

        exit;
    }


    if (strlen($remarks) > 300) {

        echo json_encode([
            "success" => false,
            "error" =>
                "Remarks cannot exceed 300 characters."
        ]);

        exit;
    }


    try {

        /* Check whether paper exists */

        $paperCheckSql = "
            SELECT COUNT(*) AS CNT
            FROM PAPER
            WHERE PAPER_ID = :paper_id
        ";

        $paperCheckStmt = oci_parse(
            $conn,
            $paperCheckSql
        );

        oci_bind_by_name(
            $paperCheckStmt,
            ":paper_id",
            $paper_id
        );

        oci_execute($paperCheckStmt);

        $paperCheckRow =
            oci_fetch_assoc($paperCheckStmt);

        if ((int)$paperCheckRow["CNT"] === 0) {

            echo json_encode([
                "success" => false,
                "error" =>
                    "Selected paper does not exist."
            ]);

            exit;
        }


        /* Check duplicate decision */

        $duplicateSql = "
            SELECT COUNT(*) AS CNT
            FROM DECISION
            WHERE PAPER_ID = :paper_id
        ";

        $duplicateStmt = oci_parse(
            $conn,
            $duplicateSql
        );

        oci_bind_by_name(
            $duplicateStmt,
            ":paper_id",
            $paper_id
        );

        oci_execute($duplicateStmt);

        $duplicateRow =
            oci_fetch_assoc($duplicateStmt);

        if ((int)$duplicateRow["CNT"] > 0) {

            echo json_encode([
                "success" => false,
                "error" =>
                    "This paper already has a final decision."
            ]);

            exit;
        }


        /* Insert Decision */

        $insertSql = "
            INSERT INTO DECISION
            (
                DECISION_ID,
                DECISION_DATE,
                FINAL_STATUS,
                REMARKS,
                PAPER_ID,
                EDITOR_ID
            )
            VALUES
            (
                SEQ_DECISION.NEXTVAL,
                TO_DATE(:decision_date, 'YYYY-MM-DD'),
                :final_status,
                :remarks,
                :paper_id,
                :editor_id
            )
        ";

        $insertStmt = oci_parse(
            $conn,
            $insertSql
        );

        oci_bind_by_name(
            $insertStmt,
            ":decision_date",
            $decision_date
        );

        oci_bind_by_name(
            $insertStmt,
            ":final_status",
            $final_status
        );

        oci_bind_by_name(
            $insertStmt,
            ":remarks",
            $remarks
        );

        oci_bind_by_name(
            $insertStmt,
            ":paper_id",
            $paper_id
        );

        oci_bind_by_name(
            $insertStmt,
            ":editor_id",
            $editor_id
        );


        if (!oci_execute(
            $insertStmt,
            OCI_NO_AUTO_COMMIT
        )) {

            $error = oci_error($insertStmt);

            oci_rollback($conn);

            echo json_encode([
                "success" => false,
                "error" => $error["message"]
            ]);

            exit;
        }


        /* Update Paper Status */

        $updateSql = "
            UPDATE PAPER
            SET PAPER_STATUS = :final_status
            WHERE PAPER_ID = :paper_id
        ";

        $updateStmt = oci_parse(
            $conn,
            $updateSql
        );

        oci_bind_by_name(
            $updateStmt,
            ":final_status",
            $final_status
        );

        oci_bind_by_name(
            $updateStmt,
            ":paper_id",
            $paper_id
        );


        if (!oci_execute(
            $updateStmt,
            OCI_NO_AUTO_COMMIT
        )) {

            $error = oci_error($updateStmt);

            oci_rollback($conn);

            echo json_encode([
                "success" => false,
                "error" => $error["message"]
            ]);

            exit;
        }


        /* Commit both operations */

        oci_commit($conn);


        echo json_encode([
            "success" => true,
            "message" =>
                "Decision recorded successfully."
        ]);

        exit;

    } catch (Exception $e) {

        oci_rollback($conn);

        echo json_encode([
            "success" => false,
            "error" => $e->getMessage()
        ]);

        exit;
    }
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