const nodemailer = require('nodemailer');
const MailAgent = require('../../AI/MailAgent');

let transporter;
let transporterSignature;

function getTransporter() {
  const options = MailAgent.getTransportOptions();
  const signature = JSON.stringify(options);
  if (!transporter || transporterSignature !== signature) {
    transporter = nodemailer.createTransport(options);
    transporterSignature = signature;
  }
  return transporter;
}

async function sendMessage({ to, subject, body }) {
  if (!MailAgent.isConfigured()) {
    const error = new Error('SMTP is not configured');
    error.code = 'SMTP_NOT_CONFIGURED';
    throw error;
  }
  const info = await getTransporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text: body,
  });
  return {
    messageId: info.messageId || '',
    accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
    rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
  };
}

module.exports = { sendMessage };
