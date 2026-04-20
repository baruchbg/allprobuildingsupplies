
function loadGlobalLayout() {
  const headerHTML = `<div class="topbar">
  <div class="topbar-links">
    <a href="tel:17328291940" style="cursor:none;"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-829-1940</a>
    <a href="mailto:info@allprobuildingsupplies.com" style="cursor:none;"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>info@allprobuildingsupplies.com</a>
  </div>\n<nav>
  <div class="nav-logo">
    <img src="assets/logo.png" alt="All Pro Building Supplies"/>
    <div class="nav-brand-text">All Pro Building Supplies <span>LLC</span></div>
  </div>
  <ul class="nav-links">
    <li><a href="index.html" class="active" style="cursor:none;">Home</a></li>
    <li><a href="products.html" class="" style="cursor:none;">Products</a></li>
    <li><a href="about.html" class="" style="cursor:none;">About</a></li>
    <li><a href="contact.html" class="" style="cursor:none;">Contact</a></li>
  </ul>
  <div class="nav-actions" id="nav-auth-container">
    <a href="tel:17328291940" class="nav-tel" style="cursor:none;"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-829-1940</a>
    <span id="auth-buttons" style="display:inline-flex; align-items:center; gap:8px;">
      <a href="login.html" class="nav-cta" id="nav-login-btn" style="background:transparent;border:1px solid var(--gold);color:var(--gold);cursor:none;">Login</a>
      <a href="account.html" class="nav-cta" id="nav-account-btn" style="display:none;background:var(--ink3);border:1px solid rgba(200,152,31,.3);flex-direction:column;align-items:flex-start;padding:6px 12px;line-height:1.3;gap:2px;cursor:none;"><span style="font-size:9px;color:var(--silver);letter-spacing:1px;font-family:'DM Mono',monospace;">LOGGED IN AS</span><span id="nav-logged-in-name" style="font-size:12px;color:var(--white);">My Account</span></a>
      <a href="cart.html" class="nav-cta" id="nav-cart-btn" style="background:var(--gold);color:var(--ink);border:none;cursor:none;">🛒 Cart <span id="nav-cart-count" class="cart-nav-badge"></span></a>
    </span>
  </div>
  <button class="hamburger" id="hamburger" aria-label="Menu" style="cursor:none;">
    <span></span><span></span><span></span>
  </button>
</nav>\n<div class="mobile-menu" id="mobile-menu"><button class="mobile-menu-close" id="mob-close" aria-label="Close" style="cursor:none;">&#10005;</button>
  <a href="index.html" style="cursor:none;">Home</a>
  <a href="products.html" style="cursor:none;">Products</a>
  <a href="about.html" style="cursor:none;">About</a>
  <a href="contact.html" style="cursor:none;">Contact</a>
  <a href="tel:17328291940" class="mob-tel" style="cursor:none;">📞 732-829-1940</a>
  <a href="cart.html" class="mob-cta" style="cursor:none;">🛒 Cart →</a>
  <a href="login.html" class="mob-cta" style="margin-top:10px;background:transparent;border:1px solid var(--gold);color:var(--gold);cursor:none;">Login / Register</a>
</div>`;
  const footerHTML = `<footer>
  <div class="ft-top">
    <div>
      <img src="assets/logo.png" alt="All Pro Building Supplies" class="ft-logo"/>
      <p class="ft-txt">Contractor-grade building materials, plumbing, hardware, and contractor supplies. Fast response, real people, reliable service.</p>
      <div class="ft-socials">
        <a href="mailto:info@allprobuildingsupplies.com" class="soc">✉</a>
        <a href="tel:17328291940" class="soc">📞</a>
      </div>
    </div>
    <div class="ft-col">
      <h4>Products</h4>
      <ul>
        <li><a href="products.html">Building Materials</a></li>
        <li><a href="products.html">Plumbing</a></li>
        <li><a href="products.html">Hardware</a></li>
        <li><a href="products.html">Contractor Supplies</a></li>
      </ul>
    </div>
    <div class="ft-col">
      <h4>Company</h4>
      <ul>
        <li><a href="about.html">About Us</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li><a href="login.html">Dealer Login</a></li>
        <li><a href="admin.html" style="color:var(--gold);">Admin Dashboard</a></li>
      </ul>
    </div>
  </div>
  <div class="ft-bot">
    <p>&copy; 2026 All Pro Building Supplies LLC. All rights reserved.</p>
  </div>
</footer>`;

  const headerContainer = document.getElementById('global-header');
  if(headerContainer) headerContainer.innerHTML = headerHTML;

  const footerContainer = document.getElementById('global-footer');
  if(footerContainer) footerContainer.innerHTML = footerHTML;

  initGlobalScripts();
}

function initGlobalScripts() {
  // CURSOR
  const cur=document.getElementById('cursor'),ring=document.getElementById('cursor-ring');
  if(cur&&ring){
    let mx=0,my=0,rx=0,ry=0;
    document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
    (function loop(){rx+=(mx-rx)*.11;ry+=(my-ry)*.11;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop)})();
  }

  // ACTIVE NAV
  const navLinks=document.querySelectorAll('.nav-links a');
  navLinks.forEach(a=>{
    if(a.getAttribute('href')===window.location.pathname.split('/').pop()||
      (window.location.pathname.endsWith('/')&&a.getAttribute('href')==='index.html')){
      a.classList.add('active');
    }
  });

  // HAMBURGER MENU
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  if(hamburger && mobileMenu){
    hamburger.addEventListener('click', ()=>{
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click',()=>{
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
    var mobClose = document.getElementById('mob-close');
    if(mobClose){
      mobClose.addEventListener('click', ()=>{
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
  }

  // AUTHENTICATION SYNC FOR HEADER
  try {
    var sess = sessionStorage.getItem('apbs_user');
    var user = null; if(sess) user = JSON.parse(sess);
    var isLoggedIn = user && user.status === 'approved';
    
    var acctBtn  = document.getElementById('nav-account-btn');
    var loginBtn = document.getElementById('nav-login-btn');
    var nameEl   = document.getElementById('nav-logged-in-name');

    if(isLoggedIn){
      if(acctBtn) acctBtn.style.display = 'inline-flex';
      if(loginBtn) loginBtn.style.display = 'none';
      if(nameEl) nameEl.textContent = user.name || ((user.fname||'') + ' ' + (user.lname||'')).trim();
    } else {
      if(acctBtn) acctBtn.style.display = 'none';
      if(loginBtn) loginBtn.style.display = 'inline-flex';
    }
  } catch(e) {}

  // CART COUNT UPDATE
  try {
    var cart = JSON.parse(localStorage.getItem('apbs_cart')||'[]');
    var total = cart.reduce(function(s,i){ return s+i.qty; }, 0);
    var el = document.getElementById('nav-cart-count');
    if(el) el.textContent = total > 0 ? total : '';
  } catch(e) {}
}

document.addEventListener('DOMContentLoaded', loadGlobalLayout);
