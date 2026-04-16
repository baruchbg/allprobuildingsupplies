import { err, ok, readJson } from "../http.js";
import { pickDB, first, all, run, audit } from "../db.js";
import { hashPassword } from "../auth.js";

/* POST /api/admin/verify-pin  { pin } -> { adminKey } */
export async function verifyPin(req, env) {
  const b = await readJson(req);
  if (!b || !b.pin) return err(400, "pin required");
  if (b.pin !== (env.ADMIN_PIN || "")) return err(401, "Incorrect PIN");
  return ok({ adminKey: env.ADMIN_KEY });
}

/* GET /api/admin/stats */
export async function stats(req, env) {
  const db = pickDB(req, env);
  const [u, p, o, pend, appr] = await Promise.all([
    first(db, "SELECT COUNT(*) AS n FROM users"),
    first(db, "SELECT COUNT(*) AS n FROM products"),
    first(db, "SELECT COUNT(*) AS n FROM orders"),
    first(db, "SELECT COUNT(*) AS n FROM users WHERE status = 'pending'"),
    first(db, "SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'")
  ]);
  const inv = await first(db, "SELECT COALESCE(SUM(qty),0) AS q FROM products");
  return ok({
    users: u?.n || 0,
    products: p?.n || 0,
    orders: o?.n || 0,
    pendingUsers: pend?.n || 0,
    pendingOrders: appr?.n || 0,
    totalInventory: inv?.q || 0
  });
}

/* GET /api/admin/audit?limit=50 */
export async function auditLog(req, env) {
  const url = new URL(req.url);
  const limit = Math.min(500, parseInt(url.searchParams.get("limit") || "100", 10));
  const db = pickDB(req, env);
  const rows = await all(db, "SELECT * FROM audit_log ORDER BY ts DESC LIMIT ?", limit);
  return ok({ entries: rows.map((r) => ({ ...r, meta: r.meta ? JSON.parse(r.meta) : null })) });
}

/* POST /api/admin/seed  { users?, products? (csv string), orders? } - one-shot import
 * Idempotent: deletes then re-inserts the targeted tables.
 */
export async function seed(req, env) {
  const b = await readJson(req);
  if (!b) return err(400, "body required");
  const db = pickDB(req, env);
  const stmts = [];
  let uCount = 0, pCount = 0, oCount = 0;

  if (Array.isArray(b.users)) {
    stmts.push(db.prepare("DELETE FROM users"));
    for (const u of b.users) {
      const isSha = u.password && u.password.length === 64 && /^[0-9a-f]+$/i.test(u.password);
      const hash = u.password ? (isSha ? u.password : await hashPassword(u.password)) : "!";
      const algo = isSha ? "sha256" : "pbkdf2";
      stmts.push(db.prepare(
        `INSERT INTO users (id,email,fname,lname,company,phone,password_hash,password_algo,status,can_order_pieces,added_by_admin,registered_at,approved_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        u.id || Date.now().toString() + Math.random().toString(36).slice(2, 6),
        String(u.email || "").toLowerCase(),
        u.fname || "", u.lname || "", u.company || "", u.phone || "",
        hash, algo,
        u.status || "pending",
        u.canOrderPieces === false ? 0 : 1,
        u.addedByAdmin ? 1 : 0,
        u.registeredAt || new Date().toISOString(),
        u.approvedAt || null
      ));
      uCount++;
    }
  }

  if (typeof b.products === "string" && b.products.trim()) {
    const rows = parseCSV(b.products);
    if (rows.length > 1) {
      const header = rows[0].map((h) => String(h).trim().toLowerCase());
      const cI = header.indexOf("code"), dI = header.indexOf("description"),
            sI = header.indexOf("size"), pkI = header.indexOf("pack"),
            qI = header.indexOf("qty"), prI = header.indexOf("price"),
            imI = header.indexOf("image");
      stmts.push(db.prepare("DELETE FROM products"));
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || (r.length === 1 && !r[0])) continue;
        const code = (r[cI] || "").trim();
        if (!code) continue;
        stmts.push(db.prepare(
          `INSERT INTO products (code,description,size,pack,qty,price,image,updated_at) VALUES (?,?,?,?,?,?,?,?)`
        ).bind(
          code,
          dI >= 0 ? (r[dI] || "") : "",
          sI >= 0 ? String(r[sI] || "") : "",
          pkI >= 0 ? intOr0(r[pkI]) : 0,
          qI >= 0 ? intOr0(r[qI]) : 0,
          prI >= 0 ? floatOr0(r[prI]) : 0,
          imI >= 0 ? (r[imI] || "") : "",
          Date.now()
        ));
        pCount++;
      }
    }
  }

  if (Array.isArray(b.orders)) {
    stmts.push(db.prepare("DELETE FROM orders"));
    for (const o of b.orders) {
      const placedAt = o.placedAt ? Date.parse(o.placedAt) : Date.now();
      stmts.push(db.prepare(
        `INSERT INTO orders (id,user_email,status,total,placed_at,data) VALUES (?,?,?,?,?,?)`
      ).bind(
        o.id,
        (o.customer && o.customer.email ? String(o.customer.email).toLowerCase() : null),
        o.status || "pending",
        Number(o.total || 0),
        placedAt,
        JSON.stringify(o)
      ));
      oCount++;
    }
  }

  if (!stmts.length) return err(400, "nothing to seed");
  await db.batch(stmts);
  await audit(db, "admin", "seed", null, { users: uCount, products: pCount, orders: oCount });
  return ok({ users: uCount, products: pCount, orders: oCount });
}

/* POST /api/admin/wipe  (admin, sandbox only)  - clears all tables */
export async function wipe(req, env) {
  if (req.headers.get("x-sandbox") !== "true") return err(403, "wipe only allowed on sandbox DB");
  const db = pickDB(req, env);
  await db.batch([
    db.prepare("DELETE FROM orders"),
    db.prepare("DELETE FROM products"),
    db.prepare("DELETE FROM users"),
    db.prepare("DELETE FROM audit_log")
  ]);
  return ok();
}

/* GET /api/admin/backup - full JSON snapshot */
export async function backup(req, env) {
  const db = pickDB(req, env);
  const [users, products, orders] = await Promise.all([
    all(db, "SELECT * FROM users"),
    all(db, "SELECT * FROM products"),
    all(db, "SELECT * FROM orders")
  ]);
  const hydrated = orders.map((r) => ({
    id: r.id, status: r.status, total: r.total,
    placedAt: new Date(r.placed_at).toISOString(),
    userEmail: r.user_email,
    ...(r.data ? JSON.parse(r.data) : {})
  }));
  return new Response(JSON.stringify({ users, products, orders: hydrated }, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`
    }
  });
}

/* ----- CSV helpers (mirrored from products handler) ----- */
function parseCSV(str) {
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
function intOr0(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
function floatOr0(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
