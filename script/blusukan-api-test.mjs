import "dotenv/config";

const base = process.env.TEST_BASE_URL || "http://localhost:5000";
const pin = process.env.BLUSUKAN_PIN || "664599";

const jar = new Map();

function parseSetCookie(headers) {
  const raw = headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const part = line.split(";")[0];
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i), part.slice(i + 1));
  }
}

async function fetchApi(path, init = {}) {
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  parseSetCookie(res.headers);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

const login = await fetchApi("/api/blusukan/auth/login", {
  method: "POST",
  body: JSON.stringify({ pin }),
});
console.log("login:", login.status, login.json);

for (const path of [
  "/api/blusukan/quest?status=aktif",
  "/api/blusukan/laporan",
  "/api/blusukan/ping",
  "/api/blusukan/cari?q=test",
]) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
    const res = await fetch(`${base}${path}`, {
      signal: ctrl.signal,
      headers: cookie ? { Cookie: cookie } : {},
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { _raw: text.slice(0, 120) };
    }
    console.log(
      path,
      res.status,
      Array.isArray(json) ? `array(${json.length})` : json,
    );
  } catch (e) {
    console.log(path, "ERROR", e instanceof Error ? e.message : e);
  } finally {
    clearTimeout(timer);
  }
}
