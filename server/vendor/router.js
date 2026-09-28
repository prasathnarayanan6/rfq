const express = require('express');
const multer = require('multer');
const { requireUser } = require('./auth');
const { validateVendor } = require('./validation');
const { listVendors, saveVendors, updateVendor } = require('./store');
const { prepareDrafts } = require('./organize');
const { validateCallRequest } = require('./callValidation');
const { createCallRequest } = require('./callStore');
const { validateOutbound, validateInbound } = require('./outreachValidation');
const { listConversation, listOutreachRequests, queueOutbound, recordInbound, listQuotes } = require('./outreachStore');

const router = express.Router();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
  ].includes(file.mimetype)),
});
router.use(requireUser);

router.get('/', async (req, res) => {
  try {
    res.json({ vendors: await listVendors(req.vendorUserId) });
  } catch (_error) {
    res.status(503).json({ error: 'Vendor catalog is unavailable' });
  }
});

router.get('/outreach/requests', async (req, res) => {
  try {
    return res.json({ requests: await listOutreachRequests(req.vendorUserId) });
  } catch (_error) {
    return res.status(503).json({ error: 'Outreach requests are unavailable' });
  }
});

router.get('/outreach/quotes', async (req, res) => {
  const requestId = String(req.query.requestId || '').trim();
  try {
    return res.json({ quotes: await listQuotes(req.vendorUserId, requestId) });
  } catch (_error) {
    return res.status(503).json({ error: 'Vendor quotations are unavailable' });
  }
});

router.get('/outreach/:requestId/conversation', async (req, res) => {
  const vendorId = String(req.query.vendorId || '').trim();
  if (!/^\d+$/.test(vendorId)) return res.status(400).json({ error: 'Choose a valid vendor' });
  try {
    return res.json({ messages: await listConversation(req.vendorUserId, req.params.requestId, vendorId) });
  } catch (_error) {
    return res.status(503).json({ error: 'The vendor conversation is unavailable' });
  }
});

router.post('/outreach/:requestId/send', async (req, res) => {
  const checked = validateOutbound(req.body);
  if (Object.keys(checked.errors).length) {
    return res.status(400).json({ error: 'Complete the outreach form before queuing messages', errors: checked.errors });
  }
  try {
    const result = await queueOutbound(req.vendorUserId, req.params.requestId, checked.value);
    return res.status(201).json(result);
  } catch (error) {
    if (['REQUEST_NOT_FOUND', 'INVALID_RECIPIENTS'].includes(error.code)) {
      return res.status(error.code === 'REQUEST_NOT_FOUND' ? 404 : 400).json({ error: error.message });
    }
    return res.status(503).json({ error: 'Outreach messages could not be queued' });
  }
});

// Authenticated ingestion point for local testing and future verified provider webhooks.
router.post('/outreach/:requestId/inbound', async (req, res) => {
  const checked = validateInbound(req.body);
  if (Object.keys(checked.errors).length) {
    return res.status(400).json({ error: 'Inbound message is invalid', errors: checked.errors });
  }
  try {
    return res.status(201).json(await recordInbound(req.vendorUserId, req.params.requestId, checked.value));
  } catch (error) {
    if (error.code === 'REQUEST_NOT_FOUND') return res.status(404).json({ error: error.message });
    return res.status(503).json({ error: 'Inbound message could not be processed' });
  }
});

router.post('/outreach/:requestId/inbound-media', (req, res) => {
  imageUpload.fields([{ name: 'attachment', maxCount: 1 }, { name: 'image', maxCount: 1 }])(req, res, async (uploadError) => {
    if (uploadError) return res.status(400).json({ error: uploadError.message || 'The quotation image could not be uploaded' });
    const file = req.files?.attachment?.[0] || req.files?.image?.[0];
    if (!file) return res.status(400).json({ error: 'Attach a JPG, PNG, GIF, WebP, or PDF quotation' });
    const checked = validateInbound({ ...req.body, channel: 'whatsapp' }, { hasAttachment: true });
    if (Object.keys(checked.errors).length) {
      return res.status(400).json({ error: 'Inbound message is invalid', errors: checked.errors });
    }
    try {
      return res.status(201).json(await recordInbound(req.vendorUserId, req.params.requestId, {
        ...checked.value,
        attachment: { bytes: file.buffer, mediaType: file.mimetype, fileName: file.originalname },
      }));
    } catch (error) {
      if (error.code === 'REQUEST_NOT_FOUND') return res.status(404).json({ error: error.message });
      return res.status(503).json({ error: 'Quotation attachment could not be processed' });
    }
  });
});

router.post('/prepare', async (req, res) => {
  if (!Array.isArray(req.body?.rows) && !req.body?.text) {
    return res.status(400).json({ error: 'Provide rows or pasted text' });
  }
  try {
    const drafts = await prepareDrafts(req.body, await listVendors(req.vendorUserId));
    res.json({ drafts });
  } catch (error) {
    const badInput = /Import up to|Pasted text|Add at least/.test(error.message);
    res.status(badInput ? 400 : 502).json({ error: badInput ? error.message : 'Vendor agent could not organize this list' });
  }
});

router.post('/calls', async (req, res) => {
  const checked = validateCallRequest(req.body);
  if (Object.keys(checked.errors).length) {
    return res.status(400).json({ error: 'Complete the call form before initiating', errors: checked.errors });
  }
  try {
    const callRequest = await createCallRequest(req.vendorUserId, checked.value);
    return res.status(201).json({ callRequest });
  } catch (error) {
    if (error.code === 'INVALID_VENDOR_SELECTION') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(503).json({ error: 'The call process could not be initiated' });
  }
});

router.post('/', async (req, res) => {
  const incoming = req.body?.vendors;
  if (!Array.isArray(incoming) || !incoming.length || incoming.length > 500) {
    return res.status(400).json({ error: 'Select 1 to 500 vendors to save' });
  }
  const checked = incoming.map(validateVendor);
  const invalid = checked.map((item, index) => ({ index, errors: item.errors }))
    .filter((item) => Object.keys(item.errors).length);
  if (invalid.length) return res.status(400).json({ error: 'Fix invalid vendors before saving', invalid });
  try {
    const vendors = await saveVendors(req.vendorUserId, checked.map((item) => item.vendor));
    res.status(201).json({ vendors });
  } catch (_error) {
    res.status(503).json({ error: 'Vendors could not be saved' });
  }
});

router.patch('/:id', async (req, res) => {
  if (!/^\d+$/.test(String(req.params.id))) {
    return res.status(400).json({ error: 'Invalid vendor ID' });
  }
  const checked = validateVendor(req.body?.vendor);
  if (Object.keys(checked.errors).length) {
    return res.status(400).json({ error: 'Fix invalid vendor details before saving', errors: checked.errors });
  }
  try {
    const vendor = await updateVendor(req.vendorUserId, req.params.id, checked.vendor);
    if (!vendor) return res.status(404).json({ error: 'Vendor was not found' });
    return res.json({ vendor });
  } catch (_error) {
    return res.status(503).json({ error: 'Vendor could not be updated' });
  }
});

module.exports = router;
