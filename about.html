const State={products:[],filtered:[],q:"",category:"All",size:"All",inStock:false,sort:"relevance",dealer:false,quote:{}};
const norm=v=>(v??"").toString().toLowerCase().trim();
const money=v=>{if(v==null||v==="")return"";const n=Number(v);if(Number.isNaN(n))return"";return"$"+n.toFixed(2)};
const qtyText=v=>{if(v==null||v==="")return"";const n=Number(v);if(Number.isNaN(n))return"";return n.toLocaleString()};

function loadDealer(){State.dealer=localStorage.getItem("apbs_dealer")==="1";syncDealerUI()}
function saveDealer(on){on?localStorage.setItem("apbs_dealer","1"):localStorage.removeItem("apbs_dealer");State.dealer=on;syncDealerUI();renderTable();renderQuote()}
function syncDealerUI(){
  const b=document.getElementById("dealerBtn"),s=document.getElementById("dealerStatus"),note=document.getElementById("priceNote");
  if(b)b.textContent=State.dealer?"Dealer Logout":"Dealer Login";
  if(s){s.textContent=State.dealer?"Dealer pricing: ON":"Dealer pricing: OFF";s.classList.toggle("muted",!State.dealer)}
  if(note)note.textContent=State.dealer?"Dealer pricing enabled — add items to quote.":"Pricing hidden — dealer login required."
}
function openLogin(){document.getElementById("backdrop").style.display="flex";document.getElementById("pass").value="";document.getElementById("err").style.display="none";setTimeout(()=>document.getElementById("pass").focus(),50)}
function closeLogin(){document.getElementById("backdrop").style.display="none"}
function doLogin(){
  const pass=document.getElementById("pass").value.trim();
  const ok=pass==="ALLPRO2026"; // CHANGE PASSCODE HERE
  if(!ok){document.getElementById("err").style.display="block";return}
  closeLogin();saveDealer(true)
}
function doLogout(){saveDealer(false)}

function openDrawer(){document.getElementById("drawerBackdrop").style.display="block";document.getElementById("drawer").classList.add("open")}
function closeDrawer(){document.getElementById("drawerBackdrop").style.display="none";document.getElementById("drawer").classList.remove("open")}

function addToQuote(code){
  const p=State.products.find(x=>x.code===code); if(!p)return;
  if(!State.quote[code])State.quote[code]={p,qty:1}; else State.quote[code].qty+=1;
  renderQuote(); openDrawer();
}
function removeFromQuote(code){delete State.quote[code];renderQuote()}
function setQuoteQty(code,qty){qty=Number(qty);if(Number.isNaN(qty)||qty<=0){removeFromQuote(code);return}State.quote[code].qty=qty;renderQuote()}
function quoteCount(){return Object.values(State.quote).reduce((a,x)=>a+(x.qty||0),0)}
function quoteLines(){return Object.values(State.quote)}
function quoteSubtotal(){if(!State.dealer)return 0;return quoteLines().reduce((a,x)=>a+(Number(x.p.price||0)*Number(x.qty||0)),0)}

function renderQuote(){
  const badge=document.getElementById("quoteBadge"); const count=quoteCount(); if(badge)badge.textContent=String(count);
  const list=document.getElementById("quoteList"), empty=document.getElementById("quoteEmpty"); if(!list||!empty)return;
  list.innerHTML=""; const lines=quoteLines(); empty.style.display=lines.length?"none":"block";
  lines.forEach(({p,qty})=>{
    const div=document.createElement("div"); div.className="itemCard";
    const lineTotal=State.dealer?(Number(p.price||0)*Number(qty||0)):0;
    div.innerHTML=`
      <div class="line1">
        <div>
          <strong>${p.code} — ${p.product}</strong>
          <div class="small">${p.size} • ${p.category}</div>
        </div>
        <button class="iconBtn" title="Remove" aria-label="Remove" data-remove="${p.code}">✕</button>
      </div>
      <div class="qtyRow">
        <div class="small muted">Qty</div>
        <input class="input qty" type="number" min="1" value="${qty}" data-qty="${p.code}">
        <div class="small muted" style="margin-left:auto;">${State.dealer?("Line: "+money(lineTotal)):""}</div>
      </div>`;
    list.appendChild(div);
  });
  const sub=document.getElementById("subtotal"); if(sub)sub.textContent=State.dealer?money(quoteSubtotal()):"—";
  list.querySelectorAll("[data-remove]").forEach(btn=>btn.addEventListener("click",()=>removeFromQuote(btn.getAttribute("data-remove"))));
  list.querySelectorAll("[data-qty]").forEach(inp=>inp.addEventListener("input",e=>setQuoteQty(inp.getAttribute("data-qty"),e.target.value)));
}

