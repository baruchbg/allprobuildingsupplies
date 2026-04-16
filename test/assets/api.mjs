/* api.mjs — single source of truth for all calls to the allpro-api Worker.
 *
 * The Worker exposes a plain REST surface (see worker/src/index.js). All
 * network traffic for the site — auth, products, users, orders, admin —
 * flows through the helpers in this file so every request can share:
 *   - X-Sandbox:  true when APBS_CONFIG.sandbox, so the Worker reads &
 *     writes to the sandbox D1 DB instead of production.
 *   - Authorization: Bearer <JWT>  for logged-in users.
 *   - X-Admin-Key: <key>  for admin panel writes (populated on PIN
 *     unlock, cleared on logout).
 *   - readOnly mode  — an extra safety net that short-circuits any
 *     non-GET request with a resolved stub if APBS_CONFIG.readOnly is on.
 */

const CFG       = () => (window.APBS_CONFIG || {});
const TOKEN_KEY = "apbs_token";
const ADMIN_KEY = "apbs_admin_key";

export const Session = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY) || "",
  setToken: (t) => t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY),
  getAdminKey: () => sessionStorage.getItem(ADMIN_KEY) || "",
  setAdminKey: (k) => k ? sessionStorage.setItem(ADMIN_KEY, k) : sessionStorage.removeItem(ADMIN_KEY)
};

export function isSandbox() { return CFG().sandbox === true; }
export function isReadOnly() { return CFG().readOnly === true; }

/* ---- Core fetch helper. Every API call goes through this. ---- */
async function apiFetch(path, { method = "GET", body, headers = {}, raw = false } = {}) {
  const base = CFG().API_URL;
  if (!base) throw new Error("APBS_CONFIG.API_URL not set");

  if (isReadOnly() && method !== "GET") {
    console.info("[readOnly] suppressed:", method, path);
    return { ok: true, readOnly: true };
  }

  const h = { "accept": "application/json", ...headers };
  if (body != null && !(body instanceof FormData) && !h["content-type"] && typeof body !== "string") {
    h["content-type"] = "application/json";
  }
  if (body != null && typeof body !== "string" && !(body instanceof FormData) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
  }
  if (isSandbox())         h["x-sandbox"]    = "true";
  if (Session.getToken())  h["authorization"] = "Bearer " + Session.getToken();
  if (Session.getAdminKey()) h["x-admin-key"] = Session.getAdminKey();

  const res = await fetch(base.replace(/\/+$/, "") + path, { method, headers: h, body });
  if (raw) return res;
  let data = null;
  try { data = await res.json(); } catch { /* swallow */ }
  if (!res.ok) {
    const msg = (data && data.error) || ("Request failed: " + res.status);
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data || {};
}

/* Short verbs */
export const api = {
  get:   (p, opts)     => apiFetch(p, { ...(opts || {}), method: "GET" }),
  post:  (p, body, o)  => apiFetch(p, { ...(o || {}), method: "POST",  body }),
  patch: (p, body, o)  => apiFetch(p, { ...(o || {}), method: "PATCH", body }),
  del:   (p, o)        => apiFetch(p, { ...(o || {}), method: "DELETE" }),
  raw:   (p, opts)     => apiFetch(p, { ...(opts || {}), raw: true })
};

/* ==========================================================
 * High-level convenience wrappers
 * ========================================================== */

/* Products */
export async function loadProducts() {
  const d = await api.get("/api/products");
  return { products: d.products || [] };
}
export async function createProduct(p)           { return api.post("/api/products", p); }
export async function updateProduct(code, size, patch) {
  const qs = "?code=" + encodeURIComponent(code) + "&size=" + encodeURIComponent(size || "");
  return api.patch("/api/products" + qs, patch);
}
export async function deleteProduct(code, size) {
  const qs = "?code=" + encodeURIComponent(code) + "&size=" + encodeURIComponent(size || "");
  return api.del("/api/products" + qs);
}
export async function importProductsCSV(csvText) {
  return api.post("/api/products/import", csvText, { headers: { "content-type": "text/csv" } });
}
export async function exportProductsCSV() {
  const res = await api.raw("/api/products/export");
  if (!res.ok) throw new Error("export failed: " + res.status);
  return res.text();
}

/* Users */
export async function loadUsers() {
  const d = await api.get("/api/users");
  return { users: d.users || [] };
}
export async function createUser(u)      { return api.post("/api/users", u); }
export async function updateUser(id, p)  { return api.patch("/api/users/" + encodeURIComponent(id), p); }
export async function deleteUser(id)     { return api.del("/api/users/" + encodeURIComponent(id)); }
export async function importUsers(users) { return api.post("/api/users/import", { users }); }
export async function exportUsers()      { return api.get("/api/users/export"); }

/* Orders */
export async function loadOrders(filters = {}) {
  const qs = new URLSearchParams(filters).toString();
  const d = await api.get("/api/orders" + (qs ? "?" + qs : ""));
  return { orders: d.orders || [] };
}
export async function loadMyOrders() {
  const d = await api.get("/api/orders?mine=1");
  return { orders: d.orders || [] };
}
export async function placeOrder(order)    { return api.post("/api/orders", order); }
export async function updateOrder(id, p)   { return api.patch("/api/orders/" + encodeURIComponent(id), p); }
export async function deleteOrder(id)      { return api.del("/api/orders/" + encodeURIComponent(id)); }
export async function exportOrdersCSV() {
  const res = await api.raw("/api/orders/export");
  if (!res.ok) throw new Error("export failed: " + res.status);
  return res.text();
}

/* Admin */
export async function adminVerifyPin(pin)  { return api.post("/api/admin/verify-pin", { pin }); }
export async function adminStats()         { return api.get("/api/admin/stats"); }
export async function adminAudit(limit)    { return api.get("/api/admin/audit" + (limit ? "?limit=" + limit : "")); }
export async function adminSeed(body)      { return api.post("/api/admin/seed", body); }
export async function adminWipe()          { return api.post("/api/admin/wipe", {}); }
export async function adminBackup() {
  const res = await api.raw("/api/admin/backup");
  if (!res.ok) throw new Error("backup failed: " + res.status);
  return res.text();
}

/* ==========================================================
 * Utility: CSV parse/stringify (kept for pages that still use them)
 * ========================================================== */
export function parseCSV(str) {
  const lines = [];
  let cur = [], s = "", inQ = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"') {
      if (inQ && str[i + 1] === '"') { s += '"'; i++; }
      else inQ = !inQ;
    } else if (c === "," && !inQ) { cur.push(s); s = ""; }
    else if ((c === "\n" || c === "\r") && !inQ) {
      if (c === "\r" && str[i + 1] === "\n") i++;
      cur.push(s); lines.push(cur); cur = []; s = "";
    } else { s += c; }
  }
  if (s !== "" || cur.length) { cur.push(s); lines.push(cur); }
  return lines;
}
export function stringifyCSV(rows) {
  return rows.map((r) => r.map((c) => {
    const s = String(c == null ? "" : c);
    return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
}

/* SHA-256 helper kept for legacy callers (not used by auth anymore) */
export async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
