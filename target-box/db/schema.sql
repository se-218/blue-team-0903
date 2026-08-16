-- 校園門戶網站 MySQL schema（從原本 Postgres 版本轉換而來）
-- 對應 course-api / student-api 目前的查詢欄位

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_no VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    name VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    phone VARCHAR(10),
    grade VARCHAR(20),
    email VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    teacher VARCHAR(100),
    credits INT,
    course_code VARCHAR(20),
    semester VARCHAR(20),
    day_of_week INT,
    start_time TIME,
    end_time TIME,
    classroom VARCHAR(50),
    capacity INT DEFAULT 50
);

CREATE TABLE IF NOT EXISTS enrollments (
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    semester VARCHAR(20),
    score DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'enrolled',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- 漏洞4：內部主機明文SSH憑證，供橫向移動用
CREATE TABLE IF NOT EXISTS internal_hosts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(100),
    host VARCHAR(45) NOT NULL,
    ssh_user VARCHAR(50) NOT NULL,
    ssh_password VARCHAR(100) NOT NULL,
    note VARCHAR(255)
);
