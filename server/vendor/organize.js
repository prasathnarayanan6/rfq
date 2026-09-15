const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');
const { cleanVendor, duplicateKey } = require('./validation');

const CHUNK_SIZE = 25;
const DEFAULT_CATEGORIES = ['Construction', 'IT & Software', 'Office Supplies', 'Logistics', 'Professional Services'];
const HEADER_ALIASES = {
  name: ['vendor', 'vendorname', 'name', 'company', 'companyname'],
  businessType: ['businesstype', 'category', 'type'],
  contact: ['contact', 'contactperson', 'contactname'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber'],
  email: ['email', 'emailaddress'],
  location: ['location', 'city', 'address'],
};

function headingMap(source) {
  let cells;
  try { cells = JSON.parse(source); } catch (_error) { return null; }
  if (!Array.isArray(cells)) return null;
  const map = {};
  cells.forEach((cell, index) => {
    const heading = String(cell).toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(heading)) map[field] = index;
    }
  });
  return map.name !== undefined ? map : null;
}

function basicDraft(entry, headers, categories) {
  let cells;
  try { cells = JSON.parse(entry.source); } catch (_error) { cells = entry.source.split(/[,\t|;]/); }
  if (!Array.isArray(cells)) cells = Object.values(cells);
  const text = cells.join(' ');
  const email = (text.match(/[^\s,;|]+@[^\s,;|]+\.[^\s,;|]+/) || [])[0] || '';
  const phone = (text.match(/\+?\d[\d\s()\-]{5,}\d/) || [])[0]?.trim() || '';
  const get = (field, fallbackIndex) => String(cells[headers?.[field] ?? fallbackIndex] ?? '').trim();
  let businessType = get('businessType', 1);
  if (businessType === email || businessType === phone || /@/.test(businessType)) businessType = '';
  const existing = categories.find((category) => category.toLowerCase() === businessType.toLowerCase());
  if (existing) businessType = existing;
  const vendor = {
    name: get('name', 0), businessType,
    contact: headers?.contact === undefined ? '' : get('contact', 2),
    phone: headers?.phone === undefined ? phone : get('phone', 3) || phone,
    email: headers?.email === undefined ? email : get('email', 4) || email,
    location: headers?.location === undefined ? '' : get('location', 5),
  };
  const draft = makeDraft({ ...vendor, uncertainType: !businessType }, [entry.source], entry.index);
  draft.warnings.unshift('AI unavailable; basic cleanup only. Check all details');
  return draft;
}

function basicChunk(entries, headers, categories) {
  return entries.map((entry) => basicDraft(entry, headers, categories));
}

function sourceEntries(body) {
  if (Array.isArray(body.rows)) {
    if (body.rows.length > 500) throw new Error('Import up to 500 rows at a time');
    const hasHeaders = body.rows.length && headingMap(JSON.stringify(body.rows[0]));
    return body.rows.map((row, index) => ({
      index,
      source: JSON.stringify(row).slice(0, 2000),
    })).filter((entry) => entry.source !== '{}' && !(hasHeaders && entry.index === 0));
  }
  const text = String(body.text || '').trim();
  if (text.length > 50000) throw new Error('Pasted text is too long');
  return text.split(/\r?\n/).map((line, index) => ({
    index,
    source: line.trim().slice(0, 2000),
  })).filter((entry) => entry.source);
}

function parseModelJson(value) {
  const text = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed.vendors)) throw new Error('Agent returned an invalid vendor list');
  return parsed.vendors;
}

function hasSourceContact(value, sources, kind) {
  if (!value) return true;
  const source = sources.join(' ').toLowerCase();
  if (kind === 'email') return source.includes(value.toLowerCase());
  const digits = value.replace(/\D/g, '');
  return digits && source.replace(/\D/g, '').includes(digits);
}

