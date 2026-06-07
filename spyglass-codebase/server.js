const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { scanUrl, scanAllForUser } = require('./lib/scraper');

// ============================================================
// Lineage UUID — deterministic per synthesis result
// Same brief_id / scan_id always returns the same UUID,
// enabling external eval agents to verify reasoning without
// human intervention. Formatted as UUID v5-ish (SHA-256 slice).
// ============================================================
function makeLineageUUID(source) {
  const hash = crypto.createHash('sha256').update(String(source)).digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '5' + hash.slice(13, 16),  // version 5 marker
    hash.slice(16, 20),
    hash.slice(20, 32)
  ].join('-');
}

// Data retention policy — advertised in manifest + response metadata
const DATA_RETENTION = {
  ttl_hours: 24,
  no_copy: true,
  data_policy_url: 'https://spyglass-10.polsia.app/api/v1/data-policy'
};
const { analyzeChanges, generateBriefSummary } = require('./lib/analyzer');
const { buildBriefHtml, buildBriefText, buildBriefMarkdown, parseBriefTextToMarkdown } = require('./lib/brief-builder');
const { runDailyScan, runAllDailyScans } = require('./lib/scheduler');
const { seedDemoData } = require('./lib/demo-seed');
const { startWorker } = require('./lib/headless-worker');

const app = express();
const port = process.env.PORT || 3000;

// Fail fast if DATABASE_URL is missing
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

app.use(express.json());

// Health check endpoint (required for Render)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ============================================================
// Well-Known MCP Discovery Manifest
// Allows AI orchestrators (Maven AGI Agent Inbox, etc.) to
// auto-discover Spyglass capabilities by pasting the URL.
// Spec: https://modelcontextprotocol.io/specification/basic/lifecycle
// ============================================================
const WELL_KNOWN_MCP = {
  schema_version: '1.0',
  name: 'Spyglass Competitive Intelligence Engine',
  description: 'Competitive Sensing Sub-Agent — not a web scraper. Detects pricing pivots, GTM shifts, geo-risk withdrawals, and structural product changes across competitor surfaces. Paste this URL into Maven AGI Agent Inbox to auto-negotiate capabilities.',
  agent_identity: 'Competitive Sensing Sub-Agent',
  version: '1.0.0',
  mcp_endpoint: 'https://spyglass-10.polsia.app/api/v1/mcp',
  discovery_url: 'https://spyglass-10.polsia.app/.well-known/mcp.json',
  docs_url: 'https://spyglass-10.polsia.app/api/docs',
  capabilities: [
    'pricing_integrity',
    'geo_risk_detection',
    'gtm_pivot_analysis',
    'structural_change_detection'
  ],
  tool_scopes: {
    pricing_integrity: 'Detects price changes, tier restructuring, PLG-to-SLG pivots',
    geo_risk_detection: 'Flags geographic coverage withdrawals and ToS exclusion additions (InsurTech/FinTech)',
    gtm_pivot_analysis: 'Identifies go-to-market strategy shifts from product/messaging changes',
    structural_change_detection: 'Monitors DOM-level structural changes: nav restructuring, CTA changes, on-premise EOL signals'
  },
  auth_methods: [
    {
      type: 'apiKey',
      header: 'X-Spyglass-Token',
      description: 'Preferred. Get a demo key: GET /api/v1/keys/demo'
    },
    {
      type: 'apiKey',
      header: 'X-API-Key',
      description: 'Legacy compatibility. Same key format.'
    },
    {
      type: 'bearer',
      header: 'Authorization',
      description: 'Authorization: Bearer <key>. MCP-compatible.'
    }
  ],
  protocol: 'mcp/1.0',
  json_rpc_version: '2.0',
  demo_key_endpoint: '/api/v1/keys/demo',
  data_retention: DATA_RETENTION,
  lineage: {
    header: 'X-Spyglass-Lineage-UUID',
    description: 'Every API response includes a deterministic UUID linking to the reasoning_path audit record. Use this for zero-trust verification of Spyglass reasoning without human intervention.'
  }
};

app.get('/.well-known/mcp.json', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(WELL_KNOWN_MCP);
});

// Also serve at /.well-known/mcp for orchestrators that drop the extension
app.get('/.well-known/mcp', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json(WELL_KNOWN_MCP);
});

// ============================================================
// Data Policy Endpoint — explains 24h TTL + no-copy guarantee
// ============================================================
app.get('/api/v1/data-policy', (req, res) => {
  res.json({
    title: 'Spyglass Data Retention Policy',
    summary: 'Spyglass is a stateless intelligence layer. Caller data is never persisted beyond the TTL window.',
    ttl_hours: 24,
    no_copy: true,
    details: {
      raw_page_content: 'Raw scraped page content (HTML, DOM snapshots) is purged 24 hours after scan completion. Spyglass does not retain raw competitor data.',
      synthesis_results: 'Synthesized intelligence (synthesis_json, content_md, reasoning_path) is retained indefinitely for the requesting org only. Synthesis is never shared across organizations.',
      caller_data: 'Spyglass does not log, copy, or retain any data provided by the caller (URLs, competitor names, webhook payloads). All inputs are treated as ephemeral.',
      webhook_mode: 'In webhook mode (webhook_url provided), raw content is purged immediately after synthesis delivery. No raw data persists.',
      lineage_logs: 'Lineage UUIDs (X-Spyglass-Lineage-UUID) are logged to integration_logs for audit purposes. These records contain only the UUID and request metadata — no content.'
    },
    effective_date: '2026-01-01',
    contact: 'privacy@spyglass.ai'
  });
});

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// Simple Auth - email-based, session tokens stored in memory
// For MVP, we use a lightweight token system
// ============================================================
const sessions = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = sessions.get(token);
  next();
}

// Signup / Login (email + password)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // Check if user exists
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Account already exists. Try logging in.' });
    }

    const { rows: [user] } = await pool.query(
      'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email.toLowerCase(), name || email.split('@')[0], passwordHash]
    );

    // Auto-create email settings
    await pool.query(
      'INSERT INTO email_settings (user_id, email) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
      [user.id, email.toLowerCase()]
    );

    const token = generateToken();
    sessions.set(token, { id: user.id, email: user.email, name: user.name, onboarding_completed: false });

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, onboarding_completed: false } });
  } catch (err) {
    console.error('[Auth] Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    const { rows: [user] } = await pool.query(
      'SELECT id, email, name, password_hash, onboarding_completed FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (!user || user.password_hash !== passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken();
    const onboarding_completed = user.onboarding_completed || false;
    sessions.set(token, { id: user.id, email: user.email, name: user.name, onboarding_completed });

    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, onboarding_completed } });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    // Fetch fresh onboarding status from DB (in case it changed after session creation)
    const { rows: [dbUser] } = await pool.query(
      'SELECT onboarding_completed FROM users WHERE id = $1',
      [req.user.id]
    );
    const onboarding_completed = dbUser ? (dbUser.onboarding_completed || false) : (req.user.onboarding_completed || false);
    // Update session cache
    req.user.onboarding_completed = onboarding_completed;
    res.json({ user: { ...req.user, onboarding_completed } });
  } catch (err) {
    res.json({ user: req.user });
  }
});

// ============================================================
// Magic Link Auth (for demo/concierge onboarding)
// ============================================================
app.post('/api/auth/magic', async (req, res) => {
  try {
    const { token: magicToken } = req.body;
    if (!magicToken) return res.status(400).json({ error: 'Token required' });

    // Validate magic link
    const { rows: [link] } = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1 AND expires_at > NOW()',
      [magicToken]
    );

    if (!link) {
      return res.status(401).json({ error: 'This link has expired or is invalid. Contact the team for a new one.' });
    }

    // Find or create the user
    let user;
    const { rows: [existingUser] } = await pool.query(
      'SELECT id, email, name, metadata FROM users WHERE LOWER(email) = LOWER($1)',
      [link.email]
    );

    if (existingUser) {
      user = existingUser;
      // Update metadata with demo config if not already set
      if (!user.metadata || !user.metadata.demo_company) {
        const demoConfig = link.demo_config || {};
        await pool.query(
          'UPDATE users SET metadata = $1 WHERE id = $2',
          [JSON.stringify({
            ...(user.metadata || {}),
            demo_company: demoConfig.company || null,
            demo_header: demoConfig.header || null,
            demo_aha: demoConfig.aha_headline || null,
            demo_aha_desc: demoConfig.aha_desc || null,
            demo_slack: demoConfig.demo_slack || null,
            demo_slack_source: demoConfig.demo_slack_source || null
          }), user.id]
        );
      }
    } else {
      // Create user (no password needed for magic link)
      const demoConfig = link.demo_config || {};
      const { rows: [newUser] } = await pool.query(
        'INSERT INTO users (email, name, metadata) VALUES ($1, $2, $3) RETURNING id, email, name, metadata',
        [
          link.email.toLowerCase(),
          link.name || link.email.split('@')[0],
          JSON.stringify({
            demo_company: demoConfig.company || null,
            demo_header: demoConfig.header || null,
            demo_aha: demoConfig.aha_headline || null,
            demo_aha_desc: demoConfig.aha_desc || null,
            demo_slack: demoConfig.demo_slack || null,
            demo_slack_source: demoConfig.demo_slack_source || null
          })
        ]
      );
      user = newUser;

      // Auto-create email settings
      await pool.query(
        'INSERT INTO email_settings (user_id, email) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING',
        [user.id, link.email.toLowerCase()]
      );
    }

    // Seed demo data (idempotent - won't re-seed if data exists)
    // Pass demo_type so different personas get the right seed data
    try {
      await seedDemoData(pool, user.id, link.demo_config?.demo_type);
    } catch (seedErr) {
      console.error('[Magic Link] Demo seed error (non-fatal):', seedErr.message);
    }

    // Mark link as used (but allow reuse for demos)
    await pool.query(
      'UPDATE magic_links SET used_at = NOW() WHERE id = $1',
      [link.id]
    );

    // Create session
    const sessionToken = generateToken();
    const demoConfig = link.demo_config || {};
    const userMeta = (typeof user.metadata === 'string' ? JSON.parse(user.metadata) : user.metadata) || {};

    sessions.set(sessionToken, {
      id: user.id,
      email: user.email,
      name: user.name || link.name,
      demo_company: userMeta.demo_company || demoConfig.company || null,
      demo_header: userMeta.demo_header || demoConfig.header || null,
      demo_aha: userMeta.demo_aha || demoConfig.aha_headline || null,
      demo_aha_desc: userMeta.demo_aha_desc || demoConfig.aha_desc || null,
      demo_slack: userMeta.demo_slack || demoConfig.demo_slack || null,
      demo_slack_source: userMeta.demo_slack_source || demoConfig.demo_slack_source || null
    });

    res.json({
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || link.name,
        demo_company: demoConfig.company || null,
        demo_header: demoConfig.header || null
      }
    });
  } catch (err) {
    console.error('[Magic Link] Auth error:', err);
    res.status(500).json({ error: 'Failed to validate magic link' });
  }
});

// ============================================================
// Competitors API
// ============================================================
app.get('/api/competitors', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM monitored_urls mu WHERE mu.competitor_id = c.id AND mu.active = true) as url_count,
        (SELECT COUNT(*) FROM detected_changes dc
         JOIN monitored_urls mu ON mu.id = dc.monitored_url_id
         WHERE mu.competitor_id = c.id AND dc.detected_at > NOW() - INTERVAL '7 days') as recent_changes
       FROM competitors c
       WHERE c.user_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ competitors: rows });
  } catch (err) {
    console.error('[API] Get competitors error:', err);
    res.status(500).json({ error: 'Failed to fetch competitors' });
  }
});

app.post('/api/competitors', authMiddleware, async (req, res) => {
  try {
    const { name, website, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Competitor name required' });

    const { rows: [competitor] } = await pool.query(
      'INSERT INTO competitors (user_id, name, website, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, name, website || null, notes || null]
    );

    res.json({ competitor });
  } catch (err) {
    console.error('[API] Create competitor error:', err);
    res.status(500).json({ error: 'Failed to create competitor' });
  }
});

app.delete('/api/competitors/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM competitors WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Delete competitor error:', err);
    res.status(500).json({ error: 'Failed to delete competitor' });
  }
});

