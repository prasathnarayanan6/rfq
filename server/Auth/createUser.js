const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function createUser() {
  const [emailInput, password, name = '', role = 'user'] = process.argv.slice(2);
  const email = String(emailInput || '').trim().toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email) || String(password || '').length < 8) {
    throw new Error('Usage: npm run auth:create-user -- email@example.com password "Name" [role] (password must be at least 8 characters)');
  }
  if (!process.env.DATABASE_CONNECTION) {
    throw new Error('DATABASE_CONNECTION is not configured');
  }

  const database = new Client({
    connectionString: process.env.DATABASE_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });
  await database.connect();
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await database.query(
      `INSERT INTO public.user_date (mail_data, password, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (lower(mail_data)) DO UPDATE
       SET password = EXCLUDED.password,
           name = EXCLUDED.name,
           role = EXCLUDED.role`,
      [email, passwordHash, name.trim(), role.trim() || 'user']
    );
    console.log(`User ${email} is ready`);
  } finally {
    await database.end();
  }
}

createUser().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
