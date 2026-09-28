const path = require('path');
const { createRequire } = require('module');
const { extractQuote } = require('./monitor');

const serverRequire = createRequire(path.resolve(__dirname, '../../server/package.json'));
let bedrockClient;

const numericFields = ['subtotal', 'discountAmount', 'taxAmount', 'shippingAmount', 'otherCharges', 'totalAmount', 'deliveryDays'];

function numberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAnalysis(value = {}, originalText = '') {
  const source = value?.analysis || value?.data || value;
  const currencySource = String(source?.currency || 'INR').trim().toUpperCase();
  const currency = currencySource === '₹' || /^RS\.?$/.test(currencySource) ? 'INR'
    : currencySource === '$' ? 'USD' : currencySource === '€' ? 'EUR' : currencySource.slice(0, 3);
  const normalized = {
    messageType: ['quote', 'question', 'decline', 'acknowledgement', 'other'].includes(source?.messageType)
      ? source.messageType : (source?.isQuote ? 'quote' : 'other'),
    detectedLanguage: String(source?.detectedLanguage || source?.language || 'Unknown').slice(0, 80),
    englishSummary: String(source?.englishSummary || source?.summary || originalText || 'Image received').trim().slice(0, 2000),
    isQuote: Boolean(source?.isQuote || source?.messageType === 'quote'),
    currency,
    paymentTerms: String(source?.paymentTerms || '').trim().slice(0, 500),
    availability: String(source?.availability || '').trim().slice(0, 500),
    confidence: Math.max(0, Math.min(1, Number(source?.confidence) || 0)),
    needsReview: source?.needsReview === undefined ? true : Boolean(source.needsReview),
    conversationStage: String(source?.conversationStage || 'in_progress').trim().slice(0, 80),
    shouldReply: Boolean(source?.shouldReply),
    suggestedReply: String(source?.suggestedReply || '').trim().slice(0, 2000),
    rawText: String(originalText || '').trim(),
    source: 'claude',
  };
  for (const field of numericFields) normalized[field] = numberValue(source?.[field]);
  return normalized;
}

function fallbackAnalysis(text, hasAttachment = false, reason = '') {
  const quote = extractQuote(text);
  return {
    messageType: quote ? 'quote' : 'other',
    detectedLanguage: /\b(?:motham|vilai|rooba|naal|kedaikkum|anuppunga|venum|irukku)\b/i.test(text) ? 'Tanglish' : 'Unknown',
    englishSummary: String(text || '').trim() || (hasAttachment ? 'Attachment received; AI review is pending.' : 'Message received.'),
    isQuote: Boolean(quote),
    currency: quote?.currency || 'INR',
    subtotal: null,
    discountAmount: null,
    taxAmount: null,
    shippingAmount: null,
    otherCharges: null,
    totalAmount: quote?.totalAmount ?? null,
    deliveryDays: quote?.deliveryDays ?? null,
    paymentTerms: quote?.paymentTerms || '',
    availability: '',
    confidence: quote ? 0.45 : 0,
    needsReview: true,
    conversationStage: quote ? 'quote_received' : 'in_progress',
    shouldReply: false,
    suggestedReply: '',
    rawText: String(text || '').trim(),
    source: 'fallback',
    fallbackReason: String(reason || '').slice(0, 500),
  };
}

