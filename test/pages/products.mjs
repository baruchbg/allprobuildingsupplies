/* products.mjs — product catalog page. */
import { $, $$, esc, updateNavCount } from "../assets/ui.mjs";
import { loadProducts } from "../assets/api.mjs";
import { isLoggedIn, getUser } from "../assets/auth.mjs";
import { getCart, saveCart, addItem } from "../assets/cart.mjs";
import { renderProductSection } from "../components/product-row.mjs";

function imgPath(src) {
  if (!src) return "../images/logo.png";
  if (/^https?:/i.test(src)) return src;
  return /^(images|assets)\//.test(src) ? "../" + src : src;
}

function groupProducts(products) {
  const groups = {};
  for (const p of products) {
    if (!p.code) continue;
    const code = String(p.code).trim();
    if (!groups[code]) {
      groups[code] = { desc: p.description || code, image: p.image || "../images/logo.png", rows: [] };
    }
    groups[code].rows.push({
      size: p.size || "",
      pack: p.pack || "",
      qty:  parseInt(p.qty)  || 0,
      price: parseFloat(p.price) || 0
    });
  }
  return groups;
}

function buildFilters(codes) {
  const desk = $("#dynamic-filters");
  const mob  = $("#mobile-filter-select");
  codes.forEach((code) => {
    const b = document.createElement("button");
    b.className = "filter-btn";
    b.textContent = code;
    b.dataset.filter = code;
    desk.appendChild(b);

    const o = document.createElement("option");
    o.value = code; o.textContent = code;
    mob.appendChild(o);
  });
}

function setFilter(code, btn) {
  $$(".filter-btn").forEach((b) => b.classList.remove("on"));
  if (btn) btn.classList.add("on");
  else {
    const match = $$(".filter-btn").find((b) => (b.dataset.filter || "all") === code);
    if (match) match.classList.add("on");
  }
  const sel = $("#mobile-filter-select");
  if (sel) sel.value = code;
  $$(".prod-section").forEach((s) => {
    s.style.display = code === "all" || s.dataset.code === code ? "" : "none";
  });
}

function openLightbox(src, title) {
  const lb = $("#img-lightbox");
  const img = $("#img-lb-img");
  const ttl = $("#img-lb-title");
  if (!lb || !img) return;
  img.src = src; img.alt = title || "";
  if (ttl) ttl.textContent = title || "";
  lb.style.display = "flex";
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  const lb = $("#img-lightbox");
  if (lb) lb.style.display = "none";
  document.body.style.overflow = "";
}

function flashAdded(btn) {
  const orig = btn.textContent;
  btn.textContent = "Added!";
  btn.style.background = "rgba(46,204,113,.15)";
  btn.style.borderColor = "#2ecc71";
  btn.style.color = "#2ecc71";
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = ""; btn.style.borderColor = ""; btn.style.color = "";
  }, 1200);
}

document.addEventListener("apbs:ready", async () => {
  const loggedIn = isLoggedIn();
  const user = getUser();
  const container = $("#prod-sections");
  const loginBanner = $("#login-banner");
  const howTo = $("#how-to-order-box");

  if (loggedIn) {
    if (loginBanner) loginBanner.style.display = "none";
    if (howTo) howTo.style.display = "none";
  } else {
    if (loginBanner) loginBanner.style.display = "flex";
  }

  try {
    const { products } = await loadProducts();
    const groups = groupProducts(products);
    const codes = Object.keys(groups);

    if (!codes.length) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--silver);font-family:'DM Mono',monospace;">Sandbox mode: inventory file is empty. Log all PUTs to console instead.</div>`;
    } else {
      buildFilters(codes);
      container.innerHTML = codes.map((code) => {
        const g = groups[code];
        return renderProductSection(code, { ...g, image: imgPath(g.image) }, loggedIn);
      }).join("");
    }
  } catch (e) {
    container.innerHTML = `<div style="text-align:center;padding:40px;color:#ff6b6b;">Error loading catalog. ${esc(e.message)}</div>`;
  }

  container.addEventListener("click", (ev) => {
    const tog = ev.target.closest("[data-toggle]");
    if (tog) {
      tog.parentElement.classList.toggle("open");
      return;
    }
    const box = ev.target.closest("[data-lightbox]");
    if (box) {
      ev.stopPropagation();
      openLightbox(box.dataset.img, box.dataset.title);
      return;
    }
    const add = ev.target.closest("[data-add]");
    if (add) {
      if (!loggedIn) {
        alert("You must be logged into an approved trade account to add items to your cart.");
        location.href = "login.html";
        return;
      }
      const row = {
        code: add.dataset.code,
        size: add.dataset.size,
        description: add.dataset.desc,
        pcsPerCtn: parseInt(add.dataset.pcs) || 1,
        unitPrice: parseFloat(add.dataset.price) || 0,
        maxQty: parseInt(add.dataset.qty) || 0
      };
      const cart = addItem(getCart(), row, user?.canOrderPieces);
      saveCart(cart);
      updateNavCount();
      flashAdded(add);
    }
  });

  // filter bar delegation
  $("#dynamic-filters").addEventListener("click", (e) => {
    const b = e.target.closest(".filter-btn");
    if (!b) return;
    setFilter(b.dataset.filter || "all", b);
  });
  $("#mobile-filter-select")?.addEventListener("change", (e) => setFilter(e.target.value));

  const search = $("#prod-search");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      $$(".prod-section").forEach((s) => {
        if (!q) { s.style.display = ""; return; }
        const text = s.textContent.toLowerCase();
        const hit = text.includes(q);
        s.style.display = hit ? "" : "none";
        if (hit) s.classList.add("open");
      });
    });
  }

  $("#img-lightbox")?.addEventListener("click", closeLightbox);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
});
