/* api.mjs — single source of truth for all Cloudflare Worker / GitHub
 * Contents API traffic. Every page used to duplicate fetch+atob+btoa
 * boilerplate and its own CSV parser; now everything goes through here.
 *
 * Sandbox safety:
 *   - GETs always hit the real worker so /test/ can display live
 *     products, users, and orders. Reads are harmless.
 *   - PUTs are suppressed whenever APBS_CONFIG.sandbox === true. The
 *     write is logged to the console and resolves with { sandbox:true }
 *     so the UI behaves as if the save succeeded, but production data
 *     is never mutated.
 */
const CFG = () => (window.APBS_CONFIG || {});
const isSandboxMode = () => CFG().sandbox === true;
const hasWorker = (u) => !!u && !/SANDBOX|example\.workers\.dev/i.test(u);

function decodeContent(b64) {
  if (!b64) return "";
  return decodeURIComponent(escape(atob(String(b64).replace(/\n/g, ""))));
}
function encodeContent(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

/* ---- CSV ---- */
export function parseCSV(str) {
  const lines = [];
  let curLine = [], curStr = "", inQ = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"') {
      if (inQ && str[i + 1] === '"') { curStr += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) {
      curLine.push(curStr); curStr = "";
    } else if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && str[i + 1] === "\n") i++;
      curLine.push(curStr); lines.push(curLine); curLine = []; curStr = "";
    } else {
      curStr += c;
    }
  }
  if (curStr !== "" || curLine.length > 0) { curLine.push(curStr); lines.push(curLine); }
  return lines;
}
export function stringifyCSV(rows) {
  return rows.map((row) => row.map((cell) => {
    const s = String(cell == null ? "" : cell);
    return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
}

/* ---- Sandbox placeholder payloads ---- */
const EMPTY = {
  "products.csv": "Code,Description,Size,Pack,Qty,Price,Image\n",
  "users.json":   JSON.stringify({ users: [] }, null, 2),
  "orders.json":  JSON.stringify({ orders: [] }, null, 2)
};
function placeholderGet(path) {
  const content = EMPTY[path] != null ? EMPTY[path] : "";
  return { content: encodeContent(content), sha: "sandbox-sha-" + path };
}

/* ---- Low-level fetch ---- */
async function ghGet(path) {
  const base = CFG().WORKER_URL;
  if (!hasWorker(base)) {
    console.info("[sandbox] api GET", path, "→ no worker configured, empty payload");
    return placeholderGet(path);
  }
  const r = await fetch(base + "/github/" + path);
  if (!r.ok) throw new Error("GET " + path + " failed: " + r.status);
  return r.json();
}
async function ghPut(path, content, sha, message) {
  const base = CFG().WORKER_URL;
  const payload = {
    message: message || "Update " + path,
    content: encodeContent(content),
    branch: "main",
    ...(sha ? { sha } : {})
  };
  if (isSandboxMode() || !hasWorker(base)) {
    console.info("[sandbox] api PUT suppressed:", path, {
      message: payload.message,
      bytes: content.length
    });
    return { ok: true, sandbox: true, content: { sha: sha || "sandbox-sha-" + path } };
  }
  const r = await fetch(base + "/github/" + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!r.ok) {
    let err = { message: r.status };
    try { err = await r.json(); } catch {}
    throw new Error(err.message || "PUT " + path + " failed");
  }
  return r.json();
}

/* ---- High-level typed helpers ---- */
export async function loadProducts() {
  const d = await ghGet("products.csv");
  const csv = decodeContent(d.content);
  const rows = parseCSV(csv);
  return { sha: d.sha, rows, csv };
}
export async function saveProductsCSV(rows, sha) {
  return ghPut("products.csv", stringifyCSV(rows), sha, "Admin: Update products.csv");
}

export async function loadUsers() {
  const d = await ghGet("users.json");
  const raw = decodeContent(d.content) || '{"users":[]}';
  const users = (JSON.parse(raw).users) || [];
  return { sha: d.sha, users };
}
export async function saveUsers(users, sha, message) {
  return ghPut("users.json", JSON.stringify({ users }, null, 2), sha, message || "Update users.json");
}

export async function loadOrders() {
  const d = await ghGet("orders.json");
  const raw = decodeContent(d.content) || '{"orders":[]}';
  const orders = (JSON.parse(raw).orders) || [];
  return { sha: d.sha, orders };
}
export async function saveOrders(orders, sha, message) {
  return ghPut("orders.json", JSON.stringify({ orders }, null, 2), sha, message || "Update orders.json");
}

export function isSandbox() {
  return isSandboxMode();
}

/* ---- SHA-256 (shared by auth) ---- */
export async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
