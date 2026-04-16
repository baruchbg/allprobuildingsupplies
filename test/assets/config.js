/* APBS /test sandbox config
 *
 * Read-only sandbox. /test/ reads the SAME live data as production
 * (products.csv, users.json, orders.json) so login, inventory, order
 * history, and the admin dashboard show real content. All WRITES are
 * suppressed by api.mjs when sandbox === true: no orders are saved,
 * no inventory is deducted, no user records are changed.
 *
 * Emails are also suppressed — the EmailJS placeholder keys below
 * cause email.mjs to log intended sends instead of calling EmailJS.
 */
window.APBS_CONFIG = {
  sandbox: true,
  bannerText: "SANDBOX / TEST BUILD — reads are live, writes are disabled",
  WORKER_URL: "https://allpro-github-proxy.baruch-6d5.workers.dev",
  EMAILJS: {
    service:   "SANDBOX_SERVICE",
    template:  "SANDBOX_TEMPLATE",
    publicKey: "SANDBOX_KEY"
  },
  NOTIFY_EMAIL: "sandbox@example.com",
  ADMIN_PIN:    "Admin2026!"
};
