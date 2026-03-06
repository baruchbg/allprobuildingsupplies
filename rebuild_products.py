#!/usr/bin/env python3
"""
All Pro Building Supplies — Product Page Generator
===================================================
HOW TO USE:
  1. Edit products.csv to add, remove, or change products and pricing
  2. Run this script:  python3 rebuild_products.py
  3. Upload the new products.html to GitHub — done!

CSV COLUMNS:
  code          - Product code (e.g. PVC-1/4HH)
  description   - Full product description
  size          - Size (e.g. 2", 1-1/2")
  pcs_per_ctn   - Pieces per carton/bundle
  qty_on_hand   - Quantity in stock (leave blank if unknown)
  unit_price    - Price per piece in dollars (e.g. 3.75)
"""

import csv, os, re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE   = os.path.join(SCRIPT_DIR, 'products.csv')
OUT_FILE   = os.path.join(SCRIPT_DIR, 'products.html')

# ── Read CSV ──────────────────────────────────────────────────────
products = []
categories = {}
with open(CSV_FILE, newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        row['unit_price'] = float(row['unit_price'])
        row['pcs_per_ctn'] = row['pcs_per_ctn'].strip()
        row['qty_on_hand'] = row['qty_on_hand'].strip()
        products.append(row)
        code = row['code']
        if code not in categories:
            categories[code] = row['description']

print(f"Loaded {len(products)} products across {len(categories)} categories")

# ── Build table rows ──────────────────────────────────────────────
def stock_cell(qty):
    if not qty:
        return '<span style="color:var(--silver)">Call for Availability</span>'
    qty_int = int(qty) if qty.isdigit() else 0
    color = '#4CAF50' if qty_int > 0 else 'var(--silver)'
    return f'<span style="color:{color}">● In Stock</span> <span class="qty-badge">{int(qty):,}</span>'

rows_html = ''
last_code = None
for p in products:
    if p['code'] != last_code:
        rows_html += f'<tr class="section-divider"><td colspan="5">{p["description"]}</td></tr>\n'
        last_code = p['code']
    rows_html += f'''    <tr>
      <td class="code">{p["code"]}</td>
      <td>{p["size"]}</td>
      <td><span class="qty-badge">{p["pcs_per_ctn"]}/CTN</span></td>
      <td>{stock_cell(p["qty_on_hand"])}</td>
      <td class="price price-cell" data-price="{p['unit_price']:.2f}"></td>
    </tr>\n'''

# ── Filter buttons ────────────────────────────────────────────────
filter_keywords = set()
for code in categories:
    # Extract meaningful keyword from code
    parts = code.replace('PVC-','').replace('PIPE-','')
    filter_keywords.add(parts.split('/')[0] if '/' in parts else parts)

filter_btns = '<button class="filter-btn on" onclick="setFilter(\'all\',this)">All Products</button>\n'
seen_descs = {}
for code, desc in categories.items():
    short = desc.split('(')[0].strip().title()
    if short not in seen_descs:
        seen_descs[short] = code
        safe = code.replace('"','&quot;')
        filter_btns += f'      <button class="filter-btn" onclick="setFilter(\'{safe}\',this)">{short}</button>\n'

# ── Full HTML ─────────────────────────────────────────────────────
TOPBAR = '''<div class="topbar">
  <div class="topbar-links">
    <a href="tel:17328875854"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-887-5854</a>
    <a href="mailto:baruch@allprobuildingsupplies.com"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>baruch@allprobuildingsupplies.com</a>
  </div>
  <div class="topbar-badge">Contractor-Grade · Fast Response · NJ &amp; Surrounding Areas</div>
</div>'''

NAV = '''<nav>
  <div class="nav-logo">
    <img src="assets/logo.png" alt="All Pro Building Supplies"/>
    <div class="nav-brand-text">All Pro Building Supplies <span>LLC</span></div>
  </div>
  <ul class="nav-links">
    <li><a href="index.html">Home</a></li>
    <li><a href="products.html" class="active">Products</a></li>
    <li><a href="about.html">About</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <div class="nav-actions">
    <a href="tel:17328875854" class="nav-tel"><svg viewBox="0 0 24 24" width="16" height="16" fill="var(--gold)"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.27-.27.67-.36 1.02-.22 1.12.45 2.32.68 3.58.68.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.29 21 3 13.71 3 4.5c0-.55.45-1 1-1H8c.55 0 1 .45 1 1 0 1.27.2 2.48.57 3.62.1.32.03.68-.22.96L6.6 10.8z"/></svg>732-887-5854</a>
    <a href="login.html" class="nav-cta">Login / Register →</a>
  </div>
</nav>'''

FOOTER = '''<footer>
  <div class="ft-top">
    <div>
      <img src="assets/logo.png" alt="All Pro Building Supplies" class="ft-logo"/>
      <p class="ft-txt">Contractor-grade building materials, plumbing, hardware, and contractor supplies.</p>
      <div class="ft-socials">
        <a href="mailto:baruch@allprobuildingsupplies.com" class="soc">✉</a>
        <a href="tel:17328875854" class="soc">📞</a>
      </div>
    </div>
    <div class="ft-col"><h4>Products</h4><ul>
      <li><a href="products.html">Building Materials</a></li>
      <li><a href="products.html">Plumbing</a></li>
      <li><a href="products.html">Hardware</a></li>
      <li><a href="products.html">Contractor Supplies</a></li>
    </ul></div>
    <div class="ft-col"><h4>Company</h4><ul>
      <li><a href="about.html">About Us</a></li>
      <li><a href="products.html">Products</a></li>
      <li><a href="contact.html">Contact</a></li>
    </ul></div>
    <div class="ft-col"><h4>Contact</h4><ul>
      <li><a href="tel:17328875854">732-887-5854</a></li>
      <li><a href="mailto:baruch@allprobuildingsupplies.com">baruch@allprobuildingsupplies.com</a></li>
      <li><a href="contact.html">Get a Quote</a></li>
    </ul></div>
  </div>
  <div class="ft-bot">
    <span>© 2025 All Pro Building Supplies LLC · allprobuildingsupplies.com</span>
    <span>Building Materials · Plumbing · Hardware · Contractor Supplies</span>
  </div>
</footer>'''

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Products — All Pro Building Supplies LLC</title>
<meta name="description" content="Browse All Pro Building Supplies product catalog — PVC pipe, DWV fittings, bends, tees, wyes, and more. Call 732-887-5854 for pricing."/>
<link rel="stylesheet" href="assets/style.css"/>
<style>
.filter-bar{{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:40px}}
.filter-btn{{font-family:"Oswald",sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;padding:9px 20px;border:1px solid rgba(139,160,178,.2);color:var(--silver);background:transparent;cursor:none;transition:all .2s}}
.filter-btn:hover,.filter-btn.on{{border-color:var(--gold);color:var(--gold);background:rgba(200,152,31,.07)}}
.prod-table-wrap{{overflow-x:auto;border:1px solid rgba(139,160,178,.1)}}
table{{width:100%;border-collapse:collapse;font-size:14px}}
thead tr{{background:var(--gold)}}
thead th{{font-family:"Oswald",sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--ink);padding:14px 18px;text-align:left;white-space:nowrap}}
tbody tr{{border-bottom:1px solid rgba(139,160,178,.08);transition:background .2s}}
tbody tr:hover{{background:rgba(200,152,31,.04)}}
tbody td{{padding:12px 18px;color:var(--smoke);vertical-align:middle}}
tbody td.code{{font-family:"DM Mono",monospace;font-size:12px;color:var(--gold);letter-spacing:.5px}}
tbody td.price{{font-weight:500;color:var(--white)}}
.section-divider{{background:var(--ink3);font-family:"Oswald",sans-serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:var(--silver)}}
.section-divider td{{padding:10px 18px;border-left:3px solid var(--gold)}}
.qty-badge{{display:inline-block;background:rgba(200,152,31,.1);border:1px solid rgba(200,152,31,.2);color:var(--gold);font-family:"DM Mono",monospace;font-size:11px;padding:2px 8px}}
.note-box{{background:var(--ink3);border:1px solid rgba(200,152,31,.2);border-left:3px solid var(--gold);padding:20px 24px;margin-bottom:32px;font-size:14px;color:var(--silver);line-height:1.7}}
.note-box strong{{color:var(--smoke)}}
.search-wrap{{position:relative;margin-bottom:16px}}
.search-input{{width:100%;background:var(--ink2);border:1px solid rgba(139,160,178,.2);color:var(--smoke);font-family:"DM Sans",sans-serif;font-size:15px;padding:14px 18px 14px 48px;outline:none;transition:border-color .2s}}
.search-input:focus{{border-color:var(--gold)}}
.search-icon{{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--silver);font-size:16px}}
.results-count{{font-family:"DM Mono",monospace;font-size:12px;color:var(--silver);letter-spacing:1px;margin-bottom:20px}}
</style>
</head>
<body>
{TOPBAR}
{NAV}
<div class="page-hero">
  <div class="page-hero-inner">
    <div class="page-breadcrumb"><a href="index.html">Home</a> › Products</div>
    <div class="page-title" data-r>Product <span>Catalog</span></div>
    <p class="page-subtitle" data-r>Contractor-grade PVC, DWV fittings, pipes, and more. Pricing shown per piece. Call or email for bulk quotes.</p>
  </div>
