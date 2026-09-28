const CHANNELS = new Set(['whatsapp', 'email']);

function validateOutbound(input = {}) {
  const channel = String(input.channel || '').toLowerCase().trim();
  const message = String(input.message || '').trim();
  const vendorIds = [...new Set((Array.isArray(input.vendorIds) ? input.vendorIds : [])
    .map((id) => String(id).trim()).filter((id) => /^\d+$/.test(id)))];
  const errors = {};
  if (!CHANNELS.has(channel)) errors.channel = 'Choose WhatsApp or email';
  if (!vendorIds.length) errors.vendorIds = 'Choose at least one eligible vendor';
  if (message.length < 10 || message.length > 5000) errors.message = 'Write a message between 10 and 5000 characters';
  return { value: { channel, message, vendorIds }, errors };
}

function validateInbound(input = {}) {
  const channel = String(input.channel || '').toLowerCase().trim();
  const vendorId = String(input.vendorId || '').trim();
  const body = String(input.body || '').trim();
  const providerMessageId = String(input.providerMessageId || '').trim().slice(0, 500);
  const errors = {};
  if (!CHANNELS.has(channel)) errors.channel = 'Choose WhatsApp or email';
  if (!/^\d+$/.test(vendorId)) errors.vendorId = 'Choose a valid vendor';
  if (!body || body.length > 20000) errors.body = 'Reply text is required and must be under 20000 characters';
  return { value: { channel, vendorId, body, providerMessageId }, errors };
}

module.exports = { validateOutbound, validateInbound };
