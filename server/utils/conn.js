const { Pool } = require('pg');

const connectionString = process.env.DATABASE_CONNECTION;

if (!connectionString) {
  throw new Error('DATABASE_CONNECTION is not configured');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.query('SELECT 1')
  .then(() => console.log('Database connected'))
  .catch((error) => {
    console.error('Database connection error', error.message);
  });

pool.on('error', (error) => {
  console.error('Unexpected database pool error', error);
});

module.exports = pool;
