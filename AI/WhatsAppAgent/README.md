# WhatsApp outreach agent

This folder owns WhatsApp-specific message formatting and inbound quote monitoring.

- `index.js` builds outbound quotation requests and reports whether provider credentials exist.
- `monitor.js` normalizes inbound messages and extracts a structured quote draft.

Until `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are configured, outbound messages remain safely stored with `Awaiting Provider` status. A future provider adapter can deliver queued messages and feed verified webhook payloads into the same monitoring pipeline.
