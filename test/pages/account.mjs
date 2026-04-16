/* account.mjs — user dashboard: profile details + order history. */
import { $, esc } from "../assets/ui.mjs";
import { getUser, logout, isLoggedIn } from "../assets/auth.mjs";
import { loadOrders } from "../assets/api.mjs";

function populate(u) {
  $("#display-name").textContent    = ((u.fname || "") + " " + (u.lname || "")).trim() || "—";
  $("#display-company").textContent = u.company || "N/A";
  $("#display-email").textContent   = u.email || "N/A";
  $("#display-status").textContent  = u.status || "Pending";
  $("#display-rights").textContent  = u.canOrderPieces === false ? "Cases Only" : "Pieces & Cases";
}

async function showOrders(u) {
  const tb = $("#orders-tbody");
  try {
    const { orders } = await loadOrders();
    const mine = orders
      .filter((o) => (o.customer?.email || "").toLowerCase() === (u.email || "").toLowerCase())
      .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
    if (!mine.length) {
      tb.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--silver);">You have not placed any orders yet.</td></tr>`;
      return;
    }
    tb.innerHTML = mine.map((o) => {
      const cls = o.status === "confirmed" ? "status-confirmed" : o.status === "cancelled" ? "status-cancelled" : "status-pending";
      const count = (o.items || []).reduce((s, i) => s + (i.qty || 0), 0);
      return `<tr>
        <td data-label="Order ID"><span style="color:var(--gold);font-family:'DM Mono',monospace;font-size:13px;">${esc(o.id)}</span></td>
        <td data-label="Date Placed">${new Date(o.placedAt).toLocaleDateString()}</td>
        <td data-label="Items">${count} pcs</td>
        <td data-label="Total">$${(o.total || 0).toFixed(2)}</td>
        <td data-label="Status"><span class="status-badge ${cls}">${esc(o.status)}</span></td>
      </tr>`;
    }).join("");
  } catch (e) {
    tb.innerHTML = `<tr><td colspan="5" style="color:#ff6b6b;padding:20px;">Failed to load order history.</td></tr>`;
  }
}

document.addEventListener("apbs:ready", () => {
  if (!isLoggedIn()) { location.href = "login.html"; return; }
  const u = getUser();
  populate(u);
  showOrders(u);
  $("#logout-btn")?.addEventListener("click", () => { logout(); location.href = "login.html"; });
});
