/**
 * Web scraping engine for Spyglass
 * Fetches URLs, extracts text AND structural content, detects changes via content hashing
 *
 * v2: Added structural DOM extraction to detect CTA, navigation, form, and layout changes
 *     that pure text diffing misses.
 */
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch a URL and return its text content
 */
function fetchUrl(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      timeout,
      rejectUnauthorized: false
    }, (res) => {
      // Follow redirects (up to 5)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        return fetchUrl(redirectUrl, timeout).then(resolve).catch(reject);
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          html: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
  });
}

/**
 * Strip HTML tags and extract meaningful text content
 */
function extractText(html) {
  if (!html) return '';

  // Remove script, style, svg, noscript
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' [NAV] ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' [HEADER] ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' [FOOTER] ');

  // Replace common elements with semantic markers
  text = text
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n## $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<td[^>]*>/gi, ' | ')
    .replace(/<th[^>]*>/gi, ' | ');

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)));

  // Clean up whitespace
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return text;
}

// ============================================================
// Structural DOM Extraction (v2)
// ============================================================

// Tags to keep in structural extraction
const SEMANTIC_TAGS = new Set([
  'nav', 'header', 'footer', 'main', 'section', 'article', 'aside',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'button',
  'form', 'input', 'select', 'textarea', 'label',
  'img', 'video',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'ul', 'ol', 'li',
  'p', 'div', 'span',
  'details', 'summary'
]);

// Attributes worth keeping for structural analysis
const KEEP_ATTRS = new Set([
  'href', 'src', 'alt', 'type', 'placeholder', 'name',
  'action', 'method', 'role', 'aria-label', 'aria-describedby',
  'target', 'rel', 'value', 'title'
]);

// Tags to strip entirely (including contents)
const STRIP_TAGS = new Set(['script', 'style', 'svg', 'noscript', 'iframe', 'link', 'meta']);

/**
 * Extract a cleaned semantic HTML skeleton from raw HTML.
 * Strips scripts, styles, ads, tracking - keeps structure, buttons, links, forms, headings.
 * Returns a simplified, normalized HTML string for structural diffing.
 */
