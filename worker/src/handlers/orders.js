import { err, ok, readJson } from "../http.js";
import { pickDB, all, first, run, audit } from "../db.js";
import { requireUser } from "./auth.js";
import { checkAdminKey } from "../auth.js";

function toApi(r) {
  const blob = r.data ? JSON.parse(r.data) : {};
  return {
    id: r.id,
    userEmail: r.user_email,
    status: r.status,
    total: r.total,
    placedAt: new Date(r.placed_at).toISOString(),
    ...blob
  };
}

/* GET /api/orders            (admin-key required, returns ALL)
 * GET /api/orders?mine=1     (JWT required, returns own)
 * Optional filters: ?status=pending  ?email=foo@bar.com  ?from=ms&to=ms
 */
export async function list(req, env, isAdmin) {
  const url = new URL(req.url);
  const db = pickDB(req, env);
  const where = [];
  const params = [];

  if (url.searchParams.get("mine") === "1" || !isAdmin) {
    const who = await requireUser(req, env);
    if (!who.ok) return who.res;
    where.push("user_email = ?"); params.push(who.payload.email);
  } else {
    const email = url.searchParams.get("email");
    if (email) { where.push("user_email = ?"); params.push(email.toLowerCase()); }
  }

  const status = url.searchParams.get("status");
  if (status) { where.push("status = ?"); params.push(status); }

  const from = url.searchParams.get("from");
  const to   = url.searchParams.get("to");
  if (from) { where.push("placed_at >= ?"); params.push(parseInt(from, 10)); }
  if (to)   { where.push("placed_at <= ?"); params.push(parseInt(to, 10)); }

  const sql = `SELECT * FROM orders ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY placed_at DESC`;
  const rows = await all(db, sql, ...params);
  return ok({ orders: rows.map(toApi) });
}

/* POST /api/orders  (JWT)  body is the full order blob
 * Transactionally inserts the order and deducts inventory.
 */
export async function create(req, env) {
  // Either a logged-in user (JWT) OR an admin placing an order on their
  // behalf (X-Admin-Key) can create orders. Admins must supply
  // customer.email in the body so we can record who the order belongs to.
  const isAdmin = checkAdminKey(req, env);
  let userEmail = "";
  if (!isAdmin) {
    const who = await requireUser(req, env);
    if (!who.ok) return who.res;
    userEmail = (who.payload.email || "").toLowerCase();
  }

  const b = await readJson(req);
  if (!b || !Array.isArray(b.items) || !b.items.length) return err(400, "items required");
  if (!b.total || !b.customer || !b.delivery) return err(400, "customer, delivery, total required");
  if (isAdmin) {
    userEmail = String(b.customer?.email || "").toLowerCase();
    if (!userEmail) return err(400, "customer.email required for admin-created orders");
  }

  const db = pickDB(req, env);
  const id = b.id || ("APB-" + Math.random().toString(36).slice(2, 10).toUpperCase());
  const placedAt = b.placedAt ? Date.parse(b.placedAt) : Date.now();
  const status = b.status || "pending";

  const stmts = [
    db.prepare(
      `INSERT INTO orders (id, user_email, status, total, placed_at, data) VALUES (?,?,?,?,?,?)`
    ).bind(id, userEmail, status, Number(b.total), placedAt, JSON.stringify({
      customer: b.customer, delivery: b.delivery, items: b.items,
      notes: b.notes || "", po: b.po || "", total: Number(b.total),
      placedAt: new Date(placedAt).toISOString(), status
    }))
  ];

  for (const item of b.items) {
    const qty = Number(item.qty);
    const pcs = Number(item.pcsPerCtn || 1);
    const isPiece = item.unit === "piece";
    const deduct  = isPiece ? (qty / (pcs || 1)) : qty;
    stmts.push(
      db.prepare(`UPDATE products SET qty = MAX(0, qty - ?), updated_at = ? WHERE code=? AND size=?`)
        .bind(deduct, placedAt, item.code, String(item.size || ""))
    );
  }

  await db.batch(stmts);
  await audit(db, isAdmin ? "admin" : userEmail, "order.create", id, { total: b.total, items: b.items.length, admin: isAdmin });
  const row = await first(db, "SELECT * FROM orders WHERE id = ?", id);
  return ok({ order: toApi(row) });
}

/* PATCH /api/orders/:id  (admin)  body can mutate status + data */
export async function update(req, env, id) {
  const b = await readJson(req);
  if (!b) return err(400, "body required");
  const db = pickDB(req, env);
  const existing = await first(db, "SELECT * FROM orders WHERE id = ?", id);
  if (!existing) return err(404, "Order not found");
  const blob = existing.data ? JSON.parse(existing.data) : {};
  const merged = { ...blob, ...b };
  const status = b.status || existing.status;
  const total  = (b.total != null) ? Number(b.total) : existing.total;
  await run(db,
    `UPDATE orders SET status = ?, total = ?, data = ? WHERE id = ?`,
    status, total, JSON.stringify(merged), id
  );
  await audit(db, "admin", "order.update", id, b);
  const row = await first(db, "SELECT * FROM orders WHERE id = ?", id);
  return ok({ order: toApi(row) });
}

/* DELETE /api/orders/:id  (admin) */
export async function remove(req, env, id) {
  const db = pickDB(req, env);
  const res = await run(db, "DELETE FROM orders WHERE id = ?", id);
  if (!res.meta.changes) return err(404, "Order not found");
  await audit(db, "admin", "order.delete", id, null);
  return ok();
}

/* GET /api/orders/export  (admin) -> CSV flattened */
export async function exportCsv(req, env) {
  const db = pickDB(req, env);
  const rows = await all(db, "SELECT * FROM orders ORDER BY placed_at DESC");
  const header = "Order ID,Placed,Status,Email,Customer,Company,Phone,Method,Address,Items,Total,PO,Notes";
  const lines = [header];
  for (const r of rows) {
    const d = r.data ? JSON.parse(r.data) : {};
    const c = d.customer || {};
    const del = d.delivery || {};
    lines.push([
      r.id, new Date(r.placed_at).toISOString(), r.status,
      r.user_email || "", c.name || "", c.company || "", c.phone || "",
      del.method || "", del.address || "",
      (d.items || []).length,
      r.total, d.po || "", d.notes || ""
    ].map(csvCell).join(","));
  }
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="orders.csv"'
    }
  });
}
function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
