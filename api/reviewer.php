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

/*
   Temporary test reviewer

   REVIEWER_ID = 2
*/


/* =====================================================
   MY ASSIGNMENTS
   ===================================================== */

if ($action === 'my_assignments') {

    $reviewer_id = intval($_GET['reviewer_id'] ?? ($_SESSION['role_id'] ?? 2));

    if ($reviewer_id <= 0) {

        echo json_encode([
            "success" => false,
            "error" => "Valid reviewer_id is required."
        ]);

        oci_close($conn);
        exit;
    }


    $sql = "
        SELECT
            RA.ASSIGNMENT_ID,
            RA.ASSIGNMENT_DATE,
            RA.ASSIGNMENT_STATUS,
            RA.PAPER_ID,
            P.TITLE,
            P.ABSTRACT,
            P.PAGE_COUNT,
            P.PAPER_STATUS,
            P.TRACK_ID,
            R.SCORE

        FROM REVIEW_ASSIGNMENT RA

        INNER JOIN PAPER P
            ON RA.PAPER_ID = P.PAPER_ID

        LEFT JOIN REVIEW R
            ON RA.ASSIGNMENT_ID = R.ASSIGNMENT_ID

        WHERE RA.REVIEWER_ID = :reviewer_id

        ORDER BY RA.ASSIGNMENT_DATE DESC
    ";


    $stmt = oci_parse($conn, $sql);

    oci_bind_by_name(
        $stmt,
        ":reviewer_id",
        $reviewer_id
    );


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


    $assignments = [];


    while ($row = oci_fetch_assoc($stmt)) {

        $assignments[] = [

            "assignment_id" =>
                $row["ASSIGNMENT_ID"],

            "assignment_date" =>
                $row["ASSIGNMENT_DATE"],

            "assignment_status" =>
                $row["ASSIGNMENT_STATUS"],

            "paper_id" =>
                $row["PAPER_ID"],

            "title" =>
                $row["TITLE"],

            "abstract" =>
                $row["ABSTRACT"],

            "page_count" =>
                $row["PAGE_COUNT"],

            "paper_status" =>
                $row["PAPER_STATUS"],

            "track_id" =>
                $row["TRACK_ID"],

            "score" =>
                $row["SCORE"]

        ];
    }


    echo json_encode([

        "success" => true,

        "reviewer_id" =>
            $reviewer_id,

        "count" =>
            count($assignments),

        "assignments" =>
            $assignments

    ]);


    oci_free_statement($stmt);
    oci_close($conn);

    exit;
}



/* =====================================================
   SUBMIT REVIEW
   ===================================================== */

