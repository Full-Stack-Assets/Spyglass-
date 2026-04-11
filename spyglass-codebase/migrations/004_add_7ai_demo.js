module.exports = {
  name: 'add_7ai_demo',
  up: async (client) => {
    // Pre-seed Lior Div's (7AI CEO) magic link (expires in 90 days)
    await client.query(`
      INSERT INTO magic_links (token, email, name, demo_config, expires_at)
      VALUES (
        'spg_7ai_M4kR9vN2jX7wL5pF8tY3',
        'lior@7ai.com',
        'Lior',
        $1::jsonb,
        NOW() + INTERVAL '90 days'
      )
      ON CONFLICT (token) DO NOTHING
    `, [JSON.stringify({
      company: '7AI',
      header: '7AI Intelligence',
      aha_headline: 'CrowdStrike Charlotte AI and SentinelOne Purple AI both went GA at RSA 2026 — the incumbents are reacting to 7AI agentic SOC positioning',
      aha_desc: 'Both incumbents launched full agentic ecosystems within days of each other at RSA 2026 — a direct reaction to 7AI positioning. But neither has production customers. 7AI has 2.5M alerts processed and 650K investigations completed at Fortune 500 scale. The 12-18 month defensibility window is open.',
      demo_type: '7ai',
      report_id: 236293
    })]);
  }
};
