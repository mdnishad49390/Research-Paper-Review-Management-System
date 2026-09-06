<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db.php';

header('Content-Type: application/json');

$conn = get_db_connection();

$sql = "SELECT PAPER_ID, TITLE, ABSTRACT, SUBMISSION_DATE,
               PAGE_COUNT, PAPER_STATUS, TRACK_ID
        FROM PAPER
        ORDER BY PAPER_ID";

$stid = oci_parse($conn, $sql);

if (!$stid) {
    $error = oci_error($conn);

    echo json_encode([
        "success" => false,
        "message" => $error['message']
    ]);

    exit;
}

if (!oci_execute($stid)) {
    $error = oci_error($stid);

    echo json_encode([
        "success" => false,
        "message" => $error['message']
    ]);

    exit;
}

$data = [];

while ($row = oci_fetch_assoc($stid)) {
    $data[] = $row;
}

echo json_encode([
    "success" => true,
    "message" => "Paper data fetched successfully",
    "data" => $data
]);

oci_free_statement($stid);
oci_close($conn);

?>