// =====================================================================
// ALL PRO BUILDING SUPPLIES - SECURE API WORKER
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

    try {
      // 1. HEALTH CHECK
      if (path === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', message: 'All Pro API is connected to D1!' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 2. FETCH PRODUCTS
      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM products").all();
        return new Response(JSON.stringify(results), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 3. USER LOGIN
      if (path === '/api/login' && request.method === 'POST') {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
          return new Response(JSON.stringify({ error: 'Email and password required' }), { status: 400, headers: corsHeaders });
        }

        // Query the D1 database for the user
        const { results } = await env.DB.prepare(
          "SELECT * FROM users WHERE email = ? AND password = ?"
        ).bind(email.toLowerCase(), password).all();

        if (results.length === 0) {
          return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: corsHeaders });
        }

        const user = results[0];

        if (user.status !== 'approved') {
          return new Response(JSON.stringify({ error: 'Account pending approval.' }), { status: 403, headers: corsHeaders });
        }

        // Return user data (excluding the password)
        delete user.password;
        
        return new Response(JSON.stringify({ 
          message: 'Login successful', 
          token: 'secure-placeholder-token-123', // We will implement real JWT tokens later
          user: user 
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 4. USER REGISTRATION
      if (path === '/api/register' && request.method === 'POST') {
        const body = await request.json();
        const { id, fname, lname, company, email, phone, password } = body;

        // Insert into D1 Database
        await env.DB.prepare(
          `INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?)`
        ).bind(id, fname, lname, company, email.toLowerCase(), phone, password, new Date().toISOString()).run();

        return new Response(JSON.stringify({ message: 'Registration received!' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};