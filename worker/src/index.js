/* allpro-api — Cloudflare Worker
 *
 * Routes:
 *   POST   /auth/login                 public
 *   POST   /auth/register              public
 *   POST   /auth/change-password       JWT
 *   GET    /auth/me                    JWT
 *
 *   GET    /api/products               public
 *   POST   /api/products               admin
 *   PATCH  /api/products?code&size     admin
 *   DELETE /api/products?code&size     admin
 *   POST   /api/products/import        admin (raw CSV body)
 *   GET    /api/products/export        admin (returns CSV)
 *
 *   GET    /api/users                  admin
 *   POST   /api/users                  admin
 *   PATCH  /api/users/:id              admin
 *   DELETE /api/users/:id              admin
 *   POST   /api/users/import           admin (JSON)
 *   GET    /api/users/export           admin (JSON)
 *
 *   GET    /api/orders                 admin (all) or JWT (?mine=1)
 *   POST   /api/orders                 JWT
 *   PATCH  /api/orders/:id             admin
 *   DELETE /api/orders/:id             admin
 *   GET    /api/orders/export          admin (CSV)
 *
 *   POST   /api/admin/verify-pin       public -> returns admin key
 *   GET    /api/admin/stats            admin
 *   GET    /api/admin/audit            admin
 *   POST   /api/admin/seed             admin (one-shot migration)
 *   POST   /api/admin/wipe             admin + sandbox only
 *   GET    /api/admin/backup           admin (full JSON snapshot)
 *
 *   GET    /                           health
 */
import { json, err, ok, corsHeaders, withCORS } from "./http.js";
import { checkAdminKey } from "./auth.js";
import * as Auth     from "./handlers/auth.js";
import * as Users    from "./handlers/users.js";
import * as Products from "./handlers/products.js";
import * as Orders   from "./handlers/orders.js";
import * as Admin    from "./handlers/admin.js";

const ADMIN_ONLY = (req, env) => {
  if (!checkAdminKey(req, env)) return err(401, "admin key required");
  return null;
};

export default {
  async fetch(req, env, ctx) {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req, env) });
    }

    let res;
    try {
      res = await route(req, env, ctx);
    } catch (e) {
      console.error("Worker error:", e && e.stack || e);
      res = err(500, "Internal error", { detail: String(e && e.message || e) });
    }
    return withCORS(res, req, env);
  }
};

async function route(req, env) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const m = req.method;

  if (p === "/" || p === "/health") {
    return ok({ service: "allpro-api", ts: Date.now() });
  }

  // ----- auth -----
  if (p === "/auth/login"           && m === "POST") return Auth.login(req, env);
  if (p === "/auth/register"        && m === "POST") return Auth.register(req, env);
  if (p === "/auth/change-password" && m === "POST") return Auth.changePassword(req, env);
  if (p === "/auth/me"              && m === "GET")  return Auth.me(req, env);

  // ----- products -----
  if (p === "/api/products" && m === "GET")    return Products.list(req, env);
  if (p === "/api/products" && m === "POST")   return ADMIN_ONLY(req, env) || Products.create(req, env);
  if (p === "/api/products" && m === "PATCH")  return ADMIN_ONLY(req, env) || Products.update(req, env);
  if (p === "/api/products" && m === "DELETE") return ADMIN_ONLY(req, env) || Products.remove(req, env);
  if (p === "/api/products/import" && m === "POST") return ADMIN_ONLY(req, env) || Products.importCsv(req, env);
  if (p === "/api/products/export" && m === "GET")  return ADMIN_ONLY(req, env) || Products.exportCsv(req, env);

  // ----- users -----
  if (p === "/api/users" && m === "GET")  return ADMIN_ONLY(req, env) || Users.list(req, env);
  if (p === "/api/users" && m === "POST") return ADMIN_ONLY(req, env) || Users.create(req, env);
  if (p === "/api/users/import" && m === "POST") return ADMIN_ONLY(req, env) || Users.bulkImport(req, env);
  if (p === "/api/users/export" && m === "GET")  return ADMIN_ONLY(req, env) || Users.exportAll(req, env);
  const userIdMatch = p.match(/^\/api\/users\/([^/]+)$/);
  if (userIdMatch) {
    const id = decodeURIComponent(userIdMatch[1]);
    if (m === "PATCH")  return ADMIN_ONLY(req, env) || Users.update(req, env, id);
    if (m === "DELETE") return ADMIN_ONLY(req, env) || Users.remove(req, env, id);
  }

  // ----- orders -----
  if (p === "/api/orders" && m === "GET") {
    const admin = checkAdminKey(req, env);
    return Orders.list(req, env, admin);
  }
  if (p === "/api/orders" && m === "POST") return Orders.create(req, env);
  if (p === "/api/orders/export" && m === "GET") return ADMIN_ONLY(req, env) || Orders.exportCsv(req, env);
  const orderIdMatch = p.match(/^\/api\/orders\/([^/]+)$/);
  if (orderIdMatch) {
    const id = decodeURIComponent(orderIdMatch[1]);
    if (m === "PATCH")  return ADMIN_ONLY(req, env) || Orders.update(req, env, id);
    if (m === "DELETE") return ADMIN_ONLY(req, env) || Orders.remove(req, env, id);
  }

  // ----- admin -----
  if (p === "/api/admin/verify-pin" && m === "POST") return Admin.verifyPin(req, env);
  if (p === "/api/admin/stats"      && m === "GET")  return ADMIN_ONLY(req, env) || Admin.stats(req, env);
  if (p === "/api/admin/audit"      && m === "GET")  return ADMIN_ONLY(req, env) || Admin.auditLog(req, env);
  if (p === "/api/admin/seed"       && m === "POST") return ADMIN_ONLY(req, env) || Admin.seed(req, env);
  if (p === "/api/admin/wipe"       && m === "POST") return ADMIN_ONLY(req, env) || Admin.wipe(req, env);
  if (p === "/api/admin/backup"     && m === "GET")  return ADMIN_ONLY(req, env) || Admin.backup(req, env);

  return err(404, `Not found: ${m} ${p}`);
}
