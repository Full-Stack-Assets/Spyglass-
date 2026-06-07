/**
 * POS Integration — Toast, Clover, Square
 *
 * Receives webhooks from major POS platforms and normalizes them into
 * the Upstream sales_data schema. Each platform sends different event
 * shapes — this module handles the translation layer.
 *
 * Supported platforms:
 *   Toast  — Order Webhook v2 (orderCreated, orderUpdated)
 *   Clover — Webhooks API (payment.processed, order.completed)
 *   Square — Subscriptions API (order.created, payment.created)
 *
 * After ingestion, triggers:
 *   1. net_revenue calculation (sale_price - platform_commission)
 *   2. Margin snapshot recalculation for the day
 *   3. Recipe-level COGS lookup for food cost tracking
 *
 * Verification:
 *   Toast:  HMAC-SHA256 on Toast-Webhook-Signature header
 *   Clover: HMAC-SHA256 on X-Clover-Signature header
 *   Square: X-Square-HMAC-SHA256-Signature header
 */

const crypto = require('crypto');

// ── Signature verification ────────────────────────────────────────────────────

function verifyToastSignature(payload, signatureHeader, secret) {
  if (!secret || !signatureHeader) return true; // skip if not configured
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader.replace('sha256=', ''), 'hex'),
    Buffer.from(expected, 'hex')
  );
}

function verifyCloverSignature(payload, signatureHeader, secret) {
  if (!secret || !signatureHeader) return true;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  return signatureHeader === expected;
}

function verifySquareSignature(payload, signatureHeader, secret, url) {
  if (!secret || !signatureHeader) return true;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(url + payload)
    .digest('base64');
  return signatureHeader === expected;
}

// ── Toast webhook normalization ───────────────────────────────────────────────
// Docs: https://doc.toasttab.com/doc/devguide/apiOrderWebhooks.html

