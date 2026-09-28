const { randomUUID } = require('crypto');
const { getPool } = require('./store');
const WhatsAppAgent = require('../../AI/WhatsAppAgent');
const MailAgent = require('../../AI/MailAgent');
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
    `SELECT vendor.id, vendor.name, request.business_type AS "businessType",
            request.conversation_brief AS requirements
     FROM vendors vendor
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
  const conversationResult = await database.query(
    `SELECT direction, body, metadata->'analysis'->>'englishSummary' AS summary
     FROM vendor_outreach_messages
     WHERE owner_id = $1 AND request_id = $2 AND vendor_id = $3 AND channel = $4
     ORDER BY created_at DESC LIMIT 20`,
    [ownerId, requestId, vendor.id, inbound.channel]
  );
  const conversation = conversationResult.rows.reverse();
  let analysis;
  let extracted;
  if (inbound.channel === 'whatsapp') {
    analysis = await WhatsAppAgent.analyzeInbound({
      text: inbound.body,
      attachment: inbound.attachment || inbound.image,
      conversation,
      request: { businessType: vendor.businessType, requirements: vendor.requirements },
      vendorName: vendor.name,
    });
    extracted = analysis.isQuote ? {
      currency: analysis.currency,
      totalAmount: analysis.totalAmount,
      deliveryDays: analysis.deliveryDays,
      paymentTerms: analysis.paymentTerms,
      rawText: inbound.body || analysis.englishSummary,
    } : null;
  } else {
    extracted = MailMonitor.extractQuote(inbound.body);
    analysis = extracted ? { ...extracted, isQuote: true, messageType: 'quote', source: 'text-parser' }
      : { isQuote: false, messageType: 'other', source: 'text-parser' };
  }
  const messageId = randomUUID();
  const attachment = inbound.attachment || inbound.image;
  const metadata = {
    analysis,
    ...(attachment ? { attachment: {
      fileName: attachment.fileName,
      mediaType: attachment.mediaType,
      size: attachment.bytes.length,
    } } : {}),
  };
  const messageResult = await database.query(
    `INSERT INTO vendor_outreach_messages
       (id, owner_id, request_id, vendor_id, vendor_name, channel, direction, body, provider_message_id, status, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, 'inbound', $7, $8, 'Received', $9)
     RETURNING id, request_id AS "requestId", vendor_id AS "vendorId", vendor_name AS "vendorName",
               channel, direction, body, status, created_at AS "createdAt"`,
    [messageId, ownerId, requestId, vendor.id, vendor.name, inbound.channel,
      inbound.body || analysis.englishSummary, inbound.providerMessageId, metadata]
  );

  let quote = null;
  if (extracted) {
    const quoteResult = await database.query(
      `INSERT INTO vendor_quotes
         (id, owner_id, request_id, vendor_id, vendor_name, channel, source_message_id,
          currency, total_amount, delivery_days, payment_terms, raw_text, subtotal,
          discount_amount, tax_amount, shipping_amount, other_charges, availability,
          confidence, needs_review, detected_language, english_summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, $18, $19, $20, $21, $22)
       ON CONFLICT (owner_id, request_id, vendor_id, channel) DO UPDATE SET
         source_message_id = EXCLUDED.source_message_id,
         vendor_name = EXCLUDED.vendor_name,
         currency = EXCLUDED.currency,
         total_amount = EXCLUDED.total_amount,
         delivery_days = EXCLUDED.delivery_days,
         payment_terms = EXCLUDED.payment_terms,
         raw_text = EXCLUDED.raw_text,
         subtotal = EXCLUDED.subtotal,
         discount_amount = EXCLUDED.discount_amount,
         tax_amount = EXCLUDED.tax_amount,
         shipping_amount = EXCLUDED.shipping_amount,
         other_charges = EXCLUDED.other_charges,
         availability = EXCLUDED.availability,
         confidence = EXCLUDED.confidence,
         needs_review = EXCLUDED.needs_review,
         detected_language = EXCLUDED.detected_language,
         english_summary = EXCLUDED.english_summary,
         status = 'Received',
         created_at = now()
       RETURNING id, request_id AS "requestId", vendor_id AS "vendorId", vendor_name AS "vendorName",
                 channel, currency, total_amount AS "totalAmount", delivery_days AS "deliveryDays",
                 payment_terms AS "paymentTerms", raw_text AS "rawText", subtotal,
                 discount_amount AS "discountAmount", tax_amount AS "taxAmount",
                 shipping_amount AS "shippingAmount", other_charges AS "otherCharges",
                 availability, confidence, needs_review AS "needsReview",
                 detected_language AS "detectedLanguage", english_summary AS "englishSummary",
                 status, created_at AS "createdAt"`,
      [randomUUID(), ownerId, requestId, vendor.id, vendor.name, inbound.channel, messageId,
        extracted.currency, extracted.totalAmount, extracted.deliveryDays, extracted.paymentTerms, extracted.rawText,
        analysis.subtotal, analysis.discountAmount, analysis.taxAmount, analysis.shippingAmount,
        analysis.otherCharges, analysis.availability || '', analysis.confidence, Boolean(analysis.needsReview),
        analysis.detectedLanguage || '', analysis.englishSummary || '']
    );
    quote = quoteResult.rows[0];
  }
  return { message: messageResult.rows[0], analysis, quote };
}

async function listConversation(ownerId, requestId, vendorId) {
  const result = await getPool().query(
    `SELECT id, vendor_id AS "vendorId", vendor_name AS "vendorName", channel, direction,
            subject, body, status, metadata, created_at AS "createdAt"
     FROM vendor_outreach_messages
     WHERE owner_id = $1 AND request_id = $2 AND vendor_id = $3
     ORDER BY created_at ASC`,
    [ownerId, requestId, vendorId]
  );
  return result.rows;
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
            quote.subtotal, quote.discount_amount AS "discountAmount", quote.tax_amount AS "taxAmount",
            quote.shipping_amount AS "shippingAmount", quote.other_charges AS "otherCharges",
            quote.availability, quote.confidence, quote.needs_review AS "needsReview",
            quote.detected_language AS "detectedLanguage", quote.english_summary AS "englishSummary",
            quote.status, quote.created_at AS "createdAt", request.business_type AS "businessType"
     FROM vendor_quotes quote
     JOIN vendor_call_requests request ON request.id = quote.request_id
     WHERE quote.owner_id = $1 ${requestFilter}
     ORDER BY quote.created_at DESC`,
    values
  );
  return result.rows;
}

module.exports = { listConversation, listOutreachRequests, queueOutbound, recordInbound, listQuotes };