function extractStructure(html) {
  if (!html) return '';

  let cleaned = html;

  // 1. Strip tags whose content is irrelevant
  for (const tag of STRIP_TAGS) {
    cleaned = cleaned.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, 'gi'), '');
    // Self-closing variants
    cleaned = cleaned.replace(new RegExp(`<${tag}[^>]*\\/?>`, 'gi'), '');
  }

  // 2. Strip HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Extract structural signals - a compact representation
  const signals = [];

  // Extract buttons with their text and attributes
  const buttonRegex = /<button([^>]*)>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(cleaned)) !== null) {
    const attrs = parseAttrs(match[1]);
    const text = stripTags(match[2]).trim();
    if (text) {
      signals.push({ type: 'button', text, attrs });
    }
  }

  // Extract links (a tags) with href and text
  const linkRegex = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
  while ((match = linkRegex.exec(cleaned)) !== null) {
    const attrs = parseAttrs(match[1]);
    const text = stripTags(match[2]).trim();
    if (text && attrs.href && !attrs.href.startsWith('#') && !attrs.href.startsWith('javascript:')) {
      signals.push({ type: 'link', text, href: attrs.href, attrs });
    }
  }

  // Extract headings
  const headingRegex = /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi;
  while ((match = headingRegex.exec(cleaned)) !== null) {
    const text = stripTags(match[3]).trim();
    if (text) {
      signals.push({ type: 'heading', level: match[1], text });
    }
  }

  // Extract form elements
  const formRegex = /<form([^>]*)>([\s\S]*?)<\/form>/gi;
  while ((match = formRegex.exec(cleaned)) !== null) {
    const formAttrs = parseAttrs(match[1]);
    const formContent = match[2];
    const fields = [];

    // Extract inputs within the form
    const inputRegex = /<input([^>]*)\/?>/gi;
    let inputMatch;
    while ((inputMatch = inputRegex.exec(formContent)) !== null) {
      const iAttrs = parseAttrs(inputMatch[1]);
      if (iAttrs.type !== 'hidden') {
        fields.push({
          tag: 'input',
          type: iAttrs.type || 'text',
          name: iAttrs.name || '',
          placeholder: iAttrs.placeholder || ''
        });
      }
    }

    // Extract selects
    const selectRegex = /<select([^>]*)>[\s\S]*?<\/select>/gi;
    let selectMatch;
    while ((selectMatch = selectRegex.exec(formContent)) !== null) {
      const sAttrs = parseAttrs(selectMatch[1]);
      fields.push({ tag: 'select', name: sAttrs.name || '' });
    }

    // Extract textareas
    const textareaRegex = /<textarea([^>]*)>[\s\S]*?<\/textarea>/gi;
    let taMatch;
    while ((taMatch = textareaRegex.exec(formContent)) !== null) {
      const tAttrs = parseAttrs(taMatch[1]);
      fields.push({ tag: 'textarea', name: tAttrs.name || '', placeholder: tAttrs.placeholder || '' });
    }

    if (fields.length > 0) {
      signals.push({
        type: 'form',
        action: formAttrs.action || '',
        method: formAttrs.method || 'get',
        fields
      });
    }
  }

  // Extract standalone inputs (outside forms)
  const standaloneInputRegex = /<input([^>]*)\/?>/gi;
  while ((match = standaloneInputRegex.exec(cleaned)) !== null) {
    const attrs = parseAttrs(match[1]);
    if (attrs.type !== 'hidden') {
      signals.push({
        type: 'input',
        inputType: attrs.type || 'text',
        name: attrs.name || '',
        placeholder: attrs.placeholder || ''
      });
    }
  }

  // Extract nav structure
  const navRegex = /<nav([^>]*)>([\s\S]*?)<\/nav>/gi;
  while ((match = navRegex.exec(cleaned)) !== null) {
    const navLinks = [];
    const navLinkRegex = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
    let nlMatch;
    while ((nlMatch = navLinkRegex.exec(match[2])) !== null) {
      const attrs = parseAttrs(nlMatch[1]);
      const text = stripTags(nlMatch[2]).trim();
      if (text) {
        navLinks.push({ text, href: attrs.href || '' });
      }
    }
    if (navLinks.length > 0) {
      signals.push({ type: 'nav', links: navLinks });
    }
  }

  // Extract images (important for hero images, logos, feature screenshots)
  const imgRegex = /<img([^>]*)\/?>/gi;
  while ((match = imgRegex.exec(cleaned)) !== null) {
    const attrs = parseAttrs(match[1]);
    if (attrs.alt || attrs.src) {
      signals.push({
        type: 'image',
        alt: attrs.alt || '',
        src: normalizeImgSrc(attrs.src || '')
      });
    }
  }

  // Extract pricing-related patterns (tables, specific sections)
  const priceRegex = /\$[\d,]+(?:\.\d{2})?(?:\s*\/\s*(?:mo|month|year|yr|week|wk|annual))?/gi;
  const prices = [];
  while ((match = priceRegex.exec(cleaned)) !== null) {
    const priceText = stripTags(match[0]).trim();
    if (priceText) prices.push(priceText);
  }
  if (prices.length > 0) {
    signals.push({ type: 'pricing', prices: [...new Set(prices)] });
  }

  // Build compact structural representation
  const structure = signals.map(s => structuralSignalToString(s)).join('\n');

  return structure;
}

/**
 * Parse HTML attributes from a tag's attribute string
 */
