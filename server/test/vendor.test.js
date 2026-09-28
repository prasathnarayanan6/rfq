const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { validateVendor, duplicateKey } = require('../vendor/validation');
const { sourceEntries, makeDraft, basicDraft, headingMap } = require('../vendor/organize');
const { requireUser } = require('../vendor/auth');
const { validateCallRequest } = require('../vendor/callValidation');

test('vendor minimum is name, business type, and one valid contact route', () => {
  const valid = validateVendor({ name: '  Bright Tools ', businessType: 'Hardware', email: 'sales@example.com' });
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.vendor.name, 'Bright Tools');
  assert.equal(valid.vendor.status, 'Pending');
  assert.ok(validateVendor({ name: 'A', businessType: 'B' }).errors.phone);
  assert.ok(validateVendor({ name: 'A', businessType: 'B', phone: '123' }).errors.phone);
  assert.deepEqual(validateVendor({ name: 'A', businessType: 'B', whatsapp: '+91 98765 43210' }).errors, {});
  assert.ok(validateVendor({ name: 'A', businessType: 'B', whatsapp: '123' }).errors.whatsapp);
  assert.ok(validateVendor({ name: 'A', businessType: 'B', email: 'bad' }).errors.email);
});

test('source extraction retains messy rows and model contacts must appear in source', () => {
  assert.equal(sourceEntries({ rows: [['Vendor', 'Type'], ['Bright Tools', 'hardware', 'sales@example.com']] }).length, 1);
  const draft = makeDraft({ name: 'Bright Tools', businessType: 'Hardware', email: 'invented@example.com', phone: '9999999999', uncertainType: true },
    ['Bright Tools, hardware, sales@example.com'], 0);
  assert.equal(draft.vendor.email, '');
  assert.equal(draft.vendor.phone, '');
  assert.ok(draft.warnings.some((warning) => warning.includes('business type')));
  assert.equal(duplicateKey({ name: 'Bright Tools Pvt. Ltd.' }), 'brighttoolspvtltd');
});

test('basic cleanup keeps spreadsheet fields and pasted contacts reviewable', () => {
  const headers = headingMap(JSON.stringify(['Vendor Name', 'Category', 'WhatsApp Number', 'Email']));
  assert.deepEqual(headers, { name: 0, businessType: 1, whatsapp: 2, email: 3 });
  const row = basicDraft({ index: 1, source: JSON.stringify(['Bright Tools', 'hardware', '+91 98765 43210', '']) }, headers, []);
  assert.equal(row.vendor.name, 'Bright Tools');
  assert.equal(row.vendor.phone, '');
  assert.equal(row.vendor.whatsapp, '+91 98765 43210');
  assert.ok(row.warnings[0].includes('basic cleanup'));
  const pasted = basicDraft({ index: 0, source: 'Bright Tools, hardware, sales@example.com' }, null, []);
  assert.equal(pasted.vendor.email, 'sales@example.com');
});

test('vendor authentication verifies signature and ignores untrusted client user IDs', () => {
  process.env.AUTH_JWT_SECRET = 'test-secret';
  const token = jwt.sign({ people_id: 'user-1' }, process.env.AUTH_JWT_SECRET, { algorithm: 'HS256' });
  const request = { headers: { authorization: `Bearer ${token}` }, body: { userId: 'user-2' } };
  let called = false;
  requireUser(request, {}, () => { called = true; });
  assert.equal(called, true);
  assert.equal(request.vendorUserId, 'user-1');
  delete process.env.AUTH_JWT_SECRET;
});

test('call requests require a business type, eligible vendor IDs, and a useful brief', () => {
  const valid = validateCallRequest({
    businessType: 'Hardware',
    vendorIds: [2, '2', 4],
    conversationBrief: 'Ask about pricing and delivery dates.',
  });
  assert.deepEqual(valid.errors, {});
  assert.deepEqual(valid.value.vendorIds, [2, 4]);
  const invalid = validateCallRequest({ businessType: '', vendorIds: [], conversationBrief: 'Hi' });
  assert.ok(invalid.errors.businessType);
  assert.ok(invalid.errors.vendorIds);
  assert.ok(invalid.errors.conversationBrief);
});
