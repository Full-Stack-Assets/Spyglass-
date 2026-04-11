/**
 * AI Analysis Layer for Spyglass
 * Uses OpenAI-compatible proxy to analyze page changes and generate insights
 *
 * v2: Structural DOM change detection (CTAs, navigation, forms, layout)
 * v2.1: Skeptic Analyst system prompt — Signal-to-Noise filter
 *       - Pre-LLM noise suppression (copyright years, cookie banners, CSS-only)
 *       - Confidence threshold gate (< 0.85 → suppress)
 *       - Reasoning lineage JSONB structure per finding
 */
const OpenAI = require('openai');

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'unused',
    baseURL: process.env.POLSIA_AI_BASE_URL || 'https://polsia.com/api/ai-proxy/v1',
    defaultHeaders: {
      'x-polsia-task': 'spyglass-analysis'
    }
  });
}

// ── Vertical-Specific Temperature Calibration ─────────────────────────────────
// Temperature controls LLM creativity. Lower = stricter grounding (no hallucinations).
// Higher = allows strategic inference across data points.

const VERTICAL_TEMPERATURE_MAP = {
  // InsurTech: geo-risk/contagion scores must be derived strictly from hard data
  'insurtech': 0.1,
  'insurance': 0.1,
  'openly': 0.1,
  // MedTech: regulatory/FDA docs require 1:1 attribution
  'medtech': 0.1,
  'medical': 0.1,
  'method': 0.1,
  // Security: analytical — capable of connecting subtle threat dots but grounded
  'security': 0.2,
  '7ai': 0.2,
  'cybersecurity': 0.2,
  // FinOps: math and COGS require absolute precision
  'finops': 0.1,
  'cloudzero': 0.1,
  'finance': 0.1,
  // Support/CX: allows higher-level strategic inferences about market pivots
  'support': 0.4,
  'cx': 0.4,
  'maven': 0.4,
  'customer_success': 0.4,
  // Talent/Comp: reads between the lines of job descriptions and comp changes
  'talent': 0.3,
  'comp': 0.3,
  'compa': 0.3,
  'hr': 0.3
};

/**
 * Returns the appropriate LLM temperature for a given vertical.
 * Default: 0.2 if no vertical set.
 *
 * @param {string|null} vertical - The org's vertical tag (e.g. 'insurtech', 'security')
 * @returns {number} temperature between 0.0 and 1.0
 */
function getTemperatureForVertical(vertical) {
  if (!vertical) return 0.2;
  const key = vertical.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return VERTICAL_TEMPERATURE_MAP[key] ?? 0.2;
}

// ── Skeptic Analyst v2.1 System Prompt ────────────────────────────────────────

const SKEPTIC_ANALYST_SYSTEM_PROMPT = `You are a Senior Competitive Intelligence Analyst. You are reviewing a DOM diff between two timestamps.

GOAL: Identify "Market-Moving Signals" while ruthlessly discarding "Technical Noise."

STRICT CLASSIFICATION RULES:
1. DISCARD (Noise): CSS changes, layout shifts, ID/Class renames, cookie banner updates, font swaps, or non-functional copy tweaks (e.g., "Login" to "Sign In").
2. FLAG (Signal): Pricing table updates, new feature keywords, removal of "Enterprise" mentions (downmarket pivot), new "Integrations" logos, or shifts in "Problem/Solution" messaging.

REASONING LINEAGE PROTOCOL:
For every change detected, you must provide a JSON object following this logic:
- "Observation": The literal change.
- "Technical_Nature": Is this code or content?
- "Strategic_Inference": What does this tell a CEO about their competitor's roadmap?
- "Confidence_Score": 0.0 to 1.0 (Discard if < 0.85).`;

// ── Pre-LLM Noise Filter ──────────────────────────────────────────────────────

// Patterns that identify pure technical noise at the text-diff level.
// These match lines that are almost certainly not strategic signals.
const NOISE_LINE_PATTERNS = [
  // Copyright year updates (e.g., "© 2024" → "© 2025")
  /^©\s*\d{4}/,
  /^copyright\s+\d{4}/i,
  /©\s*\d{4}\s+\w/,
  // Cookie / consent banner text
  /\bcookies?\b/i,
  /\bconsent\b/i,
  /\bgdpr\b/i,
  /\bprivacy\s+notice\b/i,
  /\baccept\s+all\s+cookies\b/i,
  /\bwe\s+use\s+cookies\b/i,
  /\bcookie\s+settings\b/i,
  /\boptional\s+cookies\b/i,
  // Analytics/tracking IDs that leak through
  /\bgtag\b/,
  /\bga4\b/i,
  /\bgtm-[a-z0-9]+\b/i,
  /\banalyticsjs\b/i,
  // CSS color/font values (shouldn't normally appear in text, but just in case)
  /^#[0-9a-fA-F]{3,8}$/,
  /\bfont-family\b/i,
  /\bfont-size\s*:\s*\d/i,
];

