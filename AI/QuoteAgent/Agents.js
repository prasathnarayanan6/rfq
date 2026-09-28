import dotenv from 'dotenv';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';
import { Annotation, StateGraph, START, END } from '@langchain/langgraph';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { parseJsonResponse } from './json.js';
import {
  comparisonNarrativeSchema,
  normalizeComparisonPayload,
  normalizeQuotationPayload,
  quotationSchema,
} from './schemas.js';
import { buildOrderedComparison } from './comparison.js';

dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)), quiet: true });

const supportedFormats = new Set(['pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'html', 'md']);
let bedrockClient;

function configuration() {
  const region = process.env.AWS_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!region) throw new Error('AWS_REGION is missing');
  if (!modelId) throw new Error('BEDROCK_MODEL_ID is missing');
  return { region, modelId };
}

function bedrock() {
  if (!bedrockClient) bedrockClient = new BedrockRuntimeClient({ region: configuration().region });
  return bedrockClient;
}

export function getResponseText(response) {
  return (response?.output?.message?.content || [])
    .filter((item) => typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function documentFormat(filePath) {
  const extension = path.extname(filePath).toLowerCase().slice(1);
  if (!supportedFormats.has(extension)) throw new Error(`Unsupported document type: ${extension || 'unknown'}`);
  return extension;
}

async function invokeClaude(content, inferenceConfig) {
  const response = await bedrock().send(new ConverseCommand({
    modelId: configuration().modelId,
    messages: [{ role: 'user', content }],
    inferenceConfig,
  }));
  const text = getResponseText(response);
  if (!text) throw new Error('Claude returned an empty response');
  return text;
}

async function extractQuotation(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Quotation file not found: ${filePath}`);
  const format = documentFormat(filePath);
  const responseText = await invokeClaude([
    {
      text: `Extract this vendor quotation as JSON only.

Required schema:
{
  "vendorName": "Vendor Name",
  "currency": "INR",
  "subtotal": 1000,
  "discountAmount": 0,
  "taxAmount": 180,
  "shippingAmount": 0,
  "otherCharges": 0,
  "finalPrice": 1180
}

Use a three-letter ISO currency code. Monetary fields must be numbers without symbols or separators. Use 0 for absent discounts, tax, shipping, and other charges. finalPrice must be the document's grand total. Do not include markdown or commentary.`,
    },
    {
      document: {
        format,
        name: `quotation-${path.basename(filePath, path.extname(filePath)).replace(/[^a-z0-9-]/gi, '-').slice(0, 40) || 'document'}`,
        source: { bytes: fs.readFileSync(filePath) },
      },
    },
  ], { maxTokens: 1200, temperature: 0 });

  try {
    const parsed = normalizeQuotationPayload(parseJsonResponse(responseText));
    return { sourceFile: filePath, ...quotationSchema.parse(parsed) };
  } catch (error) {
    throw new Error(`Unable to parse quotation ${path.basename(filePath)}: ${error.message}`, { cause: error });
  }
}

const AgentState = Annotation.Root({
  filePaths: Annotation(),
  extractedData: Annotation(),
  validationErrors: Annotation(),
  finalComparison: Annotation(),
});

async function extractNode(state) {
  const extractedData = [];
  for (const filePath of state.filePaths) extractedData.push(await extractQuotation(filePath));
  return { extractedData };
}

async function validateNode(state) {
  const validationErrors = state.extractedData.flatMap((quote) => {
    const expected = Number(quote.subtotal) - Number(quote.discountAmount || 0)
      + Number(quote.taxAmount || 0) + Number(quote.shippingAmount || 0) + Number(quote.otherCharges || 0);
    return Math.abs(expected - Number(quote.finalPrice)) <= 0.01 ? [] : [{
      vendor: quote.vendorName,
      sourceFile: quote.sourceFile,
      expected,
      extracted: Number(quote.finalPrice),
      reason: 'The extracted components do not add up to the document grand total. The document total was preserved for review.',
    }];
  });
  return { validationErrors };
}

async function reconcileNode(state) {
  const errors = new Map(state.validationErrors.map((error) => [`${error.sourceFile}\u0000${error.vendor}`, error]));
  return {
    extractedData: state.extractedData.map((quote) => {
      const error = errors.get(`${quote.sourceFile}\u0000${quote.vendorName}`);
      return error ? {
        ...quote,
        calculationWarning: error.reason,
        calculatedComponentTotal: Number(error.expected.toFixed(2)),
      } : quote;
    }),
    validationErrors: [],
  };
}

async function compareNode(state) {
  const orderedQuotes = [...state.extractedData].sort((left, right) => Number(left.finalPrice) - Number(right.finalPrice));
  let narrative = {};
  try {
    const responseText = await invokeClaude([{
      text: `Compare the validated quotations below. Return JSON only and do not repeat monetary calculations.

${JSON.stringify(orderedQuotes, null, 2)}

Required schema:
{
  "bestVendor": "Vendor Name",
  "summary": "Short recommendation",
  "reasons": [{ "vendorName": "Vendor Name", "reason": "Short factual reason" }]
}

Do not invent facts. If the lowest prices are tied, say so in the summary.`,
    }], { maxTokens: 1000, temperature: 0 });
    narrative = comparisonNarrativeSchema.parse(normalizeComparisonPayload(parseJsonResponse(responseText)));
  } catch (error) {
    console.warn(`Comparison narrative fallback used: ${error.message}`);
  }
  return { finalComparison: buildOrderedComparison(orderedQuotes, narrative) };
}

function shouldContinue(state) {
  return state.validationErrors?.length ? 'reconcile' : 'compare';
}

export const workflow = new StateGraph(AgentState)
  .addNode('extract', extractNode)
  .addNode('validate', validateNode)
  .addNode('reconcile', reconcileNode)
  .addNode('compare', compareNode)
  .addEdge(START, 'extract')
  .addEdge('extract', 'validate')
  .addConditionalEdges('validate', shouldContinue, { reconcile: 'reconcile', compare: 'compare' })
  .addEdge('reconcile', 'compare')
  .addEdge('compare', END)
  .compile();

export async function runQuoteAgent(filePaths) {
  const normalizedPaths = [...new Set((Array.isArray(filePaths) ? filePaths : [])
    .map((filePath) => String(filePath).trim()).filter(Boolean).map((filePath) => path.resolve(filePath)))];
  if (!normalizedPaths.length) throw new Error('Provide at least one quotation file');
  if (normalizedPaths.length > 25) throw new Error('A maximum of 25 quotations can be compared at once');
  const result = await workflow.invoke({
    filePaths: normalizedPaths,
    extractedData: [],
    validationErrors: [],
    finalComparison: null,
  });
  return {
    comparison: result.finalComparison,
    quotations: [...result.extractedData].sort((left, right) => Number(left.finalPrice) - Number(right.finalPrice)),
  };
}

async function runCli() {
  try {
    const result = await runQuoteAgent(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`Quote agent failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await runCli();
