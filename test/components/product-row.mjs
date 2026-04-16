/* product-row.mjs — renders one <tr> for the expandable products table
 * and the `prod-section` group wrapper used by the Products page.
 */
import { esc } from "../assets/ui.mjs";

function imgPath(src) {
  if (!src) return "../images/logo.png";
  if (/^https?:/i.test(src)) return src;
  return /^(images|assets)\//.test(src) ? "../" + src : src;
}

export function renderProductRow(code, item, loggedIn) {
  const oos = item.qty <= 0;
  const avail = oos
    ? `<span style="color:var(--silver)">Call for Availability</span>`
    : `<span style="color:#4CAF50">&#9679; In Stock</span> <span class="qty-badge">${item.qty}</span>`;
  const price = loggedIn
    ? `<span style="color:var(--white);font-weight:500">$${item.price.toFixed(2)}</span>`
    : `<span class="price-locked">&#128274; Login to view</span>`;

  const btn = oos
    ? `<button class="add-to-cart-btn" disabled style="border-color:#555;color:#555;">Out of Stock</button>`
    : `<button class="add-to-cart-btn" data-add data-code="${esc(code)}" data-size="${esc(item.size)}" data-desc="${esc(item.desc)}" data-pcs="${esc(item.pack)}" data-price="${item.price}" data-qty="${item.qty}">+ Cart</button>`;

  return `<tr data-code="${esc(code)}">
    <td>${esc(item.size)}<div class="mobile-pack">${esc(item.pack)}/CTN</div></td>
    <td><span class="qty-badge">${esc(item.pack)}/CTN</span></td>
    <td>${avail}</td>
    <td class="price">${price}</td>
    <td>${btn}</td>
  </tr>`;
}

export function renderProductSection(code, group, loggedIn) {
  const rows = group.rows.map((r) => renderProductRow(code, { ...r, desc: group.desc }, loggedIn)).join("");
  return `<div class="prod-section" id="${esc(code)}" data-code="${esc(code)}">
    <div class="prod-section-hdr" data-toggle>
      <div class="prod-section-thumb" data-lightbox data-img="${esc(imgPath(group.image))}" data-title="${esc(group.desc)}">
        <img src="${esc(imgPath(group.image))}" alt="${esc(group.desc)}" class="cat-img" loading="lazy"/>
      </div>
      <div class="prod-section-meta">
        <div class="prod-section-code">${esc(code)}</div>
        <div class="prod-section-title">${esc(group.desc)}</div>
      </div>
      <span class="prod-section-chevron">&#9660;</span>
    </div>
    <div class="prod-section-body">
      <table class="prod-inner-table">
        <thead><tr><th>Size</th><th>Pack</th><th>Availability</th><th class="price-col-hdr">${loggedIn ? "Unit Price" : "Unit Price &#128274;"}</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}
