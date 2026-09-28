export function buildOrderedComparison(quotes, narrative = {}) {
  const ordered = [...quotes].sort((left, right) => (
    Number(left.finalPrice) - Number(right.finalPrice)
    || String(left.vendorName).localeCompare(String(right.vendorName))
  ));
  if (!ordered.length) throw new Error('At least one quotation is required');
  const bestPrice = Number(ordered[0].finalPrice);
  const tiedVendors = ordered.filter((quote) => Math.abs(Number(quote.finalPrice) - bestPrice) <= 0.01).map((quote) => quote.vendorName);
  const reasonMap = new Map((narrative.reasons || []).map((entry) => [entry.vendorName.toLowerCase(), entry.reason]));
  let previousPrice;
  let previousRank = 0;
  const rankings = ordered.map((quote, index) => {
    const price = Number(quote.finalPrice);
    const rank = previousPrice !== undefined && Math.abs(price - previousPrice) <= 0.01 ? previousRank : index + 1;
    previousPrice = price;
    previousRank = rank;
    return {
      rank,
      vendorName: quote.vendorName,
      currency: quote.currency || 'INR',
      subtotal: Number(quote.subtotal),
      discountAmount: Number(quote.discountAmount || 0),
      taxAmount: Number(quote.taxAmount || 0),
      shippingAmount: Number(quote.shippingAmount || 0),
      otherCharges: Number(quote.otherCharges || 0),
      finalPrice: price,
      differenceFromBest: Number((price - bestPrice).toFixed(2)),
      reason: reasonMap.get(String(quote.vendorName).toLowerCase()) || (rank === 1 ? 'Lowest validated final price.' : 'Ranked by validated final price.'),
      sourceFile: quote.sourceFile,
      calculationStatus: quote.calculationWarning ? 'Review' : 'Verified',
      calculationWarning: quote.calculationWarning || null,
    };
  });
  return {
    bestVendor: tiedVendors.length === 1 ? tiedVendors[0] : tiedVendors.join(', '),
    bestFinalPrice: bestPrice,
    currency: ordered[0].currency || 'INR',
    isTie: tiedVendors.length > 1,
    tiedVendors,
    summary: narrative.summary || (tiedVendors.length > 1
      ? `${tiedVendors.join(' and ')} have the same lowest validated final price.`
      : `${tiedVendors[0]} has the lowest validated final price.`),
    rankings,
  };
}
