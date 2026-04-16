/* admin.mjs — admin dashboard. Uses sandbox-safe api.mjs / email.mjs
 * so mutations are logged rather than pushed to GitHub.
 *
 * Tabs: orders, products, users. Modals: order edit, user create, email.
 */
import { $, $$, esc } from "../assets/ui.mjs";
import { isAdmin, setAdmin } from "../assets/auth.mjs";
import {
  loadProducts, saveProductsCSV,
  loadUsers,    saveUsers,
  loadOrders,   saveOrders,
  isSandbox
} from "../assets/api.mjs";
import {
  initEmail, sendEmail, orderEmailParams,
  buildConfirmEmail, buildDeliveredEmail, buildInvoiceEmail
} from "../assets/email.mjs";

const state = {
  prodSha: null, userSha: null, orderSha: null,
  products: [], users: [], orders: [],
  rawProductRows: [],
  active: null
};

function showStatus(msg, isErr) {
  const el = $("#status-msg");
  el.textContent = msg;
  el.className = isErr ? "status-err" : "status-success";
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 4000);
}

function switchTab(tab) {
  $$(".admin-tab").forEach((b) => b.classList.remove("active"));
  $$(".admin-panel").forEach((p) => p.classList.remove("active"));
  const btn = $(`.admin-tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add("active");
  const panel = $("#tab-" + tab);
  if (panel) panel.classList.add("active");
}

/* ---------------- Auth Gate ---------------- */
function unlockAdmin() {
  $("#admin-auth-gate").style.display = "none";
  $("#main-admin-content").style.display = "block";
  switchTab("orders");
  refreshAll();
}

function checkAdminAuth() {
  const pin = $("#admin-pin").value;
  const expected = (window.APBS_CONFIG || {}).ADMIN_PIN || "Admin2026!";
  if (pin === expected) {
    setAdmin(true);
    unlockAdmin();
  } else {
    $("#admin-auth-err").style.display = "block";
  }
}

/* ---------------- Products ---------------- */
function addProductRow(data = ["", "", "", "", "", "", ""]) {
  const tr = document.createElement("tr");
  const labels = ["Category Code", "Description", "Size", "Pcs / Ctn", "Inventory Qty", "Unit Price ($)", "Image URL"];
  tr.innerHTML = labels
    .map((lbl, i) => `<td data-label="${lbl}"><input class="data-input" value="${esc(data[i] || "")}"/></td>`)
    .join("") +
    `<td data-label="Action"><button class="btn-del" data-del>Delete Row</button></td>`;
  $("#prod-tbody").appendChild(tr);
}

async function reloadProducts() {
  const { rows, sha } = await loadProducts();
  state.prodSha = sha;
  state.rawProductRows = rows;
  state.products = [];
  $("#prod-tbody").innerHTML = "";
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    state.products.push({
      code: (rows[i][0] || "").trim(),
      description: (rows[i][1] || "").trim(),
      size: (rows[i][2] || "").trim(),
      pack: (rows[i][3] || "").trim(),
      price: parseFloat(rows[i][5]) || 0
    });
    addProductRow(rows[i]);
  }
  populateProductDropdown();
}

function populateProductDropdown() {
  const sel = $("#new-item-sel");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Select Product to Add --</option>' +
    state.products.map((p, i) => `<option value="${i}">${esc(p.code)} - ${esc(p.description)} ${esc(p.size)} ($${p.price.toFixed(2)})</option>`).join("");
}

async function doSaveProducts(btn) {
  btn.textContent = "Saving..."; btn.disabled = true;
  const rows = [["Code", "Description", "Size", "Pack", "Qty", "Price", "Image"]];
  $$("#prod-tbody tr").forEach((tr) => {
    const vals = $$("input", tr).map((i) => i.value);
    if ((vals[0] || "").trim()) rows.push(vals);
  });
  try {
    const r = await saveProductsCSV(rows, state.prodSha);
    state.prodSha = r?.content?.sha || state.prodSha;
    showStatus("Products saved" + (isSandbox() ? " (sandbox — console only)" : "") + "!", false);
    await reloadProducts();
  } catch (e) { showStatus("Error saving products.", true); }
  btn.textContent = "Save Products"; btn.disabled = false;
}

/* ---------------- Users ---------------- */
async function reloadUsers() {
  const { users, sha } = await loadUsers();
  state.userSha = sha; state.users = users;
  const tb = $("#users-tbody"); tb.innerHTML = "";
  users.forEach((u, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="ID" style="font-family:monospace;color:var(--silver);">${esc(u.id)}</td>
      <td data-label="Name">${esc(u.fname || "")} ${esc(u.lname || "")}</td>
      <td data-label="Email">${esc(u.email || "")}</td>
      <td data-label="Company">${esc(u.company || "")}</td>
      <td data-label="Password"><input type="text" class="data-input pw-sel" data-idx="${i}" value="${esc(u.password || "Welcome1!")}" style="width:120px;"/></td>
      <td data-label="Status">
        <select class="data-input status-sel" data-idx="${i}">
          <option value="pending" ${u.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="approved" ${u.status === "approved" ? "selected" : ""}>Approved</option>
          <option value="rejected" ${u.status === "rejected" ? "selected" : ""}>Rejected</option>
        </select>
      </td>
      <td data-label="Pieces Allowed">
        <select class="data-input pcs-sel" data-idx="${i}">
          <option value="true" ${u.canOrderPieces !== false ? "selected" : ""}>Yes</option>
          <option value="false" ${u.canOrderPieces === false ? "selected" : ""}>Cases Only</option>
        </select>
      </td>
      <td data-label="Action"><button class="btn-del" data-user-del data-idx="${i}">Delete</button></td>
    `;
    tb.appendChild(tr);
  });
}

