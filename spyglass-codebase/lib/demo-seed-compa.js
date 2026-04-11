/**
 * Compa Intelligence Demo Data Seeder
 * Pre-seeded competitive intelligence for Charlie Franklin (Compa, Compensation Intelligence).
 * HR Tech / Compensation Benchmarking competitive landscape — Q2 2026.
 */
const crypto = require('crypto');

// ── Competitor Definitions (5 core players) ─────────────────────
const COMPETITORS = [
  {
    name: 'ADP (post-Pequity)',
    website: 'adp.com',
    urls: [
      { url: 'https://www.adp.com/solutions/large-business/total-rewards.aspx', label: 'Total Rewards Platform', url_type: 'features' },
      { url: 'https://www.adp.com/products/run.aspx', label: 'ADP Run', url_type: 'features' },
      { url: 'https://www.adp.com/solutions/total-source.aspx', label: 'TotalSource HRO', url_type: 'features' },
      { url: 'https://www.adp.com/resources/articles-and-insights/', label: 'News & Insights', url_type: 'blog' },
      { url: 'https://www.adp.com/press-releases/', label: 'Press Releases', url_type: 'blog' }
    ]
  },
  {
    name: 'Radford (Aon)',
    website: 'radford.aon.com',
    urls: [
      { url: 'https://radford.aon.com/solutions/compensation-surveys', label: 'Compensation Surveys', url_type: 'features' },
      { url: 'https://radford.aon.com/products/radford-ai', label: 'Radford AI Platform', url_type: 'features' },
      { url: 'https://radford.aon.com/solutions/pay-equity', label: 'Pay Equity Solutions', url_type: 'features' },
      { url: 'https://radford.aon.com/blog/', label: 'Blog', url_type: 'blog' },
      { url: 'https://aon.com/pay-transparency', label: 'EU Pay Transparency', url_type: 'features' }
    ]
  },
  {
    name: 'Stello AI',
    website: 'stello.ai',
    urls: [
      { url: 'https://www.stello.ai/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.stello.ai/iconic', label: 'Iconic AI Agent', url_type: 'features' },
      { url: 'https://www.stello.ai/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.stello.ai/blog/', label: 'Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'Payscale',
    website: 'payscale.com',
    urls: [
      { url: 'https://www.payscale.com/products/payfactors/', label: 'Payfactors Platform', url_type: 'features' },
      { url: 'https://www.payscale.com/pricing/', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.payscale.com/research-and-insights/', label: 'Research & Insights', url_type: 'blog' },
      { url: 'https://www.payscale.com/resources/compensation-planning/', label: 'Comp Planning', url_type: 'features' }
    ]
  },
  {
    name: 'Pave',
    website: 'pave.com',
    urls: [
      { url: 'https://www.pave.com/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.pave.com/platform', label: 'Platform', url_type: 'features' },
      { url: 'https://www.pave.com/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.pave.com/blog/', label: 'Blog', url_type: 'blog' }
    ]
  }
];

// ── Detected Changes (the "aha moments") ────────────────────────
const DEMO_CHANGES = [
  {
    competitor: 'ADP (post-Pequity)',
    url_label: 'Total Rewards Platform',
    change_type: 'acquisition_integration',
    significance: 'high',
    days_ago: 2,
    ai_analysis: {
      headline: 'ADP Completes Pequity Integration into Run/TotalSource — Mid-Market Compensation Intelligence Now Bundled at No Extra Cost',
      analysis: 'ADP has fully integrated Pequity\'s real-time compensation benchmarking engine into both ADP Run (SMB/mid-market) and TotalSource (PEO/HRO). This is not a minor update — Pequity\'s core value proposition (real-time comp data from VC-backed startups, live market rates, equity benchmarking) is now a default feature for ADP\'s 1M+ business customers. The bundling strategy eliminates a standalone sales conversation: HR leaders at 500-7,000 employee companies now receive compensation intelligence as a commodity feature within their existing ADP contract. This directly targets Compa\'s mid-market expansion accounts. ADP\'s distribution advantage (1M+ customers, deep HRIS/payroll integration) means Pequity\'s tech is now at a scale that took Compa 3+ years to build. The threat is not a feature-for-feature fight — it\'s a bundling war where Compa must win on depth, accuracy, and workflow integration speed.',
      category: 'acquisition',
      urgency: 'critical',
      recommended_action: 'Activate mid-market displacement playbook immediately. Compa\'s competitive angle: ADP/Pequity data is VC-startup-heavy and lacks enterprise-grade governance, audit trails, and job architecture customization. Build a "Why Compa Beats Bundled ADP Comp" one-pager for SDR/AE use. Target ADP Run customers who outgrew Pequity\'s startup-centric benchmarks and need enterprise job families.'
    },
    structural_changes: [
      { category: 'navigation', description: '"Compensation Intelligence" added as standalone section in Total Rewards nav — previously unlisted; Pequity branding removed and replaced with ADP nomenclature', element_type: 'nav-section' },
      { category: 'layout', description: 'Total Rewards page restructured: "Real-Time Pay Benchmarking" moved to hero feature position — previously buried under benefits overview', element_type: 'hero' },
      { category: 'cta_change', description: 'New CTA: "See your market position today" replaces generic "Contact sales" — outcome-based conversion framing', element_type: 'button' }
    ]
  },
  {
    competitor: 'Radford (Aon)',
    url_label: 'Radford AI Platform',
    change_type: 'product_launch',
    significance: 'high',
    days_ago: 4,
    ai_analysis: {
      headline: 'Radford Launches "Real-Time AI Connector" — Pipes Survey Data Directly into HRIS for Automated Pay Band Updates',
      analysis: 'Radford (Aon) shipped their AI Connector product in March 2026: an API layer that delivers real-time compensation data feeds directly into Workday, SAP SuccessFactors, and Oracle HCM. Previously, Radford data was accessed through survey exports and manual refresh cycles. The AI Connector enables automatic pay band recalibration triggered by market movement alerts — eliminating the quarterly comp review cycle that has been standard practice for 20+ years. For Radford\'s enterprise install base (Fortune 500, global tech companies), this is a high-stickiness feature: once HRIS job families are mapped to Radford\'s taxonomy, switching costs increase dramatically. The EU Pay Transparency angle amplifies this — enterprises facing June 2026 compliance deadlines are actively evaluating automated comp governance solutions, and Radford is positioning the AI Connector as the compliance infrastructure layer. Compa risk: Radford is using EU compliance urgency to accelerate enterprise lock-in before Compa can expand upmarket.',
      category: 'product_launch',
      urgency: 'high',
      recommended_action: 'Counter with Compa\'s HRIS integration depth and data freshness. Radford survey data still has a 6-12 month lag despite "AI Connector" branding. Position Compa\'s real-time crowdsourced benchmarks as the live layer and Radford as the lagging annual anchor. Build an integration comparison: Compa API vs Radford AI Connector setup time, data freshness, job family flexibility.'
    },
    structural_changes: [
      { category: 'navigation', description: '"AI Connector" added as new product section with dedicated landing page — first new product launch in 18 months', element_type: 'nav-item' },
      { category: 'pricing_structure', description: 'AI Connector priced as add-on to existing Radford survey subscriptions — no standalone pricing listed; bundled for enterprise contract renewals', element_type: 'pricing-card' },
      { category: 'cta_change', description: '"Book a Compliance Demo" CTA added — EU Pay Transparency urgency framing used to accelerate pipeline', element_type: 'button' }
    ]
  },
  {
    competitor: 'Radford (Aon)',
    url_label: 'EU Pay Transparency',
    change_type: 'regulatory_positioning',
    significance: 'high',
    days_ago: 3,
    ai_analysis: {
      headline: 'Radford Publishes EU Pay Transparency Compliance Playbook — Positioning as Default Enterprise Infrastructure for June 2026 Directive',
      analysis: 'Aon/Radford published a comprehensive EU Pay Transparency Directive compliance guide (March 2026) that maps their survey data and AI Connector directly to the June 2026 EU deadline requirements. The directive requires companies with 100+ EU employees to provide pay transparency reporting, job evaluation frameworks, and gender pay gap analysis. Radford\'s playbook positions their existing job taxonomy, survey benchmarks, and new AI Connector as the "plug-in compliance stack" — minimizing procurement complexity for enterprise HR teams facing audit risk. Critically, Radford is signing multi-year compliance infrastructure contracts before the June 2026 deadline, creating a 12-18 month lock-in window. Companies that commit now will not re-evaluate comp platforms mid-implementation. For Compa, this is a closing window: enterprise deals in EU-exposed markets (Germany, France, Netherlands, UK) are being decided in Q1-Q2 2026 based on compliance readiness, not product features.',
      category: 'regulatory_compliance',
      urgency: 'high',
      recommended_action: 'Publish Compa\'s EU Pay Transparency readiness brief immediately. Map Compa\'s job architecture, pay equity analysis, and reporting capabilities to the directive requirements. Create a "Compa EU Compliance Checklist" for HR teams to assess their readiness. Target EU-exposed enterprise accounts with June 2026 urgency messaging before Radford locks them up.'
    },
    structural_changes: [
      { category: 'layout', description: 'New "EU Pay Transparency Hub" section added to Aon website — dedicated compliance resource center with directive timeline, FAQs, and product mapping', element_type: 'section' },
      { category: 'cta_change', description: '"EU Compliance Assessment" CTA added — free assessment drives pipeline into AI Connector demo', element_type: 'button' }
    ]
  },
  {
    competitor: 'Stello AI',
    url_label: 'Iconic AI Agent',
    change_type: 'product_launch',
    significance: 'high',
    days_ago: 5,
    ai_analysis: {
      headline: 'Stello AI Launches "Iconic" — Autonomous Comp Agent That Recommends Offers, Adjustments, and Equity Refreshes for 500-7K Employee Companies',
      analysis: 'Stello AI shipped "Iconic" in March 2026: an autonomous compensation agent designed specifically for the 500-7,000 employee mid-market segment — Compa\'s core ICP. Iconic ingests HRIS data, applies real-time market benchmarks, and autonomously generates: (1) offer recommendations with market context, (2) proactive pay adjustment proposals triggered by market movement, and (3) equity refresh recommendations tied to vesting schedules. The autonomous recommendation layer is the differentiator — instead of a comp analyst pulling data and building a model, Iconic delivers a prioritized action list to the CHRO each Monday morning. Stello is pricing Iconic at $18/employee/year for mid-market — significantly below Compa\'s enterprise positioning. The go-to-market is direct to VP HR / CHRO, bypassing the comp analyst buyer persona. This creates two threats: (1) Stello wins top-of-funnel in mid-market before Compa gets a conversation, (2) Iconic\'s autonomous recommendations commoditize the "comp analyst + Compa" workflow at sub-enterprise scale.',
      category: 'product_launch',
      urgency: 'high',
      recommended_action: 'Compa must compete in mid-market or concede that segment to Stello. Counter: Compa\'s job architecture customization and governance workflows are table-stakes for companies approaching 2,000+ employees. Stello\'s autonomous recommendations work for simple job families; they break down for custom engineering leveling, sales commission structures, and multi-geo complexity. Build a "When You Outgrow Stello" campaign for 1,000-3,000 employee companies.'
    },
    structural_changes: [
      { category: 'layout', description: 'Homepage hero replaced with "Iconic" product launch announcement — full-page takeover with animated comp recommendation demo', element_type: 'hero' },
      { category: 'pricing_structure', description: '"Iconic" priced at $18/employee/year for 500-7K employee tier — transparent, self-serve pricing page added (first time Stello has public pricing)', element_type: 'pricing-card' },
      { category: 'navigation', description: '"Iconic" added as primary nav item alongside "Platform" — elevated above other product features', element_type: 'nav-item' }
    ]
  },
  {
    competitor: 'Payscale',
    url_label: 'Payfactors Platform',
    change_type: 'product_expansion',
    significance: 'medium',
    days_ago: 6,
    ai_analysis: {
      headline: 'Payscale Launches "2026 Strategic Alignment" Agent — Board-Level Compensation Reporting Powered by 55M Profile Dataset',
      analysis: 'Payscale launched their "Strategic Alignment" agent in Q1 2026, targeting a buyer persona shift: from HR comp analysts to CFOs and Board Compensation Committees. The agent generates automated board-ready comp reports: peer benchmarking against custom peer groups, CEO-to-median pay ratio analysis, and "say-on-pay" narrative preparation. Payscale is leveraging their 55M crowdsourced salary profiles to generate statistical significance that smaller datasets can\'t match for public company peer benchmarking. The CFO/Board angle is a vertical expansion move — Payscale has historically owned the SMB/mid-market analyst buyer; this pushes them toward enterprise governance and executive comp. Key risk: Payscale\'s crowdsourced data quality is uneven (high variance in title inflation, location adjustments) and CFOs at large companies eventually discover the limitations. But the "Strategic Alignment" branding will win RFPs at mid-market public companies who need board reporting credibility without Big4 consulting fees.',
      category: 'product_expansion',
      urgency: 'medium',
      recommended_action: 'Compa\'s counter: position on data precision over dataset size. 55M crowdsourced profiles with 30% data quality issues vs. Compa\'s curated, verified benchmarks. Build a CFO-facing positioning brief: "Why your board comp report needs Compa\'s verified data, not crowdsourced averages." Target public company CHROs facing proxy season preparation.'
    },
    structural_changes: [
      { category: 'navigation', description: '"Strategic Alignment" added as new product section targeting C-suite buyers — separate from analyst-facing "Payfactors" platform', element_type: 'nav-item' },
      { category: 'layout', description: 'Homepage added CFO/Board persona track alongside existing HR persona track — two distinct buyer journeys now visible in nav', element_type: 'hero' }
    ]
  },
  {
    competitor: 'Pave',
    url_label: 'Platform',
    change_type: 'feature_launch',
    significance: 'medium',
    days_ago: 7,
    ai_analysis: {
      headline: 'Pave Launches "Unified Comp" — Single View for Cash + Equity + Benefits That Eliminates Three-Spreadsheet Compensation Review',
      analysis: 'Pave shipped "Unified Comp" in March 2026: a single compensation view that merges base salary, equity (current value + projected vesting), and benefits into one total-rewards statement. For VC-backed startup CHROs, this solves the top operational pain: comp reviews require three tools (HRIS + equity management + comp benchmarking) and three spreadsheets. Unified Comp pulls data from Carta/Pulley (cap table), Workday/Rippling (base pay), and Pave\'s own benchmarks. The startup and scale-up market is Pave\'s stronghold — Series A through IPO-track companies. Compa risk: Pave\'s unified view narrative is compelling for companies where equity is 30-70% of total comp (typical Series B-C). For these companies, Pave\'s equity convergence story is more resonant than Compa\'s cash benchmarking-first positioning.',
      category: 'feature_launch',
      urgency: 'medium',
      recommended_action: 'Compa\'s positioning in the startup/VC segment needs a total-rewards story. If equity benchmarking is not in the Compa roadmap, explicitly position Compa as the "post-Series D, scaling to enterprise" platform. Let Pave own pre-Series D. Compa wins when companies are building out comp governance, job architecture, and need compliance-grade reporting — not just "pretty total comp statements".'
    },
    structural_changes: [
      { category: 'layout', description: '"Unified Comp" feature prominently added to homepage with animated total-rewards breakdown demo — equity + salary + benefits in single view', element_type: 'hero' },
      { category: 'cta_change', description: '"See your total comp" replaces "Get started" — outcome-based framing shift targeting startup-founder mindset', element_type: 'button' }
    ]
  },
  {
    competitor: 'ADP (post-Pequity)',
    url_label: 'Press Releases',
    change_type: 'content_change',
    significance: 'medium',
    days_ago: 3,
    ai_analysis: {
      headline: 'ADP Publishes Mid-Market Compensation Intelligence Case Studies — Targeting 500-5K Employee HR Teams with Pequity Success Stories',
      analysis: 'ADP published three case studies (March 2026) featuring Pequity-powered compensation intelligence outcomes at mid-market companies (500-3,000 employees). The case studies claim: 40% reduction in offer approval time, 2x faster comp review cycles, and 15% improvement in offer acceptance rates for engineering roles. These are the exact metrics that Compa uses in its own sales materials. ADP is building social proof in Compa\'s core ICP with the full weight of their marketing machine. The case studies are being amplified through ADP\'s existing customer base via email and in-product prompts — Compa has no equivalent distribution channel to counter this. Watch for these case studies appearing in competitive RFPs as "comparable outcomes at scale."',
      category: 'content',
      urgency: 'medium',
      recommended_action: 'Build a Compa case study counter-battery: 3 case studies at 500-3,000 employee companies showing outcomes that ADP/Pequity cannot match: custom job architecture, pay equity governance, compliance-grade audit trails. Submit to G2, Capterra, and Gartner Peer Insights to counter ADP\'s social proof buildup.'
    },
    structural_changes: []
  }
];

// ── Competitive Brief HTML ───────────────────────────────────────
const BRIEF_SUBJECT = 'Compa Intelligence Brief — Compensation Benchmarking Competitive Landscape Q2 2026';
const BRIEF_HTML = `
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="background:#0d1b2a;color:#e6edf3;padding:32px;border-radius:12px 12px 0 0;border-bottom:1px solid #1e3a5f;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#38bdf8;margin-bottom:12px;">Compa Intelligence</div>
    <h1 style="font-size:24px;margin:0 0 8px;color:#fff;font-weight:700;">Compensation Benchmarking — Q2 2026 Competitive Landscape</h1>
    <p style="font-size:14px;color:#8b949e;margin:0;">5 competitors tracked &bull; 23 URLs monitored &bull; 7 strategic shifts detected &bull; Welcome, Charlie</p>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;">

    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:16px;">&#128680;</span>
        <strong style="color:#991b1b;font-size:14px;">Acquisition Integration — Critical Threat</strong>
        <span style="background:#dc2626;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;text-transform:uppercase;letter-spacing:0.5px;">Acquisition</span>
      </div>
      <span style="color:#7f1d1d;font-size:13px;line-height:1.6;display:block;">ADP just completed the integration of Pequity into Run/TotalSource &mdash; targeting your mid-market expansion accounts. Compensation intelligence is now bundled as a default feature for 1M+ ADP business customers. The window to win mid-market deals before ADP account managers activate this feature is closing.</span>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #38bdf8;padding-bottom:8px;">Executive Summary</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">The compensation intelligence market hit a structural inflection in Q1 2026. <strong>ADP bundling Pequity</strong> commoditizes mid-market comp benchmarking. <strong>Radford is using EU Pay Transparency urgency</strong> to accelerate enterprise lock-in. <strong>Stello AI&#8217;s "Iconic"</strong> targets Compa&#8217;s exact ICP (500-7K employees) with autonomous recommendations at $18/employee/year. <strong>Compa&#8217;s defensible position:</strong> enterprise job architecture customization, compliance-grade governance, and pay equity audit trails that ADP/Pequity and Stello cannot match at scale. The next 90 days are critical: Q2 2026 pipeline decisions in EU-exposed markets are being made now based on compliance readiness, not product features.</p>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #38bdf8;padding-bottom:8px;margin-top:28px;">Competitor Threat Matrix</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Competitor</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Key Move</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Badge</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Compa Counter</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Urgency</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">ADP / Pequity</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Pequity fully integrated into Run/TotalSource — bundled free</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><span style="background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;">Acquisition</span></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Enterprise job arch + governance ADP cannot match</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">CRITICAL</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Radford (Aon)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">"Real-Time AI Connector" HRIS integration + EU compliance lock-in</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;">Product Launch</span></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Survey data lag (6-12mo) vs. Compa real-time benchmarks</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Stello AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">"Iconic" autonomous comp agent — $18/employee/yr, mid-market ICP</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;">Product Launch</span></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Iconic breaks on custom job families + multi-geo complexity</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Payscale</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">"Strategic Alignment" board reporting agent — CFO/Board buyer persona</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;">Product Launch</span></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">55M crowdsourced profiles vs. Compa verified precision data</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Pave</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">"Unified Comp" — cash + equity + benefits total rewards view</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><span style="background:#d1fae5;color:#065f46;padding:2px 6px;border-radius:3px;font-size:11px;font-weight:600;">Feature Launch</span></td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Pave wins pre-Series D; Compa wins governance-ready companies</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #38bdf8;padding-bottom:8px;margin-top:28px;">&#127757; EU Pay Transparency Directive — June 2026 Deadline (Time-Sensitive)</h2>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="font-size:13px;line-height:1.7;color:#1e40af;margin:0 0 12px;"><strong>The EU Pay Transparency Directive (effective June 2026)</strong> requires companies with 100+ EU-based employees to: (1) publish salary ranges in all job postings, (2) provide pay equity reporting by gender and job category, (3) conduct structured job evaluations using defined methodology, and (4) respond to individual pay information requests within specified timelines.</p>
      <p style="font-size:13px;line-height:1.7;color:#374151;margin:0 0 12px;">This directive is driving <strong>immediate procurement decisions</strong> in Q1-Q2 2026. Enterprise HR teams at US companies with EU headcount are evaluating compensation platforms specifically on compliance readiness — not feature breadth. Radford is executing a land-and-lock strategy: sign multi-year compliance infrastructure contracts before the June deadline, using the AI Connector as the HRIS integration layer.</p>
      <div style="background:#fff;border-radius:6px;padding:12px;margin-top:8px;">
        <strong style="font-size:13px;color:#1e40af;">Compa Action:</strong>
        <span style="font-size:13px;color:#374151;"> Publish a dedicated EU Pay Transparency readiness assessment. Map Compa&#8217;s pay equity analysis, job architecture framework, and audit reporting to each directive requirement. This is a Q1 2026 pipeline accelerant — enterprise deals with EU exposure are being decided NOW based on compliance readiness.</span>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Directive Requirement</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Radford Position</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Compa Position</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Salary range publishing</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Survey-based bands (annual refresh)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Real-time market-calibrated ranges</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Pay equity reporting</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Gender pay gap module (new)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Built-in pay equity analytics</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Job evaluation methodology</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Radford job architecture (proprietary)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Custom job families + standard mapping</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Audit trail / documentation</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Limited (survey-based, not governance)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Compliance-grade audit logs</td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #38bdf8;padding-bottom:8px;margin-top:28px;">Market Pricing Landscape</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Platform</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Model</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Entry Point</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Primary Segment</th>
      </tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#38bdf8;">Compa</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Platform + benchmarking subscription</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$30K&ndash;$80K ARR</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Mid-market &rarr; Enterprise</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">ADP / Pequity</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Bundled (free with ADP contract)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$0 add-on</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">SMB &rarr; Mid-market</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Radford (Aon)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Survey subscription + AI Connector add-on</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$50K&ndash;$200K ARR</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Enterprise / Global</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Stello AI</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Per-employee ($18/emp/year)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$9K ARR (500 emp)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Mid-market (500-7K)</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Payscale</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Tiered subscription by headcount</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$8K&ndash;$25K ARR</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">SMB &rarr; Mid-market</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Pave</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Per-employee (equity-first)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$12K ARR</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Startups (Series A-D)</td></tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #38bdf8;padding-bottom:8px;margin-top:28px;">Compa Defensibility Moat</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Moat</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Compa Advantage</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Competitor Gap</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Data Freshness</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Real-time market benchmarks; not annual survey cycles</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Radford: 6-12 month survey lag despite "AI Connector" branding</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Job Architecture</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Custom job families, levels, geo-differentials per company</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">ADP/Pequity &amp; Stello: rigid standardized job taxonomies</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Pay Equity Governance</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Compliance-grade audit trails; EU directive ready</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Payscale/Stello: no enterprise governance layer</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">HRIS Integration Depth</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Bi-directional sync with Workday, SAP, HiBob, Rippling</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">ADP: ADP-only ecosystem; Pave: startup HRIS only</td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #38bdf8;padding-bottom:8px;margin-top:28px;">Q2 2026 GTM / Sales Playbook — Recommended Actions</h2>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;">
        <span style="color:#38bdf8;font-weight:700;white-space:nowrap;">1.</span>
        <span style="font-size:14px;line-height:1.6;color:#374151;"><strong>ADP Mid-Market Displacement:</strong> Activate SDR sequences targeting ADP Run customers (500-3,000 employees) with "Why ADP/Pequity isn&#8217;t enough for your comp complexity" messaging. Lead with job architecture customization and pay equity governance that ADP cannot deliver. Close window: 90 days before ADP account managers fully activate Pequity bundling in renewals.</span>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;">
        <span style="color:#38bdf8;font-weight:700;white-space:nowrap;">2.</span>
        <span style="font-size:14px;line-height:1.6;color:#374151;"><strong>EU Pay Transparency Sprint:</strong> Publish Compa&#8217;s EU compliance readiness brief before Radford completes lock-in. Create a "Compa EU Compliance Checklist" for HR teams. Target companies with 100+ EU employees in Germany, France, Netherlands, and UK — these are active evaluation conversations in Q1-Q2 2026.</span>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;">
        <span style="color:#38bdf8;font-weight:700;white-space:nowrap;">3.</span>
        <span style="font-size:14px;line-height:1.6;color:#374151;"><strong>"When You Outgrow Stello" Campaign:</strong> Build a content sequence targeting companies at 1,000-3,000 employees that have adopted Stello&#8217;s Iconic agent. Stello breaks on custom engineering leveling, sales commission structures, and multi-geo complexity. Compa wins when governance matters more than automation convenience.</span>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;">
        <span style="color:#38bdf8;font-weight:700;white-space:nowrap;">4.</span>
        <span style="font-size:14px;line-height:1.6;color:#374151;"><strong>CFO/Board Positioning vs. Payscale:</strong> Payscale&#8217;s "Strategic Alignment" agent will win RFPs at mid-market public companies on crowdsourced data volume (55M profiles). Counter with a CFO-facing brief: "Why your board comp report needs verified precision data, not crowdsourced averages." Target proxy season preparation as the urgency driver.</span>
      </div>
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <span style="color:#38bdf8;font-weight:700;white-space:nowrap;">5.</span>
        <span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Pave Segmentation:</strong> Explicit positioning: Pave owns pre-Series D startup equity comp; Compa owns post-Series D scaling companies building comp governance for 200+ employees. Build co-positioning messaging: "Pave for equity visibility, Compa for comp governance." Eliminates Pave as a competitive threat in deals where governance is the buyer&#8217;s primary need.</span>
      </div>
    </div>

    <div style="margin-top:28px;padding:16px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;font-size:12px;color:#0369a1;">
      <strong>Slack Alert (copy-ready):</strong> &ldquo;&#128680; ADP just completed Pequity integration into Run/TotalSource &mdash; mid-market expansion accounts at risk. Activating displacement playbook for 500-3K employee ADP customers. EU Pay Transparency window closes June 2026 &mdash; Radford lock-in accelerating.&rdquo;
    </div>

    <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#6b7280;">
      <strong>Sources:</strong> ADP (adp.com), Radford/Aon (radford.aon.com, aon.com), Stello AI (stello.ai), Payscale (payscale.com), Pave (pave.com), EU Pay Transparency Directive (ec.europa.eu), G2, Mercer, WorldatWork &bull; Data as of March 29, 2026 &bull; Confidence: HIGH
    </div>
  </div>

  <div style="background:#0d1b2a;color:#8b949e;padding:20px 32px;border-radius:0 0 12px 12px;font-size:12px;text-align:center;">
    Generated by <span style="color:#38bdf8;">Spyglass</span> &bull; Autonomous competitive intelligence &bull; <a href="https://spyglass-10.polsia.app" style="color:#38bdf8;text-decoration:none;">spyglass-10.polsia.app</a>
  </div>
</div>
`;

/**
 * Seeds Compa competitive intelligence demo data for Charlie Franklin.
 * Creates 5 competitors, 23 URLs, 7 detected changes with AI analysis, and a brief.
 *
 * @param {object} client - PostgreSQL client (within transaction)
 * @param {number} userId - The user ID to seed data for
 */
async function seedCompaDemoData(client, userId) {
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

    const { rows: [snapshot] } = await client.query(
      'INSERT INTO page_snapshots (monitored_url_id, content_hash, text_content, status_code, captured_at) VALUES ($1, $2, $3, 200, $4) RETURNING id',
      [monUrlId, contentHash, 'Snapshot content for ' + change.url_label, detectedAt]
    );

    const prevHash = crypto.createHash('sha256')
      .update(change.competitor + change.url_label + 'prev')
      .digest('hex').substring(0, 16);
    const { rows: [prevSnapshot] } = await client.query(
      'INSERT INTO page_snapshots (monitored_url_id, content_hash, text_content, status_code, captured_at) VALUES ($1, $2, $3, 200, $4) RETURNING id',
      [monUrlId, prevHash, 'Previous snapshot for ' + change.url_label, new Date(detectedAt.getTime() - 7 * 86400000)]
    );

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

  // Create daily brief with changes_data for Markdown export
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
      'Compa Intelligence Brief — Q2 2026. 5 competitors tracked, 23 URLs monitored. ADP completed Pequity integration into Run/TotalSource. Radford AI Connector shipping with EU Pay Transparency lock-in strategy. Stello AI Iconic targets Compa mid-market ICP at $18/employee/year.',
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
      'Compa Intelligence Brief — Q2 2026. 5 competitors tracked, 23 URLs monitored. ADP completed Pequity integration into Run/TotalSource. Radford AI Connector shipping with EU Pay Transparency lock-in strategy. Stello AI Iconic targets Compa mid-market ICP at $18/employee/year.',
      JSON.stringify(demoBriefChanges),
      'gpt-4o-mini',
      BRIEF_HTML,
      'Compa Intelligence Brief — Q2 2026. 5 competitors tracked, 23 URLs monitored. ADP completed Pequity integration into Run/TotalSource. Radford AI Connector shipping with EU Pay Transparency lock-in strategy. Stello AI Iconic targets Compa mid-market ICP at $18/employee/year.',
      DEMO_CHANGES.length,
      JSON.stringify(demoBriefChanges)
    ]
  );
}

module.exports = { seedCompaDemoData };
