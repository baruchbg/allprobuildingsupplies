/* admin.mjs — full D1-backed admin dashboard.
 *
 * Every action is a single API call against the allpro-api Worker (see
 * worker/src/index.js). Writes land in allpro-db-sandbox whenever the
 * sandbox build is loaded (X-Sandbox header); otherwise they hit the
 * production D1 database.
 *
 * Tabs:
 *   - Orders     : list, filter, view/edit, duplicate, delete, CSV export
 *   - Products   : list, search, inline edit, add, delete, CSV import/export
 *   - Users      : list, add, edit, password reset, delete, JSON import/export
 *   - Database   : stats, seed from current JSON/CSV, wipe sandbox, backup
 */
import { $, $$, esc } from "../assets/ui.mjs";
import { isAdmin, setAdmin, unlockAdmin as authUnlock } from "../assets/auth.mjs";
import {
  loadProducts, createProduct, updateProduct, deleteProduct,
  importProductsCSV, exportProductsCSV,
  loadUsers, createUser, updateUser, deleteUser,
  importUsers, exportUsers,
  loadOrders, updateOrder, deleteOrder, exportOrdersCSV, placeOrder,
  adminStats, adminSeed, adminWipe, adminBackup,
  isSandbox, Session
} from "../assets/api.mjs";
import {
  initEmail, sendEmail, orderEmailParams,
  buildConfirmEmail, buildDeliveredEmail, buildInvoiceEmail
} from "../assets/email.mjs";

const state = {
  products: [],
  users: [],
  orders: [],
  activeOrder: null,
  filters: { prodQ: "", userQ: "", orderStatus: "", orderEmail: "", orderFrom: "", orderTo: "" }
};

/* ===================================================================
 * Toasts + tabs
 * =================================================================== */
function showStatus(msg, isErr) {
  const el = $("#status-msg");
  el.textContent = msg;
  el.className = isErr ? "status-err" : "status-success";
  el.style.display = "block";
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => (el.style.display = "none"), 4000);
}

function switchTab(tab) {
  $$(".admin-tab").forEach((b) => b.classList.remove("active"));
  $$(".admin-panel").forEach((p) => p.classList.remove("active"));
  const btn = $(`.admin-tab[data-tab="${tab}"]`);
  if (btn) btn.classList.add("active");
  const panel = $("#tab-" + tab);
  if (panel) panel.classList.add("active");
  if (tab === "database") refreshStats();
}

/* ===================================================================
 * Auth gate (PIN -> Worker)
 * =================================================================== */
async function checkAdminAuth() {
  const pin = $("#admin-pin").value.trim();
  $("#admin-pin-btn").disabled = true;
  const r = await authUnlock(pin);
  $("#admin-pin-btn").disabled = false;
  if (!r.ok) {
    $("#admin-auth-err").textContent = r.msg || "Incorrect PIN.";
    $("#admin-auth-err").style.display = "block";
    return;
  }
  unlockUI();
}
function unlockUI() {
  $("#admin-auth-gate").style.display = "none";
  $("#main-admin-content").style.display = "block";
  switchTab("orders");
  refreshAll();
}

/* ===================================================================
 * PRODUCTS
 * =================================================================== */
async function reloadProducts() {
  const { products } = await loadProducts();
  state.products = products;
  renderProducts();
  refreshProductDropdown();
}

function renderProducts() {
  const q = state.filters.prodQ.toLowerCase();
  const tb = $("#prod-tbody");
  const rows = !q
    ? state.products
    : state.products.filter((p) => `${p.code} ${p.description} ${p.size}`.toLowerCase().includes(q));
  tb.innerHTML = rows.map((p, i) => productRow(p, i)).join("");
}