/**
 * Returns true if a change is pure technical noise and should be suppressed
 * before reaching the LLM.
 *
 * Noise = all added/removed lines match noise patterns.
 * If there are structural changes in strategic categories, it's never noise.
 */
function isNoiseChange(change) {
  if (!change.changed) return true;

  // Structural changes in strategic categories are always signal
  const SIGNAL_STRUCTURAL_CATEGORIES = new Set([
    'cta_change', 'pricing_structure', 'navigation', 'form_change'
  ]);
  if (change.structuralChanges && change.structuralChanges.length > 0) {
    const hasSignal = change.structuralChanges.some(sc =>
      SIGNAL_STRUCTURAL_CATEGORIES.has(sc.category)
    );
    if (hasSignal) return false; // Strategic structural change → not noise
  }

  const added = (change.added || []).filter(l => l && l.trim().length > 2);
  const removed = (change.removed || []).filter(l => l && l.trim().length > 2);
  const allLines = [...added, ...removed];

  // No meaningful text changes and no strategic structural changes → noise
  if (allLines.length === 0) return true;

  // All lines match noise patterns → suppress
  return allLines.every(line => {
    const trimmed = line.trim();
    return NOISE_LINE_PATTERNS.some(pattern => pattern.test(trimmed));
  });
}

// ── Change ID generator ───────────────────────────────────────────────────────

let _changeCounter = 1000;
function generateChangeId() {
  return `chg_${(++_changeCounter).toString(16).toUpperCase()}`;
}

// ── Core Analysis ─────────────────────────────────────────────────────────────

/**
 * Analyze a single page change and generate a concise insight.
 * v2.1: Skeptic Analyst system prompt + confidence gate + reasoning lineage.
 * v2.2: Vertical-aware temperature calibration.
 *
 * @param {Object} change - The change object from scraper
 * @param {Object} [options] - { vertical: string } for temperature selection
 * Returns null if the change is noise (pre-filter or confidence < 0.85).
 */
