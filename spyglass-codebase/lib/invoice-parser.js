/**
 * AI Invoice Parser
 *
 * Extracts structured line items from raw invoice text (email forwards,
 * portal copy-paste, CSV exports from US Foods/Sysco/GFS portals).
 * No PDF library required — restaurants paste or forward the invoice body.
 *
 * Pipeline:
 *   1. Parse raw text → structured InvoiceDocument via AI (T=0.1)
 *   2. Match extracted ingredients to restaurant's ingredient catalog
 *   3. Create purchase_order + purchase_order_items records
 *   4. Price-benchmark extracted prices vs current market
 *   5. Auto-generate margin alerts for any overcharges found
 *
 * Supported input formats:
 *   - Raw email text (forwarded distributor invoices)
 *   - Sysco / US Foods / GFS portal copy-paste
 *   - CSV text (item,qty,unit,price headers)
 *   - Plain text line-item lists ("avocado 20lb @ $1.85 = $37.00")
 */

const OpenAI = require('openai');

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'unused',
    baseURL: process.env.POLSIA_AI_BASE_URL || 'https://polsia.com/api/ai-proxy/v1',
    defaultHeaders: { 'x-polsia-task': 'invoice-parsing' }
  });
}

// ── Step 1: Extract structured invoice from raw text ─────────────────────────
async function extractInvoiceFromText(rawText, vendorHint = null) {
  const client = getClient();

  const prompt = `You are a restaurant invoice extraction specialist. Parse the following invoice text and return a structured JSON object.

${vendorHint ? `Vendor hint: ${vendorHint}` : ''}

Invoice text:
---
${rawText.slice(0, 6000)}
---

Return ONLY a JSON object with this structure:
{
  "vendor_name": "<distributor company name, or null if unclear>",
  "invoice_number": "<invoice or PO number, or null>",
  "invoice_date": "<YYYY-MM-DD, or null>",
  "delivery_date": "<YYYY-MM-DD, or null>",
  "subtotal": <number or null>,
  "line_items": [
    {
      "description": "<ingredient/product description as written>",
      "normalized_name": "<cleaned ingredient name, singular, lowercase>",
      "quantity": <number>,
      "unit": "<lb|oz|each|case|gallon|liter|750ml|keg|bag|box>",
      "unit_price": <price per unit as number>,
      "line_total": <total for this line as number>,
      "category": "<produce|dairy|protein|spirits|dry_goods|seafood|bakery|mixer|beverage>"
    }
  ],
  "notes": "<any important notes, surcharges, or anomalies>"
}

Rules:
- Normalize quantity and unit (e.g., "2 cs/6" → quantity: 2, unit: "case")
- If a price is missing but subtotal/qty are present, calculate it
- If a line is a fee/surcharge (delivery fee, fuel surcharge), include it with category "fee"
- Confidence: only include line items you can parse with high confidence`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You extract structured data from food distributor invoices. Return only valid JSON. No markdown.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.0,  // zero temperature for extraction — deterministic
    max_tokens: 2000
  });

  const text = response.choices[0]?.message?.content?.trim();
  const jsonStr = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(jsonStr);
}

// ── Step 2: Match invoice items to restaurant ingredient catalog ──────────────
async function matchToIngredientCatalog(lineItems, catalogIngredients) {
  if (catalogIngredients.length === 0) return lineItems.map(li => ({ ...li, matched_ingredient: null }));

  const client = getClient();
  const catalogList = catalogIngredients.map((i, n) => `${n}: ${i.name} (${i.unit})`).join('\n');
  const itemList = lineItems.map((li, n) => `${n}: "${li.normalized_name}" (${li.unit})`).join('\n');

  const prompt = `Match each invoice item to the most likely ingredient in the catalog. Return a JSON array of match indices.

Catalog (index: name):
${catalogList}

Invoice items (index: name):
${itemList}

Return array where each element is the catalog index (0-based) for that invoice item, or null if no good match:
[<catalog_idx_for_item_0>, <catalog_idx_for_item_1>, ...]

Only match if >80% confident. Prefer exact name matches over partial.`;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.0,
      max_tokens: 300
    });
    const text = response.choices[0]?.message?.content?.trim()
      .replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const matches = JSON.parse(text);

    return lineItems.map((li, i) => ({
      ...li,
      matched_ingredient: matches[i] !== null && matches[i] !== undefined
        ? catalogIngredients[matches[i]] || null
        : null
    }));
  } catch {
    // Fall back to simple fuzzy match
    return lineItems.map(li => ({
      ...li,
      matched_ingredient: catalogIngredients.find(c =>
        c.name.toLowerCase().includes(li.normalized_name.toLowerCase().split(' ')[0]) ||
        li.normalized_name.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
      ) || null
    }));
  }
}

