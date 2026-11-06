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
   SUBMIT PAPER
   ===================================================== */

if ($action === 'submit_paper') {

    $input = json_decode(file_get_contents("php://input"), true) ?: [];

    $title = trim($input['title'] ?? ($_POST['title'] ?? ''));
    $abstract = trim($input['abstract'] ?? ($_POST['abstract'] ?? ''));
    $track_id = intval($input['track_id'] ?? ($_POST['track_id'] ?? 0));
    $page_count = intval($input['page_count'] ?? ($_POST['page_count'] ?? 0));

    if (!$title || !$abstract || !$track_id || !$page_count) {

        echo json_encode([
            "success" => false,
            "error" => "All required paper fields must be provided."
        ]);

        oci_close($conn);
        exit;
    }

    if ($page_count <= 0) {

        echo json_encode([
            "success" => false,
            "error" => "Page count must be greater than 0."
        ]);

        oci_close($conn);
        exit;
    }


    /* -----------------------------------------------
       Insert paper
       ----------------------------------------------- */

    $sql = "
        INSERT INTO PAPER
        (
            PAPER_ID,
            TITLE,
            ABSTRACT,
            SUBMISSION_DATE,
            PAGE_COUNT,
            PAPER_STATUS,
            TRACK_ID
        )
        VALUES
        (
            SEQ_PAPER.NEXTVAL,
            :title,
            :abstract,
            SYSDATE,
            :page_count,
            'Submitted',
            :track_id
        )
        RETURNING PAPER_ID INTO :paper_id
    ";

    $stmt = oci_parse($conn, $sql);

    oci_bind_by_name($stmt, ":title", $title);
    oci_bind_by_name($stmt, ":abstract", $abstract);
    oci_bind_by_name($stmt, ":page_count", $page_count);
    oci_bind_by_name($stmt, ":track_id", $track_id);

    $paper_id = null;

    oci_bind_by_name($stmt, ":paper_id", $paper_id, 20);


    if (!oci_execute($stmt, OCI_NO_AUTO_COMMIT)) {

        $error = oci_error($stmt);

        oci_rollback($conn);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($stmt);
        oci_close($conn);
        exit;
    }


    /* -----------------------------------------------
       Link paper with primary author
       ----------------------------------------------- */

    $author_id = intval($input['author_id'] ?? ($_POST['author_id'] ?? ($_SESSION['role_id'] ?? 2)));
    if ($author_id <= 0) {
        $author_id = 2;
    }

    $linkSql = "
        INSERT INTO AUTHOR_PAPER
        (
            AUTHOR_ID,
            PAPER_ID
        )
        VALUES
        (
            :author_id,
            :paper_id
        )
    ";

    $linkStmt = oci_parse($conn, $linkSql);

    oci_bind_by_name($linkStmt, ":author_id", $author_id);
    oci_bind_by_name($linkStmt, ":paper_id", $paper_id);


    if (!oci_execute($linkStmt, OCI_NO_AUTO_COMMIT)) {

        $error = oci_error($linkStmt);

        oci_rollback($conn);

        echo json_encode([
            "success" => false,
            "error" => $error['message']
        ]);

        oci_free_statement($stmt);
        oci_free_statement($linkStmt);
        oci_close($conn);
        exit;
    }


    /* -----------------------------------------------
       Commit
       ----------------------------------------------- */

    oci_commit($conn);

    // Save uploaded document to uploads directory if provided
    if (isset($_FILES['paper_document']) && $_FILES['paper_document']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }
        $fileExt = strtolower(pathinfo($_FILES['paper_document']['name'], PATHINFO_EXTENSION));
        $allowedExts = ['pdf', 'docx', 'doc'];
        if (in_array($fileExt, $allowedExts)) {
            $destFileName = 'paper_' . $paper_id . '_' . time() . '.' . $fileExt;
            @move_uploaded_file($_FILES['paper_document']['tmp_name'], $uploadDir . $destFileName);
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Paper submitted successfully.",
        "paper_id" => $paper_id
    ]);


    oci_free_statement($stmt);
    oci_free_statement($linkStmt);
    oci_close($conn);

    exit;
}



/* =====================================================
   MY PAPERS
   ===================================================== */

if ($action === 'my_papers') {

    $author_id = intval($_GET['author_id'] ?? ($_SESSION['role_id'] ?? 2));

    if ($author_id <= 0) {

        echo json_encode([
            "success" => false,
            "error" => "Valid author_id is required."
        ]);

        oci_close($conn);
        exit;
    }


    $sql = "
        SELECT
            P.PAPER_ID,
            P.TITLE,
            P.ABSTRACT,
            P.SUBMISSION_DATE,
            P.PAGE_COUNT,
            P.PAPER_STATUS,
            P.TRACK_ID
        FROM PAPER P
        INNER JOIN AUTHOR_PAPER AP
            ON P.PAPER_ID = AP.PAPER_ID
        WHERE AP.AUTHOR_ID = :author_id
        ORDER BY P.SUBMISSION_DATE DESC
    ";

    $stmt = oci_parse($conn, $sql);

    oci_bind_by_name($stmt, ":author_id", $author_id);


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
            "abstract" => $row["ABSTRACT"],
            "submission_date" => $row["SUBMISSION_DATE"],
            "page_count" => $row["PAGE_COUNT"],
            "paper_status" => $row["PAPER_STATUS"],
            "track_id" => $row["TRACK_ID"]
        ];
    }


    echo json_encode([
        "success" => true,
        "author_id" => $author_id,
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
    "error" => "Invalid action."
]);

oci_close($conn);

?>