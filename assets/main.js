// CURSOR
const cur=document.getElementById('cursor'),ring=document.getElementById('cursor-ring');
if(cur&&ring){
  let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cur.style.left=mx+'px';cur.style.top=my+'px'});
  (function loop(){rx+=(mx-rx)*.11;ry+=(my-ry)*.11;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(loop)})();
}

// SCROLL REVEAL
const io=new IntersectionObserver(entries=>{
  entries.forEach((e,i)=>{if(e.isIntersecting){setTimeout(()=>e.target.classList.add('vis'),i*80);io.unobserve(e.target)}});
},{threshold:.1,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('[data-r]').forEach(el=>io.observe(el));

// ACTIVE NAV
const navLinks=document.querySelectorAll('.nav-links a');
navLinks.forEach(a=>{
  if(a.getAttribute('href')===window.location.pathname.split('/').pop()||
    (window.location.pathname.endsWith('/')&&a.getAttribute('href')==='index.html')){
    a.classList.add('active');
  }
});

// FORM SUBMIT
function submitForm(btn){
  const orig=btn.innerHTML;
  btn.innerHTML='✓ Sent! We\'ll respond shortly.';
  btn.style.background='var(--ink3)';btn.style.color='var(--gold)';
  setTimeout(()=>{btn.innerHTML=orig;btn.style.background='';btn.style.color=''},3500);
}

// HAMBURGER MENU
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');
if(hamburger && mobileMenu){
  hamburger.addEventListener('click', ()=>{
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });
  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(a=>{
    a.addEventListener('click',()=>{
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}
