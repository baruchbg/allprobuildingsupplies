import { json, err, ok, readJson } from "../http.js";
import { pickDB, all, first, run, audit } from "../db.js";
import { hashPassword } from "../auth.js";
import { publicUser } from "./auth.js";

/* GET /api/users  (admin) */
export async function list(req, env) {
  const db = pickDB(req, env);
  const rows = await all(db, "SELECT * FROM users ORDER BY registered_at DESC");
  return ok({ users: rows.map(publicUser) });
}

/* POST /api/users  (admin)  { fname,lname,email,password,company?,phone?,status?,canOrderPieces? } */
export async function create(req, env) {
  const b = await readJson(req);
  if (!b || !b.email || !b.password || !b.fname || !b.lname) return err(400, "fname, lname, email, password required");
  const db = pickDB(req, env);
  const email = String(b.email).toLowerCase().trim();
  const dupe = await first(db, "SELECT id FROM users WHERE email = ?", email);
  if (dupe) return err(409, "Email already exists");

  const id = Date.now().toString();
  const nowIso = new Date().toISOString();
  const hash = await hashPassword(b.password);
  await run(db,
    `INSERT INTO users (id, email, fname, lname, company, phone, password_hash, password_algo, status, can_order_pieces, added_by_admin, registered_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', ?, ?, 1, ?, ?)`,
    id, email, b.fname.trim(), b.lname.trim(), (b.company || "").trim(), (b.phone || "").trim(), hash,
    b.status || "approved",
    b.canOrderPieces === false ? 0 : 1,
    nowIso,
    (b.status === "approved") ? nowIso : null
  );
  await audit(db, "admin", "user.create", id, { email });
  const u = await first(db, "SELECT * FROM users WHERE id = ?", id);
  return ok({ user: publicUser(u) });
}

/* PATCH /api/users/:id  (admin)  any subset of editable fields */
export async function update(req, env, id) {
  const b = await readJson(req);
  if (!b) return err(400, "body required");
  const db = pickDB(req, env);
  const existing = await first(db, "SELECT * FROM users WHERE id = ?", id);
  if (!existing) return err(404, "User not found");

  const fields = [];
  const vals = [];
  const mapping = {
    fname: "fname", lname: "lname", company: "company", phone: "phone",
    status: "status", email: "email"
  };
  for (const [k, col] of Object.entries(mapping)) {
    if (b[k] !== undefined) {
      fields.push(`${col} = ?`);
      vals.push(k === "email" ? String(b[k]).toLowerCase().trim() : b[k]);
    }
  }
  if (b.canOrderPieces !== undefined) { fields.push("can_order_pieces = ?"); vals.push(b.canOrderPieces ? 1 : 0); }
  if (b.password) {
    fields.push("password_hash = ?"); vals.push(await hashPassword(b.password));
    fields.push("password_algo = 'pbkdf2'");
  }
  if (b.status === "approved" && existing.status !== "approved") {
    fields.push("approved_at = ?"); vals.push(new Date().toISOString());
  }
  if (!fields.length) return err(400, "no editable fields provided");
  vals.push(id);
  await run(db, `UPDATE users SET ${fields.join(", ")} WHERE id = ?`, ...vals);
  await audit(db, "admin", "user.update", id, b);
  const u = await first(db, "SELECT * FROM users WHERE id = ?", id);
  return ok({ user: publicUser(u) });
}

/* DELETE /api/users/:id  (admin) */
export async function remove(req, env, id) {
  const db = pickDB(req, env);
  const u = await first(db, "SELECT email FROM users WHERE id = ?", id);
  if (!u) return err(404, "User not found");
  await run(db, "DELETE FROM users WHERE id = ?", id);
  await audit(db, "admin", "user.delete", id, { email: u.email });
  return ok();
}

/* POST /api/users/import  (admin)  { users: [...] }  - replace all */
export async function bulkImport(req, env) {
  const b = await readJson(req);
  if (!b || !Array.isArray(b.users)) return err(400, "expected { users: [...] }");
  const db = pickDB(req, env);
  const stmts = [db.prepare("DELETE FROM users")];
  for (const u of b.users) {
    const hash = u.password
      ? (u.password.length === 64 && /^[0-9a-f]+$/i.test(u.password) ? u.password : await hashPassword(u.password))
      : "!";
    const algo = u.password && u.password.length === 64 && /^[0-9a-f]+$/i.test(u.password) ? "sha256" : "pbkdf2";
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
  }
  await db.batch(stmts);
  await audit(db, "admin", "user.import", null, { count: b.users.length });
  return ok({ count: b.users.length });
}

/* GET /api/users/export  (admin)  -> { users: [...] } */
export async function exportAll(req, env) {
  const db = pickDB(req, env);
  const rows = await all(db,
    `SELECT id,email,fname,lname,company,phone,password_hash AS password,password_algo,
            status,can_order_pieces AS canOrderPieces,added_by_admin AS addedByAdmin,
            registered_at AS registeredAt,approved_at AS approvedAt
     FROM users ORDER BY registered_at DESC`
  );
  for (const r of rows) {
    r.canOrderPieces = !!r.canOrderPieces;
    r.addedByAdmin   = !!r.addedByAdmin;
  }
  return ok({ users: rows });
}
