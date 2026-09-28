const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { Client } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_CONNECTION) {
    throw new Error('DATABASE_CONNECTION is not configured');
  }

  const database = new Client({
    connectionString: process.env.DATABASE_CONNECTION,
    ssl: { rejectUnauthorized: false },
  });
  await database.connect();
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await database.query(schema);
    console.log('Authentication schema is ready');
  } finally {
    await database.end();
  }
}

migrate().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
