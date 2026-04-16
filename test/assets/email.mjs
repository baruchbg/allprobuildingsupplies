/* email.mjs — EmailJS wrapper + shared order email templates.
 *
 * Production had three near-identical templates (confirmation, status
 * update, delivered, invoice) that each inlined ~400 lines of HTML per
 * page. They all share the exact same header, meta block, items table,
 * total line, contact strip, and footer — so we factor those out and
 * compose templates from small pieces.
 */
const CFG = () => (window.APBS_CONFIG || {});

function isPlaceholderKey(k) {
  return !k || /SANDBOX/i.test(k);
}

export function initEmail() {
  const cfg = CFG().EMAILJS || {};
  if (typeof emailjs === "undefined") return;
  if (isPlaceholderKey(cfg.publicKey)) return;
  try { emailjs.init(cfg.publicKey); } catch {}
}

/* Send one email via EmailJS. In sandbox mode this is a no-op
 * that logs what it would have sent.
 */
export async function sendEmail(params) {
  const cfg = CFG().EMAILJS || {};
  if (isPlaceholderKey(cfg.publicKey) || typeof emailjs === "undefined") {
    console.info("[sandbox] email suppressed:", {
      to: params.to_email || params.cust_email,
      subject: params.email_subject
    });
    return { sandbox: true };
  }
  return emailjs.send(cfg.service, cfg.template, params);
}

/* ---------- Shared HTML partials for templates ---------- */
const header = (badge, badgeBg) => `<tr><td style="background:#0C1117;padding:28px 36px;border-bottom:4px solid #C8981F;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><div style="font-family:'Arial Black',Arial,sans-serif;font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:2px;text-transform:uppercase;">ALL PRO BUILDING SUPPLIES</div>
<div style="font-size:11px;color:#C8981F;letter-spacing:3px;text-transform:uppercase;margin-top:3px;">LLC</div></td>
<td align="right"><div style="background:${badgeBg};color:#0C1117;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:2px;">${badge}</div></td>
</tr></table></td></tr>`;

const metaBlock = (order, statusLabel) => `<tr><td style="padding:24px 36px 0;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8f8;border-radius:4px;border:1px solid #e8e8e8;"><tr>
<td style="padding:16px 20px;border-right:1px solid #e8e8e8;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Order ID</div><div style="font-size:14px;font-weight:700;color:#C8981F;font-family:monospace;">${order.id}</div></td>
<td style="padding:16px 20px;border-right:1px solid #e8e8e8;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Date</div><div style="font-size:14px;color:#222;">${new Date(order.placedAt).toLocaleDateString()}</div></td>
<td style="padding:16px 20px;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">${statusLabel || "Delivery"}</div><div style="font-size:13px;color:#222;">${order.delivery.address}</div></td>
</tr></table></td></tr>`;

const itemsTable = (order) => `<tr><td style="padding:24px 36px 0;"><div style="font-size:11px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;font-weight:700;">Items Ordered</div><table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:4px;overflow:hidden;"><tr style="background:#0C1117;">
<td style="padding:10px 14px;font-size:11px;color:#C8981F;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Product</td>
<td style="padding:10px 14px;font-size:11px;color:#C8981F;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;text-align:right;">Total</td>
</tr>${order.items.map((i) =>
  `<tr><td style="padding:10px 14px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;">${i.description} ${i.size}<br/><span style="font-size:11px;color:#888">${i.qty} pcs @ $${(i.unitPrice || 0).toFixed(2)}</span></td>` +
  `<td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0;">$${(i.lineTotal || 0).toFixed(2)}</td></tr>`
).join("")}</table></td></tr>`;

const totalRow = (order, label) => `<tr><td style="padding:0 36px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td></td>
<td style="padding:16px 0;border-top:2px solid #C8981F;width:220px;" align="right">
<span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">${label || "Order Total"}&nbsp;&nbsp;</span>
<span style="font-size:22px;font-weight:700;color:#0C1117;">$${(order.total || 0).toFixed(2)}</span>
</td></tr></table></td></tr>`;

const poNotes = (order) => (order.po || order.notes)
  ? `<tr><td style="padding:0 36px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;border:1px solid #f0e0a0;border-radius:4px;"><tr><td style="padding:14px 18px;"><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong style="color:#333">PO Number:</strong> ${order.po || "N/A"}</div><div style="font-size:12px;color:#666;"><strong style="color:#333">Notes:</strong> ${order.notes || "None"}</div></td></tr></table></td></tr>`
  : "";

const contactStrip = `<tr><td style="padding:24px 36px;"><p style="margin:0;font-size:14px;color:#444;line-height:1.7;">Questions about your order?</p>
<p style="margin:10px 0 0;font-size:14px;color:#444;">&#128222; <a href="tel:17328291940" style="color:#C8981F;text-decoration:none;font-weight:600;">732-829-1940</a></p>
<p style="margin:4px 0 0;font-size:14px;color:#444;">&#9993;&#65039; <a href="mailto:info@allprobuildingsupplies.com" style="color:#C8981F;text-decoration:none;">info@allprobuildingsupplies.com</a></p></td></tr>`;