async function doSaveUsers(btn) {
  btn.textContent = "Saving..."; btn.disabled = true;
  $$(".status-sel").forEach((s) => (state.users[s.dataset.idx].status = s.value));
  $$(".pcs-sel").forEach((s)    => (state.users[s.dataset.idx].canOrderPieces = s.value === "true"));
  $$(".pw-sel").forEach((s)     => (state.users[s.dataset.idx].password = s.value.trim()));
  try {
    const r = await saveUsers(state.users, state.userSha, "Admin: Update users.json");
    state.userSha = r?.content?.sha || state.userSha;
    showStatus("Users saved" + (isSandbox() ? " (sandbox)" : "") + "!", false);
    await reloadUsers();
  } catch (e) { showStatus("Error saving users.", true); }
  btn.textContent = "Save Approvals & Passwords"; btn.disabled = false;
}

async function createNewUser(btn) {
  const get = (id) => $("#" + id).value.trim();
  const fname = get("new-user-fname"),
        lname = get("new-user-lname"),
        email = get("new-user-email");
  if (!fname || !lname || !email) { alert("First Name, Last Name, and Email are required."); return; }
  btn.textContent = "Saving..."; btn.disabled = true;
  const u = {
    id: "USR-" + Date.now().toString(36).toUpperCase(),
    fname, lname, email,
    password: get("new-user-password") || "Welcome1!",
    company:  get("new-user-company"),
    status:   get("new-user-status"),
    canOrderPieces: $("#new-user-pcs").value === "true"
  };
  state.users.push(u);
  try {
    const r = await saveUsers(state.users, state.userSha, "Admin: Add new user");
    state.userSha = r?.content?.sha || state.userSha;
    showStatus("User created!", false);
    $("#user-modal-overlay").style.display = "none";
    await reloadUsers();
  } catch (e) { showStatus("Error creating user.", true); state.users.pop(); }
  btn.textContent = "Create User"; btn.disabled = false;
}

