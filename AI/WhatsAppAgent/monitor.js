function numberFrom(text, expression) {
  const match = String(text || '').match(expression);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function extractQuote(message = '') {
  const text = String(message).trim();
  const currency = /(?:₹|\bINR\b|\bRs\.?)/i.test(text) ? 'INR'
    : /(?:\$|\bUSD\b)/i.test(text) ? 'USD'
      : /(?:€|\bEUR\b)/i.test(text) ? 'EUR' : '';
  const totalAmount = numberFrom(text, /(?:total|amount|price|quote|quotation|motham|vilai|rate|₹|\bINR\b|\bRs\.?|rooba|rupees?|\$|\bUSD\b)\s*[:=-]?\s*(?:₹|\$|€|INR|USD|EUR|Rs\.?)?\s*([\d,]+(?:\.\d{1,2})?)/i);
  const deliveryDays = numberFrom(text, /(?:delivery|deliver|dispatch|lead\s*time)[^\d]{0,20}(\d+)\s*(?:business\s*)?(?:days?|naal)/i)
    || numberFrom(text, /(\d+)\s*(?:days?|naal)(?:\s*(?:la|il|kulla|within))?/i);
  const paymentMatch = text.match(/(?:payment\s*terms?|terms?|payment|advance)\s*[:=-]?\s*([^\n.;]+)/i);
  const looksLikeQuote = Boolean(currency || totalAmount || deliveryDays || /quotation|quote|pricing|per\s+(?:unit|piece|kg)|motham|vilai|rooba/i.test(text));

  if (!looksLikeQuote) return null;
  return {
    currency: currency || 'INR',
    totalAmount,
    deliveryDays,
    paymentTerms: paymentMatch ? paymentMatch[1].trim().slice(0, 250) : '',
    rawText: text,
  };
}

function normalizeIncoming({ requestId, vendorId, text, providerMessageId = '' } = {}) {
  return {
    requestId: String(requestId || '').trim(),
    vendorId: String(vendorId || '').trim(),
    body: String(text || '').trim(),
    providerMessageId: String(providerMessageId || '').trim(),
    channel: 'whatsapp',
  };
}

module.exports = { extractQuote, normalizeIncoming };
