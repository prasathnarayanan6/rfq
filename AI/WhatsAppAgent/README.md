# WhatsApp outreach agent

This folder owns WhatsApp-specific message formatting and multimodal inbound analysis.

- `index.js` builds outbound quotation requests and reports whether provider credentials exist.
- `agent.js` uses Claude through Amazon Bedrock to understand English, Tamil, Tanglish, Hindi, Hinglish, code-mixed replies, quotation images, and PDFs.
- `monitor.js` provides deterministic text parsing when Bedrock is unavailable.

The AI analysis uses `AWS_REGION` and `BEDROCK_MODEL_ID`; the server already loads these from `AI/QuoteAgent/.env`. The agent returns message intent, English meaning, quote totals, adjustments, delivery, payment terms, availability, confidence, and review status.

The agent reads up to 20 recent messages for the same request and vendor, so it can distinguish unrelated chatter from quotation facts split across multiple messages. It may produce a reply draft, but never sends that draft automatically.

Authenticated integrations can submit text to the inbound endpoint or an image/PDF to the multipart `inbound-media` endpoint. Attachment bytes are analyzed but are not stored in the database; only safe metadata and the structured result are retained.

Until `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are configured, outbound messages remain safely stored with `Awaiting Provider` status. A future verified provider adapter can fetch Meta media bytes and feed them into this same agent.
