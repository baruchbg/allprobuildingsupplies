// =====================================================================
// ALL PRO BUILDING SUPPLIES - MAIN API WORKER
// =====================================================================

// 1. Define CORS Headers (Security requirement for frontend to access API)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // We will lock this down to your domain later
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    // 2. Handle CORS Preflight Requests (Browser security check)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // ---------------------------------------------------------
      // ROUTE: Health Check (To verify the API is online)
      // ---------------------------------------------------------
      if (path === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok', message: 'All Pro API is connected to D1!' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ---------------------------------------------------------
      // ROUTE: Get All Products
      // ---------------------------------------------------------
      if (path === '/api/products' && request.method === 'GET') {
        // Query the D1 database linked in wrangler.toml as env.DB
        const { results } = await env.DB.prepare("SELECT * FROM products").all();
        
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ---------------------------------------------------------
      // ROUTE: Login User (Placeholder for next step)
      // ---------------------------------------------------------
      if (path === '/api/login' && request.method === 'POST') {
        return new Response(JSON.stringify({ error: 'Login route under construction' }), {
          status: 501,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ---------------------------------------------------------
      // Fallback: Route Not Found
      // ---------------------------------------------------------
      return new Response(JSON.stringify({ error: 'API Route Not Found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      // Catch-all for server errors
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};