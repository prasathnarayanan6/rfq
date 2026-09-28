const { extractQuote } = require('../WhatsAppAgent/monitor');

function normalizeIncoming({ requestId, vendorId, text, providerMessageId = '' } = {}) {
  return {
    requestId: String(requestId || '').trim(),
    vendorId: String(vendorId || '').trim(),
    body: String(text || '').trim(),
    providerMessageId: String(providerMessageId || '').trim(),
    channel: 'email',
  };
}

module.exports = { extractQuote, normalizeIncoming };
