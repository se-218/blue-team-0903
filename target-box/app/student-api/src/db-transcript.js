const fs = require("fs");
const mysql = require("mysql2/promise");

// box2（blue-b / target-internal）的 installer 跑完後，只有 box1（這台 blue-a）會
// 收到成績庫的連線憑證，寫在這個檔案裡（mode 600，見 deploy/campus/box2 的說明）。
// 帳號只被授權從 172.29.%（藍隊 internal 網段）連線 —— 也就是只有 blue-a 連得到。
//
// 檔案不存在 = box2 還沒部署、或這是純 box1 的開發環境：pool 給 null，transcript
// 端點會回 503 而不是讓整支 API crash。成績庫在遠端 blue-b，跟本機 campus_db 是
// 兩台不同的 MySQL，所以另開一個 pool，不共用 ./db。
const CRED_PATH =
  process.env.TRANSCRIPT_CREDENTIALS_PATH ||
  "/opt/portal/transcript-db.credentials";

function readCredentials(path) {
  let text;
  try {
    text = fs.readFileSync(path, "utf8");
  } catch (_err) {
    return null;
  }
  const cfg = {};
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s || s.startsWith("#")) continue;
    const eq = s.indexOf("=");
    if (eq <= 0) continue;
    cfg[s.slice(0, eq).trim()] = s.slice(eq + 1).trim();
  }
  return cfg;
}

const cred = readCredentials(CRED_PATH);

const transcriptPool =
  cred && cred.TRANSCRIPT_DB_USER
    ? mysql.createPool({
        host: cred.TRANSCRIPT_DB_HOST || "target-internal",
        port: Number(cred.TRANSCRIPT_DB_PORT || 3306),
        user: cred.TRANSCRIPT_DB_USER,
        password: cred.TRANSCRIPT_DB_PASSWORD || "",
        database: cred.TRANSCRIPT_DB_NAME || "transcripts_db",

        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,

        charset: "utf8mb4",
      })
    : null;

if (!transcriptPool) {
  console.warn(
    "[transcript] no credentials at " +
      CRED_PATH +
      " — transcript endpoint will return 503"
  );
}

module.exports = transcriptPool;
