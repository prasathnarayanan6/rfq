const { randomUUID } = require('crypto');
const { getPool } = require('./store');
const WhatsAppAgent = require('../../AI/WhatsAppAgent');
const MailAgent = require('../../AI/MailAgent');
const WhatsAppMonitor = require('../../AI/WhatsAppAgent/monitor');
const MailMonitor = require('../../AI/MailAgent/monitor');

async function listOutreachRequests(ownerId) {
  const database = getPool();
  const requestResult = await database.query(
    `SELECT call.id, call.business_type AS "businessType", call.conversation_brief AS requirements,
            call.vendors, call.status, call.created_at AS "createdAt",
            COALESCE((SELECT COUNT(*)::int FROM vendor_outreach_messages message
                      WHERE message.owner_id = call.owner_id AND message.request_id = call.id
                        AND message.channel = 'whatsapp' AND message.direction = 'outbound'), 0) AS "whatsappCount",
            COALESCE((SELECT COUNT(*)::int FROM vendor_outreach_messages message
                      WHERE message.owner_id = call.owner_id AND message.request_id = call.id
                        AND message.channel = 'email' AND message.direction = 'outbound'), 0) AS "emailCount",
            COALESCE((SELECT COUNT(*)::int FROM vendor_quotes quote
                      WHERE quote.owner_id = call.owner_id AND quote.request_id = call.id), 0) AS "quoteCount"
     FROM vendor_call_requests call
     WHERE call.owner_id = $1
     ORDER BY call.created_at DESC`,
    [ownerId]
  );
  if (!requestResult.rows.length) return [];

  const vendorIds = [...new Set(requestResult.rows.flatMap((request) => {
    const source = request.vendors || [];
    return source.map((vendor) => String(vendor.id));
  }))];
  const vendorResult = vendorIds.length ? await database.query(
    `SELECT id, name, phone, whatsapp, email FROM vendors WHERE owner_id = $1 AND id = ANY($2::bigint[])`,
    [ownerId, vendorIds]
  ) : { rows: [] };
  const vendorMap = new Map(vendorResult.rows.map((vendor) => [String(vendor.id), { ...vendor, id: String(vendor.id) }]));

  return requestResult.rows.map((request) => ({
    ...request,
    vendors: (request.vendors || []).map((vendor) => vendorMap.get(String(vendor.id)) || { ...vendor, id: String(vendor.id), whatsapp: '', email: '' }),
  }));
}

async function queueOutbound(ownerId, requestId, outbound) {
  const database = getPool();
  const requestResult = await database.query(
    `SELECT id, conversation_brief AS requirements, vendors
     FROM vendor_call_requests WHERE id = $1 AND owner_id = $2`,
    [requestId, ownerId]
  );
  if (!requestResult.rows[0]) {
    const error = new Error('Sourcing request was not found');
    error.code = 'REQUEST_NOT_FOUND';
    throw error;
  }

  const requestVendorIds = new Set((requestResult.rows[0].vendors || []).map((vendor) => String(vendor.id)));
  if (outbound.vendorIds.some((vendorId) => !requestVendorIds.has(String(vendorId)))) {
    const error = new Error('One or more selected vendors are not linked to this sourcing request');
    error.code = 'INVALID_RECIPIENTS';
    throw error;
  }

  const contactColumn = outbound.channel === 'whatsapp' ? 'whatsapp' : 'email';
  const vendorResult = await database.query(
    `SELECT id, name, phone, whatsapp, email FROM vendors
     WHERE owner_id = $1 AND id = ANY($2::bigint[]) AND ${contactColumn} <> '' ORDER BY name`,
    [ownerId, outbound.vendorIds]
  );
  if (vendorResult.rows.length !== outbound.vendorIds.length) {
    const error = new Error(`One or more selected vendors do not have a ${outbound.channel === 'whatsapp' ? 'WhatsApp number' : 'email address'}`);
    error.code = 'INVALID_RECIPIENTS';
    throw error;
  }

  const providerReady = outbound.channel === 'whatsapp' ? WhatsAppAgent.isConfigured() : MailAgent.isConfigured();
  const status = providerReady ? 'Queued' : 'Awaiting Provider';
  const saved = [];
  for (const vendor of vendorResult.rows) {
    const generated = outbound.channel === 'whatsapp'
      ? { subject: '', body: outbound.message || WhatsAppAgent.buildMessage({ vendorName: vendor.name, requirements: requestResult.rows[0].requirements, requestId }) }
      : { ...MailAgent.buildMessage({ vendorName: vendor.name, requirements: requestResult.rows[0].requirements, requestId }), body: outbound.message };
    const result = await database.query(
      `INSERT INTO vendor_outreach_messages
         (id, owner_id, request_id, vendor_id, vendor_name, channel, direction, subject, body, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, 'outbound', $7, $8, $9, $10)
       RETURNING id, request_id AS "requestId", vendor_id AS "vendorId", vendor_name AS "vendorName",
                 channel, direction, subject, body, status, created_at AS "createdAt"`,
      [randomUUID(), ownerId, requestId, vendor.id, vendor.name, outbound.channel, generated.subject,
        generated.body, status, { destination: vendor[contactColumn] }]
    );
    saved.push(result.rows[0]);
  }
  return { messages: saved, providerReady };
}

