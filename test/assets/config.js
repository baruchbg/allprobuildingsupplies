/* APBS /test sandbox config
 *
 * This is a fully isolated "test" build of the site. All network writes
 * (orders, users, inventory) are routed through the SANDBOX_WORKER_URL
 * below. To keep production data safe the defaults are placeholders —
 * the api layer refuses PUT/POST when the URL contains "SANDBOX" or
 * "example.workers.dev", and only logs what it would have sent.
 *
 * To connect this to a real sandbox worker + EmailJS later, replace
 * the strings below. Nothing else in /test/ needs to change.
 */
window.APBS_CONFIG = {
  sandbox: true,
  bannerText: "SANDBOX / TEST BUILD — No production data is touched",
  WORKER_URL: "https://SANDBOX-WORKER-URL.example.workers.dev",
  EMAILJS: {
    service:   "SANDBOX_SERVICE",
    template:  "SANDBOX_TEMPLATE",
    publicKey: "SANDBOX_KEY"
  },
  NOTIFY_EMAIL: "sandbox@example.com",
  ADMIN_PIN:    "Admin2026!"
};
