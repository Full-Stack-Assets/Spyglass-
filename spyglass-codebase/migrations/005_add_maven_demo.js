module.exports = {
  name: 'add_maven_demo',
  up: async (client) => {
    // Pre-seed Jonathan Corbin's (Maven AGI) magic link (expires in 90 days)
    await client.query(`
      INSERT INTO magic_links (token, email, name, demo_config, expires_at)
      VALUES (
        'spg_maven_J7kR2wN9vX5pL4mF6tY8',
        'jonathan@mavenagi.com',
        'Jonathan',
        $1::jsonb,
        NOW() + INTERVAL '90 days'
      )
      ON CONFLICT (token) DO NOTHING
    `, [JSON.stringify({
      company: 'Maven AGI',
      header: 'Maven AGI Intelligence',
      aha_headline: 'Zendesk just launched autonomous resolution pricing at $0.40/resolved ticket — direct threat to your per-ticket model',
      aha_desc: 'Zendesk restructured the buying conversation from platform commitment to outcome-based ROI math. For a 10,000-ticket/month operation, customers now see $4,000/month from Zendesk vs. $12,000-$18,000/month for a traditional stack. This will change how enterprise buyers evaluate Maven in competitive deals. Counter with resolution quality and B2B complexity moat.',
      demo_type: 'maven',
      demo_slack: '🚨 Zendesk just launched autonomous resolution pricing — $0.40/resolved ticket, no agent seat required. Direct threat to your per-ticket model. Activating upgrade path for 100K+ existing Zendesk customers.',
      demo_slack_source: 'zendesk.com/pricing'
    })]);
  }
};
