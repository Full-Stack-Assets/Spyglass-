/**
 * Demo Data Seeder
 * Seeds pre-populated competitor intelligence data for demo accounts.
 * Used by the magic link auth flow to create the "aha moment" experience.
 *
 * Supports multiple demo personas via demoType:
 *   - 'cloudzero' (default) — Phil Pergola / CloudZero FinOps
 *   - '7ai' — Lior Div / 7AI Cybersecurity / Agentic SOC
 *   - 'maven' — Jonathan Corbin / Maven AGI / AI Customer Support
 *   - 'compa' — Charlie Franklin / Compa / Compensation Intelligence
 *   - 'openly' — Ty Harris / Openly / Premium Homeowners InsurTech
 */
const crypto = require('crypto');
const { seed7AIDemoData } = require('./demo-seed-7ai');
const { seedMavenDemoData } = require('./demo-seed-maven');
const { seedMethodDemoData } = require('./demo-seed-method');
const { seedCompaDemoData } = require('./demo-seed-compa');
const { seedOpenlyDemoData } = require('./demo-seed-openly');

// ── Competitor Definitions ──────────────────────────────────────
const COMPETITORS = [
  {
    name: 'Vantage',
    website: 'vantage.sh',
    urls: [
      { url: 'https://vantage.sh/pricing', label: 'Pricing Page', url_type: 'pricing' },
      { url: 'https://vantage.sh/features', label: 'Features', url_type: 'features' },
      { url: 'https://docs.vantage.sh', label: 'Documentation', url_type: 'general' },
      { url: 'https://vantage.sh/blog', label: 'Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'Spot by NetApp',
    website: 'spot.io',
    urls: [
      { url: 'https://spot.io/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://spot.io/products/ocean', label: 'Ocean (K8s Autoscaling)', url_type: 'features' },
      { url: 'https://spot.io/products', label: 'All Products', url_type: 'features' }
    ]
  },
  {
    name: 'CloudHealth',
    website: 'cloudhealth.vmware.com',
    urls: [
      { url: 'https://cloudhealth.vmware.com/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://cloudhealth.vmware.com/platform', label: 'Platform Overview', url_type: 'features' },
      { url: 'https://cloudhealth.vmware.com/solutions', label: 'Solutions', url_type: 'features' }
    ]
  },
  {
    name: 'Kubecost',
    website: 'kubecost.com',
    urls: [
      { url: 'https://www.kubecost.com/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.kubecost.com/product', label: 'Product', url_type: 'features' },
      { url: 'https://docs.kubecost.com', label: 'Documentation', url_type: 'general' }
    ]
  }
];

// ── Detected Changes (the "aha moments") ────────────────────────
// Each change includes rich AI analysis and structural change badges
const DEMO_CHANGES = [
  {
    competitor: 'Vantage',
    url_label: 'Pricing Page',
    change_type: 'pricing_change',
    significance: 'high',
    days_ago: 2,
    ai_analysis: {
      headline: 'Vantage Waives AI Agent Token Pricing Through July 2026',
      analysis: 'Vantage has temporarily eliminated the $2.50/million token fee for their FinOps Agent through July 1, 2026. This aggressive move removes the cost barrier for teams evaluating AI-powered cost recommendations. At scale, this represents ~$150/month in waived fees per heavy user. This promotional window signals Vantage is prioritizing agent adoption over near-term revenue.',
      category: 'pricing',
      urgency: 'high',
      recommended_action: 'Monitor Vantage agent adoption rates during promotional window. Consider launching a competitive response highlighting CloudZero business-context advantage over generic agent recommendations.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'Token pricing section removed; replaced with "Free through July 2026" promotional banner', element_type: 'pricing-card' },
      { category: 'cta_change', description: 'Primary CTA changed from "Get Started" to "Try Agent Free"', element_type: 'button' }
    ]
  },
  {
    competitor: 'Vantage',
    url_label: 'Features',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 3,
    ai_analysis: {
      headline: 'Vantage Ships Instances API + MCP Integration for AI Assistants',
      analysis: 'Vantage launched a new Instances API and SDK (March 27) enabling programmatic cloud pricing queries. More significantly, they shipped Model Context Protocol (MCP) integration, allowing Claude and other AI assistants to query Vantage data directly. This positions Vantage inside engineering workflows at the tool layer, not just the dashboard layer.',
      category: 'features',
      urgency: 'high',
      recommended_action: 'Evaluate whether CloudZero should offer MCP-compatible APIs for AI assistant integration. Developer workflow integration is a growing competitive vector.'
    },
    structural_changes: [
      { category: 'navigation', description: 'New "API" section added to main navigation with developer-focused landing page', element_type: 'nav-item' },
      { category: 'cta_change', description: 'Developer section CTA: "Build with Vantage" added to features page', element_type: 'button' }
    ]
  },
  {
    competitor: 'Spot by NetApp',
    url_label: 'Ocean (K8s Autoscaling)',
    change_type: 'product_expansion',
    significance: 'high',
    days_ago: 4,
    ai_analysis: {
      headline: 'Spot Ocean Expands K8s Autoscaling with Full Commitment Automation',
      analysis: 'Spot Ocean now combines Kubernetes cluster autoscaling, bin-packing, and Spot instance orchestration with automated RI/Savings Plan purchasing via their Eco engine. This creates an end-to-end compute optimization loop that reduces operational toil significantly. The bundled approach (compute + commitments + security) makes Spot a consolidation play.',
      category: 'features',
      urgency: 'high',
      recommended_action: 'Position CloudZero as the "why" layer above Spot automation. Spot handles tactical optimization; CloudZero explains which business driver caused cost changes.'
    },
    structural_changes: [
      { category: 'layout', description: 'Product page restructured to show unified Ocean + Eco pipeline diagram', element_type: 'section' }
    ]
  },
  {
    competitor: 'Kubecost',
    url_label: 'Pricing',
    change_type: 'pricing_change',
    significance: 'medium',
    days_ago: 5,
    ai_analysis: {
      headline: 'Kubecost Launches Unlimited Free Tier for AWS EKS Users',
      analysis: 'Kubecost now offers an unlimited free tier for AWS EKS users, removing the previous $100K tracked spend limit. This makes Kubecost the default K8s cost tool for any AWS shop. However, Kubecost remains K8s-only with no multi-cloud visibility, no business unit mapping, and no non-K8s service coverage (RDS, S3, Lambda).',
      category: 'pricing',
      urgency: 'medium',
      recommended_action: 'Position CloudZero as "Kubecost\'s bigger brother" — Kubecost handles K8s visibility while CloudZero handles K8s + full stack + business context.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'Free tier card updated: removed "$100K spend limit" text, added "Unlimited for EKS" badge', element_type: 'pricing-card' }
    ]
  },
  {
    competitor: 'CloudHealth',
    url_label: 'Platform Overview',
    change_type: 'content_change',
    significance: 'medium',
    days_ago: 5,
    ai_analysis: {
      headline: 'CloudHealth Rebranding Creates Three Concurrent Product Names Under Broadcom',
      analysis: 'The VMware-to-Broadcom acquisition has created brand confusion: CloudHealth, VMware Aria Cost, and Tanzu CloudHealth now coexist as product names. Documentation references all three interchangeably. Enterprise customers report confusion about which product they are actually using and what the migration path looks like.',
      category: 'messaging',
      urgency: 'medium',
      recommended_action: 'Leverage CloudHealth brand confusion in competitive positioning. Emphasize CloudZero\'s clear, singular product identity versus multi-name confusion.'
    },
    structural_changes: [
      { category: 'navigation', description: 'Header logo alternates between "CloudHealth" and "Tanzu CloudHealth" across pages', element_type: 'logo' }
    ]
  },
  {
    competitor: 'CloudHealth',
    url_label: 'Pricing',
    change_type: 'pricing_change',
    significance: 'medium',
    days_ago: 6,
    ai_analysis: {
      headline: 'CloudHealth Drops Enterprise Pricing to 2.2% for 36-Month Contracts',
      analysis: 'CloudHealth pricing now shows 2.2% of tracked spend for 36-month commitments (down from 2.5%). For a $10M annual cloud spend, this means ~$18K/month — still significantly above most competitors. The long contract requirement (3 years) signals retention pressure from the Broadcom transition.',
      category: 'pricing',
      urgency: 'medium',
      recommended_action: 'Use the pricing differential in sales conversations. CloudZero at ~$19/mo per $1K spend is more transparent and lower for most mid-market accounts.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'New "36-month" pricing tier added with 2.2% rate; "Enterprise" tier repositioned', element_type: 'pricing-card' }
    ]
  },
  {
    competitor: 'Vantage',
    url_label: 'Blog',
    change_type: 'content_change',
    significance: 'low',
    days_ago: 1,
    ai_analysis: {
      headline: 'Vantage Publishes Terraform Provider + Claude Integration Tutorial',
      analysis: 'New blog post details how to use Vantage\'s Terraform provider to programmatically manage cost reports and budgets, plus a tutorial on connecting Vantage to Claude via MCP. This is a developer-first content play designed to embed Vantage into infrastructure-as-code and AI assistant workflows.',
      category: 'blog',
      urgency: 'low',
      recommended_action: 'Consider similar developer content for CloudZero. Terraform and AI assistant integrations are table-stakes for developer-focused FinOps.'
    },
    structural_changes: []
  }
];

// ── Brief Content ───────────────────────────────────────────────
const BRIEF_SUBJECT = 'CloudZero Competitive Intelligence Brief — Q1 2026';
const BRIEF_HTML = `
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="background:#1a1a2e;color:#e8e6e1;padding:32px;border-radius:12px 12px 0 0;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#e8a230;margin-bottom:12px;">CloudZero Intelligence</div>
    <h1 style="font-size:24px;margin:0 0 8px;color:#fff;font-weight:700;">Q1 2026 Competitive Landscape</h1>
    <p style="font-size:14px;color:#8a8b8e;margin:0;">4 competitors tracked &bull; 12 strategic shifts detected &bull; Feb 15 &ndash; Mar 29, 2026</p>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;">
    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <strong style="color:#92400e;">Key Finding:</strong>
      <span style="color:#78350f;"> Vantage waived AI agent token pricing through July 2026 &mdash; removing cost barriers for teams evaluating automated FinOps recommendations.</span>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;">Executive Summary</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">CloudZero remains the <strong>unit economics leader</strong> in FinOps, but the competitive landscape is consolidating. Vantage is accelerating AI agent adoption, Spot/NetApp is doubling down on Kubernetes automation, and CloudHealth pricing pressure is mounting. <strong>Key risk:</strong> Competitors are adopting CloudZero&rsquo;s language around business metrics&mdash;the differentiation window is narrowing from 18 to 12 months.</p>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Critical Shifts</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Shift</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Impact</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Urgency</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><strong>Vantage FinOps Agent + tokens waived</strong></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Automated recommendations at unit-cost level via Slack/Claude</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><strong>Spot Ocean K8s + commitment automation</strong></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">End-to-end compute + savings plan orchestration</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><strong>CloudHealth rebranding confusion</strong></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">VMware &rarr; Broadcom migration = brand confusion, aggressive Tanzu bundling</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><strong>Kubecost unlimited free EKS tier</strong></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Free tier now covers unlimited K8s clusters for AWS EKS users</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Pricing Landscape</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Platform</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Model</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Entry Point</th>
      </tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#e8a230;">CloudZero</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Unit-based: ~$19/mo per $1K spend</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$300&ndash;$500/mo</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Vantage</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Spend-tiered subscription</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Free</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Spot</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Savings-based + vCPU commit</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Free (20 VMs)</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">CloudHealth</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">% of spend (2.5&ndash;2.2%)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">~$5K/mo</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Kubecost</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Per-node / Free (EKS)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$0 (EKS)</td></tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Recommended Actions</h2>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">1.</span><span style="font-size:14px;line-height:1.6;color:#374151;">Publish &ldquo;Vantage + CloudZero&rdquo; benchmark showing both tools together = best-in-class FinOps</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">2.</span><span style="font-size:14px;line-height:1.6;color:#374151;">K8s messaging refresh &mdash; position as &ldquo;Kubecost&rsquo;s bigger brother&rdquo; for full-stack visibility</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">3.</span><span style="font-size:14px;line-height:1.6;color:#374151;">Spot automation comparison blog: &ldquo;Why automation without business context leaves 40% savings on the table&rdquo;</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#e8a230;font-weight:700;">4.</span><span style="font-size:14px;line-height:1.6;color:#374151;">Launch FinOps Agent V2 with business-context recommendations: &ldquo;Your feature cost per user increased 15% this week&rdquo;</span></div>
    </div>

    <div style="margin-top:28px;padding:16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#6b7280;">
      <strong>Sources:</strong> Vantage (vantage.sh), Spot.io, CloudHealth (VMware), Kubecost, FinOps Foundation, G2, AWS Marketplace &bull; Data as of March 29, 2026 &bull; Confidence: HIGH
    </div>
  </div>

  <div style="background:#1a1a2e;color:#8a8b8e;padding:20px 32px;border-radius:0 0 12px 12px;font-size:12px;text-align:center;">
    Generated by <span style="color:#e8a230;">Spyglass</span> &bull; Autonomous competitive intelligence &bull; <a href="https://spyglass-10.polsia.app" style="color:#e8a230;text-decoration:none;">spyglass-10.polsia.app</a>
  </div>
</div>
`;

/**
 * Seeds demo data for a newly-created demo user.
 * Creates competitors, monitored URLs, page snapshots, detected changes, and a brief.
 *
 * @param {Pool} pool - PostgreSQL pool
 * @param {number} userId - The user ID to seed data for
 * @param {string} [demoType='cloudzero'] - Which demo persona to seed ('cloudzero', '7ai', 'maven', or 'compa')
 * @returns {Promise<void>}
 */
async function seedDemoData(pool, userId, demoType) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if demo data already seeded
    const { rows: existing } = await client.query(
      'SELECT COUNT(*) as count FROM competitors WHERE user_id = $1',
      [userId]
    );
    if (parseInt(existing[0].count) > 0) {
      await client.query('COMMIT');
      return;
    }

    // Route to the appropriate demo seeder
    if (demoType === '7ai') {
      await seed7AIDemoData(client, userId);
      await client.query('COMMIT');
      console.log('[Demo Seed] Successfully seeded 7AI demo data for user', userId);
      return;
    }

    if (demoType === 'maven') {
      await seedMavenDemoData(client, userId);
      await client.query('COMMIT');
      console.log('[Demo Seed] Successfully seeded Maven AGI demo data for user', userId);
      return;
    }

    if (demoType === 'method') {
      await seedMethodDemoData(client, userId);
      await client.query('COMMIT');
      console.log('[Demo Seed] Successfully seeded Method AI demo data for user', userId);
      return;
    }

    if (demoType === 'compa') {
      await seedCompaDemoData(client, userId);
      await client.query('COMMIT');
      console.log('[Demo Seed] Successfully seeded Compa demo data for user', userId);
      return;
    }

    if (demoType === 'openly') {
      await seedOpenlyDemoData(client, userId);
      await client.query('COMMIT');
      console.log('[Demo Seed] Successfully seeded Openly demo data for user', userId);
      return;
    }

    // Default: CloudZero demo (original implementation)
    // Build a map of competitor name -> id, and url label -> { monUrlId, competitorName }
    const competitorMap = {};
    const urlMap = {};

    for (const comp of COMPETITORS) {
      const { rows: [row] } = await client.query(
        'INSERT INTO competitors (user_id, name, website) VALUES ($1, $2, $3) RETURNING id',
        [userId, comp.name, comp.website]
      );
      competitorMap[comp.name] = row.id;

      for (const urlDef of comp.urls) {
        const { rows: [urlRow] } = await client.query(
          'INSERT INTO monitored_urls (competitor_id, url, label, url_type, last_checked_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL \'1 day\') RETURNING id',
          [row.id, urlDef.url, urlDef.label, urlDef.url_type]
        );
        urlMap[comp.name + '::' + urlDef.label] = urlRow.id;
      }
    }

    // Create detected changes with snapshots
    for (const change of DEMO_CHANGES) {
      const monUrlId = urlMap[change.competitor + '::' + change.url_label];
      if (!monUrlId) continue;

      const detectedAt = new Date(Date.now() - change.days_ago * 86400000);
      const contentHash = crypto.createHash('sha256')
        .update(change.competitor + change.url_label + change.days_ago)
        .digest('hex').substring(0, 16);

      // Create current snapshot
      const { rows: [snapshot] } = await client.query(
        'INSERT INTO page_snapshots (monitored_url_id, content_hash, text_content, status_code, captured_at) VALUES ($1, $2, $3, 200, $4) RETURNING id',
        [monUrlId, contentHash, 'Snapshot content for ' + change.url_label, detectedAt]
      );

      // Create previous snapshot
      const prevHash = crypto.createHash('sha256')
        .update(change.competitor + change.url_label + 'prev')
        .digest('hex').substring(0, 16);
      const { rows: [prevSnapshot] } = await client.query(
        'INSERT INTO page_snapshots (monitored_url_id, content_hash, text_content, status_code, captured_at) VALUES ($1, $2, $3, 200, $4) RETURNING id',
        [monUrlId, prevHash, 'Previous snapshot for ' + change.url_label, new Date(detectedAt.getTime() - 7 * 86400000)]
      );

      // Create detected change
      await client.query(
        `INSERT INTO detected_changes
          (monitored_url_id, snapshot_id, previous_snapshot_id, change_type, diff_summary, ai_analysis, significance, structural_changes, detected_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          monUrlId,
          snapshot.id,
          prevSnapshot.id,
          change.change_type,
          change.ai_analysis.headline,
          JSON.stringify(change.ai_analysis),
          change.significance,
          JSON.stringify(change.structural_changes),
          detectedAt
        ]
      );
    }

    // Create daily brief (with changes_data for Markdown export)
    const demoBriefChanges = DEMO_CHANGES.map(c => ({
      competitor: c.competitor,
      url: null,
      label: c.url_label,
      ai: {
        headline: c.ai_analysis.headline,
        analysis: c.ai_analysis.analysis,
        category: c.ai_analysis.category,
        urgency: c.ai_analysis.urgency || c.significance
      }
    }));

    await client.query(
      `INSERT INTO daily_briefs (user_id, subject, html_content, text_content, changes_count, changes_data, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [
        userId,
        BRIEF_SUBJECT,
        BRIEF_HTML,
        'CloudZero Competitive Intelligence Brief - Q1 2026. 4 competitors tracked, 12 strategic shifts detected.',
        DEMO_CHANGES.length,
        JSON.stringify(demoBriefChanges)
      ]
    );

    // Also write to exit-ready briefs table (dual-write for Exit-Ready schema)
    await client.query(
      `INSERT INTO briefs (user_id, title, content_md, reasoning_path, model_version, html_content, text_content, changes_count, changes_data, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        userId,
        BRIEF_SUBJECT,
        'CloudZero Competitive Intelligence Brief - Q1 2026. 4 competitors tracked, 12 strategic shifts detected.',
        JSON.stringify(demoBriefChanges),
        'gpt-4o-mini',
        BRIEF_HTML,
        'CloudZero Competitive Intelligence Brief - Q1 2026. 4 competitors tracked, 12 strategic shifts detected.',
        DEMO_CHANGES.length,
        JSON.stringify(demoBriefChanges)
      ]
    );

    await client.query('COMMIT');
    console.log('[Demo Seed] Successfully seeded demo data for user', userId);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Demo Seed] Failed to seed demo data:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedDemoData };
