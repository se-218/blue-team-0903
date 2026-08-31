const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("./db");
const transcriptPool = require("./db-transcript");

const app = express();

app.use(express.json());


// ============================================================
// HEALTH
// ============================================================

app.get("/health", (_req, res) => {

    res.json({
        status: "ok",
        service: "student-api"
    });

});


// ============================================================
// DUMMY HASH
// ============================================================

const DUMMY_HASH =
    "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q9auGz2VBUNzXe1KGusfBs0psJp/i";


// ============================================================
// AUTH
//
// login 之後所有個資相關 API 都要帶 Authorization: Bearer <token>，
// 且只能存取自己的資料（role=admin 除外）。之前的版本完全沒有這層檢查，
// 任何人不用登入就能直接用 curl 讀/改任何學生的資料。
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function authRequired(req, res, next) {

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "unauthorized" });
    }

    try {
        req.auth = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "invalid_token" });
    }

}

function ownerOrAdmin(req, res, next) {

    const targetId = Number(req.params.id);

    if (req.auth.role === "admin" || req.auth.id === targetId) {
        return next();
    }

    return res.status(403).json({ error: "forbidden" });

}


// ============================================================
// LOGIN
// POST /login
// ============================================================

app.post("/login", async (req, res) => {

    const {
        student_no,
        password
    } = req.body || {};


    if (!student_no || !password) {

        return res.status(400).json({
            error: "missing_fields"
        });

    }


    try {

        // ⚠️ 刻意漏洞（紅隊初始入侵點）：student_no 直接字串拼接進 SQL，未參數化。
        //    密碼仍以 bcrypt 驗證（正常登入照常運作）；student_no 為真實可注入點
        //    （UNION 撈資料、error-based 皆可，sqlmap 打得穿）。
        const sql =
            "SELECT id, student_no, name, department, phone, grade, email, role, password_hash, created_at "
            + "FROM users "
            + "WHERE student_no = '" + student_no + "'";

        const [rows] =
            await pool.query(sql);


        const user =
            rows[0];


        const matched =
            await bcrypt.compare(
                password,
                user
                    ? user.password_hash
                    : DUMMY_HASH
            );


        if (!user || !matched) {

            return res.status(401).json({
                error: "invalid_credentials"
            });

        }


        const token = jwt.sign(
            { id: user.id, student_no: user.student_no, role: user.role },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        res.json({

            id:
                user.id,

            student_no:
                user.student_no,

            name:
                user.name,

            department:
                user.department,

            phone:
                user.phone,

            grade:
                user.grade,

            email:
                user.email,

            role:
                user.role,

            created_at:
                user.created_at,

            token

        });


    } catch (err) {

        console.error(
            "POST /login failed:",
            err
        );


        res.status(500).json({

            error:
                "query_failed",

            detail:
                err.message

        });

    }

});


// ============================================================
// GET /:id
//
// 個人資訊
// ============================================================

app.get("/:id", authRequired, ownerOrAdmin, async (req, res) => {

    try {

        const [rows] =
            await pool.query(
                `
                SELECT
                    id,
                    student_no,
                    name,
                    department,
                    phone,
                    grade,
                    email,
                    role,
                    created_at
                FROM users
                WHERE id = ?
                  AND role = 'student'
                `,
                [req.params.id]
            );


        if (rows.length === 0) {

            return res.status(404).json({
                error: "not_found"
            });

        }


        res.json(rows[0]);


    } catch (err) {

        console.error(
            "GET /:id failed:",
            err
        );


        res.status(500).json({

            error:
                "query_failed",

            detail:
                err.message

        });

    }

});


// ============================================================
// PUT /:id
//
// 修改個人資訊
// ============================================================

app.put("/:id", authRequired, ownerOrAdmin, async (req, res) => {

    const {
        name,
        department,
        phone,
        grade,
        email
    } = req.body || {};


    if (!name || !name.trim()) {

        return res.status(400).json({
            error: "missing_name"
        });

    }


    try {

        const [result] =
            await pool.query(
                `
                UPDATE users
                SET
                    name = ?,
                    department = ?,
                    phone = ?,
                    grade = ?,
                    email = ?
                WHERE id = ?
                  AND role = 'student'
                `,
                [
                    name.trim(),
                    department || null,
                    phone || null,
                    grade || null,
                    email || null,
                    req.params.id
                ]
            );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                error: "not_found"
            });

        }


        const [rows] =
            await pool.query(
                `
                SELECT
                    id,
                    student_no,
                    name,
                    department,
                    phone,
                    grade,
                    email,
                    role,
                    created_at
                FROM users
                WHERE id = ?
                `,
                [req.params.id]
            );


        res.json(rows[0]);


    } catch (err) {

        console.error(
            "PUT /:id failed:",
            err
        );


        res.status(500).json({

            error:
                "query_failed",

            detail:
                err.message

        });

    }

});


