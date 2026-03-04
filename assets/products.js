const S = { products: [], filtered: [], q:"", category:"All", size:"All", inStock:false, showPrice:false };

function norm(v){ return (v ?? "").toString().toLowerCase().trim(); }
function money(v){
  if(v === null || v === undefined || v === "") return "";
  const n = Number(v);
  if(Number.isNaN(n)) return "";
  return "$" + n.toFixed(2);
}

// Client-side convenience only (NOT true security)
function loadAuth(){
  S.showPrice = localStorage.getItem("apbs_show_price") === "1";
  syncAuthUI();
}
function syncAuthUI(){
  const b = document.getElementById("dealerBtn");
  const s = document.getElementById("dealerStatus");
  if(!b || !s) return;
  if(S.showPrice){
    b.textContent = "Dealer Logout";
    s.textContent = "Dealer pricing: ON";
    s.classList.remove("muted");
  } else {
    b.textContent = "Dealer Login";
    s.textContent = "Dealer pricing: OFF";
    s.classList.add("muted");
  }
  renderTable();
}
function openModal(){
  document.getElementById("backdrop").style.display = "flex";
  document.getElementById("pass").value = "";
  document.getElementById("err").style.display = "none";
  setTimeout(()=>document.getElementById("pass").focus(), 50);
}
function closeModal(){ document.getElementById("backdrop").style.display = "none"; }
function doLogin(){
  const pass = document.getElementById("pass").value.trim();
  const ok = pass === "ALLPRO2026"; // <-- CHANGE YOUR PASSCODE HERE
  const err = document.getElementById("err");
  if(!ok){ err.style.display = "block"; return; }
  localStorage.setItem("apbs_show_price","1");
  S.showPrice = true;
  closeModal();
  syncAuthUI();
}
function doLogout(){
  localStorage.removeItem("apbs_show_price");
  S.showPrice = false;
  syncAuthUI();
}

function renderDropdown(id, values){
  const sel = document.getElementById(id);
  if(!sel) return;
  sel.innerHTML = "";
  values.forEach(v=>{
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}

function applyFilters(){
  const q = norm(S.q);
  S.filtered = S.products.filter(p=>{
    const matchCat = (S.category==="All") || (p.category===S.category);
    const matchSize = (S.size==="All") || (p.size===S.size);
    const qty = (p.qty_on_hand === null || p.qty_on_hand === undefined) ? null : Number(p.qty_on_hand);
    const stockOk = !S.inStock || (qty !== null && !Number.isNaN(qty) && qty > 0);
    const hay = [p.category,p.product,p.code,p.size,p.notes].map(norm).join(" ");
    const matchQ = !q || hay.includes(q);
    return matchCat && matchSize && stockOk && matchQ;
  });
  renderCounts();
  renderTable();
}

function renderCounts(){
  const el = document.getElementById("counts");
  if(el) el.textContent = `${S.filtered.length.toLocaleString()} item(s)`;
}

function renderTable(){
  const body = document.getElementById("tbody");
  if(!body) return;
  body.innerHTML = "";
  S.filtered.forEach(p=>{
    const qty = (p.qty_on_hand === null || p.qty_on_hand === undefined || p.qty_on_hand === "") ? "" : Number(p.qty_on_hand).toLocaleString();
    const pcs = (p.pcs_per_ctn === null || p.pcs_per_ctn === undefined || p.pcs_per_ctn === "") ? "" : Number(p.pcs_per_ctn).toLocaleString();
    const priceCell = S.showPrice ? `<span class="price">${money(p.price)}</span>` : `<span class="muted">Dealer login</span>`;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="pill">${p.category ?? ""}</span></td>
      <td><strong>${p.product ?? ""}</strong></td>
      <td class="code">${p.code ?? ""}</td>
      <td>${p.size ?? ""}</td>
      <td>${pcs}</td>
      <td>${qty}</td>
      <td>${priceCell}</td>
    `;
    body.appendChild(tr);
  });
  const headNote = document.getElementById("priceNote");
  if(headNote) headNote.textContent = S.showPrice ? "Showing dealer pricing." : "Pricing hidden — dealer login required.";
}

async function loadProducts(){
  const r = await fetch("assets/products.json", {cache:"no-store"});
  S.products = await r.json();
  const cats = new Set(["All"]);
  const sizes = new Set(["All"]);
  S.products.forEach(p=>{
    if(p.category) cats.add(p.category);
    if(p.size) sizes.add(p.size);
  });
  renderDropdown("category", [...cats].sort((a,b)=>a.localeCompare(b)));
  renderDropdown("size", [...sizes].sort((a,b)=>a.localeCompare(b)));
  applyFilters();
}

window.addEventListener("DOMContentLoaded", ()=>{
  if(document.body.dataset.page !== "products") return;

  loadAuth();

  document.getElementById("search").addEventListener("input", e=>{ S.q = e.target.value; applyFilters(); });
  document.getElementById("category").addEventListener("change", e=>{ S.category = e.target.value; applyFilters(); });
  document.getElementById("size").addEventListener("change", e=>{ S.size = e.target.value; applyFilters(); });
  document.getElementById("inStock").addEventListener("change", e=>{ S.inStock = e.target.checked; applyFilters(); });

  document.getElementById("dealerBtn").addEventListener("click", ()=>{
    if(S.showPrice) doLogout();
    else openModal();
  });

  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("backdrop").addEventListener("click", (e)=>{ if(e.target.id === "backdrop") closeModal(); });
  document.getElementById("loginBtn").addEventListener("click", doLogin);
  document.getElementById("pass").addEventListener("keydown", (e)=>{
    if(e.key === "Enter") doLogin();
    if(e.key === "Escape") closeModal();
  });

  loadProducts().catch(()=>{ document.getElementById("error").style.display = "block"; });
});
