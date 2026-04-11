/**
 * Spyglass Headless Scan Worker
 *
 * Processes async scan jobs queued via POST /api/v1/scans/trigger.
 *
 * Pipeline per job:
 *   1. Claim pending scan job (atomic, skip-locked for concurrency safety)
 *   2. Fetch URL(s) — single page for depth:'quick', recursive crawl for depth:'deep'
 *   3. Compute DOM hash for each page
 *   4. CHECK SEMANTIC CACHE — same URL + same dom_hash within 4 hours → return cached
 *      synthesis instantly (millisecond response, zero token cost)
 *   5. If cache miss: run LLM synthesis (OpenAI gpt-4o-mini via Polsia proxy)
 *   6. Log reasoning lineage to integration_logs (action='synthesis_completed')
 *      Metadata: reasoning_path, model_version, token_count, cost_usd, source_urls, changes_detected_count
 *   7. If webhook_url: POST synthesis_json to caller's endpoint
 *   8. If stateless (webhook_url set): mark ttl_purge_at = NOW() + 24h
 *      (raw dom_hash + source_urls purged after TTL; synthesis + audit logs retained)
 *
 * Runs in-process (no Redis/BullMQ required). State lives in PostgreSQL scans table.
 * Status lifecycle: 'queued' → 'processing' → 'completed' | 'failed'
 */

'use strict';

const https = require('https');
const http = require('http');
const { URL } = require('url');
const OpenAI = require('openai');
const {
  fetchUrl,
  extractText,
  extractStructure,
  hashContent,
  computeStructuralDiff
} = require('./scraper');
const { SKEPTIC_ANALYST_SYSTEM_PROMPT, getTemperatureForVertical } = require('./analyzer');

// ── OpenAI client (shared proxy) ──────────────────────────────────────────────

function getAIClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'unused',
    baseURL: process.env.POLSIA_AI_BASE_URL || 'https://polsia.com/api/ai-proxy/v1',
    defaultHeaders: { 'x-polsia-task': 'spyglass-synthesis' }
  });
}

// ── Worker lifecycle ──────────────────────────────────────────────────────────

/**
 * Start the background worker.
 * Call once at server startup after the DB pool is ready.
 */
function startWorker(pool) {
  const POLL_INTERVAL_MS = 5000;    // Poll for new jobs every 5 seconds
  const PURGE_INTERVAL_MS = 60 * 60 * 1000; // TTL purge every hour

  let workerBusy = false;

  // Job polling loop
  const pollTimer = setInterval(async () => {
    if (workerBusy) return;
    workerBusy = true;
    try {
      // Process all queued jobs in this poll cycle (drain the queue)
      let processed = 0;
      while (true) {
        const didWork = await claimAndProcess(pool);
        if (!didWork) break;
        processed++;
        if (processed >= 10) break; // Max 10 per poll cycle to prevent starvation
      }
    } catch (err) {
      console.error('[HeadlessWorker] Poll cycle error:', err.message);
    } finally {
      workerBusy = false;
    }
  }, POLL_INTERVAL_MS);

  // TTL purge loop
  const purgeTimer = setInterval(async () => {
    try {
      await purgeExpiredScanData(pool);
    } catch (err) {
      console.error('[HeadlessWorker] Purge error (non-fatal):', err.message);
    }
  }, PURGE_INTERVAL_MS);

  // Prevent these timers from blocking process exit
  if (pollTimer.unref) pollTimer.unref();
  if (purgeTimer.unref) purgeTimer.unref();

  console.log('[HeadlessWorker] Started (polling every 5s, purge every 1h)');
}

// ── Job claiming ──────────────────────────────────────────────────────────────

/**
 * Atomically claim one queued job and process it.
 * Returns true if a job was found and processed, false if queue was empty.
 */
async function claimAndProcess(pool) {
  // FOR UPDATE SKIP LOCKED: safe for concurrent workers (future scaling)
  const { rows: [job] } = await pool.query(`
    UPDATE scans
    SET status = 'processing'
    WHERE id = (
      SELECT id FROM scans
      WHERE status = 'queued'
        AND url IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `);

  if (!job) return false;

  console.log(`[HeadlessWorker] Processing scan ${job.id} | URL: ${job.url} | depth: ${job.depth || 'quick'}`);

  try {
    await processScanJob(pool, job);
  } catch (err) {
    console.error(`[HeadlessWorker] Scan ${job.id} FAILED: ${err.message}`);
    await pool.query(
      `UPDATE scans SET status = 'failed', error_log = $1, completed_at = NOW() WHERE id = $2`,
      [err.message.substring(0, 1000), job.id]
    );
    // Log failure for audit trail
    await writeIntegrationLog(pool, job, 'scan_failed', {
      error: err.message.substring(0, 500)
    });
  }

  return true;
}

