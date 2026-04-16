import { json, err, ok, readJson } from "../http.js";
import { pickDB, run, first, audit } from "../db.js";
import { hashPassword, verifyPassword, signJWT, verifyJWT } from "../auth.js";

/* POST /auth/login  { email, password } -> { token, user } */
export async function login(req, env) {
  const body = await readJson(req);
  if (!body || !body.email || !body.password) return err(400, "email and password required");
  const db = pickDB(req, env);
  const u = await first(db, "SELECT * FROM users WHERE email = ?", String(body.email).toLowerCase());
  if (!u) return err(401, "Account not found. Please request access.");

  const { ok: passOK, needsUpgrade } = await verifyPassword(body.password, u.password_hash, u.password_algo);
  if (!passOK) return err(401, "Incorrect password.");

  if (u.status === "pending")  return err(403, "Your account is pending admin approval.");
  if (u.status === "rejected") return err(403, "Your account access has been revoked.");

  if (needsUpgrade) {
    const newHash = await hashPassword(body.password);
    await run(db, "UPDATE users SET password_hash=?, password_algo='pbkdf2' WHERE id=?", newHash, u.id);
    await audit(db, u.email, "user.password_upgrade", u.id, null);
  }

  const token = await signJWT({ sub: u.id, email: u.email, role: "user" }, env.JWT_SECRET || "dev-secret");
  return ok({ token, user: publicUser(u) });
}

/* POST /auth/register  { fname,lname,company,email,phone,password } -> { user } */
export async function register(req, env) {
  const b = await readJson(req);
  const required = ["fname", "lname", "company", "email", "phone", "password"];
  for (const k of required) if (!b || !String(b[k] || "").trim()) return err(400, `${k} is required`);
  if (String(b.password).length < 6) return err(400, "Password must be at least 6 characters.");

  const db = pickDB(req, env);
  const email = String(b.email).toLowerCase().trim();
  const dupe = await first(db, "SELECT id FROM users WHERE email = ?", email);
  if (dupe) return err(409, "An account with this email already exists.");

  const id = Date.now().toString();
  const nowIso = new Date().toISOString();
  const hash = await hashPassword(b.password);
  await run(db,
    `INSERT INTO users (id, email, fname, lname, company, phone, password_hash, password_algo, status, can_order_pieces, added_by_admin, registered_at, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pbkdf2', 'pending', 1, 0, ?, NULL)`,
    id, email, b.fname.trim(), b.lname.trim(), b.company.trim(), b.phone.trim(), hash, nowIso
  );
  await audit(db, email, "user.register", id, { company: b.company });
  const u = await first(db, "SELECT * FROM users WHERE id = ?", id);
  return ok({ user: publicUser(u) });
}

/* POST /auth/change-password  Bearer JWT  { oldPassword, newPassword } */
export async function changePassword(req, env) {
  const who = await requireUser(req, env);
  if (!who.ok) return who.res;
  const b = await readJson(req);
  if (!b || !b.oldPassword || !b.newPassword) return err(400, "oldPassword and newPassword required");
  if (String(b.newPassword).length < 6) return err(400, "New password must be at least 6 characters.");
  const db = pickDB(req, env);
  const u = await first(db, "SELECT * FROM users WHERE id = ?", who.payload.sub);
  if (!u) return err(404, "User not found");
  const v = await verifyPassword(b.oldPassword, u.password_hash, u.password_algo);
  if (!v.ok) return err(401, "Current password is incorrect.");
  const newHash = await hashPassword(b.newPassword);
  await run(db, "UPDATE users SET password_hash=?, password_algo='pbkdf2' WHERE id=?", newHash, u.id);
  await audit(db, u.email, "user.change_password", u.id, null);
  return ok();
}

/* GET /auth/me  Bearer JWT  -> fresh user row */
export async function me(req, env) {
  const who = await requireUser(req, env);
  if (!who.ok) return who.res;
  const db = pickDB(req, env);
  const u = await first(db, "SELECT * FROM users WHERE id = ?", who.payload.sub);
  if (!u) return err(404, "User not found");
  return ok({ user: publicUser(u) });
}

/* ----- helpers ----- */
export async function requireUser(req, env) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, res: err(401, "Missing token") };
  const payload = await verifyJWT(m[1], env.JWT_SECRET || "dev-secret");
  if (!payload) return { ok: false, res: err(401, "Invalid or expired token") };
  return { ok: true, payload };
}

export function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    fname: u.fname,
    lname: u.lname,
    company: u.company,
    phone: u.phone,
    status: u.status,
    canOrderPieces: !!u.can_order_pieces,
    registeredAt: u.registered_at,
    approvedAt: u.approved_at
  };
}
