/* order-card.mjs — renders an order card (account.html + admin.html listings). */
import { esc } from "../assets/ui.mjs";

const STATUS_COLORS = {
  pending:   { bg: "#ff9500", fg: "#0C1117" },
  confirmed: { bg: "#3498db", fg: "#fff" },
  delivered: { bg: "#2ecc71", fg: "#fff" },
  cancelled: { bg: "#e74c3c", fg: "#fff" }
};

export function renderStatusBadge(status) {
  const s = (status || "pending").toLowerCase();
  const c = STATUS_COLORS[s] || STATUS_COLORS.pending;
  return `<span class="status-badge" style="background:${c.bg};color:${c.fg}">${esc(s.toUpperCase())}</span>`;
}

export function renderOrderCard(o, opts = {}) {
  const admin = !!opts.admin;
  const items = (o.items || [])
    .map((i) => `<li>${esc(i.description || "")} ${esc(i.size || "")} &mdash; ${i.qty}&times; <span style="color:var(--silver)">$${(i.lineTotal || 0).toFixed(2)}</span></li>`)
    .join("");

  const meta = admin
    ? `<div class="order-meta">
         <div><strong>Customer:</strong> ${esc(o.customer?.name || "—")}</div>
         <div><strong>Company:</strong> ${esc(o.customer?.company || "—")}</div>
         <div><strong>Phone:</strong> ${esc(o.customer?.phone || "—")}</div>
         <div><strong>Email:</strong> ${esc(o.customer?.email || "—")}</div>
         <div><strong>Delivery:</strong> ${esc(o.delivery?.address || "—")}</div>
       </div>`
    : `<div class="order-meta"><div><strong>Delivery:</strong> ${esc(o.delivery?.address || "—")}</div></div>`;

  const actions = admin
    ? `<div class="order-actions">
         <button data-order-view data-id="${esc(o.id)}">View / Edit</button>
         <button data-order-email data-id="${esc(o.id)}">Email</button>
       </div>`
    : "";

  return `<article class="order-card" data-id="${esc(o.id)}">
    <header class="order-head">
      <div>
        <div class="order-id">${esc(o.id)}</div>
        <div class="order-date">${new Date(o.placedAt).toLocaleString()}</div>
      </div>
      ${renderStatusBadge(o.status)}
    </header>
    ${meta}
    <ul class="order-items">${items}</ul>
    <footer class="order-foot">
      <span class="order-total">Total: $${(o.total || 0).toFixed(2)}</span>
      ${actions}
    </footer>
  </article>`;
}
