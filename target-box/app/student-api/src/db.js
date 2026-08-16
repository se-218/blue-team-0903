const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "mysql",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || "campus",
  password: process.env.MYSQL_PASSWORD || "campus",
  database: process.env.MYSQL_DATABASE || "campus_db",

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  charset: "utf8mb4"
});

module.exports = pool;