/**
 * Cron scheduler for Spyglass
 * Runs daily scans and sends email briefs
 */
const { scanAllForUser } = require('./scraper');
const { analyzeChanges, generateBriefSummary } = require('./analyzer');
const { buildBriefHtml, buildBriefText } = require('./brief-builder');

/**
 * Run the full scan + analyze + brief pipeline for a single user
 */
async function runDailyScan(pool, userId, sendEmailFn) {
  console.log(`[Scheduler] Starting daily scan for user ${userId}`);

  // 1. Scan all URLs
  const scanResults = await scanAllForUser(pool, userId);
  const changedResults = scanResults.filter(r => r.changed);

  console.log(`[Scheduler] Scanned ${scanResults.length} URLs, ${changedResults.length} changes detected`);

  // 2. Analyze changes with AI (v2.1: pass userId for noise_suppressed logging)
  const analyzed = await analyzeChanges(pool, changedResults, { userId });

  // 3. Generate executive summary
  const summary = analyzed.length > 0 ? await generateBriefSummary(analyzed) : null;

  // 4. Build brief
  const htmlContent = buildBriefHtml(analyzed, summary);
  const textContent = buildBriefText(analyzed, summary);

  // 5. Save brief to database (store changes_data for Markdown export)
  const changesData = analyzed.map(c => ({
    competitor: c.competitor || null,
    url: c.url || null,
    label: c.label || null,
    ai: c.ai ? {
      headline: c.ai.headline || null,
      analysis: c.ai.analysis || null,
      category: c.ai.category || null,
      urgency: c.ai.urgency || null,
      confidence_score: c.ai.confidence_score || null,
      observation: c.ai.observation || null,
      strategic_inference: c.ai.strategic_inference || null
    } : null
  }));

  // v2.1: Build reasoning_path using new JSONB structure per finding
  // This is the Reasoning Lineage Protocol — auditable chain-of-thought per change
  const reasoningPath = analyzed.map(c => c.ai?.reasoning_lineage || {
    change_id: `chg_${Date.now().toString(16).toUpperCase()}`,
    trigger: `Change detected on ${c.label || c.url || 'monitored page'}`,
    analysis_steps: [
      `Step 1: ${c.addedCount || 0} lines added, ${c.removedCount || 0} removed`,
      'Step 2: Content analyzed by Skeptic Analyst v2.1',
      'Step 3: Change passed confidence threshold (≥ 0.85)'
    ],
    competitive_impact: c.ai?.analysis || `${c.competitor} updated monitored page`,
    recommended_action: 'Review for competitive implications'
  });

  const briefSubject = analyzed.length > 0
    ? `Spyglass Brief: ${analyzed.length} change${analyzed.length !== 1 ? 's' : ''} detected`
    : 'Spyglass Brief: All quiet today';

  const { rows: [brief] } = await pool.query(
    `INSERT INTO daily_briefs (user_id, subject, html_content, text_content, changes_count, changes_data, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [
      userId,
      briefSubject,
      htmlContent,
      textContent,
      analyzed.length,
      JSON.stringify(changesData)
    ]
  );

  // 5b. Also write to exit-ready briefs table (dual-write for zero-downtime migration)
  // reasoning_path = Reasoning Lineage JSONB (v2.1 — chain-of-thought per finding)
  // model_version = 'gpt-4o-mini' + skeptic-analyst-v2.1 (tracked for cost efficiency)
  // org_id resolved via competitors → organizations chain (from migration 008)
  const { rows: [exitBrief] } = await pool.query(
    `INSERT INTO briefs (org_id, user_id, title, content_md, reasoning_path, model_version, html_content, text_content, changes_count, changes_data, legacy_id, created_at)
     VALUES (
       (SELECT c.org_id FROM competitors c WHERE c.user_id = $1 AND c.org_id IS NOT NULL LIMIT 1),
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
     ) RETURNING id`,
    [
      userId,
      briefSubject,
      textContent || '',
      JSON.stringify(reasoningPath),
      'gpt-4o-mini/skeptic-analyst-v2.1',
      htmlContent,
      textContent,
      analyzed.length,
      JSON.stringify(changesData),
      brief.id
    ]
  ).catch(err => {
    // Non-fatal: don't break email delivery if briefs write fails
    console.error('[Scheduler] briefs dual-write failed (non-fatal):', err.message);
    return { rows: [null] };
  });

  // 6. Send email
  if (sendEmailFn) {
    const { rows: [settings] } = await pool.query(
      `SELECT * FROM email_settings WHERE user_id = $1 AND active = true`,
      [userId]
    );

    if (settings) {
      try {
        await sendEmailFn(settings.email, brief.subject, htmlContent, textContent);
        await pool.query(
          `UPDATE daily_briefs SET sent_at = NOW() WHERE id = $1`,
          [brief.id]
        );
        // Also update briefs.sent_at
        if (exitBrief && exitBrief.id) {
          await pool.query(
            `UPDATE briefs SET sent_at = NOW() WHERE id = $1`,
            [exitBrief.id]
          ).catch(() => {});
        }
        // Log email send to integration_logs (audit trail for due diligence)
        await pool.query(
          `INSERT INTO integration_logs (org_id, user_id, action, target_system, metadata, created_at)
           VALUES (
             (SELECT c.org_id FROM competitors c WHERE c.user_id = $1 AND c.org_id IS NOT NULL LIMIT 1),
             $1, $2, $3, $4, NOW()
           )`,
          [
            userId,
            'email_sent',
            'Email',
            JSON.stringify({ email: settings.email, brief_id: exitBrief?.id || null, legacy_brief_id: brief.id, changes_count: analyzed.length })
          ]
        ).catch(() => {});
        console.log(`[Scheduler] Brief sent to ${settings.email}`);
      } catch (err) {
        console.error(`[Scheduler] Failed to send email: ${err.message}`);
      }
    }
  }

  return {
    briefId: brief.id,
    changesCount: analyzed.length,
    totalScanned: scanResults.length,
    errors: scanResults.filter(r => r.error).length
  };
}

/**
 * Run scans for all users with active email settings
 */
async function runAllDailyScans(pool, sendEmailFn) {
  console.log('[Scheduler] Starting daily scan cycle');

  const { rows: users } = await pool.query(
    `SELECT DISTINCT es.user_id
     FROM email_settings es
     JOIN competitors c ON c.user_id = es.user_id
     WHERE es.active = true AND c.active = true`
  );

  console.log(`[Scheduler] Found ${users.length} users to scan`);

  const results = [];
  for (const user of users) {
    try {
      const result = await runDailyScan(pool, user.user_id, sendEmailFn);
      results.push({ userId: user.user_id, ...result });
    } catch (err) {
      console.error(`[Scheduler] Scan failed for user ${user.user_id}: ${err.message}`);
      results.push({ userId: user.user_id, error: err.message });
    }
  }

  console.log(`[Scheduler] Daily scan cycle complete. ${results.length} users processed.`);
  return results;
}

module.exports = {
  runDailyScan,
  runAllDailyScans
};