// ── Pre-LLM Noise Filter (v2.1) ───────────────────────────────────────────────

/**
 * Structural change categories that are always signal (never noise).
 * CSS/layout-only categories may be noise; these are strategic.
 */
const SIGNAL_STRUCTURAL_CATEGORIES = new Set([
  'cta_change', 'pricing_structure', 'navigation', 'form_change'
]);

/**
 * Text patterns that indicate pure noise content (no strategic value).
 * Used to identify changed pages where dom_hash changed but content is trivial.
 */
const HEADLESS_NOISE_PATTERNS = [
  /©\s*20\d{2}/,                   // Copyright year
  /copyright\s+20\d{2}/i,
  /\bwe\s+use\s+cookies\b/i,
  /\baccept\s+all\s+cookies\b/i,
  /\bcookie\s+settings\b/i,
  /\boptional\s+cookies\b/i,
  /\bcookie\s+consent\b/i,
  /\bgdpr\b/i,
  /\bprivacy\s+notice\b/i,
  /\bgtm-[a-z0-9]+\b/i,            // GTM container IDs
];

/**
 * Returns true if the page text looks like it contains ONLY noise content
 * (copyright year update, cookie banner, etc.) with no strategic signals.
 *
 * Used when a page has no structural changes — the dom_hash changed but
 * no CTA/nav/form/pricing elements were modified.
 */
function isNoiseDominatedText(text) {
  if (!text || text.length < 5) return true;

  // Short text dominated by noise patterns → noise
  const textLower = text.trim().toLowerCase();
  const lines = textLower.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  if (lines.length === 0) return true;

  const noiseMatches = lines.filter(line =>
    HEADLESS_NOISE_PATTERNS.some(p => p.test(line))
  );

  // If >= 80% of lines are noise patterns AND total text is short → pure noise
  const noiseRatio = noiseMatches.length / lines.length;
  return noiseRatio >= 0.8 && text.length < 800;
}

/**
 * Filter changed pages to remove pure noise before LLM synthesis.
 *
 * A changed page is kept if:
 * 1. It has structural changes in strategic categories (cta_change, navigation,
 *    pricing_structure, form_change), OR
 * 2. Its text content does NOT look like pure noise (cookie/copyright/metadata)
 *
 * Returns { filteredPages, suppressedCount }
 */
function filterNoisyChangedPages(changedPages) {
  const filteredPages = [];
  let suppressedCount = 0;

  for (const page of changedPages) {
    // Keep pages with strategic structural changes
    if (page.structuralChanges && page.structuralChanges.length > 0) {
      const hasSignal = page.structuralChanges.some(sc =>
        SIGNAL_STRUCTURAL_CATEGORIES.has(sc.category)
      );
      if (hasSignal) {
        filteredPages.push(page);
        continue;
      }
    }

    // No strategic structural changes — check text content
    if (isNoiseDominatedText(page.text)) {
      console.log(`[HeadlessWorker] Pre-filter: noise suppressed page ${page.url}`);
      suppressedCount++;
      continue;
    }

    // Text content looks like signal — keep it
    filteredPages.push(page);
  }

  return { filteredPages, suppressedCount };
}

// ── Core scan pipeline ────────────────────────────────────────────────────────

