const express = require("express");
const pool = require("./db");

const app = express();

app.use(express.json());

// ============================================================
// Health Check
// ============================================================

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "course-api"
  });
});

// ============================================================
// GET /api/course/list
//
// 網路選課使用
//
// 直接從 MySQL courses 讀取課程
// 不使用 localStorage
// 不寫死課程
// ============================================================

app.get("/list", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
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
      ORDER BY id
    `);

    res.json(rows);

  } catch (err) {
    console.error("GET /list failed:", err);

    res.status(500).json({
      error: "query_failed",
      detail: err.message
    });
  }
});

// ============================================================
// GET /api/course/:id
//
// 取得單一課程
// ============================================================

app.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(`
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
    `, [
      req.params.id
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: "not_found"
      });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error("GET /:id failed:", err);

    res.status(500).json({
      error: "query_failed",
      detail: err.message
    });
  }
});

// ============================================================
// Server
// ============================================================

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(
    `course-api listening on ${port}`
  );
});