function productRow(p, i) {
  return `<tr data-code="${esc(p.code)}" data-size="${esc(p.size || "")}">
    <td data-label="Code"><input class="data-input p-f" data-f="code" value="${esc(p.code)}" style="width:140px;"/></td>
    <td data-label="Description"><input class="data-input p-f" data-f="description" value="${esc(p.description || "")}"/></td>
    <td data-label="Size"><input class="data-input p-f" data-f="size" value="${esc(p.size || "")}" style="width:90px;"/></td>
    <td data-label="Pack"><input type="number" class="data-input p-f" data-f="pack" value="${p.pack || 0}" style="width:70px;"/></td>
    <td data-label="Qty"><input type="number" class="data-input p-f" data-f="qty" value="${p.qty || 0}" style="width:90px;"/></td>
    <td data-label="Price ($)"><input type="number" step="0.01" class="data-input p-f" data-f="price" value="${(p.price || 0).toFixed(2)}" style="width:90px;"/></td>
    <td data-label="Image"><input class="data-input p-f" data-f="image" value="${esc(p.image || "")}"/></td>
    <td data-label="Action">
      <button class="btn-view" data-prod-save title="Save">Save</button>
      <button class="btn-del"  data-prod-del  title="Delete">Del</button>
    </td>
  </tr>`;
}

function readProductRow(tr) {
  const o = {};
  $$(".p-f", tr).forEach((i) => (o[i.dataset.f] = i.value));
  return o;
}

async function saveProductRow(tr) {
  const origCode = tr.dataset.code;
  const origSize = tr.dataset.size || "";
  const next = readProductRow(tr);
  next.pack  = parseInt(next.pack)  || 0;
  next.qty   = parseInt(next.qty)   || 0;
  next.price = parseFloat(next.price) || 0;
  try {
    if (!origCode) {
      await createProduct(next);
      showStatus("Product created.", false);
    } else if (origCode !== next.code || origSize !== String(next.size || "")) {
      // primary key changed → delete + create
      await deleteProduct(origCode, origSize);
      await createProduct(next);
      showStatus("Product replaced.", false);
    } else {
      await updateProduct(origCode, origSize, next);
      showStatus("Product updated.", false);
    }
    await reloadProducts();
  } catch (e) { showStatus("Save failed: " + e.message, true); }
}

async function deleteProductRow(tr) {
  const code = tr.dataset.code;
  const size = tr.dataset.size || "";
  if (!code) { tr.remove(); return; }
  if (!confirm(`Delete ${code} / ${size || "-"}?`)) return;
  try {
    await deleteProduct(code, size);
    showStatus("Product deleted.", false);
    await reloadProducts();
  } catch (e) { showStatus("Delete failed: " + e.message, true); }
}

function addBlankProductRow() {
  const p = { code: "", description: "", size: "", pack: 0, qty: 0, price: 0, image: "" };
  const html = productRow(p, -1);
  const tb = $("#prod-tbody");
  tb.insertAdjacentHTML("afterbegin", html);
  const tr = tb.firstElementChild;
  tr.dataset.code = ""; tr.dataset.size = "";
  tr.querySelector(".p-f[data-f='code']").focus();
}

async function importProductsFile(file) {
  const text = await file.text();
  try {
    const r = await importProductsCSV(text);
    showStatus(`Imported ${r.count} products.`, false);
    await reloadProducts();
  } catch (e) { showStatus("Import failed: " + e.message, true); }
}

async function exportProductsFile() {
  try {
    const csv = await exportProductsCSV();
    downloadBlob(csv, "products.csv", "text/csv");
  } catch (e) { showStatus("Export failed: " + e.message, true); }
}

/* Product dropdown on the order modal */
function refreshProductDropdown() {
  const sel = $("#new-item-sel");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Select Product to Add --</option>' +
    state.products.map((p, i) =>
      `<option value="${i}">${esc(p.code)} - ${esc(p.description || "")} ${esc(p.size || "")} ($${(p.price || 0).toFixed(2)})</option>`
    ).join("");
}

/* ===================================================================
 * USERS
 * =================================================================== */
async function reloadUsers() {
  const { users } = await loadUsers();
  state.users = users;
  renderUsers();
}

function renderUsers() {
  const q = state.filters.userQ.toLowerCase();
  const tb = $("#users-tbody");
  const rows = !q
    ? state.users
    : state.users.filter((u) => `${u.fname} ${u.lname} ${u.email} ${u.company}`.toLowerCase().includes(q));
  tb.innerHTML = rows.map(userRow).join("");
}