// ── Step 3: Persist invoice to DB ─────────────────────────────────────────────
async function persistInvoiceToDB(client, restaurantId, vendorId, invoiceDoc, matchedLineItems) {
  // Create purchase order
  const orderDate = invoiceDoc.invoice_date || new Date().toISOString().slice(0, 10);
  const deliveryDate = invoiceDoc.delivery_date || orderDate;

  const { rows: [po] } = await client.query(`
    INSERT INTO purchase_orders
      (restaurant_id, vendor_id, order_date, delivery_date, status, total_amount, invoice_number)
    VALUES ($1,$2,$3,$4,'delivered',$5,$6)
    RETURNING id
  `, [restaurantId, vendorId, orderDate, deliveryDate, invoiceDoc.subtotal || null, invoiceDoc.invoice_number || null]);

  const poId = po.id;
  const persistedItems = [];

  for (const item of matchedLineItems) {
    if (item.category === 'fee') continue; // skip surcharges
    if (!item.unit_price || !item.quantity) continue;

    let ingredientId = item.matched_ingredient?.id || null;

    // Auto-create ingredient if no match found
    if (!ingredientId && item.normalized_name) {
      const { rows: [newIngr] } = await client.query(`
        INSERT INTO ingredients (restaurant_id, name, category, unit, current_market_price)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [restaurantId, item.normalized_name, item.category || 'dry_goods', item.unit, null]);
      ingredientId = newIngr?.id || null;
    }

    if (!ingredientId) continue;

    // Compute variance vs stored market price
    const marketPrice = item.matched_ingredient?.current_market_price;
    const variancePct = marketPrice
      ? ((item.unit_price - marketPrice) / marketPrice) * 100
      : null;
    const varianceFlag = variancePct !== null && variancePct > 5;

    const { rows: [poi] } = await client.query(`
      INSERT INTO purchase_order_items
        (purchase_order_id, ingredient_id, quantity, unit, unit_price, line_total,
         variance_flag, variance_pct)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id
    `, [
      poId, ingredientId, item.quantity, item.unit,
      item.unit_price, item.line_total || (item.quantity * item.unit_price),
      varianceFlag, variancePct ? parseFloat(variancePct.toFixed(2)) : null
    ]);

    // Update vendor_prices table with this invoice price
    if (vendorId) {
      await client.query(`
        INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date, invoice_ref)
        VALUES ($1,$2,$3,$4::date,$5)
        ON CONFLICT (vendor_id, ingredient_id, effective_date) DO UPDATE
          SET price_per_unit = EXCLUDED.price_per_unit
      `, [vendorId, ingredientId, item.unit_price, orderDate, invoiceDoc.invoice_number]);
    }

    // Update price history
    await client.query(`
      INSERT INTO ingredient_price_history (ingredient_id, vendor_id, price, recorded_date, source)
      VALUES ($1,$2,$3,$4,'invoice')
      ON CONFLICT DO NOTHING
    `, [ingredientId, vendorId, item.unit_price, orderDate]);

    persistedItems.push({
      ...item,
      ingredient_id: ingredientId,
      poi_id: poi.id,
      variance_flag: varianceFlag,
      variance_pct: variancePct
    });
  }

  return { po_id: poId, items_persisted: persistedItems.length, items: persistedItems };
}

// ── Step 4: Generate overcharge findings from parsed invoice ──────────────────
function buildOverchargeFindings(matchedItems) {
  const findings = [];

  for (const item of matchedItems) {
    if (!item.matched_ingredient?.current_market_price) continue;
    const market = item.matched_ingredient.current_market_price;
    const paid = item.unit_price;
    if (paid <= market * 1.05) continue;  // within 5% tolerance

    const pct = ((paid - market) / market) * 100;
    const monthly_units = item.quantity * 4;  // rough 4-week projection
    const monthly_overcharge = (paid - market) * monthly_units;

    findings.push({
      ingredient: item.normalized_name || item.description,
      description: item.description,
      paid_price: paid,
      market_price: market,
      unit: item.unit,
      overcharge_pct: parseFloat(pct.toFixed(1)),
      invoice_qty: item.quantity,
      monthly_overcharge_estimate: parseFloat(monthly_overcharge.toFixed(2)),
      severity: pct > 30 ? 'critical' : pct > 15 ? 'high' : 'medium'
    });
  }

  return findings.sort((a, b) => b.monthly_overcharge_estimate - a.monthly_overcharge_estimate);
}

// ── Main: full invoice processing pipeline ───────────────────────────────────
async function processInvoice(pool, restaurantId, rawText, options = {}) {
  const { vendorName, vendorId: hintedVendorId } = options;

  // Step 1: AI extraction
  let invoiceDoc;
  try {
    invoiceDoc = await extractInvoiceFromText(rawText, vendorName);
  } catch (err) {
    throw new Error('Invoice extraction failed: ' + err.message);
  }

  // Resolve vendor ID
  let vendorId = hintedVendorId || null;
  if (!vendorId && invoiceDoc.vendor_name) {
    const { rows: [existingVendor] } = await pool.query(
      `SELECT id FROM vendors WHERE restaurant_id = $1 AND name ILIKE $2 LIMIT 1`,
      [restaurantId, `%${invoiceDoc.vendor_name.split(' ')[0]}%`]
    );
    if (existingVendor) vendorId = existingVendor.id;
  }

  // Step 2: Match to ingredient catalog
  const { rows: catalogIngredients } = await pool.query(
    `SELECT id, name, unit, current_market_price FROM ingredients WHERE restaurant_id = $1`,
    [restaurantId]
  );
  const matchedItems = await matchToIngredientCatalog(invoiceDoc.line_items || [], catalogIngredients);

  // Step 3: Persist to DB
  let dbResult = { po_id: null, items_persisted: 0, items: [] };
  if (vendorId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      dbResult = await persistInvoiceToDB(client, restaurantId, vendorId, invoiceDoc, matchedItems);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[InvoiceParser] DB persist error:', err.message);
    } finally {
      client.release();
    }
  }

  // Step 4: Overcharge findings
  const overchargeFindings = buildOverchargeFindings(matchedItems);
  const totalMonthlyOvercharge = overchargeFindings.reduce(
    (sum, f) => sum + f.monthly_overcharge_estimate, 0
  );

  return {
    invoice: {
      vendor: invoiceDoc.vendor_name,
      date: invoiceDoc.invoice_date,
      invoice_number: invoiceDoc.invoice_number,
      subtotal: invoiceDoc.subtotal,
      line_item_count: invoiceDoc.line_items?.length || 0
    },
    matching: {
      total_items: matchedItems.length,
      matched_to_catalog: matchedItems.filter(i => i.matched_ingredient).length,
      unmatched: matchedItems.filter(i => !i.matched_ingredient).length
    },
    persistence: {
      po_id: dbResult.po_id,
      items_recorded: dbResult.items_persisted,
      vendor_id: vendorId
    },
    overcharge_findings: overchargeFindings,
    total_monthly_overcharge_estimate: parseFloat(totalMonthlyOvercharge.toFixed(2)),
    line_items: matchedItems.map(li => ({
      description: li.description,
      normalized: li.normalized_name,
      quantity: li.quantity,
      unit: li.unit,
      unit_price: li.unit_price,
      line_total: li.line_total,
      market_price: li.matched_ingredient?.current_market_price || null,
      variance_pct: li.variance_pct,
      variance_flag: li.variance_flag,
      category: li.category
    }))
  };
}

module.exports = {
  processInvoice,
  extractInvoiceFromText,
  matchToIngredientCatalog,
  buildOverchargeFindings
};
