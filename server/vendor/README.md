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

The organizer uses `AWS_REGION`, `BEDROCK_MODEL_ID`, and the AWS credentials
used by the quote agent. Local development also loads `AI/QuoteAgent/.env` if
those settings are absent from `server/.env`. If Bedrock is unavailable, drafts
use basic parsing and show an explicit warning in the review screen.
