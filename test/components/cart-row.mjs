/* cart-row.mjs — renders a single cart row (cart.html + checkout.html summary). */
import { esc } from "../assets/ui.mjs";

export function renderCartRow(item, idx) {
  const price = parseFloat(item.unitPrice) || 0;
  const qty   = parseInt(item.qty) || 0;
  const line  = (price * qty).toFixed(2);
  return `<tr data-idx="${idx}">
    <td>
      <div style="font-weight:700;color:var(--gold)">${esc(item.code)} — ${esc(item.size)}</div>
      <div style="color:var(--silver);font-size:.85rem">${esc(item.description || "")}</div>
      <div style="color:var(--silver);font-size:.8rem">${esc(item.pcsPerCtn || "")}/CTN</div>
    </td>
    <td>
      <div class="qty-controls">
        <button data-qty-dec aria-label="decrease">&minus;</button>
        <input type="number" min="1" value="${qty}" data-qty-input aria-label="quantity"/>
        <button data-qty-inc aria-label="increase">+</button>
      </div>
    </td>
    <td style="text-align:right">$${price.toFixed(2)}</td>
    <td style="text-align:right;font-weight:700;color:var(--gold)">$${line}</td>
    <td style="text-align:right"><button class="btn-remove" data-remove aria-label="remove">&times;</button></td>
  </tr>`;
}

export function renderCartSummaryRow(item) {
  const price = parseFloat(item.unitPrice) || 0;
  const qty   = parseInt(item.qty) || 0;
  return `<tr>
    <td>${esc(item.code)} ${esc(item.size)} <span style="color:var(--silver)">&times;${qty}</span></td>
    <td style="text-align:right">$${(price * qty).toFixed(2)}</td>
  </tr>`;
}
