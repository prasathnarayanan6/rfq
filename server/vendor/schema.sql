CREATE TABLE IF NOT EXISTS vendors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL,
  business_type text NOT NULL,
  contact text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendors_contact_required CHECK (phone <> '' OR whatsapp <> '' OR email <> '')
);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '';
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_contact_required;
ALTER TABLE vendors ADD CONSTRAINT vendors_contact_required
  CHECK (phone <> '' OR whatsapp <> '' OR email <> '');

CREATE INDEX IF NOT EXISTS vendors_owner_created_idx ON vendors (owner_id, created_at DESC);

-- Browser Supabase clients have no direct access; the signed server API owns reads and writes.
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS vendor_call_requests (
  id uuid PRIMARY KEY,
  owner_id text NOT NULL,
  business_type text NOT NULL,
  conversation_brief text NOT NULL,
  vendors jsonb NOT NULL,
  status text NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'In Progress', 'Completed', 'Failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vendor_call_requests_owner_created_idx
  ON vendor_call_requests (owner_id, created_at DESC);

ALTER TABLE vendor_call_requests ENABLE ROW LEVEL SECURITY;
