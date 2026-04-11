/**
 * Maven AGI Demo Data Seeder
 * Pre-seeded competitive intelligence for Jonathan Corbin (Maven AGI).
 * AI Customer Support competitive landscape — Q1/Q2 2026.
 */
const crypto = require('crypto');

// ── Competitor Definitions (5 core players) ─────────────────────
const COMPETITORS = [
  {
    name: 'Zendesk AI',
    website: 'zendesk.com',
    urls: [
      { url: 'https://www.zendesk.com/platform/ai/', label: 'AI Platform Overview', url_type: 'features' },
      { url: 'https://www.zendesk.com/pricing/', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.zendesk.com/customer-service/ai-agent/', label: 'Autonomous AI Agent', url_type: 'features' },
      { url: 'https://www.zendesk.com/blog/', label: 'Blog', url_type: 'blog' },
      { url: 'https://www.zendesk.com/newsroom/', label: 'Press Releases', url_type: 'blog' }
    ]
  },
  {
    name: 'Intercom Fin',
    website: 'intercom.com',
    urls: [
      { url: 'https://www.intercom.com/fin', label: 'Fin AI Agent', url_type: 'features' },
      { url: 'https://www.intercom.com/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.intercom.com/blog/', label: 'Blog', url_type: 'blog' },
      { url: 'https://www.intercom.com/', label: 'Homepage', url_type: 'general' }
    ]
  },
  {
    name: 'Ada',
    website: 'ada.cx',
    urls: [
      { url: 'https://www.ada.cx/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.ada.cx/pricing', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.ada.cx/platform', label: 'Platform', url_type: 'features' },
      { url: 'https://www.ada.cx/blog/', label: 'Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'Forethought',
    website: 'forethought.ai',
    urls: [
      { url: 'https://forethought.ai/', label: 'Homepage', url_type: 'general' },
      { url: 'https://forethought.ai/solve/', label: 'Solve Product', url_type: 'features' },
      { url: 'https://forethought.ai/triage/', label: 'Triage Product', url_type: 'features' },
      { url: 'https://forethought.ai/blog/', label: 'Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'Kustomer AI',
    website: 'kustomer.com',
    urls: [
      { url: 'https://www.kustomer.com/platform/ai/', label: 'AI Platform', url_type: 'features' },
      { url: 'https://www.kustomer.com/pricing/', label: 'Pricing', url_type: 'pricing' },
      { url: 'https://www.kustomer.com/', label: 'Homepage', url_type: 'general' },
      { url: 'https://www.kustomer.com/blog/', label: 'Blog', url_type: 'blog' }
    ]
  }
];

// ── Detected Changes (the "aha moments") ────────────────────────
const DEMO_CHANGES = [
  {
    competitor: 'Zendesk AI',
    url_label: 'Pricing',
    change_type: 'pricing_change',
    significance: 'high',
    days_ago: 2,
    ai_analysis: {
      headline: 'Zendesk Launches Autonomous Resolution Pricing at $0.40/Resolved Ticket — Direct Assault on Per-Seat Model',
      analysis: 'Zendesk rolled out outcomes-based pricing for their Autonomous AI Agent: $0.40 per fully resolved ticket with zero agent seat required. For a 10,000-ticket/month operation, this is $4,000/month vs. $12,000-$18,000/month for a traditional seat-based support stack. This restructures the mid-market buying conversation entirely. The "per resolution" framing lets Zendesk win budget conversations on pure ROI math without the platform commitment conversation. Key risk for Maven AGI: Zendesk is using the same outcome-based pricing language but as an add-on to an existing install base of 100K+ customers. They don\'t need to sell a platform switch — they just need to activate an upgrade.',
      category: 'pricing',
      urgency: 'high',
      recommended_action: 'Counter with Maven\'s resolution quality advantage — Zendesk\'s $0.40/ticket hides CSAT risk from low-confidence deflections. Maven\'s resolution rate at high-confidence threshold is the metric to lead with. Build a "true cost per resolved ticket" calculator showing CSAT deflation costs.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'New "Pay per resolution" tier added — $0.40/ticket, no seat minimum, autonomous agent only', element_type: 'pricing-card' },
      { category: 'cta_change', description: 'Primary CTA changed from "Start free trial" to "See your ROI" — outcome-based framing replacing feature-based framing', element_type: 'button' },
      { category: 'navigation', description: '"Autonomous Agent" added as standalone navigation item — elevated from sub-feature to core product', element_type: 'nav-item' }
    ]
  },
  {
    competitor: 'Zendesk AI',
    url_label: 'Autonomous AI Agent',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 3,
    ai_analysis: {
      headline: 'Zendesk Autonomous Agent Now Handles Multi-Step Actions — Reads Live CRM Data, Updates Tickets, Processes Refunds',
      analysis: 'Zendesk\'s Autonomous Agent shipped agentic action capabilities: read live Salesforce/HubSpot fields mid-conversation, update order status in real-time, process full refunds without human approval (up to $250 threshold), and route escalations with full context transfer. This closes the "LLM that can only answer FAQs" gap that defined the previous generation of AI support tools. The $250 refund automation threshold is the key new capability — it handles 70%+ of e-commerce escalation volume without human touch.',
      category: 'features',
      urgency: 'high',
      recommended_action: 'Maven\'s enterprise integrations and structured data extraction remain a moat above the $250 threshold. Focus on complex use cases: multi-system orchestration, compliance-gated workflows, B2B account hierarchy management. Position Zendesk as "good for SMB e-commerce" and Maven as "the platform for complex enterprise support."'
    },
    structural_changes: [
      { category: 'layout', description: 'Autonomous Agent product page restructured around "actions" vs. previous "answers" framing — 6 action categories now shown with live demos', element_type: 'section' },
      { category: 'cta_change', description: '"See 100+ pre-built integrations" CTA added — integration library now a primary selling point', element_type: 'button' }
    ]
  },
  {
    competitor: 'Intercom Fin',
    url_label: 'Fin AI Agent',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 4,
    ai_analysis: {
      headline: 'Intercom Fin 2.0 Ships Multi-Step Reasoning + Live System Actions — Closes 18-Month Gap with Agentic Competitors',
      analysis: 'Fin 2.0 (March 2026) brings multi-step reasoning chains, persistent memory across conversation sessions, and live system writes — not just reads. Fin can now book appointments, update subscription tiers, process returns, and trigger workflows in 150+ integrations. The "persistent memory" feature is notable: Fin remembers previous conversations and adjusts resolution strategies. This is Intercom playing catch-up to the agentic positioning that Maven and others established in 2024-2025. Fin 2.0 closes the capability gap but does not close the quality gap — enterprise customers report Fin still struggles with ambiguous intent and multi-party B2B account structures.',
      category: 'feature_launch',
      urgency: 'high',
      recommended_action: 'Intercom\'s Fin 2.0 is their strongest release yet — it will win deals at sub-$50K ACV. Position Maven above that threshold with proof points on B2B complexity: multi-stakeholder tickets, structured data extraction, compliance-safe escalation paths. Fin 2.0 is the floor; Maven is the ceiling.'
    },
    structural_changes: [
      { category: 'layout', description: 'Fin product page completely rebuilt around "Fin 2.0" with multi-step reasoning demo as hero — previous single-turn Q&A framing retired', element_type: 'section' },
      { category: 'pricing_structure', description: 'Fin 2.0 priced separately from base Intercom — "Fin Add-on" at $99/seat/month or $0.99/resolution (outcome-based option)', element_type: 'pricing-card' },
      { category: 'cta_change', description: 'CTA updated to "Try Fin 2.0 free for 30 days" with no credit card — low-friction competitive evaluation push', element_type: 'button' }
    ]
  },
  {
    competitor: 'Ada',
    url_label: 'Platform',
    change_type: 'product_expansion',
    significance: 'medium',
    days_ago: 5,
    ai_analysis: {
      headline: 'Ada Pivots from Rule-Based to "Reasoning Engine" — Acquires Conversation Intelligence Startup to Close AI Gap',
      analysis: 'Ada announced its "Reasoning Engine" rebranding (March 2026), replacing their legacy decision-tree architecture with an LLM-powered reasoning layer. Ada also quietly acquired Observe.ai-style conversation intelligence capabilities (source: LinkedIn hiring surge in AI/ML roles). This is a major architectural pivot — Ada\'s legacy was robust no-code bot building for non-technical teams. The new architecture is more capable but may alienate their core SMB customer base that valued simplicity. Ada is burning cash to close the AI gap. Key watch: churn from SMB customers who find the new platform "too complex."',
      category: 'product_expansion',
      urgency: 'medium',
      recommended_action: 'Target Ada\'s mid-market accounts ($30K-$150K ACV) that outgrew the legacy rule-based architecture but haven\'t committed to the new Reasoning Engine. These customers are in evaluation mode. Maven\'s enterprise-grade architecture from day 1 is the contrast.'
    },
    structural_changes: [
      { category: 'navigation', description: '"Reasoning Engine" added as new core product section — replaces "Builder" as primary platform description', element_type: 'nav-item' },
      { category: 'layout', description: 'Homepage hero rewritten: "From bot to AI agent" replaces previous "Build your bot" — distancing from legacy rule-based positioning', element_type: 'hero' }
    ]
  },
  {
    competitor: 'Forethought',
    url_label: 'Solve Product',
    change_type: 'pricing_change',
    significance: 'medium',
    days_ago: 6,
    ai_analysis: {
      headline: 'Forethought Cuts Solve Entry Price 40% and Launches Freemium Tier — Capitulation to Competitive Pressure',
      analysis: 'Forethought dropped their Solve product entry price from $3,000/month to $1,800/month (40% reduction) and launched a freemium tier limited to 500 tickets/month. The freemium launch is a defensive move — Zendesk and Intercom\'s aggressive pricing is compressing Forethought\'s addressable market from below. Forethought\'s differentiation has always been Zendesk/Salesforce native integration and intent classification. But Zendesk\'s AI is now native, eliminating Forethought\'s primary integration advantage. This pricing move signals strategic pressure. Watch for acquisition interest from Zendesk or Freshworks (their primary platform partners).',
      category: 'pricing',
      urgency: 'medium',
      recommended_action: 'Forethought is losing ground. Their customers are your best pipeline — mid-market companies using Zendesk who bought Forethought as a bolt-on AI layer. That bolt-on value is now native to Zendesk. Those customers need a full-platform replacement conversation, which is Maven\'s position.'
    },
    structural_changes: [
      { category: 'pricing_structure', description: 'New "Starter" free tier added — 500 tickets/month, Zendesk integration only, no Salesforce. Entry paid tier reduced to $1,800/month.', element_type: 'pricing-card' },
      { category: 'cta_change', description: '"Start for free" CTA added to hero — replacing previous "Request demo" gated funnel', element_type: 'button' }
    ]
  },
  {
    competitor: 'Kustomer AI',
    url_label: 'AI Platform',
    change_type: 'feature_launch',
    significance: 'medium',
    days_ago: 4,
    ai_analysis: {
      headline: 'Kustomer Ships WhatsApp-Native AI Agent via Meta Integration — Targets High-Volume Messaging-First Support',
      analysis: 'Kustomer (owned by Meta) launched a WhatsApp-native AI agent that handles full resolution flows inside WhatsApp threads — no web widget, no portal redirect. This leverages Meta\'s Business API with zero per-message fees for Kustomer customers. For brands with high WhatsApp volume (Latin America, Southeast Asia, European retail), this is a significant capability. The 0-fee WhatsApp messaging model is a structural advantage no competitor can replicate — Meta is essentially subsidizing Kustomer\'s unit economics to grow WhatsApp Business usage. Key risk for Maven: brands with WhatsApp as primary support channel may find Kustomer\'s native integration compelling despite Kustomer\'s weaker AI reasoning.',
      category: 'feature_launch',
      urgency: 'medium',
      recommended_action: 'If Maven doesn\'t have WhatsApp-native AI resolution, this is a capability gap to address for international enterprise deals. Kustomer\'s advantage is the Meta subsidy, not the AI quality. Position Maven\'s AI quality + WhatsApp as a potential integration gap to close.'
    },
    structural_changes: [
      { category: 'navigation', description: '"WhatsApp AI" added as dedicated product section with Meta Business API integration docs', element_type: 'nav-item' },
      { category: 'layout', description: 'AI platform page restructured around channel-native AI: WhatsApp, email, chat — Maven/Zendesk primarily web-chat first', element_type: 'section' }
    ]
  },
  {
    competitor: 'Intercom Fin',
    url_label: 'Blog',
    change_type: 'content_change',
    significance: 'low',
    days_ago: 1,
    ai_analysis: {
      headline: 'Intercom Publishes "State of AI Customer Service 2026" Report — Claims 68% Resolution Rate Benchmark',
      analysis: 'Intercom released their annual benchmark report claiming Fin achieves 68% autonomous resolution rate across their customer base. The 68% headline number will be cited in every Fin sales deck from this point forward. Critical context: this is median across all Fin customers, including low-complexity B2C use cases (password resets, order status) that inflate the number. Enterprise B2B use cases with Maven-level complexity typically achieve 30-45% resolution rates for Fin. The report will create benchmark anchoring problems in competitive deals where prospects expect 60%+ resolution.',
      category: 'content',
      urgency: 'low',
      recommended_action: 'Prepare a Maven benchmark counter-narrative: "Resolution rate at what CSAT threshold?" Lead with resolution quality, not just quantity. A 90% resolution rate at 4.2/5 CSAT is better than 68% resolution at 3.6/5 CSAT. Request your account team build a CSAT-adjusted resolution benchmark.'
    },
    structural_changes: []
  }
];

// ── Competitive Brief HTML ───────────────────────────────────────
const BRIEF_SUBJECT = 'Maven AGI Intelligence Brief — AI Customer Support Competitive Landscape Q2 2026';
const BRIEF_HTML = `
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="background:#0f1117;color:#e6edf3;padding:32px;border-radius:12px 12px 0 0;border-bottom:1px solid #21262d;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#e8a230;margin-bottom:12px;">Maven AGI Intelligence</div>
    <h1 style="font-size:24px;margin:0 0 8px;color:#fff;font-weight:700;">AI Customer Support — Q2 2026 Competitive Landscape</h1>
    <p style="font-size:14px;color:#8b949e;margin:0;">5 competitors tracked &bull; 21 URLs monitored &bull; 7 strategic shifts detected</p>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;">

    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <strong style="color:#991b1b;">&#128680; Structural Threat — Pricing Model Disruption:</strong>
      <span style="color:#7f1d1d;"> Zendesk launched autonomous resolution pricing at $0.40/resolved ticket &mdash; restructuring the buying conversation from platform commitment to outcome-based ROI math. This will change how enterprise buyers evaluate Maven in competitive deals.</span>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;">Executive Summary</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">The AI customer support market hit a structural inflection in Q1 2026. <strong>Zendesk and Intercom both shipped agentic action capabilities</strong> (not just answer generation) and both adopted outcome-based pricing. Forethought is capitulating with price cuts. Ada is mid-pivot from rules to reasoning. <strong>Maven AGI&rsquo;s defensible position</strong>: enterprise-grade reasoning for complex B2B support, multi-system orchestration, and CSAT-quality resolution vs. raw deflection rate. The "race to the bottom on deflection rate" is Zendesk&rsquo;s game &mdash; Maven wins on resolution quality and enterprise complexity.</p>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Competitor Threat Matrix</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Competitor</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Key Move</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Maven Counter</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Urgency</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Zendesk AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">$0.40/resolved ticket pricing + agentic actions</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CSAT-quality resolution; B2B complexity moat</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Intercom Fin</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Fin 2.0: multi-step reasoning + system writes</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Enterprise ACV focus; Fin loses on complex B2B</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Ada</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Rules&rarr;Reasoning pivot; mid-market in flux</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Target Ada accounts outgrowing legacy arch</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Forethought</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">40% price cut + freemium launch</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Forethought customers need full-platform switch</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Kustomer AI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">WhatsApp-native AI via Meta (zero msg fees)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Channel gap if Maven lacks WhatsApp-native flow</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Pricing Landscape</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Platform</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Model</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Entry Point</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Target Market</th>
      </tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#e8a230;">Maven AGI</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Enterprise platform (seat + resolution)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$80K+ ARR</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Enterprise B2B</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Zendesk AI</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$0.40/resolved ticket (autonomous) + seat</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$19/seat/mo add-on</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">SMB &rarr; MM</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Intercom Fin</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$0.99/resolution or $99/seat/month</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$99/seat + Fin add-on</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">SMB &rarr; MM</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Ada</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Outcome-based (% deflection)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$30K ARR</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Mid-market</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Forethought</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Per-ticket + seat hybrid</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$1,800/month (new)</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">SMB &rarr; MM</td></tr>
      <tr><td style="padding:10px 12px;border:1px solid #e5e7eb;">Kustomer AI</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">Conversation-based CRM pricing</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">$89/user/month</td><td style="padding:10px 12px;border:1px solid #e5e7eb;">MM &rarr; Enterprise</td></tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Maven AGI Defensibility Moat</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f9fafb;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Moat</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Maven Advantage</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#6b7280;">Competitor Gap</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Resolution Quality</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CSAT-verified resolutions; confidence thresholds before auto-close</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Zendesk/Fin: deflection-focused, CSAT secondary</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">B2B Complexity</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Multi-stakeholder, account hierarchy, complex product knowledge</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Competitors optimized for B2C / simple B2B workflows</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Knowledge Architecture</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Structured knowledge ingestion; learns from ticket history</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Zendesk/Ada: retrieval-only, no structured knowledge graph</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Enterprise Trust</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">SOC2, granular audit trail, human-in-the-loop escalation SLAs</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Intercom Fin: no enterprise compliance pedigree</td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #e8a230;padding-bottom:8px;margin-top:28px;">Recommended Actions (Q2 2026)</h2>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">1.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Build CSAT-adjusted resolution benchmark:</strong> Counter Zendesk&rsquo;s $0.40/ticket ROI math with &ldquo;true cost per quality resolution.&rdquo; Deflection that reopens at 40% is worse than no deflection.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">2.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Target Ada migration:</strong> Ada&rsquo;s rules&rarr;reasoning pivot is creating mid-market churn. These customers are Maven-ready: mid-size enterprise, complex enough for Maven, frustrated with Ada&rsquo;s transition.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#e8a230;font-weight:700;">3.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Forethought displacement playbook:</strong> Forethought customers on Zendesk whose bolt-on AI is now native are perfect Maven prospects for a platform replacement conversation.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#e8a230;font-weight:700;">4.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>WhatsApp gap assessment:</strong> Kustomer&rsquo;s Meta-subsidized WhatsApp AI is a channel moat. Evaluate Maven&rsquo;s WhatsApp-native resolution story for international enterprise pipeline.</span></div>
    </div>

    <div style="margin-top:28px;padding:16px;background:#f9fafb;border-radius:8px;font-size:12px;color:#6b7280;">
      <strong>Sources:</strong> Zendesk (zendesk.com), Intercom (intercom.com), Ada (ada.cx), Forethought (forethought.ai), Kustomer (kustomer.com), G2, Gartner Magic Quadrant for CRM Customer Engagement, Forrester Wave &bull; Data as of March 29, 2026 &bull; Confidence: HIGH
    </div>
  </div>

  <div style="background:#0f1117;color:#8b949e;padding:20px 32px;border-radius:0 0 12px 12px;font-size:12px;text-align:center;">
    Generated by <span style="color:#e8a230;">Spyglass</span> &bull; Autonomous competitive intelligence &bull; <a href="https://spyglass-10.polsia.app" style="color:#e8a230;text-decoration:none;">spyglass-10.polsia.app</a>
  </div>
</div>
`;

/**
 * Seeds Maven AGI demo data for Jonathan Corbin.
 * Creates 5 competitors, 21 URLs, 7 detected changes with AI analysis, and a brief.
 *
 * @param {object} client - PostgreSQL client (within transaction)
 * @param {number} userId - The user ID to seed data for
 */
async function seedMavenDemoData(client, userId) {
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
      'Maven AGI Competitive Intelligence Brief — Q2 2026. 5 competitors tracked, 21 URLs monitored. Zendesk launched $0.40/resolved ticket pricing. Intercom Fin 2.0 ships agentic actions.',
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
      'Maven AGI Competitive Intelligence Brief — Q2 2026. 5 competitors tracked, 21 URLs monitored. Zendesk launched $0.40/resolved ticket pricing. Intercom Fin 2.0 ships agentic actions.',
      JSON.stringify(demoBriefChanges),
      'gpt-4o-mini',
      BRIEF_HTML,
      'Maven AGI Competitive Intelligence Brief — Q2 2026. 5 competitors tracked, 21 URLs monitored. Zendesk launched $0.40/resolved ticket pricing. Intercom Fin 2.0 ships agentic actions.',
      DEMO_CHANGES.length,
      JSON.stringify(demoBriefChanges)
    ]
  );
}

module.exports = { seedMavenDemoData };