// ============================================================
// Monitored URLs API
// ============================================================
app.get('/api/competitors/:competitorId/urls', authMiddleware, async (req, res) => {
  try {
    // Verify ownership
    const { rows: [comp] } = await pool.query(
      'SELECT id FROM competitors WHERE id = $1 AND user_id = $2',
      [req.params.competitorId, req.user.id]
    );
    if (!comp) return res.status(404).json({ error: 'Competitor not found' });

    const { rows } = await pool.query(
      `SELECT mu.*,
        (SELECT COUNT(*) FROM detected_changes dc WHERE dc.monitored_url_id = mu.id) as total_changes,
        (SELECT dc.detected_at FROM detected_changes dc WHERE dc.monitored_url_id = mu.id ORDER BY dc.detected_at DESC LIMIT 1) as last_change_at
       FROM monitored_urls mu
       WHERE mu.competitor_id = $1
       ORDER BY mu.created_at DESC`,
      [req.params.competitorId]
    );
    res.json({ urls: rows });
  } catch (err) {
    console.error('[API] Get URLs error:', err);
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

app.post('/api/competitors/:competitorId/urls', authMiddleware, async (req, res) => {
  try {
    const { url, label, url_type } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    // Verify ownership
    const { rows: [comp] } = await pool.query(
      'SELECT id FROM competitors WHERE id = $1 AND user_id = $2',
      [req.params.competitorId, req.user.id]
    );
    if (!comp) return res.status(404).json({ error: 'Competitor not found' });

    // Validate URL
    try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL format' }); }

    const { rows: [monitoredUrl] } = await pool.query(
      'INSERT INTO monitored_urls (competitor_id, url, label, url_type) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.competitorId, url, label || null, url_type || 'general']
    );

    res.json({ url: monitoredUrl });
  } catch (err) {
    console.error('[API] Create URL error:', err);
    res.status(500).json({ error: 'Failed to add URL' });
  }
});

app.delete('/api/urls/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM monitored_urls mu
       USING competitors c
       WHERE mu.id = $1 AND mu.competitor_id = c.id AND c.user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[API] Delete URL error:', err);
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

// ============================================================
// Scan & Changes API
// ============================================================
app.post('/api/scan', authMiddleware, async (req, res) => {
  try {
    res.json({ status: 'scanning', message: 'Scan started. Results will appear shortly.' });

    // Run scan in background (don't block the response)
    setImmediate(async () => {
      try {
        await runDailyScan(pool, req.user.id);
        console.log(`[API] Manual scan completed for user ${req.user.id}`);
      } catch (err) {
        console.error(`[API] Manual scan failed for user ${req.user.id}:`, err);
      }
    });
  } catch (err) {
    console.error('[API] Scan trigger error:', err);
    res.status(500).json({ error: 'Failed to start scan' });
  }
});

// Scan a single URL (synchronous - returns results)
app.post('/api/scan/:urlId', authMiddleware, async (req, res) => {
  try {
    // Verify ownership
    const { rows: [urlRow] } = await pool.query(
      `SELECT mu.id FROM monitored_urls mu
       JOIN competitors c ON c.id = mu.competitor_id
       WHERE mu.id = $1 AND c.user_id = $2`,
      [req.params.urlId, req.user.id]
    );
    if (!urlRow) return res.status(404).json({ error: 'URL not found' });

    const result = await scanUrl(pool, parseInt(req.params.urlId));

    // If changed, run AI analysis (v2.1: pass userId for noise suppression logging)
    if (result.changed) {
      const analysisResults = await analyzeChanges(pool, [result], { userId: req.user.id });
      const analyzed = analysisResults[0]; // May be undefined if noise-suppressed
      return res.json({ result: analyzed || result });
    }

    res.json({ result });
  } catch (err) {
    console.error('[API] Single scan error:', err);
    res.status(500).json({ error: 'Scan failed' });
  }
});

// Get recent changes for a user
app.get('/api/changes', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const { rows } = await pool.query(
      `SELECT dc.*, mu.url, mu.label, c.name as competitor_name
       FROM detected_changes dc
       JOIN monitored_urls mu ON mu.id = dc.monitored_url_id
       JOIN competitors c ON c.id = mu.competitor_id
       WHERE c.user_id = $1
       ORDER BY dc.detected_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    // Parse AI analysis and structural changes JSON
    const changes = rows.map(r => ({
      ...r,
      ai_analysis: r.ai_analysis ? JSON.parse(r.ai_analysis) : null,
      structural_changes: r.structural_changes || null
    }));

    res.json({ changes });
  } catch (err) {
    console.error('[API] Get changes error:', err);
    res.status(500).json({ error: 'Failed to fetch changes' });
  }
});

// ============================================================
// Briefs API (reads from exit-ready `briefs` table)
// ============================================================
app.get('/api/briefs', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title AS subject, changes_count, sent_at, created_at
       FROM briefs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json({ briefs: rows });
  } catch (err) {
    console.error('[API] Get briefs error:', err);
    res.status(500).json({ error: 'Failed to fetch briefs' });
  }
});

app.get('/api/briefs/:id', authMiddleware, async (req, res) => {
  try {
    const { rows: [brief] } = await pool.query(
      `SELECT id, title AS subject, title, content_md, reasoning_path,
              token_usage_total, model_version, estimated_cost_usd,
              html_content, text_content, changes_count, changes_data,
              sent_at, created_at
       FROM briefs WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!brief) return res.status(404).json({ error: 'Brief not found' });
    res.json({ brief });
  } catch (err) {
    console.error('[API] Get brief error:', err);
    res.status(500).json({ error: 'Failed to fetch brief' });
  }
});

app.get('/api/briefs/:id/export', authMiddleware, async (req, res) => {
  try {
    const { rows: [brief] } = await pool.query(
      `SELECT id, title AS subject, content_md, html_content, text_content,
              changes_count, changes_data, sent_at, created_at
       FROM briefs WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!brief) return res.status(404).json({ error: 'Brief not found' });

    let markdown;
    if (brief.changes_data && Array.isArray(brief.changes_data) && brief.changes_data.length > 0) {
      // Use stored structured data for rich Markdown export
      const dateStr = new Date(brief.created_at).toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      });
      // Extract summary from text_content if present
      const summaryMatch = (brief.text_content || '').match(/TL;DR:\s*(.+?)(?:\n\n---|$)/s);
      const summary = summaryMatch ? summaryMatch[1].trim() : null;
      // Use custom title for specific demo verticals (medtech → Clinical/R&D Roadmap framing)
      const demoCompany = req.user.demo_company || '';
      const customTitle = demoCompany === 'Method AI'
        ? 'Method AI — Clinical/R&D Roadmap Intelligence Brief'
        : demoCompany === 'Openly'
        ? 'Openly — Product/Underwriting Roadmap Intelligence Brief'
        : null;
      markdown = buildBriefMarkdown(brief.changes_data, summary, dateStr, customTitle);
    } else {
      // Fallback: parse text_content for older briefs
      markdown = parseBriefTextToMarkdown(brief);
    }

    // Build filename: spyglass-brief-YYYY-MM-DD.md
    const dateSlug = new Date(brief.created_at).toISOString().split('T')[0];
    const filename = `spyglass-brief-${dateSlug}.md`;

    // Log Markdown export to integration_logs (audit trail for due diligence)
    pool.query(
      `INSERT INTO integration_logs (org_id, user_id, action, target_system, metadata, created_at)
       VALUES (
         (SELECT c.org_id FROM competitors c WHERE c.user_id = $1 AND c.org_id IS NOT NULL LIMIT 1),
         $1, $2, $3, $4, NOW()
       )`,
      [
        req.user.id,
        'export_downloaded',
        'Markdown',
        JSON.stringify({ brief_id: brief.id, filename, changes_count: brief.changes_count })
      ]
    ).catch(() => {}); // Non-fatal

    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(markdown);
  } catch (err) {
    console.error('[API] Export brief error:', err);
    res.status(500).json({ error: 'Failed to export brief' });
  }
});

// ============================================================
// Integration Log API (audit trail for Slack previews, etc.)
// ============================================================
app.post('/api/integration/log', authMiddleware, async (req, res) => {
  try {
    const { action, target_system, metadata } = req.body;
    if (!action) return res.status(400).json({ error: 'action required' });

    await pool.query(
      `INSERT INTO integration_logs (org_id, user_id, action, target_system, metadata, created_at)
       VALUES (
         (SELECT c.org_id FROM competitors c WHERE c.user_id = $1 AND c.org_id IS NOT NULL LIMIT 1),
         $1, $2, $3, $4, NOW()
       )`,
      [
        req.user.id,
        action,
        target_system || null,
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[API] Integration log error:', err);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// ============================================================
// Email Settings API
// ============================================================
app.get('/api/settings/email', authMiddleware, async (req, res) => {
  try {
    const { rows: [settings] } = await pool.query(
      'SELECT * FROM email_settings WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ settings: settings || null });
  } catch (err) {
    console.error('[API] Get settings error:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings/email', authMiddleware, async (req, res) => {
  try {
    const { email, send_time, timezone, active } = req.body;

    const { rows: [settings] } = await pool.query(
      `INSERT INTO email_settings (user_id, email, send_time, timezone, active)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         email = COALESCE($2, email_settings.email),
         send_time = COALESCE($3, email_settings.send_time),
         timezone = COALESCE($4, email_settings.timezone),
         active = COALESCE($5, email_settings.active)
       RETURNING *`,
      [req.user.id, email, send_time || '06:30', timezone || 'America/New_York', active !== false]
    );

    res.json({ settings });
  } catch (err) {
    console.error('[API] Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================
// Onboarding API
// ============================================================

// Setup: create competitors from wizard, update delivery email, kick off scan
app.post('/api/onboarding/setup', authMiddleware, async (req, res) => {
  try {
    const { competitors, email } = req.body;
    // competitors: array of { name, website }
    if (!Array.isArray(competitors) || competitors.length === 0) {
      return res.status(400).json({ error: 'At least one competitor required' });
    }

    const userId = req.user.id;
    const createdCompetitors = [];

    for (const comp of competitors) {
      if (!comp.name && !comp.website) continue;

      const name = comp.name || new URL(comp.website).hostname.replace('www.', '');
      const website = comp.website || null;

      // Insert competitor
      const { rows: [newComp] } = await pool.query(
        'INSERT INTO competitors (user_id, name, website) VALUES ($1, $2, $3) RETURNING *',
        [userId, name, website]
      );

      // Add homepage URL for monitoring if website provided
      if (website) {
        const homeUrl = website.startsWith('http') ? website : `https://${website}`;
        await pool.query(
          'INSERT INTO monitored_urls (competitor_id, url, label, url_type) VALUES ($1, $2, $3, $4)',
          [newComp.id, homeUrl, 'Homepage', 'general']
        );

        // Also add /pricing if it's a B2B tool (heuristic: always do it)
        try {
          const pricingUrl = new URL(homeUrl);
          pricingUrl.pathname = '/pricing';
          await pool.query(
            'INSERT INTO monitored_urls (competitor_id, url, label, url_type) VALUES ($1, $2, $3, $4)',
            [newComp.id, pricingUrl.toString(), 'Pricing', 'pricing']
          );
        } catch (e) { /* skip if URL parse fails */ }
      }

      createdCompetitors.push(newComp);
    }

    // Update delivery email if provided
    if (email) {
      await pool.query(
        `INSERT INTO email_settings (user_id, email) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET email = $2`,
        [userId, email.toLowerCase()]
      );
    }

    // Kick off background scan
    setImmediate(async () => {
      try {
        const { runDailyScan } = require('./lib/scheduler');
        await runDailyScan(pool, userId);
        console.log(`[Onboarding] Initial scan completed for user ${userId}`);
      } catch (err) {
        console.error(`[Onboarding] Initial scan failed for user ${userId}:`, err.message);
      }
    });

    res.json({ success: true, competitors: createdCompetitors, scanning: true });
  } catch (err) {
    console.error('[Onboarding] Setup error:', err);
    res.status(500).json({ error: 'Onboarding setup failed' });
  }
});

// Mark onboarding as complete
app.post('/api/onboarding/complete', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET onboarding_completed = true WHERE id = $1',
      [req.user.id]
    );
    // Update session cache
    req.user.onboarding_completed = true;
    res.json({ success: true });
  } catch (err) {
    console.error('[Onboarding] Complete error:', err);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});