async function processScanJob(pool, job) {
  const depth = job.depth || 'quick';

  // Step 1: Determine all URLs to scan
  const urlsToScan = [job.url];
  if (depth === 'deep') {
    const discovered = await discoverSubUrls(job.url, 3 /* maxDepth */, 20 /* maxUrls */);
    urlsToScan.push(...discovered);
    console.log(`[HeadlessWorker] Deep crawl discovered ${discovered.length} sub-URLs for ${job.url}`);
  }

  // Step 2: Fetch + extract content for each URL
  const pageResults = [];
  for (const url of urlsToScan) {
    try {
      const pageData = await fetchAndExtractPage(url);
      pageResults.push({ url, ...pageData, error: null });
    } catch (err) {
      console.error(`[HeadlessWorker] Fetch failed for ${url}: ${err.message}`);
      pageResults.push({ url, html: null, text: '', structure: null, domHash: null, error: err.message });
    }
    // Polite delay between requests
    if (urlsToScan.length > 1) {
      await sleep(500);
    }
  }

  const primaryResult = pageResults[0];

  // Step 3: Semantic cache check on the PRIMARY url
  // Cache hit = same URL + same dom_hash within 4 hours → return instantly, zero tokens
  if (primaryResult && primaryResult.domHash) {
    const cached = await checkSemanticCache(pool, job.url, primaryResult.domHash);
    if (cached) {
      console.log(`[HeadlessWorker] CACHE HIT for scan ${job.id} (dom_hash matches scan ${cached.id} from ${cached.created_at})`);

      // Log cache hit for Phil/CloudZero unit economics proof
      await writeIntegrationLog(pool, job, 'cache_hit', {
        original_scan_id: cached.id,
        url: job.url,
        dom_hash: primaryResult.domHash,
        cached_at: cached.created_at,
        token_savings: cached.synthesis_json?.token_count || 0,
        cost_savings_usd: cached.synthesis_json?.cost_usd || 0
      });

      // Mark complete with cached synthesis
      await finalizeScan(pool, job, {
        synthesisJson: cached.synthesis_json,
        domHash: primaryResult.domHash,
        changesDetectedCount: cached.synthesis_json?.changes_detected_count || 0,
        sourceUrls: urlsToScan,
        cacheHit: true
      });

      return;
    }
  }

  // Step 4: Cache miss — detect changes vs previous scans
  const changedPages = [];
  for (const page of pageResults) {
    if (!page.domHash || page.error) continue;

    // Look up most recent completed scan for this URL (for structural diff)
    const { rows: [prevScan] } = await pool.query(`
      SELECT dom_hash, synthesis_json FROM scans
      WHERE url = $1
        AND status = 'completed'
        AND synthesis_json IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 1
    `, [page.url]);

    const previousDomHash = prevScan?.dom_hash;
    const changed = !previousDomHash || previousDomHash !== page.domHash;

    const structuralChanges = [];
    if (changed && page.structure && prevScan?.synthesis_json?.page_structure) {
      try {
        const diff = computeStructuralDiff(prevScan.synthesis_json.page_structure, page.structure);
        if (diff.changed && diff.structuralChanges) {
          structuralChanges.push(...diff.structuralChanges);
        }
      } catch (diffErr) {
        // Non-fatal — structural diff is best-effort
      }
    }

    if (changed) {
      changedPages.push({
        url: page.url,
        text: page.text,
        structure: page.structure,
        domHash: page.domHash,
        structuralChanges,
        previousDomHash
      });
    }
  }

  // Step 4b: Pre-LLM noise filter (v2.1)
  // Strip pages whose dom_hash changed but only due to CSS, copyright, cookie banners, etc.
  // If ALL changed pages are noise → suppress entirely (no LLM call, log noise_suppressed)
  const { filteredPages, suppressedCount } = filterNoisyChangedPages(changedPages);

  if (suppressedCount > 0) {
    console.log(`[HeadlessWorker] Noise filter: suppressed ${suppressedCount}/${changedPages.length} pages for scan ${job.id}`);
  }

  if (filteredPages.length === 0 && changedPages.length > 0) {
    // ALL changes were noise — suppress entirely, no LLM call
    console.log(`[HeadlessWorker] All changes noise-suppressed for scan ${job.id} — returning 204`);
    await writeIntegrationLog(pool, job, 'noise_suppressed', {
      original_changed_count: changedPages.length,
      suppressed_count: suppressedCount,
      reason: 'pre_llm_noise_filter',
      token_savings_estimate: Math.round(changedPages.length * 400), // ~400 tokens per page
      cost_savings_estimate_usd: parseFloat((changedPages.length * 400 * 0.0000003).toFixed(6))
    });

    await finalizeScan(pool, job, {
      synthesisJson: {
        summary: 'All detected changes classified as technical noise (CSS, copyright, cookie banners). No strategic signals found.',
        key_findings: [],
        urgency: 'low',
        categories: [],
        recommended_action: 'No action required. Continue monitoring.',
        reasoning_path: [`Scan ${job.id}: ${changedPages.length} page(s) changed but all classified as noise by pre-LLM filter (copyright year, cookie banners, CSS).`],
        noise_suppressed: true,
        suppressed_count: changedPages.length,
        model_version: 'none',
        token_count: 0,
        cost_usd: 0,
        changes_detected_count: 0,
        source_urls: urlsToScan,
        generated_at: new Date().toISOString()
      },
      domHash: primaryResult?.domHash || null,
      changesDetectedCount: 0, // 0 strategic changes
      sourceUrls: urlsToScan,
      cacheHit: false
    });
    return;
  }

  // Use filtered pages for LLM synthesis
  const pagesForSynthesis = filteredPages.length > 0 ? filteredPages : changedPages;

  // Step 5: LLM synthesis
  const synthesisResult = await runLLMSynthesis(job, urlsToScan, pagesForSynthesis);

  // Store page_structure in synthesis for future diff comparisons
  if (primaryResult?.structure) {
    synthesisResult.page_structure = primaryResult.structure;
  }

  // Step 6: Log reasoning lineage to integration_logs
  // This is what Lior (7AI) audits during due diligence — proves AI isn't a black box
  if (synthesisResult.noise_suppressed) {
    // Confidence gate suppression — log as noise_suppressed
    await writeIntegrationLog(pool, job, 'noise_suppressed', {
      reason: 'confidence_threshold_gate',
      avg_confidence: synthesisResult.avg_confidence,
      changes_detected_count: pagesForSynthesis.length,
      token_count: synthesisResult.token_count || 0,
      cost_usd: synthesisResult.cost_usd || 0,
      source_urls: urlsToScan,
      depth,
      cache_hit: false
    });
  } else {
    await writeIntegrationLog(pool, job, 'synthesis_completed', {
      reasoning_path: synthesisResult.reasoning_path || [],
      model_version: synthesisResult.model_version || 'gpt-4o-mini',
      token_count: synthesisResult.token_count || 0,
      cost_usd: synthesisResult.cost_usd || 0,
      source_urls: urlsToScan,
      changes_detected_count: pagesForSynthesis.length,
      depth,
      cache_hit: false
    });
  }

  // Step 7: Mark scan complete and store synthesis
  await finalizeScan(pool, job, {
    synthesisJson: synthesisResult,
    domHash: primaryResult?.domHash || null,
    changesDetectedCount: synthesisResult.noise_suppressed ? 0 : pagesForSynthesis.length,
    sourceUrls: urlsToScan,
    cacheHit: false
  });
}

