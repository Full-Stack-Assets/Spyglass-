/**
 * Daily Brief Builder for Spyglass
 * Compiles analyzed changes into a beautiful HTML email
 */

const CATEGORY_EMOJI = {
  pricing: '💰',
  features: '🚀',
  hiring: '👥',
  messaging: '📢',
  product: '📦',
  legal: '⚖️',
  other: '🔍',
  // v2: Structural change categories
  cta_change: '🎯',
  navigation: '🧭',
  form_change: '📝',
  layout: '🏗️',
  pricing_structure: '💰'
};

const URGENCY_COLOR = {
  high: '#e8a230',
  medium: '#8a8b8e',
  low: '#4a4b4e'
};

/**
 * Build the HTML email content for a daily brief
 */
function buildBriefHtml(changes, summary, date) {
  const dateStr = date || new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  if (changes.length === 0) {
    return buildNoChangesHtml(dateStr);
  }

  // Group changes by competitor
  const byCompetitor = {};
  for (const c of changes) {
    const name = c.competitor || 'Unknown';
    if (!byCompetitor[name]) byCompetitor[name] = [];
    byCompetitor[name].push(c);
  }

  const changeRows = changes.map(c => {
    const emoji = CATEGORY_EMOJI[c.ai?.category] || '🔍';
    const urgencyColor = URGENCY_COLOR[c.ai?.urgency] || URGENCY_COLOR.medium;
    const category = (c.ai?.category || 'other').charAt(0).toUpperCase() + (c.ai?.category || 'other').slice(1);

    return `
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #1e2028;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 18px; line-height: 1.4;">${emoji}</span>
            <div style="flex: 1;">
              <div style="font-family: 'Space Grotesk', Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">
                ${escapeHtml(c.ai?.headline || `${c.competitor} updated`)}
              </div>
              <div style="font-size: 13px; color: #8a8b8e; line-height: 1.5; margin-bottom: 8px;">
                ${escapeHtml(c.ai?.analysis || 'Content was modified.')}
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span style="font-size: 11px; background: rgba(232,162,48,0.12); color: #e8a230; padding: 2px 8px; border-radius: 4px; font-weight: 500;">
                  ${category}
                </span>
                <span style="font-size: 11px; color: ${urgencyColor}; font-weight: 500;">
                  ${(c.ai?.urgency || 'medium').toUpperCase()}
                </span>
                <span style="font-size: 11px; color: #4a4b4e;">
                  ${escapeHtml(c.competitor)} &middot; ${escapeHtml(c.label || new URL(c.url).pathname)}
                </span>
              </div>
            </div>
          </div>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background: #0a0b0f; font-family: 'DM Sans', Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 20px;">

    <!-- Header -->
    <div style="margin-bottom: 32px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="width: 28px; height: 28px; border: 2px solid #e8a230; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: #e8a230;">&#9678;</div>
        <span style="font-family: 'Space Grotesk', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Spyglass</span>
      </div>
      <h1 style="font-family: 'Space Grotesk', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0; letter-spacing: -0.5px;">
        Your Morning Brief
      </h1>
      <div style="font-size: 13px; color: #8a8b8e;">
        ${dateStr} &middot; ${changes.length} change${changes.length !== 1 ? 's' : ''} detected
      </div>
    </div>

    ${summary ? `
    <!-- Executive Summary -->
    <div style="background: #12141a; border: 1px solid #1e2028; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 600; color: #e8a230; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
        TL;DR
      </div>
      <div style="font-size: 14px; color: #e8e6e1; line-height: 1.6;">
        ${escapeHtml(summary)}
      </div>
    </div>
    ` : ''}

    <!-- Changes -->
    <table style="width: 100%; background: #12141a; border: 1px solid #1e2028; border-radius: 8px; border-collapse: collapse; overflow: hidden;">
      <thead>
        <tr>
          <th style="padding: 12px 20px; text-align: left; font-size: 11px; font-weight: 600; color: #8a8b8e; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #1e2028;">
            Changes Detected
          </th>
        </tr>
      </thead>
      <tbody>
        ${changeRows}
      </tbody>
    </table>

    <!-- Footer -->
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e2028; font-size: 12px; color: #4a4b4e; line-height: 1.6;">
      Sent by <span style="color: #8a8b8e;">Spyglass</span> &middot; Competitive intelligence on autopilot
    </div>
  </div>
</body>
</html>`;
}

function buildNoChangesHtml(dateStr) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background: #0a0b0f; font-family: 'DM Sans', Arial, sans-serif;">
  <div style="max-width: 640px; margin: 0 auto; padding: 32px 20px;">
    <div style="margin-bottom: 32px;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 24px;">
        <div style="width: 28px; height: 28px; border: 2px solid #e8a230; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; color: #e8a230;">&#9678;</div>
        <span style="font-family: 'Space Grotesk', Arial, sans-serif; font-size: 16px; font-weight: 700; color: #ffffff;">Spyglass</span>
      </div>
      <h1 style="font-family: 'Space Grotesk', Arial, sans-serif; font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 8px 0;">
        Your Morning Brief
      </h1>
      <div style="font-size: 13px; color: #8a8b8e;">
        ${dateStr} &middot; All quiet
      </div>
    </div>
    <div style="background: #12141a; border: 1px solid #1e2028; border-radius: 8px; padding: 24px 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 12px;">&#9978;</div>
      <div style="font-size: 15px; color: #e8e6e1; font-weight: 500; margin-bottom: 4px;">No changes detected</div>
      <div style="font-size: 13px; color: #8a8b8e;">Your competitors' monitored pages haven't changed since the last scan.</div>
    </div>
    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e2028; font-size: 12px; color: #4a4b4e;">
      Sent by <span style="color: #8a8b8e;">Spyglass</span> &middot; Competitive intelligence on autopilot
    </div>
  </div>
</body>
</html>`;
}

/**
 * Build plain text version of the brief
 */
function buildBriefText(changes, summary, date) {
  const dateStr = date || new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  if (changes.length === 0) {
    return `SPYGLASS MORNING BRIEF - ${dateStr}\n\nAll quiet. No changes detected across your monitored competitors.\n`;
  }

  let text = `SPYGLASS MORNING BRIEF - ${dateStr}\n${changes.length} change(s) detected\n\n`;

  if (summary) {
    text += `TL;DR: ${summary}\n\n---\n\n`;
  }

  for (const c of changes) {
    const cat = (c.ai?.category || 'other').toUpperCase();
    text += `[${cat}] ${c.ai?.headline || c.competitor + ' updated'}\n`;
    text += `${c.ai?.analysis || 'Content was modified.'}\n`;
    text += `Source: ${c.competitor} - ${c.label || c.url}\n\n`;
  }

  text += `---\nSent by Spyglass - Competitive intelligence on autopilot\n`;
  return text;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build clean Markdown export of a competitive brief
 * Designed for loading into IDEs, GitHub issues, AI coding agents, and R&D development sprints
 */
function buildBriefMarkdown(changes, summary, date, customTitle) {
  const dateStr = date || new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  const lines = [];

  lines.push(`# ${customTitle || 'Spyglass Competitive Brief'}`);
  lines.push('');
  lines.push(`**Date:** ${dateStr} · ${changes.length} change${changes.length !== 1 ? 's' : ''} detected`);
  lines.push('');
  lines.push('---');

  if (summary) {
    lines.push('');
    lines.push('## TL;DR');
    lines.push('');
    lines.push(summary);
    lines.push('');
    lines.push('---');
  }

  if (changes.length === 0) {
    lines.push('');
    lines.push('## All Quiet');
    lines.push('');
    lines.push('No changes detected across your monitored competitors.');
    lines.push('');
  } else {
    lines.push('');
    lines.push('## Changes Detected');
    lines.push('');

    // Group competitors for threat matrix
    const byCompetitor = {};
    for (const c of changes) {
      const name = c.competitor || 'Unknown';
      if (!byCompetitor[name]) byCompetitor[name] = [];
      byCompetitor[name].push(c);
    }

    // Individual changes
    changes.forEach((c, i) => {
      const emoji = CATEGORY_EMOJI[c.ai?.category] || '🔍';
      const category = (c.ai?.category || 'other')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, ch => ch.toUpperCase());
      const urgency = (c.ai?.urgency || 'medium').toUpperCase();
      const headline = c.ai?.headline || `${c.competitor} updated`;
      const analysis = c.ai?.analysis || 'Content was modified.';
      const sourcePath = c.label || (c.url ? (() => { try { return new URL(c.url).pathname; } catch(e) { return c.url; } })() : 'unknown');

      lines.push(`### ${i + 1}. ${emoji} ${headline}`);
      lines.push('');
      lines.push(`**Category:** ${category} | **Urgency:** ${urgency}  `);
      lines.push(`**Competitor:** ${c.competitor || 'Unknown'} · ${sourcePath}  `);
      if (c.url) lines.push(`**Source URL:** ${c.url}`);
      lines.push('');
      lines.push(`> ${analysis}`);
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    // Threat matrix table
    lines.push('## Threat Matrix');
    lines.push('');
    lines.push('| Competitor | Changes | Urgency | Categories |');
    lines.push('|------------|---------|---------|-----------|');

    for (const [name, competitorChanges] of Object.entries(byCompetitor)) {
      const highCount = competitorChanges.filter(c => c.ai?.urgency === 'high').length;
      const urgencyLabel = highCount > 0 ? `🔴 ${highCount} High` : '🟡 Medium';
      const cats = [...new Set(competitorChanges.map(c =>
        (c.ai?.category || 'other').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase())
      ))].join(', ');
      lines.push(`| ${name} | ${competitorChanges.length} | ${urgencyLabel} | ${cats} |`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Strategic recommendations
    lines.push('## Strategic Recommendations');
    lines.push('');
    const highUrgency = changes.filter(c => c.ai?.urgency === 'high');
    const pricingChanges = changes.filter(c => c.ai?.category === 'pricing' || c.ai?.category === 'pricing_structure');
    const featureChanges = changes.filter(c => c.ai?.category === 'features' || c.ai?.category === 'product');
    const ctaChanges = changes.filter(c => c.ai?.category === 'cta_change');

    if (highUrgency.length > 0) {
      lines.push(`- **Immediate Review Required:** ${highUrgency.length} high-urgency change${highUrgency.length !== 1 ? 's' : ''} detected. Review before next sprint planning.`);
    }
    if (pricingChanges.length > 0) {
      lines.push(`- **Pricing Intelligence:** ${pricingChanges.map(c => c.competitor).join(', ')} updated pricing. Audit your own positioning and packaging.`);
    }
    if (featureChanges.length > 0) {
      lines.push(`- **Feature Gap Analysis:** New features detected at ${[...new Set(featureChanges.map(c => c.competitor))].join(', ')}. Add to product backlog for evaluation.`);
    }
    if (ctaChanges.length > 0) {
      lines.push(`- **GTM Shift:** CTA changes at ${ctaChanges.map(c => c.competitor).join(', ')} suggest messaging/acquisition strategy updates.`);
    }
    if (highUrgency.length === 0 && pricingChanges.length === 0 && featureChanges.length === 0 && ctaChanges.length === 0) {
      lines.push('- Monitor changes over time to identify patterns and strategic shifts.');
      lines.push('- Share with product and sales teams for context in upcoming planning cycles.');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push(`*Generated by [Spyglass](https://spyglass-10.polsia.app) — Competitive intelligence on autopilot*`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Parse text_content fallback for briefs without changes_data
 * Used for older briefs generated before changes_data was stored
 */
function parseBriefTextToMarkdown(brief) {
  const text = brief.text_content || '';
  const dateStr = brief.created_at
    ? new Date(brief.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Unknown date';

  const lines = [];
  lines.push('# Spyglass Competitive Brief');
  lines.push('');
  lines.push(`**Date:** ${dateStr} · ${brief.changes_count || 0} change${brief.changes_count !== 1 ? 's' : ''} detected`);
  lines.push('');
  lines.push('---');

  if (!text || text.includes('All quiet')) {
    lines.push('');
    lines.push('## All Quiet');
    lines.push('');
    lines.push('No changes detected across your monitored competitors.');
    lines.push('');
  } else {
    // Extract TL;DR
    const tldrMatch = text.match(/TL;DR:\s*(.+?)(?:\n\n---|\n\n\[)/s);
    if (tldrMatch) {
      lines.push('');
      lines.push('## TL;DR');
      lines.push('');
      lines.push(tldrMatch[1].trim());
      lines.push('');
      lines.push('---');
    }

    lines.push('');
    lines.push('## Changes Detected');
    lines.push('');

    // Extract individual change blocks: [CATEGORY] headline\nanalysis\nSource: ...
    const changeBlocks = text.match(/\[([A-Z_]+)\] (.+?)\n(.+?)\nSource: (.+?)(?=\n\n\[|\n\n---)/gs) || [];
    changeBlocks.forEach((block, i) => {
      const blockMatch = block.match(/\[([A-Z_]+)\] (.+?)\n(.+?)\nSource: (.+)/s);
      if (blockMatch) {
        const [, cat, headline, analysis, source] = blockMatch;
        const emoji = CATEGORY_EMOJI[cat.toLowerCase()] || '🔍';
        lines.push(`### ${i + 1}. ${emoji} ${headline.trim()}`);
        lines.push('');
        lines.push(`**Category:** ${cat.replace(/_/g, ' ')} | **Source:** ${source.trim()}`);
        lines.push('');
        lines.push(`> ${analysis.trim()}`);
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    });

    if (changeBlocks.length === 0) {
      // Fallback: just paste the text content as-is in a code block
      lines.push('```');
      lines.push(text.trim());
      lines.push('```');
      lines.push('');
    }
  }

  lines.push(`*Generated by [Spyglass](https://spyglass-10.polsia.app) — Competitive intelligence on autopilot*`);
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  buildBriefHtml,
  buildBriefText,
  buildBriefMarkdown,
  parseBriefTextToMarkdown,
  buildNoChangesHtml
};