function imageFormat(mediaType = '') {
  const formats = { 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' };
  return formats[String(mediaType).toLowerCase()] || '';
}

function documentFormat(mediaType = '') {
  return String(mediaType).toLowerCase() === 'application/pdf' ? 'pdf' : '';
}

function isAiConfigured() {
  return Boolean(process.env.AWS_REGION && process.env.BEDROCK_MODEL_ID);
}

async function parseModelJson(text) {
  const { parseJsonResponse } = await import('../QuoteAgent/json.js');
  return parseJsonResponse(text);
}

async function analyzeInbound({ text = '', attachment, image, conversation = [], request = {}, vendorName = '' } = {}) {
  const originalText = String(text || '').trim();
  const media = attachment || image;
  const hasAttachment = Boolean(media?.bytes?.length);
  if (!isAiConfigured()) return fallbackAnalysis(originalText, hasAttachment, 'Bedrock is not configured');

  try {
    const { BedrockRuntimeClient, ConverseCommand } = serverRequire('@aws-sdk/client-bedrock-runtime');
    if (!bedrockClient) bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION });
    const recentConversation = (Array.isArray(conversation) ? conversation : []).slice(-20).map((message) => ({
      direction: message.direction === 'outbound' ? 'our_team' : 'vendor',
      text: String(message.body || '').slice(0, 2000),
      summary: String(message.summary || '').slice(0, 500),
    }));
    const content = [{
      text: `You are a procurement WhatsApp analysis agent for Indian vendor conversations.

Understand English, Tamil, Tanglish (Tamil written with English letters), Hindi, Hinglish, and code-mixed messages. Vendors may include greetings, jokes, delays, negotiations, and unrelated chat. Focus only on facts relevant to the sourcing requirement.

Analyze the LATEST message and attachment using the recent conversation for context. A quotation may be split across multiple messages, but set isQuote=true only when the latest message or attachment adds or revises quotation information. Do not treat acknowledgements or random conversation after an older quote as a new quote.

Request context:
- Vendor: ${vendorName || 'Unknown'}
- Business type: ${request.businessType || 'Unknown'}
- Requirement: ${request.requirements || 'Not supplied'}
- Recent conversation: ${JSON.stringify(recentConversation)}
- Latest message text: ${originalText || '[No caption; inspect the attachment]'}

Return JSON only:
{
  "messageType": "quote|question|decline|acknowledgement|other",
  "detectedLanguage": "Tanglish",
  "englishSummary": "Concise English meaning",
  "isQuote": true,
  "currency": "INR",
  "subtotal": 0,
  "discountAmount": 0,
  "taxAmount": 0,
  "shippingAmount": 0,
  "otherCharges": 0,
  "totalAmount": 0,
  "deliveryDays": 0,
  "paymentTerms": "",
  "availability": "",
  "confidence": 0.0,
  "needsReview": false,
  "conversationStage": "awaiting_quote|negotiating|quote_received|declined|completed|in_progress",
  "shouldReply": true,
  "suggestedReply": "A concise reply draft in the vendor's language"
}

Use null for an unknown numeric value. Amounts must be numbers without symbols or commas. totalAmount is the quotation grand total, not a phone number, quantity, or reference number. Translate the meaning into englishSummary but preserve commercial meaning. Use conversation facts only when they clearly belong to this request and vendor. Set needsReview true for unclear handwriting, ambiguous totals, low confidence, or conflicting content. suggestedReply is a draft only and must never claim an action was completed.`,
    }];
    if (hasAttachment) {
      const format = imageFormat(media.mediaType);
      const pdfFormat = documentFormat(media.mediaType);
      if (format) content.push({ image: { format, source: { bytes: media.bytes } } });
      else if (pdfFormat) content.push({
        document: {
          format: pdfFormat,
          name: `whatsapp-quotation-${String(media.fileName || 'document').replace(/[^a-z0-9-]/gi, '-').slice(0, 40)}`,
          source: { bytes: media.bytes },
        },
      });
      else throw new Error(`Unsupported attachment type: ${media.mediaType || 'unknown'}`);
    }
    const response = await bedrockClient.send(new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID,
      messages: [{ role: 'user', content }],
      inferenceConfig: { maxTokens: 1500, temperature: 0 },
    }));
    const responseText = (response?.output?.message?.content || []).map((item) => item.text || '').join('\n').trim();
    if (!responseText) throw new Error('Claude returned an empty response');
    return normalizeAnalysis(await parseModelJson(responseText), originalText);
  } catch (error) {
    return fallbackAnalysis(originalText, hasAttachment, error.message);
  }
}

module.exports = { analyzeInbound, documentFormat, fallbackAnalysis, imageFormat, isAiConfigured, normalizeAnalysis };
