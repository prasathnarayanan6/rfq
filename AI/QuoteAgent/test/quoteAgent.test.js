import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonResponse } from '../json.js';
import {
  comparisonNarrativeSchema, normalizeComparisonPayload, normalizeQuotationPayload, quotationSchema,
} from '../schemas.js';
import { buildOrderedComparison } from '../comparison.js';

test('parses fenced or explanatory Claude JSON safely', () => {
  assert.deepEqual(parseJsonResponse('```json\n{"vendorName":"Alpha"}\n```'), { vendorName: 'Alpha' });
  assert.deepEqual(parseJsonResponse('Here is the result:\n{"vendorName":"Beta","note":"a } character"}\nDone.'), {
    vendorName: 'Beta', note: 'a } character',
  });
});

test('normalizes aliases and formatted monetary values', () => {
  const quote = quotationSchema.parse(normalizeQuotationPayload({ quotation: {
    vendor_name: 'Acme Supplies', currency_code: 'inr', sub_total: '₹1,00,000',
    gst_amount: '18,000.00', grand_total: '₹1,18,000.00',
  } }));
  assert.deepEqual(quote, {
    vendorName: 'Acme Supplies', currency: 'INR', subtotal: 100000, discountAmount: 0,
    taxAmount: 18000, shippingAmount: 0, otherCharges: 0, finalPrice: 118000,
  });
});

test('normalizes currency symbols and nested comparison aliases', () => {
  const quote = quotationSchema.parse(normalizeQuotationPayload({
    vendor: 'Symbol Vendor', currency: '₹', subtotal: '100', finalPrice: '100',
  }));
  assert.equal(quote.currency, 'INR');
  const narrative = comparisonNarrativeSchema.parse(normalizeComparisonPayload({
    recommended_vendor: 'Symbol Vendor', recommendation: 'Lowest total',
    vendor_reasons: [{ vendor_name: 'Symbol Vendor', recommendation: 'Lowest total' }],
  }));
  assert.equal(narrative.reasons[0].vendorName, 'Symbol Vendor');
});

test('orders comparison rows and calculates differences deterministically', () => {
  const comparison = buildOrderedComparison([
    { vendorName: 'Vendor B', currency: 'INR', subtotal: 110, taxAmount: 0, finalPrice: 110, sourceFile: 'b.pdf' },
    { vendorName: 'Vendor A', currency: 'INR', subtotal: 100, taxAmount: 0, finalPrice: 100, sourceFile: 'a.pdf' },
  ]);
  assert.equal(comparison.bestVendor, 'Vendor A');
  assert.deepEqual(comparison.rankings.map(({ vendorName, differenceFromBest }) => ({ vendorName, differenceFromBest })), [
    { vendorName: 'Vendor A', differenceFromBest: 0 },
    { vendorName: 'Vendor B', differenceFromBest: 10 },
  ]);
});
