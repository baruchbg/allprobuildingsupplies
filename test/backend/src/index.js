// =====================================================================
// ALL PRO BUILDING SUPPLIES - SECURE API WORKER (v2.0)
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    
    // Admin Security Verification
    const isAdmin = request.headers.get('Authorization') === 'Bearer Admin2026!';

    try {
      // ---------------------------------------------------------
      // PUBLIC ROUTES (App & Website)
      // ---------------------------------------------------------
      if (path === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM products").all();
        return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/login' && request.method === 'POST') {
        const { email, password } = await request.json();
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password = ?").bind(email.toLowerCase(), password).all();
        if (results.length === 0) return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: corsHeaders });
        const user = results[0];
        if (user.status !== 'approved') return new Response(JSON.stringify({ error: 'Account pending approval.' }), { status: 403, headers: corsHeaders });
        delete user.password;
        return new Response(JSON.stringify({ message: 'Login successful', token: 'secure-token-123', user: user }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/register' && request.method === 'POST') {
        const body = await request.json();
        await env.DB.prepare(`INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?)`).bind(body.id, body.fname, body.lname, body.company, body.email.toLowerCase(), body.phone, body.password, new Date().toISOString()).run();
        return new Response(JSON.stringify({ message: 'Registration received!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      // NEW: Secure Public Orders Route (For Checkout Page)
      if (path === '/api/orders' && request.method === 'POST') {
        const o = await request.json();
        
        // Ensure required fields exist
        if (!o.id || !o.customer || !o.customer.email) {
          return new Response(JSON.stringify({ error: 'Missing required order data' }), { status: 400, headers: corsHeaders });
        }

        const stmts = [
          env.DB.prepare(`
            INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            o.id, o.customer.email.toLowerCase(), 'pending', o.total, 
            o.delivery.method || 'delivery', o.delivery.address || '', 
            o.po || '', o.notes || '', JSON.stringify(o.customer), o.placedAt
          )
        ];

        if (o.items && o.items.length > 0) {
          for (const i of o.items) {
            stmts.push(env.DB.prepare("INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)").bind(o.id, i.code, i.size, i.qty, i.unitPrice));
          }
        }

        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true, orderId: o.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ---------------------------------------------------------
      // SECURE ADMIN ROUTES
      // ---------------------------------------------------------
      if (!path.startsWith('/api/admin')) return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
      if (!isAdmin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

      // -- USERS --
      if (path === '/api/admin/users' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM users").all();
        return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      
      if (path === '/api/admin/users' && request.method === 'POST') {
        const u = await request.json();
        await env.DB.prepare(`INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(u.id, u.fname, u.lname, u.company, u.email.toLowerCase(), u.phone || '', u.password, u.status, u.canOrderPieces ? 1 : 0, new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      if (path === '/api/admin/users' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      if (path === '/api/admin/users/bulk' && request.method === 'PUT') {
        const users = await request.json();
        const stmts = users.map(u => env.DB.prepare("UPDATE users SET status = ?, canOrderPieces = ?, password = ? WHERE id = ?").bind(u.status, u.canOrderPieces ? 1 : 0, u.password, u.id));
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      // -- PRODUCTS --
      // Wipe Clean Route (Used by Manual "Save Products" Button)
      if (path === '/api/admin/products/sync' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [env.DB.prepare("DELETE FROM products")]; // Wipe clean
        for (const p of products) {
          stmts.push(env.DB.prepare("INSERT INTO products (code, description, size, pack, qty, price, image) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(p.code, p.description, p.size, p.pack, p.qty, p.price, p.image));
        }
        await env.DB.batch(stmts); // Insert all new
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      // NEW: Safe CSV Upsert Route (Insert or Update without wiping)
      if (path === '/api/admin/products/bulk-update' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [];
        for (const p of products) {
          stmts.push(env.DB.prepare(`
            INSERT INTO products (code, description, size, pack, qty, price, image) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(code, size) DO UPDATE SET 
              description=excluded.description, pack=excluded.pack, 
              qty=excluded.qty, price=excluded.price, image=excluded.image
          `).bind(p.code, p.description, p.size, p.pack, p.qty, p.price, p.image));
        }
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      // -- ORDERS --
      if (path === '/api/admin/orders' && request.method === 'GET') {
        const orders = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
        const items = await env.DB.prepare("SELECT * FROM order_items").all();
        const prods = await env.DB.prepare("SELECT * FROM products").all();

        const formattedOrders = orders.results.map(o => {
          const orderItems = items.results.filter(i => i.order_id === o.id).map(i => {
            const match = prods.results.find(p => p.code === i.product_sku && p.size === i.size);
            return {
              code: i.product_sku, size: i.size, qty: i.quantity,
              unitPrice: i.price_at_purchase, lineTotal: i.quantity * i.price_at_purchase,
              description: match ? match.description : 'Unknown Product',
              pcsPerCtn: match ? match.pack : 1
            };
          });
          return {
            id: o.id, placedAt: o.created_at, status: o.status, total: o.total_amount,
            delivery: { method: o.delivery_method, address: o.delivery_address || '' },
            po: o.po || '', notes: o.notes || '',
            customer: o.customer_snapshot ? JSON.parse(o.customer_snapshot) : { name: 'Unknown' },
            items: orderItems
          };
        });
        return new Response(JSON.stringify(formattedOrders), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/admin/orders' && request.method === 'POST') {
        const o = await request.json();
        const stmts = [
          env.DB.prepare(`
            INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status=excluded.status, total_amount=excluded.total_amount, delivery_address=excluded.delivery_address, po=excluded.po, notes=excluded.notes, customer_snapshot=excluded.customer_snapshot
          `).bind(o.id, o.customer.email || 'unknown', o.status, o.total, o.delivery.method || 'delivery', o.delivery.address || '', o.po || '', o.notes || '', JSON.stringify(o.customer), o.placedAt),
          env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(o.id)
        ];
        if (o.items && o.items.length > 0) {
          for (const i of o.items) {
            stmts.push(env.DB.prepare("INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)").bind(o.id, i.code, i.size, i.qty, i.unitPrice));
          }
        }
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: 'Route Not Found' }), { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  }
};