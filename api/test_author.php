<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db.php';

$conn = get_db_connection();

$sql = "
    SELECT AUTHOR_ID,
           AUTHOR_NAME,
           EMAIL,
           AFFILIATION
    FROM AUTHOR
    ORDER BY AUTHOR_ID
";

$stid = oci_parse($conn, $sql);

if (!$stid) {
    $error = oci_error($conn);

    header('Content-Type: application/json');

    echo json_encode([
        "success" => false,
        "message" => "SQL parsing failed",
        "error" => $error['message']
    ]);

    oci_close($conn);
    exit;
}

if (!oci_execute($stid)) {
    $error = oci_error($stid);

    header('Content-Type: application/json');

    echo json_encode([
        "success" => false,
        "message" => "Failed to fetch author data",
        "error" => $error['message']
    ]);

    oci_free_statement($stid);
    oci_close($conn);
    exit;
}

$data = [];

while ($row = oci_fetch_assoc($stid)) {
    $data[] = $row;
}

header('Content-Type: application/json');

echo json_encode([
    "success" => true,
    "message" => "Author data fetched successfully",
    "data" => $data
], JSON_PRETTY_PRINT);

oci_free_statement($stid);
oci_close($conn);