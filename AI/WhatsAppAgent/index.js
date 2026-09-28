const PROVIDER_ENV = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
const { analyzeInbound, isAiConfigured } = require('./agent');

function isConfigured() {
  return PROVIDER_ENV.every((name) => Boolean(process.env[name]));
}

function buildMessage({ vendorName, requirements, requestId }) {
  return [
    `Hello ${vendorName || 'there'},`,
    '',
    `We are requesting a quotation for the following requirement: ${String(requirements || '').trim()}`,
    '',
    'Please reply with pricing, availability, delivery timeline, payment terms, and any applicable taxes.',
    `Reference: ${requestId}`,
  ].join('\n');
}

module.exports = { analyzeInbound, buildMessage, isAiConfigured, isConfigured };
