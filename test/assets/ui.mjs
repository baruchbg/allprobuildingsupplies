/* ui.mjs — shared UI helpers used by every page.
 * Combines what used to live in main.js plus the repeated
 * auth-aware nav sync and cart-count update that appeared
 * inline on almost every page.
 */
import { getCart } from "./cart.mjs";
import { getUser } from "./auth.mjs";

export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (v == null) continue;
    if (k === "class") n.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
    else if (k === "dataset" && typeof v === "object") Object.assign(n.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if (k === "html") n.innerHTML = v;
    else n.setAttribute(k, v);
  }
  for (const k of kids.flat()) {
    if (k == null || k === false) continue;
    n.appendChild(typeof k === "string" ? document.createTextNode(k) : k);
  }
  return n;
}

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

/* Escape for inserting user-provided strings into HTML */
export function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ---- Cursor ---- */
export function initCursor() {
  const cur = document.getElementById("cursor");
  const ring = document.getElementById("cursor-ring");
  if (!cur) return;
  let mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + "px"; cur.style.top = my + "px";
  });
  if (ring) {
    (function loop() {
      rx += (mx - rx) * 0.11; ry += (my - ry) * 0.11;
      ring.style.left = rx + "px"; ring.style.top = ry + "px";
      requestAnimationFrame(loop);
    })();
  }
}

/* ---- Scroll Reveal ---- */
export function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add("vis"), i * 80);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  $$("[data-r]").forEach((el) => io.observe(el));
}

/* ---- Active Nav ---- */
export function initActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  $$(".nav-links a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) a.classList.add("active");
    else a.classList.remove("active");
  });
}

/* ---- Hamburger Menu ---- */
export function initHamburger() {
  const h = $(".hamburger");
  const m = $(".mobile-menu");
  if (!h || !m) return;
  const close = () => {
    h.classList.remove("open");
    m.classList.remove("open");
    document.body.style.overflow = "";
  };
  h.addEventListener("click", () => {
    h.classList.toggle("open");
    m.classList.toggle("open");
    document.body.style.overflow = m.classList.contains("open") ? "hidden" : "";
  });
  $$("a", m).forEach((a) => a.addEventListener("click", close));
  const btn = document.getElementById("mob-close");
  if (btn) btn.addEventListener("click", close);
}

/* ---- Auth-aware nav state (login pill / account pill / cart count) ---- */
export function syncNavAuth() {
  const user = getUser();
  const loggedIn = user && user.status === "approved";
  const acct = document.getElementById("nav-account-btn");
  const login = document.getElementById("nav-login-btn");
  const name = document.getElementById("nav-logged-in-name");
  if (acct) acct.style.display = loggedIn ? "inline-flex" : "none";
  if (login) login.style.display = loggedIn ? "none" : "inline-flex";
  if (loggedIn && name) {
    name.textContent =
      user.name || ((user.fname || "") + " " + (user.lname || "")).trim() || "My Account";
  }
  updateNavCount();
}

export function updateNavCount() {
  const cart = getCart();
  const total = cart.reduce((s, i) => s + (parseInt(i.qty) || 0), 0);
  const el = document.getElementById("nav-cart-count");
  if (!el) return;
  el.textContent = total > 0 ? String(total) : "";
  el.style.display = total > 0 ? "inline" : "none";
}

/* ---- Sandbox banner — visible on every page ---- */
export function initSandboxBanner() {
  const cfg = window.APBS_CONFIG || {};
  if (!cfg.sandbox) return;
  if (document.getElementById("apbs-sandbox-banner")) return;
  const bar = el("div", {
    id: "apbs-sandbox-banner",
    html:
      '<strong>' + esc(cfg.bannerText || "SANDBOX BUILD") + '</strong>' +
      ' <span class="apbs-sb-sub">Worker: ' + esc(cfg.WORKER_URL) + '</span>'
  });
  document.body.prepend(bar);
}

/* ---- Contact-form fake submit used on the Contact page ---- */
export function wireContactSubmit() {
  const btn = $(".fsub");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const orig = btn.innerHTML;
    btn.innerHTML = '&#10003; Sent! We\'ll respond shortly.';
    btn.style.background = "var(--ink3)";
    btn.style.color = "var(--gold)";
    setTimeout(() => { btn.innerHTML = orig; btn.style.background = ""; btn.style.color = ""; }, 3500);
  });
}

/* ---- Boot: attach everything after partials are loaded ---- */
export function bootShell() {
  initCursor();
  initReveal();
  initActiveNav();
  initHamburger();
  syncNavAuth();
  initSandboxBanner();
}
