module.exports = {
  name: 'add_openly_demo',
  up: async (client) => {
    // Pre-seed Ty Harris's (Openly / Premium Homeowners InsurTech) magic link (expires in 90 days)
    await client.query(`
      INSERT INTO magic_links (token, email, name, demo_config, expires_at)
      VALUES (
        'spg_openly_T7kR9mX4vP2nL6wF5tY8',
        'ty@openly.com',
        'Ty',
        $1::jsonb,
        NOW() + INTERVAL '90 days'
      )
      ON CONFLICT (token) DO NOTHING
    `, [JSON.stringify({
      company: 'Openly',
      header: 'Openly Intelligence',
      aha_headline: "Hippo just launched a '1-Click Agent Portal' for their Smart Home sensors — targeting your Independent Agent network",
      aha_desc: "Hippo's new Agent Portal allows independent agents to bundle smart home sensors with homeowners policies in a single 1-click workflow — reducing quote-to-bind time from 4 steps to 1. The portal includes automated leak detection discounts (up to 10% premium reduction) and a 'Sensor Score' dashboard. Beta data shows 32% higher retention for sensor-enrolled policies. This is a direct play for Openly's core distribution channel: making sensor-bundled homes easier to write through Hippo than through traditional carriers.",
      demo_type: 'openly',
      demo_slack: "🚨 State Farm just updated their aerial risk disclosure policy — 3 new ZIP codes flagged for premium increases in your coverage area",
      demo_slack_source: 'statefarm.com/insurance/home'
    })]);
  }
};
