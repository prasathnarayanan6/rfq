CREATE TABLE IF NOT EXISTS vendors (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id text NOT NULL,
  name text NOT NULL,
  business_type text NOT NULL,
  contact text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vendors_contact_required CHECK (phone <> '' OR email <> '')
);

CREATE INDEX IF NOT EXISTS vendors_owner_created_idx ON vendors (owner_id, created_at DESC);

-- Browser Supabase clients have no direct access; the signed server API owns reads and writes.
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
