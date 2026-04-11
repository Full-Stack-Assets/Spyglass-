module.exports = {
  name: 'add_method_demo',
  up: async (client) => {
    // Pre-seed Doug Teany's (Method AI / Surgical Navigation) magic link (expires in 90 days)
    await client.query(`
      INSERT INTO magic_links (token, email, name, demo_config, expires_at)
      VALUES (
        'spg_method_D9kR4wP2mX7vL5nF8tZ3',
        'doug@methodai.com',
        'Doug',
        $1::jsonb,
        NOW() + INTERVAL '90 days'
      )
      ON CONFLICT (token) DO NOTHING
    `, [JSON.stringify({
      company: 'Method AI',
      header: 'Method AI Intelligence',
      aha_headline: 'Medtronic just updated their Digital Surgery documentation — 3D ultrasound integration detected in early testing at Mayo Clinic and Cleveland Clinic',
      aha_desc: 'Medtronic\'s StealthStation documentation was updated March 28 to include real-time 3D ultrasound overlay references. If filed via 510(k) De Novo, this would allow StealthStation to maintain anatomical accuracy through soft tissue shift in real time — attacking the core gap in optical navigation stacks. Early testing language suggests Phase I clinical validation is underway. Estimated 18-24 months to US market clearance. Method AI\'s window to own the intraoperative software layer is now.',
      demo_type: 'method',
      demo_slack: '🚨 Medtronic just updated their \'Digital Surgery\' documentation — 3D ultrasound integration detected in early testing. StealthStation navigation may gain real-time soft tissue tracking. 510(k) pathway expected.',
      demo_slack_source: 'medtronic.com/digital-surgery'
    })]);
  }
};
