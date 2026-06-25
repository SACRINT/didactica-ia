-- ═══════════════════════════════════════════════════════════════════
--  DidácticaIA — Database Schema
--  Neon PostgreSQL · DBEPA Puebla 2026-2027
--  Run this script once in your Neon SQL editor to initialize the DB.
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Teachers ────────────────────────────────────────────────────────
-- One row per Google account (upserted on every login)
CREATE TABLE IF NOT EXISTS teachers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  school_name   TEXT,
  municipality  TEXT,
  subsystem     TEXT,   -- 'bge' | 'digital' | 'emsad'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Plannings ───────────────────────────────────────────────────────
-- Strictly private per teacher_id (enforced at API + RLS levels)
CREATE TABLE IF NOT EXISTS plannings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  uac_name        TEXT NOT NULL,
  semester        INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 6),
  component       TEXT NOT NULL,     -- 'laboral' | 'fundamental' | 'ampliado'
  curriculum_name TEXT,
  paec_context    TEXT,
  extracted_data  JSONB,             -- ExtractedPdfData
  content_json    JSONB,             -- GeneratedPlanningContent (7 sections)
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'generated', 'downloaded')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast teacher queries
CREATE INDEX IF NOT EXISTS idx_plannings_teacher_id
  ON plannings (teacher_id, created_at DESC);

-- ─── Uploaded PDFs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_pdfs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  planning_id   UUID REFERENCES plannings(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  blob_url      TEXT NOT NULL,
  parsed_ok     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row Level Security (defense-in-depth) ───────────────────────────
-- The API already validates teacher_id on every query.
-- RLS adds a second layer at the database level.

ALTER TABLE plannings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plannings_isolation ON plannings;
CREATE POLICY plannings_isolation ON plannings
  USING (
    teacher_id = (
      SELECT id FROM teachers WHERE email = current_setting('app.current_user_email', true)
      LIMIT 1
    )
  );

ALTER TABLE uploaded_pdfs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pdfs_isolation ON uploaded_pdfs;
CREATE POLICY pdfs_isolation ON uploaded_pdfs
  USING (
    teacher_id = (
      SELECT id FROM teachers WHERE email = current_setting('app.current_user_email', true)
      LIMIT 1
    )
  );

-- ─── Auto-update updated_at ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plannings_updated_at ON plannings;
CREATE TRIGGER plannings_updated_at
  BEFORE UPDATE ON plannings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════════════
--  DONE. Tables created:
--    · teachers       — one row per Google account
--    · plannings      — planeaciones, private by teacher_id
--    · uploaded_pdfs  — PDF blob references
-- ════════════════════════════════════════════════════════════════════
