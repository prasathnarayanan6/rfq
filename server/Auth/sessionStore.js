const { randomUUID } = require('crypto');
const client = require('../utils/conn');

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

async function createSession(user, deviceInfo, ipAddress) {
  const session = {
    id: randomUUID(),
    expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
  };

  await client.query(
    `INSERT INTO public.auth_sessions
       (id, user_email, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [session.id, user.mail_data, deviceInfo || '', ipAddress || '', session.expiresAt]
  );

  return session;
}

module.exports = { createSession };
