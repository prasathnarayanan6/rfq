import { z } from 'zod';
import { unwrapPayload } from './json.js';

function moneyValue(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;
  const source = value.trim();
  if (!source) return undefined;
  const negative = /^\(.*\)$/.test(source);
  const cleaned = source.replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? (negative ? -Math.abs(parsed) : parsed) : value;
}

const money = z.preprocess(moneyValue, z.number().finite().nonnegative());
const currency = z.preprocess((value) => {
  const normalized = String(value || 'INR').trim().toUpperCase();
  if (normalized === '₹' || /^RS\.?$/.test(normalized)) return 'INR';
  if (normalized === '$') return 'USD';
  if (normalized === '€') return 'EUR';
  return normalized;
}, z.string().length(3));

export const quotationSchema = z.object({
  vendorName: z.string().trim().min(1),
  currency: currency.default('INR'),
  subtotal: money,
  discountAmount: money.default(0),
  taxAmount: money.default(0),
  shippingAmount: money.default(0),
  otherCharges: money.default(0),
  finalPrice: money,
});

const reasonSchema = z.object({
  vendorName: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(500),
});

export const comparisonNarrativeSchema = z.object({
  bestVendor: z.string().trim().min(1),
  summary: z.string().trim().min(1).max(1000),
  reasons: z.array(reasonSchema).default([]),
});

function first(source, names, fallback) {
  for (const name of names) {
    if (source?.[name] !== undefined && source[name] !== null && source[name] !== '') return source[name];
  }
  return fallback;
}

export function normalizeQuotationPayload(payload) {
  const source = unwrapPayload(payload, ['quotation', 'quote', 'data', 'result']);
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
  return {
    vendorName: first(source, ['vendorName', 'vendor_name', 'supplierName', 'supplier_name', 'vendor']),
    currency: first(source, ['currency', 'currencyCode', 'currency_code'], 'INR'),
    subtotal: first(source, ['subtotal', 'subTotal', 'sub_total', 'netAmount', 'net_amount']),
    discountAmount: first(source, ['discountAmount', 'discount_amount', 'discount'], 0),
    taxAmount: first(source, ['taxAmount', 'tax_amount', 'tax', 'gstAmount', 'gst_amount'], 0),
    shippingAmount: first(source, ['shippingAmount', 'shipping_amount', 'shipping', 'freightAmount', 'freight_amount', 'freight'], 0),
    otherCharges: first(source, ['otherCharges', 'other_charges', 'handlingCharges', 'handling_charges', 'cess'], 0),
    finalPrice: first(source, ['finalPrice', 'final_price', 'grandTotal', 'grand_total', 'totalAmount', 'total_amount']),
  };
}

export function normalizeComparisonPayload(payload) {
  const source = unwrapPayload(payload, ['comparison', 'data', 'result']);
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
  const reasons = first(source, ['reasons', 'vendorReasons', 'vendor_reasons'], []);
  return {
    bestVendor: first(source, ['bestVendor', 'best_vendor', 'recommendedVendor', 'recommended_vendor']),
    summary: first(source, ['summary', 'recommendation', 'reason']),
    reasons: Array.isArray(reasons) ? reasons.map((entry) => ({
      vendorName: first(entry, ['vendorName', 'vendor_name', 'vendor']),
      reason: first(entry, ['reason', 'summary', 'recommendation']),
    })) : [],
  };
}
