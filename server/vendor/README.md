# Vendor catalog API

The vendor page calls `http://localhost:4007/api/v1/vendors` by default. Set
`REACT_APP_VENDOR_API_URL` in the client if the vendor service is hosted elsewhere.
The existing login service on port 4004 continues to issue `user_token`.

The server requires `DATABASE_CONNECTION` for the Supabase Postgres database and
`ACCESS_TOKEN_SECRET` matching the existing login service's HS256 signing secret.
It verifies the token signature and uses its `people_id` (or `sub`) claim as the
catalog owner. If the login service signs with another algorithm, update the
verifier before enabling vendor requests; never use the browser's `people_id`
value as authorization. Set `CLIENT_ORIGIN` if the frontend is not on port 3000.

Run `npm run vendors:check` to inspect the database table and
`npm run vendors:migrate` to apply `schema.sql`. The table is per-user through
the server API. Uploaded lists are prepared in memory and saved only after the
user reviews and confirms selected rows.

Each initiated vendor call creates a `vendor_call_requests` record. The dashboard
uses that request ID to queue WhatsApp or email outreach, and stores every job in
`vendor_outreach_messages`. Verified inbound provider adapters can post replies to
`/api/v1/vendors/outreach/:requestId/inbound`; quote-like replies are normalized
into `vendor_quotes` for the dashboard comparison table.

For quotation screenshots or photos, submit a multipart request to
`/api/v1/vendors/outreach/:requestId/inbound-media` with the file in the `attachment`
field plus `vendorId`, optional caption `body`, and optional `providerMessageId`.
JPG, PNG, GIF, WebP, and PDF attachments up to 6 MB are accepted. Claude analyzes the
attachment, recent conversation, and any Tanglish/code-mixed caption together; raw bytes are not
persisted after analysis.

`GET /api/v1/vendors/outreach/:requestId/conversation?vendorId=...` returns the
stored thread and agent metadata for review. One current quote is maintained per
request, vendor, and channel; a revised quote updates the comparison row while
the original messages remain in the conversation history.

WhatsApp delivery becomes provider-ready when `WHATSAPP_ACCESS_TOKEN` and
`WHATSAPP_PHONE_NUMBER_ID` are set. Email delivery becomes provider-ready when
`SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD` are set. Until then, outbound jobs
remain persisted with `Awaiting Provider` status and no external message is sent.

The organizer uses `AWS_REGION`, `BEDROCK_MODEL_ID`, and the AWS credentials
used by the quote agent. Local development also loads `AI/QuoteAgent/.env` if
those settings are absent from `server/.env`. If Bedrock is unavailable, drafts
use basic parsing and show an explicit warning in the review screen.
