/**
 * Method AI Demo Data Seeder
 * Pre-seeded competitive intelligence for Doug Teany (Method AI / Surgical Navigation).
 * Surgical robotics & AI navigation competitive landscape — Q1/Q2 2026.
 *
 * Vertical: Medtech / Surgical Navigation
 * Badge language: FDA, 510(k), Clinical Trials, Product Launch, Partnership, Patent
 */
const crypto = require('crypto');

// ── Competitor Definitions (4 core players) ─────────────────────
const COMPETITORS = [
  {
    name: 'Intuitive Surgical',
    website: 'intuitivesurgical.com',
    urls: [
      { url: 'https://www.intuitivesurgical.com/products/da-vinci-surgical-system/', label: 'da Vinci Platform', url_type: 'features' },
      { url: 'https://www.intuitivesurgical.com/products/ion/', label: 'Ion Endoscopic System', url_type: 'features' },
      { url: 'https://www.intuitivesurgical.com/company/news/', label: 'Press Releases', url_type: 'blog' },
      { url: 'https://www.intuitivesurgical.com/clinical-resources/', label: 'Clinical Resources', url_type: 'general' },
      { url: 'https://www.intuitivesurgical.com/products/vision/', label: 'Vision Technology', url_type: 'features' }
    ]
  },
  {
    name: 'Medtronic Digital Surgery',
    website: 'medtronic.com',
    urls: [
      { url: 'https://www.medtronic.com/en-us/therapies-conditions/surgery/digital-surgery.html', label: 'Digital Surgery Platform', url_type: 'features' },
      { url: 'https://www.medtronic.com/en-us/therapies-conditions/neurosurgery/stealthstation.html', label: 'StealthStation Navigation', url_type: 'features' },
      { url: 'https://www.medtronic.com/en-us/products-therapies/surgical-robots/hugo.html', label: 'Hugo RAS System', url_type: 'features' },
      { url: 'https://news.medtronic.com/', label: 'Medtronic Newsroom', url_type: 'blog' }
    ]
  },
  {
    name: 'J&J MedTech (Ottava / Auris)',
    website: 'jnjmedtech.com',
    urls: [
      { url: 'https://www.jnjmedtech.com/en-US/product/ottava', label: 'Ottava Surgical Robot', url_type: 'features' },
      { url: 'https://www.aurishealth.com/monarch-platform', label: 'Monarch Bronchoscopy Platform', url_type: 'features' },
      { url: 'https://www.jnjmedtech.com/en-US/innovations/robotic-surgery', label: 'Robotic Surgery', url_type: 'features' },
      { url: 'https://www.jnjmedtech.com/en-US/newsroom', label: 'MedTech Newsroom', url_type: 'blog' }
    ]
  },
  {
    name: 'Siemens Healthineers',
    website: 'siemens-healthineers.com',
    urls: [
      { url: 'https://www.siemens-healthineers.com/digital-health-services/artificial-intelligence', label: 'AI Navigation Platform', url_type: 'features' },
      { url: 'https://www.siemens-healthineers.com/interventional-imaging', label: 'Interventional Imaging', url_type: 'features' },
      { url: 'https://www.siemens-healthineers.com/news', label: 'Newsroom', url_type: 'blog' },
      { url: 'https://www.siemens-healthineers.com/oncology', label: 'Oncology Navigation', url_type: 'features' }
    ]
  }
];

// ── Detected Changes (the "aha moments") ────────────────────────
// Badge types: FDA Filing, Clinical Trial, Product Launch, Partnership, Patent
const DEMO_CHANGES = [
  {
    competitor: 'Medtronic Digital Surgery',
    url_label: 'Digital Surgery Platform',
    change_type: 'product_expansion',
    significance: 'high',
    days_ago: 1,
    badge: 'Product Launch',
    ai_analysis: {
      headline: 'Medtronic Digital Surgery Documentation Updated: 3D Intraoperative Ultrasound Integration Detected in Early Testing',
      analysis: 'Medtronic\'s Digital Surgery documentation was updated March 28, 2026 to include references to "real-time 3D ultrasound overlay" within the StealthStation navigation workflow. The new documentation section describes ultrasound-to-CT registration for soft tissue visualization — a direct response to the core gap in optical navigation systems (inability to track organ shift in real time). This capability, if cleared via 510(k) De Novo pathway, would allow StealthStation to maintain anatomical accuracy through the full surgical procedure rather than relying on pre-op imaging alone. Early testing language suggests Phase I clinical validation is underway at Mayo Clinic and Cleveland Clinic sites. This is a structural threat to pure AI navigation companies that rely on pre-operative imaging stacks — Medtronic is attacking intraoperative ground truth from the hardware layer.',
      category: 'product_expansion',
      urgency: 'high',
      recommended_action: 'Accelerate Method AI\'s intraoperative adaptation pipeline. The ultrasound-to-AI registration gap is the next competitive battleground. If Method AI\'s navigation layer can ingest live ultrasound streams before Medtronic achieves full 510(k) clearance, you own the software layer above their hardware. Timeline advantage: estimated 18-24 months to US market clearance for Medtronic\'s integrated system.',
      badges: ['Product Launch', 'FDA Filing']
    },
    structural_changes: [
      { category: 'layout', description: 'New "3D Ultrasound Integration" section added to StealthStation documentation page — was not present in prior snapshot', element_type: 'section' },
      { category: 'cta_change', description: 'New "Request Early Access" CTA added for ultrasound integration module — gated with "Investigational Use Only" disclaimer', element_type: 'button' },
      { category: 'navigation', description: '"Intraoperative Imaging" added as new sub-navigation item under Digital Surgery', element_type: 'nav-item' }
    ]
  },
  {
    competitor: 'Intuitive Surgical',
    url_label: 'Vision Technology',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 3,
    badge: 'FDA Filing',
    ai_analysis: {
      headline: 'Intuitive Surgical Files 510(k) for da Vinci Vision v2 — Subsurface Near-Infrared Tissue Visualization Beyond Fluorescent Markers',
      analysis: 'Intuitive Surgical filed a 510(k) application (K261847) for da Vinci Vision v2 on March 26, 2026. The filing covers a new near-infrared (NIR) tissue visualization mode that does not require fluorescent marker injection — a significant advance over current Firefly fluorescence imaging that requires ICG dye administration. Vision v2 uses AI-enhanced spectral analysis to delineate subsurface vasculature, lymphatic structures, and tissue layers at up to 8mm depth. For surgical navigation, this competes directly with intraoperative imaging navigation by providing real-time anatomical context from the camera without external navigation hardware. If cleared (estimated Q4 2026 based on FDA standard review timeline), Vision v2 would eliminate the need for a separate navigation overlay system in soft tissue procedures — Method AI\'s primary addressable market.',
      category: 'features',
      urgency: 'high',
      recommended_action: 'Immediate strategic response needed. Vision v2\'s camera-based navigation substitute is a platform threat in soft tissue procedures. Method AI must demonstrate value above and beyond visual navigation — focus on multi-modal fusion (CT+MRI+ultrasound+camera), anatomical model accuracy tracking, and pre-op surgical plan integration that da Vinci\'s standalone camera cannot replicate.',
      badges: ['FDA Filing']
    },
    structural_changes: [
      { category: 'layout', description: 'Vision Technology page restructured — new "Vision v2 (Under Review)" section added with FDA submission acknowledgment', element_type: 'section' },
      { category: 'pricing_structure', description: 'Vision v2 pricing placeholder added — "Available upon clearance" with "Contact for Enterprise Licensing" CTA', element_type: 'pricing-card' },
      { category: 'cta_change', description: '"Vision v2 Early Access Program" CTA — collecting interest from existing da Vinci facilities', element_type: 'button' }
    ]
  },
  {
    competitor: 'Intuitive Surgical',
    url_label: 'Ion Endoscopic System',
    change_type: 'feature_launch',
    significance: 'high',
    days_ago: 5,
    badge: 'Clinical Trial',
    ai_analysis: {
      headline: 'Intuitive Ion Expands AI-Guided Biopsy Targeting: NAVIGATE-AI Phase III Trial Initiates at 24 US Sites',
      analysis: 'Intuitive Surgical published protocol documents for NAVIGATE-AI, a Phase III multi-center RCT evaluating AI-guided peripheral pulmonary nodule targeting via the Ion bronchoscopy platform (ClinicalTrials.gov NCT05891847). The trial targets 1,200 patients across 24 US academic medical centers with a primary endpoint of biopsy yield accuracy (>90% sensitivity for nodules <20mm). The AI targeting system uses CT-to-bronchoscopy registration with real-time AI confidence scoring for needle placement. This study is directly relevant to any AI navigation system competing in thoracic oncology guidance — Intuitive is building an evidence moat. With 24 sites, this trial will generate the largest prospective dataset for AI bronchoscopy targeting to date. By Q1 2027, Intuitive will have Level I evidence to cite in every sales conversation in this indication.',
      category: 'clinical_trial',
      urgency: 'high',
      recommended_action: 'Method AI should initiate or partner on a prospective clinical study within 6 months. Competitors with published RCT data will dominate hospital procurement decisions. Target a Phase II/III trial in your highest-confidence indication with a minimum of 8-10 academic sites. Evidence generation is now a competitive moat, not just a regulatory requirement.',
      badges: ['Clinical Trial', 'FDA Filing']
    },
    structural_changes: [
      { category: 'layout', description: 'Ion Clinical Evidence section expanded — new trial summary cards with real-time enrollment progress indicators', element_type: 'section' },
      { category: 'navigation', description: '"Clinical Studies" added as dedicated navigation item on Ion product page', element_type: 'nav-item' }
    ]
  },
  {
    competitor: 'Medtronic Digital Surgery',
    url_label: 'Hugo RAS System',
    change_type: 'feature_launch',
    significance: 'medium',
    days_ago: 6,
    badge: 'FDA Filing',
    ai_analysis: {
      headline: 'Medtronic Hugo RAS Submits 510(k) Premarket Notification for US Market — Urologic and Gynecologic Indications',
      analysis: 'Medtronic submitted a 510(k) De Novo application for the Hugo Robotic-Assisted Surgery system for urologic (radical prostatectomy) and gynecologic (hysterectomy) indications in the US market. Hugo is already CE-marked in Europe and approved in ~70 countries. The US 510(k) is the final barrier to direct competition with da Vinci in its core markets. If cleared (FDA typically reviews 510(k) in 3-6 months for Class II devices), Hugo will enter the US market with a compelling pricing angle — Medtronic has consistently priced Hugo below da Vinci for capital equipment and instruments. In international markets, Hugo is priced ~30% below comparable da Vinci configurations. A cleared Hugo in the US creates significant pricing pressure on the soft tissue robotics segment, which affects the capital purchasing environment that AI navigation companies depend on.',
      category: 'regulatory',
      urgency: 'medium',
      recommended_action: 'Hugo US entry creates platform competition for da Vinci — and Method AI should position as platform-agnostic from day one. Surgeon access to Hugo-compatible AI navigation will be a differentiator when Hugo starts penetrating community hospitals (da Vinci\'s strongholds). Develop Hugo-compatible integration before US clearance.',
      badges: ['FDA Filing']
    },
    structural_changes: [
      { category: 'layout', description: '"US FDA Submission" badge added to Hugo product page header — with "Pending Review" status indicator', element_type: 'section' },
      { category: 'cta_change', description: 'New "Express Interest: US Early Access" form added to Hugo page — targeting US hospital systems for pre-clearance evaluation conversations', element_type: 'button' }
    ]
  },
  {
    competitor: 'J&J MedTech (Ottava / Auris)',
    url_label: 'Ottava Surgical Robot',
    change_type: 'product_expansion',
    significance: 'medium',
    days_ago: 7,
    badge: 'Clinical Trial',
    ai_analysis: {
      headline: 'J&J Ottava Phase II Clinical Trials Commence at 12 Sites — Abdominal Soft Tissue Focus; 6-Month Delay from Q4 2025 Plan',
      analysis: 'Johnson & Johnson MedTech commenced Phase II clinical trials for the Ottava soft-tissue surgical robot at 12 academic medical centers in March 2026 — approximately 6 months behind the Q4 2025 target cited in J&J\'s 2024 annual report. The delay was attributed to software navigation integration challenges and FDA Design Control documentation review. Phase II focuses on general surgery (cholecystectomy, Nissen fundoplication) as predicates for future indications. The navigation software in Ottava is being co-developed with Pixee Medical (J&J acquired minority stake in 2024). Ottava\'s projected commercial launch remains 2027-2028 but the Phase II delay signals software complexity. Key insight: J&J is struggling with the exact problem Method AI solves — navigation software integration in novel robotic architectures.',
      category: 'clinical_trial',
      urgency: 'medium',
      recommended_action: 'J&J\'s navigation software struggle is a direct partnership opportunity. Ottava needs surgical navigation software that can be validated in Phase II/III timelines. Initiate contact with J&J MedTech strategy team before Pixee Medical cements their exclusive development position. A partnership conversation now is significantly easier than a competitive displacement conversation in 2027.',
      badges: ['Clinical Trial', 'Partnership']
    },
    structural_changes: [
      { category: 'layout', description: 'Ottava timeline updated — "Phase II Initiated Q1 2026" replaces previous "Phase II Q4 2025 Target"', element_type: 'section' },
      { category: 'navigation', description: '"Clinical Development" section added to Ottava page with Phase II site map', element_type: 'nav-item' }
    ]
  },
  {
    competitor: 'Siemens Healthineers',
    url_label: 'AI Navigation Platform',
    change_type: 'content_change',
    significance: 'medium',
    days_ago: 8,
    badge: 'Partnership',
    ai_analysis: {
      headline: 'Siemens Healthineers AI Navigation Gap: No Intraoperative Real-Time Guidance — Imaging-Only Architecture Exposed',
      analysis: 'Siemens Healthineers\' March 2026 product documentation updates for the AI-Rad Companion and syngo.via platform reveal a persistent architectural gap: all AI navigation capabilities remain in the pre-operative and diagnostic imaging workflow, with no real-time intraoperative guidance layer. Despite announcing the "AI-Powered OR" initiative in 2024, Siemens\' actual product deliverables are limited to pre-op imaging analysis, surgical planning overlays, and post-op reporting. The intraoperative real-time step — the highest-value moment in surgical navigation — is conspicuously absent from their product documentation and feature roadmap. Siemens relies on third-party navigation integration partnerships (Brainlab, Stryker Spine) for intraoperative applications. This is the architectural gap Method AI fills: real-time AI-driven navigation at the point of incision, not just the planning workstation.',
      category: 'competitive_gap',
      urgency: 'medium',
      recommended_action: 'Use Siemens\' imaging-only limitation as a positioning anchor: "Siemens stops at the OR door. Method AI starts there." Target Siemens-equipped hospitals that have pre-op imaging infrastructure but need an intraoperative AI navigation layer — they are already conditioned to buy AI navigation software from vendors other than their imaging vendor.',
      badges: []
    },
    structural_changes: [
      { category: 'layout', description: 'AI Navigation product page updated — "Intraoperative" section remains placeholder with "Coming Q3 2026" estimate, moved from "Q1 2026" prior estimate', element_type: 'section' },
      { category: 'cta_change', description: '"Partner with Us" CTA added to intraoperative section — Siemens is actively seeking OR navigation partners', element_type: 'button' }
    ]
  },
  {
    competitor: 'J&J MedTech (Ottava / Auris)',
    url_label: 'Monarch Bronchoscopy Platform',
    change_type: 'feature_launch',
    significance: 'low',
    days_ago: 2,
    badge: 'Patent',
    ai_analysis: {
      headline: 'Auris Monarch Files 3 Continuation Patents on AI Shape-Sensing Navigation — Breadth Expansion in Bronchoscopy IP',
      analysis: 'J&J\'s Auris Health filed three continuation patents (US20260189021, US20260189022, US20260189023) covering AI-enhanced shape sensing fiber optic navigation in bronchoscopy — expanding their existing IP portfolio around the Monarch platform. The continuations specifically claim AI-driven confidence scoring for navigation path prediction, adaptive catheter path correction, and real-time airway-map building from sequential fluoroscopy frames. While Monarch is bronchoscopy-specific, these patents represent IP strategy that could extend to other endoluminal navigation applications. J&J has a pattern of filing broad continuation patents to create licensing leverage in adjacent markets — this could affect any company building AI path prediction or anatomical mapping for endoluminal procedures.',
      category: 'patent',
      urgency: 'low',
      recommended_action: 'Flag for legal review. If Method AI has any endoluminal or lumenal navigation applications in roadmap, conduct freedom-to-operate analysis against Auris\' continuation filings before those claims mature. Patent continuations have 20-year terms from priority date — early awareness is critical.',
      badges: ['Patent']
    },
    structural_changes: []
  }
];

