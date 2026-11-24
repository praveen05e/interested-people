-- ============================================================
-- Migration: Create product interest registrations table
-- Run this in your Supabase SQL editor
-- ============================================================

-- Create the registrations table
CREATE TABLE IF NOT EXISTS public.product_interest_registrations (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL,
  full_name        TEXT          NOT NULL,
  email            TEXT          NOT NULL,
  registered_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  sheet_sync_status TEXT          NOT NULL DEFAULT 'pending',
  sheet_row_number INTEGER
);

-- ── Constraints ──────────────────────────────────────────────

-- Prevent duplicate registrations by the same Google user
ALTER TABLE public.product_interest_registrations
  ADD CONSTRAINT uq_registrations_user_id  UNIQUE (user_id);

-- Prevent duplicate registrations by the same email (belt + suspenders)
ALTER TABLE public.product_interest_registrations
  ADD CONSTRAINT uq_registrations_email    UNIQUE (email);

-- Ensure email is never empty
ALTER TABLE public.product_interest_registrations
  ADD CONSTRAINT chk_email_not_empty CHECK (email <> '');

-- Ensure full_name is never empty
ALTER TABLE public.product_interest_registrations
  ADD CONSTRAINT chk_full_name_not_empty CHECK (full_name <> '');

-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.product_interest_registrations ENABLE ROW LEVEL SECURITY;

-- No public read access
-- No public insert (all inserts happen via Edge Function with service role)
-- No public update or delete

-- Allow service role full access (used by Edge Function only)
CREATE POLICY "service_role_all_access"
  ON public.product_interest_registrations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Revoke all direct access from authenticated and anon roles
-- (The Edge Function bypasses RLS using the service role key)
REVOKE ALL ON public.product_interest_registrations FROM anon;
REVOKE ALL ON public.product_interest_registrations FROM authenticated;

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registrations_email
  ON public.product_interest_registrations (email);

CREATE INDEX IF NOT EXISTS idx_registrations_registered_at
  ON public.product_interest_registrations (registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_registrations_sync_status
  ON public.product_interest_registrations (sheet_sync_status)
  WHERE sheet_sync_status IN ('pending', 'sync_failed');

-- ── Comment ───────────────────────────────────────────────────
COMMENT ON TABLE public.product_interest_registrations IS
  'Stores product interest registrations. Managed exclusively by the register-interest Edge Function.';
