function appointmentTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.price), 0)
  return {subtotal, discount: 0, total: subtotal}
}

function lineTotal(item) {
  const quantity = Math.max(1, Number(item.qty) || 1)
  const subtotal = Number(item.unitPrice) * quantity
  const discount = Math.min(subtotal, Math.max(0, Number(item.discount) || 0))
  return subtotal - discount
}

function tabTotals(items, discount = 0) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0)
  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discount) || 0))
  return {subtotal, discount: safeDiscount, total: subtotal - safeDiscount}
}

function commissionAmount(baseCents, pct) {
  return Math.round((Number(baseCents) * Number(pct)) / 100)
}

module.exports = {appointmentTotals, lineTotal, tabTotals, commissionAmount}
