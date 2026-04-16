/* cart.mjs — single cart implementation shared by products/cart/checkout. */
const CART_KEY = "apbs_cart";

export function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch { return []; }
}
export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
export function clearCart() {
  saveCart([]);
}
export function cartTotal(cart = getCart()) {
  return cart.reduce((s, i) => s + (parseFloat(i.unitPrice) || 0) * (parseInt(i.qty) || 0), 0);
}
export function cartItemCount(cart = getCart()) {
  return cart.reduce((s, i) => s + (parseInt(i.qty) || 0), 0);
}

/* Add/update a product to the cart, respecting max available qty. */
export function addItem(cart, row, canOrderPieces) {
  const existing = cart.find((i) => i.code === row.code && i.size === row.size);
  if (existing) {
    existing.qty = Math.min((existing.qty || 0) + 1, row.maxQty);
    return cart;
  }
  const defaultUnit = canOrderPieces === false ? "carton" : "piece";
  const defaultQty  = defaultUnit === "carton" ? row.pcsPerCtn : 1;
  cart.push({
    code: row.code,
    size: row.size,
    description: row.description,
    pcsPerCtn: row.pcsPerCtn,
    unitPrice: row.unitPrice,
    qty: defaultQty,
    unit: defaultUnit,
    maxQty: row.maxQty
  });
  return cart;
}
