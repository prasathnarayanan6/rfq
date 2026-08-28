import "dotenv/config";

import {
  Annotation,
  StateGraph,
  START,
  END,
} from "@langchain/langgraph";

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

import { z } from "zod";
import fs from "fs";
import path from "path";

// ==========================================================
// 1. ENVIRONMENT CONFIGURATION
// ==========================================================

const AWS_REGION = process.env.AWS_REGION;

const BEDROCK_MODEL_ID =
  process.env.BEDROCK_MODEL_ID;

const BEDROCK_API_KEY =
  process.env.AWS_BEARER_TOKEN_BEDROCK;

// Validate environment variables
if (!AWS_REGION) {
  throw new Error(
    "❌ AWS_REGION is missing in .env"
  );
}

if (!BEDROCK_MODEL_ID) {
  throw new Error(
    "❌ BEDROCK_MODEL_ID is missing in .env"
  );
}

if (!BEDROCK_API_KEY) {
  throw new Error(
    "❌ AWS_BEARER_TOKEN_BEDROCK is missing in .env"
  );
}

console.log("AWS Region:", AWS_REGION);
console.log("Bedrock Model:", BEDROCK_MODEL_ID);

// ==========================================================
// 2. BEDROCK CLIENT
// ==========================================================

// AWS SDK automatically reads:
//
// AWS_BEARER_TOKEN_BEDROCK
//
// from process.env.

const bedrock = new BedrockRuntimeClient({
  region: AWS_REGION,
});

// ==========================================================
// 3. QUOTATION SCHEMA
// ==========================================================

const quotationSchema = z.object({
  vendorName: z.string(),

  subtotal: z.number(),

  taxAmount: z.number(),

  finalPrice: z.number(),
});

// ==========================================================
// 4. LANGGRAPH STATE
// ==========================================================

const AgentState = Annotation.Root({
  filePaths: Annotation(),

  extractedData: Annotation(),

  validationErrors: Annotation(),

  finalComparison: Annotation(),
});

// ==========================================================
// 5. HELPER - GET TEXT FROM BEDROCK RESPONSE
// ==========================================================

function getResponseText(response) {
  const content =
    response?.output?.message?.content || [];

  return content
    .filter((item) => item.text)
    .map((item) => item.text)
    .join("\n");
}

// ==========================================================
// 6. HELPER - PARSE JSON
// ==========================================================

