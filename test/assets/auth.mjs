/* auth.mjs — session + login/register/change-password helpers.
 *
 * Bug-fix vs production: the old login.html compared raw input to a
 * stored sha-256 hex hash, which always failed. doLogin() below hashes
 * the entered password before comparing. If a legacy account still has
 * a plaintext password (from admin panel "Welcome1!" seed), we fall back
 * to a plaintext match so those keep working.
 */
import { loadUsers, saveUsers, sha256 } from "./api.mjs";

const SESSION_KEY = "apbs_user";
const ADMIN_KEY   = "apbs_admin_auth";

export function getUser() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
export function setUser(u) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
}
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
export function isLoggedIn() {
  const u = getUser();
  return !!(u && u.status === "approved");
}

export function isAdmin() { return sessionStorage.getItem(ADMIN_KEY) === "true"; }
export function setAdmin(v) {
  if (v) sessionStorage.setItem(ADMIN_KEY, "true");
  else sessionStorage.removeItem(ADMIN_KEY);
}

async function passwordMatches(user, entered) {
  if (!user) return false;
  const stored = user.password || "";
  if (stored === entered) return true;                      // legacy plaintext
  const hashed = await sha256(entered);
  return stored === hashed;                                 // new hashed path
}

export async function doLogin(email, pass) {
  if (!email || !pass) return { ok: false, msg: "Please enter your email and password." };
  const { users } = await loadUsers();
  const user = users.find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (!user) return { ok: false, msg: "Account not found. Please request access." };
  if (!(await passwordMatches(user, pass))) return { ok: false, msg: "Incorrect password." };
  if (user.status === "pending")  return { ok: false, msg: "Your account is pending admin approval." };
  if (user.status === "rejected") return { ok: false, msg: "Your account access has been revoked." };
  if (user.status === "approved") { setUser(user); return { ok: true, user }; }
  return { ok: false, msg: "Unknown account status." };
}

export async function doChangePassword(email, oldPass, newPass) {
  if (!email || !oldPass || !newPass) return { ok: false, msg: "All fields are required." };
  if (newPass.length < 6) return { ok: false, msg: "New password must be at least 6 characters." };
  const { users, sha } = await loadUsers();
  const idx = users.findIndex((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  if (idx < 0) return { ok: false, msg: "Account not found." };
  if (!(await passwordMatches(users[idx], oldPass))) return { ok: false, msg: "Current password is incorrect." };
  users[idx].password = await sha256(newPass);
  await saveUsers(users, sha, "User self-service password update");
  return { ok: true };
}

export async function doRegister(data) {
  const { users, sha } = await loadUsers();
  const email = (data.email || "").trim().toLowerCase();
  if (users.find((u) => (u.email || "").toLowerCase() === email)) {
    return { ok: false, msg: "An account with this email already exists.", dupe: true };
  }
  const newUser = {
    id: Date.now().toString(),
    fname: data.fname.trim(),
    lname: data.lname.trim(),
    company: data.company.trim(),
    email,
    phone: data.phone.trim(),
    password: await sha256(data.password),
    status: "pending",
    canOrderPieces: true,
    registeredAt: new Date().toISOString(),
    approvedAt: null
  };
  users.push(newUser);
  await saveUsers(users, sha, "New registration: " + newUser.fname + " " + newUser.lname + " (" + newUser.company + ")");
  return { ok: true, user: newUser };
}