// ── Finalize scan record ──────────────────────────────────────────────────────

async function finalizeScan(pool, job, { synthesisJson, domHash, changesDetectedCount, sourceUrls, cacheHit }) {
  // 24h TTL for stateless scans (those with webhook_url = "stateless mode")
  // Only the synthesis_json and audit logs persist; raw content purged after TTL
  const ttlPurgeAt = job.webhook_url
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;

  await pool.query(`
    UPDATE scans SET
      status = 'completed',
      synthesis_json = $1,
      dom_hash = $2,
      changes_detected_count = $3,
      source_urls = $4,
      ttl_purge_at = $5,
      completed_at = NOW()
    WHERE id = $6
  `, [
    JSON.stringify(synthesisJson),
    domHash,
    changesDetectedCount,
    JSON.stringify(sourceUrls),
    ttlPurgeAt,
    job.id
  ]);

  // Step 7: Deliver webhook if provided
  // Skip webhook delivery for noise-suppressed scans (no strategic signals found)
  if (job.webhook_url && !synthesisJson.noise_suppressed) {
    await deliverWebhook(job.webhook_url, {
      scan_id: job.id,
      url: job.url,
      status: 'completed',
      cache_hit: cacheHit,
      synthesis: synthesisJson,
      source_urls: sourceUrls,
      changes_detected_count: changesDetectedCount,
      completed_at: new Date().toISOString()
    });
  } else if (job.webhook_url && synthesisJson.noise_suppressed) {
    console.log(`[HeadlessWorker] Webhook skipped for scan ${job.id} — noise_suppressed (no strategic signals)`);
  }
}

// ── LLM Synthesis ─────────────────────────────────────────────────────────────

/**
 * Run LLM synthesis on collected page data.
 * Returns synthesis_json with full reasoning lineage.
 *
 * reasoning_path is the step-by-step logic chain — Lior (7AI) audits this
 * to prove the AI reasoning is transparent and traceable.
 */
