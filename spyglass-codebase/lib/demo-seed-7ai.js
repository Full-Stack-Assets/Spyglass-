/**
 * 7AI Demo Data Seeder
 * Pre-seeded competitive intelligence for Lior Div (7AI CEO).
 * Based on RSA 2026 competitive landscape analysis.
 */
const crypto = require('crypto');

// ── Competitor Definitions (5 core players) ─────────────────────
const COMPETITORS = [
  {
    name: 'CrowdStrike Charlotte AI',
    website: 'crowdstrike.com',
    urls: [
      { url: 'https://www.crowdstrike.com/en-us/platform/charlotte-ai/', label: 'Charlotte AI Overview', url_type: 'features' },
      { url: 'https://www.crowdstrike.com/en-us/blog/crowdstrike-leads-new-evolution-of-security-automation-with-charlotte-agentic-soar/', label: 'Agentic SOAR Announcement', url_type: 'blog' },
      { url: 'https://www.crowdstrike.com/en-us/product/pricing/', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.crowdstrike.com/en-us/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.crowdstrike.com/en-us/platform/falcon-platform/', label: 'Falcon Platform', url_type: 'features' },
      { url: 'https://www.crowdstrike.com/en-us/services/', label: 'Services', url_type: 'features' },
      { url: 'https://ir.crowdstrike.com/news-releases/', label: 'Press Releases', url_type: 'blog' }
    ]
  },
  {
    name: 'SentinelOne Purple AI',
    website: 'sentinelone.com',
    urls: [
      { url: 'https://www.sentinelone.com/platform/purple/', label: 'Purple AI Product', url_type: 'features' },
      { url: 'https://www.sentinelone.com/press/sentinelone-unveils-new-ai-security-offerings-to-give-defenders-a-decisive-advantage/', label: 'AI Security Launch', url_type: 'blog' },
      { url: 'https://www.sentinelone.com/press/sentinelone-brings-deep-security-reasoning-agentic-detection-and-response-and-hyperautomation-workflows-to-any-siem-or-data-source-with-purple-ai-athena-release/', label: 'Athena Release', url_type: 'blog' },
      { url: 'https://www.sentinelone.com/pricing/', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.sentinelone.com/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.sentinelone.com/resources/', label: 'Resources', url_type: 'general' },
      { url: 'https://www.sentinelone.com/careers/', label: 'Hiring Signals', url_type: 'general' }
    ]
  },
  {
    name: 'Darktrace',
    website: 'darktrace.com',
    urls: [
      { url: 'https://www.darktrace.com/platform', label: 'ActiveAI Platform', url_type: 'features' },
      { url: 'https://www.darktrace.com/darktrace-autonomous-response', label: 'Autonomous Response', url_type: 'features' },
      { url: 'https://www.vendr.com/marketplace/darktrace', label: 'Pricing (Vendr)', url_type: 'pricing' },
      { url: 'https://www.darktrace.com/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.darktrace.com/resources/', label: 'Resources', url_type: 'general' },
      { url: 'https://www.darktrace.com/company/', label: 'Company', url_type: 'general' },
      { url: 'https://www.darktrace.com/blog/', label: 'Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'Vectra AI',
    website: 'vectra.ai',
    urls: [
      { url: 'https://www.vectra.ai/topics/behavioral-analytics', label: 'Behavioral Analytics', url_type: 'features' },
      { url: 'https://www.vectra.ai/products/our-ai', label: 'AI Engine', url_type: 'features' },
      { url: 'https://www.vectra.ai/blog', label: 'Blog', url_type: 'blog' },
      { url: 'https://www.vectra.ai/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.vectra.ai/resources/', label: 'Resources', url_type: 'general' },
      { url: 'https://www.vectra.ai/products/', label: 'Products', url_type: 'features' },
      { url: 'https://www.vectra.ai/pricing/', label: 'Pricing', url_type: 'pricing' }
    ]
  },
  {
    name: 'Exabeam Nova',
    website: 'exabeam.com',
    urls: [
      { url: 'https://www.exabeam.com/platform/exabeam-nova/', label: 'Nova Platform', url_type: 'features' },
      { url: 'https://www.exabeam.com/blog/security-operations-center/exabeam-launches-the-first-fully-integrated-multi-agent-ai-for-security-operations/', label: 'Multi-Agent Launch', url_type: 'blog' },
      { url: 'https://www.exabeam.com/resources/data-sheets/new-scale-security-operations-platform/', label: 'New-Scale Data Sheet', url_type: 'features' },
      { url: 'https://www.exabeam.com/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.exabeam.com/pricing/', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.exabeam.com/blog/', label: 'Blog', url_type: 'blog' }
    ]
  }
];

// ── Detected Changes (RSA 2026 aha moments) ─────────────────────
const DEMO_CHANGES = [
  {
    competitor: 'CrowdStrike Charlotte AI',
    url_label: 'Charlotte AI Overview',
    change_type: 'product_launch',
    significance: 'high',
    days_ago: 4,
    ai_analysis: {
      headline: 'CrowdStrike Charlotte AI Goes GA at RSA 2026 — AgentWorks Ecosystem Launches with Anthropic, AWS, Deloitte',
      analysis: 'At RSA 2026 (March 25), CrowdStrike announced Charlotte AI as a full enterprise-grade agentic ecosystem. AgentWorks ships with no-code agent builder, native Falcon integration, and a partner ecosystem spanning Anthropic, AWS, Deloitte, Accenture, NVIDIA, OpenAI, Salesforce, and Telefonica Tech. Charlotte Agentic SOAR enables autonomous detection triage and multi-agent orchestration with bounded human oversight. Critical context: this is a GA announcement, not a deployment announcement. CrowdStrike has 0 production customers running agentic workloads at scale. 7AI has 2.5M alerts processed. The defensibility window remains.',
      category: 'product_launch',
      urgency: 'critical',
      recommended_action: 'Deploy production scale proof-points immediately. The narrative war is starting: CrowdStrike will claim "agentic AI" in every competitive sales cycle. Counter with 2.5M alerts + 650K investigations at Fortune 500 scale — that is not a roadmap, that is running production.'
    },
    structural_changes: [
      { category: 'navigation', description: 'New "AgentWorks" section added to Charlotte AI product page with partner ecosystem logos (Anthropic, AWS, Deloitte, NVIDIA)', element_type: 'nav-section' },
      { category: 'cta_change', description: 'Primary CTA changed from "Request Demo" to "Build Your First Agent" — developer-first positioning shift', element_type: 'button' },
      { category: 'layout', description: 'Partner ecosystem strip (8 logos) added below hero — institutional legitimacy play', element_type: 'section' }
    ]
  },
  {
    competitor: 'SentinelOne Purple AI',
    url_label: 'Athena Release',
    change_type: 'product_launch',
    significance: 'high',
    days_ago: 4,
    ai_analysis: {
      headline: 'SentinelOne Athena Release Ships Full Agentic SOC at RSA 2026 — Multi-Vendor Data + FedRAMP HIGH',
      analysis: 'SentinelOne\'s Athena release (RSA 2026, March 24) brings multi-vendor agentic detection and response to any SIEM or data source — directly targeting 7AI\'s vendor-agnostic positioning. Key capabilities: auto-triage, auto-investigation, hyperautomation workflows, and integration with Zscaler, Okta, Palo Alto, Proofpoint, Fortinet, and Microsoft. The FedRAMP HIGH authorization (2025) gives SentinelOne a federal TAM advantage that 7AI does not yet have. However, Purple AI is tied to Singularity platform baggage — it is still a SIEM-lite play, not a pure SOC replacement.',
      category: 'product_launch',
      urgency: 'high',
      recommended_action: 'Position 7AI\'s vendor-agnostic moat as fundamentally different from Purple AI\'s multi-vendor "integrations" (still requires Singularity data layer). 7AI ingests and acts; Purple AI queries and reports. The SOC automation depth is different.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'Athena release tier added — premium tier with hyperautomation capabilities priced separately from base Purple AI', element_type: 'pricing-card' },
      { category: 'navigation', description: '"Athena" product section added to Purple AI page with multi-vendor integration matrix (15+ vendors listed)', element_type: 'nav-section' },
      { category: 'cta_change', description: 'New "Agentic SOC" positioning added to homepage hero — direct terminology mirroring 7AI', element_type: 'hero' }
    ]
  },
  {
    competitor: 'Exabeam Nova',
    url_label: 'Multi-Agent Launch',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 3,
    ai_analysis: {
      headline: 'Exabeam Nova Ships 6-Agent Orchestration — Claims 50% Triage Time Reduction (10 → 5 Min)',
      analysis: 'Exabeam Nova launched its first fully integrated multi-agent AI for SOC with 6 coordinated agents: Threat Scoring, Investigation, Enrichment, Response, Executive Support, and Case Management. Claims 50% reduction in triage time (10 to 5 minutes per alert, 3 hours saved per analyst shift). Powered by Google Gemini LLM. Key weakness: Exabeam is a SIEM/TDIR platform first — the agents work within their data lake. This is consolidation play, not pure SOC automation. 7AI operates across any data source.',
      category: 'feature_launch',
      urgency: 'high',
      recommended_action: 'Challenge the "50% reduction" benchmark in competitive positioning. 7AI\'s 80-95% analyst time reduction at Fortune 500 scale is materially better than Exabeam\'s 50% claim on fresh-install setups.'
    },
    structural_changes: [
      { category: 'layout', description: 'Nova platform page restructured with "6 coordinated agents" visualization replacing previous single-agent UI', element_type: 'section' },
      { category: 'cta_change', description: '"Multi-Agent AI" added as primary headline — agentic positioning replacing previous "TDIR" focus', element_type: 'hero' }
    ]
  },
  {
    competitor: 'Darktrace',
    url_label: 'Pricing (Vendr)',
    change_type: 'pricing_change',
    significance: 'medium',
    days_ago: 6,
    ai_analysis: {
      headline: 'Darktrace Drops Enterprise Pricing 18% Post-Thales Acquisition — Aggressive Retention Play',
      analysis: 'Third-party pricing intelligence (Vendr/G2) shows Darktrace enterprise contracts have dropped 18% on average since the Thales Group acquisition ($5.3B, 2024). Average annual contract now $85K-$110K (down from $100K-$135K). This is a retention play: Darktrace is defending against churn driven by customer complaints around false positive rates and manual tuning overhead. Multiple G2 reviews in Q1 2026 cite "overwhelming false alerts" and "constant analyst babysitting." These are the customers 7AI should be targeting.',
      category: 'pricing',
      urgency: 'medium',
      recommended_action: 'Build a "Darktrace replacement" landing page. Target accounts with Darktrace contracts up for renewal in Q2-Q3 2026. The false positive narrative is real — G2 data supports it.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'Vendr marketplace updated with new negotiated pricing ranges — 18% lower floor price vs Q4 2025', element_type: 'pricing-card' }
    ]
  },
  {
    competitor: 'Vectra AI',
    url_label: 'AI Engine',
    change_type: 'feature_launch',
    significance: 'medium',
    days_ago: 5,
    ai_analysis: {
      headline: 'Vectra AI Ships Agent Behavioral Monitoring — Detecting Autonomous Agent Attacks (2026 Capability)',
      analysis: 'Vectra AI published new capability details for "AI Agent Behavioral Monitoring" — detecting when autonomous AI agents are compromised or behaving anomalously. This is a 2026 emerging capability (not GA) designed to monitor the AI agent ecosystem itself. 36 AI patents in behavioral threat detection. 170+ models for network/identity/cloud correlation. While narrow (NDR focus), this positions Vectra as the "agent security" layer above the SOC agents themselves — a potential long-term differentiation play.',
      category: 'feature_launch',
      urgency: 'medium',
      recommended_action: 'Note: this is a different TAM (securing agents, not replacing analysts). Not a direct competitive threat to 7AI today. Watch for Q3 2026 — if Vectra lands Fortune 500 customers for agent monitoring, it could expand into SOC automation.'
    },
    structural_changes: [
      { category: 'navigation', description: 'New "AI Agent Security" capability section added to products page — monitors autonomous agents as attack surface', element_type: 'nav-section' },
      { category: 'layout', description: '36 AI patents callout added to homepage hero — intellectual property moat positioning', element_type: 'hero' }
    ]
  },
  {
    competitor: 'CrowdStrike Charlotte AI',
    url_label: 'Pricing',
    change_type: 'pricing_change',
    significance: 'medium',
    days_ago: 4,
    ai_analysis: {
      headline: 'Charlotte AI Priced as Platform Add-On — $15-25/Endpoint/Month Premium Over Falcon Base',
      analysis: 'Post-RSA 2026 pricing intelligence shows Charlotte AI AgentWorks is positioned as a premium add-on to existing Falcon deployments: ~$15-25/endpoint/month on top of existing Falcon EDR contracts. For a 5,000-endpoint enterprise on Falcon, this adds $75K-$125K annually. This lock-in pricing model requires existing CrowdStrike customers. 7AI targets any enterprise SOC regardless of EDR vendor — that is the structural advantage in competitive sales.',
      category: 'pricing',
      urgency: 'medium',
      recommended_action: 'Lead with multi-vendor independence in pricing conversations. CrowdStrike requires Falcon. 7AI runs on whatever the customer already has.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'AgentWorks added as "Premium" tier requiring existing Falcon subscription — non-Falcon customers not eligible', element_type: 'pricing-card' }
    ]
  },
  {
    competitor: 'SentinelOne Purple AI',
    url_label: 'Hiring Signals',
    change_type: 'content_change',
    significance: 'low',
    days_ago: 2,
    ai_analysis: {
      headline: 'SentinelOne Opening 40+ "Agentic AI" Engineering Roles — Major Platform Investment Underway',
      analysis: 'Careers page shows 40+ new roles tagged "agentic AI" or "autonomous security" added in the 30 days post-RSA. Roles span: AI Infrastructure Engineers, Agentic Systems Architects, AI Safety Engineers, and SOC Automation Product Managers. This hiring surge (40+ headcount) signals Purple AI Athena is still building — not a fully realized platform. 7AI is running production. SentinelOne is still in platform build-out mode.',
      category: 'hiring',
      urgency: 'low',
      recommended_action: 'Use hiring signals in sales: "SentinelOne is hiring 40+ engineers to build what 7AI already has running in your production environment."'
    },
    structural_changes: [
      { category: 'navigation', description: 'New "AI Engineering" careers category added with 40+ open roles', element_type: 'nav-section' }
    ]
  }
];

// ── Competitive Brief HTML ───────────────────────────────────────
const BRIEF_SUBJECT = '7AI Intelligence Brief — RSA 2026 Competitive Analysis';
const BRIEF_HTML = `
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="background:#0d1117;color:#e6edf3;padding:32px;border-radius:12px 12px 0 0;border-bottom:1px solid #30363d;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#e8a230;margin-bottom:12px;">7AI Intelligence</div>
    <h1 style="font-size:24px;margin:0 0 8px;color:#fff;font-weight:700;">RSA 2026 Competitive Landscape</h1>
    <p style="font-size:14px;color:#8b949e;margin:0;">5 competitors tracked &bull; 34 URLs monitored &bull; Agentic SOC inflection point analysis</p>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;">

    <div style="background:#fff3cd;border-left:4px solid #e8a230;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <strong style="color:#7d4e00;">⚡ Structural Alert — Incumbent Defensive Reaction:</strong>
      <span style="color:#7d4e00;"> CrowdStrike Charlotte AI and SentinelOne Purple AI both went GA at RSA 2026 (March 23-26) — the incumbents are reacting to 7AI&rsquo;s agentic SOC positioning. This validates the market, but the window is open: neither has production-scale proof. 7AI has 2.5M alerts processed and 650K investigations completed.</span>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;">Executive Summary</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">RSA 2026 confirmed the agentic SOC category inflection. <strong>CrowdStrike and SentinelOne both launched full agentic ecosystems within days of each other</strong> — a direct reaction to 7AI&rsquo;s positioning. However, both are platform lock-in plays: Charlotte AI requires Falcon, Purple AI requires Singularity. 7AI owns the <strong>vendor-agnostic, multi-cloud, pure-play SOC automation</strong> positioning. The 12-18 month defensibility window is real — but the competitive messaging war starts now.</p>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Competitor Threat Matrix</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Competitor</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Position</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Key Threat</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Urgency</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">CrowdStrike Charlotte AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Ecosystem lock-in</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">10K+ Falcon customers, AgentWorks GA at RSA 2026</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">CRITICAL</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">SentinelOne Purple AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Data-centric AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Multi-vendor + FedRAMP HIGH, Athena release RSA 2026</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Exabeam Nova</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">TDIR consolidator</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">6-agent orchestration, 50% triage reduction claim</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Darktrace</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Legacy incumbent</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">18% price drop post-Thales; false positive reputation opening</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Vectra AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Behavioral NDR</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Agent behavioral monitoring emerging capability (not GA)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#f0fdf4;color:#16a34a;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">LOW</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">7AI Defensibility: The 12-18 Month Window</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Moat</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">7AI Position</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Competitor Gap</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Production Scale</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">2.5M alerts processed, 650K investigations</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CrowdStrike/SentinelOne: 0 production agentic customers</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Vendor Agnostic</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Works with any EDR/SIEM/cloud stack</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CrowdStrike requires Falcon; S1 requires Singularity</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Full Lifecycle</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Ingest &rarr; detect &rarr; investigate &rarr; respond &rarr; hunt</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Competitors: partial automation (triage OR response, not both)</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Founder Credibility</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Lior Div (Cybereason), Index/Blackstone/Greylock backing</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CrowdStrike/S1: incumbent platform teams, not pure-play founders</td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Agentic SOC Market Map</h2>
    <div style="background:#f9fafb;padding:20px;border-radius:8px;font-size:13px;font-family:monospace;color:#374151;line-height:1.8;">
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;PLATFORM CONSOLIDATION<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&uarr;<br>
      &nbsp;Exabeam Nova &larr;&mdash;&mdash;&mdash;&mdash;&mdash;&plus;&mdash;&mdash;&mdash;&mdash;&mdash;&rarr; CrowdStrike Charlotte<br>
      &nbsp;&nbsp;&nbsp;&nbsp;(TDIR/SIEM)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(EDR-centric)<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>
      VENDOR-AGNOSTIC &larr;&mdash;&mdash; 7AI &mdash;&mdash;&rarr; PLATFORM LOCK-IN<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(sweet spot)<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<br>
      &nbsp;&nbsp;&nbsp;Vectra AI (NDR) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;SentinelOne Purple<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&uarr;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&uarr;<br>
      &nbsp;Darktrace (legacy)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(SIEM-lite)<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&uarr;<br>
      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;POINT SOLUTION
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Recommended Actions (Q2 2026)</h2>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">1.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Production scale proof-point blitz:</strong> Publish &ldquo;2.5M alerts, 650K investigations&rdquo; benchmarks before CrowdStrike/S1 can claim comparable numbers (est. Q3 2026)</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">2.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Darktrace replacement campaign:</strong> Target accounts with Q2-Q3 2026 contract renewals &mdash; false positive complaints are documented and actionable</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">3.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Multi-vendor agnostic narrative:</strong> All competitors require platform buy-in. 7AI runs on what the customer already has. Make this the centerpiece of sales decks Q2 2026</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#e8a230;font-weight:700;">4.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>FedRAMP roadmap:</strong> SentinelOne already has FedRAMP HIGH. This is the key federal TAM gap &mdash; accelerate government authorization for 2026 pipeline</span></div>
    </div>

    <div style="margin-top:28px;padding:16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#6b7280;">
      <strong>Sources:</strong> CrowdStrike (RSA 2026), SentinelOne (RSA 2026), Darktrace, Vectra AI, Exabeam, Vendr, G2, Gartner &bull; Data as of March 29, 2026 &bull; 34 URLs monitored &bull; Confidence: HIGH
    </div>
  </div>

  <div style="background:#0d1117;color:#8b949e;padding:20px 32px;border-radius:0 0 12px 12px;font-size:12px;text-align:center;">
    Generated by <span style="color:#e8a230;">Spyglass</span> &bull; Autonomous competitive intelligence &bull; <a href="https://spyglass-10.polsia.app" style="color:#e8a230;text-decoration:none;">spyglass-10.polsia.app</a>
  </div>
</div>
`;

/**
 * Seeds 7AI demo data for Lior Div.
 * Creates 5 competitors, 34 URLs, 7 detected changes with AI analysis, and a brief.
 *
 * @param {object} client - PostgreSQL client (within transaction)
 * @param {number} userId - The user ID to seed data for
 */
async function seed7AIDemoData(client, userId) {
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

  // Create daily brief
  await client.query(
    `INSERT INTO daily_briefs (user_id, subject, html_content, text_content, changes_count, sent_at, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
    [
      userId,
      BRIEF_SUBJECT,
      BRIEF_HTML,
      '7AI Competitive Intelligence Brief — RSA 2026. 5 competitors tracked, 34 URLs monitored. CrowdStrike and SentinelOne both launched agentic SOC at RSA 2026.',
      DEMO_CHANGES.length
    ]
  );

  // Also write to exit-ready briefs table (dual-write for Exit-Ready schema)
  await client.query(
    `INSERT INTO briefs (user_id, title, content_md, reasoning_path, model_version, html_content, text_content, changes_count, sent_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
    [
      userId,
      BRIEF_SUBJECT,
      '7AI Competitive Intelligence Brief — RSA 2026. 5 competitors tracked, 34 URLs monitored. CrowdStrike and SentinelOne both launched agentic SOC at RSA 2026.',
      null,
      'gpt-4o-mini',
      BRIEF_HTML,
      '7AI Competitive Intelligence Brief — RSA 2026. 5 competitors tracked, 34 URLs monitored. CrowdStrike and SentinelOne both launched agentic SOC at RSA 2026.',
      DEMO_CHANGES.length
    ]
  );
}

module.exports = { seed7AIDemoData };