</div>
<div class="ticker" aria-hidden="true"><div class="ticker-track">
  <div class="t-item g">Building Materials <span class="t-dia">◆</span></div><div class="t-item">Plumbing Supplies <span class="t-dia">◆</span></div>
  <div class="t-item g">Hardware <span class="t-dia">◆</span></div><div class="t-item">Contractor Supplies <span class="t-dia">◆</span></div>
  <div class="t-item g">PVC Pipe &amp; Fittings <span class="t-dia">◆</span></div><div class="t-item">Fast Response <span class="t-dia">◆</span></div>
  <div class="t-item g">Building Materials <span class="t-dia">◆</span></div><div class="t-item">Plumbing Supplies <span class="t-dia">◆</span></div>
  <div class="t-item g">Hardware <span class="t-dia">◆</span></div><div class="t-item">Contractor Supplies <span class="t-dia">◆</span></div>
  <div class="t-item g">PVC Pipe &amp; Fittings <span class="t-dia">◆</span></div><div class="t-item">Fast Response <span class="t-dia">◆</span></div>
</div></div>
<section class="sec" style="background:var(--ink)">
  <div class="sec-inner">
    <!-- PRICE GATE -->
    <div class="price-gate" id="price-gate" style="display:none;background:var(--ink2);border:1px solid rgba(200,152,31,.2);padding:20px 28px;margin-bottom:28px;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap">
      <div style="font-size:15px;color:var(--smoke)"><strong style="color:var(--gold)">🔒 Login to See Pricing</strong><br/>Create a free trade account to unlock full pricing.</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="login.html" class="btn-gold" style="padding:11px 24px;font-size:13px">Log In →</a>
        <a href="register.html" class="btn-ghost" style="padding:11px 24px;font-size:13px">Request Access</a>
      </div>
    </div>
    <!-- USER BAR -->
    <div class="user-bar" id="user-bar" style="display:none;background:rgba(200,152,31,.08);border:1px solid rgba(200,152,31,.2);padding:12px 20px;margin-bottom:20px;align-items:center;justify-content:space-between;font-size:14px;color:var(--smoke);flex-wrap:wrap;gap:8px">
      <span>Logged in as <strong id="user-name-display" style="color:var(--gold)"></strong> — <span id="user-company-display" style="color:var(--silver)"></span></span>
      <button onclick="doLogout()" style="font-family:'DM Mono',monospace;font-size:11px;color:var(--silver);background:transparent;border:1px solid rgba(139,160,178,.2);padding:5px 12px;cursor:pointer">Log Out</button>
    </div>
    <div class="note-box">
      <strong>How to Order:</strong> Call <a href="tel:17328875854" style="color:var(--gold)">732-887-5854</a> or email
      <a href="mailto:baruch@allprobuildingsupplies.com?subject=Pricing%20Request&body=Code%2C%20Size%2C%20Qty%2C%20Delivery%20ZIP" style="color:var(--gold)">baruch@allprobuildingsupplies.com</a>
      with your <strong>Item Code · Size · Quantity · Delivery ZIP</strong>.
      Volume pricing available. Don't see what you need? We can source it — just ask.
    </div>
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input class="search-input" type="text" id="prodSearch" placeholder="Search by code, description, or size..." oninput="filterTable()"/>
    </div>
    <div class="filter-bar">
      {filter_btns}
    </div>
    <div class="results-count" id="resultsCount">Showing all {len(products)} products</div>
    <div class="prod-table-wrap">
      <table id="prodTable">
        <thead><tr>
          <th>Code</th><th>Size</th><th>Pack</th><th>Availability</th><th id="price-col-header">Unit Price</th>
        </tr></thead>
        <tbody id="prodBody">
{rows_html}
        </tbody>
      </table>
    </div>
    <div style="margin-top:32px;display:flex;gap:16px;flex-wrap:wrap">
      <a href="mailto:baruch@allprobuildingsupplies.com?subject=Bulk%20Quote%20Request&body=Code%2C%20Size%2C%20Qty%2C%20Delivery%20ZIP" class="btn-gold">Request Bulk Quote →</a>
      <a href="contact.html" class="btn-ghost">Contact Us</a>
    </div>
  </div>
