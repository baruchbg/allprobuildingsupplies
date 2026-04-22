const fs = require('fs');

// Helper to safely format data for SQL
function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') {
    if (isNaN(val)) return 0; // <--- THE FIX: Replaces NaN with 0
    return val;
  }
  if (typeof val === 'boolean') return val ? 1 : 0;
  return "'" + String(val).replace(/'/g, "''") + "'"; 
}

let sql = "-- ALL PRO SECURE DATA MIGRATION\n\n";

// DROP OLD TABLES
sql += `DROP TABLE IF EXISTS order_items;\n`;
sql += `DROP TABLE IF EXISTS orders;\n`;
sql += `DROP TABLE IF EXISTS products;\n`;
sql += `DROP TABLE IF EXISTS users;\n\n`;

// CREATE NEW SECURE TABLES
sql += `CREATE TABLE users (
  id TEXT PRIMARY KEY,
  fname TEXT,
  lname TEXT,
  company TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  password TEXT,
  status TEXT,
  canOrderPieces INTEGER,
  registeredAt TEXT
);\n\n`;

sql += `CREATE TABLE products (
  sku TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  price REAL,
  pack_qty INTEGER
);\n\n`;

sql += `CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT,
  total_amount REAL,
  delivery_method TEXT,
  created_at TEXT
);\n\n`;

sql += `CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  product_sku TEXT,
  quantity INTEGER,
  price_at_purchase REAL
);\n\n`;

// 1. PROCESS USERS
if (fs.existsSync('users.json')) {
  console.log('Processing users.json...');
  sql += "-- Users Data\n";
  const usersData = JSON.parse(fs.readFileSync('users.json', 'utf8'));
  usersData.users.forEach(u => {
    sql += `INSERT OR IGNORE INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (${escapeSql(u.id)}, ${escapeSql(u.fname)}, ${escapeSql(u.lname)}, ${escapeSql(u.company)}, ${escapeSql(u.email)}, ${escapeSql(u.phone)}, ${escapeSql(u.password)}, ${escapeSql(u.status)}, ${escapeSql(u.canOrderPieces)}, ${escapeSql(u.registeredAt)});\n`;
  });
}

// 2. PROCESS ORDERS & ORDER ITEMS
if (fs.existsSync('orders.json')) {
  console.log('Processing orders.json...');
  sql += "\n-- Orders Data\n";
  const ordersData = JSON.parse(fs.readFileSync('orders.json', 'utf8'));
  ordersData.orders.forEach(o => {
    let total = o.total || 0; 
    if (total === 0 && o.items) {
       total = o.items.reduce((acc, i) => acc + (i.lineTotal || (i.qty * i.unitPrice) || 0), 0);
    }
    
    // Insert the Main Order
    sql += `INSERT OR IGNORE INTO orders (id, user_id, status, total_amount, delivery_method, created_at) VALUES (${escapeSql(o.id)}, ${escapeSql(o.customer?.id)}, ${escapeSql(o.status)}, ${escapeSql(total)}, ${escapeSql(o.delivery?.method)}, ${escapeSql(o.placedAt)});\n`;

    // Insert the Items inside the Order
    if (o.items) {
      o.items.forEach(i => {
        sql += `INSERT OR IGNORE INTO order_items (order_id, product_sku, quantity, price_at_purchase) VALUES (${escapeSql(o.id)}, ${escapeSql(i.code)}, ${escapeSql(i.qty)}, ${escapeSql(i.unitPrice)});\n`;
      });
    }
  });
}

// 3. PROCESS PRODUCTS
if (fs.existsSync('products.csv')) {
  console.log('Processing products.csv...');
  sql += "\n-- Products Data\n";
  const csv = fs.readFileSync('products.csv', 'utf8');
  const lines = csv.split('\n').filter(l => l.trim() !== '');
  
  // Skip the header row if it exists
  const startIdx = lines[0].toLowerCase().includes('sku') ? 1 : 0;
  
  for(let i = startIdx; i < lines.length; i++) {
    // Split by commas, but ignore commas inside of quotes
    const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if(cols && cols.length >= 4) {
      const sku = cols[0] ? cols[0].replace(/(^"|"$)/g, '').trim() : '';
      const name = cols[1] ? cols[1].replace(/(^"|"$)/g, '').trim() : '';
      const category = cols[2] ? cols[2].replace(/(^"|"$)/g, '').trim() : '';
      const price = parseFloat(cols[3] ? cols[3].replace(/(^"|"$)/g, '') : 0) || 0;
      const pack_qty = cols[4] ? parseInt(cols[4].replace(/(^"|"$)/g, '')) : 1;
      
      // Only insert if there's actually a SKU
      if (sku) {
        sql += `INSERT OR IGNORE INTO products (sku, name, category, price, pack_qty) VALUES (${escapeSql(sku)}, ${escapeSql(name)}, ${escapeSql(category)}, ${escapeSql(price)}, ${escapeSql(pack_qty)});\n`;
      }
    }
  }
}

// Write the final SQL file
fs.writeFileSync('seed.sql', sql);
console.log('✅ Successfully generated seed.sql!');