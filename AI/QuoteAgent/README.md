# Quote comparison agent

The agent extracts quotation documents with Claude through Amazon Bedrock and returns a stable, API-ready JSON response. It no longer relies on hard-coded file paths or prose comparison output.

```js
import { runQuoteAgent } from './Agents.js';

const result = await runQuoteAgent(['/absolute/path/vendor-a.pdf', '/absolute/path/vendor-b.pdf']);
```

`result.quotations` and `result.comparison.rankings` are ordered by validated final price. JSON parsing accepts direct JSON, fenced JSON, and JSON surrounded by model commentary. Common snake_case aliases and formatted monetary strings are normalized before Zod validation.

The returned object has a consistent top-level order:

```json
{
  "comparison": {
    "bestVendor": "Vendor A",
    "bestFinalPrice": 118000,
    "currency": "INR",
    "isTie": false,
    "tiedVendors": ["Vendor A"],
    "summary": "Vendor A has the lowest validated final price.",
    "rankings": []
  },
  "quotations": []
}
```

If extracted components do not add up, the document grand total is preserved and the ranking row receives `calculationStatus: "Review"` plus a `calculationWarning`.

From the command line:

```text
npm start -- C:\quotes\vendor-a.pdf C:\quotes\vendor-b.pdf
```
