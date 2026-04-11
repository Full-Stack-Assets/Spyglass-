/**
 * Migration 010: Headless API Infrastructure
 *
 * Adds infrastructure for the Spyglass Headless API (Task 2: Heartbeat layer):
 *
 *   1. api_keys — API key authentication for /api/v1/scans/trigger
 *   2. scans table extensions:
 *      - url (for stateless/headless scans not tied to monitored_urls)
 *      - org_id (multi-tenant isolation)
 *      - user_id (optional link to user account)
 *      - webhook_url (for async delivery)
 *      - depth ('quick' | 'deep')
 *      - synthesis_json (stored LLM output)
 *      - ttl_purge_at (24h TTL for stateless scans)
 *      - source_urls (all URLs crawled during deep scan)
 *      - changes_detected_count
 *      - created_at / completed_at
 *
 *   3. Semantic cache index: url + dom_hash for O(1) cache lookups
 *   4. Status index for worker polling
 *   5. TTL index for purge worker
 *
 * Depends on: migrations 008 (organizations, scans), 009 (integration_logs)
 */
module.exports = {
  name: '010_headless_api_infra',
  up: async (client) => {

    // ── 1. api_keys table ──────────────────────────────────────────
    // API key authentication for the headless /api/v1/scans/* endpoints.
    // Each org gets one or more API keys. Keys are stored in plaintext for
    // fast lookup (MVP). In production, store hash and salt.
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        key TEXT UNIQUE NOT NULL,
        name TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)`);

    // ── 2. Extend scans table for headless API ─────────────────────
    // These columns are NULL for legacy monitor-driven scans (backward compat).

    // url: the page being scanned (for stateless headless scans)
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS url TEXT`);

    // org_id: multi-tenant isolation (nullable for legacy rows)
    await client.query(`
      ALTER TABLE scans ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL
    `);

    // user_id: optional user link (for API keys tied to users)
    await client.query(`
      ALTER TABLE scans ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `);

    // webhook_url: where to POST the synthesis when complete (stateless mode)
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS webhook_url TEXT`);

    // depth: 'quick' (single page) or 'deep' (recursive crawl, max 3 levels)
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS depth TEXT DEFAULT 'quick'`);

    // synthesis_json: stored LLM output (headline, summary, key_findings, reasoning_path, cost)
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS synthesis_json JSONB`);

    // ttl_purge_at: 24h TTL for stateless scans (webhook mode)
    // After this timestamp, raw content (dom_hash, source_urls) is purged.
    // The synthesis_json and integration_logs are retained permanently.
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS ttl_purge_at TIMESTAMPTZ`);

    // source_urls: all URLs crawled (deep scan aggregation)
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS source_urls JSONB`);

    // changes_detected_count: how many pages changed in this scan
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS changes_detected_count INTEGER DEFAULT 0`);

    // created_at / completed_at: timing metadata
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`);
    await client.query(`ALTER TABLE scans ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`);

    // ── 3. Semantic cache index ────────────────────────────────────
    // The critical index for cache hit performance.
    // Lookup: WHERE url=$1 AND dom_hash=$2 AND synthesis_json IS NOT NULL AND created_at > NOW() - INTERVAL '4 hours'
    // This makes 90%+ cache hit rate at scale (Phil/CloudZero cost proof).
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scans_semantic_cache
      ON scans(url, dom_hash, created_at DESC)
      WHERE synthesis_json IS NOT NULL AND status = 'completed'
    `);

    // ── 4. Worker polling index ────────────────────────────────────
    // For the background worker: SELECT ... WHERE status = 'queued' AND url IS NOT NULL
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scans_status_queued
      ON scans(status, created_at ASC)
      WHERE url IS NOT NULL
    `);

    // ── 5. TTL purge index ─────────────────────────────────────────
    // For the hourly purge worker: WHERE ttl_purge_at < NOW() AND ttl_purge_at IS NOT NULL
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_scans_ttl_purge
      ON scans(ttl_purge_at)
      WHERE ttl_purge_at IS NOT NULL
    `);

    // ── 6. Create a default API key for demo/testing ───────────────
    // Linked to the default "Spyglass Demo" org from migration 008.
    // Key format: spg_live_ prefix for easy identification.
    await client.query(`
      INSERT INTO api_keys (org_id, key, name, active)
      SELECT
        o.id,
        'spg_live_demo_k1_' || SUBSTRING(gen_random_uuid()::text, 1, 12),
        'Demo API Key',
        true
      FROM organizations o
      WHERE o.name = 'Spyglass Demo'
      LIMIT 1
      ON CONFLICT DO NOTHING
    `);

    console.log('[Migration 010] Headless API infrastructure created (api_keys, scans extensions, indexes)');
  }
};
