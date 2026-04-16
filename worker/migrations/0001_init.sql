-- All Pro Building Supplies D1 schema
-- Applied to both `allpro-db` (production) and `allpro-db-sandbox`.

CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
  email             TEXT NOT NULL UNIQUE COLLATE NOCASE,
  fname             TEXT,
  lname             TEXT,
  company           TEXT,
  phone             TEXT,
  password_hash     TEXT NOT NULL,
  password_algo     TEXT NOT NULL DEFAULT 'bcrypt',   -- 'bcrypt' | 'sha256' (legacy)
  status            TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  can_order_pieces  INTEGER NOT NULL DEFAULT 1,
  added_by_admin    INTEGER NOT NULL DEFAULT 0,
  registered_at     TEXT,
  approved_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE TABLE IF NOT EXISTS products (
  code          TEXT NOT NULL,
  description   TEXT,
  size          TEXT,
  pack          INTEGER,
  qty           INTEGER NOT NULL DEFAULT 0,
  price         REAL NOT NULL DEFAULT 0,
  image         TEXT,
  updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  PRIMARY KEY (code, size)
);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(code);
CREATE INDEX IF NOT EXISTS idx_products_desc ON products(description);

CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_email    TEXT COLLATE NOCASE,
  status        TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  total         REAL NOT NULL DEFAULT 0,
  placed_at     INTEGER NOT NULL,                   -- ms epoch
  data          TEXT NOT NULL                        -- full JSON blob (customer, delivery, items, notes, po)
);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_placed ON orders(placed_at DESC);

-- A tiny audit log, handy for debugging admin activity.
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
  actor       TEXT,            -- 'admin' | user email | 'system'
  action      TEXT NOT NULL,   -- e.g. 'order.create', 'user.update', 'product.import'
  target      TEXT,
  meta        TEXT             -- optional JSON
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts DESC);
