-- ═══════════════════════════════════════════════════════════════════
--  Stripe Subscriptions Schema
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id          UUID NOT NULL UNIQUE REFERENCES teachers(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan_tier           TEXT NOT NULL DEFAULT 'free', -- 'free' | 'basico' | 'estandar' | 'avanzado' | 'completo'
  status              TEXT NOT NULL DEFAULT 'inactive', -- 'active' | 'past_due' | 'canceled' | 'inactive'
  current_period_end  TIMESTAMPTZ,
  materia_limit       INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
