<?php

error_reporting(E_ALL);
ini_set('display_errors', 0); // Keep JSON clean

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

require_once 'db.php';

$action = $_GET['action'] ?? '';

// Fallback/Default test users for instant login & testing
$defaultUsers = [
    'author' => [
        'username' => 'author',
        'passwords' => ['password123', 'author123'],
        'name' => 'Rahim Ahmed',
        'email' => 'rahim@rpms.local',
        'role' => 'author',
        'role_id' => 2
    ],
    'rahim' => [
        'username' => 'rahim',
        'passwords' => ['password123', 'rahim123'],
        'name' => 'Rahim Ahmed',
        'email' => 'rahim@rpms.local',
        'role' => 'author',
        'role_id' => 2
    ],
    'reviewer' => [
        'username' => 'reviewer',
        'passwords' => ['password123', 'reviewer123'],
        'name' => 'Dr. Farhana Islam',
        'email' => 'farhana@rpms.local',
        'role' => 'reviewer',
        'role_id' => 2
    ],
    'farhana' => [
        'username' => 'farhana',
        'passwords' => ['password123', 'farhana123'],
        'name' => 'Dr. Farhana Islam',
        'email' => 'farhana@rpms.local',
        'role' => 'reviewer',
        'role_id' => 2
    ],
    'editor' => [
        'username' => 'editor',
        'passwords' => ['password123', 'editor123'],
        'name' => 'Prof. Junaed Ahmed',
        'email' => 'junaed@rpms.local',
        'role' => 'editor',
        'role_id' => 1
    ],
    'junaed' => [
        'username' => 'junaed',
        'passwords' => ['password123', 'junaed123'],
        'name' => 'Prof. Junaed Ahmed',
        'email' => 'junaed@rpms.local',
        'role' => 'editor',
        'role_id' => 1
    ]
];

/**
 * Automatically creates APP_USER table and seeds default users if not present in Oracle.
 */
function ensure_app_user_table($conn)
{
    if (!$conn) {
        return;
    }

    $checkSql = "SELECT COUNT(*) AS CNT FROM APP_USER";
    $stmt = @oci_parse($conn, $checkSql);
    $res = @oci_execute($stmt);

    if (!$res) {
        // Table doesn't exist, create it
        $createTableSql = "
            CREATE TABLE APP_USER (
                USER_ID NUMBER PRIMARY KEY,
                USERNAME VARCHAR2(50) UNIQUE NOT NULL,
                PASSWORD_HASH VARCHAR2(255) NOT NULL,
                FULL_NAME VARCHAR2(100) NOT NULL,
                EMAIL VARCHAR2(100) UNIQUE NOT NULL,
                ROLE VARCHAR2(20) NOT NULL,
                ROLE_ID NUMBER,
                CREATED_AT DATE DEFAULT SYSDATE
            )
        ";
        $cStmt = @oci_parse($conn, $createTableSql);
        @oci_execute($cStmt);

        // Create sequence
        $createSeqSql = "CREATE SEQUENCE SEQ_APP_USER START WITH 10 INCREMENT BY 1 NOCACHE";
        $sStmt = @oci_parse($conn, $createSeqSql);
        @oci_execute($sStmt);

        // Seed initial users
        $seedUsers = [
            [1, 'author', password_hash('password123', PASSWORD_DEFAULT), 'Rahim Ahmed', 'rahim@rpms.local', 'author', 2],
            [2, 'reviewer', password_hash('password123', PASSWORD_DEFAULT), 'Dr. Farhana Islam', 'farhana@rpms.local', 'reviewer', 2],
            [3, 'editor', password_hash('password123', PASSWORD_DEFAULT), 'Prof. Junaed Ahmed', 'junaed@rpms.local', 'editor', 1]
        ];

        foreach ($seedUsers as $u) {
            $insertSql = "INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
                          VALUES (:id, :username, :pwd, :name, :email, :role, :role_id)";
            $iStmt = @oci_parse($conn, $insertSql);
            oci_bind_by_name($iStmt, ":id", $u[0]);
            oci_bind_by_name($iStmt, ":username", $u[1]);
            oci_bind_by_name($iStmt, ":pwd", $u[2]);
            oci_bind_by_name($iStmt, ":name", $u[3]);
            oci_bind_by_name($iStmt, ":email", $u[4]);
            oci_bind_by_name($iStmt, ":role", $u[5]);
            oci_bind_by_name($iStmt, ":role_id", $u[6]);
            @oci_execute($iStmt);
        }

        @oci_commit($conn);
    }
}