const footer = `<tr><td style="background:#0C1117;padding:20px 36px;text-align:center;"><div style="font-size:12px;color:#888;">&copy; 2026 All Pro Building Supplies LLC</div></td></tr>`;

const wrap = (inner) => `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">${inner}</table></td></tr></table></body></html>`;

const greeting = (name, body) => `<tr><td style="padding:32px 36px 0;"><p style="margin:0;font-size:16px;color:#222;">Hi <strong>${name}</strong>,</p><p style="margin:12px 0 0;font-size:15px;color:#444;line-height:1.6;">${body}</p></td></tr>`;

/* ---------- Templates ---------- */
export function buildConfirmEmail(order) {
  return wrap(
    header("ORDER RECEIVED", "#C8981F") +
    greeting(order.customer.name, "Thank you for your order! We've received it and will be in touch shortly to confirm availability and arrange delivery or pickup.") +
    metaBlock(order) + itemsTable(order) + totalRow(order) + poNotes(order) + contactStrip + footer
  );
}

export function buildDeliveredEmail(order) {
  return wrap(
    header("ORDER DELIVERED", "#3498db") +
    greeting(order.customer.name, `Great news! Your order <strong>${order.id}</strong> has been successfully delivered/picked up. Thank you for your business.`) +
    metaBlock(order, "Status") + totalRow(order, "Order Total") + contactStrip + footer
  );
}

export function buildInvoiceEmail(order) {
  const zelle = `<tr><td style="padding:0 36px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f8ff;border:1px solid #a3d5ff;border-radius:4px;"><tr><td style="padding:16px 20px;"><div style="font-size:13px;font-weight:700;color:#2c3e50;margin-bottom:8px;text-transform:uppercase;letter-spacing:1px;">Payment Instructions</div><div style="font-size:13px;color:#34495e;line-height:1.6;"><strong>Zelle:</strong> Please send payment to <strong>payments@allprobuildingsupplies.com</strong>.<br><div style="margin-top:8px;"><img src="https://allprobuildingsupplies.com/assets/zelle-qr.png" alt="Zelle QR Code" style="width:140px;height:auto;border-radius:8px;border:1px solid #ccc;"></div><span style="font-size:11px;color:#7f8c8d;">*Please include your Order ID (${order.id}) in the memo field.</span></div></td></tr></table></td></tr>`;
  return wrap(
    header("INVOICE", "#C8981F") +
    greeting(order.customer.name, "Please find your invoice for the order below. Thank you for your business!") +
    metaBlock(order, "Logistics") + itemsTable(order) + totalRow(order, "Amount Due") + zelle + contactStrip + footer
  );
}

export function buildStatusEmail(order, status) {
  const confirmed = status === "confirmed";
  const word = confirmed ? "CONFIRMED" : "CANCELLED";
  const color = confirmed ? "#2ecc71" : "#e74c3c";
  const msg = confirmed
    ? "Your order has been confirmed and is being processed. We will contact you shortly to arrange delivery or pickup."
    : "Your order has been cancelled. If you have any questions or believe this was an error, please contact us right away.";
  return wrap(
    header("ORDER " + word, color) +
    greeting(order.customer.name, msg) +
    metaBlock(order) + contactStrip + footer
  );
}

/* Convenience: build the standard param bundle used on checkout. */
export function orderEmailParams(order, html, subject, toEmail) {
  const cfg = CFG();
  return {
    to_email:     toEmail,
    cust_email:   toEmail,
    email_subject: subject,
    email_body:   html,
    order_id:     order.id,
    customer:     order.customer.name + " (" + (order.customer.company || "") + ")",
    phone:        order.customer.phone || "",
    delivery:     (order.delivery.method || "").toUpperCase() + ": " + order.delivery.address,
    po:           order.po || "N/A",
    notes:        order.notes || "None",
    total:        "$" + (order.total || 0).toFixed(2),
    placed_at:    new Date(order.placedAt).toLocaleString(),
    admin_link:   "https://allprobuildingsupplies.com/test/admin.html",
    cust_name:    order.customer.name,
    items:        order.items.map((i) => i.description + " " + i.size + " — " + i.qty + " pcs = $" + (i.lineTotal || 0).toFixed(2)).join("\n"),
    notify_email: cfg.NOTIFY_EMAIL || ""
  };
}
