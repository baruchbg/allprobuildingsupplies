/* db.js — pick the D1 binding based on the X-Sandbox header.
 *
 * One deployed Worker serves both production and /test/. The frontend
 * sets `X-Sandbox: true` on every request (see test/assets/config.js)
 * so the Worker routes those to the sandbox DB. Missing header = prod.
 */
export function pickDB(req, env) {
  const sandbox = req.headers.get("x-sandbox") === "true";
  if (sandbox && env.DB_SANDBOX) return env.DB_SANDBOX;
  return env.DB;
}

export function isSandboxReq(req) {
  return req.headers.get("x-sandbox") === "true";
}

/* Convenience wrappers so handlers don't repeat the .prepare().bind().all() dance. */
export async function all(db, sql, ...params) {
  const { results } = await db.prepare(sql).bind(...params).all();
  return results || [];
}
export async function first(db, sql, ...params) {
  return await db.prepare(sql).bind(...params).first();
}
export async function run(db, sql, ...params) {
  return await db.prepare(sql).bind(...params).run();
}

export async function audit(db, actor, action, target, meta) {
  try {
    await run(db,
      "INSERT INTO audit_log (actor, action, target, meta) VALUES (?, ?, ?, ?)",
      actor || null, action, target || null, meta ? JSON.stringify(meta) : null
    );
  } catch {}
}