async function analyzeChange(change, { vertical } = {}) {
  if (!change.changed) return null;

  // ── Pre-LLM noise filter ──────────────────────────────────────────────────
  if (isNoiseChange(change)) {
    console.log(`[Analyzer] Pre-filter: suppressing noise change for ${change.competitor} (${change.url})`);
    return null; // Suppressed — log is handled in analyzeChanges()
  }

  const client = getClient();
  const changeId = generateChangeId();

  // v2: Build structural changes section for the prompt
  let structuralSection = '';
  if (change.hasStructuralChanges && change.structuralChanges?.length > 0) {
    const grouped = {};
    for (const sc of change.structuralChanges) {
      if (!grouped[sc.category]) grouped[sc.category] = [];
      grouped[sc.category].push(sc);
    }

    const parts = [];
    for (const [category, items] of Object.entries(grouped)) {
      const categoryLabel = CATEGORY_LABELS[category] || category;
      parts.push(`**${categoryLabel}:**`);
      for (const item of items.slice(0, 10)) {
        parts.push(`  ${item.action === 'removed' ? '[-]' : '[+]'} ${item.detail}`);
      }
    }
    structuralSection = `\n**Structural DOM Changes (buttons, navigation, forms, layout):**\n${parts.join('\n')}\n`;
  }

  const userPrompt = `Analyze this competitor website change and classify it as Signal or Noise.

**Competitor:** ${change.competitor}
**Page:** ${change.label || change.url}
**Change Type:** ${change.changeType}
**Significance:** ${change.significance}
**Change ID:** ${changeId}

**Text Content Added:**
${(change.added || []).slice(0, 30).join('\n')}

**Text Content Removed:**
${(change.removed || []).slice(0, 30).join('\n')}
${structuralSection}
Respond with a JSON object following the Reasoning Lineage Protocol:
{
  "Observation": "The literal change observed on the page",
  "Technical_Nature": "code or content",
  "Strategic_Inference": "What this tells a CEO about their competitor's roadmap",
  "Confidence_Score": 0.0,
  "headline": "One line summary (max 80 chars) — what changed strategically",
  "analysis": "2-3 sentences. Strategic meaning. Be specific and actionable. Prioritize CTA/pricing/navigation/form changes as strategic pivots.",
  "category": "pricing|features|hiring|messaging|product|legal|cta_change|navigation|form_change|layout|other",
  "urgency": "high|medium|low",
  "reasoning_lineage": {
    "change_id": "${changeId}",
    "trigger": "One sentence: what specific element triggered this analysis",
    "analysis_steps": [
      "Step 1: what data was observed",
      "Step 2: what pattern was identified",
      "Step 3: why it matters strategically"
    ],
    "competitive_impact": "One sentence on business impact for the CEO",
    "recommended_action": "One specific action the CEO should take in response"
  }
}

Category guidance:
- "cta_change": Button text/link changes (e.g., "Contact Us" → "Start Free Trial" = major strategic shift)
- "navigation": New/removed menu items (signals new product areas or discontinued features)
- "form_change": Signup/contact form modifications (signals funnel optimization)
- "layout": Section reordering, new sections, hero image changes (signals messaging pivot)
- "pricing": Price point changes or pricing structure modifications
- "features": New feature announcements or capability changes
- "messaging": Copy/positioning changes

IMPORTANT: Set Confidence_Score honestly (0.0–1.0). If this is Technical Noise per classification rules, set Confidence_Score below 0.85.
Only respond with valid JSON. No markdown fences.`;

  // Select temperature based on vertical (v2.2)
  const temperature = getTemperatureForVertical(vertical);
  console.log(`[Analyzer] Temperature for vertical "${vertical || 'default'}": ${temperature}`);

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SKEPTIC_ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 600
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) return null;

    // Parse JSON response (handle potential markdown fences)
    const jsonStr = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);

    // ── Confidence threshold gate ──────────────────────────────────────────
    const confidence = typeof parsed.Confidence_Score === 'number' ? parsed.Confidence_Score : 1.0;
    if (confidence < 0.85) {
      console.log(`[Analyzer] Confidence gate: suppressing low-confidence finding for ${change.competitor} (score: ${confidence.toFixed(2)})`);
      return null;
    }

    return {
      headline: parsed.headline || 'Change detected',
      analysis: parsed.analysis || 'Content was modified.',
      category: parsed.category || 'other',
      urgency: parsed.urgency || 'medium',
      // Skeptic Analyst v2.1 fields
      observation: parsed.Observation || null,
      technical_nature: parsed.Technical_Nature || null,
      strategic_inference: parsed.Strategic_Inference || null,
      confidence_score: confidence,
      // Reasoning lineage JSONB (for briefs.reasoning_path)
      reasoning_lineage: parsed.reasoning_lineage || {
        change_id: changeId,
        trigger: `Change detected on ${change.label || change.url}`,
        analysis_steps: ['Step 1: Change detected', 'Step 2: Content analyzed', 'Step 3: Strategic impact assessed'],
        competitive_impact: parsed.Strategic_Inference || 'Unknown impact',
        recommended_action: 'Monitor for further changes'
      }
    };
  } catch (err) {
    console.error('[Analyzer] AI analysis failed:', err.message);
    // Fallback: generate a basic analysis without AI
    return generateFallbackAnalysis(change, changeId);
  }
}

/**
 * Generate fallback analysis when AI is unavailable
 */
function generateFallbackAnalysis(change, changeId) {
  const cId = changeId || generateChangeId();

  // v2: Use structural changes for smarter fallback
  if (change.hasStructuralChanges && change.structuralChanges?.length > 0) {
    const categories = [...new Set(change.structuralChanges.map(c => c.category))];
    const primaryCategory = categories[0] || 'other';
    const details = change.structuralChanges.slice(0, 3).map(c => c.detail).join('; ');

    return {
      headline: `${change.competitor}: Structural changes on ${change.label || 'page'}`,
      analysis: `${change.structuralChanges.length} structural changes detected: ${details}. ${change.addedCount} text lines added, ${change.removedCount} removed.`,
      category: primaryCategory,
      urgency: change.structuralChanges.length > 3 ? 'high' : 'medium',
      confidence_score: 0.9,
      reasoning_lineage: {
        change_id: cId,
        trigger: `Structural DOM changes detected on ${change.label || change.url}`,
        analysis_steps: [
          `Step 1: ${change.structuralChanges.length} structural changes detected`,
          `Step 2: Categories identified: ${categories.join(', ')}`,
          'Step 3: Structural changes indicate potential strategic shifts in UI/UX and product direction'
        ],
        competitive_impact: `Competitor made ${change.structuralChanges.length} structural page changes across ${categories.join(', ')} elements`,
        recommended_action: 'Review the specific changes for strategic implications and update competitive tracking'
      }
    };
  }

  return {
    headline: `${change.competitor}: ${change.label || 'page'} updated`,
    analysis: `${change.addedCount} lines added, ${change.removedCount} lines removed. Review the changes for strategic implications.`,
    category: 'other',
    urgency: change.significance === 'high' ? 'high' : 'medium',
    confidence_score: 0.9,
    reasoning_lineage: {
      change_id: cId,
      trigger: `Content change detected on ${change.label || change.url}`,
      analysis_steps: [
        `Step 1: ${change.addedCount} lines added, ${change.removedCount} removed`,
        'Step 2: No structural (CTA/nav/form) changes detected',
        'Step 3: Content update — manual review recommended to assess strategic significance'
      ],
      competitive_impact: `Competitor updated page content at ${change.label || change.url}`,
      recommended_action: 'Review changed content directly to assess if this signals a messaging or product shift'
    }
  };
}