function makeDraft(item, source, index) {
  const vendor = cleanVendor(item);
  // Source data wins over plausible-looking contact details invented by a model.
  const warnings = [];
  if (!hasSourceContact(vendor.email, source, 'email')) {
    vendor.email = '';
    warnings.push('Agent email was absent from the source; add it manually if correct');
  }
  if (!hasSourceContact(vendor.phone, source, 'phone')) {
    vendor.phone = '';
    warnings.push('Agent phone was absent from the source; add it manually if correct');
  }
  if (item.uncertainType || !vendor.businessType) warnings.push('Check the business type');
  return {
    draftId: `draft-${index}`,
    source: source.join(' | '),
    vendor: { ...vendor, status: 'Pending' },
    warnings,
  };
}

async function organizeChunk(entries, categories, headers) {
  if (!process.env.AWS_REGION || !process.env.BEDROCK_MODEL_ID) {
    return basicChunk(entries, headers, categories);
  }
  try {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
  const prompt = `Organize a messy vendor list into JSON. Return ONLY {"vendors":[{"sourceIndices":[0],"name":"","businessType":"","contact":"","phone":"","email":"","location":"","uncertainType":false}]}.
Entries may be spreadsheet rows or lines of pasted text. Spreadsheet column positions are ${JSON.stringify(headers || {})}. Combine adjacent lines only when they clearly describe the same vendor. Include every vendor you find. Put sourceIndices in each result using the indices supplied below. Do not invent names, contact details, or categories. Leave uncertain fields empty and set uncertainType true when classification needs review. Standardize business types against these existing categories when appropriate; otherwise use a concise new business category: ${JSON.stringify(categories)}.
Source entries: ${JSON.stringify(entries)}`;
  const result = await client.send(new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { temperature: 0, maxTokens: 4000 },
  }));
  const output = (result.output?.message?.content || []).map((part) => part.text || '').join('');
  const items = parseModelJson(output);
  const byIndex = new Map(entries.map((entry) => [entry.index, entry.source]));
  const drafts = [];
  const covered = new Set();
  for (const item of items) {
    const indices = Array.isArray(item.sourceIndices)
      ? item.sourceIndices.filter((index) => byIndex.has(index)) : [];
    if (!indices.length) continue;
    indices.forEach((index) => covered.add(index));
    drafts.push(makeDraft(item, indices.map((index) => byIndex.get(index)), indices[0]));
  }
  // Unrecognized input remains visible for review instead of disappearing.
  for (const entry of entries) {
    if (!covered.has(entry.index)) {
      drafts.push({
        draftId: `draft-${entry.index}`,
        source: entry.source,
        vendor: cleanVendor(),
        warnings: ['Agent could not organize this source row; fill it in or skip it'],
      });
    }
  }
  return drafts;
  } catch (_error) {
    return basicChunk(entries, headers, categories);
  }
}

async function prepareDrafts(body, savedVendors) {
  const entries = sourceEntries(body);
  if (!entries.length) throw new Error('Add at least one vendor row or pasted line');
  const categories = [...new Set([...DEFAULT_CATEGORIES, ...savedVendors.map((vendor) => vendor.businessType).filter(Boolean)])];
  const headers = Array.isArray(body.rows) ? headingMap(JSON.stringify(body.rows[0])) : null;
  const drafts = [];
  for (let start = 0; start < entries.length; start += CHUNK_SIZE) {
    drafts.push(...await organizeChunk(entries.slice(start, start + CHUNK_SIZE), categories, headers));
  }
  const existing = new Set(savedVendors.map(duplicateKey).filter(Boolean));
  const seen = new Set();
  return drafts.map((draft) => {
    const key = duplicateKey(draft.vendor);
    const duplicate = Boolean(key && (existing.has(key) || seen.has(key)));
    if (key) seen.add(key);
    return { ...draft, duplicate };
  });
}

module.exports = { prepareDrafts, sourceEntries, makeDraft, basicDraft, headingMap };