async function runLLMSynthesis(job, allUrls, changedPages, { vertical } = {}) {
  const client = getAIClient();
  const startTime = Date.now();
  const reasoningPath = [];
  // v2.2: Vertical-aware temperature calibration
  const temperature = getTemperatureForVertical(vertical || job.vertical || null);
  console.log(`[HeadlessWorker] Temperature for vertical "${vertical || job.vertical || 'default'}": ${temperature}`);

  // Build reasoning lineage (step-by-step)
  reasoningPath.push(`Scan initiated: ${job.url} at ${new Date().toISOString()}`);
  reasoningPath.push(`Depth: ${job.depth || 'quick'}. Total URLs processed: ${allUrls.length}`);
  reasoningPath.push(`Changed pages detected: ${changedPages.length} of ${allUrls.length}`);

  if (changedPages.length === 0) {
    reasoningPath.push('No content changes detected. Returning no-change synthesis.');
    return {
      summary: 'No changes detected on monitored pages.',
      key_findings: [],
      urgency: 'low',
      categories: [],
      recommended_action: 'No action required. Continue monitoring.',
      reasoning_path: reasoningPath,
      model_version: 'none',
      token_count: 0,
      cost_usd: 0,
      changes_detected_count: 0,
      source_urls: allUrls,
      generated_at: new Date().toISOString()
    };
  }

  // Build structured change summary for the prompt
  const changeDescriptions = changedPages.slice(0, 10).map((page, i) => {
    const lines = [];
    lines.push(`${i + 1}. URL: ${page.url}`);

    if (page.structuralChanges && page.structuralChanges.length > 0) {
      const grouped = {};
      for (const sc of page.structuralChanges) {
        if (!grouped[sc.category]) grouped[sc.category] = [];
        grouped[sc.category].push(sc);
      }
      for (const [cat, items] of Object.entries(grouped)) {
        lines.push(`   [${cat}]: ${items.slice(0, 5).map(sc => `${sc.action === 'removed' ? '[-]' : '[+]'} ${sc.detail}`).join('; ')}`);
      }
      reasoningPath.push(`Page ${page.url}: ${page.structuralChanges.length} structural changes (${[...new Set(page.structuralChanges.map(s => s.category))].join(', ')})`);
    } else {
      // Snippet of changed text content for context
      const snippet = (page.text || '').substring(0, 400).replace(/\s+/g, ' ');
      if (snippet) lines.push(`   Content: ${snippet}...`);
      reasoningPath.push(`Page ${page.url}: text content changed (no structural changes detected)`);
    }

    return lines.join('\n');
  }).join('\n\n');

  reasoningPath.push(`LLM synthesis prompt constructed with ${changedPages.length} changed page(s)`);

  // Build unique change IDs for reasoning lineage
  const changeIds = changedPages.map((_, i) => `chg_${(0xA000 + i).toString(16).toUpperCase()}`);

  const userPrompt = `You are synthesizing real-time competitor intelligence. Apply the Skeptic Analyst Classification Rules strictly.

**Primary URL monitored:** ${job.url}
**Scan depth:** ${job.depth || 'quick'}
**Changed pages (${changedPages.length} of ${allUrls.length} total — pre-filtered for noise):**

${changeDescriptions}

Provide a JSON synthesis following the Reasoning Lineage Protocol:
{
  "summary": "2-3 sentence executive summary. Direct and strategic. What's the most important signal?",
  "key_findings": [
    {
      "change_id": "${changeIds[0] || 'chg_A000'}",
      "trigger": "What specific element triggered this finding",
      "analysis_steps": [
        "Step 1: what data was observed",
        "Step 2: what pattern was identified",
        "Step 3: why it matters strategically"
      ],
      "competitive_impact": "Business impact for the CEO — one sentence",
      "recommended_action": "Specific action to take (e.g., 'Jonathan (Maven AGI): Increase ad spend on X keyword')",
      "Observation": "The literal change",
      "Technical_Nature": "code or content",
      "Strategic_Inference": "What this tells a CEO about competitor's roadmap",
      "Confidence_Score": 0.0
    }
  ],
  "urgency": "high|medium|low",
  "categories": ["pricing|features|messaging|navigation|cta_change|form_change|layout|hiring|legal|other"],
  "recommended_action": "One top-priority action for the CEO",
  "reasoning_steps": ["Step 1: what data was analyzed", "Step 2: pattern identified", "Step 3: strategic significance", "Step 4: confidence level and caveats"]
}

CRITICAL: Each finding MUST have a Confidence_Score (0.0–1.0). Set < 0.85 for noise/trivial changes.
Prioritize: CTA changes > pricing > navigation/product > messaging.
Only respond with valid JSON. No markdown fences.`;

  let tokenCount = 0;
  let costUsd = 0;
  let synthesisData;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SKEPTIC_ANALYST_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens: 900
    });

    const rawText = response.choices[0]?.message?.content?.trim() || '';
    const jsonStr = rawText.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    synthesisData = JSON.parse(jsonStr);

    tokenCount = (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0);
    // gpt-4o-mini: ~$0.15/1M input + $0.60/1M output tokens (blended ~$0.30/1M)
    costUsd = parseFloat((tokenCount * 0.0000003).toFixed(6));

    const durationMs = Date.now() - startTime;
    reasoningPath.push(`LLM synthesis complete in ${durationMs}ms. Tokens: ${tokenCount}, Cost: $${costUsd}`);

    if (synthesisData.reasoning_steps && Array.isArray(synthesisData.reasoning_steps)) {
      reasoningPath.push(...synthesisData.reasoning_steps);
    }

    // ── Confidence threshold gate (v2.1) ──────────────────────────────────────
    // If ALL findings score < 0.85, suppress the brief — low signal quality
    const findings = Array.isArray(synthesisData.key_findings) ? synthesisData.key_findings : [];
    const findingsWithScore = findings.filter(f => typeof f.Confidence_Score === 'number');
    const hasHighConfidenceFinding = findingsWithScore.some(f => f.Confidence_Score >= 0.85);

    if (findingsWithScore.length > 0 && !hasHighConfidenceFinding) {
      const avgScore = findingsWithScore.reduce((s, f) => s + f.Confidence_Score, 0) / findingsWithScore.length;
      reasoningPath.push(`Confidence gate: ALL findings below 0.85 threshold (avg: ${avgScore.toFixed(2)}). Suppressing brief.`);
      console.log(`[HeadlessWorker] Confidence gate: all findings < 0.85 for scan ${job.id} (avg: ${avgScore.toFixed(2)}) — suppressing`);

      synthesisData._confidence_suppressed = true;
      synthesisData._avg_confidence = avgScore;
    }

    console.log(`[HeadlessWorker] Synthesis OK | ${tokenCount} tokens | $${costUsd} | ${durationMs}ms`);
  } catch (err) {
    console.error('[HeadlessWorker] LLM synthesis failed:', err.message);
    reasoningPath.push(`LLM synthesis failed: ${err.message}. Using rule-based fallback.`);

    // Fallback: rule-based synthesis without LLM
    synthesisData = buildFallbackSynthesis(changedPages);
  }

  // Normalize key_findings to new JSONB structure
  const normalizedFindings = Array.isArray(synthesisData.key_findings)
    ? synthesisData.key_findings.map((f, i) => {
        if (typeof f === 'string') {
          // Legacy format (plain string) → wrap in new structure
          return {
            change_id: changeIds[i] || `chg_${i.toString(16).toUpperCase()}`,
            trigger: f,
            analysis_steps: ['Step 1: Change observed', 'Step 2: Content analyzed', 'Step 3: Strategic impact assessed'],
            competitive_impact: f,
            recommended_action: 'Review the change for strategic implications',
            Observation: f,
            Technical_Nature: 'content',
            Strategic_Inference: f,
            Confidence_Score: 0.9
          };
        }
        return f;
      })
    : changedPages.map((p, i) => ({
        change_id: changeIds[i] || `chg_${i.toString(16).toUpperCase()}`,
        trigger: `Content change detected at ${p.url}`,
        analysis_steps: ['Step 1: DOM hash change detected', 'Step 2: Page content analyzed', 'Step 3: Strategic context assessed'],
        competitive_impact: `${p.url} content updated`,
        recommended_action: 'Review changed page directly',
        Observation: `${p.url}: content updated`,
        Technical_Nature: 'content',
        Strategic_Inference: 'Change detected — manual review recommended',
        Confidence_Score: 0.9
      }));

  const isNoiseSuppressed = synthesisData._confidence_suppressed === true;

  return {
    summary: isNoiseSuppressed
      ? 'Changes detected but classified as low-confidence signals (all findings below 0.85 threshold). No strategic brief generated.'
      : (synthesisData.summary || `${changedPages.length} page(s) changed at ${job.url}.`),
    key_findings: normalizedFindings,
    urgency: isNoiseSuppressed ? 'low' : (synthesisData.urgency || 'medium'),
    categories: synthesisData.categories || ['other'],
    recommended_action: isNoiseSuppressed
      ? 'No action required — changes did not meet confidence threshold.'
      : (synthesisData.recommended_action || 'Review changed pages directly.'),
    reasoning_path: reasoningPath,
    model_version: `gpt-4o-mini/skeptic-analyst-v2.2/t${temperature}`,
    vertical_temperature: temperature,
    token_count: tokenCount,
    cost_usd: costUsd,
    changes_detected_count: changedPages.length,
    source_urls: allUrls,
    generated_at: new Date().toISOString(),
    // Confidence gate metadata
    noise_suppressed: isNoiseSuppressed,
    avg_confidence: synthesisData._avg_confidence || null
  };
}

