/* auth.js
 *
 * Password hashing (PBKDF2-SHA256, 100k iters, per-user salt) and JWT
 * (HS256) using ONLY the Web Crypto API built into Workers. No npm deps.
 *
 * Format of stored password_hash for algo='pbkdf2':
 *     pbkdf2$<iters>$<saltB64>$<hashB64>
 *
 * Legacy algo='sha256' hashes are plain hex (existing rows).
 *
 * Upgrade path: on a successful login against a legacy sha256 hash we
 * transparently rehash as pbkdf2 and persist, so the user is upgraded
 * silently over time.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/* ----- base64 helpers ----- */
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)).buffer;
const b64url = (buf) => b64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const ub64url = (s) => ub64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

/* ----- password hashing ----- */
const PBKDF2_ITERS = 100_000;

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERS, hash: "SHA-256" },
    key, 256
  );
  return `pbkdf2$${PBKDF2_ITERS}$${b64(salt)}$${b64(bits)}`;
}

async function verifyPbkdf2(password, stored) {
  const [algo, itersStr, saltB64, hashB64] = stored.split("$");
  if (algo !== "pbkdf2") return false;
  const iters = parseInt(itersStr, 10);
  const salt = new Uint8Array(ub64(saltB64));
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" },
    key, 256
  );
  return timingSafeEqual(new Uint8Array(bits), new Uint8Array(ub64(hashB64)));
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* Verify against either algo; returns { ok, upgraded } so callers can
 * persist a rehashed value after a legacy login. */
export async function verifyPassword(password, storedHash, algo) {
  if (algo === "pbkdf2" || (storedHash && storedHash.startsWith("pbkdf2$"))) {
    return { ok: await verifyPbkdf2(password, storedHash), needsUpgrade: false };
  }
  if (algo === "sha256") {
    const hex = await sha256Hex(password);
    return { ok: timingSafeEqualStr(hex, storedHash || ""), needsUpgrade: true };
  }
  return { ok: storedHash === password, needsUpgrade: true };
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function timingSafeEqualStr(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ----- JWT (HS256) ----- */
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function signJWT(payload, secret, ttlSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { iat: now, exp: now + ttlSeconds, ...payload };
  const seg = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(body)))}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(seg));
  return `${seg}.${b64url(sig)}`;
}

export async function verifyJWT(token, secret) {
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const key = await hmacKey(secret);
    const ok = await crypto.subtle.verify("HMAC", key, ub64url(s), enc.encode(`${h}.${p}`));
    if (!ok) return null;
    const payload = JSON.parse(dec.decode(ub64url(p)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

/* ----- admin key verification (constant-time) ----- */
export function checkAdminKey(req, env) {
  const provided = req.headers.get("x-admin-key") || "";
  const expected = env.ADMIN_KEY || "";
  if (!expected) return false;
  return timingSafeEqualStr(provided, expected);
}