if ($action === 'submit_review') {

    $input = json_decode(
        file_get_contents("php://input"),
        true
    );


    $assignment_id =
        intval($input['assignment_id'] ?? 0);

    $score =
        intval($input['score'] ?? 0);

    $recommendation =
        trim($input['recommendation'] ?? '');

    $comments =
        trim($input['comments'] ?? '');


    /*
       Temporary test reviewer
    */

    $reviewer_id = intval($input['reviewer_id'] ?? ($_SESSION['role_id'] ?? 2));



    /* -------------------------------------------------
       Validate input
       ------------------------------------------------- */

    if (
        !$assignment_id ||
        !$score ||
        !$recommendation ||
        !$comments
    ) {

        echo json_encode([
            "success" => false,
            "error" => "All review fields must be provided."
        ]);

        oci_close($conn);
        exit;
    }


    if (
        $score < 1 ||
        $score > 10
    ) {

        echo json_encode([
            "success" => false,
            "error" => "Score must be between 1 and 10."
        ]);

        oci_close($conn);
        exit;
    }



    /* =================================================
       CHECK ASSIGNMENT
       ================================================= */

    $checkSql = "
        SELECT
            ASSIGNMENT_ID,
            ASSIGNMENT_STATUS,
            PAPER_ID

        FROM REVIEW_ASSIGNMENT

        WHERE ASSIGNMENT_ID = :assignment_id
          AND REVIEWER_ID = :reviewer_id
    ";


    $checkStmt =
        oci_parse(
            $conn,
            $checkSql
        );


    oci_bind_by_name(
        $checkStmt,
        ":assignment_id",
        $assignment_id
    );


    oci_bind_by_name(
        $checkStmt,
        ":reviewer_id",
        $reviewer_id
    );


    if (!oci_execute($checkStmt)) {

        $error =
            oci_error($checkStmt);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($checkStmt);
        oci_close($conn);

        exit;
    }


    $assignment =
        oci_fetch_assoc($checkStmt);


    if (!$assignment) {

        echo json_encode([
            "success" => false,
            "error" =>
                "This assignment does not belong to the current reviewer."
        ]);

        oci_free_statement($checkStmt);
        oci_close($conn);

        exit;
    }


    $assignmentStatus =
        strtoupper(
            trim(
                $assignment["ASSIGNMENT_STATUS"]
            )
        );


    if (
        $assignmentStatus === "COMPLETED"
    ) {

        echo json_encode([
            "success" => false,
            "error" =>
                "This assignment has already been completed."
        ]);

        oci_free_statement($checkStmt);
        oci_close($conn);

        exit;
    }



    /* =================================================
       CHECK FOR EXISTING REVIEW
       ================================================= */

    $duplicateSql = "
        SELECT REVIEW_ID

        FROM REVIEW

        WHERE ASSIGNMENT_ID = :assignment_id
    ";


    $duplicateStmt =
        oci_parse(
            $conn,
            $duplicateSql
        );


    oci_bind_by_name(
        $duplicateStmt,
        ":assignment_id",
        $assignment_id
    );


    if (
        !oci_execute(
            $duplicateStmt
        )
    ) {

        $error =
            oci_error($duplicateStmt);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($checkStmt);
        oci_free_statement($duplicateStmt);
        oci_close($conn);

        exit;
    }


    $existingReview =
        oci_fetch_assoc(
            $duplicateStmt
        );


    if ($existingReview) {

        echo json_encode([
            "success" => false,
            "error" =>
                "A review already exists for this assignment."
        ]);

        oci_free_statement($checkStmt);
        oci_free_statement($duplicateStmt);
        oci_close($conn);

        exit;
    }



    /* =================================================
       INSERT REVIEW
       ================================================= */

    $reviewSql = "
        INSERT INTO REVIEW
        (
            REVIEW_ID,
            REVIEW_DATE,
            SCORE,
            COMMENTS,
            RECOMMENDATION,
            ASSIGNMENT_ID
        )

        VALUES
        (
            SEQ_REVIEW.NEXTVAL,
            SYSDATE,
            :score,
            :comments,
            :recommendation,
            :assignment_id
        )
    ";


    $reviewStmt =
        oci_parse(
            $conn,
            $reviewSql
        );


    oci_bind_by_name(
        $reviewStmt,
        ":score",
        $score
    );


    oci_bind_by_name(
        $reviewStmt,
        ":comments",
        $comments
    );


    oci_bind_by_name(
        $reviewStmt,
        ":recommendation",
        $recommendation
    );


    oci_bind_by_name(
        $reviewStmt,
        ":assignment_id",
        $assignment_id
    );


    if (
        !oci_execute(
            $reviewStmt,
            OCI_NO_AUTO_COMMIT
        )
    ) {

        $error =
            oci_error($reviewStmt);

        oci_rollback($conn);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($checkStmt);
        oci_free_statement($duplicateStmt);
        oci_free_statement($reviewStmt);
        oci_close($conn);

        exit;
    }



    /* =================================================
       UPDATE ASSIGNMENT STATUS
       ================================================= */

    $updateSql = "
        UPDATE REVIEW_ASSIGNMENT

        SET ASSIGNMENT_STATUS = 'Completed'

        WHERE ASSIGNMENT_ID = :assignment_id
          AND REVIEWER_ID = :reviewer_id
    ";


    $updateStmt =
        oci_parse(
            $conn,
            $updateSql
        );


    oci_bind_by_name(
        $updateStmt,
        ":assignment_id",
        $assignment_id
    );


    oci_bind_by_name(
        $updateStmt,
        ":reviewer_id",
        $reviewer_id
    );


    if (
        !oci_execute(
            $updateStmt,
            OCI_NO_AUTO_COMMIT
        )
    ) {

        $error =
            oci_error($updateStmt);

        oci_rollback($conn);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($checkStmt);
        oci_free_statement($duplicateStmt);
        oci_free_statement($reviewStmt);
        oci_free_statement($updateStmt);
        oci_close($conn);

        exit;
    }



    /* =================================================
       COMMIT
       ================================================= */

    if (!oci_commit($conn)) {

        oci_rollback($conn);

        echo json_encode([
            "success" => false,
            "error" =>
                "Database commit failed."
        ]);

        oci_free_statement($checkStmt);
        oci_free_statement($duplicateStmt);
        oci_free_statement($reviewStmt);
        oci_free_statement($updateStmt);
        oci_close($conn);

        exit;
    }



    /* =================================================
       SUCCESS
       ================================================= */

    echo json_encode([

        "success" => true,

        "message" =>
            "Review submitted successfully.",

        "assignment_id" =>
            $assignment_id,

        "score" =>
            $score,

        "recommendation" =>
            $recommendation

    ]);


    oci_free_statement($checkStmt);
    oci_free_statement($duplicateStmt);
    oci_free_statement($reviewStmt);
    oci_free_statement($updateStmt);

    oci_close($conn);

    exit;
}



/* =====================================================
   INVALID ACTION
   ===================================================== */

echo json_encode([
    "success" => false,
    "error" => "Invalid action."
]);


oci_close($conn);

?>