function buildFallbackSynthesis(changedPages) {
  const allStructural = changedPages.flatMap(p => p.structuralChanges || []);
  const categories = [...new Set(allStructural.map(s => s.category).filter(Boolean))];

  if (allStructural.length > 0) {
    const topChange = allStructural[0];
    return {
      summary: `Structural changes detected on ${changedPages.length} page(s). Key change: ${topChange.detail}. Review for strategic implications.`,
      key_findings: changedPages.map(p => `${p.url}: ${p.structuralChanges?.length || 0} structural changes`),
      urgency: allStructural.length > 5 ? 'high' : 'medium',
      categories: categories.length > 0 ? categories : ['other'],
      recommended_action: 'Review the changed pages directly for competitive intelligence.'
    };
  }

  return {
    summary: `${changedPages.length} page(s) changed. Content updates detected — manual review recommended.`,
    key_findings: changedPages.map(p => `${p.url}: content modified`),
    urgency: 'medium',
    categories: ['other'],
    recommended_action: 'Visit the changed pages to identify what shifted.'
  };
}

// ── Page fetching ─────────────────────────────────────────────────────────────

async function fetchAndExtractPage(url) {
  const result = await fetchUrl(url);
  if (!result || !result.html) {
    return { html: null, text: '', structure: null, domHash: null, statusCode: result?.statusCode || 0 };
  }

  const text = extractText(result.html);
  const structure = extractStructure(result.html);
  const domHash = hashContent(text); // MD5 of normalized text content

  return {
    html: result.html,
    text,
    structure,
    domHash,
    statusCode: result.statusCode
  };
}

