const { Pool } = require('pg');

let pool;
function getPool() {
  if (!process.env.DATABASE_CONNECTION) {
    throw new Error('DATABASE_CONNECTION is not configured');
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_CONNECTION,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

const columns = 'id, name, business_type AS "businessType", contact, phone, email, location, status';

async function listVendors(userId) {
  const result = await getPool().query(
    `SELECT ${columns} FROM vendors WHERE owner_id = $1 ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return result.rows;
}

async function saveVendors(userId, vendors) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const saved = [];
    for (const vendor of vendors) {
      const result = await client.query(
        `INSERT INTO vendors (owner_id, name, business_type, contact, phone, email, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ${columns}`,
        [userId, vendor.name, vendor.businessType, vendor.contact, vendor.phone,
          vendor.email, vendor.location, vendor.status]
      );
      saved.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return saved;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { listVendors, saveVendors };
