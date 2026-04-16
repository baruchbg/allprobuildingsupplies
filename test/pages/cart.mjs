/* cart.mjs — cart page logic (replaces 400 lines of inline script). */
import { $, $$, esc, updateNavCount } from "../assets/ui.mjs";
import { getCart, saveCart, clearCart } from "../assets/cart.mjs";
import { loadProducts } from "../assets/api.mjs";
import { isLoggedIn, getUser } from "../assets/auth.mjs";

let liveInv = {};

async function fetchLiveInventory() {
  try {
    const { rows } = await loadProducts();
    for (let i = 1; i < rows.length; i++) {
      const c = rows[i];
      if (!c[0]) continue;
      const code = c[0];
      const size = (c[2] || "").replace(/"/g, "").trim();
      const qty  = parseInt(c[4]) || 0;
      liveInv[code + "|" + size] = qty;
    }
  } catch (e) {
    console.warn("Could not fetch live inventory", e);
  }
}

function render() {
  const canOrderPieces = getUser()?.canOrderPieces !== false;
  const cart = getCart();
  const contents = $("#cart-contents");
  const empty = $("#cart-empty");

  if (!cart.length) {
    contents.style.display = "none";
    empty.style.display = "block";
    return;
  }
  contents.style.display = "block";
  empty.style.display = "none";

  const tbody = $("#cart-tbody");
  tbody.innerHTML = "";
  let subtotal = 0, totalItems = 0;

  cart.forEach((item, idx) => {
    const key = item.code + "|" + (item.size || "").replace(/"/g, "");
    const maxQty = liveInv[key] !== undefined ? liveInv[key] : (item.maxQty || 9999);
    if (item.qty > maxQty) { item.qty = maxQty; saveCart(cart); }

    const unit = parseFloat(item.unitPrice) || 0;
    const line = unit * item.qty;
    subtotal += line; totalItems += item.qty;

    const warn = maxQty > 0 && item.qty >= maxQty
      ? `<div class="stock-warn">&#9888; Max available: ${maxQty}</div>` : "";

    const pieceRadio = canOrderPieces
      ? `<label><input type="radio" name="unit-${idx}" value="piece" ${item.unit === "piece" ? "checked" : ""}/> Piece</label>` : "";
    const casesOnly = !canOrderPieces
      ? `<span style="font-size:10px;color:var(--silver);margin-left:4px">CASES ONLY</span>` : "";

    const tr = document.createElement("tr");
    tr.dataset.idx = idx;
    tr.innerHTML = `
      <td>
        <div class="cart-prod-name">${esc(item.description || "")} ${esc(item.size || "")}</div>
        <div class="cart-prod-sub">${esc(item.code)} &nbsp;|&nbsp; ${esc(item.pcsPerCtn || "")} pcs/ctn</div>
      </td>
      <td class="cart-price">$${unit.toFixed(2)}</td>
      <td><div class="unit-toggle">
        ${pieceRadio}
        <label><input type="radio" name="unit-${idx}" value="carton" ${item.unit === "carton" ? "checked" : ""}/> Carton</label>
        ${casesOnly}
      </div></td>
      <td>
        <div class="qty-wrap">
          <button class="qty-btn" data-q="-1">&minus;</button>
          <input class="qty-input" type="number" min="1" max="${maxQty}" value="${item.qty}" data-q-input/>
          <button class="qty-btn" data-q="1">+</button>
        </div>
        <div class="qty-unit">${item.unit === "carton" ? Math.ceil(item.qty / (item.pcsPerCtn || 1)) + " ctn" : item.qty + " pcs"}</div>
        ${warn}
      </td>
      <td class="cart-line-total">$${line.toFixed(2)}</td>
      <td><button class="cart-remove" data-remove title="Remove">&times;</button></td>
    `;
    tr.dataset.max = maxQty;
    tbody.appendChild(tr);
  });

  $("#summary-subtotal").textContent = "$" + subtotal.toFixed(2);
  $("#summary-total").textContent = "$" + subtotal.toFixed(2);
  $("#summary-items").textContent = totalItems + " pcs";
  updateNavCount();
}

function changeQty(idx, delta, maxQty) {
  const cart = getCart();
  let q = (cart[idx].qty || 1) + delta;
  if (q < 1) q = 1;
  if (maxQty && q > maxQty) q = maxQty;
  cart[idx].qty = q;
  saveCart(cart);
  render();
}

function setUnit(idx, unit) {
  const cart = getCart();
  if (unit === "piece" && getUser()?.canOrderPieces === false) return;
  cart[idx].unit = unit;
  if (unit === "carton") {
    const pcs = cart[idx].pcsPerCtn || 1;
    cart[idx].qty = Math.round(cart[idx].qty / pcs) * pcs;
  }
  saveCart(cart);
  render();
}

document.addEventListener("apbs:ready", async () => {
  if (!isLoggedIn()) {
    $("#auth-gate").style.display = "block";
    $("#cart-empty").style.display = "none";
    $("#cart-contents").style.display = "none";
    return;
  }
  await fetchLiveInventory();
  render();

  $("#cart-tbody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const idx = parseInt(tr.dataset.idx);
    const max = parseInt(tr.dataset.max) || undefined;

    if (e.target.matches("[data-remove]")) {
      const cart = getCart(); cart.splice(idx, 1); saveCart(cart); render(); return;
    }
    const dq = e.target.closest("[data-q]");
    if (dq) { changeQty(idx, parseInt(dq.dataset.q), max); return; }
  });
  $("#cart-tbody").addEventListener("change", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const idx = parseInt(tr.dataset.idx);
    const max = parseInt(tr.dataset.max) || undefined;
    if (e.target.matches("[data-q-input]")) {
      const cart = getCart();
      let q = parseInt(e.target.value) || 1; if (q < 1) q = 1; if (max && q > max) q = max;
      cart[idx].qty = q; saveCart(cart); render(); return;
    }
    if (e.target.matches(`input[name^="unit-"]`)) {
      setUnit(idx, e.target.value);
    }
  });

  $("#clear-cart")?.addEventListener("click", () => {
    if (confirm("Clear all items from your cart?")) { clearCart(); render(); }
  });
});
