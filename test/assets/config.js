/* APBS /test sandbox config
 *
 * The Worker at API_URL is the SAME one that serves production. It picks
 * the sandbox D1 database whenever a request carries X-Sandbox: true,
 * which api.mjs injects on every request from this sandbox build. That
 * means /test/ can safely read AND write — every change lands in the
 * `allpro-db-sandbox` database instead of production.
 *
 * To run /test/ against production data for a rehearsal, flip sandbox
 * to false and reload. For a true read-only mode, flip `readOnly` on.
 */
window.APBS_CONFIG = {
  sandbox:    true,
  readOnly:   false,
  bannerText: "SANDBOX / TEST BUILD — all changes land in allpro-db-sandbox",
  API_URL:    "https://allpro-api.baruch-6d5.workers.dev",
  EMAILJS: {
    service:   "SANDBOX_SERVICE",
    template:  "SANDBOX_TEMPLATE",
    publicKey: "SANDBOX_KEY"
  },
  NOTIFY_EMAIL: "sandbox@example.com"
};