/* =========================
   LOGIN
   ========================= */

if ($action === 'login') {
    $input = json_decode(file_get_contents("php://input"), true) ?: [];

    $username = trim($input['username'] ?? ($_POST['username'] ?? ''));
    $password = (string)($input['password'] ?? ($_POST['password'] ?? ''));

    if (!$username || !$password) {
        echo json_encode([
            "success" => false,
            "error" => "Username and password are required."
        ]);
        exit;
    }

    $conn = get_db_connection(true);

    if ($conn) {
        ensure_app_user_table($conn);

        // Search by username or email
        $sql = "SELECT USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID
                FROM APP_USER
                WHERE LOWER(USERNAME) = LOWER(:u) OR LOWER(EMAIL) = LOWER(:u)";

        $stmt = oci_parse($conn, $sql);
        oci_bind_by_name($stmt, ":u", $username);

        if (oci_execute($stmt)) {
            $row = oci_fetch_assoc($stmt);

            if ($row) {
                $hash = $row['PASSWORD_HASH'];
                $passwordMatch = password_verify($password, $hash) || ($password === $hash);

                if ($passwordMatch) {
                    $role = strtolower(trim($row['ROLE']));
                    $userSession = [
                        'id' => (int)$row['USER_ID'],
                        'username' => $row['USERNAME'],
                        'name' => $row['FULL_NAME'],
                        'email' => $row['EMAIL'],
                        'role' => $role,
                        'role_id' => (int)$row['ROLE_ID']
                    ];

                    $_SESSION['user'] = $userSession;
                    $_SESSION['role'] = $role;
                    $_SESSION['role_id'] = (int)$row['ROLE_ID'];
                    $_SESSION['name'] = $row['FULL_NAME'];

                    echo json_encode([
                        "success" => true,
                        "role" => $role,
                        "user" => $userSession
                    ]);

                    oci_free_statement($stmt);
                    oci_close($conn);
                    exit;
                }
            }
        }
        if (isset($stmt)) {
            oci_free_statement($stmt);
        }
        oci_close($conn);
    }

    // Check Fallback Default Users
    $lowerUser = strtolower($username);
    foreach ($defaultUsers as $key => $def) {
        if ($key === $lowerUser || strtolower($def['email']) === $lowerUser) {
            if (in_array($password, $def['passwords'])) {
                $role = $def['role'];
                $userSession = [
                    'id' => 1,
                    'username' => $def['username'],
                    'name' => $def['name'],
                    'email' => $def['email'],
                    'role' => $role,
                    'role_id' => $def['role_id']
                ];

                $_SESSION['user'] = $userSession;
                $_SESSION['role'] = $role;
                $_SESSION['role_id'] = $def['role_id'];
                $_SESSION['name'] = $def['name'];

                echo json_encode([
                    "success" => true,
                    "role" => $role,
                    "user" => $userSession
                ]);
                exit;
            }
        }
    }

    echo json_encode([
        "success" => false,
        "error" => "Invalid username or password."
    ]);
    exit;
}

/* =========================
   REGISTER (AUTHOR)
   ========================= */

