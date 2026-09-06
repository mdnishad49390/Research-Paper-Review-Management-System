<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

require_once 'db.php';

$conn = get_db_connection();

$action = $_GET['action'] ?? '';

/* =========================
   REGISTER
   ========================= */

if ($action === 'register') {

    $input = json_decode(file_get_contents("php://input"), true);

    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $affiliation = trim($input['affiliation'] ?? '');

    if (!$name || !$email) {
        echo json_encode([
            "error" => "Name and email are required."
        ]);
        exit;
    }

    /* Check whether email already exists */

    $checkSql = "SELECT AUTHOR_ID
                 FROM AUTHOR
                 WHERE EMAIL = :email";

    $checkStmt = oci_parse($conn, $checkSql);

    oci_bind_by_name($checkStmt, ":email", $email);

    oci_execute($checkStmt);

    if (oci_fetch($checkStmt)) {

        echo json_encode([
            "error" => "Email already exists."
        ]);

        exit;
    }

    /* Insert new author */

    $sql = "INSERT INTO AUTHOR
            (AUTHOR_ID, AUTHOR_NAME, EMAIL, AFFILIATION)
            VALUES
            (SEQ_AUTHOR.NEXTVAL, :name, :email, :affiliation)";

    $stmt = oci_parse($conn, $sql);

    oci_bind_by_name($stmt, ":name", $name);
    oci_bind_by_name($stmt, ":email", $email);
    oci_bind_by_name($stmt, ":affiliation", $affiliation);

    if (!oci_execute($stmt)) {

        $error = oci_error($stmt);

        echo json_encode([
            "error" => $error['message']
        ]);

        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "Author account created successfully."
    ]);

    oci_free_statement($stmt);
    oci_close($conn);

    exit;
}


/* =========================
   LOGIN
   ========================= */

if ($action === 'login') {

    echo json_encode([
        "error" => "Login authentication is not available yet because the current Oracle tables do not contain username/password fields."
    ]);

    oci_close($conn);

    exit;
}


/* =========================
   INVALID ACTION
   ========================= */

echo json_encode([
    "error" => "Invalid action."
]);

oci_close($conn);

?>