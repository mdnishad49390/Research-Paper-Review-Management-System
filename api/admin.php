<?php

error_reporting(E_ALL);
ini_set('display_errors', 0);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');

require_once 'db.php';

$action = $_GET['action'] ?? '';

// Connect to Oracle with graceful fallback
$conn = get_db_connection(true);

function send_json($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

/* ============================================================
   1. DASHBOARD STATS & OVERVIEW
   ============================================================ */
if ($action === 'stats') {
    if (!$conn) {
        // Return demo stats when DB is offline
        send_json([
            "success" => true,
            "offline" => true,
            "stats" => [
                "total_users" => 4,
                "total_papers" => 2,
                "total_reviews" => 3,
                "total_tracks" => 5,
                "total_reviewers" => 2,
                "total_authors" => 1,
                "pending_decisions" => 1,
                "accepted_papers" => 1
            ]
        ]);
    }

    $stats = [
        "total_users" => 0,
        "total_papers" => 0,
        "total_reviews" => 0,
        "total_tracks" => 0,
        "total_reviewers" => 0,
        "total_authors" => 0,
        "pending_decisions" => 0,
        "accepted_papers" => 0
    ];

    // Helper for count
    function get_count($c, $sql) {
        $st = @oci_parse($c, $sql);
        if ($st && @oci_execute($st)) {
            $row = oci_fetch_assoc($st);
            oci_free_statement($st);
            return intval($row['CNT'] ?? 0);
        }
        return 0;
    }

    $stats["total_users"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM APP_USER");
    $stats["total_papers"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM PAPER");
    $stats["total_reviews"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM REVIEW");
    $stats["total_tracks"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM TRACK");
    $stats["total_reviewers"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM REVIEWER");
    $stats["total_authors"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM AUTHOR");
    $stats["pending_decisions"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM PAPER P WHERE NOT EXISTS (SELECT 1 FROM DECISION D WHERE D.PAPER_ID = P.PAPER_ID)");
    $stats["accepted_papers"] = get_count($conn, "SELECT COUNT(*) AS CNT FROM PAPER WHERE LOWER(PAPER_STATUS) = 'accepted'");

    oci_close($conn);
    send_json(["success" => true, "stats" => $stats]);
}

/* ============================================================
   2. USER MANAGEMENT (APP_USER)
   ============================================================ */
if ($action === 'get_users') {
    if (!$conn) {
        send_json([
            "success" => true,
            "offline" => true,
            "users" => [
                ["user_id" => 1, "username" => "author", "full_name" => "Rahim Ahmed", "email" => "rahim@rpms.local", "role" => "author", "role_id" => 2, "created_at" => "2026-11-01"],
                ["user_id" => 2, "username" => "reviewer", "full_name" => "Dr. Farhana Islam", "email" => "farhana@rpms.local", "role" => "reviewer", "role_id" => 2, "created_at" => "2026-11-01"],
                ["user_id" => 3, "username" => "editor", "full_name" => "Prof. Junaed Ahmed", "email" => "junaed@rpms.local", "role" => "editor", "role_id" => 1, "created_at" => "2026-11-01"],
                ["user_id" => 4, "username" => "admin", "full_name" => "System Administrator", "email" => "admin@rpms.local", "role" => "admin", "role_id" => 1, "created_at" => "2026-11-01"]
            ]
        ]);
    }

    $sql = "SELECT USER_ID, USERNAME, FULL_NAME, EMAIL, ROLE, ROLE_ID, TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI') AS CREATED_AT
            FROM APP_USER
            ORDER BY USER_ID ASC";
    $st = oci_parse($conn, $sql);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Query failed']);
    }

    $users = [];
    while ($row = oci_fetch_assoc($st)) {
        $users[] = [
            "user_id" => intval($row["USER_ID"]),
            "username" => $row["USERNAME"],
            "full_name" => $row["FULL_NAME"],
            "email" => $row["EMAIL"],
            "role" => $row["ROLE"],
            "role_id" => intval($row["ROLE_ID"]),
            "created_at" => $row["CREATED_AT"]
        ];
    }
    oci_free_statement($st);
    oci_close($conn);
    send_json(["success" => true, "users" => $users]);
}

if ($action === 'create_user') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');
    $full_name = trim($input['full_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $role = strtolower(trim($input['role'] ?? 'author'));

    if (!$username || !$password || !$full_name || !$email) {
        send_json(["success" => false, "error" => "All fields (Username, Password, Full Name, Email, Role) are required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline. Cannot save user."]);
    }

    // Check duplicate
    $chk = oci_parse($conn, "SELECT USER_ID FROM APP_USER WHERE LOWER(USERNAME) = LOWER(:u) OR LOWER(EMAIL) = LOWER(:e)");
    oci_bind_by_name($chk, ":u", $username);
    oci_bind_by_name($chk, ":e", $email);
    oci_execute($chk);
    if (oci_fetch($chk)) {
        oci_free_statement($chk);
        oci_close($conn);
        send_json(["success" => false, "error" => "Username or Email already exists."]);
    }
    oci_free_statement($chk);

    $role_id = 1;
    // If reviewer, create in REVIEWER table if requested
    if ($role === 'reviewer') {
        $rSql = "INSERT INTO REVIEWER (REVIEWER_ID, REVIEWER_NAME, REVIEWER_EMAIL, EXPERTISE)
                 VALUES (NVL((SELECT MAX(REVIEWER_ID) FROM REVIEWER), 0) + 1, :name, :email, 'General')
                 RETURNING REVIEWER_ID INTO :rid";
        $rSt = @oci_parse($conn, $rSql);
        if ($rSt) {
            oci_bind_by_name($rSt, ":name", $full_name);
            oci_bind_by_name($rSt, ":email", $email);
            oci_bind_by_name($rSt, ":rid", $role_id, 10);
            if (@oci_execute($rSt, OCI_NO_AUTO_COMMIT)) {
                // ok
            }
        }
    } elseif ($role === 'author') {
        $aSql = "INSERT INTO AUTHOR (AUTHOR_ID, AUTHOR_NAME, EMAIL, AFFILIATION)
                 VALUES (SEQ_AUTHOR.NEXTVAL, :name, :email, 'Independent')
                 RETURNING AUTHOR_ID INTO :aid";
        $aSt = @oci_parse($conn, $aSql);
        if ($aSt) {
            oci_bind_by_name($aSt, ":name", $full_name);
            oci_bind_by_name($aSt, ":email", $email);
            oci_bind_by_name($aSt, ":aid", $role_id, 10);
            if (@oci_execute($aSt, OCI_NO_AUTO_COMMIT)) {
                // ok
            }
        }
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $uSql = "INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
             VALUES (SEQ_APP_USER.NEXTVAL, :u, :h, :name, :e, :r, :rid)";
    $uSt = oci_parse($conn, $uSql);
    oci_bind_by_name($uSt, ":u", $username);
    oci_bind_by_name($uSt, ":h", $hash);
    oci_bind_by_name($uSt, ":name", $full_name);
    oci_bind_by_name($uSt, ":e", $email);
    oci_bind_by_name($uSt, ":r", $role);
    oci_bind_by_name($uSt, ":rid", $role_id);

    if (!@oci_execute($uSt, OCI_NO_AUTO_COMMIT)) {
        $err = oci_error($uSt);
        oci_rollback($conn);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Failed to insert user']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "User '{$username}' created successfully as {$role}."]);
}

if ($action === 'delete_user') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $user_id = intval($input['user_id'] ?? 0);

    if ($user_id <= 0) {
        send_json(["success" => false, "error" => "Valid user_id is required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    $st = oci_parse($conn, "DELETE FROM APP_USER WHERE USER_ID = :id");
    oci_bind_by_name($st, ":id", $user_id);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Delete failed']);
    }
    oci_close($conn);
    send_json(["success" => true, "message" => "User deleted successfully."]);
}

/* ============================================================
   3. PAPERS CONTROL (VIEW, CHANGE STATUS, DELETE)
   ============================================================ */
if ($action === 'get_papers') {
    if (!$conn) {
        send_json([
            "success" => true,
            "offline" => true,
            "papers" => [
                [
                    "paper_id" => 1,
                    "title" => "Machine Learning Applications in Healthcare",
                    "abstract" => "An in-depth study of machine learning diagnostic pipelines.",
                    "submission_date" => "2026-10-15",
                    "page_count" => 12,
                    "paper_status" => "Submitted",
                    "track_id" => 2,
                    "track_name" => "Machine Learning",
                    "author_name" => "Rahim Ahmed"
                ]
            ]
        ]);
    }

    $sql = "
        SELECT
            P.PAPER_ID,
            P.TITLE,
            P.ABSTRACT,
            TO_CHAR(P.SUBMISSION_DATE, 'YYYY-MM-DD') AS SUBMISSION_DATE,
            P.PAGE_COUNT,
            P.PAPER_STATUS,
            P.TRACK_ID,
            T.TRACK_NAME,
            (
                SELECT LISTAGG(A.AUTHOR_NAME, ', ') WITHIN GROUP (ORDER BY A.AUTHOR_ID)
                FROM AUTHOR_PAPER AP
                JOIN AUTHOR A ON AP.AUTHOR_ID = A.AUTHOR_ID
                WHERE AP.PAPER_ID = P.PAPER_ID
            ) AS AUTHOR_NAMES,
            (
                SELECT COUNT(*) FROM REVIEW_ASSIGNMENT RA WHERE RA.PAPER_ID = P.PAPER_ID
            ) AS ASSIGNMENT_COUNT
        FROM PAPER P
        LEFT JOIN TRACK T ON P.TRACK_ID = T.TRACK_ID
        ORDER BY P.PAPER_ID DESC
    ";

    $st = oci_parse($conn, $sql);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Failed to load papers']);
    }

    $papers = [];
    while ($row = oci_fetch_assoc($st)) {
        $papers[] = [
            "paper_id" => intval($row["PAPER_ID"]),
            "title" => $row["TITLE"],
            "abstract" => $row["ABSTRACT"],
            "submission_date" => $row["SUBMISSION_DATE"],
            "page_count" => intval($row["PAGE_COUNT"]),
            "paper_status" => $row["PAPER_STATUS"],
            "track_id" => intval($row["TRACK_ID"]),
            "track_name" => $row["TRACK_NAME"] ?? "Unknown Track",
            "author_name" => $row["AUTHOR_NAMES"] ?? "Unknown Author",
            "assignment_count" => intval($row["ASSIGNMENT_COUNT"] ?? 0)
        ];
    }
    oci_free_statement($st);
    oci_close($conn);
    send_json(["success" => true, "papers" => $papers]);
}

if ($action === 'update_paper_status') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $paper_id = intval($input['paper_id'] ?? 0);
    $status = trim($input['status'] ?? '');

    $allowed = ["Submitted", "Under Review", "Revision Required", "Accepted", "Rejected"];
    if ($paper_id <= 0 || !in_array($status, $allowed)) {
        send_json(["success" => false, "error" => "Invalid paper_id or status."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    $st = oci_parse($conn, "UPDATE PAPER SET PAPER_STATUS = :st WHERE PAPER_ID = :id");
    oci_bind_by_name($st, ":st", $status);
    oci_bind_by_name($st, ":id", $paper_id);

    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Update failed']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "Paper #{$paper_id} status updated to '{$status}'."]);
}

if ($action === 'delete_paper') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $paper_id = intval($input['paper_id'] ?? 0);

    if ($paper_id <= 0) {
        send_json(["success" => false, "error" => "Valid paper_id is required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    // Cascade cleanups
    @oci_execute(oci_parse($conn, "DELETE FROM REVIEW WHERE ASSIGNMENT_ID IN (SELECT ASSIGNMENT_ID FROM REVIEW_ASSIGNMENT WHERE PAPER_ID = $paper_id)"), OCI_NO_AUTO_COMMIT);
    @oci_execute(oci_parse($conn, "DELETE FROM REVIEW_ASSIGNMENT WHERE PAPER_ID = $paper_id"), OCI_NO_AUTO_COMMIT);
    @oci_execute(oci_parse($conn, "DELETE FROM DECISION WHERE PAPER_ID = $paper_id"), OCI_NO_AUTO_COMMIT);
    @oci_execute(oci_parse($conn, "DELETE FROM AUTHOR_PAPER WHERE PAPER_ID = $paper_id"), OCI_NO_AUTO_COMMIT);

    $st = oci_parse($conn, "DELETE FROM PAPER WHERE PAPER_ID = :id");
    oci_bind_by_name($st, ":id", $paper_id);

    if (!@oci_execute($st, OCI_NO_AUTO_COMMIT)) {
        $err = oci_error($st);
        oci_rollback($conn);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Delete failed']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "Paper #{$paper_id} and related reviews deleted."]);
}

/* ============================================================
   4. TRACKS MANAGEMENT
   ============================================================ */
if ($action === 'get_tracks') {
    if (!$conn) {
        send_json([
            "success" => true,
            "offline" => true,
            "tracks" => [
                ["track_id" => 1, "track_name" => "Artificial Intelligence", "paper_count" => 0],
                ["track_id" => 2, "track_name" => "Machine Learning", "paper_count" => 1],
                ["track_id" => 3, "track_name" => "Data Science", "paper_count" => 0],
                ["track_id" => 4, "track_name" => "Cyber Security", "paper_count" => 0],
                ["track_id" => 5, "track_name" => "Cloud Computing", "paper_count" => 0]
            ]
        ]);
    }

    $sql = "
        SELECT T.TRACK_ID, T.TRACK_NAME,
               (SELECT COUNT(*) FROM PAPER P WHERE P.TRACK_ID = T.TRACK_ID) AS PAPER_COUNT
        FROM TRACK T
        ORDER BY T.TRACK_ID ASC
    ";
    $st = oci_parse($conn, $sql);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Query failed']);
    }

    $tracks = [];
    while ($row = oci_fetch_assoc($st)) {
        $tracks[] = [
            "track_id" => intval($row["TRACK_ID"]),
            "track_name" => $row["TRACK_NAME"],
            "paper_count" => intval($row["PAPER_COUNT"] ?? 0)
        ];
    }
    oci_free_statement($st);
    oci_close($conn);
    send_json(["success" => true, "tracks" => $tracks]);
}

if ($action === 'create_track') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $track_name = trim($input['track_name'] ?? '');

    if (!$track_name) {
        send_json(["success" => false, "error" => "Track name is required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    $sql = "INSERT INTO TRACK (TRACK_ID, TRACK_NAME)
            VALUES (NVL((SELECT MAX(TRACK_ID) FROM TRACK), 0) + 1, :name)";
    $st = oci_parse($conn, $sql);
    oci_bind_by_name($st, ":name", $track_name);

    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Insert track failed']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "Track '{$track_name}' created successfully."]);
}

if ($action === 'delete_track') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $track_id = intval($input['track_id'] ?? 0);

    if ($track_id <= 0) {
        send_json(["success" => false, "error" => "Valid track_id is required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    // Check if papers exist in this track
    $chk = oci_parse($conn, "SELECT COUNT(*) AS CNT FROM PAPER WHERE TRACK_ID = :id");
    oci_bind_by_name($chk, ":id", $track_id);
    oci_execute($chk);
    $row = oci_fetch_assoc($chk);
    if (intval($row['CNT'] ?? 0) > 0) {
        oci_close($conn);
        send_json(["success" => false, "error" => "Cannot delete track: {$row['CNT']} paper(s) are assigned to it."]);
    }

    $st = oci_parse($conn, "DELETE FROM TRACK WHERE TRACK_ID = :id");
    oci_bind_by_name($st, ":id", $track_id);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Delete track failed']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "Track deleted successfully."]);
}

/* ============================================================
   5. REVIEWERS & AUTHORS DIRECTORY
   ============================================================ */
if ($action === 'get_reviewers') {
    if (!$conn) {
        send_json([
            "success" => true,
            "offline" => true,
            "reviewers" => [
                ["reviewer_id" => 1, "name" => "Dr. Tariqul Islam", "email" => "tariq@univ.edu", "expertise" => "AI, Neural Networks", "active_reviews" => 1],
                ["reviewer_id" => 2, "name" => "Dr. Farhana Islam", "email" => "farhana@rpms.local", "expertise" => "Data Mining, ML", "active_reviews" => 1]
            ]
        ]);
    }

    $sql = "
        SELECT R.REVIEWER_ID, R.REVIEWER_NAME, R.REVIEWER_EMAIL, R.EXPERTISE,
               (SELECT COUNT(*) FROM REVIEW_ASSIGNMENT RA WHERE RA.REVIEWER_ID = R.REVIEWER_ID) AS ASSIGN_COUNT
        FROM REVIEWER R
        ORDER BY R.REVIEWER_ID ASC
    ";
    $st = oci_parse($conn, $sql);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Query failed']);
    }

    $reviewers = [];
    while ($row = oci_fetch_assoc($st)) {
        $reviewers[] = [
            "reviewer_id" => intval($row["REVIEWER_ID"]),
            "name" => $row["REVIEWER_NAME"],
            "email" => $row["REVIEWER_EMAIL"],
            "expertise" => $row["EXPERTISE"],
            "active_reviews" => intval($row["ASSIGN_COUNT"] ?? 0)
        ];
    }
    oci_free_statement($st);
    oci_close($conn);
    send_json(["success" => true, "reviewers" => $reviewers]);
}

if ($action === 'create_reviewer') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $expertise = trim($input['expertise'] ?? 'General');

    if (!$name || !$email) {
        send_json(["success" => false, "error" => "Name and Email are required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    $sql = "INSERT INTO REVIEWER (REVIEWER_ID, REVIEWER_NAME, REVIEWER_EMAIL, EXPERTISE)
            VALUES (NVL((SELECT MAX(REVIEWER_ID) FROM REVIEWER), 0) + 1, :name, :email, :exp)";
    $st = oci_parse($conn, $sql);
    oci_bind_by_name($st, ":name", $name);
    oci_bind_by_name($st, ":email", $email);
    oci_bind_by_name($st, ":exp", $expertise);

    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Insert failed']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "Reviewer '{$name}' created successfully."]);
}

if ($action === 'delete_reviewer') {
    $input = json_decode(file_get_contents("php://input"), true) ?: $_POST;
    $reviewer_id = intval($input['reviewer_id'] ?? 0);

    if ($reviewer_id <= 0) {
        send_json(["success" => false, "error" => "Valid reviewer_id is required."]);
    }

    if (!$conn) {
        send_json(["success" => false, "error" => "Oracle Database is offline."]);
    }

    $st = oci_parse($conn, "DELETE FROM REVIEWER WHERE REVIEWER_ID = :id");
    oci_bind_by_name($st, ":id", $reviewer_id);

    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Delete reviewer failed']);
    }

    oci_commit($conn);
    oci_close($conn);
    send_json(["success" => true, "message" => "Reviewer removed successfully."]);
}

/* ============================================================
   6. REVIEWS & DECISIONS AUDIT LOG
   ============================================================ */
if ($action === 'get_reviews') {
    if (!$conn) {
        send_json([
            "success" => true,
            "offline" => true,
            "reviews" => [
                [
                    "review_id" => 1,
                    "paper_id" => 1,
                    "paper_title" => "Machine Learning Applications in Healthcare",
                    "reviewer_name" => "Dr. Farhana Islam",
                    "score" => 8,
                    "recommendation" => "Accept",
                    "comments" => "Well-structured paper with solid methodology.",
                    "review_date" => "2026-10-20"
                ]
            ]
        ]);
    }

    $sql = "
        SELECT R.REVIEW_ID, R.SCORE, R.RECOMMENDATION, R.COMMENTS,
               TO_CHAR(R.REVIEW_DATE, 'YYYY-MM-DD') AS REVIEW_DATE,
               RA.PAPER_ID, P.TITLE AS PAPER_TITLE, REV.REVIEWER_NAME
        FROM REVIEW R
        JOIN REVIEW_ASSIGNMENT RA ON R.ASSIGNMENT_ID = RA.ASSIGNMENT_ID
        JOIN PAPER P ON RA.PAPER_ID = P.PAPER_ID
        JOIN REVIEWER REV ON RA.REVIEWER_ID = REV.REVIEWER_ID
        ORDER BY R.REVIEW_ID DESC
    ";
    $st = oci_parse($conn, $sql);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Query failed']);
    }

    $reviews = [];
    while ($row = oci_fetch_assoc($st)) {
        $reviews[] = [
            "review_id" => intval($row["REVIEW_ID"]),
            "paper_id" => intval($row["PAPER_ID"]),
            "paper_title" => $row["PAPER_TITLE"],
            "reviewer_name" => $row["REVIEWER_NAME"],
            "score" => intval($row["SCORE"]),
            "recommendation" => $row["RECOMMENDATION"],
            "comments" => $row["COMMENTS"],
            "review_date" => $row["REVIEW_DATE"]
        ];
    }
    oci_free_statement($st);
    oci_close($conn);
    send_json(["success" => true, "reviews" => $reviews]);
}

if ($action === 'get_decisions') {
    if (!$conn) {
        send_json([
            "success" => true,
            "offline" => true,
            "decisions" => [
                [
                    "decision_id" => 1,
                    "paper_id" => 1,
                    "paper_title" => "Machine Learning Applications in Healthcare",
                    "final_status" => "Accepted",
                    "decision_date" => "2026-10-22",
                    "remarks" => "Accepted for oral presentation.",
                    "editor_id" => 1
                ]
            ]
        ]);
    }

    $sql = "
        SELECT D.DECISION_ID, D.PAPER_ID, P.TITLE AS PAPER_TITLE,
               D.FINAL_STATUS, TO_CHAR(D.DECISION_DATE, 'YYYY-MM-DD') AS DECISION_DATE,
               D.REMARKS, D.EDITOR_ID
        FROM DECISION D
        LEFT JOIN PAPER P ON D.PAPER_ID = P.PAPER_ID
        ORDER BY D.DECISION_ID DESC
    ";
    $st = oci_parse($conn, $sql);
    if (!@oci_execute($st)) {
        $err = oci_error($st);
        oci_close($conn);
        send_json(["success" => false, "error" => $err['message'] ?? 'Query failed']);
    }

    $decisions = [];
    while ($row = oci_fetch_assoc($st)) {
        $decisions[] = [
            "decision_id" => intval($row["DECISION_ID"]),
            "paper_id" => intval($row["PAPER_ID"]),
            "paper_title" => $row["PAPER_TITLE"],
            "final_status" => $row["FINAL_STATUS"],
            "decision_date" => $row["DECISION_DATE"],
            "remarks" => $row["REMARKS"],
            "editor_id" => intval($row["EDITOR_ID"] ?? 1)
        ];
    }
    oci_free_statement($st);
    oci_close($conn);
    send_json(["success" => true, "decisions" => $decisions]);
}

/* ============================================================
   DEFAULT
   ============================================================ */
send_json(["success" => false, "error" => "Invalid admin action."]);

