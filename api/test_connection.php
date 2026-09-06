<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'db.php';

$conn = get_db_connection();

echo "<h2>Oracle Database Connected Successfully!</h2>";

oci_close($conn);

?>