/* ---------------- Orders ---------------- */
async function reloadOrders() {
  const { orders, sha } = await loadOrders();
  state.orderSha = sha;
  state.orders = orders.sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  const tb = $("#orders-tbody"); tb.innerHTML = "";
  state.orders.forEach((o) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Order ID" style="font-family:monospace;color:var(--gold);">${esc(o.id)}</td>
      <td data-label="Date">${new Date(o.placedAt).toLocaleDateString()}</td>
      <td data-label="Customer">${esc(o.customer?.name || "")}<br><span style="font-size:10px;color:var(--silver)">${esc(o.customer?.company || "")}</span></td>
      <td data-label="Total" style="font-family:monospace">$${(o.total || 0).toFixed(2)}</td>
      <td data-label="Status"><span class="badge ${esc(o.status)}">${esc(o.status)}</span></td>
      <td data-label="Action"><button class="btn-view" data-order-open data-id="${esc(o.id)}">View & Edit</button></td>
    `;
    tb.appendChild(tr);
  });
}

function toggleEditLock(status) {
  const locked = status === "delivered" || status === "cancelled";
  ["edit-cust-name", "edit-cust-company", "edit-cust-email", "edit-cust-phone", "edit-delivery", "edit-po", "edit-notes"]
    .forEach((id) => {
      const el = $("#" + id); el.disabled = locked; el.style.opacity = locked ? "0.6" : "1";
    });
  $$(".edit-qty, .edit-price").forEach((i) => { i.disabled = locked; i.style.opacity = locked ? "0.6" : "1"; });
  $$("#m-items-tbody .btn-del").forEach((b) => { b.disabled = locked; b.style.opacity = locked ? "0.5" : "1"; });
  $("#add-item-container").style.display = locked ? "none" : "flex";
  $("#edit-lock-banner").style.display = locked ? "block" : "none";
}

function renderEditableItems() {
  const tb = $("#m-items-tbody"); tb.innerHTML = "";
  let total = 0;
  state.active.items.forEach((it, idx) => {
    const line = (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0);
    total += line;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Item">${esc(it.description)} ${esc(it.size)}<br><span style="font-size:10px;color:var(--silver)">${esc(it.code)}</span></td>
      <td data-label="Qty"><input type="number" class="data-input edit-qty" data-idx="${idx}" value="${it.qty}" style="width:70px;"/></td>
      <td data-label="Unit Price"><input type="number" step="0.01" class="data-input edit-price" data-idx="${idx}" value="${(it.unitPrice || 0).toFixed(2)}" style="width:90px;"/></td>
      <td data-label="Line Total" class="live-line-tot" style="text-align:right;font-family:monospace;color:var(--white)">$${line.toFixed(2)}</td>
      <td data-label="Action"><button class="btn-del" data-item-del data-idx="${idx}">X</button></td>
    `;
    tb.appendChild(tr);
  });
  $("#m-total").textContent = "$" + total.toFixed(2);
  toggleEditLock($("#m-status-sel").value);
}

function liveRecalc() {
  const qs = $$(".edit-qty"), ps = $$(".edit-price"), ls = $$(".live-line-tot");
  let total = 0;
  qs.forEach((q, i) => {
    const line = (parseFloat(q.value) || 0) * (parseFloat(ps[i].value) || 0);
    total += line;
    ls[i].textContent = "$" + line.toFixed(2);
  });
  $("#m-total").textContent = "$" + total.toFixed(2);
}