function userRow(u) {
  return `<tr data-id="${esc(u.id)}">
    <td data-label="Name">${esc(u.fname || "")} ${esc(u.lname || "")}</td>
    <td data-label="Email">${esc(u.email || "")}</td>
    <td data-label="Company">${esc(u.company || "")}</td>
    <td data-label="Phone">${esc(u.phone || "")}</td>
    <td data-label="Status">
      <select class="data-input u-status">
        <option value="pending"  ${u.status === "pending"  ? "selected" : ""}>Pending</option>
        <option value="approved" ${u.status === "approved" ? "selected" : ""}>Approved</option>
        <option value="rejected" ${u.status === "rejected" ? "selected" : ""}>Rejected</option>
      </select>
    </td>
    <td data-label="Pieces">
      <select class="data-input u-pcs">
        <option value="true"  ${u.canOrderPieces !== false ? "selected" : ""}>Yes</option>
        <option value="false" ${u.canOrderPieces === false ? "selected" : ""}>Cases Only</option>
      </select>
    </td>
    <td data-label="Action">
      <button class="btn-view" data-user-save>Save</button>
      <button class="btn-view" data-user-reset>Reset PW</button>
      <button class="btn-view" data-user-edit>Edit</button>
      <button class="btn-del"  data-user-del>Del</button>
    </td>
  </tr>`;
}

async function saveUserRow(tr) {
  const id = tr.dataset.id;
  const patch = {
    status:         tr.querySelector(".u-status").value,
    canOrderPieces: tr.querySelector(".u-pcs").value === "true"
  };
  try {
    await updateUser(id, patch);
    showStatus("User updated.", false);
    await reloadUsers();
  } catch (e) { showStatus("Save failed: " + e.message, true); }
}
async function resetUserPassword(tr) {
  const id = tr.dataset.id;
  const pw = prompt("New password for this user:", "Welcome1!");
  if (!pw) return;
  try {
    await updateUser(id, { password: pw });
    showStatus(`Password reset to "${pw}".`, false);
  } catch (e) { showStatus("Reset failed: " + e.message, true); }
}
async function deleteUserRow(tr) {
  if (!confirm("Permanently delete this user?")) return;
  try {
    await deleteUser(tr.dataset.id);
    showStatus("User deleted.", false);
    await reloadUsers();
  } catch (e) { showStatus("Delete failed: " + e.message, true); }
}

function openUserModal(u) {
  state._editingUserId = u ? u.id : null;
  $("#u-modal-title").textContent = u ? "Edit User" : "Add New User";
  const map = {
    "new-user-fname":   u?.fname   || "",
    "new-user-lname":   u?.lname   || "",
    "new-user-email":   u?.email   || "",
    "new-user-company": u?.company || "",
    "new-user-phone":   u?.phone   || "",
    "new-user-password": u ? "" : "Welcome1!"
  };
  for (const [k, v] of Object.entries(map)) $("#" + k).value = v;
  $("#new-user-status").value = u?.status || "approved";
  $("#new-user-pcs").value    = u?.canOrderPieces === false ? "false" : "true";
  $("#user-modal-overlay").style.display = "flex";
  $("#btn-create-user").textContent = u ? "Save User" : "Create User";
}

async function saveUserModal(btn) {
  const get = (id) => $("#" + id).value.trim();
  const body = {
    fname:   get("new-user-fname"),
    lname:   get("new-user-lname"),
    email:   get("new-user-email"),
    company: get("new-user-company"),
    phone:   get("new-user-phone"),
    status:  $("#new-user-status").value,
    canOrderPieces: $("#new-user-pcs").value === "true"
  };
  const pw = get("new-user-password");
  if (pw) body.password = pw;

  if (!body.fname || !body.lname || !body.email) { alert("First, last, and email are required."); return; }
  const isEdit = !!state._editingUserId;
  if (!isEdit && !pw) { alert("Password is required for new users."); return; }

  btn.disabled = true; btn.textContent = "Saving...";
  try {
    if (isEdit) await updateUser(state._editingUserId, body);
    else        await createUser(body);
    showStatus(isEdit ? "User updated." : "User created.", false);
    $("#user-modal-overlay").style.display = "none";
    await reloadUsers();
  } catch (e) { showStatus("Save failed: " + e.message, true); }
  btn.disabled = false; btn.textContent = isEdit ? "Save User" : "Create User";
}