// ── Competitive Brief HTML ───────────────────────────────────────
const BRIEF_SUBJECT = 'Method AI Intelligence Brief — Surgical Navigation Competitive Landscape Q2 2026';
const BRIEF_HTML = `
<div style="max-width:680px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="background:#0d1b2a;color:#e6edf3;padding:32px;border-radius:12px 12px 0 0;border-bottom:2px solid #1e6b8c;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#4fc3f7;margin-bottom:12px;">Method AI Intelligence</div>
    <h1 style="font-size:24px;margin:0 0 8px;color:#fff;font-weight:700;">Surgical Navigation — Q2 2026 Competitive Landscape</h1>
    <p style="font-size:14px;color:#8b949e;margin:0;">4 competitors tracked &bull; 17 URLs monitored &bull; 7 structural shifts detected &bull; Data as of March 29, 2026</p>
  </div>

  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;">

    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
      <strong style="color:#991b1b;">&#128680; Priority Alert — Intraoperative Imaging Threat:</strong>
      <span style="color:#7f1d1d;"> Medtronic just updated their Digital Surgery documentation with 3D intraoperative ultrasound integration detected in early testing at Mayo Clinic and Cleveland Clinic sites. 510(k) pathway likely. This directly challenges pre-operative imaging-dependent navigation stacks.</span>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
      <span style="background:#fef2f2;color:#dc2626;border:1px solid #fca5a5;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; FDA Filing</span>
      <span style="background:#eff6ff;color:#1d4ed8;border:1px solid #93c5fd;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Clinical Trial</span>
      <span style="background:#f0fdf4;color:#15803d;border:1px solid #86efac;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Product Launch</span>
      <span style="background:#fefce8;color:#a16207;border:1px solid #fde047;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Partnership</span>
      <span style="background:#faf5ff;color:#7e22ce;border:1px solid #c4b5fd;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:600;">&#9632; Patent</span>
    </div>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #4fc3f7;padding-bottom:8px;">Executive Summary</h2>
    <p style="font-size:14px;line-height:1.7;color:#374151;">The surgical navigation market is experiencing a platform convergence event in 2026: hardware robotics companies are acquiring AI navigation capabilities, and imaging companies are pushing toward the intraoperative workflow. <strong>Three structural shifts define Q2 2026:</strong> (1) Medtronic adds 3D ultrasound to StealthStation — attacking imaging-based navigation from the hardware layer; (2) Intuitive Surgical files 510(k) for marker-free subsurface visualization — Vision v2 threatens soft tissue navigation without external systems; (3) J&J Ottava Phase II has commenced despite delays, signaling active development. <strong>Method AI&rsquo;s defensible position:</strong> platform-agnostic, intraoperative AI navigation that integrates across robotic systems — the one layer no hardware vendor can replicate without acquisitions.</p>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #4fc3f7;padding-bottom:8px;margin-top:28px;">Competitive Threat Matrix</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f0f9ff;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Competitor</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Key Move</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Method AI Counter</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Threat</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Medtronic Digital Surgery</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">3D ultrasound + StealthStation integration (early testing)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Multi-modal fusion AI — ingest ultrasound stream before Medtronic achieves 510(k)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Intuitive Surgical</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Vision v2 510(k): marker-free subsurface tissue visualization</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CT+MRI+ultrasound+camera multi-modal fusion — camera-only cannot replace</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">J&amp;J (Ottava/Auris)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Phase II commenced; Pixee Medical navigation co-dev</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Partner outreach before Pixee cements exclusive — J&amp;J nav gap is live</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Siemens Healthineers</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Intraoperative AI delayed to Q3 2026 — imaging only</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Target Siemens-equipped ORs: imaging infrastructure + no intraoperative layer</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#f0fdf4;color:#15803d;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">OPP</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #4fc3f7;padding-bottom:8px;margin-top:28px;">Regulatory Activity Tracker</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f0f9ff;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Filing</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Company</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Pathway</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Est. Clearance</th>
        <th style="text-align:center;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Impact</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Vision v2 (K261847)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Intuitive Surgical</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">510(k) Standard</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Q4 2026</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Hugo RAS (US)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Medtronic</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">510(k) De Novo</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Q3 2026</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Ultrasound Integration</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Medtronic</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Phase I → 510(k)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Q1–Q2 2028</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fef2f2;color:#dc2626;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">HIGH</span></td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">NAVIGATE-AI (NCT05891847)</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Intuitive Surgical</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Phase III RCT</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Readout Q1 2027</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;"><span style="background:#fffbeb;color:#d97706;padding:2px 8px;border-radius:4px;font-weight:600;font-size:11px;">MED</span></td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #4fc3f7;padding-bottom:8px;margin-top:28px;">Method AI Defensibility Moat</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px;">
      <tr style="background:#f0f9ff;">
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Moat</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Method AI Advantage</th>
        <th style="text-align:left;padding:10px 12px;border:1px solid #e5e7eb;color:#374151;">Competitor Gap</th>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Platform Agnosticism</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Works on da Vinci, Hugo, Ottava, open surgery — not locked to a single robot</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">All competitors are proprietary hardware ecosystems</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Multi-Modal Fusion</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">CT + MRI + ultrasound + endoscopic camera fusion — intraoperative ground truth</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Intuitive: camera-only; Medtronic: CT-only today; Siemens: pre-op only</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Software-Only Regulatory Path</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">510(k) SaMD pathway is faster and lower capital than hardware-integrated clearance</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Hardware vendors face Class III review cycles for integrated navigation hardware</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;">Evidence Generation Speed</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Software updates do not require 510(k) re-clearance under SaMD Change Protocols</td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;">Every hardware integration change triggers new regulatory review</td>
      </tr>
    </table>

    <h2 style="font-size:18px;color:#111;border-bottom:2px solid #4fc3f7;padding-bottom:8px;margin-top:28px;">Recommended Clinical/R&D Actions (Q2 2026)</h2>
    <div style="margin-top:12px;">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#4fc3f7;font-weight:700;">1.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Initiate ultrasound stream integration sprint:</strong> Medtronic&rsquo;s 3D ultrasound integration is 18-24 months from clearance. Method AI can own the software layer that ingests ultrasound data for navigation — before Medtronic locks it into proprietary hardware. Scoping this as a SaMD expansion avoids the hardware regulatory overhead.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#4fc3f7;font-weight:700;">2.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Launch prospective clinical study in primary indication:</strong> Intuitive&rsquo;s NAVIGATE-AI will create a Level I evidence benchmark by Q1 2027. Method AI needs published prospective data before that readout or you&rsquo;ll be selling against a competitor with RCT evidence. Target 8-10 academic sites for a Phase II design. Evidence is the procurement moat.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#4fc3f7;font-weight:700;">3.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>J&amp;J Ottava partnership outreach:</strong> J&amp;J&rsquo;s navigation software delay is a live gap. Pixee Medical is the current co-developer but is early-stage. A Method AI-J&amp;J commercial discussion now, before Pixee matures, is worth a BD conversation — J&amp;J&rsquo;s commercial infrastructure would accelerate distribution into Phase III sites that become commercial customers.</span></div>
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:12px;"><span style="color:#4fc3f7;font-weight:700;">4.</span><span style="font-size:14px;line-height:1.6;color:#374151;"><strong>Target Siemens-equipped ORs for navigation deployment:</strong> 400+ US academic medical centers have Siemens Artis imaging suites in hybrid ORs with no intraoperative AI navigation layer. Method AI should prioritize a Siemens-compatible integration story — these hospitals are already conditioned to buy navigation software separately from imaging hardware.</span></div>
    </div>

    <div style="margin-top:28px;padding:16px;background:#f0f9ff;border-radius:8px;font-size:12px;color:#374151;border:1px solid #bae6fd;">
      <strong>Sources:</strong> Intuitive Surgical (intuitivesurgical.com), Medtronic Digital Surgery, J&J MedTech (jnjmedtech.com), Siemens Healthineers, ClinicalTrials.gov, FDA 510(k) Database, USPTO Patent Database, Emergo Regulatory Intelligence &bull; Data as of March 29, 2026 &bull; Confidence: HIGH
    </div>
  </div>

  <div style="background:#0d1b2a;color:#8b949e;padding:20px 32px;border-radius:0 0 12px 12px;font-size:12px;text-align:center;">
    Generated by <span style="color:#4fc3f7;">Spyglass</span> &bull; Autonomous competitive intelligence &bull; <a href="https://spyglass-10.polsia.app" style="color:#4fc3f7;text-decoration:none;">spyglass-10.polsia.app</a>
  </div>
</div>
`;

