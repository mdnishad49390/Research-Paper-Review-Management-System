<?php

function get_db_connection($suppress_die = false)
{
    $username = "rpms";
    $password = "rpms123";
    $connection_string = "Nishad:1521/XE";

    // Quick socket check to prevent hanging if Oracle listener is offline
    $sock = @fsockopen("127.0.0.1", 1521, $errno, $errstr, 0.8);
    if (!$sock) {
        if ($suppress_die) {
            return false;
        }
        die("Database Connection Failed: Oracle Database Listener is not running on port 1521.");
    }
    fclose($sock);

    $conn = @oci_connect(
        $username,
        $password,
        $connection_string
    );

    if (!$conn) {
        $error = oci_error();

        if ($suppress_die) {
            return false;
        }

        die(
            "Database Connection Failed: " .
            ($error ? $error['message'] : 'Unable to connect to Oracle Database')
        );
    }

    return $conn;
}