async function importUsersFile(file) {
  const text = await file.text();
  let data; try { data = JSON.parse(text); } catch { showStatus("Invalid JSON.", true); return; }
  const users = Array.isArray(data) ? data : (data.users || []);
  if (!users.length) { showStatus("No users found in file.", true); return; }
  if (!confirm(`This will REPLACE all users with ${users.length} rows from the file. Continue?`)) return;
  try {
    const r = await importUsers(users);
    showStatus(`Imported ${r.count} users.`, false);
    await reloadUsers();
  } catch (e) { showStatus("Import failed: " + e.message, true); }
}
async function exportUsersFile() {
  try {
    const r = await exportUsers();
    downloadBlob(JSON.stringify({ users: r.users }, null, 2), "users.json", "application/json");
  } catch (e) { showStatus("Export failed: " + e.message, true); }
}

/* ===================================================================
 * ORDERS
 * =================================================================== */
async function reloadOrders() {
  const f = state.filters;
  const filters = {};
  if (f.orderStatus) filters.status = f.orderStatus;
  if (f.orderEmail)  filters.email  = f.orderEmail;
  if (f.orderFrom)   filters.from   = Date.parse(f.orderFrom);
  if (f.orderTo)     filters.to     = Date.parse(f.orderTo) + 86400000;
  const { orders } = await loadOrders(filters);
  state.orders = orders;
  renderOrders();
}

function renderOrders() {
  const tb = $("#orders-tbody");
  if (!state.orders.length) {
    tb.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--silver)">No orders match the current filter.</td></tr>`;
    return;
  }
  tb.innerHTML = state.orders.map((o) => `
    <tr data-id="${esc(o.id)}">
      <td data-label="Order ID" style="font-family:monospace;color:var(--gold)">${esc(o.id)}</td>
      <td data-label="Date">${new Date(o.placedAt).toLocaleDateString()}</td>
      <td data-label="Customer">${esc(o.customer?.name || "")}<br><span style="font-size:10px;color:var(--silver)">${esc(o.customer?.company || "")}</span></td>
      <td data-label="Total" style="font-family:monospace">$${(o.total || 0).toFixed(2)}</td>
      <td data-label="Status"><span class="badge ${esc(o.status)}">${esc(o.status)}</span></td>
      <td data-label="Action">
        <button class="btn-view" data-order-open>Edit</button>
        <button class="btn-view" data-order-dup>Duplicate</button>
        <button class="btn-del"  data-order-del>Del</button>
      </td>
    </tr>`).join("");
}

function toggleEditLock(status) {
  const locked = status === "delivered" || status === "cancelled";
  ["edit-cust-name","edit-cust-company","edit-cust-email","edit-cust-phone","edit-delivery","edit-po","edit-notes"]
    .forEach((id) => { const el = $("#" + id); el.disabled = locked; el.style.opacity = locked ? "0.6" : "1"; });
  $$(".edit-qty, .edit-price").forEach((i) => { i.disabled = locked; i.style.opacity = locked ? "0.6" : "1"; });
  $$("#m-items-tbody .btn-del").forEach((b) => { b.disabled = locked; b.style.opacity = locked ? "0.5" : "1"; });
  $("#add-item-container").style.display = locked ? "none" : "flex";
  $("#edit-lock-banner").style.display = locked ? "block" : "none";
}