function parseAttrs(attrString) {
  const attrs = {};
  if (!attrString) return attrs;

  // Match key="value", key='value', or key=value patterns
  const attrRegex = /(\w[\w-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
  let m;
  while ((m = attrRegex.exec(attrString)) !== null) {
    const key = m[1].toLowerCase();
    const val = m[2] ?? m[3] ?? m[4] ?? '';
    if (KEEP_ATTRS.has(key)) {
      attrs[key] = decodeEntities(val);
    }
  }
  return attrs;
}

/**
 * Strip all HTML tags from a string, leaving only text
 */
function stripTags(html) {
  return (html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Decode common HTML entities
 */
function decodeEntities(text) {
  return (text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/**
 * Normalize image src - strip query params (cache busters), keep path
 */
function normalizeImgSrc(src) {
  try {
    const u = new URL(src, 'https://example.com');
    return u.pathname;
  } catch {
    return src.split('?')[0];
  }
}

/**
 * Convert a structural signal to a compact string representation for diffing
 */
function structuralSignalToString(signal) {
  switch (signal.type) {
    case 'button':
      return `[BUTTON] ${signal.text}`;
    case 'link':
      return `[LINK] ${signal.text} -> ${signal.href}`;
    case 'heading':
      return `[${signal.level.toUpperCase()}] ${signal.text}`;
    case 'form':
      return `[FORM action=${signal.action} method=${signal.method}]\n` +
        signal.fields.map(f => `  [FIELD ${f.tag} type=${f.type || ''} name=${f.name} placeholder="${f.placeholder || ''}"]`).join('\n');
    case 'input':
      return `[INPUT type=${signal.inputType} name=${signal.name} placeholder="${signal.placeholder}"]`;
    case 'nav':
      return `[NAV]\n` + signal.links.map(l => `  ${l.text} -> ${l.href}`).join('\n');
    case 'image':
      return `[IMG alt="${signal.alt}" src=${signal.src}]`;
    case 'pricing':
      return `[PRICING] ${signal.prices.join(', ')}`;
    default:
      return `[${signal.type.toUpperCase()}]`;
  }
}

// ============================================================
// Structural Diff Engine (v2)
// ============================================================

/**
 * Compare two structural extractions and produce categorized changes.
 * Returns { changes: [...], summary: string, hasStructuralChanges: boolean }
 */
function computeStructuralDiff(oldStructure, newStructure) {
  if (!oldStructure && !newStructure) return { changes: [], summary: '', hasStructuralChanges: false };
  if (!oldStructure && newStructure) return { changes: [{ category: 'layout', detail: 'First structural snapshot captured' }], summary: 'Initial structural capture', hasStructuralChanges: false };

  const oldSignals = parseStructuralSignals(oldStructure);
  const newSignals = parseStructuralSignals(newStructure);

  const changes = [];

  // 1. CTA Changes (buttons)
  const ctaChanges = diffSignalGroup(oldSignals.buttons, newSignals.buttons, 'text');
  for (const c of ctaChanges.added) {
    changes.push({ category: 'cta_change', action: 'added', detail: `New CTA button: "${c.text}"` });
  }
  for (const c of ctaChanges.removed) {
    changes.push({ category: 'cta_change', action: 'removed', detail: `Removed CTA button: "${c.text}"` });
  }
  for (const c of ctaChanges.modified) {
    changes.push({ category: 'cta_change', action: 'modified', detail: `CTA changed: "${c.old}" -> "${c.new}"` });
  }

  // 2. Navigation Changes
  const navChanges = diffNavigation(oldSignals.navLinks, newSignals.navLinks);
  for (const c of navChanges.added) {
    changes.push({ category: 'navigation', action: 'added', detail: `New nav item: "${c.text}" (${c.href})` });
  }
  for (const c of navChanges.removed) {
    changes.push({ category: 'navigation', action: 'removed', detail: `Removed nav item: "${c.text}" (${c.href})` });
  }

  // 3. Form Changes
  const formChanges = diffForms(oldSignals.forms, newSignals.forms);
  for (const c of formChanges) {
    changes.push({ category: 'form_change', action: c.action, detail: c.detail });
  }

  // 4. Heading / Section Changes (layout indicator)
  const headingChanges = diffSignalGroup(oldSignals.headings, newSignals.headings, 'text');
  for (const c of headingChanges.added) {
    changes.push({ category: 'layout', action: 'added', detail: `New section: "${c.text}"` });
  }
  for (const c of headingChanges.removed) {
    changes.push({ category: 'layout', action: 'removed', detail: `Removed section: "${c.text}"` });
  }

  // 5. Link Changes (key for partnership, feature pages, etc.)
  const linkChanges = diffLinks(oldSignals.links, newSignals.links);
  for (const c of linkChanges.added) {
    changes.push({ category: 'layout', action: 'added', detail: `New link: "${c.text}" -> ${c.href}` });
  }
  for (const c of linkChanges.removed) {
    changes.push({ category: 'layout', action: 'removed', detail: `Removed link: "${c.text}" -> ${c.href}` });
  }

  // 6. Pricing Changes
  const pricingChanges = diffPricing(oldSignals.prices, newSignals.prices);
  for (const c of pricingChanges) {
    changes.push({ category: 'pricing_structure', action: c.action, detail: c.detail });
  }

  // 7. Image Changes (hero images, feature screenshots)
  const imgChanges = diffImages(oldSignals.images, newSignals.images);
  for (const c of imgChanges) {
    changes.push({ category: 'layout', action: c.action, detail: c.detail });
  }

  // Build summary
  const summary = changes.map(c => `[${c.category}] ${c.detail}`).join('\n');

  return {
    changes,
    summary,
    hasStructuralChanges: changes.length > 0
  };
}

/**
 * Parse structural signal strings back into typed objects for comparison
 */
function parseStructuralSignals(structure) {
  if (!structure) return { buttons: [], links: [], headings: [], forms: [], navLinks: [], images: [], prices: [] };

  const lines = structure.split('\n');
  const signals = { buttons: [], links: [], headings: [], forms: [], navLinks: [], images: [], prices: [] };

  let currentNav = null;
  let currentForm = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[BUTTON] ')) {
      signals.buttons.push({ text: trimmed.substring(9) });
    } else if (trimmed.startsWith('[LINK] ')) {
      const linkMatch = trimmed.match(/^\[LINK\] (.+?) -> (.+)$/);
      if (linkMatch) {
        signals.links.push({ text: linkMatch[1], href: linkMatch[2] });
      }
    } else if (/^\[H[1-6]\] /.test(trimmed)) {
      const level = trimmed.substring(1, 3).toLowerCase();
      const text = trimmed.substring(5);
      signals.headings.push({ level, text });
    } else if (trimmed.startsWith('[FORM ')) {
      const formMatch = trimmed.match(/^\[FORM action=(.+?) method=(.+?)\]$/);
      currentForm = { action: formMatch?.[1] || '', method: formMatch?.[2] || '', fields: [] };
    } else if (trimmed.startsWith('[FIELD ') && currentForm) {
      currentForm.fields.push(trimmed);
      // Check if next line continues form fields
    } else if (trimmed.startsWith('[NAV]')) {
      currentNav = [];
    } else if (currentNav !== null && trimmed.includes(' -> ')) {
      const navMatch = trimmed.match(/^(.+?) -> (.+)$/);
      if (navMatch) {
        currentNav.push({ text: navMatch[1], href: navMatch[2] });
      }
    } else if (trimmed.startsWith('[IMG ')) {
      const imgMatch = trimmed.match(/^\[IMG alt="(.*?)" src=(.+?)\]$/);
      if (imgMatch) {
        signals.images.push({ alt: imgMatch[1], src: imgMatch[2] });
      }
    } else if (trimmed.startsWith('[PRICING] ')) {
      const pricesStr = trimmed.substring(10);
      signals.prices.push(...pricesStr.split(', ').map(p => p.trim()).filter(Boolean));
    } else {
      // End of nav/form blocks
      if (currentNav !== null && !trimmed.includes(' -> ')) {
        signals.navLinks.push(...currentNav);
        currentNav = null;
      }
      if (currentForm !== null && !trimmed.startsWith('[FIELD')) {
        signals.forms.push(currentForm);
        currentForm = null;
      }
    }
  }

  // Flush any remaining blocks
  if (currentNav !== null) signals.navLinks.push(...currentNav);
  if (currentForm !== null) signals.forms.push(currentForm);

  return signals;
}

/**
 * Generic diff for arrays of objects with a key field
 */
function diffSignalGroup(oldItems, newItems, keyField) {
  const oldMap = new Map(oldItems.map(item => [item[keyField]?.toLowerCase()?.trim(), item]));
  const newMap = new Map(newItems.map(item => [item[keyField]?.toLowerCase()?.trim(), item]));

  const added = [];
  const removed = [];
  const modified = [];

  for (const [key, item] of newMap) {
    if (!oldMap.has(key)) {
      added.push(item);
    }
  }

  for (const [key, item] of oldMap) {
    if (!newMap.has(key)) {
      // Check if it was renamed (fuzzy match)
      removed.push(item);
    }
  }

  return { added, removed, modified };
}

/**
 * Diff navigation links
 */
function diffNavigation(oldLinks, newLinks) {
  const oldSet = new Set(oldLinks.map(l => `${l.text}|||${l.href}`));
  const newSet = new Set(newLinks.map(l => `${l.text}|||${l.href}`));

  const added = newLinks.filter(l => !oldSet.has(`${l.text}|||${l.href}`));
  const removed = oldLinks.filter(l => !newSet.has(`${l.text}|||${l.href}`));

  return { added, removed };
}

/**
 * Diff forms - detect field additions/removals
 */
function diffForms(oldForms, newForms) {
  const changes = [];

  const oldFieldSet = new Set();
  const newFieldSet = new Set();

  for (const form of oldForms) {
    for (const field of form.fields) {
      oldFieldSet.add(field);
    }
  }
  for (const form of newForms) {
    for (const field of form.fields) {
      newFieldSet.add(field);
    }
  }

  for (const field of newFieldSet) {
    if (!oldFieldSet.has(field)) {
      changes.push({ action: 'added', detail: `New form field: ${field}` });
    }
  }
  for (const field of oldFieldSet) {
    if (!newFieldSet.has(field)) {
      changes.push({ action: 'removed', detail: `Removed form field: ${field}` });
    }
  }

  // Detect form count changes
  if (newForms.length > oldForms.length) {
    changes.push({ action: 'added', detail: `New form added (${oldForms.length} -> ${newForms.length} forms)` });
  } else if (newForms.length < oldForms.length) {
    changes.push({ action: 'removed', detail: `Form removed (${oldForms.length} -> ${newForms.length} forms)` });
  }

  return changes;
}

/**
 * Diff links - focus on significant link changes (ignore minor href changes)
 */
function diffLinks(oldLinks, newLinks) {
  // Only track links by text (not href) to avoid noise from cache busters
  const oldTexts = new Set(oldLinks.map(l => l.text.toLowerCase().trim()));
  const newTexts = new Set(newLinks.map(l => l.text.toLowerCase().trim()));

  const added = newLinks.filter(l => !oldTexts.has(l.text.toLowerCase().trim()));
  const removed = oldLinks.filter(l => !newTexts.has(l.text.toLowerCase().trim()));

  // Deduplicate by text
  const seenAdded = new Set();
  const uniqueAdded = added.filter(l => {
    const key = l.text.toLowerCase().trim();
    if (seenAdded.has(key)) return false;
    seenAdded.add(key);
    return true;
  });

  const seenRemoved = new Set();
  const uniqueRemoved = removed.filter(l => {
    const key = l.text.toLowerCase().trim();
    if (seenRemoved.has(key)) return false;
    seenRemoved.add(key);
    return true;
  });

  return { added: uniqueAdded, removed: uniqueRemoved };
}

/**
 * Diff pricing signals
 */
function diffPricing(oldPrices, newPrices) {
  const changes = [];
  const oldSet = new Set(oldPrices);
  const newSet = new Set(newPrices);

  for (const price of newPrices) {
    if (!oldSet.has(price)) {
      changes.push({ action: 'added', detail: `New price point: ${price}` });
    }
  }
  for (const price of oldPrices) {
    if (!newSet.has(price)) {
      changes.push({ action: 'removed', detail: `Removed price point: ${price}` });
    }
  }

  return changes;
}

/**
 * Diff images
 */
function diffImages(oldImages, newImages) {
  const changes = [];
  const oldAlts = new Set(oldImages.map(i => i.alt.toLowerCase().trim()).filter(Boolean));
  const newAlts = new Set(newImages.map(i => i.alt.toLowerCase().trim()).filter(Boolean));

  for (const alt of newAlts) {
    if (!oldAlts.has(alt)) {
      changes.push({ action: 'added', detail: `New image: "${alt}"` });
    }
  }
  for (const alt of oldAlts) {
    if (!newAlts.has(alt)) {
      changes.push({ action: 'removed', detail: `Removed image: "${alt}"` });
    }
  }

  return changes;
}

// ============================================================
// Core Functions
// ============================================================

/**
 * Hash content for change detection
 */
function hashContent(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex');
}

/**
 * Compute a simple line-based diff between old and new text
 */
function computeDiff(oldText, newText) {
  if (!oldText && newText) return { added: newText.split('\n'), removed: [], type: 'new_content' };
  if (oldText && !newText) return { added: [], removed: oldText.split('\n'), type: 'content_removed' };

  const oldLines = new Set(oldText.split('\n').map(l => l.trim()).filter(Boolean));
  const newLines = new Set(newText.split('\n').map(l => l.trim()).filter(Boolean));

  const added = [...newLines].filter(l => !oldLines.has(l));
  const removed = [...oldLines].filter(l => !newLines.has(l));

  let type = 'content_change';
  if (added.length > 0 && removed.length === 0) type = 'content_added';
  if (added.length === 0 && removed.length > 0) type = 'content_removed';
  if (added.length > removed.length * 2) type = 'major_update';

  return { added, removed, type };
}

/**
 * Scan a single URL: fetch, extract text + structure, hash, compare to previous
 */
async function scanUrl(pool, monitoredUrlId) {
  const { rows: [urlRow] } = await pool.query(
    `SELECT mu.*, c.name as competitor_name
     FROM monitored_urls mu
     JOIN competitors c ON c.id = mu.competitor_id
     WHERE mu.id = $1`,
    [monitoredUrlId]
  );

  if (!urlRow) throw new Error(`Monitored URL ${monitoredUrlId} not found`);

  let result;
  try {
    result = await fetchUrl(urlRow.url);
  } catch (err) {
    // Save error snapshot
    await pool.query(
      `INSERT INTO page_snapshots (monitored_url_id, content_hash, error, status_code, captured_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [monitoredUrlId, 'error', err.message, 0]
    );
    await pool.query(
      `UPDATE monitored_urls SET last_checked_at = NOW() WHERE id = $1`,
      [monitoredUrlId]
    );
    return { error: err.message, url: urlRow.url };
  }

  const textContent = extractText(result.html);
  const contentHash = hashContent(textContent);

  // v2: Extract structural content
  const structuralContent = extractStructure(result.html);
  const structuralHash = hashContent(structuralContent);

  // Get previous snapshot
  const { rows: [prevSnapshot] } = await pool.query(
    `SELECT * FROM page_snapshots
     WHERE monitored_url_id = $1 AND error IS NULL
     ORDER BY captured_at DESC LIMIT 1`,
    [monitoredUrlId]
  );

  // Save new snapshot (with structural content)
  const { rows: [newSnapshot] } = await pool.query(
    `INSERT INTO page_snapshots (monitored_url_id, content_hash, text_content, structural_content, structural_hash, status_code, captured_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
    [monitoredUrlId, contentHash, textContent.substring(0, 100000), structuralContent.substring(0, 100000), structuralHash, result.statusCode]
  );

  // Update last checked
  await pool.query(
    `UPDATE monitored_urls SET last_checked_at = NOW() WHERE id = $1`,
    [monitoredUrlId]
  );

  // Detect changes (text OR structural)
  const textChanged = prevSnapshot && prevSnapshot.content_hash !== contentHash;
  const structuralChanged = prevSnapshot && prevSnapshot.structural_hash !== structuralHash;

  if (textChanged || structuralChanged) {
    const diff = computeDiff(prevSnapshot.text_content, textContent);

    // v2: Compute structural diff
    const structDiff = computeStructuralDiff(
      prevSnapshot.structural_content || '',
      structuralContent
    );

    // Build diff summary (text + structural)
    const diffLines = [];
    if (diff.added.length > 0) {
      diffLines.push(`**Added (${diff.added.length} lines):**`);
      diff.added.slice(0, 20).forEach(l => diffLines.push(`+ ${l}`));
      if (diff.added.length > 20) diffLines.push(`... and ${diff.added.length - 20} more`);
    }
    if (diff.removed.length > 0) {
      diffLines.push(`**Removed (${diff.removed.length} lines):**`);
      diff.removed.slice(0, 20).forEach(l => diffLines.push(`- ${l}`));
      if (diff.removed.length > 20) diffLines.push(`... and ${diff.removed.length - 20} more`);
    }

    // Determine significance (boosted if structural changes detected)
    let significance;
    const totalTextChanges = diff.added.length + diff.removed.length;
    if (structDiff.hasStructuralChanges) {
      // Structural changes are always at least medium significance
      significance = totalTextChanges > 10 || structDiff.changes.length > 3 ? 'high' : 'medium';
    } else {
      significance = totalTextChanges > 20 ? 'high' : totalTextChanges > 5 ? 'medium' : 'low';
    }

    // Determine change type
    let changeType = diff.type;
    if (structDiff.hasStructuralChanges && !textChanged) {
      changeType = 'structural_change';
    } else if (structDiff.hasStructuralChanges) {
      changeType = diff.type; // Keep text change type but structural info is in structural_changes
    }

    // Save detected change (with structural data)
    const { rows: [change] } = await pool.query(
      `INSERT INTO detected_changes
       (monitored_url_id, snapshot_id, previous_snapshot_id, change_type, diff_summary, significance, structural_diff, structural_changes, detected_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
      [
        monitoredUrlId,
        newSnapshot.id,
        prevSnapshot.id,
        changeType,
        diffLines.join('\n'),
        significance,
        structDiff.summary || null,
        structDiff.changes.length > 0 ? JSON.stringify(structDiff.changes) : null
      ]
    );

    return {
      changed: true,
      url: urlRow.url,
      label: urlRow.label,
      competitor: urlRow.competitor_name,
      changeType,
      significance,
      addedCount: diff.added.length,
      removedCount: diff.removed.length,
      diffSummary: diffLines.join('\n'),
      changeId: change.id,
      // Pass raw diff for AI analysis
      added: diff.added,
      removed: diff.removed,
      newText: textContent.substring(0, 5000),
      oldText: (prevSnapshot.text_content || '').substring(0, 5000),
      // v2: Structural data for AI analysis
      structuralChanges: structDiff.changes,
      structuralDiff: structDiff.summary,
      hasStructuralChanges: structDiff.hasStructuralChanges
    };
  }

  return {
    changed: false,
    url: urlRow.url,
    label: urlRow.label,
    competitor: urlRow.competitor_name,
    isFirstScan: !prevSnapshot
  };
}

/**
 * Scan all active URLs for a user
 */
async function scanAllForUser(pool, userId) {
  const { rows: urls } = await pool.query(
    `SELECT mu.id
     FROM monitored_urls mu
     JOIN competitors c ON c.id = mu.competitor_id
     WHERE c.user_id = $1 AND c.active = true AND mu.active = true
     ORDER BY mu.last_checked_at ASC NULLS FIRST`,
    [userId]
  );

  const results = [];
  for (const url of urls) {
    try {
      const result = await scanUrl(pool, url.id);
      results.push(result);
    } catch (err) {
      results.push({ error: err.message, urlId: url.id });
    }
    // Small delay between requests to be polite
    await new Promise(r => setTimeout(r, 1000));
  }

  return results;
}

module.exports = {
  fetchUrl,
  extractText,
  extractStructure,
  hashContent,
  computeDiff,
  computeStructuralDiff,
  scanUrl,
  scanAllForUser
};
