module.exports = {
  name: 'add_compa_demo',
  up: async (client) => {
    // Pre-seed Charlie Franklin's (Compa CEO) magic link (expires in 90 days)
    await client.query(`
      INSERT INTO magic_links (token, email, name, demo_config, expires_at)
      VALUES (
        'spg_compa_C8nX3kR5vW2mQ7jL4pY9',
        'charlie@compa.as',
        'Charlie',
        $1::jsonb,
        NOW() + INTERVAL '90 days'
      )
      ON CONFLICT (token) DO NOTHING
    `, [JSON.stringify({
      company: 'Compa',
      header: 'Compa Intelligence',
      aha_headline: 'ADP just completed the integration of Pequity into Run/TotalSource\u2014targeting your mid-market expansion accounts',
      aha_desc: 'ADP bundled Pequity\'s compensation benchmarking engine as a default feature for 1M+ business customers. For companies in your core ICP (500-3,000 employees), compensation intelligence is now a free ADP add-on. The window to win mid-market deals before ADP account managers activate this feature in renewals is closing. Counter with job architecture depth and pay equity governance that ADP cannot match.',
      demo_type: 'compa',
      demo_slack: '\uD83D\uDEA8 ADP just completed Pequity integration into Run/TotalSource \u2014 mid-market expansion accounts at risk. Activating displacement playbook for 500-3K employee ADP customers.',
      demo_slack_source: 'adp.com/solutions/large-business/total-rewards.aspx'
    })]);
  }
};