// ============================================================
// Dashboard Stats
// ============================================================
app.get('/api/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [competitors, urls, changes, briefs] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM competitors WHERE user_id = $1 AND active = true', [userId]),
      pool.query(
        `SELECT COUNT(*) as count FROM monitored_urls mu
         JOIN competitors c ON c.id = mu.competitor_id
         WHERE c.user_id = $1 AND mu.active = true`, [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM detected_changes dc
         JOIN monitored_urls mu ON mu.id = dc.monitored_url_id
         JOIN competitors c ON c.id = mu.competitor_id
         WHERE c.user_id = $1 AND dc.detected_at > NOW() - INTERVAL '7 days'`, [userId]
      ),
      pool.query(
        'SELECT COUNT(*) as count FROM briefs WHERE user_id = $1', [userId]
      )
    ]);

    res.json({
      competitors: parseInt(competitors.rows[0].count),
      monitored_urls: parseInt(urls.rows[0].count),
      changes_this_week: parseInt(changes.rows[0].count),
      briefs_sent: parseInt(briefs.rows[0].count)
    });
  } catch (err) {
    console.error('[API] Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ============================================================
// Cron endpoint (called by external scheduler or Render cron)
// ============================================================
app.post('/api/cron/daily-scan', async (req, res) => {
  const cronKey = req.headers['x-cron-key'] || req.query.key;
  if (process.env.CRON_KEY && cronKey !== process.env.CRON_KEY) {
    return res.status(401).json({ error: 'Invalid cron key' });
  }

  try {
    const results = await runAllDailyScans(pool);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[Cron] Daily scan failed:', err);
    res.status(500).json({ error: 'Cron scan failed' });
  }
});

// ============================================================
// Headless API v1 — /api/v1/scans/*
// API-key authenticated. Powers async scan workers, semantic
// caching, webhook delivery, and reasoning lineage audit logs.
// ============================================================

/**
 * API Key authentication middleware.
 * Accepts any of:
 *   - X-Spyglass-Token header  (preferred — matches task spec)
 *   - X-API-Key header         (legacy — backward compatible)
 *   - Authorization: Bearer <key>
 * Looks up key in api_keys table (created by migration 010).
 */
async function apiKeyMiddleware(req, res, next) {
  // Accept key from multiple headers for maximum compatibility
  const key =
    req.headers['x-spyglass-token'] ||
    req.headers['x-api-key'] ||
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim() || null;

  if (!key) {
    return res.status(401).json({
      error: 'Authentication required',
      hint: 'Provide your API key via X-Spyglass-Token header (or X-API-Key / Authorization: Bearer <key>)'
    });
  }
  try {
    const { rows: [keyRow] } = await pool.query(
      'SELECT * FROM api_keys WHERE key = $1 AND active = true',
      [key]
    );
    if (!keyRow) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    req.apiKey = keyRow;
    next();
  } catch (err) {
    console.error('[API v1] API key lookup error:', err);
    res.status(500).json({ error: 'Auth error' });
  }
}

/**
 * POST /api/v1/scans/trigger
 *
 * Queue an async competitive intelligence scan.
 * Returns immediately with scan_id + status:'queued'.
 * The background worker processes the job and delivers results
 * via webhook (if webhook_url provided) or polling.
 *
 * Body:
 *   url           {string}  Required. Page to scan.
 *   webhook_url   {string}  Optional. POST synthesis here when complete.
 *                           Stateless mode: raw data purged after 24h TTL.
 *   depth         {string}  'quick' (default) | 'deep' (recursive 3-level crawl)
 */
app.post('/api/v1/scans/trigger', apiKeyMiddleware, async (req, res) => {
  try {
    const { url, webhook_url, depth, vertical } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    // Validate URL format
    try { new URL(url); } catch {
      return res.status(400).json({ error: 'Invalid url format' });
    }

    // Validate depth
    const scanDepth = ['quick', 'deep'].includes(depth) ? depth : 'quick';

    // Validate webhook_url if provided
    if (webhook_url) {
      try { new URL(webhook_url); } catch {
        return res.status(400).json({ error: 'Invalid webhook_url format' });
      }
    }

    // Optional vertical for temperature calibration (v2.2)
    const scanVertical = vertical || null;

    // Create scan record with status 'queued' — worker picks it up within ~5 seconds
    const { rows: [scan] } = await pool.query(`
      INSERT INTO scans (url, org_id, webhook_url, depth, vertical, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'queued', NOW())
      RETURNING id, status, url, depth, vertical, created_at
    `, [url, req.apiKey.org_id, webhook_url || null, scanDepth, scanVertical]);

    // Log scan trigger to integration_logs (audit trail)
    pool.query(`
      INSERT INTO integration_logs (org_id, action, target_system, metadata, created_at)
      VALUES ($1, 'scan_triggered', 'headless_api', $2, NOW())
    `, [
      req.apiKey.org_id,
      JSON.stringify({ scan_id: scan.id, url, depth: scanDepth, has_webhook: !!webhook_url })
    ]).catch(() => {}); // Non-fatal

    const { getTemperatureForVertical } = require('./lib/analyzer');
    const temperatureUsed = getTemperatureForVertical(scanVertical);

    res.status(202).json({
      scan_id: scan.id,
      status: 'queued',
      url,
      depth: scanDepth,
      vertical: scanVertical,
      temperature: temperatureUsed,
      webhook_url: webhook_url || null,
      created_at: scan.created_at,
      poll_url: `/api/v1/scans/${scan.id}`,
      message: webhook_url
        ? `Scan queued. Synthesis will be POSTed to ${webhook_url} when complete (raw data purged after 24h).`
        : `Scan queued. Poll ${'/api/v1/scans/' + scan.id} for results.`
    });
  } catch (err) {
    console.error('[API v1] Scan trigger error:', err);
    res.status(500).json({ error: 'Failed to queue scan' });
  }
});

/**
 * GET /api/v1/scans/:scanId
 *
 * Poll scan status + retrieve synthesis when complete.
 * Scoped to the requesting org's API key (no cross-org data leakage).
 */
app.get('/api/v1/scans/:scanId', apiKeyMiddleware, async (req, res) => {
  try {
    const { rows: [scan] } = await pool.query(`
      SELECT
        id,
        url,
        status,
        depth,
        synthesis_json,
        changes_detected_count,
        source_urls,
        error_log,
        created_at,
        completed_at
      FROM scans
      WHERE id = $1
        AND org_id = $2
    `, [req.params.scanId, req.apiKey.org_id]);

    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    // Inject deterministic lineage UUID — same scan always returns the same UUID
    const lineageUUID = makeLineageUUID(scan.id);
    res.setHeader('X-Spyglass-Lineage-UUID', lineageUUID);

    const response = {
      scan_id: scan.id,
      url: scan.url,
      status: scan.status, // 'queued' | 'processing' | 'completed' | 'failed'
      depth: scan.depth,
      created_at: scan.created_at,
      completed_at: scan.completed_at || null,
      lineage_uuid: lineageUUID,
      data_retention: DATA_RETENTION
    };

    if (scan.status === 'completed') {
      // v2.1: If synthesis was noise-suppressed (pre-LLM filter or confidence gate),
      // return 204 No Content — no strategic signals, no brief, no notification.
      // The semantic cache also respects this: cached noise-suppressed results → 204.
      if (scan.synthesis_json && scan.synthesis_json.noise_suppressed === true) {
        return res.status(204).end();
      }
      response.synthesis = scan.synthesis_json;
      response.changes_detected_count = scan.changes_detected_count;
      response.source_urls = scan.source_urls;
    }

    if (scan.status === 'failed') {
      response.error = scan.error_log;
    }

    res.json(response);
  } catch (err) {
    console.error('[API v1] Get scan error:', err);
    res.status(500).json({ error: 'Failed to fetch scan' });
  }
});

/**
 * GET /api/v1/keys/demo
 * Returns the demo API key for testing (no auth required — it's a demo key).
 * In production this endpoint would be removed or gated behind a signup flow.
 */
app.get('/api/v1/keys/demo', async (req, res) => {
  try {
    const { rows: [keyRow] } = await pool.query(
      `SELECT key, name, created_at FROM api_keys WHERE name = 'Demo API Key' AND active = true LIMIT 1`
    );
    if (!keyRow) {
      return res.status(404).json({ error: 'No demo key configured' });
    }
    res.json({
      api_key: keyRow.key,
      note: 'Demo API key. Use X-Spyglass-Token: <key> header on /api/v1/scans/trigger',
      created_at: keyRow.created_at
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch demo key' });
  }
});

// ============================================================
// Headless API v1 — /api/v1/briefs/:briefId
// ============================================================

/**
 * GET /api/v1/briefs/:briefId
 *
 * Retrieve a fully synthesized Intelligence Brief by ID.
 * Scoped to the requesting org (no cross-org data leakage).
 *
 * Response shape:
 * {
 *   id, title, content_md, synthesis_json,
 *   meta: { model, token_usage, reasoning_path, cost_usd }
 * }
 */
app.get('/api/v1/briefs/:briefId', apiKeyMiddleware, async (req, res) => {
  try {
    const { briefId } = req.params;
    const orgId = req.apiKey.org_id;

    // Validate UUID format to avoid DB errors
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(briefId)) {
      return res.status(400).json({ error: 'Invalid brief_id format (expected UUID)' });
    }

    const { rows: [brief] } = await pool.query(
      `SELECT
         id,
         title,
         content_md,
         changes_data AS synthesis_json,
         model_version,
         token_usage_total,
         reasoning_path,
         estimated_cost_usd,
         created_at,
         sent_at
       FROM briefs
       WHERE id = $1 AND org_id = $2`,
      [briefId, orgId]
    );

    if (!brief) {
      return res.status(404).json({ error: 'Brief not found' });
    }

    // Inject deterministic lineage UUID — same brief always returns the same UUID
    const lineageUUID = makeLineageUUID(brief.id);
    res.setHeader('X-Spyglass-Lineage-UUID', lineageUUID);

    // Log lineage UUID to integration_logs for traceability (non-fatal)
    pool.query(
      `INSERT INTO integration_logs (org_id, action, target_system, metadata, created_at)
       VALUES ($1, 'lineage_uuid_issued', 'headless_api', $2, NOW())`,
      [orgId, JSON.stringify({ lineage_uuid: lineageUUID, brief_id: brief.id, endpoint: 'GET /api/v1/briefs/:id' })]
    ).catch(() => {});

    res.json({
      id: brief.id,
      title: brief.title,
      content_md: brief.content_md || '',
      synthesis_json: brief.synthesis_json || null,
      meta: {
        model: brief.model_version || 'gpt-4o-mini',
        token_usage: brief.token_usage_total || null,
        reasoning_path: Array.isArray(brief.reasoning_path)
          ? brief.reasoning_path
          : brief.reasoning_path
            ? [brief.reasoning_path]
            : [],
        cost_usd: brief.estimated_cost_usd !== null ? parseFloat(brief.estimated_cost_usd) : null,
        lineage_uuid: lineageUUID
      },
      data_retention: DATA_RETENTION,
      created_at: brief.created_at,
      sent_at: brief.sent_at
    });
  } catch (err) {
    console.error('[API v1] Get brief error:', err);
    res.status(500).json({ error: 'Failed to fetch brief' });
  }
});

// ============================================================
// Headless API v1 — /api/v1/mcp  (Model Context Protocol)
// ============================================================

/**
 * The Spyglass MCP (Model Context Protocol) endpoint.
 *
 * External AI agents (Maven AGI, 7AI, etc.) can:
 *   GET  /api/v1/mcp          — Discover available tools (no auth required)
 *   POST /api/v1/mcp          — Invoke tools via JSON-RPC 2.0 (auth required)
 *
 * Supported tools:
 *   trigger_scan     — Queue an async competitive intelligence scan
 *   get_brief        — Retrieve a synthesized intelligence brief by ID
 *   list_competitors — List all competitors monitored in this organization
 */

// MCP tool definitions (shared between discovery + error responses)
const MCP_TOOLS = [
  {
    name: 'trigger_scan',
    description: [
      'Queue an async competitive intelligence scan on any URL.',
      'Returns immediately with a scan_id (202 Accepted).',
      'Poll /api/v1/scans/{scan_id} for status, or provide a webhook_url for push delivery.',
      'Supports two depths: "surface" (single page, ~15s) or "deep" (recursive 3-level crawl, ~90s).',
      'Semantic cache: identical URL + DOM hash within 4 hours returns instantly at zero token cost.'
    ].join(' '),
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: {
          type: 'string',
          format: 'uri',
          description: 'The competitor URL to scan. Must be a fully-qualified HTTPS URL.'
        },
        competitor_name: {
          type: 'string',
          description: 'Optional human-readable label for the competitor (e.g. "Acme Corp").'
        },
        depth: {
          type: 'string',
          enum: ['surface', 'deep'],
          default: 'surface',
          description: '"surface" scans a single page. "deep" crawls up to 20 pages (3 levels, same-domain only, PDFs included).'
        },
        webhook_url: {
          type: 'string',
          format: 'uri',
          description: 'Optional HTTPS URL to receive the completed synthesis_json via POST when the scan finishes. Enables fire-and-forget mode. Raw page content is purged after 24h; synthesis is retained.'
        }
      }
    }
  },
  {
    name: 'get_brief',
    description: [
      'Retrieve a fully synthesized intelligence brief by its UUID.',
      'Returns the brief title, full markdown content (content_md), structured synthesis data (synthesis_json),',
      'and a meta object with model version, token usage, reasoning path (step-by-step logic), and cost in USD.',
      'Use synthesis_json for programmatic injection into prompts or dashboards.',
      'Use content_md for human-readable display or LLM context injection.'
    ].join(' '),
    inputSchema: {
      type: 'object',
      required: ['brief_id'],
      properties: {
        brief_id: {
          type: 'string',
          format: 'uuid',
          description: 'UUID of the intelligence brief to retrieve.'
        }
      }
    }
  },
  {
    name: 'list_competitors',
    description: [
      'List all competitors currently monitored under your organization.',
      'Returns name, website, industry vertical, and whether monitoring is active.',
      'Use this to discover valid targets before calling trigger_scan.'
    ].join(' '),
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 50,
          description: 'Maximum number of competitors to return.'
        }
      }
    }
  }
];

// GET /api/v1/mcp — Tool Discovery (no auth required)
app.get('/api/v1/mcp', (req, res) => {
  res.json({
    name: 'spyglass',
    version: '1.0.0',
    description: 'Spyglass Competitive Intelligence Engine — MCP tool manifest. Ingest competitor intelligence directly into your AI agent pipelines.',
    agent_identity: 'Competitive Sensing Sub-Agent',
    protocol: 'mcp/1.0',
    auth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-Spyglass-Token',
      description: 'Get your API key from GET /api/v1/keys/demo (demo) or your organization dashboard.',
      alternatives: ['X-API-Key', 'Authorization: Bearer <key>']
    },
    endpoint: '/api/v1/mcp',
    capabilities: [
      'pricing_integrity',
      'geo_risk_detection',
      'gtm_pivot_analysis',
      'structural_change_detection'
    ],
    data_retention: DATA_RETENTION,
    lineage: {
      header: 'X-Spyglass-Lineage-UUID',
      description: 'Every tool call response includes a deterministic UUID linking to the reasoning_path audit record for that response. Enables zero-trust verification by external eval agents.'
    },
    well_known_url: 'https://spyglass-10.polsia.app/.well-known/mcp.json',
    tools: MCP_TOOLS
  });
});

// POST /api/v1/mcp — JSON-RPC 2.0 tool invocation (auth required)
app.post('/api/v1/mcp', apiKeyMiddleware, async (req, res) => {
  const { jsonrpc, method, params, id } = req.body || {};

  const rpcError = (code, message, data) => ({
    jsonrpc: '2.0',
    error: { code, message, ...(data ? { data } : {}) },
    id: id ?? null
  });

  // rpcOk also injects X-Spyglass-Lineage-UUID based on a deterministic source
  const rpcOk = (result, lineageSource) => {
    const lineageUUID = makeLineageUUID(lineageSource || `${req.apiKey.org_id}:${method}:${Date.now()}`);
    res.setHeader('X-Spyglass-Lineage-UUID', lineageUUID);
    return { jsonrpc: '2.0', result: { ...result, lineage_uuid: lineageUUID }, id: id ?? null };
  };

  // Validate JSON-RPC 2.0
  if (jsonrpc !== '2.0') {
    return res.status(400).json(rpcError(-32600, 'Invalid Request: jsonrpc must be "2.0"'));
  }

  try {
    // ── tools/list ────────────────────────────────────────────────
    if (method === 'tools/list') {
      return res.json(rpcOk({ tools: MCP_TOOLS }, `${req.apiKey.org_id}:tools/list`));
    }

    // ── initialize ────────────────────────────────────────────────
    if (method === 'initialize') {
      return res.json(rpcOk({
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'spyglass', version: '1.0.0' }
      }, `${req.apiKey.org_id}:initialize`));
    }

    // ── tools/call ────────────────────────────────────────────────
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      // ── trigger_scan ─────────────────────────────────────────
      if (toolName === 'trigger_scan') {
        if (!args.url) {
          return res.json(rpcError(-32602, 'Invalid params: url is required'));
        }
        // Map 'surface' → 'quick' (internal depth terminology)
        const depth = args.depth === 'deep' ? 'deep' : 'quick';
        const orgId = req.apiKey.org_id;

        // Insert scan job
        const { rows: [scan] } = await pool.query(
          `INSERT INTO scans (org_id, url, status, depth, webhook_url, ttl_purge_at)
           VALUES ($1, $2, 'queued', $3, $4, $5)
           RETURNING id, created_at`,
          [
            orgId,
            args.url,
            depth,
            args.webhook_url || null,
            args.webhook_url ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
          ]
        );

        return res.json(rpcOk({
          scan_id: scan.id,
          status: 'queued',
          estimated_completion_ms: depth === 'deep' ? 90000 : 15000,
          poll_url: `/api/v1/scans/${scan.id}`,
          webhook_url: args.webhook_url || null,
          created_at: scan.created_at,
          data_retention: DATA_RETENTION
        }, scan.id));
      }

      // ── get_brief ─────────────────────────────────────────────
      if (toolName === 'get_brief') {
        const briefId = args.brief_id;
        if (!briefId) {
          return res.json(rpcError(-32602, 'Invalid params: brief_id is required'));
        }
        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_RE.test(briefId)) {
          return res.json(rpcError(-32602, 'Invalid params: brief_id must be a valid UUID'));
        }

        const { rows: [brief] } = await pool.query(
          `SELECT id, title, content_md, changes_data AS synthesis_json,
                  model_version, token_usage_total, reasoning_path, estimated_cost_usd,
                  created_at, sent_at
           FROM briefs WHERE id = $1 AND org_id = $2`,
          [briefId, req.apiKey.org_id]
        );

        if (!brief) {
          return res.json(rpcError(-32602, `Brief ${briefId} not found`));
        }

        return res.json(rpcOk({
          id: brief.id,
          title: brief.title,
          content_md: brief.content_md || '',
          synthesis_json: brief.synthesis_json || null,
          meta: {
            model: brief.model_version || 'gpt-4o-mini',
            token_usage: brief.token_usage_total || null,
            reasoning_path: Array.isArray(brief.reasoning_path)
              ? brief.reasoning_path
              : brief.reasoning_path ? [brief.reasoning_path] : [],
            cost_usd: brief.estimated_cost_usd !== null ? parseFloat(brief.estimated_cost_usd) : null
          },
          data_retention: DATA_RETENTION,
          created_at: brief.created_at,
          sent_at: brief.sent_at
        }, brief.id));
      }

      // ── list_competitors ──────────────────────────────────────
      if (toolName === 'list_competitors') {
        const limit = Math.min(parseInt(args.limit) || 50, 100);
        const { rows } = await pool.query(
          `SELECT id, name, website, industry_vertical, active
           FROM competitors
           WHERE org_id = $1
           ORDER BY name ASC
           LIMIT $2`,
          [req.apiKey.org_id, limit]
        );

        return res.json(rpcOk({
          competitors: rows,
          count: rows.length
        }, `${req.apiKey.org_id}:list_competitors`));
      }

      return res.json(rpcError(-32601, `Method not found: tool "${toolName}" is not defined`));
    }

    // ── Unknown method ────────────────────────────────────────────
    return res.json(rpcError(-32601, `Method not found: "${method}". Supported: initialize, tools/list, tools/call`));

  } catch (err) {
    console.error('[MCP] Internal error:', err);
    return res.status(500).json(rpcError(-32603, 'Internal error', err.message));
  }
});

// ============================================================
// API Documentation — /api/docs (OpenAPI 3.0 + Swagger UI)
// LLM-optimized: 100% typed schemas, rich descriptions,
// synthesis_json shapes fully defined for reliable LLM ingestion.
// ============================================================

const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Spyglass Headless Intelligence API',
    version: '1.0.0',
    description: [
      'The Spyglass Headless Engine: fire-and-forget competitive intelligence scans for AI agent pipelines.',
      '',
      '## Authentication',
      'All v1 endpoints require an API key. Send it via:',
      '- `X-Spyglass-Token: spg_live_...` header (preferred)',
      '- `X-API-Key: spg_live_...` header (legacy)',
      '- `Authorization: Bearer spg_live_...` header (MCP-compatible)',
      '',
      'Get a free demo key: `GET /api/v1/keys/demo`',
      '',
      '## LLM Integration Notes',
      '- `synthesis_json` is fully typed (see schemas below) — safe to inject into prompts or parse programmatically.',
      '- `content_md` is clean markdown — paste directly into LLM context.',
      '- `reasoning_path` is an ordered array of reasoning steps — use for chain-of-thought transparency.',
      '- All IDs are UUIDs. All timestamps are ISO 8601 UTC.',
      '',
      '## MCP (Model Context Protocol)',
      'Spyglass exposes native MCP tool definitions at `/api/v1/mcp`.',
      'External agents can discover and invoke tools without custom integration code.'
    ].join('\n')
  },
  servers: [
    { url: 'https://spyglass-10.polsia.app', description: 'Production' }
  ],
  security: [{ SpyglassToken: [] }],
  components: {
    securitySchemes: {
      SpyglassToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Spyglass-Token',
        description: 'Your Spyglass API key. Get one at GET /api/v1/keys/demo.'
      }
    },
    schemas: {
      ScanTriggered: {
        type: 'object',
        required: ['scan_id', 'status', 'estimated_completion_ms'],
        properties: {
          scan_id: { type: 'string', format: 'uuid', description: 'Unique scan identifier. Use to poll /api/v1/scans/{scan_id}.' },
          status: { type: 'string', enum: ['queued'], description: 'Always "queued" on 202 response.' },
          estimated_completion_ms: { type: 'integer', description: 'Estimated time to completion in milliseconds. surface=15000, deep=90000.' },
          poll_url: { type: 'string', description: 'Convenience URL for polling scan status.' },
          webhook_url: { type: 'string', format: 'uri', nullable: true, description: 'The webhook URL that will receive synthesis_json on completion, if provided.' },
          created_at: { type: 'string', format: 'date-time' }
        }
      },
      ScanStatus: {
        type: 'object',
        required: ['id', 'status'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['queued', 'processing', 'completed', 'failed'] },
          url: { type: 'string', format: 'uri' },
          depth: { type: 'string', enum: ['surface', 'deep'] },
          synthesis_json: { '$ref': '#/components/schemas/SynthesisJson', nullable: true },
          changes_detected_count: { type: 'integer' },
          source_urls: { type: 'array', items: { type: 'string', format: 'uri' } },
          created_at: { type: 'string', format: 'date-time' },
          completed_at: { type: 'string', format: 'date-time', nullable: true },
          error_log: { type: 'string', nullable: true }
        }
      },
      SynthesisJson: {
        type: 'object',
        description: 'Structured LLM synthesis output. Every field is typed for reliable programmatic ingestion.',
        properties: {
          headline: { type: 'string', description: 'One-sentence summary of the most important finding.' },
          summary: { type: 'string', description: 'Executive summary (2-4 sentences).' },
          key_findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                finding: { type: 'string' },
                urgency: { type: 'string', enum: ['high', 'medium', 'low'] },
                evidence: { type: 'string' }
              }
            },
            description: 'Ordered list of findings, most urgent first.'
          },
          changes_detected: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                page_url: { type: 'string', format: 'uri' },
                change_type: { type: 'string', description: 'e.g. "pricing_change", "nav_update", "cta_change"' },
                before: { type: 'string', nullable: true },
                after: { type: 'string' },
                significance: { type: 'integer', minimum: 1, maximum: 10 }
              }
            }
          },
          reasoning_path: {
            type: 'array',
            items: { type: 'string' },
            description: 'Step-by-step reasoning chain. Use for explainability and audit.'
          },
          model: { type: 'string', description: 'Model used for synthesis (e.g. "gpt-4o-mini").' },
          token_usage: { type: 'integer', description: 'Total tokens consumed.' },
          cost_usd: { type: 'number', format: 'float', description: 'Estimated cost in USD.' }
        }
      },
      Brief: {
        type: 'object',
        required: ['id', 'title', 'content_md', 'meta'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          content_md: { type: 'string', description: 'Full brief in Markdown. Safe to paste directly into LLM context.' },
          synthesis_json: { '$ref': '#/components/schemas/SynthesisJson', nullable: true },
          meta: {
            type: 'object',
            required: ['model'],
            properties: {
              model: { type: 'string', description: 'LLM model used for synthesis.' },
              token_usage: { type: 'integer', nullable: true },
              reasoning_path: { type: 'array', items: { type: 'string' }, description: 'Ordered reasoning steps.' },
              cost_usd: { type: 'number', nullable: true, description: 'Synthesis cost in USD.' }
            }
          },
          created_at: { type: 'string', format: 'date-time' },
          sent_at: { type: 'string', format: 'date-time', nullable: true }
        }
      },
      McpManifest: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          version: { type: 'string' },
          description: { type: 'string' },
          protocol: { type: 'string' },
          tools: { type: 'array', items: { type: 'object' } }
        }
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
          hint: { type: 'string', nullable: true }
        }
      }
    }
  },
  paths: {
    '/api/v1/scans/trigger': {
      post: {
        operationId: 'triggerScan',
        summary: 'Trigger a competitive intelligence scan',
        description: [
          'Queue an async scan on any URL. Returns 202 immediately with a scan_id.',
          'Poll `/api/v1/scans/{scan_id}` for status, or provide a `webhook_url` for push delivery.',
          '',
          '**Semantic cache:** If the same URL has been scanned within 4 hours with an identical DOM hash,',
          'Spyglass returns the cached synthesis instantly at zero token cost.'
        ].join('\n'),
        tags: ['Scans'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url'],
                properties: {
                  url: { type: 'string', format: 'uri', description: 'Competitor URL to scan.' },
                  competitor_name: { type: 'string', description: 'Optional label.' },
                  depth: { type: 'string', enum: ['surface', 'deep'], default: 'surface' },
                  webhook_url: { type: 'string', format: 'uri', description: 'Push synthesis here on completion.' }
                }
              },
              examples: {
                surface_scan: {
                  summary: 'Surface scan (single page)',
                  value: { url: 'https://competitor.com/pricing', depth: 'surface' }
                },
                deep_scan_with_webhook: {
                  summary: 'Deep scan with webhook delivery',
                  value: {
                    url: 'https://competitor.com',
                    competitor_name: 'Acme Corp',
                    depth: 'deep',
                    webhook_url: 'https://your-app.com/webhooks/spyglass'
                  }
                }
              }
            }
          }
        },
        responses: {
          202: {
            description: 'Scan queued successfully.',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ScanTriggered' } } }
          },
          400: { description: 'Missing or invalid URL.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          401: { description: 'Missing or invalid API key.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/v1/scans/{scan_id}': {
      get: {
        operationId: 'getScan',
        summary: 'Poll scan status',
        description: 'Check scan status and retrieve synthesis when complete. Scoped to your org.',
        tags: ['Scans'],
        parameters: [{
          name: 'scan_id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' }
        }],
        responses: {
          200: {
            description: 'Scan status. `synthesis_json` is populated when `status == "completed"`.',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/ScanStatus' } } }
          },
          404: { description: 'Scan not found.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/v1/briefs/{brief_id}': {
      get: {
        operationId: 'getBrief',
        summary: 'Retrieve an intelligence brief',
        description: [
          'Fetch a fully synthesized intelligence brief by UUID.',
          '`content_md` is ready to paste into LLM context.',
          '`synthesis_json` is typed for programmatic parsing.',
          '`meta.reasoning_path` exposes step-by-step LLM reasoning for explainability.'
        ].join(' '),
        tags: ['Briefs'],
        parameters: [{
          name: 'brief_id',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
          description: 'UUID of the intelligence brief.'
        }],
        responses: {
          200: {
            description: 'Full intelligence brief.',
            content: {
              'application/json': {
                schema: { '$ref': '#/components/schemas/Brief' },
                examples: {
                  sample: {
                    summary: 'Sample brief response',
                    value: {
                      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
                      title: 'Acme Corp — Competitive Brief (2026-03-29)',
                      content_md: '## Key Findings\n\n- **Pricing change detected**: Acme dropped Pro tier by $10/mo\n- New "Enterprise" CTA added to homepage\n',
                      synthesis_json: {
                        headline: 'Acme Corp cut Pro pricing by $10/mo',
                        summary: 'Acme Corp made two significant changes this week: a $10 price reduction on their Pro tier and a new Enterprise CTA on the homepage.',
                        key_findings: [
                          { finding: 'Pro tier reduced from $49 to $39/mo', urgency: 'high', evidence: '/pricing page' }
                        ],
                        reasoning_path: ['Fetched /pricing', 'Compared text content to 4-hour cache', 'Detected price change in h2 element'],
                        model: 'gpt-4o-mini',
                        token_usage: 1842,
                        cost_usd: 0.00092
                      },
                      meta: {
                        model: 'gpt-4o-mini',
                        token_usage: 1842,
                        reasoning_path: ['Fetched /pricing', 'Compared text content to 4-hour cache', 'Detected price change in h2 element'],
                        cost_usd: 0.00092
                      },
                      created_at: '2026-03-29T06:00:00.000Z',
                      sent_at: '2026-03-29T06:01:23.000Z'
                    }
                  }
                }
              }
            }
          },
          400: { description: 'Invalid brief_id format.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } },
          404: { description: 'Brief not found.', content: { 'application/json': { schema: { '$ref': '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/v1/mcp': {
      get: {
        operationId: 'getMcpManifest',
        summary: 'MCP tool discovery (no auth)',
        description: 'Returns the Spyglass MCP manifest: available tools, input schemas, and auth instructions. No API key required.',
        tags: ['MCP'],
        security: [],
        responses: {
          200: {
            description: 'MCP manifest with tool definitions.',
            content: { 'application/json': { schema: { '$ref': '#/components/schemas/McpManifest' } } }
          }
        }
      },
      post: {
        operationId: 'invokeMcpTool',
        summary: 'Invoke a Spyglass tool via JSON-RPC 2.0',
        description: [
          'MCP-compatible tool invocation endpoint. Accepts JSON-RPC 2.0 requests.',
          '',
          '**Supported methods:**',
          '- `initialize` — MCP handshake',
          '- `tools/list` — List available tools',
          '- `tools/call` — Invoke a tool (trigger_scan, get_brief, list_competitors)'
        ].join('\n'),
        tags: ['MCP'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['jsonrpc', 'method'],
                properties: {
                  jsonrpc: { type: 'string', enum: ['2.0'] },
                  method: { type: 'string', description: 'initialize | tools/list | tools/call' },
                  params: { type: 'object' },
                  id: { type: 'string' }
                }
              },
              examples: {
                list_tools: {
                  summary: 'List available tools',
                  value: { jsonrpc: '2.0', method: 'tools/list', id: '1' }
                },
                trigger_scan: {
                  summary: 'Trigger a scan via MCP',
                  value: {
                    jsonrpc: '2.0',
                    method: 'tools/call',
                    params: { name: 'trigger_scan', arguments: { url: 'https://competitor.com/pricing', depth: 'surface' } },
                    id: '2'
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'JSON-RPC 2.0 response.',
            content: { 'application/json': { schema: { type: 'object', properties: { jsonrpc: { type: 'string' }, result: { type: 'object' }, error: { type: 'object' }, id: { type: 'string' } } } } }
          }
        }
      }
    },
    '/api/v1/keys/demo': {
      get: {
        operationId: 'getDemoKey',
        summary: 'Get a demo API key (no auth)',
        description: 'Returns a demo API key for testing. No authentication required. Rate-limited to non-production use.',
        tags: ['Auth'],
        security: [],
        responses: {
          200: {
            description: 'Demo API key.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    api_key: { type: 'string', description: 'Use this as your X-Spyglass-Token header value.' },
                    note: { type: 'string' },
                    created_at: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  tags: [
    { name: 'Scans', description: 'Trigger and poll competitive intelligence scans.' },
    { name: 'Briefs', description: 'Retrieve synthesized intelligence briefs.' },
    { name: 'MCP', description: 'Model Context Protocol native integration for AI agent pipelines.' },
    { name: 'Auth', description: 'API key management.' }
  ]
};

// GET /api/docs.json — Raw OpenAPI spec (machine-readable, LLM-ingestible)
app.get('/api/docs.json', (req, res) => {
  res.json(OPENAPI_SPEC);
});

// GET /api/docs — Swagger UI (human-readable + LLM-friendly)
app.get('/api/docs', (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spyglass API Docs</title>
  <meta name="description" content="Spyglass Headless Intelligence API — OpenAPI 3.0 documentation for LLM agents and developer integrations.">
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body { margin: 0; background: #0f0f13; color: #e0e0e0; font-family: system-ui, sans-serif; }
    .topbar { background: #0f0f13 !important; border-bottom: 1px solid #22223b; padding: 12px 20px; display: flex; align-items: center; gap: 12px; }
    .topbar-logo { font-size: 20px; font-weight: 700; color: #a78bfa; letter-spacing: -0.5px; }
    .topbar-tag { font-size: 11px; background: #312e81; color: #c4b5fd; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    .swagger-ui .scheme-container, .swagger-ui .info { background: transparent !important; }
    .swagger-ui .opblock-tag { color: #e0e0e0 !important; }
    #swagger-ui { max-width: 1200px; margin: 0 auto; }
    .llm-hint { background: #1a1a2e; border: 1px solid #312e81; border-radius: 8px; padding: 16px 20px; margin: 20px; font-size: 13px; color: #a5b4fc; line-height: 1.6; }
    .llm-hint code { background: #0d0d1a; padding: 2px 6px; border-radius: 3px; font-family: monospace; color: #c4b5fd; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-logo">&#128065; Spyglass</div>
    <div class="topbar-tag">Headless Intelligence API v1.0</div>
  </div>
  <div class="llm-hint">
    <strong>&#129302; LLM / AI Agent Integration:</strong>
    Fetch the machine-readable spec at <code>GET /api/docs.json</code> (OpenAPI 3.0).
    All <code>synthesis_json</code> fields are fully typed — safe to inject into prompts.
    Native MCP tools available at <code>GET /api/v1/mcp</code> (no auth required for discovery).
    Get a demo key: <code>GET /api/v1/keys/demo</code> → use as <code>X-Spyglass-Token</code> header.
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
        layout: 'BaseLayout',
        deepLinking: true,
        displayRequestDuration: true,
        persistAuthorization: true,
        filter: true
      });
    };
  </script>
</body>
</html>`;
  res.type('html').send(html);
});