function buildMailto(){
  const email="baruch@allprobuildingsupplies.com";
  const subject=encodeURIComponent("Quote request — All Pro Building Supplies");
  const lines=quoteLines().map(({p,qty})=>{
    const price=State.dealer?money(p.price):"(pricing hidden)";
    return `- ${p.code} | ${p.product} | ${p.size} | Qty: ${qty} | Price: ${price}`;
  });
  const body=["Hi Baruch,","","Please quote the following items:",...lines,"","Delivery ZIP:","Notes:","","Thanks,"].join("\n");
  return `mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`;
}
function renderDropdown(id,values){const sel=document.getElementById(id);sel.innerHTML="";values.forEach(v=>{const opt=document.createElement("option");opt.value=v;opt.textContent=v;sel.appendChild(opt)})}
function applyFilters(){
  const q=norm(State.q);
  let out=State.products.filter(p=>{
    const matchCat=(State.category==="All")||(p.category===State.category);
    const matchSize=(State.size==="All")||(p.size===State.size);
    const qty=(p.qty_on_hand==null)?null:Number(p.qty_on_hand);
    const stockOk=!State.inStock||(qty!==null&&!Number.isNaN(qty)&&qty>0);
    const hay=[p.category,p.product,p.code,p.size,p.notes].map(norm).join(" ");
    const matchQ=!q||hay.includes(q);
    return matchCat&&matchSize&&stockOk&&matchQ;
  });
  if(State.sort==="code")out.sort((a,b)=>(a.code||"").localeCompare(b.code||""));
  else if(State.sort==="price_asc")out.sort((a,b)=>(Number(a.price||0)-Number(b.price||0)));
  else if(State.sort==="price_desc")out.sort((a,b)=>(Number(b.price||0)-Number(a.price||0)));
  else if(State.sort==="stock_desc")out.sort((a,b)=>(Number(b.qty_on_hand||0)-Number(a.qty_on_hand||0)));
  State.filtered=out; renderCounts(); renderTable();
}
function renderCounts(){const el=document.getElementById("counts");if(el)el.textContent=`${State.filtered.length.toLocaleString()} items`}
function renderTable(){
  const body=document.getElementById("tbody");body.innerHTML="";
  State.filtered.forEach(p=>{
    const priceCell=State.dealer?`<span class="price">${money(p.price)}</span>`:`<span class="muted">Dealer login</span>`;
    const action=State.dealer?`<button class="btn gold" data-add="${p.code}">Add to Quote</button>`:`<button class="btn" data-login="1">Dealer Login</button>`;
    const tr=document.createElement("tr");
    tr.innerHTML=`
      <td><span class="pill">${p.category??""}</span></td>
      <td><strong>${p.product??""}</strong><div class="small muted">${p.notes??""}</div></td>
      <td class="code">${p.code??""}</td>
      <td>${p.size??""}</td>
      <td>${qtyText(p.pcs_per_ctn)}</td>
      <td>${qtyText(p.qty_on_hand)}</td>
      <td>${priceCell}</td>
      <td><div class="rowActions">${action}</div></td>`;
    body.appendChild(tr);
  });
  body.querySelectorAll("[data-add]").forEach(btn=>btn.addEventListener("click",()=>addToQuote(btn.getAttribute("data-add"))));
  body.querySelectorAll("[data-login]").forEach(btn=>btn.addEventListener("click",openLogin));
}
async function loadProducts(){
  const r=await fetch("assets/products.json",{cache:"no-store"}); State.products=await r.json();
  const cats=new Set(["All"]), sizes=new Set(["All"]);
  State.products.forEach(p=>{if(p.category)cats.add(p.category);if(p.size)sizes.add(p.size)});
  renderDropdown("category",[...cats].sort((a,b)=>a.localeCompare(b)));
  renderDropdown("size",[...sizes].sort((a,b)=>a.localeCompare(b)));
  applyFilters();
}
window.addEventListener("DOMContentLoaded",()=>{
  if(document.body.dataset.page!=="products")return;
  loadDealer();
  document.getElementById("search").addEventListener("input",e=>{State.q=e.target.value;applyFilters()});
  document.getElementById("category").addEventListener("change",e=>{State.category=e.target.value;applyFilters()});
  document.getElementById("size").addEventListener("change",e=>{State.size=e.target.value;applyFilters()});
  document.getElementById("inStock").addEventListener("change",e=>{State.inStock=e.target.checked;applyFilters()});
  document.getElementById("sort").addEventListener("change",e=>{State.sort=e.target.value;applyFilters()});
  document.getElementById("dealerBtn").addEventListener("click",()=>{State.dealer?doLogout():openLogin()});
  document.getElementById("quoteBtn").addEventListener("click",()=>{renderQuote();openDrawer()});
  document.getElementById("drawerBackdrop").addEventListener("click",closeDrawer);
  document.getElementById("drawerClose").addEventListener("click",closeDrawer);
  document.getElementById("sendQuote").addEventListener("click",()=>{if(!quoteLines().length){alert("Add at least one item to your quote.");return}window.location.href=buildMailto()});
  document.getElementById("closeModal").addEventListener("click",closeLogin);
  document.getElementById("backdrop").addEventListener("click",e=>{if(e.target.id==="backdrop")closeLogin()});
  document.getElementById("loginBtn").addEventListener("click",doLogin);
  document.getElementById("pass").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();if(e.key==="Escape")closeLogin()});
  loadProducts().catch(()=>{document.getElementById("error").style.display="block"});
});