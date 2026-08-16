const API_BASE = "/api";

function getLoginUser() {
  const raw = localStorage.getItem("loginUser");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}

function requireLogin() {
  const user = getLoginUser();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem("loginUser");
  window.location.href = "login.html";
}

async function apiFetch(path, options = {}) {
  const user = getLoginUser();
  const headers = {
    "Content-Type": "application/json",
    ...(user && user.token ? { Authorization: "Bearer " + user.token } : {}),
    ...(options.headers || {}),
  };
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || body.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

function scoreToLetter(score) {
  if (score === null || score === undefined || score === "") return "—";
  const s = Number(score);
  if (s >= 90) return "A+";
  if (s >= 85) return "A";
  if (s >= 80) return "A-";
  if (s >= 77) return "B+";
  if (s >= 73) return "B";
  if (s >= 70) return "B-";
  if (s >= 67) return "C+";
  if (s >= 63) return "C";
  if (s >= 60) return "C-";
  return "F";
}

function scoreToGpaPoint(score) {
  if (score === null || score === undefined || score === "") return null;
  const s = Number(score);
  if (s >= 90) return 4.3;
  if (s >= 85) return 4.0;
  if (s >= 80) return 3.7;
  if (s >= 77) return 3.3;
  if (s >= 73) return 3.0;
  if (s >= 70) return 2.7;
  if (s >= 67) return 2.3;
  if (s >= 63) return 2.0;
  if (s >= 60) return 1.7;
  return 0;
}

function formatScore(score) {
  return score === null || score === undefined || score === "" ? "—" : Number(score).toFixed(0);
}
