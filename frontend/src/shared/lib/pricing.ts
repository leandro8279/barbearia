export interface PricingLine {
  quantity: number
  unitPriceCents: number
  discountCents?: number
  commissionRateBps?: number
}

export interface PricingSummary {
  subtotalCents: number
  discountCents: number
  totalCents: number
  tipCents: number
  grandTotalCents: number
  commissionCents: number
}

export function calculatePricing(lines: PricingLine[], requestedDiscountCents = 0, tipCents = 0): PricingSummary {
  const lineTotals = lines.map(line => Math.max(0, Math.round(line.unitPriceCents * line.quantity) - Math.max(0, Math.round(line.discountCents ?? 0))))
  const subtotalCents = lineTotals.reduce((sum, amount) => sum + amount, 0)
  const discountCents = Math.min(subtotalCents, Math.max(0, Math.round(requestedDiscountCents)))
  const totalCents = subtotalCents - discountCents
  const safeTipCents = Math.max(0, Math.round(tipCents))
  let remainingDiscount = discountCents
  const commissionCents = lines.reduce((sum, line, index) => {
    const rate = Math.min(10_000, Math.max(0, line.commissionRateBps ?? 0))
    const allocatedDiscount =
      index === lineTotals.length - 1 ? remainingDiscount
      : subtotalCents > 0 ? Math.floor((discountCents * lineTotals[index]) / subtotalCents)
      : 0
    remainingDiscount -= allocatedDiscount
    const commissionBaseCents = Math.max(0, lineTotals[index] - allocatedDiscount)
    return sum + Math.round((commissionBaseCents * rate) / 10_000)
  }, 0)

  return {subtotalCents, discountCents, totalCents, tipCents: safeTipCents, grandTotalCents: totalCents + safeTipCents, commissionCents}
}
