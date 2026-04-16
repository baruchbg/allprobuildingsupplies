/* checkout.mjs — order form submission with sandbox-safe persistence. */
import { $, esc, updateNavCount } from "../assets/ui.mjs";
import { getCart, clearCart } from "../assets/cart.mjs";
import { placeOrder as apiPlaceOrder } from "../assets/api.mjs";
import { isLoggedIn, getUser } from "../assets/auth.mjs";
import { initEmail, sendEmail, buildConfirmEmail, orderEmailParams } from "../assets/email.mjs";

let deliveryMethod = "delivery";

function req(id, errId) {
  const el = $("#" + id);
  const ok = el.value.trim().length > 0;
  el.classList.toggle("err", !ok);
  $("#" + errId).style.display = ok ? "none" : "block";
  return ok;
}

function renderSummary(cart) {
  const lines = $("#order-lines");
  let total = 0;
  lines.innerHTML = cart.map((item) => {
    const price = parseFloat(item.unitPrice) || 0;
    const line = price * item.qty;
    total += line;
    const unitLabel = item.unit === "carton"
      ? `${Math.ceil(item.qty / (item.pcsPerCtn || 1))} ctn (${item.qty} pcs)`
      : `${item.qty} pcs`;
    return `<div class="order-line">
      <div>
        <div class="order-line-name">${esc(item.description || "")} ${esc(item.size || "")}</div>
        <div class="order-line-sub">${unitLabel} &times; $${price.toFixed(2)}</div>
      </div>
      <div class="order-line-price">$${line.toFixed(2)}</div>
    </div>`;
  }).join("");
  $("#order-total").textContent = "$" + total.toFixed(2);
}

function setDelivery(method) {
  deliveryMethod = method;
  $("#opt-delivery").classList.toggle("active", method === "delivery");
  $("#opt-pickup").classList.toggle("active", method === "pickup");
  $("#delivery-fields").style.display = method === "delivery" ? "block" : "none";
  $("#pickup-note").style.display = method === "pickup" ? "block" : "none";
}

async function placeOrder() {
  let valid = true;
  if (deliveryMethod === "delivery") {
    valid = req("f-address", "e-address") & req("f-city", "e-city") & req("f-statzip", "e-statzip") & valid;
  }
  valid = req("f-name", "e-name") & req("f-phone", "e-phone") & valid;
  if (!valid) return;

  const btn = $("#place-btn");
  btn.disabled = true; btn.textContent = "Placing Order...";
  $("#global-err").style.display = "none";

  const cart = getCart();
  const user = getUser();
  const id = "APB-" + Date.now().toString(36).toUpperCase();
  const now = new Date().toISOString();
  const total = cart.reduce((s, i) => s + parseFloat(i.unitPrice) * i.qty, 0);
  const addr = deliveryMethod === "pickup"
    ? "PICKUP"
    : [$("#f-address").value, $("#f-city").value, $("#f-statzip").value].map((v) => v.trim()).join(", ");

  const order = {
    id, placedAt: now, status: "pending",
    customer: {
      id: user.id, name: $("#f-name").value.trim(), email: user.email,
      company: user.company, phone: $("#f-phone").value.trim()
    },
    delivery: { method: deliveryMethod, address: addr },
    po: $("#f-po").value.trim(),
    notes: $("#f-notes").value.trim(),
    items: cart.map((i) => ({
      code: i.code, description: i.description, size: i.size,
      qty: i.qty, unit: i.unit, pcsPerCtn: i.pcsPerCtn,
      unitPrice: parseFloat(i.unitPrice),
      lineTotal: parseFloat(i.unitPrice) * i.qty
    })),
    total, confirmedAt: null, cancelledAt: null
  };

  try {
    // Worker handles inventory deduction transactionally inside /api/orders.
    await apiPlaceOrder(order);

    const html = buildConfirmEmail(order);
    const cfg = window.APBS_CONFIG || {};
    await sendEmail(orderEmailParams(order, html, `New Order ${id} — ${order.customer.name}`, cfg.NOTIFY_EMAIL));
    await sendEmail(orderEmailParams(order, html, `Order Received — ${id} | All Pro Building Supplies`, order.customer.email));

    clearCart();
    updateNavCount();
    $("#checkout-wrap").style.display = "none";
    $("#success-screen").style.display = "block";
    $("#success-order-num").textContent = id;
    $("#success-email").textContent = order.customer.email;
  } catch (e) {
    console.error(e);
    $("#global-err").textContent = "Something went wrong — please try again or call 732-829-1940.";
    $("#global-err").style.display = "block";
    btn.disabled = false; btn.textContent = "Place Order \u2192";
  }
}

document.addEventListener("apbs:ready", () => {
  if (!isLoggedIn()) {
    $("#auth-gate").style.display = "block";
    $("#checkout-wrap").style.display = "none";
    return;
  }
  const cart = getCart();
  if (!cart.length) {
    $("#empty-gate").style.display = "block";
    $("#checkout-wrap").style.display = "none";
    return;
  }
  const u = getUser();
  $("#f-name").value = ((u.fname || "") + " " + (u.lname || "")).trim();
  $("#f-email").value = u.email || "";
  $("#f-company").value = u.company || "";
  renderSummary(cart);
  initEmail();

  $("#opt-delivery").addEventListener("click", () => setDelivery("delivery"));
  $("#opt-pickup").addEventListener("click", () => setDelivery("pickup"));
  $("#place-btn").addEventListener("click", placeOrder);
});