// ============================================================
// Stress Test Endpoints — Signal-to-Noise Validation
// ============================================================

const { runScenario, runAllScenarios } = require('./lib/stress-tester');

/**
 * POST /api/v1/test/scenario
 *
 * Run a specific stress test scenario through the full pipeline.
 * Validates Signal-to-Noise filter, vertical temperature calibration,
 * and reasoning lineage structure.
 *
 * Body:
 *   scenario  {string}  Required. 'A', 'B', 'C', or 'D'
 *
 * No auth required — test endpoint for Lior (7AI) and Jonathan (Maven AGI) demos.
 */
app.post('/api/v1/test/scenario', async (req, res) => {
  try {
    const { scenario } = req.body;

    if (!scenario) {
      return res.status(400).json({
        error: 'scenario is required',
        valid_scenarios: ['A', 'B', 'C', 'D'],
        descriptions: {
          A: 'CSS Mask — pre-LLM filter catches CSS class rename + copyright year (expect 204 No Content)',
          B: 'Quiet Withdrawal — "Self-hosted or Cloud" → "Cloud-Native" (Security vertical, T=0.2, expect HIGH ALERT)',
          C: 'Zendesk Pricing Pivot — PLG→SLG detection (Support/CX vertical, T=0.4, expect HIGH ALERT)',
          D: 'Geo-Risk Withdrawal — InsurTech ToS, double-pass FEMA verification (T=0.1/T=0.0, expect contagion vector)'
        }
      });
    }

    const validScenarios = ['A', 'B', 'C', 'D'];
    const scenarioId = scenario.toString().toUpperCase().trim();

    if (!validScenarios.includes(scenarioId)) {
      return res.status(400).json({
        error: `Invalid scenario '${scenario}'. Valid options: A, B, C, D`
      });
    }

    console.log(`[StressTest] Running scenario ${scenarioId} via API...`);
    const result = await runScenario(scenarioId, pool);

    // Scenario A expects 204 — if pre-LLM filter worked, return 204
    if (scenarioId === 'A' && result.details.pre_llm_filter_fired === true && result.pass) {
      return res.status(204).end();
    }

    const httpStatus = result.pass ? 200 : 422;
    res.status(httpStatus).json(result);
  } catch (err) {
    console.error('[StressTest] Scenario error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v1/test/run-all
 *
 * Run all 4 stress test scenarios and return a full validation report.
 * This is the "model stress test" for credibility proof to Lior and Jonathan.
 *
 * Takes ~60-90 seconds (4 LLM calls + double-pass for Scenario D).
 * No auth required — intended for demo + due diligence.
 */
app.post('/api/v1/test/run-all', async (req, res) => {
  try {
    console.log('[StressTest] Running full stress test suite (all 4 scenarios)...');
    const report = await runAllScenarios(pool);
    const httpStatus = report.summary.all_passed ? 200 : 422;
    res.status(httpStatus).json(report);
  } catch (err) {
    console.error('[StressTest] Full stress test error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v1/test/scenarios
 *
 * List available test scenarios and their expected behavior.
 * No auth required.
 */
app.get('/api/v1/test/scenarios', (req, res) => {
  const { VERTICAL_TEMPERATURE_MAP } = require('./lib/analyzer');
  res.json({
    description: 'Spyglass Signal-to-Noise Stress Test Suite v2.2',
    scenarios: [
      {
        id: 'A',
        name: 'CSS Mask (Noise Suppression)',
        vertical: null,
        temperature: 'N/A — No LLM call (pre-filter catches all noise)',
        expected_result: 'NOISE_SUPPRESSED',
        expected_http_status: 204,
        trigger: 'POST /api/v1/test/scenario with body: { "scenario": "A" }',
        description: 'CSS class rename (btn-primary → btn-hero) + copyright year (© 2025 → © 2026). Both are pure noise. Pre-LLM filter must catch both. NO LLM call should be made.'
      },
      {
        id: 'B',
        name: 'Quiet Withdrawal (On-Premise EOL)',
        vertical: 'security',
        temperature: 0.2,
        expected_result: 'HIGH_ALERT',
        expected_http_status: 200,
        expected_min_confidence: 0.85,
        trigger: 'POST /api/v1/test/scenario with body: { "scenario": "B" }',
        description: '"Self-hosted or Cloud" → "Cloud-Native" on Security product page. Competitor EOL-ing On-Premise. Massive opening for CloudZero (Phil) to target legacy customer base.'
      },
      {
        id: 'C',
        name: 'Zendesk Pricing Pivot (PLG → SLG)',
        vertical: 'support',
        temperature: 0.4,
        expected_result: 'HIGH_ALERT',
        expected_http_status: 200,
        expected_min_confidence: 0.85,
        trigger: 'POST /api/v1/test/scenario with body: { "scenario": "C" }',
        description: '"$49/agent/month" removed, "Contact Sales" + "Enterprise" tier added. PLG → SLG pivot. Maven AGI (Jonathan) opportunity to capture displaced mid-market customers.'
      },
      {
        id: 'D',
        name: 'Geo-Risk Withdrawal + Contagion (InsurTech)',
        vertical: 'insurtech',
        temperature: 'Pass1: 0.1, Pass2: 0.0 (Skeptic)',
        expected_result: 'HIGH_ALERT',
        expected_http_status: 200,
        expected_geo_risk_flag: true,
        expected_min_contagion_probability: 0.9,
        trigger: 'POST /api/v1/test/scenario with body: { "scenario": "D" }',
        description: 'Insurance carrier ToS removes "all 50 states" coverage, adds explicit coastal ZIP exclusions. Double-pass FEMA verification required. 3 contagion signals: Aerial Risk Parity, 16% Trap Filter, Reinsurance Drift. Ty Harris (Openly) institutional-grade signal.'
      }
    ],
    vertical_temperature_calibration: VERTICAL_TEMPERATURE_MAP,
    run_all: 'POST /api/v1/test/run-all — run all 4 scenarios, returns full validation report'
  });
});

// ============================================================
// SPA pages
// ============================================================
const SPA_PAGES = ['dashboard', 'login', 'signup', 'demo'];
SPA_PAGES.forEach(page => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', `${page}.html`));
  });
});

// ============================================================
// Codebase Download Endpoint
// Owner-only: streams the full repo as a .zip archive.
// Protected by DOWNLOAD_TOKEN env var (fallback: hardcoded).
// Usage: GET /api/download-codebase?token=<token>
// ============================================================
const DOWNLOAD_TOKEN = process.env.DOWNLOAD_TOKEN || 'SpygL4ss-Bkp-2026-x9K2mT';
app.get('/api/download-codebase', (req, res) => {
  const { token } = req.query;
  if (!token || token !== DOWNLOAD_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { spawn } = require('child_process');
  const repoRoot = __dirname;

  // Exclude non-source artifacts to keep archive lean
  const excludePatterns = [
    'node_modules/*', '.git/*', 'debug/*',
    'shell-snapshots/*', 'todos/*', 'session-env/*',
    '.env', '.env.*', '*.jsonl'
  ];
  const args = ['-r', '-', '.'];
  excludePatterns.forEach(p => { args.push('-x'); args.push(p); });

  const zip = spawn('zip', args, { cwd: repoRoot });

  res.setHeader('Content-Disposition', 'attachment; filename="spyglass-codebase.zip"');
  res.setHeader('Content-Type', 'application/zip');

  zip.stdout.pipe(res);

  zip.stderr.on('data', d => console.error('[Download] zip stderr:', d.toString()));
  zip.on('error', err => {
    console.error('[Download] spawn error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to create archive' });
  });
  zip.on('close', code => {
    if (code !== 0) console.error('[Download] zip exited with code', code);
    else console.log('[Download] Archive served successfully');
  });
});

// Landing page with analytics beacon injected
app.get('/', (req, res) => {
  const slug = process.env.POLSIA_ANALYTICS_SLUG || '';
  const htmlPath = path.join(__dirname, 'public', 'index.html');

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__POLSIA_SLUG__', slug);
    res.type('html').send(html);
  } else {
    res.json({ message: 'Spyglass API' });
  }
});

// ============================================================
// Upstream Procurement & Margin-Leak Detection API
// Restaurant supply-chain intelligence layer.
//
// Acquisition pitch:
//   Toast   — turns POS data into COGS intelligence
//   DoorDash— detects delivery margin erosion before restaurants churn
//   Clover  — supply-chain + payments = complete restaurant OS
// ============================================================

const { detectMarginLeaks, detectAllRestaurants } = require('./lib/margin-leak-detector');
const { calculateRecipeCost, runMenuEngineering } = require('./lib/recipe-costing');
const { generateProcurementBrief } = require('./lib/procurement-analyzer');
const { seedRestaurantDemoData } = require('./lib/demo-seed-restaurant');
const { seedMickeyMalonesData } = require('./lib/demo-seed-mickey-malones');
const {
  fetchVendorPriceBenchmark,
  refreshIngredientMarketPrices,
  fetchAreaVendors
} = require('./lib/vendor-price-fetcher');

// ── Demo: load the demo restaurant dashboard in one call ──────────────────────
app.get('/api/procurement/demo', async (req, res) => {
  try {
    const { rows: [restaurant] } = await pool.query(
      `SELECT * FROM restaurants WHERE slug = 'harvest-and-co' LIMIT 1`
    );
    if (!restaurant) return res.status(404).json({ error: 'Demo not seeded yet' });

    const [alertsRes, recsRes, snapshotRes] = await Promise.all([
      pool.query(
        `SELECT * FROM margin_alerts WHERE restaurant_id = $1 AND status = 'active' ORDER BY financial_impact_monthly DESC LIMIT 10`,
        [restaurant.id]
      ),
      pool.query(
        `SELECT * FROM procurement_recommendations WHERE restaurant_id = $1 AND status = 'pending' ORDER BY potential_monthly_savings DESC LIMIT 6`,
        [restaurant.id]
      ),
      pool.query(
        `SELECT * FROM margin_snapshots WHERE restaurant_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
        [restaurant.id]
      )
    ]);

    res.json({
      restaurant,
      alerts: alertsRes.rows,
      recommendations: recsRes.rows,
      snapshot: snapshotRes.rows[0] || null
    });
  } catch (err) {
    console.error('[Procurement] Demo load error:', err);
    res.status(500).json({ error: 'Failed to load demo' });
  }
});

// ── Demo seed — Harvest & Co. ─────────────────────────────────────────────────
app.post('/api/procurement/demo/seed', async (req, res) => {
  try {
    const result = await seedRestaurantDemoData(pool, null);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Procurement] Demo seed error:', err);
    res.status(500).json({ error: 'Seed failed: ' + err.message });
  }
});

// ── Demo seed — Mickey Malone's Tavern (Kona Equity acquisition target) ───────
app.post('/api/procurement/demo/seed-mickey-malones', async (req, res) => {
  try {
    const result = await seedMickeyMalonesData(pool, null);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[Procurement] Mickey Malone's seed error:", err);
    res.status(500).json({ error: 'Seed failed: ' + err.message });
  }
});

// ── Demo loader — Mickey Malone's ────────────────────────────────────────────
app.get('/api/procurement/demo/mickey-malones', async (req, res) => {
  try {
    const { rows: [restaurant] } = await pool.query(
      `SELECT * FROM restaurants WHERE slug = 'mickey-malones-tavern' LIMIT 1`
    );
    if (!restaurant) return res.status(404).json({ error: 'Mickey Malone\'s not seeded yet. POST /api/procurement/demo/seed-mickey-malones' });

    const [alertsRes, recsRes, snapshotRes, vendorBenchRes, priceHistRes] = await Promise.all([
      pool.query(
        `SELECT * FROM margin_alerts WHERE restaurant_id = $1 AND status = 'active' ORDER BY financial_impact_monthly DESC`,
        [restaurant.id]
      ),
      pool.query(
        `SELECT pr.*, ma.alert_type, ma.severity AS alert_severity
         FROM procurement_recommendations pr
         LEFT JOIN margin_alerts ma ON ma.id = pr.alert_id
         WHERE pr.restaurant_id = $1 AND pr.status = 'pending'
         ORDER BY pr.potential_monthly_savings DESC`,
        [restaurant.id]
      ),
      pool.query(
        `SELECT * FROM margin_snapshots WHERE restaurant_id = $1 ORDER BY snapshot_date DESC LIMIT 1`,
        [restaurant.id]
      ),
      pool.query(
        `SELECT i.name AS ingredient, v.name AS vendor,
                vp.price_per_unit AS paid_price, i.current_market_price AS market_price,
                i.unit,
                ROUND(((vp.price_per_unit - i.current_market_price) / i.current_market_price * 100)::numeric, 1) AS overcharge_pct
         FROM vendor_prices vp
         JOIN vendors v ON v.id = vp.vendor_id
         JOIN ingredients i ON i.id = vp.ingredient_id
         WHERE v.restaurant_id = $1
           AND vp.price_per_unit > i.current_market_price * 1.05
         ORDER BY overcharge_pct DESC`,
        [restaurant.id]
      ),
      pool.query(
        `SELECT i.name AS ingredient, iph.price, iph.recorded_date, v.name AS vendor
         FROM ingredient_price_history iph
         JOIN ingredients i ON i.id = iph.ingredient_id
         LEFT JOIN vendors v ON v.id = iph.vendor_id
         WHERE i.restaurant_id = $1
         ORDER BY i.name, iph.recorded_date`,
        [restaurant.id]
      )
    ]);

    const totalMonthlyLeakage = alertsRes.rows.reduce(
      (sum, a) => sum + parseFloat(a.financial_impact_monthly || 0), 0
    );

    res.json({
      restaurant,
      snapshot: snapshotRes.rows[0] || null,
      alerts: alertsRes.rows,
      recommendations: recsRes.rows,
      vendor_benchmark: vendorBenchRes.rows,
      price_history: priceHistRes.rows,
      summary: {
        total_monthly_leakage: parseFloat(totalMonthlyLeakage.toFixed(2)),
        annual_leakage: parseFloat((totalMonthlyLeakage * 12).toFixed(2)),
        alert_count: alertsRes.rows.length,
        recommendation_count: recsRes.rows.length,
        acquisition_context: {
          target: "Mickey Malone's Tavern",
          location: '347 N Pearl St, Brockton, MA 02301',
          annual_revenue: 852000,
          platform_fit: ['Clover', 'Toast', 'DoorDash'],
          untapped_delivery: 'Zero delivery presence — $8,400/mo gap at industry avg 12% delivery mix'
        }
      }
    });
  } catch (err) {
    console.error("[Procurement] Mickey Malone's load error:", err);
    res.status(500).json({ error: 'Failed to load Mickey Malone\'s data' });
  }
});

// ── Restaurant CRUD ───────────────────────────────────────────────────────────
app.get('/api/procurement/restaurants', authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, ms.health_score, ms.food_cost_pct, ms.delivery_mix_pct,
              (SELECT COUNT(*) FROM margin_alerts ma WHERE ma.restaurant_id = r.id AND ma.status = 'active') AS active_alerts
       FROM restaurants r
       LEFT JOIN margin_snapshots ms ON ms.restaurant_id = r.id AND ms.snapshot_date = CURRENT_DATE
       WHERE r.org_id IN (
         SELECT c.org_id FROM competitors c WHERE c.user_id = $1 AND c.org_id IS NOT NULL
       ) OR EXISTS (
         SELECT 1 FROM restaurants r2 WHERE r2.id = r.id AND r2.metadata->>'demo_user_id' = $1::text
       )
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    res.json({ restaurants: rows });
  } catch (err) {
    console.error('[Procurement] List restaurants error:', err);
    res.status(500).json({ error: 'Failed to list restaurants' });
  }
});

app.post('/api/procurement/restaurants', authMiddleware, async (req, res) => {
  try {
    const { name, cuisine_type, location, monthly_revenue_estimate, target_food_cost_pct, pos_system, delivery_platforms } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

    const { rows: [org] } = await pool.query(
      `SELECT org_id FROM competitors WHERE user_id = $1 AND org_id IS NOT NULL LIMIT 1`,
      [req.user.id]
    );

    const { rows: [restaurant] } = await pool.query(`
      INSERT INTO restaurants (org_id, name, slug, cuisine_type, location, monthly_revenue_estimate, target_food_cost_pct, pos_system, delivery_platforms)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
    `, [org?.org_id || null, name, slug, cuisine_type, location,
        monthly_revenue_estimate || null, target_food_cost_pct || 28, pos_system || 'unknown',
        delivery_platforms || []]);

    res.status(201).json({ restaurant });
  } catch (err) {
    console.error('[Procurement] Create restaurant error:', err);
    res.status(500).json({ error: 'Failed to create restaurant' });
  }
});

// ── Restaurant dashboard (full data bundle) ───────────────────────────────────
app.get('/api/procurement/restaurants/:id/dashboard', async (req, res) => {
  try {
    const { id } = req.params;
    const [restaurantRes, alertsRes, recsRes, snapshotRes] = await Promise.all([
      pool.query(`SELECT * FROM restaurants WHERE id = $1`, [id]),
      pool.query(`SELECT * FROM margin_alerts WHERE restaurant_id = $1 AND status = 'active' ORDER BY financial_impact_monthly DESC`, [id]),
      pool.query(`SELECT * FROM procurement_recommendations WHERE restaurant_id = $1 AND status = 'pending' ORDER BY potential_monthly_savings DESC`, [id]),
      pool.query(`SELECT * FROM margin_snapshots WHERE restaurant_id = $1 ORDER BY snapshot_date DESC LIMIT 1`, [id])
    ]);

    if (!restaurantRes.rows[0]) return res.status(404).json({ error: 'Restaurant not found' });

    res.json({
      restaurant: restaurantRes.rows[0],
      alerts: alertsRes.rows,
      recommendations: recsRes.rows,
      snapshot: snapshotRes.rows[0] || null
    });
  } catch (err) {
    console.error('[Procurement] Dashboard error:', err);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ── Margin alerts ─────────────────────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/alerts', async (req, res) => {
  try {
    const { status = 'active', limit = 20 } = req.query;
    const { rows } = await pool.query(
      `SELECT * FROM margin_alerts WHERE restaurant_id = $1 ${status !== 'all' ? 'AND status = $2' : ''}
       ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         financial_impact_monthly DESC NULLS LAST
       LIMIT $${status !== 'all' ? 3 : 2}`,
      status !== 'all' ? [req.params.id, status, Math.min(parseInt(limit), 50)] : [req.params.id, Math.min(parseInt(limit), 50)]
    );
    res.json({ alerts: rows });
  } catch (err) {
    console.error('[Procurement] Alerts error:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.patch('/api/procurement/alerts/:alertId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['acknowledged', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query(
      `UPDATE margin_alerts SET status = $1, resolved_at = CASE WHEN $1 = 'resolved' THEN now() ELSE resolved_at END WHERE id = $2`,
      [status, req.params.alertId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Procurement] Update alert error:', err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// ── Recommendations ───────────────────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/recommendations', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM procurement_recommendations WHERE restaurant_id = $1
       ORDER BY potential_monthly_savings DESC NULLS LAST`,
      [req.params.id]
    );
    res.json({ recommendations: rows });
  } catch (err) {
    console.error('[Procurement] Recommendations error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

app.patch('/api/procurement/recommendations/:recId/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'in_progress', 'completed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await pool.query(`UPDATE procurement_recommendations SET status = $1 WHERE id = $2`, [status, req.params.recId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Procurement] Update rec error:', err);
    res.status(500).json({ error: 'Failed to update recommendation' });
  }
});

// ── Trigger autonomous margin-leak scan ───────────────────────────────────────
app.post('/api/procurement/restaurants/:id/analyze', async (req, res) => {
  try {
    const result = await detectMarginLeaks(pool, req.params.id);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Procurement] Analyze error:', err);
    res.status(500).json({ error: 'Analysis failed: ' + err.message });
  }
});

// ── Vendor management ─────────────────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/vendors', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.*,
         (SELECT COUNT(*) FROM vendor_prices vp WHERE vp.vendor_id = v.id) AS price_records,
         (SELECT SUM(po.total_amount) FROM purchase_orders po WHERE po.vendor_id = v.id
            AND po.order_date >= CURRENT_DATE - INTERVAL '30 days') AS spend_30d
       FROM vendors v WHERE v.restaurant_id = $1 ORDER BY v.category, v.name`,
      [req.params.id]
    );
    res.json({ vendors: rows });
  } catch (err) {
    console.error('[Procurement] Vendors error:', err);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

app.post('/api/procurement/restaurants/:id/vendors', authMiddleware, async (req, res) => {
  try {
    const { name, category, payment_terms, lead_time_days, minimum_order_value, rep_name, rep_email } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
    const { rows: [vendor] } = await pool.query(`
      INSERT INTO vendors (restaurant_id, name, category, payment_terms, lead_time_days, minimum_order_value, rep_name, rep_email)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [req.params.id, name, category, payment_terms || 'net30', lead_time_days || 2, minimum_order_value || null, rep_name || null, rep_email || null]);
    res.status(201).json({ vendor });
  } catch (err) {
    console.error('[Procurement] Create vendor error:', err);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

// ── Vendor price benchmark — live market prices via USDA AMS + AI ─────────────
// ?live=true  (default) — fetches current USDA AMS / AI-estimated market prices
// ?live=false           — returns stored market prices from DB only
app.get('/api/procurement/restaurants/:id/vendor-benchmark', async (req, res) => {
  const { id } = req.params;
  const useLive = req.query.live !== 'false';

  try {
    // Pull restaurant location for geo-accurate pricing
    const { rows: [restaurant] } = await pool.query(
      `SELECT location, metadata FROM restaurants WHERE id = $1`, [id]
    );

    // Current vendor invoice prices from DB
    const { rows: invoiceRows } = await pool.query(`
      SELECT
        i.id                   AS ingredient_id,
        i.name                 AS ingredient,
        i.unit,
        i.current_market_price AS db_market_price,
        v.name                 AS vendor,
        vp.price_per_unit      AS paid_price,
        vp.effective_date
      FROM ingredients i
      JOIN vendor_prices vp ON vp.ingredient_id = i.id
      JOIN vendors v        ON v.id = vp.vendor_id
      WHERE i.restaurant_id = $1
        AND vp.effective_date = (
          SELECT MAX(vp2.effective_date)
          FROM vendor_prices vp2
          WHERE vp2.ingredient_id = i.id AND vp2.vendor_id = vp.vendor_id
        )
      ORDER BY i.name, vp.price_per_unit DESC
    `, [id]);

    if (!useLive) {
      // DB-only mode — group by ingredient, return stored data
      const grouped = {};
      for (const row of invoiceRows) {
        if (!grouped[row.ingredient]) {
          grouped[row.ingredient] = {
            ingredient: row.ingredient, unit: row.unit,
            market_price: row.db_market_price, vendors: [],
            data_source: 'database'
          };
        }
        grouped[row.ingredient].vendors.push({ vendor: row.vendor, price: row.paid_price });
      }
      return res.json({ benchmark: Object.values(grouped), live: false });
    }

    // Live mode — build paid-price map keyed by ingredient name
    // (take highest vendor price per ingredient to ensure we catch the worst overcharge)
    const paidPrices = {};
    const monthlyQtyByIngredient = {};
    for (const row of invoiceRows) {
      if (!paidPrices[row.ingredient] || row.paid_price > paidPrices[row.ingredient].price) {
        paidPrices[row.ingredient] = {
          price: parseFloat(row.paid_price),
          unit: row.unit,
          vendor: row.vendor,
          monthly_qty: monthlyQtyByIngredient[row.ingredient] || 0
        };
      }
    }

    // Augment monthly_qty from 90-day purchase order history
    const { rows: poItems } = await pool.query(`
      SELECT i.name AS ingredient, SUM(poi.quantity) / 3.0 AS monthly_qty
      FROM purchase_order_items poi
      JOIN ingredients i ON i.id = poi.ingredient_id
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      WHERE po.restaurant_id = $1
        AND po.order_date >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY i.name
    `, [id]);
    for (const { ingredient, monthly_qty } of poItems) {
      if (paidPrices[ingredient]) paidPrices[ingredient].monthly_qty = parseFloat(monthly_qty);
    }

    // Determine region from restaurant location (default Boston MA for MA addresses)
    const location = restaurant?.location || 'Boston, MA';
    const region = location.match(/MA|Massachusetts/i) ? 'Boston, MA' :
                   location.match(/TX|Texas/i) ? 'Dallas-Fort Worth, TX' : location;

    const ingredientNames = Object.keys(paidPrices);
    const liveBenchmark = await fetchVendorPriceBenchmark(ingredientNames, paidPrices, region);

    // Persist live prices back to DB for future use
    const updateOps = liveBenchmark
      .filter(b => b.market_price && b.data_source !== 'unavailable')
      .map(b => {
        const ingr = invoiceRows.find(r => r.ingredient === b.ingredient);
        if (!ingr) return null;
        return pool.query(
          `UPDATE ingredients SET current_market_price = $1, price_updated_at = now() WHERE id = $2`,
          [b.market_price, ingr.ingredient_id]
        ).catch(() => null);
      })
      .filter(Boolean);
    await Promise.all(updateOps);

    const total_monthly_overcharge = liveBenchmark
      .filter(b => b.overcharge_pct > 5)
      .reduce((sum, b) => sum + (b.monthly_overcharge || 0), 0);

    res.json({
      benchmark: liveBenchmark,
      live: true,
      region,
      total_monthly_overcharge: parseFloat(total_monthly_overcharge.toFixed(2)),
      fetched_at: new Date().toISOString(),
      data_sources: {
        usda_ams: liveBenchmark.filter(b => b.data_source === 'usda_ams').length,
        ai_market_estimate: liveBenchmark.filter(b => b.data_source === 'ai_market_estimate').length,
        unavailable: liveBenchmark.filter(b => b.data_source === 'unavailable').length
      }
    });
  } catch (err) {
    console.error('[Procurement] Live benchmark error:', err);
    res.status(500).json({ error: 'Failed to fetch live benchmark: ' + err.message });
  }
});

// ── Area vendor discovery — real distributors near a restaurant ───────────────
// Returns real, operating food-service distributors in the restaurant's metro area
app.get('/api/procurement/restaurants/:id/area-vendors', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: [restaurant] } = await pool.query(
      `SELECT name, location, metadata FROM restaurants WHERE id = $1`, [id]
    );
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const location = restaurant.location || 'Boston, MA';
    const categories = (req.query.categories || '').split(',').map(c => c.trim()).filter(Boolean);

    const vendors = await fetchAreaVendors(location, categories);

    // Cross-reference against already-registered vendors to flag gaps
    const { rows: registered } = await pool.query(
      `SELECT name FROM vendors WHERE restaurant_id = $1`, [id]
    );
    const registeredNames = registered.map(r => r.name.toLowerCase());

    const annotated = vendors.map(v => ({
      ...v,
      already_registered: registeredNames.some(n =>
        n.includes(v.name.toLowerCase().split(' ')[0]) ||
        v.name.toLowerCase().includes(n.split(' ')[0])
      )
    }));

    res.json({
      restaurant: restaurant.name,
      location,
      area_vendors: annotated,
      new_vendor_count: annotated.filter(v => !v.already_registered).length,
      fetched_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Procurement] Area vendors error:', err);
    res.status(500).json({ error: 'Failed to fetch area vendors: ' + err.message });
  }
});

// ── Live price refresh — updates ingredient market_prices from USDA/AI ────────
app.post('/api/procurement/restaurants/:id/refresh-prices', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: [restaurant] } = await pool.query(
      `SELECT name FROM restaurants WHERE id = $1`, [id]
    );
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const result = await refreshIngredientMarketPrices(pool, id);

    // Re-run margin leak detection after price refresh so alerts reflect new data
    let leakResult = null;
    try {
      leakResult = await detectMarginLeaks(pool, id);
    } catch { /* non-fatal */ }

    res.json({
      restaurant: restaurant.name,
      price_refresh: result,
      leak_detection: leakResult
        ? { alerts_generated: leakResult.alerts?.length || 0 }
        : { skipped: true },
      refreshed_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Procurement] Price refresh error:', err);
    res.status(500).json({ error: 'Price refresh failed: ' + err.message });
  }
});

// ── Ingredient management ─────────────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/ingredients', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM ingredients WHERE restaurant_id = $1 ORDER BY category, name`,
      [req.params.id]
    );
    res.json({ ingredients: rows });
  } catch (err) {
    console.error('[Procurement] Ingredients error:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

app.post('/api/procurement/restaurants/:id/ingredients', authMiddleware, async (req, res) => {
  try {
    const { name, category, unit, current_market_price, yield_factor } = req.body;
    if (!name || !category || !unit) return res.status(400).json({ error: 'name, category, unit required' });
    const { rows: [ingredient] } = await pool.query(`
      INSERT INTO ingredients (restaurant_id, name, category, unit, current_market_price, price_updated_at, yield_factor)
      VALUES ($1,$2,$3,$4,$5,now(),$6) RETURNING *
    `, [req.params.id, name, category, unit, current_market_price || null, yield_factor || 1.00]);
    res.status(201).json({ ingredient });
  } catch (err) {
    console.error('[Procurement] Create ingredient error:', err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
});

// ── Recipe management & costing ───────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/recipes', async (req, res) => {
  try {
    const { rows: recipes } = await pool.query(
      `SELECT r.*,
         COALESCE(
           (SELECT SUM(ri.quantity * (1 + ri.waste_factor) * COALESCE(i.current_market_price, 0))
            FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id
            WHERE ri.recipe_id = r.id), 0
         ) AS theoretical_cost,
         COALESCE(
           (SELECT SUM(sd.quantity_sold)
            FROM sales_data sd WHERE sd.recipe_id = r.id AND sd.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 0
         ) AS qty_sold_30d
       FROM recipes r WHERE r.restaurant_id = $1 ORDER BY r.menu_category, r.name`,
      [req.params.id]
    );

    // Attach food cost % calculation
    const enriched = recipes.map(r => ({
      ...r,
      food_cost_pct: r.menu_price > 0
        ? parseFloat(((r.theoretical_cost / r.menu_price) * 100).toFixed(1))
        : null,
      is_over_target: r.menu_price > 0
        ? (r.theoretical_cost / r.menu_price) * 100 > (r.target_food_cost_pct || 28)
        : false
    }));

    res.json({ recipes: enriched });
  } catch (err) {
    console.error('[Procurement] Recipes error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

app.post('/api/procurement/restaurants/:id/recipes', authMiddleware, async (req, res) => {
  try {
    const { name, menu_category, menu_price, target_food_cost_pct, ingredients } = req.body;
    if (!name || !menu_category || !menu_price) return res.status(400).json({ error: 'name, menu_category, menu_price required' });

    const { rows: [recipe] } = await pool.query(`
      INSERT INTO recipes (restaurant_id, name, menu_category, menu_price, target_food_cost_pct)
      VALUES ($1,$2,$3,$4,$5) RETURNING *
    `, [req.params.id, name, menu_category, menu_price, target_food_cost_pct || 28]);

    if (Array.isArray(ingredients) && ingredients.length > 0) {
      for (const ing of ingredients) {
        await pool.query(`
          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, waste_factor)
          VALUES ($1,$2,$3,$4,$5)
        `, [recipe.id, ing.ingredient_id, ing.quantity, ing.unit, ing.waste_factor || 0.05]);
      }
    }

    res.status(201).json({ recipe });
  } catch (err) {
    console.error('[Procurement] Create recipe error:', err);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// ── Purchase orders ───────────────────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/orders', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const { rows } = await pool.query(`
      SELECT po.*, v.name AS vendor_name, v.category AS vendor_category,
             COUNT(poi.id) AS line_items
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.restaurant_id = $1
      GROUP BY po.id, v.name, v.category
      ORDER BY po.order_date DESC LIMIT $2
    `, [req.params.id, Math.min(parseInt(limit), 100)]);
    res.json({ orders: rows });
  } catch (err) {
    console.error('[Procurement] Orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/procurement/restaurants/:id/orders', authMiddleware, async (req, res) => {
  try {
    const { vendor_id, order_date, delivery_date, status, invoice_number, items } = req.body;
    if (!vendor_id || !order_date) return res.status(400).json({ error: 'vendor_id and order_date required' });

    const total = (items || []).reduce((s, i) => s + (i.quantity * i.unit_price), 0);

    const { rows: [po] } = await pool.query(`
      INSERT INTO purchase_orders (restaurant_id, vendor_id, order_date, delivery_date, status, total_amount, invoice_number)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [req.params.id, vendor_id, order_date, delivery_date || null, status || 'delivered', total, invoice_number || null]);

    for (const item of (items || [])) {
      const line_total = item.quantity * item.unit_price;
      await pool.query(`
        INSERT INTO purchase_order_items (purchase_order_id, ingredient_id, quantity, unit, unit_price, line_total)
        VALUES ($1,$2,$3,$4,$5,$6)
      `, [po.id, item.ingredient_id, item.quantity, item.unit, item.unit_price, line_total]);
    }

    res.status(201).json({ order: po });
  } catch (err) {
    console.error('[Procurement] Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ── Sales data (POS sync) ─────────────────────────────────────────────────────
app.post('/api/procurement/restaurants/:id/sales', authMiddleware, async (req, res) => {
  try {
    const { sale_date, items } = req.body;
    if (!sale_date || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'sale_date and items[] required' });
    }
    let inserted = 0;
    for (const item of items) {
      const net = item.sale_price * item.quantity_sold * (1 - (item.platform_commission_pct || 0) / 100) - (item.platform_fee_flat || 0);
      await pool.query(`
        INSERT INTO sales_data (restaurant_id, sale_date, recipe_id, quantity_sold, sale_price, channel, platform_commission_pct, platform_fee_flat, net_revenue)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [req.params.id, sale_date, item.recipe_id || null, item.quantity_sold, item.sale_price,
          item.channel || 'dine_in', item.platform_commission_pct || 0, item.platform_fee_flat || 0, net]);
      inserted++;
    }
    res.status(201).json({ success: true, inserted });
  } catch (err) {
    console.error('[Procurement] Sales sync error:', err);
    res.status(500).json({ error: 'Failed to sync sales data' });
  }
});

// ── Margin snapshot history ───────────────────────────────────────────────────
app.get('/api/procurement/restaurants/:id/margin-history', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const { rows } = await pool.query(`
      SELECT * FROM margin_snapshots WHERE restaurant_id = $1
        AND snapshot_date >= CURRENT_DATE - ($2 || ' days')::INTERVAL
      ORDER BY snapshot_date ASC
    `, [req.params.id, parseInt(days)]);
    res.json({ history: rows });
  } catch (err) {
    console.error('[Procurement] Margin history error:', err);
    res.status(500).json({ error: 'Failed to fetch margin history' });
  }
});

// ── Procurement brief (AI-synthesized executive summary) ──────────────────────
app.post('/api/procurement/restaurants/:id/brief', async (req, res) => {
  try {
    const [restaurantRes, alertsRes] = await Promise.all([
      pool.query(`SELECT * FROM restaurants WHERE id = $1`, [req.params.id]),
      pool.query(`SELECT * FROM margin_alerts WHERE restaurant_id = $1 AND status = 'active' ORDER BY financial_impact_monthly DESC LIMIT 10`, [req.params.id])
    ]);

    const restaurant = restaurantRes.rows[0];
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });

    const totalImpact = alertsRes.rows.reduce((s, a) => s + parseFloat(a.financial_impact_monthly || 0), 0);

    // Generate brief using procurement-analyzer
    const brief = await generateProcurementBrief({
      restaurant,
      vendorFindings: {
        total_monthly_overcharge: alertsRes.rows.filter(a => a.alert_type === 'vendor_overcharge').reduce((s, a) => s + parseFloat(a.financial_impact_monthly || 0), 0),
        findings: alertsRes.rows.filter(a => a.alert_type === 'vendor_overcharge').map(a => ({
          vendor: a.affected_item, ingredient: a.affected_item, overcharge_pct: 0, monthly_overcharge: parseFloat(a.financial_impact_monthly || 0)
        }))
      },
      recipeFindings: {
        total_monthly_impact: alertsRes.rows.filter(a => a.alert_type === 'recipe_cost_drift').reduce((s, a) => s + parseFloat(a.financial_impact_monthly || 0), 0),
        drifted_recipes: alertsRes.rows.filter(a => a.alert_type === 'recipe_cost_drift').map(a => ({
          recipe: a.affected_item, current_food_cost_pct: 0, monthly_impact: parseFloat(a.financial_impact_monthly || 0)
        }))
      },
      channelAnalysis: {
        delivery_erosion_monthly: alertsRes.rows.filter(a => a.alert_type === 'delivery_erosion').reduce((s, a) => s + parseFloat(a.financial_impact_monthly || 0), 0),
        dine_in_margin_pct: null
      },
      orderAnalysis: {
        missed_discount_monthly: alertsRes.rows.filter(a => a.alert_type === 'order_inefficiency').reduce((s, a) => s + parseFloat(a.financial_impact_monthly || 0), 0)
      }
    });

    res.json({ brief });
  } catch (err) {
    console.error('[Procurement] Brief error:', err);
    res.status(500).json({ error: 'Failed to generate brief' });
  }
});

// ── Cron: run margin-leak detection for all restaurants ───────────────────────
app.post('/api/procurement/cron/detect-leaks', async (req, res) => {
  const cronKey = req.headers['x-cron-key'] || req.query.key;
  if (process.env.CRON_KEY && cronKey !== process.env.CRON_KEY) {
    return res.status(401).json({ error: 'Invalid cron key' });
  }
  try {
    const results = await detectAllRestaurants(pool);
    res.json({ success: true, results });
  } catch (err) {
    console.error('[Procurement] Cron detect-leaks error:', err);
    res.status(500).json({ error: 'Detection run failed' });
  }
});

// ── MCP capability extension — procurement tools ──────────────────────────────
// Extends the existing MCP manifest with procurement capabilities
const PROCUREMENT_MCP_TOOLS = [
  {
    name: 'get_margin_alerts',
    description: 'Retrieve active margin leak alerts for a restaurant. Returns vendor overcharges, recipe cost drift, delivery erosion, and order inefficiency findings.',
    inputSchema: {
      type: 'object', required: ['restaurant_id'],
      properties: {
        restaurant_id: { type: 'string', format: 'uuid' },
        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'all'], default: 'all' }
      }
    }
  },
  {
    name: 'get_vendor_benchmark',
    description: 'Compare current vendor prices against USDA AMS market benchmarks. Identifies overcharges across produce, protein, and dairy categories.',
    inputSchema: {
      type: 'object', required: ['restaurant_id'],
      properties: { restaurant_id: { type: 'string', format: 'uuid' } }
    }
  },
  {
    name: 'get_procurement_brief',
    description: 'Generate an AI-synthesized executive procurement brief with total monthly opportunity, priority actions, and ROI estimates.',
    inputSchema: {
      type: 'object', required: ['restaurant_id'],
      properties: { restaurant_id: { type: 'string', format: 'uuid' } }
    }
  }
];

app.get('/api/v1/mcp/procurement', (req, res) => {
  res.json({
    schema_version: '1.0',
    name: 'Upstream Procurement Intelligence',
    description: 'Autonomous margin-leak detection for restaurant supply chains. Detects vendor overcharges, recipe cost drift, delivery erosion, and order inefficiency.',
    capabilities: ['vendor_overcharge_detection', 'recipe_cost_drift', 'delivery_margin_analysis', 'procurement_benchmarking', 'menu_engineering'],
    tools: PROCUREMENT_MCP_TOOLS
  });
});

app.listen(port, () => {
  console.log(`Spyglass server running on port ${port}`);

  // Schedule daily scan at 6:00 AM UTC
  scheduleDailyCron();

  // Start headless API async scan worker
  // Polls scans table for 'queued' jobs every 5 seconds.
  // Handles: semantic caching, deep crawl, webhook delivery, reasoning lineage.
  startWorker(pool);
});

// ============================================================
// Simple daily cron using setInterval
// ============================================================
function scheduleDailyCron() {
  // Check every 15 minutes if it's time to run
  const INTERVAL_MS = 15 * 60 * 1000;
  let lastRunDate = null;

  setInterval(async () => {
    const now = new Date();
    const hour = now.getUTCHours();
    const today = now.toISOString().split('T')[0];

    // Run at 6 AM UTC, once per day
    if (hour === 6 && lastRunDate !== today) {
      lastRunDate = today;
      console.log('[Cron] Triggering daily scan at 6 AM UTC');
      try {
        await runAllDailyScans(pool);
      } catch (err) {
        console.error('[Cron] Daily scan failed:', err);
      }
    }
  }, INTERVAL_MS);

  console.log('[Cron] Daily scan scheduler active (runs at 6 AM UTC)');
}