// v2: Human-readable labels for structural change categories
const CATEGORY_LABELS = {
  cta_change: 'CTA / Button Changes',
  navigation: 'Navigation Changes',
  form_change: 'Form / Input Changes',
  layout: 'Layout / Section Changes',
  pricing_structure: 'Pricing Structure Changes'
};

/**
 * Analyze all changes and save AI analysis to database.
 * v2.1: Logs noise suppressions to integration_logs.
 *
 * @param {Pool} pool - PostgreSQL pool
 * @param {Array} changes - Array of change objects from scraper
 * @param {Object} [options] - { orgId, userId, vertical } for logging + temperature
 */
async function analyzeChanges(pool, changes, { orgId, userId, vertical } = {}) {
  const analyzed = [];

  for (const change of changes) {
    if (!change.changed) continue;

    // Check noise pre-filter BEFORE calling analyzeChange (to log suppressions)
    if (isNoiseChange(change)) {
      console.log(`[Analyzer] Noise suppressed: ${change.competitor} — ${change.url}`);
      // Log suppression to integration_logs for unit economics proof
      pool.query(`
        INSERT INTO integration_logs (org_id, user_id, action, target_system, metadata, created_at)
        VALUES ($1, $2, 'noise_suppressed', 'analyzer', $3, NOW())
      `, [
        orgId || null,
        userId || null,
        JSON.stringify({
          competitor: change.competitor,
          url: change.url,
          reason: 'pre_llm_noise_filter',
          added_count: (change.added || []).length,
          removed_count: (change.removed || []).length
        })
      ]).catch(() => {}); // Non-fatal
      continue;
    }

    const analysis = await analyzeChange(change, { vertical });
    if (!analysis) {
      // analyzeChange returned null = confidence gate suppressed it
      pool.query(`
        INSERT INTO integration_logs (org_id, user_id, action, target_system, metadata, created_at)
        VALUES ($1, $2, 'noise_suppressed', 'analyzer', $3, NOW())
      `, [
        orgId || null,
        userId || null,
        JSON.stringify({
          competitor: change.competitor,
          url: change.url,
          reason: 'confidence_threshold_gate',
          added_count: (change.added || []).length,
          removed_count: (change.removed || []).length
        })
      ]).catch(() => {}); // Non-fatal
      continue;
    }

    // Save AI analysis to the detected_change record
    if (change.changeId) {
      await pool.query(
        `UPDATE detected_changes SET ai_analysis = $1 WHERE id = $2`,
        [JSON.stringify(analysis), change.changeId]
      );
    }

    analyzed.push({
      ...change,
      ai: analysis
    });
  }

  return analyzed;
}

/**
 * Generate an executive summary for all changes in a brief
 */
async function generateBriefSummary(changes) {
  if (changes.length === 0) return null;

  const client = getClient();

  const changeList = changes.map((c, i) => {
    const structNote = c.hasStructuralChanges
      ? ` [+${c.structuralChanges?.length || 0} structural changes]`
      : '';
    const confidence = c.ai?.confidence_score ? ` [confidence: ${c.ai.confidence_score.toFixed(2)}]` : '';
    return `${i + 1}. [${c.ai?.category || 'other'}] ${c.competitor} - ${c.ai?.headline || 'Change detected'}: ${c.ai?.analysis || ''}${structNote}${confidence}`;
  }).join('\n');

  const prompt = `You are a competitive intelligence analyst writing a morning brief for a founder. Summarize these competitive changes into a 2-3 sentence executive summary. Be direct, strategic, and actionable. Only include high-confidence signals (these have already been filtered for noise). Pay special attention to structural changes (CTA, navigation, form, layout changes) as these indicate strategic pivots.

Changes detected:
${changeList}

Write just the summary paragraph. No headers, no bullet points.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SKEPTIC_ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('[Analyzer] Brief summary failed:', err.message);
    return `${changes.length} high-confidence competitive signal${changes.length !== 1 ? 's' : ''} detected across your monitored competitors. Review the details below for strategic implications.`;
  }
}

module.exports = {
  analyzeChange,
  analyzeChanges,
  generateBriefSummary,
  isNoiseChange,
  getTemperatureForVertical,
  VERTICAL_TEMPERATURE_MAP,
  CATEGORY_LABELS,
  SKEPTIC_ANALYST_SYSTEM_PROMPT
};