function renderEditableItems() {
  const tb = $("#m-items-tbody"); tb.innerHTML = "";
  let total = 0;
  (state.activeOrder.items || []).forEach((it, idx) => {
    const line = (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0);
    total += line;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Item">${esc(it.description || "")} ${esc(it.size || "")}<br><span style="font-size:10px;color:var(--silver)">${esc(it.code)}</span></td>
      <td data-label="Qty"><input type="number" class="data-input edit-qty" data-idx="${idx}" value="${it.qty}" style="width:70px;"/></td>
      <td data-label="Unit Price"><input type="number" step="0.01" class="data-input edit-price" data-idx="${idx}" value="${(it.unitPrice || 0).toFixed(2)}" style="width:90px;"/></td>
      <td data-label="Line Total" class="live-line-tot" style="text-align:right;font-family:monospace;color:var(--white)">$${line.toFixed(2)}</td>
      <td data-label="Action"><button class="btn-del" data-item-del data-idx="${idx}">X</button></td>`;
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
    total += line; ls[i].textContent = "$" + line.toFixed(2);
  });
  $("#m-total").textContent = "$" + total.toFixed(2);
}

function openOrderModal(id) {
  const o = id ? state.orders.find((o) => o.id === id) : null;
  if (id && !o) return;
  if (!state.activeOrder || id) {
    state.activeOrder = o
      ? JSON.parse(JSON.stringify(o))
      : {
          id: "APB-" + Date.now().toString(36).toUpperCase(),
          placedAt: new Date().toISOString(), status: "pending",
          customer: { name: "", company: "", email: "", phone: "" },
          delivery: { method: "delivery", address: "" },
          po: "", notes: "", total: 0, items: []
        };
  }
  $("#modal-main-title").textContent = id ? "Edit Order: " + id : "Create New Order";
  $("#edit-cust-name").value    = state.activeOrder.customer?.name    || "";
  $("#edit-cust-company").value = state.activeOrder.customer?.company || "";
  $("#edit-cust-email").value   = state.activeOrder.customer?.email   || "";
  $("#edit-cust-phone").value   = state.activeOrder.customer?.phone   || "";
  $("#edit-delivery").value     = state.activeOrder.delivery?.address || "";
  $("#edit-po").value            = state.activeOrder.po || "";
  $("#edit-notes").value         = state.activeOrder.notes || "";
  $("#m-status-sel").value       = state.activeOrder.status || "pending";
  renderEditableItems();
  $("#order-modal-overlay").style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeOrderModal() {
  $("#order-modal-overlay").style.display = "none";
  document.body.style.overflow = "";
  state.activeOrder = null;
}

function addItemToOrder() {
  const sel = $("#new-item-sel"), q = $("#new-item-qty");
  if (!sel.value) { alert("Please select a product."); return; }
  const qty = parseInt(q.value) || 1;
  const p = state.products[+sel.value];
  state.activeOrder.items.push({
    code: p.code, description: p.description, size: p.size,
    pcsPerCtn: p.pack, qty, unit: "piece",
    unitPrice: p.price, lineTotal: p.price * qty
  });
  q.value = 1; sel.value = "";
  renderEditableItems();
}

async function saveOrderChanges(btn) {
  if (!state.activeOrder) return;
  const a = state.activeOrder;
  a.customer.name    = $("#edit-cust-name").value.trim();
  a.customer.company = $("#edit-cust-company").value.trim();
  a.customer.email   = $("#edit-cust-email").value.trim();
  a.customer.phone   = $("#edit-cust-phone").value.trim();
  a.delivery.address = $("#edit-delivery").value.trim();
  a.po     = $("#edit-po").value.trim();
  a.notes  = $("#edit-notes").value.trim();
  a.status = $("#m-status-sel").value;

  const qs = $$(".edit-qty"), ps = $$(".edit-price");
  let total = 0;
  qs.forEach((qi, i) => {
    const q = parseInt(qi.value) || 0, p = parseFloat(ps[i].value) || 0;
    a.items[i].qty = q; a.items[i].unitPrice = p; a.items[i].lineTotal = q * p;
    total += q * p;
  });
  a.total = total;

  btn.disabled = true; btn.textContent = "Saving...";
  try {
    const existing = state.orders.find((o) => o.id === a.id);
    if (existing) {
      await updateOrder(a.id, {
        status: a.status, total: a.total,
        customer: a.customer, delivery: a.delivery,
        po: a.po, notes: a.notes, items: a.items
      });
      showStatus("Order updated.", false);
    } else {
      if (!a.customer.email) { showStatus("Customer email is required to create an order.", true); return; }
      await placeOrder(a);
      showStatus("Order created.", false);
    }
    closeOrderModal();
    await reloadOrders();
  } catch (e) { showStatus("Save failed: " + e.message, true); }
  btn.disabled = false; btn.textContent = "\u{1F4BE} Save All Changes";
}

async function duplicateOrder(id) {
  const o = state.orders.find((x) => x.id === id);
  if (!o) return;
  const copy = JSON.parse(JSON.stringify(o));
  copy.id = "APB-" + Date.now().toString(36).toUpperCase();
  copy.status = "pending";
  copy.placedAt = new Date().toISOString();
  state.activeOrder = copy;
  openOrderModal(null);
  $("#modal-main-title").textContent = "Duplicate of " + id;
  showStatus("Edit and click Save to create a new order for this customer.", false);
}

async function deleteOrderRow(id) {
  if (!confirm("Permanently delete order " + id + "?")) return;
  try {
    await deleteOrder(id);
    showStatus("Order deleted.", false);
    await reloadOrders();
  } catch (e) { showStatus("Delete failed: " + e.message, true); }
}

async function exportOrdersFile() {
  try {
    const csv = await exportOrdersCSV();
    downloadBlob(csv, "orders.csv", "text/csv");
  } catch (e) { showStatus("Export failed: " + e.message, true); }
}

/* ===================================================================
 * Email command center (unchanged external behaviour)
 * =================================================================== */
function openEmailModal() {
  if (!state.activeOrder) return;
  $("#lbl-cust-email").textContent = `(${state.activeOrder.customer?.email || "No email saved"})`;
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
function closeEmailModal() { $("#email-modal-overlay").style.display = "none"; }

async function executeSendEmail() {
  if (!state.activeOrder) return;
  const order = state.activeOrder;
  const type = $("#email-format-sel").value;
  const cfg = window.APBS_CONFIG || {};
  const recipients = [];
  if ($("#chk-cust").checked && order.customer?.email) recipients.push(order.customer.email);
  if ($("#chk-admin").checked && cfg.NOTIFY_EMAIL)    recipients.push(cfg.NOTIFY_EMAIL);
  if ($("#chk-custom").checked) {
    $$(".custom-email-input").forEach((i) => { const v = i.value.trim(); if (v) recipients.push(v); });
  }
  const msg = $("#email-send-msg");
  if (!recipients.length) {
    msg.style.display = "block"; msg.style.color = "#ff6b6b";
    msg.textContent = "Please select at least one valid recipient."; return;
  }
  let html, subject;
  if (type === "confirm")      { html = buildConfirmEmail(order);   subject = "Order Update / Confirmation — " + order.id; }
  else if (type === "deliver") { html = buildDeliveredEmail(order); subject = "Order Delivered — Thank You! | All Pro Building Supplies"; }
  else                         { html = buildInvoiceEmail(order);   subject = "Invoice — Order " + order.id + " | All Pro Building Supplies"; }

  const btn = $("#btn-execute-send");
  btn.disabled = true; btn.innerHTML = "Sending...";
  msg.style.display = "block"; msg.style.color = "#3498db"; msg.textContent = "Processing request...";

  let ok = 0;
  for (const r of recipients) {
    try { await sendEmail(orderEmailParams(order, html, subject, r)); ok++; }
    catch (e) { console.error("Failed to send to", r, e); }
  }
  if (ok) {
    msg.style.color = "#2ecc71";
    msg.textContent = "Sent to " + ok + " recipient(s)" + (isSandbox() ? " (sandbox — see console)" : "") + ".";
    btn.style.background = "#2ecc71"; btn.innerHTML = "\u2714 Done";
    setTimeout(closeEmailModal, 1500);
  } else {
    msg.style.color = "#ff6b6b"; msg.textContent = "Failed to send emails.";
    btn.disabled = false; btn.style.background = "#e74c3c"; btn.innerHTML = "Retry Send";
  }
}

/* ===================================================================
 * DATABASE tab
 * =================================================================== */
async function refreshStats() {
  try {
    const s = await adminStats();
    $("#db-users").textContent    = s.users;
    $("#db-products").textContent = s.products;
    $("#db-orders").textContent   = s.orders;
    $("#db-pending").textContent  = s.pendingUsers;
    $("#db-inv").textContent      = s.totalInventory;
    $("#db-mode").textContent     = isSandbox() ? "sandbox" : "production";
    $("#db-btn-wipe").style.display = isSandbox() ? "inline-flex" : "none";
  } catch (e) { showStatus("Stats failed: " + e.message, true); }
}

async function seedFromFiles(users, products, orders) {
  const body = {};
  if (users)    body.users    = users;
  if (products) body.products = products;
  if (orders)   body.orders   = orders;
  if (!confirm(
    "This will REPLACE all rows in the current database (" +
    (isSandbox() ? "sandbox" : "production") + "). Continue?"
  )) return;
  try {
    const r = await adminSeed(body);
    showStatus(`Seeded: users=${r.users}, products=${r.products}, orders=${r.orders}`, false);
    refreshStats();
  } catch (e) { showStatus("Seed failed: " + e.message, true); }
}

function seedFromLocalFiles() {
  const inp = document.createElement("input");
  inp.type = "file"; inp.multiple = true;
  inp.accept = ".json,.csv";
  inp.addEventListener("change", async () => {
    const out = {};
    for (const f of inp.files) {
      const text = await f.text();
      if (/products\.csv$/i.test(f.name))        out.products = text;
      else if (/users\.json$/i.test(f.name))    out.users    = (JSON.parse(text).users) || JSON.parse(text);
      else if (/orders\.json$/i.test(f.name))   out.orders   = (JSON.parse(text).orders) || JSON.parse(text);
    }
    if (!Object.keys(out).length) { showStatus("No recognised files selected (products.csv, users.json, orders.json).", true); return; }
    await seedFromFiles(out.users, out.products, out.orders);
  });
  inp.click();
}

async function wipeSandbox() {
  if (!isSandbox()) { showStatus("Refusing to wipe production.", true); return; }
  if (!confirm("Delete ALL rows from the sandbox DB? This cannot be undone.")) return;
  try {
    await adminWipe();
    showStatus("Sandbox wiped.", false);
    refreshStats(); reloadProducts(); reloadUsers(); reloadOrders();
  } catch (e) { showStatus("Wipe failed: " + e.message, true); }
}
async function backupDownload() {
  try {
    const json = await adminBackup();
    downloadBlob(json, `allpro-backup-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  } catch (e) { showStatus("Backup failed: " + e.message, true); }
}

/* ===================================================================
 * Helpers
 * =================================================================== */
function downloadBlob(data, filename, mime) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function refreshAll() {
  initEmail();
  try { await Promise.all([reloadProducts(), reloadUsers(), reloadOrders(), refreshStats()]); }
  catch (e) { showStatus("Load failed: " + e.message, true); }
}

/* ===================================================================
 * Wire events
 * =================================================================== */
function wireEvents() {
  $("#admin-pin-btn").addEventListener("click", checkAdminAuth);
  $("#admin-pin").addEventListener("keypress", (e) => { if (e.key === "Enter") checkAdminAuth(); });
  $("#admin-logout")?.addEventListener("click", () => {
    setAdmin(false); Session.setAdminKey(null);
    $("#main-admin-content").style.display = "none";
    $("#admin-auth-gate").style.display = "block";
    $("#admin-pin").value = "";
  });

  $$(".admin-tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

  /* ---- Products ---- */
  $("#prod-search")?.addEventListener("input", (e) => { state.filters.prodQ = e.target.value; renderProducts(); });
  $("#btn-add-product").addEventListener("click", addBlankProductRow);
  $("#prod-tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    if (e.target.matches("[data-prod-save]")) saveProductRow(tr);
    else if (e.target.matches("[data-prod-del]")) deleteProductRow(tr);
  });
  $("#btn-import-products")?.addEventListener("click", () => $("#file-import-products").click());
  $("#file-import-products")?.addEventListener("change", (e) => {
    if (e.target.files[0]) importProductsFile(e.target.files[0]);
    e.target.value = "";
  });
  $("#btn-export-products")?.addEventListener("click", exportProductsFile);

  /* ---- Users ---- */
  $("#user-search")?.addEventListener("input", (e) => { state.filters.userQ = e.target.value; renderUsers(); });
  $("#btn-new-user").addEventListener("click", () => openUserModal(null));
  $("#btn-create-user").addEventListener("click", (e) => saveUserModal(e.currentTarget));
  $("#user-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "user-modal-overlay" || e.target.classList.contains("modal-close"))
      $("#user-modal-overlay").style.display = "none";
  });
  $("#users-tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    if (e.target.matches("[data-user-save]"))       saveUserRow(tr);
    else if (e.target.matches("[data-user-reset]")) resetUserPassword(tr);
    else if (e.target.matches("[data-user-edit]")) {
      const u = state.users.find((u) => u.id === tr.dataset.id);
      if (u) openUserModal(u);
    }
    else if (e.target.matches("[data-user-del]"))   deleteUserRow(tr);
  });
  $("#btn-import-users")?.addEventListener("click", () => $("#file-import-users").click());
  $("#file-import-users")?.addEventListener("change", (e) => {
    if (e.target.files[0]) importUsersFile(e.target.files[0]);
    e.target.value = "";
  });
  $("#btn-export-users")?.addEventListener("click", exportUsersFile);

  /* ---- Orders ---- */
  $("#order-status-f")?.addEventListener("change", (e) => { state.filters.orderStatus = e.target.value; reloadOrders(); });
  $("#order-email-f")?.addEventListener("input",  (e) => { state.filters.orderEmail  = e.target.value; });
  $("#order-email-f")?.addEventListener("change", () => reloadOrders());
  $("#order-from-f")?.addEventListener("change",  (e) => { state.filters.orderFrom = e.target.value; reloadOrders(); });
  $("#order-to-f")?.addEventListener("change",    (e) => { state.filters.orderTo   = e.target.value; reloadOrders(); });
  $("#btn-new-order")?.addEventListener("click", () => openOrderModal(null));
  $("#btn-export-orders")?.addEventListener("click", exportOrdersFile);
  $("#orders-tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const id = tr.dataset.id;
    if (e.target.matches("[data-order-open]")) openOrderModal(id);
    else if (e.target.matches("[data-order-dup]")) duplicateOrder(id);
    else if (e.target.matches("[data-order-del]")) deleteOrderRow(id);
  });

  /* ---- Order modal ---- */
  $("#m-status-sel").addEventListener("change", (e) => toggleEditLock(e.target.value));
  $("#btn-add-item").addEventListener("click", addItemToOrder);
  $("#m-items-tbody").addEventListener("input", liveRecalc);
  $("#m-items-tbody").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-item-del]"); if (!btn) return;
    if ($("#m-status-sel").value === "delivered" || $("#m-status-sel").value === "cancelled") return;
    if (confirm("Remove this item?")) {
      state.activeOrder.items.splice(+btn.dataset.idx, 1);
      renderEditableItems();
    }
  });
  $("#btn-save-order").addEventListener("click", (e) => saveOrderChanges(e.currentTarget));
  $("#order-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "order-modal-overlay" || e.target.classList.contains("modal-close")) closeOrderModal();
  });

  /* ---- Email modal ---- */
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

  /* ---- Database tab ---- */
  $("#btn-refresh-stats")?.addEventListener("click", refreshStats);
  $("#btn-seed-local")?.addEventListener("click", seedFromLocalFiles);
  $("#btn-backup")?.addEventListener("click", backupDownload);
  $("#db-btn-wipe")?.addEventListener("click", wipeSandbox);
}

document.addEventListener("apbs:ready", () => {
  wireEvents();
  if (isAdmin() && Session.getAdminKey()) unlockUI();
});
