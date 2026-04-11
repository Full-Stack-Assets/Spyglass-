/**
 * Migration 008: Exit-Ready PostgreSQL Schema
 *
 * Creates multi-tenant B2B foundation tables:
 *   organizations → competitors (org_id added) → monitors → scans → changes
 *
 * Strategy: additive/backward-compatible.
 * - Existing app tables (competitors, monitored_urls, page_snapshots, detected_changes)
 *   remain untouched and fully functional.
 * - New columns (org_id, website_url, industry_vertical) are added to competitors.
 * - New tables (organizations, monitors, scans, changes) are created alongside.
 * - Existing data is migrated into the new tables.
 * - Part 2 migration will switch app queries to the new schema.
 */

module.exports = {
  name: 'exit_ready_schema',
  up: async (client) => {

    // -------------------------------------------------------
    // 1. organizations — multi-tenant anchor
    // -------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        stripe_customer_id TEXT,
        plan_tier TEXT DEFAULT 'starter',
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // -------------------------------------------------------
    // 2. Add new columns to existing competitors table
    //    (backward-compatible: all nullable, app ignores them)
    // -------------------------------------------------------
    await client.query(`
      ALTER TABLE competitors
        ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS website_url TEXT,
        ADD COLUMN IF NOT EXISTS industry_vertical TEXT
    `);

    // -------------------------------------------------------
    // 3. monitors — strategic sensors (UUID-based, new table)
    //    Uses INTEGER competitor_id to link to existing data;
    //    Part 2 will migrate competitors to UUID and update this FK.
    // -------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        competitor_id INTEGER REFERENCES competitors(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        monitor_type TEXT NOT NULL DEFAULT 'landing_page',
        frequency_hours INTEGER DEFAULT 24,
        last_scanned_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      )
    `);

    // -------------------------------------------------------
    // 4. scans — raw ingest layer with DOM hash
    // -------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        monitor_id UUID REFERENCES monitors(id),
        raw_html_content_path TEXT,
        dom_hash TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        error_log TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // -------------------------------------------------------
    // 5. changes — detected diffs with AI-scored urgency
    // -------------------------------------------------------
    await client.query(`
      CREATE TABLE IF NOT EXISTS changes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scan_id UUID REFERENCES scans(id),
        change_type TEXT,
        diff_json JSONB,
        urgency_score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    // -------------------------------------------------------
    // 6. Performance indices
    // -------------------------------------------------------
    await client.query(`CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_scans_created ON scans(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_competitors_org ON competitors(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_monitors_competitor ON monitors(competitor_id)`);

    // -------------------------------------------------------
    // 7. Create default organization and migrate existing data
    // -------------------------------------------------------

    // Insert default org (idempotent via ON CONFLICT)
    const { rows: [defaultOrg] } = await client.query(`
      INSERT INTO organizations (name, slug, plan_tier)
      VALUES ('Spyglass Demo', 'spyglass-default', 'starter')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    const defaultOrgId = defaultOrg.id;

    // Link all existing competitors without an org to the default org
    await client.query(`
      UPDATE competitors
      SET
        org_id = $1,
        website_url = COALESCE(website_url, website)
      WHERE org_id IS NULL
    `, [defaultOrgId]);

    // -------------------------------------------------------
    // 8. Populate monitors from monitored_urls
    //    (skip if monitors already has rows to keep idempotent)
    // -------------------------------------------------------
    const { rows: [{ count: monitorCount }] } = await client.query(
      `SELECT COUNT(*) as count FROM monitors`
    );

    if (parseInt(monitorCount) === 0) {
      await client.query(`
        INSERT INTO monitors (competitor_id, url, monitor_type, frequency_hours, last_scanned_at, is_active)
        SELECT
          mu.competitor_id,
          mu.url,
          CASE
            WHEN mu.url_type = 'pricing' THEN 'pricing'
            WHEN mu.url_type = 'docs'    THEN 'technical_docs'
            ELSE 'landing_page'
          END AS monitor_type,
          COALESCE(mu.check_interval_hours, 24),
          mu.last_checked_at,
          mu.active
        FROM monitored_urls mu
      `);
      console.log('[Migration 008] Populated monitors from monitored_urls');
    }

    // -------------------------------------------------------
    // 9. Populate scans from page_snapshots
    //    Maps monitor by matching competitor_id + url
    // -------------------------------------------------------
    const { rows: [{ count: scanCount }] } = await client.query(
      `SELECT COUNT(*) as count FROM scans`
    );

    if (parseInt(scanCount) === 0) {
      await client.query(`
        INSERT INTO scans (monitor_id, dom_hash, status, error_log, created_at)
        SELECT
          m.id AS monitor_id,
          ps.content_hash AS dom_hash,
          CASE WHEN ps.error IS NULL THEN 'success' ELSE 'failed' END AS status,
          ps.error AS error_log,
          ps.captured_at AS created_at
        FROM page_snapshots ps
        JOIN monitored_urls mu ON mu.id = ps.monitored_url_id
        JOIN monitors m ON m.competitor_id = mu.competitor_id AND m.url = mu.url
        WHERE ps.content_hash IS NOT NULL
        ORDER BY ps.captured_at ASC
      `);
      console.log('[Migration 008] Populated scans from page_snapshots');
    }

    // -------------------------------------------------------
    // 10. Populate changes from detected_changes
    // -------------------------------------------------------
    const { rows: [{ count: changeCount }] } = await client.query(
      `SELECT COUNT(*) as count FROM changes`
    );

    if (parseInt(changeCount) === 0) {
      await client.query(`
        INSERT INTO changes (scan_id, change_type, diff_json, urgency_score, created_at)
        SELECT
          sc.id AS scan_id,
          dc.change_type,
          jsonb_build_object(
            'diff_summary', dc.diff_summary,
            'significance', dc.significance,
            'ai_analysis',  dc.ai_analysis
          ) AS diff_json,
          CASE dc.significance
            WHEN 'high'   THEN 8
            WHEN 'medium' THEN 5
            WHEN 'low'    THEN 2
            ELSE 0
          END AS urgency_score,
          dc.detected_at AS created_at
        FROM detected_changes dc
        JOIN page_snapshots ps ON ps.id = dc.snapshot_id
        JOIN monitored_urls mu ON mu.id = dc.monitored_url_id
        JOIN monitors m ON m.competitor_id = mu.competitor_id AND m.url = mu.url
        JOIN scans sc ON sc.monitor_id = m.id AND sc.dom_hash = ps.content_hash
          AND ABS(EXTRACT(EPOCH FROM (sc.created_at - dc.detected_at))) < 60
        WHERE dc.snapshot_id IS NOT NULL
      `);
      console.log('[Migration 008] Populated changes from detected_changes');
    }

    console.log('[Migration 008] Exit-Ready schema migration complete.');
    console.log(`[Migration 008] Default org ID: ${defaultOrgId}`);
  }
};