async function recordInbound(ownerId, requestId, inbound) {
  const database = getPool();
  const vendorResult = await database.query(
    `SELECT vendor.id, vendor.name FROM vendors vendor
     JOIN vendor_call_requests request ON request.id = $1 AND request.owner_id = $2
     WHERE vendor.id = $3 AND vendor.owner_id = $2
       AND EXISTS (SELECT 1 FROM jsonb_array_elements(request.vendors) item WHERE item->>'id' = vendor.id::text)`,
    [requestId, ownerId, inbound.vendorId]
  );
  if (!vendorResult.rows[0]) {
    const error = new Error('Request or vendor was not found');
    error.code = 'REQUEST_NOT_FOUND';
    throw error;
  }
  const vendor = vendorResult.rows[0];
  const messageId = randomUUID();
  const messageResult = await database.query(
    `INSERT INTO vendor_outreach_messages
       (id, owner_id, request_id, vendor_id, vendor_name, channel, direction, body, provider_message_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'inbound', $7, $8, 'Received')
     RETURNING id, request_id AS "requestId", vendor_id AS "vendorId", vendor_name AS "vendorName",
               channel, direction, body, status, created_at AS "createdAt"`,
    [messageId, ownerId, requestId, vendor.id, vendor.name, inbound.channel, inbound.body, inbound.providerMessageId]
  );

  const monitor = inbound.channel === 'email' ? MailMonitor : WhatsAppMonitor;
  const extracted = monitor.extractQuote(inbound.body);
  let quote = null;
  if (extracted) {
    const quoteResult = await database.query(
      `INSERT INTO vendor_quotes
         (id, owner_id, request_id, vendor_id, vendor_name, channel, source_message_id,
          currency, total_amount, delivery_days, payment_terms, raw_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, request_id AS "requestId", vendor_id AS "vendorId", vendor_name AS "vendorName",
                 channel, currency, total_amount AS "totalAmount", delivery_days AS "deliveryDays",
                 payment_terms AS "paymentTerms", raw_text AS "rawText", status, created_at AS "createdAt"`,
      [randomUUID(), ownerId, requestId, vendor.id, vendor.name, inbound.channel, messageId,
        extracted.currency, extracted.totalAmount, extracted.deliveryDays, extracted.paymentTerms, extracted.rawText]
    );
    quote = quoteResult.rows[0];
  }
  return { message: messageResult.rows[0], quote };
}

async function listQuotes(ownerId, requestId = '') {
  const values = [ownerId];
  let requestFilter = '';
  if (requestId) {
    values.push(requestId);
    requestFilter = 'AND quote.request_id = $2';
  }
  const result = await getPool().query(
    `SELECT quote.id, quote.request_id AS "requestId", quote.vendor_id AS "vendorId",
            quote.vendor_name AS "vendorName", quote.channel, quote.currency,
            quote.total_amount AS "totalAmount", quote.delivery_days AS "deliveryDays",
            quote.payment_terms AS "paymentTerms", quote.raw_text AS "rawText",
            quote.status, quote.created_at AS "createdAt", request.business_type AS "businessType"
     FROM vendor_quotes quote
     JOIN vendor_call_requests request ON request.id = quote.request_id
     WHERE quote.owner_id = $1 ${requestFilter}
     ORDER BY quote.created_at DESC`,
    values
  );
  return result.rows;
}

module.exports = { listOutreachRequests, queueOutbound, recordInbound, listQuotes };
