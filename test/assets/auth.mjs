/* auth.mjs — session + login/register/change-password helpers.
 *
 * Now a thin wrapper around the Worker's /auth/* endpoints. The Worker
 * does bcrypt-equivalent (PBKDF2-SHA256) server-side and returns a signed
 * JWT that api.mjs attaches to every request. We still cache the user row
 * in sessionStorage so existing UI code (ui.mjs, nav pills, etc.) can
 * read it synchronously.
 */
import { api, Session } from "./api.mjs";

const SESSION_USER = "apbs_user";
const ADMIN_FLAG   = "apbs_admin_auth";

export function getUser() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_USER)); }
  catch { return null; }
}
export function setUser(u) {
  if (u) sessionStorage.setItem(SESSION_USER, JSON.stringify(u));
  else sessionStorage.removeItem(SESSION_USER);
}
export function logout() {
  setUser(null);
  Session.setToken(null);
  setAdmin(false);
}
export function isLoggedIn() {
  const u = getUser();
  return !!(u && u.status === "approved");
}

export function isAdmin() { return sessionStorage.getItem(ADMIN_FLAG) === "true"; }
export function setAdmin(v) {
  if (v) sessionStorage.setItem(ADMIN_FLAG, "true");
  else {
    sessionStorage.removeItem(ADMIN_FLAG);
    Session.setAdminKey(null);
  }
}

/* Admin PIN exchange — talks to /api/admin/verify-pin, stores the
 * returned adminKey in sessionStorage so subsequent admin requests
 * authenticate automatically. */
export async function unlockAdmin(pin) {
  try {
    const r = await api.post("/api/admin/verify-pin", { pin });
    if (r && r.adminKey) {
      Session.setAdminKey(r.adminKey);
      setAdmin(true);
      return { ok: true };
    }
    return { ok: false, msg: "Invalid admin PIN." };
  } catch (e) {
    return { ok: false, msg: e.message || "Incorrect PIN." };
  }
}

/* ---- User auth flows ---- */

export async function doLogin(email, pass) {
  if (!email || !pass) return { ok: false, msg: "Please enter your email and password." };
  try {
    const r = await api.post("/auth/login", { email, password: pass });
    Session.setToken(r.token);
    setUser(r.user);
    return { ok: true, user: r.user };
  } catch (e) {
    return { ok: false, msg: e.message || "Login failed." };
  }
}

export async function doRegister(data) {
  try {
    const r = await api.post("/auth/register", {
      fname:    (data.fname    || "").trim(),
      lname:    (data.lname    || "").trim(),
      company:  (data.company  || "").trim(),
      email:    (data.email    || "").trim().toLowerCase(),
      phone:    (data.phone    || "").trim(),
      password: data.password || ""
    });
    return { ok: true, user: r.user };
  } catch (e) {
    return { ok: false, msg: e.message || "Registration failed.", dupe: e.status === 409 };
  }
}

export async function doChangePassword(email, oldPass, newPass) {
  if (!email || !oldPass || !newPass) return { ok: false, msg: "All fields are required." };
  if (newPass.length < 6) return { ok: false, msg: "New password must be at least 6 characters." };
  // If no active session, log in transparently so the Worker can authorize.
  const hadToken = !!Session.getToken();
  if (!hadToken) {
    const r = await doLogin(email, oldPass);
    if (!r.ok) return r;
  }
  try {
    await api.post("/auth/change-password", { oldPassword: oldPass, newPassword: newPass });
    if (!hadToken) logout();
    return { ok: true };
  } catch (e) {
    if (!hadToken) logout();
    return { ok: false, msg: e.message || "Password change failed." };
  }
}

/* Optionally refresh the cached user row from /auth/me — call on app boot
 * so the nav never shows stale status. Silent on failure. */
export async function refreshUser() {
  if (!Session.getToken()) return null;
  try {
    const r = await api.get("/auth/me");
    setUser(r.user);
    return r.user;
  } catch {
    logout();
    return null;
  }
}
