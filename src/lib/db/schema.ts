export const initialSchemaSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS party_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  title text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  location text NOT NULL DEFAULT '',
  dress_code text NOT NULL DEFAULT '',
  public_info text NOT NULL DEFAULT '',
  confirmed_info text NOT NULL DEFAULT '',
  late_response_policy text NOT NULL DEFAULT 'decline_late'
    CHECK (late_response_policy IN ('accept_late', 'decline_late')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  guest_name_slug text NOT NULL CHECK (length(trim(guest_name_slug)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS guests_guest_name_slug_key
  ON guests (guest_name_slug);

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (is_active OR revoked_at IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_one_active_per_guest
  ON invitations (guest_id)
  WHERE is_active;

CREATE TABLE IF NOT EXISTS rsvps (
  guest_id uuid PRIMARY KEY REFERENCES guests(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('yes', 'no')),
  is_late boolean NOT NULL DEFAULT false,
  note text NOT NULL DEFAULT '',
  responded_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status = 'yes' OR is_late = false)
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_sessions_expires_at_idx
  ON admin_sessions (expires_at);
`;