if ($action === 'register') {
    $input = json_decode(file_get_contents("php://input"), true) ?: [];

    $name = trim($input['name'] ?? ($_POST['name'] ?? ''));
    $email = trim($input['email'] ?? ($_POST['email'] ?? ''));
    $affiliation = trim($input['affiliation'] ?? ($_POST['affiliation'] ?? ''));
    $username = trim($input['username'] ?? ($_POST['username'] ?? ''));
    $password = (string)($input['password'] ?? ($_POST['password'] ?? ''));

    if (!$name || !$email || !$username || !$password) {
        echo json_encode([
            "success" => false,
            "error" => "All fields (Name, Email, Username, Password) are required."
        ]);
        exit;
    }

    $conn = get_db_connection(true);

    if (!$conn) {
        echo json_encode([
            "success" => false,
            "error" => "Database connection unavailable. Please start Oracle Database service."
        ]);
        exit;
    }

    ensure_app_user_table($conn);

    // Check whether email or username exists in APP_USER
    $checkSql = "SELECT USER_ID FROM APP_USER WHERE LOWER(USERNAME) = LOWER(:u) OR LOWER(EMAIL) = LOWER(:e)";
    $checkStmt = oci_parse($conn, $checkSql);
    oci_bind_by_name($checkStmt, ":u", $username);
    oci_bind_by_name($checkStmt, ":e", $email);
    oci_execute($checkStmt);

    if (oci_fetch($checkStmt)) {
        oci_free_statement($checkStmt);
        oci_close($conn);
        echo json_encode([
            "success" => false,
            "error" => "Username or Email is already registered."
        ]);
        exit;
    }
    oci_free_statement($checkStmt);

    // 1. Insert into AUTHOR table
    $authorSql = "INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME, EMAIL, AFFILIATION)
                  VALUES (SEQ_AUTHOR.NEXTVAL, :name, :email, :affiliation)
                  RETURNING AUTHOR_ID INTO :author_id";

    $authorStmt = oci_parse($conn, $authorSql);
    oci_bind_by_name($authorStmt, ":name", $name);
    oci_bind_by_name($authorStmt, ":email", $email);
    oci_bind_by_name($authorStmt, ":affiliation", $affiliation);

    $author_id = null;
    oci_bind_by_name($authorStmt, ":author_id", $author_id, 20);

    if (!@oci_execute($authorStmt, OCI_NO_AUTO_COMMIT)) {
        // Fallback if SEQ_AUTHOR doesn't support RETURNING in older Oracle
        $altSql = "INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME, EMAIL, AFFILIATION)
                   VALUES (SEQ_AUTHOR.NEXTVAL, :name, :email, :affiliation)";
        $altStmt = oci_parse($conn, $altSql);
        oci_bind_by_name($altStmt, ":name", $name);
        oci_bind_by_name($altStmt, ":email", $email);
        oci_bind_by_name($altStmt, ":affiliation", $affiliation);

        if (!oci_execute($altStmt, OCI_NO_AUTO_COMMIT)) {
            $err = oci_error($altStmt);
            oci_rollback($conn);
            echo json_encode(["success" => false, "error" => $err['message']]);
            exit;
        }

        // Get currval
        $curSql = "SELECT SEQ_AUTHOR.CURRVAL AS CID FROM DUAL";
        $curStmt = oci_parse($conn, $curSql);
        oci_execute($curStmt);
        $curRow = oci_fetch_assoc($curStmt);
        $author_id = $curRow['CID'] ?? 2;
    }

    // 2. Insert into APP_USER table
    $pwdHash = password_hash($password, PASSWORD_DEFAULT);
    $userSql = "INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
                VALUES (SEQ_APP_USER.NEXTVAL, :username, :pwd, :name, :email, 'author', :author_id)";

    $userStmt = oci_parse($conn, $userSql);
    oci_bind_by_name($userStmt, ":username", $username);
    oci_bind_by_name($userStmt, ":pwd", $pwdHash);
    oci_bind_by_name($userStmt, ":name", $name);
    oci_bind_by_name($userStmt, ":email", $email);
    oci_bind_by_name($userStmt, ":author_id", $author_id);

    if (!oci_execute($userStmt, OCI_NO_AUTO_COMMIT)) {
        $err = oci_error($userStmt);
        oci_rollback($conn);
        echo json_encode(["success" => false, "error" => $err['message']]);
        exit;
    }

    oci_commit($conn);
    oci_close($conn);

    echo json_encode([
        "success" => true,
        "message" => "Author account created successfully! You can now sign in."
    ]);
    exit;
}

/* =========================
   CHECK CURRENT SESSION
   ========================= */

if ($action === 'check') {
    if (isset($_SESSION['user'])) {
        echo json_encode([
            "logged_in" => true,
            "user" => $_SESSION['user']
        ]);
    } else {
        echo json_encode([
            "logged_in" => false
        ]);
    }
    exit;
}

/* =========================
   LOGOUT
   ========================= */

if ($action === 'logout') {
    $_SESSION = [];
    if (session_id()) {
        session_destroy();
    }
    echo json_encode([
        "success" => true,
        "message" => "Signed out successfully."
    ]);
    exit;
}

/* =========================
   INVALID ACTION
   ========================= */

echo json_encode([
    "success" => false,
    "error" => "Invalid action."
]);
