/* http.js — JSON helpers, CORS, body parsing. */

export function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}
export function text(body, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/plain; charset=utf-8");
  return new Response(body, { ...init, headers });
}
export function err(status, msg, extra = {}) {
  return json({ ok: false, error: msg, ...extra }, { status });
}
export function ok(data = {}) {
  return json({ ok: true, ...data });
}

export function corsHeaders(req, env) {
  const origin = req.headers.get("origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const allowOrigin = allowed.includes(origin) ? origin : (allowed[0] || "*");
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, x-admin-key, x-sandbox",
    "access-control-max-age": "86400",
    "vary": "origin"
  };
}

export function withCORS(res, req, env) {
  const headers = new Headers(res.headers);
  const cors = corsHeaders(req, env);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}