function openOrderModal(id) {
  if (id) {
    state.active = state.orders.find((o) => o.id === id);
    $("#modal-main-title").textContent = "Edit Order: " + id;
  } else {
    state.active = {
      id: "APB-" + Date.now().toString(36).toUpperCase(),
      placedAt: new Date().toISOString(),
      status: "pending",
      customer: { name: "", company: "", email: "", phone: "" },
      delivery: { method: "delivery", address: "" },
      po: "", notes: "", total: 0, items: []
    };
    $("#modal-main-title").textContent = "Create New Order";
  }
  if (!state.active) return;
  $("#edit-cust-name").value    = state.active.customer.name    || "";
  $("#edit-cust-company").value = state.active.customer.company || "";
  $("#edit-cust-email").value   = state.active.customer.email   || "";
  $("#edit-cust-phone").value   = state.active.customer.phone   || "";
  $("#edit-delivery").value     = state.active.delivery.address || "";
  $("#edit-po").value           = state.active.po || "";
  $("#edit-notes").value        = state.active.notes || "";
  $("#m-status-sel").value      = state.active.status || "pending";
  renderEditableItems();
  $("#order-modal-overlay").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeOrderModal() {
  $("#order-modal-overlay").style.display = "none";
  document.body.style.overflow = "";
  state.active = null;
}

function addItemToOrder() {
  const sel = $("#new-item-sel"), q = $("#new-item-qty");
  if (!sel.value) { alert("Please select a product to add."); return; }
  const qty = parseInt(q.value) || 1;
  const p = state.products[+sel.value];
  state.active.items.push({
    code: p.code, description: p.description, size: p.size,
    pcsPerCtn: p.pack, qty, unit: "piece",
    unitPrice: p.price, lineTotal: p.price * qty
  });
  q.value = 1; sel.value = "";
  renderEditableItems();
}

async function saveOrderChanges(btn) {
  if (!state.active) return;
  const a = state.active;
  a.customer.name    = $("#edit-cust-name").value.trim();
  a.customer.company = $("#edit-cust-company").value.trim();
  a.customer.email   = $("#edit-cust-email").value.trim();
  a.customer.phone   = $("#edit-cust-phone").value.trim();
  a.delivery.address = $("#edit-delivery").value.trim();
  a.po    = $("#edit-po").value.trim();
  a.notes = $("#edit-notes").value.trim();
  a.status = $("#m-status-sel").value;

  const qs = $$(".edit-qty"), ps = $$(".edit-price");
  let total = 0;
  qs.forEach((qi, i) => {
    const q = parseInt(qi.value) || 0, p = parseFloat(ps[i].value) || 0;
    a.items[i].qty = q; a.items[i].unitPrice = p; a.items[i].lineTotal = q * p;
    total += q * p;
  });
  a.total = total;

  if (!state.orders.find((o) => o.id === a.id)) state.orders.push(a);

  btn.textContent = "Saving..."; btn.disabled = true;
  try {
    const r = await saveOrders(state.orders, state.orderSha, "Admin: Saved order " + a.id);
    state.orderSha = r?.content?.sha || state.orderSha;
    showStatus("Order saved" + (isSandbox() ? " (sandbox)" : "") + "!", false);
    closeOrderModal();
    await reloadOrders();
  } catch (e) { showStatus("Error saving order.", true); }
  btn.textContent = "\u{1F4BE} Save All Changes"; btn.disabled = false;
}

/* ---------------- Email Modal ---------------- */
function openEmailModal() {
  if (!state.active) return;
  $("#lbl-cust-email").textContent = `(${state.active.customer.email || "No email saved"})`;
  $("#email-send-msg").style.display = "none";
  $("#chk-cust").checked = true;
  $("#chk-admin").checked = false;
  $("#chk-custom").checked = false;
  $("#custom-email-container").style.display = "none";
  $("#custom-email-container").innerHTML = `
    <div class="custom-email-row">
      <input type="email" class="data-input custom-email-input" placeholder="e.g. accounting@builder.com" style="border-color:rgba(255,255,255,.2);"/>
      <button class="btn-view" data-add-email style="padding:0 12px; font-size:16px;" title="Add another email">+</button>
    </div>`;
  const btn = $("#btn-execute-send");
  btn.disabled = false; btn.innerHTML = "\u{1F680} Send Email(s)"; btn.style.background = "#3498db";
  $("#email-modal-overlay").style.display = "flex";
}

function closeEmailModal() {
  $("#email-modal-overlay").style.display = "none";
}

async function executeSendEmail() {
  if (!state.active) return;
  const order = state.active;
  const type = $("#email-format-sel").value;
  const cfg = window.APBS_CONFIG || {};
  const recipients = [];
  if ($("#chk-cust").checked && order.customer.email) recipients.push(order.customer.email);
  if ($("#chk-admin").checked && cfg.NOTIFY_EMAIL)    recipients.push(cfg.NOTIFY_EMAIL);
  if ($("#chk-custom").checked) {
    $$(".custom-email-input").forEach((i) => { const v = i.value.trim(); if (v) recipients.push(v); });
  }
  const msg = $("#email-send-msg");
  if (!recipients.length) {
    msg.style.display = "block"; msg.style.color = "#ff6b6b";
    msg.textContent = "Please select at least one valid recipient.";
    return;
  }
  let html, subject;
  if (type === "confirm") { html = buildConfirmEmail(order);   subject = "Order Update / Confirmation \u2014 " + order.id; }
  else if (type === "deliver") { html = buildDeliveredEmail(order); subject = "Order Delivered \u2014 Thank You! | All Pro Building Supplies"; }
  else                  { html = buildInvoiceEmail(order);   subject = "Invoice \u2014 Order " + order.id + " | All Pro Building Supplies"; }

  const btn = $("#btn-execute-send");
  btn.disabled = true; btn.innerHTML = "Sending...";
  msg.style.display = "block"; msg.style.color = "#3498db"; msg.textContent = "Processing request...";

  let ok = 0;
  for (const r of recipients) {
    try {
      await sendEmail(orderEmailParams(order, html, subject, r));
      ok++;
    } catch (e) { console.error("Failed to send to", r, e); }
  }
  if (ok > 0) {
    msg.style.color = "#2ecc71";
    msg.textContent = "Sent to " + ok + " recipient(s)" + (isSandbox() ? " (sandbox — see console)" : "") + ".";
    btn.style.background = "#2ecc71"; btn.innerHTML = "\u2714 Done";
    setTimeout(closeEmailModal, 1500);
  } else {
    msg.style.color = "#ff6b6b"; msg.textContent = "Failed to send emails.";
    btn.disabled = false; btn.style.background = "#e74c3c"; btn.innerHTML = "Retry Send";
  }
}

/* ---------------- Init ---------------- */
async function refreshAll() {
  initEmail();
  await Promise.all([reloadOrders(), reloadProducts(), reloadUsers()]);
}

function wireEvents() {
  $("#admin-pin-btn").addEventListener("click", checkAdminAuth);
  $("#admin-pin").addEventListener("keypress", (e) => { if (e.key === "Enter") checkAdminAuth(); });

  $$(".admin-tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  $("#btn-save-products").addEventListener("click", (e) => doSaveProducts(e.currentTarget));
  $("#btn-add-product").addEventListener("click", () => addProductRow());
  $("#prod-tbody").addEventListener("click", (e) => {
    if (e.target.matches("[data-del]")) e.target.closest("tr").remove();
  });

  $("#btn-save-users").addEventListener("click", (e) => doSaveUsers(e.currentTarget));
  $("#btn-new-user").addEventListener("click", () => {
    ["new-user-fname", "new-user-lname", "new-user-email", "new-user-company"]
      .forEach((id) => ($("#" + id).value = ""));
    $("#new-user-password").value = "Welcome1!";
    $("#new-user-status").value = "approved";
    $("#new-user-pcs").value = "true";
    $("#user-modal-overlay").style.display = "flex";
  });
  $("#users-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-user-del]");
    if (btn && confirm("Permanently delete this user?")) {
      state.users.splice(+btn.dataset.idx, 1);
      doSaveUsers($("#btn-save-users"));
    }
  });
  $("#btn-create-user").addEventListener("click", (e) => createNewUser(e.currentTarget));
  $("#user-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "user-modal-overlay" || e.target.classList.contains("modal-close"))
      $("#user-modal-overlay").style.display = "none";
  });

  $("#btn-new-order").addEventListener("click", () => openOrderModal(null));
  $("#orders-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order-open]");
    if (btn) openOrderModal(btn.dataset.id);
  });
  $("#m-status-sel").addEventListener("change", (e) => toggleEditLock(e.target.value));
  $("#btn-add-item").addEventListener("click", addItemToOrder);
  $("#m-items-tbody").addEventListener("input", liveRecalc);
  $("#m-items-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-item-del]");
    if (!btn) return;
    if ($("#m-status-sel").value === "delivered" || $("#m-status-sel").value === "cancelled") return;
    if (confirm("Remove this item?")) {
      state.active.items.splice(+btn.dataset.idx, 1);
      renderEditableItems();
    }
  });
  $("#btn-save-order").addEventListener("click", (e) => saveOrderChanges(e.currentTarget));
  $("#order-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "order-modal-overlay" || e.target.classList.contains("modal-close")) closeOrderModal();
  });

  $("#btn-open-email").addEventListener("click", openEmailModal);
  $("#btn-execute-send").addEventListener("click", executeSendEmail);
  $("#chk-custom").addEventListener("change", (e) => {
    $("#custom-email-container").style.display = e.target.checked ? "block" : "none";
  });
  $("#custom-email-container").addEventListener("click", (e) => {
    if (e.target.matches("[data-add-email]")) {
      const div = document.createElement("div");
      div.className = "custom-email-row";
      div.innerHTML = `
        <input type="email" class="data-input custom-email-input" placeholder="e.g. additional@builder.com" style="border-color:rgba(255,255,255,.2);"/>
        <button class="btn-del" data-del-email style="padding:0 12px; margin-top:0;" title="Remove email">X</button>`;
      $("#custom-email-container").appendChild(div);
    }
    if (e.target.matches("[data-del-email]")) e.target.parentElement.remove();
  });
  $("#email-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "email-modal-overlay" || e.target.classList.contains("modal-close"))
      closeEmailModal();
  });
}

document.addEventListener("apbs:ready", () => {
  wireEvents();
  if (isAdmin()) unlockAdmin();
});
