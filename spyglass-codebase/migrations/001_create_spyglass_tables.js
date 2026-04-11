module.exports = {
  name: 'create_spyglass_tables',
  up: async (client) => {
    // Competitors table - one row per competitor being tracked
    await client.query(`
      CREATE TABLE IF NOT EXISTS competitors (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        website VARCHAR(512),
        notes TEXT,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Monitored URLs - specific pages to watch per competitor
    await client.query(`
      CREATE TABLE IF NOT EXISTS monitored_urls (
        id SERIAL PRIMARY KEY,
        competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
        url VARCHAR(2048) NOT NULL,
        label VARCHAR(255),
        url_type VARCHAR(50) DEFAULT 'general',
        check_interval_hours INTEGER DEFAULT 24,
        active BOOLEAN DEFAULT true,
        last_checked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Page snapshots - raw HTML content captured at a point in time
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_snapshots (
        id SERIAL PRIMARY KEY,
        monitored_url_id INTEGER NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
        content_hash VARCHAR(64) NOT NULL,
        text_content TEXT,
        status_code INTEGER,
        error TEXT,
        captured_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Detected changes - diffs between consecutive snapshots
    await client.query(`
      CREATE TABLE IF NOT EXISTS detected_changes (
        id SERIAL PRIMARY KEY,
        monitored_url_id INTEGER NOT NULL REFERENCES monitored_urls(id) ON DELETE CASCADE,
        snapshot_id INTEGER NOT NULL REFERENCES page_snapshots(id) ON DELETE CASCADE,
        previous_snapshot_id INTEGER REFERENCES page_snapshots(id) ON DELETE SET NULL,
        change_type VARCHAR(50) DEFAULT 'content_change',
        diff_summary TEXT,
        ai_analysis TEXT,
        significance VARCHAR(20) DEFAULT 'medium',
        detected_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Daily briefs - compiled email briefs sent to users
    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_briefs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(512),
        html_content TEXT,
        text_content TEXT,
        changes_count INTEGER DEFAULT 0,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Email settings per user
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        send_time VARCHAR(10) DEFAULT '06:30',
        timezone VARCHAR(50) DEFAULT 'America/New_York',
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitors(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_monitored_urls_competitor ON monitored_urls(competitor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_snapshots_url ON page_snapshots(monitored_url_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_snapshots_captured ON page_snapshots(captured_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_changes_url ON detected_changes(monitored_url_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_changes_detected ON detected_changes(detected_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_briefs_user ON daily_briefs(user_id)`);
  }
};