// ── Semantic cache ─────────────────────────────────────────────────────────────

/**
 * Check if we have a completed scan for this URL with the same dom_hash
 * within the last 4 hours.
 *
 * Cache hit = same URL + same content hash → return existing synthesis instantly.
 * This is the core unit economics win: 90%+ token cost reduction when multiple
 * orgs monitor overlapping competitors (same page, same content, different customers).
 */
async function checkSemanticCache(pool, url, domHash) {
  const { rows: [cached] } = await pool.query(`
    SELECT id, synthesis_json, created_at
    FROM scans
    WHERE url = $1
      AND dom_hash = $2
      AND synthesis_json IS NOT NULL
      AND status = 'completed'
      AND created_at > NOW() - INTERVAL '4 hours'
    ORDER BY created_at DESC
    LIMIT 1
  `, [url, domHash]);

  return cached || null;
}

// ── Deep crawl: sub-URL discovery ─────────────────────────────────────────────

/**
 * Discover internal links from rootUrl up to maxDepth levels deep.
 * Caps at maxUrls total to prevent runaway crawls.
 *
 * Includes: HTML pages + PDFs (document intelligence)
 * Excludes: assets (CSS, JS, images), external domains
 */
async function discoverSubUrls(rootUrl, maxDepth = 3, maxUrls = 20) {
  const discovered = new Set();
  const toVisit = [{ url: rootUrl, depth: 0 }];
  const visited = new Set([rootUrl]);

  let rootHostname;
  try {
    rootHostname = new URL(rootUrl).hostname;
  } catch {
    return [];
  }

  while (toVisit.length > 0 && discovered.size < maxUrls) {
    const { url, depth } = toVisit.shift();
    if (depth >= maxDepth) continue;

    let html;
    try {
      const result = await fetchUrl(url, 10000);
      html = result?.html;
      await sleep(500); // Polite crawl delay
    } catch {
      continue;
    }

    if (!html) continue;

    // Extract all href values from anchor tags
    const hrefRegex = /href=["']([^"'#?][^"']*?)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const rawHref = match[1];
      if (!rawHref) continue;

      let fullUrl;
      try {
        fullUrl = new URL(rawHref, url).toString();
        const parsed = new URL(fullUrl);

        // Only same-domain
        if (parsed.hostname !== rootHostname) continue;

        // Skip assets, but KEEP PDFs (document intelligence for depth:deep)
        const pathname = parsed.pathname.toLowerCase();
        if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|mp4|webm|zip)$/i.test(pathname)) continue;

        // Normalize: strip query params and hash for dedup
        const normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;

        if (!visited.has(normalized) && discovered.size < maxUrls) {
          discovered.add(normalized);
          visited.add(normalized);
          if (depth + 1 < maxDepth) {
            toVisit.push({ url: normalized, depth: depth + 1 });
          }
        }
      } catch {
        // Skip malformed URLs
      }
    }
  }

  return Array.from(discovered);
}

