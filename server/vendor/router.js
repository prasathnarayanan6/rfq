const express = require('express');
const { requireUser } = require('./auth');
const { validateVendor } = require('./validation');
const { listVendors, saveVendors } = require('./store');
const { prepareDrafts } = require('./organize');
const { validateCallRequest } = require('./callValidation');
const { createCallRequest } = require('./callStore');

const router = express.Router();
router.use(requireUser);

router.get('/', async (req, res) => {
  try {
    res.json({ vendors: await listVendors(req.vendorUserId) });
  } catch (_error) {
    res.status(503).json({ error: 'Vendor catalog is unavailable' });
  }
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

module.exports = router;
