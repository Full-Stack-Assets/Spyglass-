/**
 * Migration 009: Exit-Ready PostgreSQL Schema — Part 2
 *
 * Builds on Part 1 (migration 008: organizations, monitors, scans, changes).
 *
 * Creates:
 *   1. briefs — Synthesized intelligence product with cost tracking + reasoning lineage
 *      (Exit signal: CloudZero cost efficiency proof, 7AI explainability, MavenAGI token usage)
 *   2. integration_logs — Audit trail for due diligence (exports, Slack previews, email sends)
 *   3. Performance indexes
 *
 * Also migrates existing daily_briefs data into the new briefs table,
 * linking to organizations via the competitor → org_id chain.
 */
module.exports = {
  name: '009_exit_ready_part2',
  up: async (client) => {

    // ── 1. briefs table ─────────────────────────────────────────
    // org_id: links to organizations table created in migration 008
    // reasoning_path: chain-of-thought / source attribution for 7AI explainability
    // token_usage_total + estimated_cost_usd: CloudZero cost efficiency proof
    // model_version: audit trail for model upgrades and A/B testing
    // user_id: retained for app-layer queries (app still uses user-scoped auth)
    // Extra app columns retained for zero-downtime transition from daily_briefs
    await client.query(`
      CREATE TABLE IF NOT EXISTS briefs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content_md TEXT NOT NULL DEFAULT '',
        reasoning_path JSONB,
        token_usage_total INTEGER,
        model_version TEXT,
        estimated_cost_usd NUMERIC(10, 5),
        html_content TEXT,
        text_content TEXT,
        changes_count INTEGER DEFAULT 0,
        changes_data JSONB,
        sent_at TIMESTAMPTZ,
        legacy_id INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Idempotent migration guard: unique constraint on legacy_id
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_briefs_legacy_id
      ON briefs(legacy_id)
      WHERE legacy_id IS NOT NULL
    `);

    // ── 2. integration_logs table ────────────────────────────────
    // Audit trail for due diligence: Markdown exports, Slack previews, email sends,
    // webhook fires, API calls to MavenAGI/Slack/GitHub/etc.
    // org_id: multi-tenant isolation for enterprise customers
    await client.query(`
      CREATE TABLE IF NOT EXISTS integration_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        target_system TEXT,
        metadata JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ── 3. Performance indexes ───────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_briefs_org ON briefs(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_briefs_user ON briefs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_briefs_created ON briefs(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_integration_logs_org ON integration_logs(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_integration_logs_user ON integration_logs(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_integration_logs_action ON integration_logs(action)`);

    // ── 4. Migrate existing daily_briefs into briefs ─────────────
    // Resolves org_id via the user's competitors → default org chain.
    // Sets reasoning_path = changes_data (source attribution / chain-of-thought).
    // Sets model_version = 'gpt-4o-mini' (the model used for all analyses to date).
    await client.query(`
      INSERT INTO briefs (
        id,
        org_id,
        user_id,
        title,
        content_md,
        reasoning_path,
        token_usage_total,
        model_version,
        estimated_cost_usd,
        html_content,
        text_content,
        changes_count,
        changes_data,
        sent_at,
        legacy_id,
        created_at
      )
      SELECT
        gen_random_uuid(),
        (
          -- Resolve org_id from user's first competitor (all linked to default org via migration 008)
          SELECT c.org_id FROM competitors c
          WHERE c.user_id = db.user_id AND c.org_id IS NOT NULL
          LIMIT 1
        ),
        db.user_id,
        COALESCE(db.subject, 'Intelligence Brief'),
        COALESCE(db.text_content, ''),
        db.changes_data,
        NULL,
        'gpt-4o-mini',
        NULL,
        db.html_content,
        db.text_content,
        COALESCE(db.changes_count, 0),
        db.changes_data,
        db.sent_at,
        db.id,
        db.created_at
      FROM daily_briefs db
      ON CONFLICT (legacy_id) WHERE legacy_id IS NOT NULL DO NOTHING
    `);

    console.log('[Migration 009] briefs + integration_logs tables created, existing data migrated');
  }
};
