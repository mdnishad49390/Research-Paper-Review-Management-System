<?php

function get_db_connection()
{
    $username = "rpms";
    $password = "rpms123";
    $connection_string = "Nishad:1521/XE";

    $conn = oci_connect(
        $username,
        $password,
        $connection_string
    );

    if (!$conn) {
        $error = oci_error();

        die(
            "Database Connection Failed: " .
            $error['message']
        );
    }

    return $conn;
}