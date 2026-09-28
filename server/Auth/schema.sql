CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id uuid PRIMARY KEY,
  user_email text NOT NULL,
  device_info text NOT NULL DEFAULT '',
  ip_address text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_created_idx
  ON public.auth_sessions (user_email, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx
  ON public.auth_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_date_email_idx
  ON public.user_date (lower(mail_data));