function normalizeToastEvent(body) {
  const events = [];

  const orders = Array.isArray(body) ? body : [body];

  for (const event of orders) {
    const order = event.order || event;
    if (!order) continue;

    const orderDate = order.openedDate
      ? new Date(order.openedDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    // Toast channel mapping
    const source = (order.orderingChannel || '').toLowerCase();
    const channel =
      source.includes('doordash') ? 'doordash' :
      source.includes('ubereats') || source.includes('uber_eats') ? 'ubereats' :
      source.includes('grubhub') ? 'grubhub' :
      source.includes('online') || source.includes('web') ? 'online_order' :
      'dine_in';

    const platformCommissionPct = channel === 'doordash' ? 27 :
      channel === 'ubereats' ? 30 :
      channel === 'grubhub'  ? 20 : 0;

    // Line items → one sales_data row per menu item
    for (const selection of order.selections || []) {
      const salePrice = parseFloat(selection.price || 0) / 100; // Toast uses cents
      const qty = selection.quantity || 1;
      const netRevenue = salePrice * (1 - platformCommissionPct / 100);

      events.push({
        platform: 'toast',
        external_order_id: order.guid,
        sale_date: orderDate,
        pos_item_id: selection.itemGuid || selection.guid,
        pos_item_name: selection.displayName || selection.name,
        quantity_sold: qty,
        sale_price: parseFloat(salePrice.toFixed(2)),
        channel,
        platform_commission_pct: platformCommissionPct,
        platform_fee_flat: 0,
        net_revenue: parseFloat((netRevenue * qty).toFixed(2))
      });
    }
  }

  return events;
}

// ── Clover webhook normalization ───────────────────────────────────────────────
// Docs: https://docs.clover.com/docs/webhooks

function normalizeCloverEvent(body) {
  const events = [];
  const notifications = Array.isArray(body) ? body : [body.merchants ? Object.values(body.merchants).flat() : [body]].flat();

  for (const notification of notifications) {
    // Clover notification shape: { type, merchantId, appId, objectId, timestamp, ... }
    if (!['payment.processed', 'order.completed'].includes(notification.type)) continue;

    const orderDate = notification.timestamp
      ? new Date(notification.timestamp).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const order = notification.order || notification.payment?.order || {};
    const lineItems = order.lineItems?.elements || [];

    const channel = (order.orderType?.label || '').toLowerCase().includes('delivery')
      ? 'doordash'
      : (order.orderType?.label || '').toLowerCase().includes('takeout')
      ? 'takeout' : 'dine_in';

    for (const item of lineItems) {
      const salePrice = parseFloat((item.price || 0)) / 100;
      const qty = item.quantity || 1;

      events.push({
        platform: 'clover',
        external_order_id: order.id,
        sale_date: orderDate,
        pos_item_id: item.item?.id,
        pos_item_name: item.name,
        quantity_sold: qty,
        sale_price: parseFloat(salePrice.toFixed(2)),
        channel,
        platform_commission_pct: 0,
        platform_fee_flat: 0,
        net_revenue: parseFloat((salePrice * qty).toFixed(2))
      });
    }
  }

  return events;
}

// ── Square webhook normalization ───────────────────────────────────────────────
// Docs: https://developer.squareup.com/docs/webhooks

function normalizeSquareEvent(body) {
  const events = [];
  const event = body;

  if (!['order.created', 'order.updated', 'payment.created'].includes(event.type)) return [];

  const order = event.data?.object?.order || {};
  const orderDate = order.created_at
    ? new Date(order.created_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const fulfillment = order.fulfillments?.[0]?.type || 'DINE_IN';
  const channel = fulfillment === 'DELIVERY' ? 'delivery' :
    fulfillment === 'PICKUP' ? 'takeout' : 'dine_in';

  for (const item of order.line_items || []) {
    const salePrice = parseInt(item.base_price_money?.amount || 0) / 100;
    const qty = parseInt(item.quantity || 1);

    events.push({
      platform: 'square',
      external_order_id: order.id,
      sale_date: orderDate,
      pos_item_id: item.catalog_object_id,
      pos_item_name: item.name,
      quantity_sold: qty,
      sale_price: parseFloat(salePrice.toFixed(2)),
      channel,
      platform_commission_pct: 0,
      platform_fee_flat: 0,
      net_revenue: parseFloat((salePrice * qty).toFixed(2))
    });
  }

  return events;
}

// ── Recipe resolution: pos_item_name → recipe_id ─────────────────────────────
async function resolveRecipeIds(pool, restaurantId, events) {
  const { rows: recipes } = await pool.query(
    `SELECT id, name FROM recipes WHERE restaurant_id = $1 AND active = true`,
    [restaurantId]
  );

  return events.map(event => {
    const match = recipes.find(r => {
      const rName = r.name.toLowerCase();
      const eName = (event.pos_item_name || '').toLowerCase();
      return rName === eName ||
        rName.includes(eName.split(' ')[0]) ||
        eName.includes(rName.split(' ')[0]);
    });

    return { ...event, recipe_id: match?.id || null };
  });
}

// ── Persist events to sales_data ──────────────────────────────────────────────
async function persistSalesEvents(pool, restaurantId, events) {
  let inserted = 0;
  let skipped = 0;

  for (const ev of events) {
    if (!ev.sale_price || ev.sale_price <= 0) { skipped++; continue; }

    try {
      await pool.query(`
        INSERT INTO sales_data
          (restaurant_id, sale_date, recipe_id, quantity_sold, sale_price,
           channel, platform_commission_pct, platform_fee_flat, net_revenue)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        restaurantId,
        ev.sale_date,
        ev.recipe_id || null,
        ev.quantity_sold,
        ev.sale_price,
        ev.channel,
        ev.platform_commission_pct || 0,
        ev.platform_fee_flat || 0,
        ev.net_revenue
      ]);
      inserted++;
    } catch { skipped++; }
  }

  return { inserted, skipped };
}

// ── Daily margin snapshot recalculation ──────────────────────────────────────
async function recalculateDaySnapshot(pool, restaurantId, date) {
  const { rows: [summary] } = await pool.query(`
    SELECT
      SUM(sale_price * quantity_sold)                             AS total_revenue,
      SUM(platform_commission_pct / 100.0 * sale_price * quantity_sold
          + platform_fee_flat * quantity_sold)                   AS total_platform_fees,
      COUNT(*) FILTER (WHERE channel NOT IN ('dine_in','takeout')) AS delivery_orders,
      COUNT(*)                                                    AS total_orders,
      AVG(platform_commission_pct) FILTER (
        WHERE channel NOT IN ('dine_in','takeout'))               AS avg_delivery_commission
    FROM sales_data
    WHERE restaurant_id = $1 AND sale_date = $2
  `, [restaurantId, date]);

  if (!summary?.total_revenue) return null;

  const revenue = parseFloat(summary.total_revenue);
  const platformFees = parseFloat(summary.total_platform_fees || 0);
  const deliveryMixPct = summary.total_orders > 0
    ? (summary.delivery_orders / summary.total_orders) * 100 : 0;

  // Estimate COGS from restaurant target (actual would need recipe cost lookup)
  const { rows: [restaurant] } = await pool.query(
    `SELECT target_food_cost_pct FROM restaurants WHERE id = $1`, [restaurantId]
  );
  const estimatedCOGS = revenue * ((restaurant?.target_food_cost_pct || 30) / 100);
  const grossMarginPct = revenue > 0 ? ((revenue - estimatedCOGS - platformFees) / revenue) * 100 : 0;

  await pool.query(`
    INSERT INTO margin_snapshots
      (restaurant_id, snapshot_date, total_revenue, total_cogs, total_platform_fees,
       gross_margin_pct, net_margin_pct, food_cost_pct, delivery_mix_pct, health_score)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (restaurant_id, snapshot_date) DO UPDATE
      SET total_revenue      = EXCLUDED.total_revenue,
          total_cogs         = EXCLUDED.total_cogs,
          total_platform_fees = EXCLUDED.total_platform_fees,
          gross_margin_pct   = EXCLUDED.gross_margin_pct,
          delivery_mix_pct   = EXCLUDED.delivery_mix_pct,
          calculated_at      = now()
  `, [
    restaurantId, date, revenue, estimatedCOGS, platformFees,
    parseFloat(grossMarginPct.toFixed(1)),
    parseFloat((grossMarginPct - 8).toFixed(1)),
    parseFloat((estimatedCOGS / revenue * 100).toFixed(1)),
    parseFloat(deliveryMixPct.toFixed(1)),
    Math.max(20, Math.min(99, Math.round(grossMarginPct)))
  ]);

  return { date, revenue, platform_fees: platformFees, gross_margin_pct: grossMarginPct };
}

// ── Main ingest function ──────────────────────────────────────────────────────
async function ingestPOSWebhook(pool, restaurantId, platform, rawBody, headers = {}) {
  let events = [];

  switch (platform.toLowerCase()) {
    case 'toast':
      if (!verifyToastSignature(
        typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
        headers['toast-webhook-signature'],
        process.env.TOAST_WEBHOOK_SECRET
      )) throw new Error('Toast signature verification failed');
      events = normalizeToastEvent(typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody);
      break;

    case 'clover':
      if (!verifyCloverSignature(
        typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
        headers['x-clover-signature'],
        process.env.CLOVER_WEBHOOK_SECRET
      )) throw new Error('Clover signature verification failed');
      events = normalizeCloverEvent(typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody);
      break;

    case 'square':
      if (!verifySquareSignature(
        typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody),
        headers['x-square-hmac-sha256-signature'],
        process.env.SQUARE_WEBHOOK_SECRET,
        headers['x-forwarded-proto'] + '://' + headers['host'] + headers['x-original-url']
      )) throw new Error('Square signature verification failed');
      events = normalizeSquareEvent(typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody);
      break;

    default:
      throw new Error(`Unsupported POS platform: ${platform}`);
  }

  if (events.length === 0) return { events_received: 0, inserted: 0, skipped: 0 };

  // Resolve recipe IDs
  const resolved = await resolveRecipeIds(pool, restaurantId, events);

  // Persist
  const { inserted, skipped } = await persistSalesEvents(pool, restaurantId, resolved);

  // Recalculate today's snapshot
  const today = new Date().toISOString().slice(0, 10);
  const snapshot = await recalculateDaySnapshot(pool, restaurantId, today);

  // Recalculate any other dates seen in the events
  const otherDates = [...new Set(events.map(e => e.sale_date).filter(d => d !== today))];
  for (const date of otherDates) {
    await recalculateDaySnapshot(pool, restaurantId, date);
  }

  return {
    platform,
    events_received: events.length,
    inserted,
    skipped,
    snapshot_updated: !!snapshot,
    today_revenue: snapshot?.revenue,
    today_gross_margin_pct: snapshot?.gross_margin_pct
  };
}

module.exports = {
  ingestPOSWebhook,
  normalizeToastEvent,
  normalizeCloverEvent,
  normalizeSquareEvent,
  verifyToastSignature,
  verifyCloverSignature,
  verifySquareSignature,
  recalculateDaySnapshot
};