function parseJsonResponse(text) {
  let cleaned = text.trim();

  // Remove Markdown code fences if Claude returns them
  cleaned = cleaned.replace(
    /^```json\s*/i,
    ""
  );

  cleaned = cleaned.replace(
    /^```\s*/,
    ""
  );

  cleaned = cleaned.replace(
    /\s*```$/,
    ""
  );

  cleaned = cleaned.trim();

  return JSON.parse(cleaned);
}

// ==========================================================
// 7. HELPER - GET DOCUMENT FORMAT
// ==========================================================

function getDocumentFormat(filePath) {
  const extension = path
    .extname(filePath)
    .toLowerCase()
    .replace(".", "");

  const supportedFormats = [
    "pdf",
    "txt",
    "csv",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "html",
    "md",
  ];

  if (
    !supportedFormats.includes(extension)
  ) {
    throw new Error(
      `Unsupported document type: ${extension}`
    );
  }

  return extension;
}

// ==========================================================
// 8. EXTRACT NODE
// ==========================================================

async function extractNode(state) {
  console.log(
    "\n===================================="
  );

  console.log(
    "Extractor Node: Processing quotation documents"
  );

  console.log(
    "===================================="
  );

  const extractedResults = [];

  for (const filePath of state.filePaths) {
    console.log(
      `\nReading quotation: ${filePath}`
    );

    // ------------------------------------------------------
    // Validate file
    // ------------------------------------------------------

    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Quotation file not found: ${filePath}`
      );
    }

    // ------------------------------------------------------
    // Detect file type
    // ------------------------------------------------------

    const format =
      getDocumentFormat(filePath);

    console.log(
      `Detected format: ${format}`
    );

    // ------------------------------------------------------
    // Read file as binary
    // ------------------------------------------------------

    const fileBuffer =
      fs.readFileSync(filePath);

    // ------------------------------------------------------
    // Send document directly to Claude
    // ------------------------------------------------------

    const command =
      new ConverseCommand({
        modelId:
          BEDROCK_MODEL_ID,

        messages: [
          {
            role: "user",

            content: [
              {
                text: `
You are an AI system that extracts structured data from vendor quotations.

Carefully inspect the attached quotation.

Extract the following information:

- vendorName
- subtotal
- taxAmount
- finalPrice

Return ONLY valid JSON.

Required format:

{
  "vendorName": "Vendor Name",
  "subtotal": 1000,
  "taxAmount": 180,
  "finalPrice": 1180
}

Important rules:

1. Do not return markdown.
2. Do not return explanations.
3. Do not use triple backticks.
4. Values for subtotal, taxAmount and finalPrice must be numbers.
5. Remove currency symbols and commas from numbers.
6. finalPrice must represent the grand total shown on the quotation.
7. If tax is not present, return taxAmount as 0.
`,
              },

              {
                document: {
                  format,

                  // Keep document name simple.
                  name: "vendor quotation",

                  source: {
                    bytes:
                      fileBuffer,
                  },
                },
              },
            ],
          },
        ],

        inferenceConfig: {
          maxTokens: 1000,

          temperature: 0,
        },
      });

    // ------------------------------------------------------
    // Call Claude
    // ------------------------------------------------------

    const response =
      await bedrock.send(command);

    const responseText =
      getResponseText(response);

    console.log(
      "\nClaude response:"
    );

    console.log(responseText);

    // ------------------------------------------------------
    // Convert response to JSON
    // ------------------------------------------------------

    let parsedQuote;

    try {
      parsedQuote =
        parseJsonResponse(
          responseText
        );
    } catch (error) {
      console.error(
        "\n❌ Claude returned invalid JSON:"
      );

      console.error(responseText);

      throw new Error(
        `Unable to parse quotation: ${filePath}`
      );
    }

    // ------------------------------------------------------
    // Validate returned structure
    // ------------------------------------------------------

    const validatedQuote =
      quotationSchema.parse(
        parsedQuote
      );

    // Keep track of source file
    extractedResults.push({
      sourceFile: filePath,

      ...validatedQuote,
    });

    console.log(
      "\n✓ Extracted successfully:"
    );

    console.log(
      validatedQuote
    );
  }

  console.log(
    "\n===================================="
  );

  console.log(
    "All extracted quotation data"
  );

  console.log(
    "===================================="
  );

  console.log(
    JSON.stringify(
      extractedResults,
      null,
      2
    )
  );

  return {
    extractedData:
      extractedResults,
  };
}

// ==========================================================
// 9. VALIDATION NODE
// ==========================================================

async function validateNode(state) {
  console.log(
    "\n===================================="
  );

  console.log(
    "Validator Node: Checking quotation calculations"
  );

  console.log(
    "===================================="
  );

  const errors = [];

  for (
    const quote of state.extractedData
  ) {
    const subtotal =
      Number(quote.subtotal);

    const taxAmount =
      Number(
        quote.taxAmount || 0
      );

    const finalPrice =
      Number(
        quote.finalPrice
      );

    const expectedTotal =
      subtotal + taxAmount;

    const difference =
      Math.abs(
        expectedTotal -
          finalPrice
      );

    console.log(
      `\nVendor: ${quote.vendorName}`
    );

    console.log(
      `Subtotal: ${subtotal}`
    );

    console.log(
      `Tax: ${taxAmount}`
    );

    console.log(
      `Expected total: ${expectedTotal}`
    );

    console.log(
      `Extracted final total: ${finalPrice}`
    );

    if (difference > 0.01) {
      console.log(
        "⚠️ Calculation mismatch detected"
      );

      errors.push({
        vendor:
          quote.vendorName,

        sourceFile:
          quote.sourceFile,

        subtotal,

        taxAmount,

        expected:
          expectedTotal,

        extracted:
          finalPrice,

        reason:
          "Subtotal + tax does not match the extracted final price.",
      });
    } else {
      console.log(
        "✓ Calculation valid"
      );
    }
  }

  return {
    validationErrors: errors,
  };
}

// ==========================================================
// 10. RECONCILE NODE
// ==========================================================

async function reconcileNode(state) {
  console.log(
    "\n===================================="
  );

  console.log(
    "Reconciler Node: Resolving calculation discrepancies"
  );

  console.log(
    "===================================="
  );

  const correctedData =
    state.extractedData.map(
      (quote) => {
        const error =
          state.validationErrors.find(
            (item) =>
              item.vendor ===
                quote.vendorName &&
              item.sourceFile ===
                quote.sourceFile
          );

        // No error
        if (!error) {
          return quote;
        }

        console.log(
          `\nReconciling: ${quote.vendorName}`
        );

        console.log(
          `Document final price: ${quote.finalPrice}`
        );

        console.log(
          `Calculated total: ${error.expected}`
        );

        /*
         * IMPORTANT:
         *
         * For this demo we assume:
         *
         * subtotal + tax = final total
         *
         * In a production RFQ application you should
         * also extract:
         *
         * discount
         * shipping
         * handling charges
         * cess
         * additional taxes
         *
         * before changing finalPrice.
         */

        return {
          ...quote,

          originalFinalPrice:
            quote.finalPrice,

          finalPrice:
            error.expected,

          reconciled: true,
        };
      }
    );

  return {
    extractedData:
      correctedData,

    validationErrors: [],
  };
}

