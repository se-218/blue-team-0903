-- 假資料（從 mysql-import/*.csv 轉換而來，密碼統一明文為 Passw0rd!，僅供demo使用）

INSERT INTO users (id, student_no, password_hash, name, department, role, phone, grade, email) VALUES
(1, 'B11123001', '$2a$06$befycFA0Gv3rsb.C0ISLHuI4CaKk5.IZCW3lby1B1lWwO6VhCxMxO', '陳同學', '資訊工程系', 'student', '1233456789', NULL, NULL),
(2, 'B11123002', '$2a$06$JHt4leZg3hCub8wnzVsaQeN9VFu1GGIvmMB/uey9Q1eSXiYbLQtlu', '林同學', '資訊工程系', 'student', NULL, NULL, NULL),
(3, 'B11123003', '$2a$06$OeblhMcCvw3niGlV5sOYPOiChpkaEl.ruNbaOqcYpV3ChKtK9r76i', '黃同學', '電機工程系', 'student', NULL, NULL, NULL),
(4, 'B11123004', '$2a$06$lXJtBYkmwpDOJ2IHCWf/OOHwtc70bPqpoRQyhSci2E.DO91FIuVEa', '張同學', '企業管理系', 'student', NULL, NULL, NULL),
(5, 'B11123005', '$2a$06$1xpezZcLeqQFONnTueEgkea0U9UCXiBviHvfR5PUG0JobJAuWYRaG', '李同學', '應用外語系', 'student', NULL, NULL, NULL),
(6, 'B11123006', '$2a$06$PrFdcC/Eciw.H2DYQpW5p.SEMQW6xrFDWhyaq6GZi1Q9kpar4NJx.', '王同學', '資訊管理系', 'student', NULL, NULL, NULL),
(7, 'B11123007', '$2a$06$KRrCK.Hg1ItYTAGjQUWts.nr8FF.L.A7wo0Zjd2uxXBZFu1AfHYGy', '吳同學', '機械工程系', 'student', NULL, NULL, NULL),
(8, 'B11123008', '$2a$06$N9XmPP0Lan1DNetHEbMKdOWEBA3CkrYICQBuC43fug5u5P/IT10DC', '劉同學', '財務金融系', 'student', NULL, NULL, NULL),
(9, 'B11123009', '$2a$06$2.eiovue11EfZH1XmlBsnOZ6m8hukXWIf4CoJwJUcfc13cBsAuEoy', '蔡同學', '大眾傳播系', 'student', NULL, NULL, NULL),
(10, 'B11123010', '$2a$06$LifH7xLlstEgV5B94IaL6eGg2z2T31EQ1xnYrAIvv9GIRHqj/zhwy', '楊同學', '運動科學系', 'student', NULL, NULL, NULL),
(11, 'A00000001', '$2a$06$qXozzzhiGa2nOZjs5xI0Ouq.FwyBvUEhP55ZzjLRhb1OT94T1BLpq', '系統管理員', NULL, 'admin', NULL, NULL, NULL);

INSERT INTO courses (id, name, teacher, credits, course_code, semester, day_of_week, start_time, end_time, classroom, capacity) VALUES
(1, '資料庫概論', '王老師', 3, 'CS101', '2025-2', 1, '09:00:00', '12:00:00', 'A301', 50),
(2, '網路安全導論', '李老師', 3, 'CS202', '2025-2', 3, '13:00:00', '16:00:00', 'B201', 50),
(3, '程式設計', '林老師', 3, 'CS103', '2025-2', 2, '09:00:00', '12:00:00', 'A201', 50),
(4, '資料結構', '張老師', 3, 'CS204', '2025-2', 4, '09:00:00', '12:00:00', 'A302', 50),
(5, '作業系統', '陳老師', 3, 'CS205', '2025-2', 1, '13:00:00', '16:00:00', 'B101', 50),
(6, '計算機網路', '黃老師', 3, 'CS206', '2025-2', 3, '09:00:00', '12:00:00', 'B202', 50),
(7, '網頁程式設計', '吳老師', 3, 'CS207', '2025-2', 2, '13:00:00', '16:00:00', 'C101', 50),
(8, '軟體工程', '劉老師', 3, 'CS208', '2025-2', 4, '13:00:00', '16:00:00', 'C201', 50),
(9, '人工智慧導論', '蔡老師', 3, 'CS209', '2025-2', 5, '09:00:00', '12:00:00', 'A401', 50),
(10, '資訊管理', '楊老師', 3, 'CS210', '2025-2', 5, '13:00:00', '16:00:00', 'B301', 50),
(11, '大學英文', '林老師', 2, 'GE101', '2025-2', 2, '10:00:00', '12:00:00', 'D101', 60),
(12, '體育', '王老師', 2, 'GE102', '2025-2', 4, '10:00:00', '12:00:00', '體育館', 60);

INSERT INTO enrollments (student_id, course_id, semester, score, status) VALUES
(2, 1, '2025-2', NULL, 'enrolled'),
(3, 2, '2025-2', 92.00, 'enrolled'),
(4, 1, '2025-2', 68.00, 'enrolled'),
(4, 2, '2025-2', 81.00, 'enrolled'),
(5, 2, '2025-2', NULL, 'enrolled'),
(6, 1, '2025-2', 95.00, 'enrolled'),
(7, 1, '2025-2', 55.00, 'enrolled'),
(7, 2, '2025-2', 60.00, 'enrolled'),
(8, 2, '2025-2', 77.00, 'enrolled'),
(9, 1, '2025-2', NULL, 'enrolled'),
(10, 1, '2025-2', 89.00, 'enrolled'),
(10, 2, '2025-2', 91.00, 'enrolled'),
(1, 3, '2025-2', NULL, 'enrolled'),
(1, 4, '2025-2', NULL, 'enrolled'),
(1, 5, '2025-2', NULL, 'enrolled'),
(1, 6, '2025-2', NULL, 'enrolled'),
(1, 7, '2025-2', NULL, 'enrolled'),
(1, 8, '2025-2', NULL, 'enrolled'),
(1, 9, '2025-2', NULL, 'enrolled'),
(1, 10, '2025-2', NULL, 'enrolled'),
(1, 11, '2025-2', NULL, 'enrolled'),
(1, 1, '2025-2', 88.00, 'dropped'),
(1, 2, '2025-2', 75.00, 'dropped');

-- 漏洞4：內部主機（教務內網管理後台）明文SSH憑證
-- host 用容器服務名 target-internal，不寫死 IP：靠 Docker Compose 的服務 DNS 解析，
-- 每套 lab 各自一張網、各自解析到自己那台 target-internal，不必把 internal-net 釘死在
-- 某個網段。這樣一台主機才能同時跑很多套 lab（固定 IP 會讓每套 lab 搶同一個網段而衝突）。
INSERT INTO internal_hosts (label, host, ssh_user, ssh_password, note) VALUES
('教務內網管理主機', 'target-internal', 'admin', 'InternalAdm1n!23', '舊系統遷移時暫存，忘記清掉');
