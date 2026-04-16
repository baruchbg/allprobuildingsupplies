import { err, ok, readJson } from "../http.js";
import { pickDB, all, first, run, audit } from "../db.js";

/* Internal row -> API shape */
function toApi(r) {
  return {
    code: r.code, description: r.description, size: r.size,
    pack: r.pack, qty: r.qty, price: r.price, image: r.image,
    updatedAt: r.updated_at
  };
}

/* GET /api/products  (public) */
export async function list(req, env) {
  const db = pickDB(req, env);
  const rows = await all(db, "SELECT * FROM products ORDER BY code, size");
  return ok({ products: rows.map(toApi) });
}

/* POST /api/products  (admin)  { code,description,size,pack,qty,price,image } */
export async function create(req, env) {
  const b = await readJson(req);
  if (!b || !b.code) return err(400, "code is required");
  const db = pickDB(req, env);
  try {
    await run(db,
      `INSERT INTO products (code, description, size, pack, qty, price, image, updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      b.code, b.description || "", String(b.size || ""),
      intOr0(b.pack), intOr0(b.qty), floatOr0(b.price), b.image || "",
      Date.now()
    );
  } catch (e) {
    if (String(e).includes("UNIQUE")) return err(409, "A product with that code+size already exists");
    throw e;
  }
  await audit(db, "admin", "product.create", `${b.code}/${b.size || ""}`, null);
  const p = await first(db, "SELECT * FROM products WHERE code=? AND size=?", b.code, String(b.size || ""));
  return ok({ product: toApi(p) });
}

/* PATCH /api/products?code=..&size=..  (admin) */
export async function update(req, env) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const size = url.searchParams.get("size") || "";
  if (!code) return err(400, "code query param required");
  const b = await readJson(req);
  if (!b) return err(400, "body required");
  const db = pickDB(req, env);
  const fields = [];
  const vals = [];
  for (const k of ["description", "image"]) if (b[k] !== undefined) { fields.push(`${k} = ?`); vals.push(b[k]); }
  if (b.pack  !== undefined) { fields.push("pack = ?");  vals.push(intOr0(b.pack)); }
  if (b.qty   !== undefined) { fields.push("qty = ?");   vals.push(intOr0(b.qty)); }
  if (b.price !== undefined) { fields.push("price = ?"); vals.push(floatOr0(b.price)); }
  fields.push("updated_at = ?"); vals.push(Date.now());
  vals.push(code, size);
  const res = await run(db, `UPDATE products SET ${fields.join(", ")} WHERE code=? AND size=?`, ...vals);
  if (!res.meta.changes) return err(404, "Product not found");
  await audit(db, "admin", "product.update", `${code}/${size}`, b);
  const p = await first(db, "SELECT * FROM products WHERE code=? AND size=?", code, size);
  return ok({ product: toApi(p) });
}

/* DELETE /api/products?code=..&size=..  (admin) */
export async function remove(req, env) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const size = url.searchParams.get("size") || "";
  if (!code) return err(400, "code query param required");
  const db = pickDB(req, env);
  const res = await run(db, "DELETE FROM products WHERE code=? AND size=?", code, size);
  if (!res.meta.changes) return err(404, "Product not found");
  await audit(db, "admin", "product.delete", `${code}/${size}`, null);
  return ok();
}

/* POST /api/products/import  (admin)  body: raw CSV text (replace-all)
 * Expected columns: Code,Description,Size,Pack,Qty,Price,Image
 */
export async function importCsv(req, env) {
  const csv = await req.text();
  if (!csv.trim()) return err(400, "empty CSV");
  const rows = parseCSV(csv);
  if (!rows.length) return err(400, "no rows parsed");
  const header = rows[0].map((h) => String(h).trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const cI = idx("code"), dI = idx("description"), sI = idx("size"),
        pkI = idx("pack"), qI = idx("qty"), prI = idx("price"), imI = idx("image");
  if (cI < 0) return err(400, "missing required Code column");

  const db = pickDB(req, env);
  const stmts = [db.prepare("DELETE FROM products")];
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 1 && !r[0]) continue;
    const code = (r[cI] || "").trim();
    if (!code) continue;
    stmts.push(db.prepare(
      `INSERT INTO products (code, description, size, pack, qty, price, image, updated_at) VALUES (?,?,?,?,?,?,?,?)`
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
    count++;
  }
  await db.batch(stmts);
  await audit(db, "admin", "product.import", null, { count });
  return ok({ count });
}

/* GET /api/products/export  (admin)  -> text/csv */
export async function exportCsv(req, env) {
  const db = pickDB(req, env);
  const rows = await all(db, "SELECT code,description,size,pack,qty,price,image FROM products ORDER BY code, size");
  const header = "Code,Description,Size,Pack,Qty,Price,Image";
  const body = rows.map((r) => [r.code, r.description, r.size, r.pack, r.qty, r.price, r.image].map(csvCell).join(",")).join("\n");
  return new Response(`${header}\n${body}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="products.csv"'
    }
  });
}

/* ----- CSV parsing/escaping (RFC-4180ish) ----- */
export function parseCSV(str) {
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
function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[,"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function intOr0(v) { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
function floatOr0(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; }