// ============================================================
// GET /:id/courses
//
// 我的課程 / 我的課表 / 成績查詢
//
// 只顯示目前 status = enrolled 的課程
// ============================================================

app.get("/:id/courses", authRequired, ownerOrAdmin, async (req, res) => {

    try {

        const [rows] =
            await pool.query(
                `
                SELECT
                    c.id,
                    c.name,
                    c.course_code,
                    c.teacher,
                    c.credits,
                    c.semester AS course_semester,
                    c.day_of_week,
                    c.start_time,
                    c.end_time,
                    c.classroom,
                    c.capacity,
                    e.semester,
                    e.score,
                    e.status,
                    e.created_at
                FROM enrollments e
                JOIN courses c
                    ON c.id = e.course_id
                WHERE e.student_id = ?
                  AND e.status = 'enrolled'
                ORDER BY
                    c.day_of_week IS NULL,
                    c.day_of_week,
                    c.start_time IS NULL,
                    c.start_time,
                    c.id
                `,
                [req.params.id]
            );


        res.json(rows);


    } catch (err) {

        console.error(
            "GET /:id/courses failed:",
            err
        );


        res.status(500).json({

            error:
                "query_failed",

            detail:
                err.message

        });

    }

});


// ============================================================
// POST /:id/courses
//
// 網路選課：加選
//
// 規則：
//
// 1. 學生必須存在
// 2. 課程必須存在
// 3. 課程不能額滿
// 4. 已 enrolled → already_enrolled
// 5. 新課程不能和目前已選課程衝堂
// 6. dropped → 可以重新恢復 enrolled
// 7. 新課程 → INSERT
//
// 固定時間來源：
// courses.day_of_week
// courses.start_time
// courses.end_time
// ============================================================

