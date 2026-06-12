import "dotenv/config";

const base = process.env.TEST_BASE_URL || "http://localhost:5000";
const pin = process.env.BLUSUKAN_PIN || "664599";
const jar = new Map();

function parseSetCookie(headers) {
  for (const line of headers.getSetCookie?.() ?? []) {
    const part = line.split(";")[0];
    const i = part.indexOf("=");
    if (i > 0) jar.set(part.slice(0, i), part.slice(i + 1));
  }
}

async function api(path, init = {}) {
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
    json = { _raw: text.slice(0, 120) };
  }
  return { status: res.status, json };
}

await api("/api/blusukan/auth/login", { method: "POST", body: JSON.stringify({ pin }) });
const list = await api("/api/blusukan/laporan");
console.log("laporan list:", list.status, Array.isArray(list.json) ? list.json.length : list.json);

if (!Array.isArray(list.json) || list.json.length === 0) {
  console.log("skip delete test — tidak ada laporan");
  process.exit(0);
}

const id = list.json[0].id;
const del = await api(`/api/blusukan/laporan/${id}`, { method: "DELETE" });
console.log("delete:", del.status, del.json);

const list2 = await api("/api/blusukan/laporan");
console.log("after delete:", list2.status, Array.isArray(list2.json) ? list2.json.length : list2.json);
