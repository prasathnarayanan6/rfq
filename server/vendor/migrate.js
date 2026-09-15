require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

async function main() {
  if (!process.env.DATABASE_CONNECTION) throw new Error('DATABASE_CONNECTION is not configured');
  const client = new Client({ connectionString: process.env.DATABASE_CONNECTION, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    if (process.argv.includes('--apply')) {
      await client.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
      console.log('Vendor catalog schema applied');
    } else {
      const result = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vendors' ORDER BY ordinal_position");
      console.log(result.rows.length ? result.rows.map((row) => row.column_name).join(', ') : 'Vendor catalog table is missing');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error.code || error.message); process.exitCode = 1; });
