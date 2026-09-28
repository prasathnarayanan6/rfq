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

const columns = 'id, name, business_type AS "businessType", contact, phone, whatsapp, email, location, status';

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
        `INSERT INTO vendors (owner_id, name, business_type, contact, phone, whatsapp, email, location, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING ${columns}`,
        [userId, vendor.name, vendor.businessType, vendor.contact, vendor.phone,
          vendor.whatsapp, vendor.email, vendor.location, vendor.status]
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

async function updateVendor(userId, vendorId, vendor) {
  const result = await getPool().query(
    `UPDATE vendors
     SET name = $3, business_type = $4, contact = $5, phone = $6,
         whatsapp = $7, email = $8, location = $9, status = $10
     WHERE id = $1 AND owner_id = $2
     RETURNING ${columns}`,
    [vendorId, userId, vendor.name, vendor.businessType, vendor.contact, vendor.phone,
      vendor.whatsapp, vendor.email, vendor.location, vendor.status]
  );
  return result.rows[0] || null;
}

module.exports = { getPool, listVendors, saveVendors, updateVendor };
