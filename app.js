:root{--bg:#0b0c0f;--panel:#14161b;--text:#f1f5f9;--muted:#a8b0bd;--gold:#d4af37;--border:rgba(255,255,255,.10);--shadow:0 18px 60px rgba(0,0,0,.50);--r:18px;--max:1180px}
*{box-sizing:border-box}html,body{margin:0;padding:0}
body{font-family:"Segoe UI",system-ui,-apple-system,Arial,sans-serif;background:radial-gradient(1200px 700px at 30% -10%,rgba(212,175,55,.18),transparent 60%),radial-gradient(900px 600px at 100% 0%,rgba(255,255,255,.08),transparent 55%),linear-gradient(180deg,#0b0c0f 0%,#0a0b0e 100%);color:var(--text);line-height:1.55}
a{color:inherit}.container{max-width:var(--max);margin:0 auto;padding:0 22px}
.topbar{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border-bottom:1px solid var(--border);font-size:13px}
.topbar .row{display:flex;gap:18px;align-items:center;justify-content:space-between;padding:10px 0;flex-wrap:wrap}
.topbar .left{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.topbar a{text-decoration:none;opacity:.92}.topbar a:hover{opacity:1;text-decoration:underline}
.header{position:sticky;top:0;z-index:50;background:rgba(11,12,15,.72);backdrop-filter:blur(14px);border-bottom:1px solid var(--border)}
.nav{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 0}
.brand{display:flex;align-items:center;gap:14px;text-decoration:none}
.brand img{height:40px;width:auto;display:block}
.wordmark{display:flex;align-items:baseline;gap:2px;font-weight:900;letter-spacing:.3px}
.wordmark .a{height:22px;width:auto;margin-right:2px;transform:translateY(2px)}
.wordmark .rest{font-size:18px}
.wordmark.sub{font-size:12px;color:var(--muted);font-weight:700;margin-top:2px}
.menu{display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
.menu a{text-decoration:none;font-weight:800;color:var(--text);padding:10px 12px;border-radius:12px;opacity:.95}
.menu a:hover,.menu a.active{background:rgba(255,255,255,.06);opacity:1}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:11px 14px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);text-decoration:none;font-weight:900;cursor:pointer}
.btn:hover{background:rgba(255,255,255,.07)}
.btn.gold,.btn.primary{background:linear-gradient(180deg,rgba(212,175,55,.35),rgba(212,175,55,.18));border-color:rgba(212,175,55,.55)}
.btn.gold{background:linear-gradient(180deg,rgba(212,175,55,.22),rgba(212,175,55,.12));border-color:rgba(212,175,55,.40)}
.pageHero{padding:32px 0 20px}.heroTitle{display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap}
h1{margin:0;font-size:40px;letter-spacing:-.4px}.lead{color:var(--muted);max-width:80ch;margin-top:8px}
.panel{background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid var(--border);border-radius:var(--r);box-shadow:var(--shadow)}
.section{padding:18px 0 34px}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:14px}
.input,.select{padding:12px 12px;border-radius:12px;border:1px solid var(--border);background:rgba(0,0,0,.20);color:var(--text);font-weight:700;outline:none}
.input::placeholder{color:rgba(241,245,249,.45)}.input{width:min(420px,100%)}
.select{min-width:170px}
.chip{display:inline-flex;gap:10px;align-items:center;padding:10px 12px;border-radius:999px;border:1px solid var(--border);background:rgba(255,255,255,.04);font-weight:900;cursor:pointer;user-select:none}
.chip input{accent-color:var(--gold)}
.counts{margin-left:auto;color:var(--muted);font-weight:800}
.tableWrap{border-top:1px solid var(--border);overflow:hidden}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 14px;border-bottom:1px solid var(--border);text-align:left;font-size:14px;vertical-align:top}
th{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:rgba(241,245,249,.75);background:rgba(0,0,0,.18)}
tr:hover td{background:rgba(255,255,255,.03)}
.pill{display:inline-block;padding:6px 10px;border-radius:999px;background:rgba(212,175,55,.16);border:1px solid rgba(212,175,55,.35);font-weight:900;font-size:12px}
.code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;color:rgba(241,245,249,.85)}
.price{font-weight:900}.muted{color:var(--muted)}.small{font-size:12px;color:rgba(241,245,249,.70)}
.notice{display:flex;gap:14px;align-items:flex-start;padding:14px;border-radius:16px;border:1px solid rgba(212,175,55,.35);background:rgba(212,175,55,.10);margin-top:14px}
.notice strong{display:block}
.rowActions{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.iconBtn{border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text);border-radius:12px;padding:8px 10px;cursor:pointer;font-weight:900}
.iconBtn:hover{background:rgba(255,255,255,.07)}
.drawerBackdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;z-index:120}
.drawer{position:fixed;right:0;top:0;height:100%;width:min(460px,92vw);background:linear-gradient(180deg,rgba(20,22,27,.98),rgba(10,11,14,.98));border-left:1px solid var(--border);box-shadow:-20px 0 80px rgba(0,0,0,.55);transform:translateX(100%);transition:transform .22s ease;z-index:130;display:flex;flex-direction:column}
.drawer.open{transform:translateX(0)}
.drawer .head{padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.drawer .head .t{font-weight:900;font-size:16px}
.drawer .body{padding:14px 16px;overflow:auto;flex:1}
.drawer .foot{padding:14px 16px;border-top:1px solid var(--border)}
.itemCard{border:1px solid var(--border);border-radius:16px;padding:12px;background:rgba(255,255,255,.03);margin-bottom:10px}
.itemCard .line1{display:flex;justify-content:space-between;gap:10px}
.qtyRow{display:flex;gap:10px;align-items:center;margin-top:10px}
.qty{width:90px}
.hr{height:1px;background:var(--border);margin:12px 0}
.kpi{display:flex;justify-content:space-between;color:var(--muted);font-weight:800;margin-bottom:10px}
.footer{border-top:1px solid var(--border);padding:22px 0;margin-top:10px}
.footer .grid{display:grid;grid-template-columns:1.2fr .8fr;gap:18px}
@media (max-width:980px){h1{font-size:34px}.footer .grid{grid-template-columns:1fr}}