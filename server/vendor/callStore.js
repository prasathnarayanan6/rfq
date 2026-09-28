const { randomUUID } = require('crypto');
const { getPool } = require('./store');

async function createCallRequest(ownerId, request) {
  const database = getPool();
  const vendorResult = await database.query(
    `SELECT id, name, phone
     FROM vendors
     WHERE owner_id = $1
       AND business_type = $2
       AND id = ANY($3::bigint[])
       AND phone <> ''
     ORDER BY name`,
    [ownerId, request.businessType, request.vendorIds]
  );

  if (vendorResult.rows.length !== request.vendorIds.length) {
    const error = new Error('One or more selected vendors are unavailable or do not have a contact number');
    error.code = 'INVALID_VENDOR_SELECTION';
    throw error;
  }

  const id = randomUUID();
  const vendors = vendorResult.rows.map((vendor) => ({
    id: String(vendor.id),
    name: vendor.name,
    phone: vendor.phone,
  }));
  const result = await database.query(
    `INSERT INTO vendor_call_requests
       (id, owner_id, business_type, conversation_brief, vendors)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id, business_type AS "businessType", conversation_brief AS "conversationBrief",
               vendors, status, created_at AS "createdAt"`,
    [id, ownerId, request.businessType, request.conversationBrief, JSON.stringify(vendors)]
  );
  return result.rows[0];
}

module.exports = { createCallRequest };
