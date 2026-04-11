/**
 * Openly Demo Data Seeder
 * Pre-seeded competitive intelligence for Ty Harris (Openly / Premium Homeowners InsurTech).
 * InsurTech homeowners insurance competitive landscape — Q1/Q2 2026.
 *
 * Vertical: InsurTech / Premium Homeowners Insurance
 * Badge language: Underwriting, Agent Portal, Coverage, Premium, Partnership, Regulatory
 */
const crypto = require('crypto');

// ── Competitor Definitions (5 core players) ─────────────────────
const COMPETITORS = [
  {
    name: 'Hippo Insurance',
    website: 'hippo.com',
    urls: [
      { url: 'https://www.hippo.com/agent-partners', label: 'Agent Portal', url_type: 'features' },
      { url: 'https://www.hippo.com/smart-home', label: 'Smart Home Coverage', url_type: 'features' },
      { url: 'https://www.hippo.com/homeowners-insurance', label: 'Homeowners Overview', url_type: 'general' },
      { url: 'https://newsroom.hippo.com', label: 'Hippo Newsroom', url_type: 'blog' }
    ]
  },
  {
    name: 'Kin Insurance',
    website: 'kin.com',
    urls: [
      { url: 'https://www.kin.com/how-it-works', label: 'Aerial Underwriting', url_type: 'features' },
      { url: 'https://www.kin.com/pricing', label: 'Pricing & Coverage', url_type: 'pricing' },
      { url: 'https://www.kin.com/blog', label: 'Kin Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'State Farm',
    website: 'statefarm.com',
    urls: [
      { url: 'https://www.statefarm.com/insurance/home', label: 'Home Insurance Product', url_type: 'features' },
      { url: 'https://agents.statefarm.com', label: 'Agent Portal', url_type: 'general' },
      { url: 'https://newsroom.statefarm.com', label: 'State Farm Newsroom', url_type: 'blog' }
    ]
  },
  {
    name: 'Lemonade',
    website: 'lemonade.com',
    urls: [
      { url: 'https://www.lemonade.com/homeowners', label: 'Homeowners Product', url_type: 'features' },
      { url: 'https://www.lemonade.com/bundle', label: 'Bundle Offering', url_type: 'pricing' },
      { url: 'https://www.lemonade.com/blog', label: 'Lemonade Blog', url_type: 'blog' }
    ]
  },
  {
    name: 'Allstate',
    website: 'allstate.com',
    urls: [
      { url: 'https://www.allstate.com/home-insurance/coverage', label: 'Coverage & Aerial Risk', url_type: 'features' },
      { url: 'https://www.allstate.com/resources/home-insurance', label: 'Home Insurance Resources', url_type: 'general' }
    ]
  }
];

// ── Detected Changes (the "aha moments") ────────────────────────
// Badge types: Underwriting, Agent Portal, Coverage, Premium, Partnership, Regulatory
const DEMO_CHANGES = [
  {
    competitor: 'Hippo Insurance',
    url_label: 'Agent Portal',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 1,
    badge: 'Agent Portal',
    ai_analysis: {
      headline: "Hippo Launches '1-Click Agent Portal' for Smart Home Sensor Bundling — Targeting Openly's Independent Agent Network",
      analysis: "Hippo's new 1-Click Agent Portal allows independent agents to bundle smart home sensors with homeowners policies in a single workflow — reducing quote-to-bind time for sensor-equipped homes from 4 steps to 1. The portal includes automated leak detection discount applications (up to 10% premium reduction) and a 'Sensor Score' dashboard showing property risk reduction over time. This is a direct play for the independent agent channel — Openly's core distribution advantage. Beta data shows 32% higher retention rates for sensor-enrolled policies. The agent portal also offers co-branded marketing materials and a lead-sharing program that rewards agents for sensor enrollments. The threat: Hippo is making sensor-bundled homes easier to write through their portal than through traditional carriers, systematically repositioning themselves as the preferred smart home insurer in the independent agent channel.",
      category: 'features',
      urgency: 'high',
      recommended_action: "Respond with Openly's superior claims experience: Claimtouch 75% faster claims is a stronger agent retention story than Hippo's sensor discounts. Brief your top 20 independent agents this week with a 'Why Openly Wins' talk track that leads with claims speed + flexible underwriting, not premium discounting.",
      badges: ['Agent Portal']
    },
    structural_changes: [
      { category: 'layout', description: "New '1-Click Agent Portal' section added as primary navigation item on agent-partners page — was not present in prior snapshot", element_type: 'section' },
      { category: 'cta_change', description: "'Get Agent Access' CTA added with 'Sensor Score Dashboard' preview — targeting active independent agents", element_type: 'button' },
      { category: 'navigation', description: "'Agent Tools' added as dedicated sub-navigation under agent-partners", element_type: 'nav-item' }
    ]
  },
  {
    competitor: 'Kin Insurance',
    url_label: 'Aerial Underwriting',
    change_type: 'product_expansion',
    significance: 'high',
    days_ago: 2,
    badge: 'Underwriting',
    ai_analysis: {
      headline: "Kin Expands Aerial AI Underwriting to 6 New Gulf States — Completes 95% of Underwriting Decisions Without Physical Inspection",
      analysis: "Kin updated their underwriting methodology page to reflect expansion to 6 new Gulf Coast states (Louisiana, Mississippi, Alabama, Texas, Florida, Georgia) with 95% of underwriting decisions now completed without physical inspection. The new 'Aerial Clarity' system uses satellite imagery, NOAA storm track data, and lidar-derived roof condition scoring to price policies within 47 seconds of application. For Openly, this represents the acceleration of the D2C aerial underwriting threat: Kin is removing the physical inspection barrier that traditionally favored carriers with agent relationships, and replacing it with a speed/accuracy advantage that agents cannot replicate. In states where Kin competes, they are acquiring newly-purchased homes at the point of closing before agents can reach the buyer.",
      category: 'features',
      urgency: 'high',
      recommended_action: "Position Openly's manually-reviewed underwriting as a feature, not a limitation. Agents should present 'Openly underwrites your whole home, not just the satellite view' — appealing to homeowners with renovations, custom features, or unique properties that aerial AI consistently misprice. This is the underwriting quality moat.",
      badges: ['Underwriting']
    },
    structural_changes: [
      { category: 'layout', description: "'Aerial Clarity' system section added to how-it-works page with 6-state expansion map and 47-second claim", element_type: 'section' },
      { category: 'cta_change', description: "New '47-Second Quote' CTA added with state selector — designed to compete on speed in agent conversations", element_type: 'button' }
    ]
  },
  {
    competitor: 'State Farm',
    url_label: 'Home Insurance Product',
    change_type: 'content_change',
    significance: 'high',
    days_ago: 1,
    badge: 'Regulatory',
    ai_analysis: {
      headline: "State Farm Updates Aerial Risk Disclosure — 3 New ZIP Codes in Openly's Coverage Area Flagged for 18–24% Premium Increases",
      analysis: "State Farm's homeowners product page was updated March 28, 2026 to include an expanded 'Aerial Risk Factors' disclosure section citing high-resolution satellite underwriting data. Three ZIP codes in Texas Gulf Coast corridor markets where Openly operates now appear on State Farm's premium surcharge schedule with increases of 18–24% for homes with 'elevated aerial risk scores.' The disclosure language is careful, but the mechanism is clear: State Farm is using aerial AI to implement hyper-local risk selection — non-renewing policies in high-risk ZIPs while publicly attributing increases to 'market conditions.' This is the 'Quiet Cancellations' pattern. Openly picks up these orphaned policies, which can be good business IF priced correctly. The risk: if Openly is writing the risks State Farm won't, Openly's portfolio needs superior claims data (Claimtouch) to validate the risk acceptance.",
      category: 'regulatory',
      urgency: 'high',
      recommended_action: "The 3 flagged ZIP codes are an opportunity, not a threat — IF Openly has pricing confidence there. Pull Claimtouch claims history for those ZIPs. If loss ratios support it, Openly should proactively market to State Farm non-renewals in those areas. The 'State Farm rejected you, Openly will cover you' message resonates with homeowners in withdrawal markets.",
      badges: ['Regulatory', 'Premium']
    },
    structural_changes: [
      { category: 'layout', description: "New 'Aerial Risk Factors' disclosure section added to home insurance product page — lists 12 new ZIP-level premium factors", element_type: 'section' },
      { category: 'pricing_structure', description: "Premium calculation disclosure updated — 'Aerial Assessment Score' now listed as a primary rating factor alongside claims history", element_type: 'pricing-card' }
    ]
  },
  {
    competitor: 'Lemonade',
    url_label: 'Bundle Offering',
    change_type: 'product_expansion',
    significance: 'medium',
    days_ago: 3,
    badge: 'Coverage',
    ai_analysis: {
      headline: "Lemonade Bundles Homeowners + Auto + Pet in Single Policy — AI Cross-Sell at Claims Time Targets Millennial Lock-In",
      analysis: "Lemonade updated their bundle offering to include homeowners, auto, pet, and life insurance in a single payment and renewal flow. The new 'Everything Bundle' includes AI-driven cross-sell at claims time — when a homeowner files a claim, Lemonade's AI identifies and quotes adjacent coverage gaps, converting claims experiences into upsell opportunities. For Gen Z and Millennial homeowners (32% of Openly's addressable market in the next 5 years), the appeal of a single app, single payment, and AI-managed claims creates switching costs that traditional agent-channel carriers struggle to replicate. Openly's Claimtouch (75% faster claims) is the strongest competitive counter, but needs active marketing in the 25-40 demographic cohort before Lemonade builds a generational lock-in moat.",
      category: 'features',
      urgency: 'medium',
      recommended_action: "Openly should develop a 'Speed vs. App' competitive counter: Lemonade's app is sticky, but Openly's Claimtouch settles 75% faster. For high-value homeowners (Openly's premium tier), claims speed and coverage quality matter more than app convenience. Create testimonial content around fast Claimtouch settlements to differentiate on the metric that matters at the worst moment.",
      badges: ['Coverage', 'Partnership']
    },
    structural_changes: [
      { category: 'layout', description: "'Everything Bundle' section added to bundle page with single-app multi-line enrollment flow", element_type: 'section' },
      { category: 'cta_change', description: "'Bundle & Save' CTA now leads with AI cross-sell messaging: 'Your AI will handle the rest'", element_type: 'button' }
    ]
  },
  {
    competitor: 'Hippo Insurance',
    url_label: 'Smart Home Coverage',
    change_type: 'pricing_change',
    significance: 'medium',
    days_ago: 4,
    badge: 'Underwriting',
    ai_analysis: {
      headline: "Hippo Smart Home Risk Score Now Drives Renewal Premiums — Sensor-Enrolled Homes Get Up to 15% Rate Reduction Automatically",
      analysis: "Hippo updated their smart home page to clarify that their 'Home Intelligence Score' now directly feeds into renewal premium calculations. Homes with active leak, fire, and security sensors receive automatic premium reductions of 5–15% at renewal with no agent involvement. This creates a self-reinforcing retention loop: sensor-enrolled homes get cheaper, and cheaper homes renew at higher rates. The strategic implication: Hippo is building a risk selection engine that doesn't need traditional underwriting judgment — it needs sensor data. Carriers without sensor network distribution will increasingly underwrite residual risk. Openly's agent channel is currently the best path to sensor-enrolled homes — the question is whether Openly has a sensor partnership strategy to compete.",
      category: 'pricing',
      urgency: 'medium',
      recommended_action: "Openly should evaluate a sensor partnership program (Notion, Ring, SimpliSafe) that independent agents can present during the quote. Even a 5% premium discount for sensor enrollment generates retention data and positions Openly ahead of Hippo in agent conversations. This doesn't require building a hardware product — just a discount program.",
      badges: ['Underwriting', 'Premium']
    },
    structural_changes: [
      { category: 'pricing_structure', description: "'Home Intelligence Score' now prominently featured on smart home page with renewal discount visualization showing 5–15% range", element_type: 'pricing-card' },
      { category: 'cta_change', description: "'Check Your Score' CTA added — links to sensor enrollment portal for existing policyholders", element_type: 'button' }
    ]
  },
  {
    competitor: 'Allstate',
    url_label: 'Coverage & Aerial Risk',
    change_type: 'content_change',
    significance: 'medium',
    days_ago: 5,
    badge: 'Underwriting',
    ai_analysis: {
      headline: "Allstate Aerial Risk Disclosure: 5-Tier 'Risk Band' System Creates Orphaned Policies — Openly's Flexible Underwriting Is the Counter",
      analysis: "Allstate updated their homeowners coverage disclosure to add a 'Aerial Risk Assessment' section describing their AI-based property scoring system. Properties are scored on a 5-tier 'Risk Band' system (A through E) using aerial imagery, with Band D/E properties facing automatic premium loading of 22–35% or non-renewal. Allstate's rigid band system creates predictable pricing for low-risk properties but orphans Band D/E homes — properties that are technically insurable but not desirable to Allstate's aerial AI. Compare to Openly's flexible underwriting: Openly manually reviews Band-equivalent properties and writes policies based on actual condition plus Claimtouch claims history, accepting risks that Allstate's rigid aerial bands reject. In markets where Allstate is retreating, Openly is the logical landing spot for independent agents moving those books of business.",
      category: 'regulatory',
      urgency: 'medium',
      recommended_action: "Train Openly's agent partners on the Allstate Band D/E opportunity: these homes are not bad risks — they are mischaracterized by aerial AI that can't see renovations, updated roofs, or improved features. Openly's manual review process is a sellable advantage. Create a one-pager: 'When Allstate says no, Openly says let's look closer.'",
      badges: ['Underwriting', 'Regulatory']
    },
    structural_changes: [
      { category: 'layout', description: "'Aerial Risk Assessment' section added to coverage page — first disclosure of 5-tier Risk Band system", element_type: 'section' },
      { category: 'pricing_structure', description: "Coverage disclosure updated to list 'Aerial Risk Score' as a primary factor in rate calculation and renewal eligibility", element_type: 'pricing-card' }
    ]
  },
  {
    competitor: 'Kin Insurance',
    url_label: 'Kin Blog',
    change_type: 'content_change',
    significance: 'low',
    days_ago: 6,
    badge: 'Partnership',
    ai_analysis: {
      headline: "Kin Signs Embedded Insurance Distribution with Doma (PropTech Closing Platform) — 180,000 Annual Closings in Funnel",
      analysis: "Kin's blog announced an embedded insurance distribution integration with Doma, a proptech closing platform covering ~180,000 real estate closings annually. The integration embeds Kin homeowners quotes directly into the closing workflow, presenting coverage options at the point of purchase before the buyer has engaged an independent agent. If Zillow or Redfin were to follow with similar integrations, the point-of-purchase acquisition channel would be firmly outside the independent agent model entirely. For Openly, the concern is precedent: embedded insurance at transaction time is the most efficient acquisition channel for new homeowners, and it bypasses the agent channel that Openly depends on. This is a 3–5 year threat, not a 90-day one.",
      category: 'partnership',
      urgency: 'low',
      recommended_action: "Monitor Kin's embedded partnership announcements. If they sign a Zillow or Redfin partnership in the next 12 months, this escalates to HIGH urgency. For now, ensure Openly's agent relationships are deep enough that agents proactively recommend Openly at closing before any embedded quote surfaces. Agent incentive programs are the moat.",
      badges: ['Partnership']
    },
    structural_changes: [
      { category: 'layout', description: "New blog post: 'Kin Partners with Doma for Embedded Coverage at Closing' — announces proptech distribution integration", element_type: 'section' }
    ]
  }
];

// ── Competitive Brief HTML ───────────────────────────────────────
const BRIEF_SUBJECT = 'Openly Intelligence Brief — Homeowners InsurTech Competitive Landscape Q2 2026';
const BRIEF_HTML = `
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="background:#050e1f;color:#e2e8f0;padding:32px;border-radius:12px 12px 0 0;border-bottom:2px solid #0ea5e9;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#0ea5e9;margin-bottom:12px;">Openly Intelligence</div>
    <h1 style="font-size:24px;margin:0 0 8px;color:#fff;font-weight:700;">Homeowners InsurTech — Q2 2026 Competitive Landscape</h1>
    <p style="font-size:14px;color:#94a3b8;margin:0;">5 competitors tracked &bull; 15 URLs monitored &bull; 7 structural shifts detected &bull; Data as of March 29, 2026</p>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;">

    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <strong style="color:#991b1b;">&#128680; Priority Alert — Agent Channel Disruption:</strong>
      <span style="color:#7f1d1d;"> Hippo just launched a '1-Click Agent Portal' for Smart Home sensors — targeting your independent agent network. Sensor-bundled homes now bind faster through Hippo than through traditional carriers. 32% higher retention rates reported in beta.</span>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
      <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Underwriting</span>
      <span style="background:#fff7ed;color:#c2410c;border:1px solid #fdba74;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Agent Portal</span>
      <span style="background:#f0fdf4;color:#15803d;border:1px solid #86efac;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Coverage</span>
      <span style="background:#fefce8;color:#a16207;border:1px solid #fde047;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Premium</span>
      <span style="background:#faf5ff;color:#7e22ce;border:1px solid #c4b5fd;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Partnership</span>
      <span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Regulatory</span>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #0ea5e9;padding-bottom:8px;">Executive Summary</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">The premium homeowners InsurTech market is entering a bifurcation event in 2026: incumbents (State Farm, Allstate) are using aerial AI to <em>abandon</em> difficult-to-price risks, while challengers (Hippo, Kin) are using it to <em>cherry-pick</em> low-risk homes. Openly sits at the intersection — writing policies that aerial AI mischaracterizes while defending the independent agent channel from disruption. <strong>Three structural shifts define Q2 2026:</strong> (1) Hippo's Agent Portal brings sensor-bundled homes into their distribution at agent-level speed; (2) Kin's aerial AI expansion eliminates inspection friction in 6 Gulf states; (3) State Farm's aerial risk disclosures reveal systematic withdrawal from markets where Openly operates. <strong>Openly's defensible moat:</strong> Claimtouch (75% faster claims) + flexible underwriting that manually reviews what aerial AI rejects — the two advantages no aerial-first carrier can replicate without changing their core architecture.</p>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #0ea5e9;padding-bottom:8px;margin-top:28px;">Competitive Threat Matrix</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f0f9ff;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Competitor</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Key Move</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Openly Counter</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Threat</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Hippo Insurance</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">1-Click Agent Portal + smart home sensor bundling</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Claimtouch speed &gt; sensor discounts in agent retention; premium home focus</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Kin Insurance</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Aerial AI underwrites 95% of decisions; 6-state Gulf Coast expansion</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Manual review = better risk on custom/renovated homes; Kin misses what aerial can't see</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">State Farm</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">"Quiet Cancellations" — withdrawing from 3+ ZIPs via aerial surcharges</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">State Farm orphaned policies = Openly market opportunity in withdrawal ZIPs</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">OPP</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Lemonade</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Everything Bundle + AI cross-sell at claims; Gen Z/Millennial lock-in</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">75% faster claims vs. app convenience; premium homeowners prioritize quality over UI</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Allstate</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">5-tier Aerial Risk Band system — Band D/E homes face 22–35% surcharges or non-renewal</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Allstate Band D/E = Openly opportunity; manual review beats rigid aerial banding</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#f0fdf4;color:#15803d;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">OPP</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #0ea5e9;padding-bottom:8px;margin-top:28px;">The 16% Premium Trap — Aerial AI Creates Orphaned Policies</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">State Farm and Allstate's aerial AI systems are generating an estimated <strong>16% of homeowners policies</strong> in Openly's target markets as "orphaned" — homes that incumbents are pricing out of reach or non-renewing based on aerial risk scores that cannot account for renovations, updated roofs, or structural improvements. This creates:</p>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;"><span style="color:#0ea5e9;font-weight:700;">1.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Opportunity:</strong> Aerial-rejected homeowners are motivated buyers with immediate coverage needs — high conversion, lower competition.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;"><span style="color:#0ea5e9;font-weight:700;">2.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Risk:</strong> Openly writes what aerial AI rejects — which means adverse selection risk if Claimtouch data doesn't confirm the manual underwriting thesis.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#0ea5e9;font-weight:700;">3.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Defense:</strong> The Claimtouch partnership (75% faster claims) creates claims data that validates aerial-rejected risks over time — a proprietary dataset that justifies continued writing.</span></div>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #0ea5e9;padding-bottom:8px;margin-top:28px;">Side-by-Side: Allstate Aerial Risk vs. Openly Flexible Underwriting</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f0f9ff;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Factor</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#1d4ed8;">Allstate (Aerial Risk Bands)</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#0ea5e9;">Openly (Flexible Underwriting)</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Risk Assessment</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">5-tier aerial band (A–E); automated; no override</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Aerial data + manual review + Claimtouch history; override available</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Renovated Homes</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Scored on prior aerial snapshot; renovation not captured until re-flight</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Agent can submit renovation documentation; manual adjuster reviews</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Band D/E Response</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">22–35% surcharge or non-renewal; no path to Band A/B without re-flight</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Manual review; Claimtouch data informs pricing; can write what Allstate rejects</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Claims Speed</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Standard (industry avg: 14–21 days to settle)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;"><strong>Claimtouch: 75% faster — avg 3–5 days to settle</strong></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Agent Channel</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Captive agents; limited independent agent distribution</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Independent agent first; agent-friendly underwriting</td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #0ea5e9;padding-bottom:8px;margin-top:28px;">Recommended Product/Underwriting Actions (Q2 2026)</h2>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#0ea5e9;font-weight:700;">1.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Agent channel defense — brief top agents on '1-Click vs. Claimtouch':</strong> Hippo's agent portal is a speed play; Openly's counter is claims experience + flexible underwriting. Create a 1-page agent deck this week: "Why Openly wins on what matters when it matters — at the claim."</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#0ea5e9;font-weight:700;">2.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Market the Allstate Band D/E opportunity:</strong> Train agent partners to identify and reroute Allstate non-renewals to Openly. "When Allstate says no, Openly says let's look closer." These homes are motivated, high-conversion leads with no other obvious landing spot.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#0ea5e9;font-weight:700;">3.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Claimtouch as lead product message:</strong> 75% faster claims is more defensible than any aerial AI claim. Make it the top-line marketing message in Kin/Hippo overlap markets. Lemonade leads with AI-managed claims; Openly should lead with AI-powered claims settlement speed.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#0ea5e9;font-weight:700;">4.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Evaluate sensor partnership program:</strong> A Notion/Ring/SimpliSafe discount program (5–10% premium reduction) counters Hippo's Smart Home Risk Score without requiring Openly to build hardware infrastructure. Independent agents can present this as Openly's smart home answer.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;"><span style="color:#0ea5e9;font-weight:700;">5.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Monitor Kin's embedded partnership pipeline:</strong> If Kin or Hippo announces a Zillow or Redfin integration in the next 12 months, the agent channel threat escalates significantly. Deepen agent incentive programs now as a structural moat against point-of-purchase embedded insurance.</span></div>
    </div>

    <div style="margin-top:28px;padding:16px;background:#f0f9ff;border-radius:8px;font-size:12px;color:#374151;border:1px solid #bae6fd;">
      <strong>Sources:</strong> Hippo (hippo.com), Kin Insurance (kin.com), State Farm (statefarm.com), Lemonade (lemonade.com), Allstate (allstate.com), NOAA Storm Track Data, National Association of Insurance Commissioners (NAIC), PropertyCasualty360 &bull; Data as of March 29, 2026 &bull; Confidence: HIGH
    </div>
  </div>

  <div style="background:#050e1f;color:#94a3b8;padding:20px 32px;border-radius:0 0 12px 12px;font-size:12px;text-align:center;">
    Generated by <span style="color:#0ea5e9;">Spyglass</span> &bull; Autonomous competitive intelligence &bull; <a href="https://spyglass-10.polsia.app" style="color:#0ea5e9;text-decoration:none;">spyglass-10.polsia.app</a>
  </div>
</div>
`;

/**
 * Seeds Openly demo data for Ty Harris (Premium Homeowners InsurTech).
 * Creates 5 competitors, 15 URLs, 7 detected changes with InsurTech AI analysis, and a brief.
 *
 * @param {object} client - PostgreSQL client (within transaction)
 * @param {number} userId - The user ID to seed data for
 */
async function seedOpenlyDemoData(client, userId) {
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
        "INSERT INTO monitored_urls (competitor_id, url, label, url_type, last_checked_at) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day') RETURNING id",
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
      "Openly Intelligence Brief — Homeowners InsurTech Q2 2026. 5 competitors tracked, 15 URLs monitored. Hippo launched 1-Click Agent Portal targeting independent agent network. Kin aerial AI expands to 6 Gulf states. State Farm disclosing aerial risk surcharges in Openly coverage areas. Allstate 5-tier Risk Band system creating orphaned policy opportunity.",
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
      "Openly Intelligence Brief — Homeowners InsurTech Q2 2026. 5 competitors tracked, 15 URLs monitored. Hippo launched 1-Click Agent Portal targeting independent agent network. Kin aerial AI expands to 6 Gulf states. State Farm disclosing aerial risk surcharges in Openly coverage areas. Allstate 5-tier Risk Band system creating orphaned policy opportunity.",
      JSON.stringify(demoBriefChanges),
      'gpt-4o-mini',
      BRIEF_HTML,
      "Openly Intelligence Brief — Homeowners InsurTech Q2 2026. 5 competitors tracked, 15 URLs monitored. Hippo launched 1-Click Agent Portal targeting independent agent network. Kin aerial AI expands to 6 Gulf states. State Farm disclosing aerial risk surcharges in Openly coverage areas. Allstate 5-tier Risk Band system creating orphaned policy opportunity.",
      DEMO_CHANGES.length,
      JSON.stringify(demoBriefChanges)
    ]
  );
}

module.exports = { seedOpenlyDemoData };