app.post("/:id/courses", authRequired, ownerOrAdmin, async (req, res) => {

    const {
        course_id
    } = req.body || {};


    if (!course_id) {

        return res.status(400).json({
            error: "missing_course_id"
        });

    }


    const connection =
        await pool.getConnection();


    try {

        await connection.beginTransaction();


        // ======================================================
        // 1. 確認學生
        // ======================================================

        const [studentRows] =
            await connection.query(
                `
                SELECT
                    id
                FROM users
                WHERE id = ?
                  AND role = 'student'
                `,
                [req.params.id]
            );


        if (studentRows.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                error: "student_not_found"
            });

        }


        // ======================================================
        // 2. 取得課程
        //
        // FOR UPDATE
        // 避免同一時間被其他交易修改
        // ======================================================

        const [courseRows] =
            await connection.query(
                `
                SELECT
                    id,
                    name,
                    course_code,
                    teacher,
                    credits,
                    semester,
                    day_of_week,
                    start_time,
                    end_time,
                    classroom,
                    capacity
                FROM courses
                WHERE id = ?
                FOR UPDATE
                `,
                [course_id]
            );


        if (courseRows.length === 0) {

            await connection.rollback();

            return res.status(404).json({
                error: "course_not_found"
            });

        }


        const course =
            courseRows[0];


        // ======================================================
        // 3. 檢查學生是否已經有這門課
        //
        // FOR UPDATE：
        // 如果存在，鎖住 enrollment
        // ======================================================

        const [existingRows] =
            await connection.query(
                `
                SELECT
                    student_id,
                    course_id,
                    semester,
                    score,
                    status,
                    created_at
                FROM enrollments
                WHERE student_id = ?
                  AND course_id = ?
                FOR UPDATE
                `,
                [
                    req.params.id,
                    course_id
                ]
            );


        // ======================================================
        // 4. 已經 enrolled
        //
        // 不允許重複選課
        // ======================================================

        if (
            existingRows.length > 0 &&
            existingRows[0].status === "enrolled"
        ) {

            await connection.rollback();

            return res.status(409).json({
                error: "already_enrolled"
            });

        }


        // ======================================================
        // 5. 檢查目前選課人數
        //
        // 只計算 enrolled
        // dropped 不算
        // ======================================================

        const [countRows] =
            await connection.query(
                `
                SELECT
                    COUNT(*) AS count
                FROM enrollments
                WHERE course_id = ?
                  AND status = 'enrolled'
                `,
                [course_id]
            );


        const enrolledCount =
            Number(
                countRows[0].count
            );


        if (
            course.capacity !== null &&
            enrolledCount >=
                Number(course.capacity)
        ) {

            await connection.rollback();

            return res.status(409).json({
                error: "course_full"
            });

        }


        // ======================================================
        // 6. 檢查時間衝堂
        //
        // 固定使用資料庫：
        //
        // day_of_week
        // start_time
        // end_time
        //
        // 時間重疊判斷：
        //
        // 舊課 start < 新課 end
        // &&
        // 舊課 end > 新課 start
        //
        // 例如：
        //
        // 舊課 09:00 - 12:00
        // 新課 10:00 - 11:00
        //
        // → 衝堂
        //
        // 舊課 09:00 - 12:00
        // 新課 11:00 - 13:00
        //
        // → 衝堂
        //
        // 舊課 09:00 - 12:00
        // 新課 12:00 - 15:00
        //
        // → 不衝堂
        // ======================================================

        if (
            course.day_of_week !== null &&
            course.day_of_week !== undefined &&
            course.start_time &&
            course.end_time
        ) {

            const [conflictRows] =
                await connection.query(
                    `
                    SELECT
                        c.id,
                        c.name,
                        c.course_code,
                        c.day_of_week,
                        c.start_time,
                        c.end_time
                    FROM enrollments e
                    JOIN courses c
                        ON c.id = e.course_id
                    WHERE e.student_id = ?
                      AND e.status = 'enrolled'
                      AND c.day_of_week = ?
                      AND c.start_time < ?
                      AND c.end_time > ?
                    ORDER BY
                        c.start_time,
                        c.id
                    LIMIT 1
                    `,
                    [
                        req.params.id,
                        course.day_of_week,
                        course.end_time,
                        course.start_time
                    ]
                );


            if (conflictRows.length > 0) {

                const conflict =
                    conflictRows[0];


                await connection.rollback();


                return res.status(409).json({

                    error:
                        "schedule_conflict",

                    message:
                        "課程時間衝堂",

                    conflict: {

                        id:
                            conflict.id,

                        name:
                            conflict.name,

                        course_code:
                            conflict.course_code,

                        day_of_week:
                            conflict.day_of_week,

                        start_time:
                            conflict.start_time,

                        end_time:
                            conflict.end_time

                    }

                });

            }

        }


        // ======================================================
        // 7. 如果以前 dropped
        //
        // 不新增第二筆
        //
        // 原本：
        //
        // student_id = 1
        // course_id = 1
        // status = dropped
        //
        // 變成：
        //
        // status = enrolled
        // ======================================================

        if (
            existingRows.length > 0 &&
            existingRows[0].status === "dropped"
        ) {

            await connection.query(
                `
                UPDATE enrollments
                SET
                    status = 'enrolled',
                    semester = ?,
                    created_at = CURRENT_TIMESTAMP
                WHERE student_id = ?
                  AND course_id = ?
                `,
                [
                    course.semester,
                    req.params.id,
                    course_id
                ]
            );


            await connection.commit();


            const [restoredRows] =
                await pool.query(
                    `
                    SELECT
                        student_id,
                        course_id,
                        semester,
                        score,
                        status,
                        created_at
                    FROM enrollments
                    WHERE student_id = ?
                      AND course_id = ?
                    `,
                    [
                        req.params.id,
                        course_id
                    ]
                );


            const enrollment =
                restoredRows[0];


            return res.status(200).json({

                ...course,

                semester:
                    enrollment.semester,

                score:
                    enrollment.score,

                status:
                    enrollment.status,

                created_at:
                    enrollment.created_at

            });

        }


        // ======================================================
        // 8. 新增 enrollment
        // ======================================================

        await connection.query(
            `
            INSERT INTO enrollments
            (
                student_id,
                course_id,
                semester,
                status,
                created_at
            )
            VALUES
            (
                ?,
                ?,
                ?,
                'enrolled',
                CURRENT_TIMESTAMP
            )
            `,
            [
                req.params.id,
                course_id,
                course.semester
            ]
        );


        await connection.commit();


        // ======================================================
        // 9. 重新查詢剛新增的資料
        // ======================================================

        const [insertedRows] =
            await pool.query(
                `
                SELECT
                    student_id,
                    course_id,
                    semester,
                    score,
                    status,
                    created_at
                FROM enrollments
                WHERE student_id = ?
                  AND course_id = ?
                `,
                [
                    req.params.id,
                    course_id
                ]
            );


        const enrollment =
            insertedRows[0];


        // ======================================================
        // 10. 回傳成功
        // ======================================================

        return res.status(201).json({

            ...course,

            semester:
                enrollment.semester,

            score:
                enrollment.score,

            status:
                enrollment.status,

            created_at:
                enrollment.created_at

        });


    } catch (err) {

        try {
            await connection.rollback();
        } catch (_) {
            // transaction 可能已經 commit / rollback
        }


        console.error(
            "POST /:id/courses failed:",
            err
        );


        return res.status(500).json({

            error:
                "query_failed",

            detail:
                err.message

        });

    } finally {

        connection.release();

    }

});


