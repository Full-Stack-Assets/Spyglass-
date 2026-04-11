module.exports = {
  name: 'add_magic_links',
  up: async (client) => {
    // Magic links table for frictionless demo access
    await client.query(`
      CREATE TABLE IF NOT EXISTS magic_links (
        id SERIAL PRIMARY KEY,
        token VARCHAR(128) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        demo_config JSONB,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)`);

    // Add metadata column to users for demo context
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb
    `);

    // Pre-seed Phil Pergola's magic link (expires in 90 days)
    await client.query(`
      INSERT INTO magic_links (token, email, name, demo_config, expires_at)
      VALUES (
        'spg_cz_K8mN3pR7vX2wQ9jLfT6y',
        'phil@cloudzero.com',
        'Phil Pergola',
        $1::jsonb,
        NOW() + INTERVAL '90 days'
      )
      ON CONFLICT (token) DO NOTHING
    `, [JSON.stringify({
      company: 'CloudZero',
      header: 'CloudZero Intelligence',
      aha_headline: 'Vantage waived AI agent token pricing through July 2026',
      report_id: 235760
    })]);
  }
};