// ==========================================================
// 11. COMPARE NODE
// ==========================================================

async function compareNode(state) {
  console.log(
    "\n===================================="
  );

  console.log(
    "Comparison Node: Comparing quotations"
  );

  console.log(
    "===================================="
  );

  const quotationData =
    JSON.stringify(
      state.extractedData,
      null,
      2
    );

  const command =
    new ConverseCommand({
      modelId:
        BEDROCK_MODEL_ID,

      messages: [
        {
          role: "user",

          content: [
            {
              text: `
You are an RFQ quotation comparison assistant.

Compare the following vendor quotations:

${quotationData}

Evaluate them primarily based on cost effectiveness.

Return a concise comparison containing:

1. Best vendor
2. Final price
3. Price difference compared with the other vendors
4. Short reason for recommendation

Do not invent information.

If multiple vendors have the same price, mention that clearly.
`,
            },
          ],
        },
      ],

      inferenceConfig: {
        maxTokens: 800,

        temperature: 0.1,
      },
    });

  const response =
    await bedrock.send(command);

  const comparison =
    getResponseText(response);

  return {
    finalComparison:
      comparison,
  };
}

// ==========================================================
// 12. CONDITIONAL ROUTING
// ==========================================================

function shouldContinue(state) {
  if (
    state.validationErrors &&
    state.validationErrors.length >
      0
  ) {
    console.log(
      "\n⚠️ Errors found → moving to reconcile node"
    );

    return "reconcile";
  }

  console.log(
    "\n✓ No validation errors → moving to comparison"
  );

  return "compare";
}

// ==========================================================
// 13. CREATE LANGGRAPH
// ==========================================================

const workflow =
  new StateGraph(AgentState)

    // Nodes
    .addNode(
      "extract",
      extractNode
    )

    .addNode(
      "validate",
      validateNode
    )

    .addNode(
      "reconcile",
      reconcileNode
    )

    .addNode(
      "compare",
      compareNode
    )

    // START → Extract
    .addEdge(
      START,
      "extract"
    )

    // Extract → Validate
    .addEdge(
      "extract",
      "validate"
    )

    // Validate → Reconcile OR Compare
    .addConditionalEdges(
      "validate",

      shouldContinue,

      {
        reconcile:
          "reconcile",

        compare:
          "compare",
      }
    )

    // Reconcile → Validate again
    .addEdge(
      "reconcile",
      "validate"
    )

    // Compare → END
    .addEdge(
      "compare",
      END
    );

// ==========================================================
// 14. COMPILE GRAPH
// ==========================================================

const app =
  workflow.compile();

// ==========================================================
// 15. RUN AGENT
// ==========================================================

async function runAgent() {
  try {
    console.log(
      "\n===================================="
    );

    console.log(
      "Starting RFQ Comparison Agent"
    );

    console.log(
      "===================================="
    );

    const result =
      await app.invoke({
        filePaths: [
          "C:\\Users\\igrs\\Downloads\\Quotation_VendorB_HeatTech.pdf",

          "C:\\Users\\igrs\\Downloads\\Quotation_VendorA_Thermocraft.pdf",
        ],

        extractedData: [],

        validationErrors: [],

        finalComparison: "",
      });

    console.log(
      "\n===================================="
    );

    console.log(
      "        AGENT FINAL ANALYSIS"
    );

    console.log(
      "====================================\n"
    );

    console.log(
      result.finalComparison
    );

    console.log(
      "\n===================================="
    );

    console.log(
      "Final structured quotation data"
    );

    console.log(
      "====================================\n"
    );

    console.log(
      JSON.stringify(
        result.extractedData,
        null,
        2
      )
    );
  } catch (error) {
    console.error(
      "\n❌ RFQ Agent failed"
    );

    console.error(
      "Message:",
      error.message
    );

    console.error(
      "\nFull error:"
    );

    console.error(error);
  }
}

// ==========================================================
// 16. START
// ==========================================================

await runAgent();