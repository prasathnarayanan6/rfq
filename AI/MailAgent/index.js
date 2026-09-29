const PROVIDER_ENV = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];

function isConfigured() {
  return PROVIDER_ENV.every((name) => Boolean(process.env[name]));
}

function getTransportOptions() {
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host: process.env.SMTP_HOST,
    port,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };
}

function buildMessage({ vendorName, requirements, requestId }) {
  return {
    subject: `Request for quotation · ${requestId}`,
    body: [
      `Hello ${vendorName || 'there'},`,
      '',
      'Please provide a quotation for the requirement below:',
      String(requirements || '').trim(),
      '',
      'Kindly include pricing, availability, delivery timeline, taxes, and payment terms.',
      '',
      `Reference: ${requestId}`,
    ].join('\n'),
  };
}

module.exports = { buildMessage, getTransportOptions, isConfigured };