// ============================================================
// DELETE /:id/courses/:courseId
//
// 退選
//
// 不刪除資料
// 改成 status = dropped
// ============================================================

app.delete(
    "/:id/courses/:courseId",
    authRequired,
    ownerOrAdmin,
    async (req, res) => {

        try {

            const [result] =
                await pool.query(
                    `
                    UPDATE enrollments
                    SET
                        status = 'dropped'
                    WHERE student_id = ?
                      AND course_id = ?
                      AND status = 'enrolled'
                    `,
                    [
                        req.params.id,
                        req.params.courseId
                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    error: "not_enrolled"
                });

            }


            const [rows] =
                await pool.query(
                    `
                    SELECT
                        student_id,
                        course_id,
                        semester,
                        score,
                        status,
                        created_at
                    FROM enrollments
                    WHERE student_id = ?
                      AND course_id = ?
                    `,
                    [
                        req.params.id,
                        req.params.courseId
                    ]
                );


            res.json({

                success:
                    true,

                enrollment:
                    rows[0]

            });


        } catch (err) {

            console.error(
                "DELETE /:id/courses/:courseId failed:",
                err
            );


            res.status(500).json({

                error:
                    "query_failed",

                detail:
                    err.message

            });

        }

    }
);


// ============================================================
// TRANSCRIPTS（歷史成績單）
//
// 成績單存在 blue-b（target-internal）的獨立 MySQL，只被授權從 172.29.% 連線，
// 所以只有這台 blue-a 讀得到（見 db-transcript.js）。box2 的成績表刻意只存
// student_id / course_id / semester / score / letter_grade / grade_point ——
// 不重複存課程名稱／老師／學分，那些是課程主庫的事。所以這裡先向 blue-b 拿成績，
// 再用本機 campus_db.courses 補課程中繼資料，合併後回給前端。
//
// 這是紅隊改成績攻擊鏈的「顯示端」：紅隊在 blue-b 改了 transcripts 的分數，
// 來賓在校園網成績頁看到的分數就會跟著變。
// ============================================================

app.get("/:id/transcripts", authRequired, ownerOrAdmin, async (req, res) => {

    if (!transcriptPool) {
        return res.status(503).json({
            error: "transcript_db_unavailable"
        });
    }

    try {

        const [rows] =
            await transcriptPool.query(
                `
                SELECT
                    course_id,
                    semester,
                    score,
                    letter_grade,
                    grade_point
                FROM transcripts
                WHERE student_id = ?
                ORDER BY semester DESC, course_id
                `,
                [req.params.id]
            );


        if (rows.length === 0) {
            return res.json([]);
        }


        // 補課程中繼資料：成績表只有 course_id，名稱／老師／學分向本機課程主庫查。
        const courseIds =
            [...new Set(rows.map((r) => r.course_id))];

        const [courses] =
            await pool.query(
                `
                SELECT id, name, teacher, credits
                FROM courses
                WHERE id IN (?)
                `,
                [courseIds]
            );

        const byId =
            new Map(courses.map((c) => [c.id, c]));


        const merged =
            rows.map((r) => {

                const c = byId.get(r.course_id) || {};

                return {
                    id: r.course_id,
                    name: c.name || `課程 ${r.course_id}`,
                    teacher: c.teacher ?? null,
                    credits: c.credits ?? null,
                    semester: r.semester,
                    score: r.score,
                    letter_grade: r.letter_grade,
                    grade_point: r.grade_point,
                };

            });


        res.json(merged);


    } catch (err) {

        console.error(
            "GET /:id/transcripts failed:",
            err
        );


        res.status(503).json({
            error: "transcript_query_failed"
        });

    }

});


// ============================================================
// SERVER
// ============================================================

const port =
    Number(
        process.env.PORT || 3000
    );


app.listen(port, () => {

    console.log(
        `student-api listening on ${port}`
    );

});