</section>
<section class="cta-band">
  <div class="cta-band-inner">
    <div><div class="cta-h">Ready to Get Your Supplies?</div><div class="cta-s">Call or email with your list — we respond fast with pricing and availability.</div></div>
    <div class="cta-acts">
      <a href="tel:17328875854" class="btn-dark">📞 Call 732-887-5854</a>
      <a href="mailto:baruch@allprobuildingsupplies.com?subject=Need%20pricing%20or%20availability&body=Code%2C%20Size%2C%20Qty%2C%20Delivery%20ZIP" class="btn-dark">✉ Email for Pricing</a>
    </div>
  </div>
</section>
{FOOTER}
<div id="cursor"></div><div id="cursor-ring"></div>
<script src="assets/main.js"></script>
<script>
let activeFilter='all';
function setFilter(f,btn){{
  activeFilter=f;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  filterTable();
}}
function filterTable(){{
  const q=document.getElementById('prodSearch').value.toLowerCase();
  const rows=document.querySelectorAll('#prodBody tr');
  let vis=0,lastDiv=null;
  rows.forEach(r=>{{
    if(r.classList.contains('section-divider')){{lastDiv=r;r.style.display='none';return}}
    const txt=r.textContent.toLowerCase();
    const matchQ=!q||txt.includes(q);
    const matchF=activeFilter==='all'||txt.includes(activeFilter.toLowerCase());
    if(matchQ&&matchF){{r.style.display='';if(lastDiv){{lastDiv.style.display='';lastDiv=null}}vis++;}}
    else{{r.style.display='none'}}
  }});
  document.getElementById('resultsCount').textContent=
    vis===0?'No products found':`Showing ${{vis}} product${{vis!==1?'s':''}}`;
}}
</script>
</body>
</html>'''

with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write(html)

print(f"✅ products.html rebuilt successfully! ({len(products)} products)")
print(f"   → Upload products.html to GitHub to go live")