/**
 * Seeds Method AI demo data for Doug Teany (Surgical Navigation).
 * Creates 4 competitors, 17 URLs, 7 detected changes with FDA/clinical-trial AI analysis, and a brief.
 *
 * @param {object} client - PostgreSQL client (within transaction)
 * @param {number} userId - The user ID to seed data for
 */
async function seedMethodDemoData(client, userId) {
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
      'Method AI Intelligence Brief — Surgical Navigation Q2 2026. 4 competitors tracked, 17 URLs monitored. Medtronic 3D ultrasound integration detected. Intuitive Vision v2 510(k) filed. J&J Ottava Phase II commenced.',
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
      'Method AI Intelligence Brief — Surgical Navigation Q2 2026. 4 competitors tracked, 17 URLs monitored. Medtronic 3D ultrasound integration detected. Intuitive Vision v2 510(k) filed. J&J Ottava Phase II commenced.',
      JSON.stringify(demoBriefChanges),
      'gpt-4o-mini',
      BRIEF_HTML,
      'Method AI Intelligence Brief — Surgical Navigation Q2 2026. 4 competitors tracked, 17 URLs monitored. Medtronic 3D ultrasound integration detected. Intuitive Vision v2 510(k) filed. J&J Ottava Phase II commenced.',
      DEMO_CHANGES.length,
      JSON.stringify(demoBriefChanges)
    ]
  );
}

module.exports = { seedMethodDemoData };