// ── Webhook delivery ──────────────────────────────────────────────────────────

/**
 * POST synthesis_json to caller's webhook URL.
 * Non-blocking — failures are logged but don't fail the scan.
 * 10 second timeout. Sends X-Spyglass-Event header for easy routing.
 */
async function deliverWebhook(webhookUrl, payload) {
  return new Promise((resolve) => {
    try {
      const body = JSON.stringify(payload);
      let parsed;
      try {
        parsed = new URL(webhookUrl);
      } catch {
        console.error(`[HeadlessWorker] Invalid webhook URL: ${webhookUrl}`);
        return resolve({ error: 'invalid_url' });
      }

      const isHttps = parsed.protocol === 'https:';
      const lib = isHttps ? https : http;
      const byteLength = Buffer.byteLength(body, 'utf8');

      const options = {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + (parsed.search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': byteLength,
          'User-Agent': 'Spyglass-Webhook/1.0',
          'X-Spyglass-Event': 'scan.completed',
          'X-Spyglass-Scan-Id': payload.scan_id || ''
        },
        timeout: 10000,
        rejectUnauthorized: false // Allow self-signed certs for dev webhooks
      };

      const req = lib.request(options, (res) => {
        // Drain response body to free socket
        res.resume();
        console.log(`[HeadlessWorker] Webhook → ${webhookUrl} : HTTP ${res.statusCode}`);
        resolve({ statusCode: res.statusCode });
      });

      req.on('timeout', () => {
        req.destroy();
        console.error(`[HeadlessWorker] Webhook timeout: ${webhookUrl}`);
        resolve({ error: 'timeout' });
      });

      req.on('error', (err) => {
        console.error(`[HeadlessWorker] Webhook error: ${webhookUrl} — ${err.message}`);
        resolve({ error: err.message });
      });

      req.write(body);
      req.end();
    } catch (err) {
      console.error('[HeadlessWorker] Webhook setup error:', err.message);
      resolve({ error: err.message });
    }
  });
}

// ── Integration log writer ────────────────────────────────────────────────────

/**
 * Write an audit record to integration_logs.
 * Non-fatal — never throws.
 *
 * Used for:
 *   - 'synthesis_completed': reasoning lineage (Lior/7AI due diligence)
 *   - 'cache_hit': cost savings proof (Phil/CloudZero)
 *   - 'scan_failed': error audit trail
 */
async function writeIntegrationLog(pool, job, action, metadata) {
  try {
    await pool.query(`
      INSERT INTO integration_logs (org_id, user_id, action, target_system, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      job.org_id || null,
      job.user_id || null,
      action,
      'headless_api',
      JSON.stringify({
        scan_id: job.id,
        url: job.url,
        depth: job.depth || 'quick',
        ...metadata
      })
    ]);
  } catch (err) {
    // Non-fatal: logging failure should never break the scan pipeline
    console.error('[HeadlessWorker] Integration log write failed (non-fatal):', err.message);
  }
}

// ── TTL purge ─────────────────────────────────────────────────────────────────

/**
 * Purge raw content from expired stateless scans.
 *
 * After the 24h TTL:
 *   - dom_hash: cleared (raw content fingerprint)
 *   - source_urls: cleared (URL list)
 *   - synthesis_json: RETAINED (the intelligence product)
 *   - integration_logs: RETAINED (audit trail)
 *
 * This respects data privacy (Jonathan/Maven AGI use case):
 * The raw web content and URL lists expire, but the synthesized
 * intelligence and audit trail persist for compliance.
 */
async function purgeExpiredScanData(pool) {
  const { rowCount } = await pool.query(`
    UPDATE scans
    SET
      dom_hash = NULL,
      source_urls = NULL
    WHERE ttl_purge_at < NOW()
      AND ttl_purge_at IS NOT NULL
      AND (dom_hash IS NOT NULL OR source_urls IS NOT NULL)
  `);

  if (rowCount > 0) {
    console.log(`[HeadlessWorker] TTL purge: cleared raw data from ${rowCount} expired stateless scan(s)`);
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Exports ───────────────────────────────────────────────────────────────────

module.exports = { startWorker };
