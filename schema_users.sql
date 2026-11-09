-- ============================================================
-- Research Paper Review Management System (RPRMS)
-- User Authentication Schema for Oracle Database
-- ============================================================

-- 1. Create APP_USER Table
CREATE TABLE APP_USER (
    USER_ID NUMBER PRIMARY KEY,
    USERNAME VARCHAR2(50) UNIQUE NOT NULL,
    PASSWORD_HASH VARCHAR2(255) NOT NULL,
    FULL_NAME VARCHAR2(100) NOT NULL,
    EMAIL VARCHAR2(100) UNIQUE NOT NULL,
    ROLE VARCHAR2(20) NOT NULL CHECK (ROLE IN ('author', 'reviewer', 'editor', 'admin')),
    ROLE_ID NUMBER,
    CREATED_AT DATE DEFAULT SYSDATE
);

-- 2. Create Sequence for APP_USER
CREATE SEQUENCE SEQ_APP_USER START WITH 10 INCREMENT BY 1 NOCACHE;

-- 3. Insert Default Users
-- Default password for all seed accounts: password123
-- (Bcrypt hash: $2y$10$wE9sY/b4B4wD24qGfomD6.9zDqIhyJkK8Fz1K2q3QpL5v4qM8s8I2)

-- Admin Account:
INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
VALUES (4, 'admin', '$2y$10$wE9sY/b4B4wD24qGfomD6.9zDqIhyJkK8Fz1K2q3QpL5v4qM8s8I2', 'System Administrator', 'admin@rpms.local', 'admin', 1);

-- Author Account:
INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
VALUES (1, 'author', '$2y$10$wE9sY/b4B4wD24qGfomD6.9zDqIhyJkK8Fz1K2q3QpL5v4qM8s8I2', 'Rahim Ahmed', 'rahim@rpms.local', 'author', 2);

-- Reviewer Account:
INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
VALUES (2, 'reviewer', '$2y$10$wE9sY/b4B4wD24qGfomD6.9zDqIhyJkK8Fz1K2q3QpL5v4qM8s8I2', 'Dr. Farhana Islam', 'farhana@rpms.local', 'reviewer', 2);

-- Editor Account:
INSERT INTO APP_USER (USER_ID, USERNAME, PASSWORD_HASH, FULL_NAME, EMAIL, ROLE, ROLE_ID)
VALUES (3, 'editor', '$2y$10$wE9sY/b4B4wD24qGfomD6.9zDqIhyJkK8Fz1K2q3QpL5v4qM8s8I2', 'Prof. Junaed Ahmed', 'junaed@rpms.local', 'editor', 1);

COMMIT;

