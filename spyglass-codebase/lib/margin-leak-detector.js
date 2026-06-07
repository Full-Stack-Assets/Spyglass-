/**
 * Upstream Margin-Leak Detector
 *
 * Autonomous, scheduled detection engine that continuously monitors restaurant
 * data for margin leaks and writes margin_alerts to the database.
 *
 * Leak types detected:
 *   vendor_overcharge    paying above market benchmark by >5%
 *   recipe_cost_drift    food cost % exceeds target (ingredient inflation, stale price)
 *   delivery_erosion     delivery channel margin < dine-in margin by >15pp
 *   order_inefficiency   fragmented orders missing volume-discount thresholds
 *   portion_variance     actual COGS reconciliation vs theoretical recipe cost
 *   single_vendor_risk   >70% of category spend with one vendor
 */

const {
  analyzeVendorPricing,
  analyzeRecipeCostDrift,
  analyzeChannelMargins,
  analyzeOrderPatterns
} = require('./procurement-analyzer');

const THRESHOLDS = {
  vendor_overcharge:  { critical: 30, high: 15, medium: 5 },
  recipe_cost_drift:  { critical: 45, high: 35 },
  delivery_erosion:   { high: 20, medium: 12 },
  order_inefficiency: { high: 0.3, medium: 0.15 },
  portion_variance:   { high: 15, medium: 8 },
  single_vendor_risk: { high: 0.85, medium: 0.70 }
};

// ── Main detector ─────────────────────────────────────────────────────────────

async function detectMarginLeaks(pool, restaurantId) {
  const client = await pool.connect();
  try {
    const { rows: [restaurant] } = await client.query(
      `SELECT * FROM restaurants WHERE id = $1`, [restaurantId]
    );
    if (!restaurant) throw new Error(`Restaurant ${restaurantId} not found`);

    const [vendorAlerts, recipeAlerts, deliveryAlerts, orderAlerts, portionAlerts, concentrationAlerts] =
      await Promise.all([
        detectVendorOvercharges(client, restaurant),
        detectRecipeCostDrift(client, restaurant),
        detectDeliveryErosion(client, restaurant),
        detectOrderInefficiency(client, restaurant),
        detectPortionVariance(client, restaurant),
        detectVendorConcentrationRisk(client, restaurant)
      ]);

    const alerts = [
      ...vendorAlerts, ...recipeAlerts, ...deliveryAlerts,
      ...orderAlerts, ...portionAlerts, ...concentrationAlerts
    ];

    let alerts_created = 0;
    let alerts_updated = 0;
    let total_monthly_impact = 0;

    for (const alert of alerts) {
      total_monthly_impact += alert.financial_impact_monthly || 0;

      const { rows: [existing] } = await client.query(
        `SELECT id FROM margin_alerts
         WHERE restaurant_id = $1 AND alert_type = $2 AND affected_item = $3 AND status = 'active'
         LIMIT 1`,
        [restaurantId, alert.alert_type, alert.affected_item || null]
      );

      if (existing) {
        await client.query(
          `UPDATE margin_alerts
           SET title = $1, description = $2, financial_impact_monthly = $3,
               confidence_score = $4, ai_recommendation = $5,
               reasoning_lineage = $6, severity = $7, detected_at = now()
           WHERE id = $8`,
          [alert.title, alert.description, alert.financial_impact_monthly,
           alert.confidence_score, alert.ai_recommendation,
           JSON.stringify(alert.reasoning_lineage), alert.severity, existing.id]
        );
        alerts_updated++;
      } else {
        await client.query(
          `INSERT INTO margin_alerts
             (restaurant_id, alert_type, severity, title, description, affected_item,
              financial_impact_monthly, confidence_score, ai_recommendation, reasoning_lineage)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [restaurantId, alert.alert_type, alert.severity, alert.title, alert.description,
           alert.affected_item || null, alert.financial_impact_monthly, alert.confidence_score,
           alert.ai_recommendation || null, JSON.stringify(alert.reasoning_lineage || {})]
        );
        alerts_created++;
      }
    }

    const health_score = calculateHealthScore(alerts, restaurant);
    await upsertMarginSnapshot(client, restaurant, alerts, health_score);

    return { restaurant: restaurant.name, alerts_created, alerts_updated, total_alerts: alerts.length, total_monthly_impact: parseFloat(total_monthly_impact.toFixed(2)), annualized_impact: parseFloat((total_monthly_impact * 12).toFixed(2)), health_score };
  } finally {
    client.release();
  }
}

// ── Vendor Overcharges ────────────────────────────────────────────────────────

async function detectVendorOvercharges(client, restaurant) {
  const { rows } = await client.query(`
    SELECT
      v.name                         AS vendor,
      i.name                         AS ingredient,
      i.unit,
      i.current_market_price         AS market_price,
      vp.price_per_unit              AS paid_price,
      COALESCE(
        (SELECT SUM(poi.quantity)
         FROM purchase_order_items poi
         JOIN purchase_orders po ON po.id = poi.purchase_order_id
         WHERE poi.ingredient_id = i.id AND po.restaurant_id = $1
           AND po.order_date >= CURRENT_DATE - INTERVAL '30 days'), 0
      ) AS monthly_qty
    FROM vendor_prices vp
    JOIN vendors v     ON v.id = vp.vendor_id
    JOIN ingredients i ON i.id = vp.ingredient_id
    WHERE v.restaurant_id = $1
      AND i.current_market_price IS NOT NULL AND i.current_market_price > 0
      AND vp.effective_date = (
        SELECT MAX(vp2.effective_date) FROM vendor_prices vp2
        WHERE vp2.vendor_id = vp.vendor_id AND vp2.ingredient_id = vp.ingredient_id
      )
  `, [restaurant.id]);

  if (rows.length === 0) return [];

  const { findings } = await analyzeVendorPricing(rows.map(r => ({
    vendor: r.vendor, ingredient: r.ingredient, unit: r.unit,
    paid_price: parseFloat(r.paid_price), market_price: parseFloat(r.market_price),
    monthly_qty: parseFloat(r.monthly_qty)
  })));

  return findings.map(f => ({
    alert_type: 'vendor_overcharge',
    severity: f.severity,
    title: `${f.vendor} overcharging on ${f.ingredient} (+${f.overcharge_pct}% above market)`,
    description: `You are paying $${f.paid_price}/${f.unit} for ${f.ingredient} from ${f.vendor}, while the current market benchmark is $${f.market_price}/${f.unit} — a ${f.overcharge_pct}% premium. At ${f.monthly_qty} ${f.unit}s/month, this costs an extra $${f.monthly_overcharge.toFixed(2)}/month.`,
    affected_item: `${f.ingredient} (${f.vendor})`,
    financial_impact_monthly: f.monthly_overcharge,
    confidence_score: 0.94,
    ai_recommendation: `Request an immediate price review with ${f.vendor}. Reference market price $${f.market_price}/${f.unit}. If they cannot match within 10%, solicit quotes from alternative suppliers.`,
    reasoning_lineage: {
      alert_type: 'vendor_overcharge',
      data_source: 'vendor_prices + ingredient market benchmarks',
      calculation: `($${f.paid_price} - $${f.market_price}) × ${f.monthly_qty} ${f.unit}s = $${f.monthly_overcharge.toFixed(2)}/mo`,
      overcharge_pct: f.overcharge_pct
    }
  }));
}

// ── Recipe Cost Drift ─────────────────────────────────────────────────────────

async function detectRecipeCostDrift(client, restaurant) {
  const targetPct = restaurant.target_food_cost_pct || 28;

  const { rows } = await client.query(`
    SELECT
      r.id, r.name, r.menu_category, r.menu_price, r.target_food_cost_pct,
      COALESCE(
        SUM(ri.quantity * (1 + ri.waste_factor)
          * COALESCE(
              (SELECT vp.price_per_unit FROM vendor_prices vp
               JOIN vendors v ON v.id = vp.vendor_id
               WHERE vp.ingredient_id = ri.ingredient_id AND v.restaurant_id = $1
               ORDER BY vp.effective_date DESC LIMIT 1),
              i.current_market_price, 0
          )
        ), 0
      ) AS current_cost,
      COALESCE(
        (SELECT SUM(sd.quantity_sold) FROM sales_data sd
         WHERE sd.recipe_id = r.id AND sd.sale_date >= CURRENT_DATE - INTERVAL '30 days'), 0
      ) AS qty_sold_monthly
    FROM recipes r
    JOIN recipe_ingredients ri ON ri.recipe_id = r.id
    JOIN ingredients i         ON i.id = ri.ingredient_id
    WHERE r.restaurant_id = $1 AND r.active = true
    GROUP BY r.id, r.name, r.menu_category, r.menu_price, r.target_food_cost_pct
  `, [restaurant.id]);

  if (rows.length === 0) return [];

  const { drifted_recipes } = await analyzeRecipeCostDrift(rows.map(r => ({
    name: r.name, menu_category: r.menu_category, menu_price: parseFloat(r.menu_price),
    current_cost: parseFloat(r.current_cost), baseline_cost: null,
    target_food_cost_pct: parseFloat(r.target_food_cost_pct || targetPct),
    qty_sold_monthly: parseInt(r.qty_sold_monthly)
  })));

  return drifted_recipes.map(r => ({
    alert_type: 'recipe_cost_drift',
    severity: r.severity,
    title: `"${r.recipe}" food cost at ${r.current_food_cost_pct}% — ${(r.current_food_cost_pct - r.target_food_cost_pct).toFixed(1)}pp above target`,
    description: `"${r.recipe}" currently costs $${r.current_cost.toFixed(2)} to make but sells for $${r.menu_price}, yielding ${r.current_food_cost_pct}% food cost vs your ${r.target_food_cost_pct}% target. At ${r.qty_sold_monthly} plates/month, excess food cost is $${r.monthly_impact.toFixed(2)}/month.`,
    affected_item: r.recipe,
    financial_impact_monthly: r.monthly_impact,
    confidence_score: 0.91,
    ai_recommendation: `Option A: Reprice "${r.recipe}" to $${r.break_even_price}. Option B: Re-engineer the recipe to reduce per-plate cost below $${(r.menu_price * r.target_food_cost_pct / 100).toFixed(2)}.`,
    reasoning_lineage: {
      alert_type: 'recipe_cost_drift',
      recipe: r.recipe, current_food_cost_pct: r.current_food_cost_pct,
      target_food_cost_pct: r.target_food_cost_pct,
      calculation: `($${r.current_cost.toFixed(2)} / $${r.menu_price}) × 100 = ${r.current_food_cost_pct}% food cost`
    }
  }));
}

// ── Delivery Erosion ──────────────────────────────────────────────────────────

async function detectDeliveryErosion(client, restaurant) {
  const { rows } = await client.query(`
    SELECT channel,
      SUM(sale_price * quantity_sold)                         AS revenue,
      SUM(platform_commission_pct / 100.0 * sale_price * quantity_sold) AS platform_fees,
      COUNT(*) AS order_count
    FROM sales_data
    WHERE restaurant_id = $1 AND sale_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY channel
  `, [restaurant.id]);

  if (rows.length === 0) return [];

  const foodCostPct = (restaurant.target_food_cost_pct || 28) / 100;
  const channelData = rows.map(r => ({
    channel: r.channel, revenue: parseFloat(r.revenue),
    cogs: parseFloat(r.revenue) * foodCostPct,
    platform_fees: parseFloat(r.platform_fees), order_count: parseInt(r.order_count)
  }));

  const { channels, delivery_erosion_monthly, dine_in_margin_pct } = await analyzeChannelMargins(channelData);
  if (delivery_erosion_monthly < 50) return [];

  const deliveryChannels = channels.filter(c => c.channel !== 'dine_in' && c.channel !== 'takeout');
  const worstChannel = deliveryChannels.sort((a, b) => a.gross_margin_pct - b.gross_margin_pct)[0];
  if (!worstChannel) return [];

  return [{
    alert_type: 'delivery_erosion',
    severity: delivery_erosion_monthly > 3000 ? 'high' : 'medium',
    title: `Delivery eroding ${(dine_in_margin_pct - worstChannel.gross_margin_pct).toFixed(1)}pp vs dine-in margin`,
    description: `Your dine-in margin is ${dine_in_margin_pct?.toFixed(1)}%, but ${worstChannel.channel.replace('delivery_', '').replace('_', ' ')} orders yield only ${worstChannel.gross_margin_pct.toFixed(1)}% after ${worstChannel.effective_commission_pct.toFixed(1)}% commission. This gap costs $${delivery_erosion_monthly.toFixed(2)}/month.`,
    affected_item: worstChannel.channel,
    financial_impact_monthly: delivery_erosion_monthly,
    confidence_score: 0.88,
    ai_recommendation: `Implement delivery-specific menu pricing: raise delivery prices 15-20% to offset platform commissions. Most customers accept higher prices on delivery apps. Negotiate commission rates — higher volume tiers often unlock lower percentages.`,
    reasoning_lineage: {
      alert_type: 'delivery_erosion', dine_in_margin_pct,
      delivery_margin_pct: worstChannel.gross_margin_pct,
      calculation: `Delivery revenue × margin gap% = $${delivery_erosion_monthly.toFixed(2)}/mo`
    }
  }];
}

// ── Order Inefficiency ────────────────────────────────────────────────────────

async function detectOrderInefficiency(client, restaurant) {
  const { rows } = await client.query(`
    SELECT v.name AS vendor, po.total_amount, po.order_date
    FROM purchase_orders po
    JOIN vendors v ON v.id = po.vendor_id
    WHERE po.restaurant_id = $1
      AND po.order_date >= CURRENT_DATE - INTERVAL '30 days'
      AND po.status = 'delivered'
    ORDER BY po.order_date DESC
  `, [restaurant.id]);

  if (rows.length < 3) return [];

  const { fragmentation_score, missed_discount_monthly, findings } = analyzeOrderPatterns(
    rows.map(r => ({ vendor: r.vendor, order_date: r.order_date, total_amount: parseFloat(r.total_amount || 0) }))
  );

  if (missed_discount_monthly < 50) return [];

  return findings.map(f => ({
    alert_type: 'order_inefficiency',
    severity: f.missed_discount_monthly > 300 ? 'high' : 'medium',
    title: `Order fragmentation with ${f.vendor} — ${f.below_minimum_count} small orders missing volume discount`,
    description: `In the last 30 days you placed ${f.order_count} orders with ${f.vendor} averaging $${f.avg_order_value.toFixed(2)} each — below the $${f.min_for_discount} threshold for volume pricing. Consolidating would save ~$${f.missed_discount_monthly.toFixed(2)}/month.`,
    affected_item: f.vendor,
    financial_impact_monthly: f.missed_discount_monthly,
    confidence_score: 0.82,
    ai_recommendation: f.recommendation,
    reasoning_lineage: {
      alert_type: 'order_inefficiency', vendor: f.vendor, order_count: f.order_count,
      avg_order_value: f.avg_order_value, fragmentation_score,
      calculation: `Total spend × 3% volume discount = $${f.missed_discount_monthly.toFixed(2)}/mo`
    }
  }));
}

// ── Portion Variance ──────────────────────────────────────────────────────────

async function detectPortionVariance(client, restaurant) {
  const { rows: theoretical } = await client.query(`
    SELECT SUM(
      sd.quantity_sold
      * (SELECT COALESCE(SUM(ri.quantity * (1 + ri.waste_factor) * COALESCE(i.current_market_price, 0)), 0)
         FROM recipe_ingredients ri JOIN ingredients i ON i.id = ri.ingredient_id WHERE ri.recipe_id = sd.recipe_id)
    ) AS theoretical_cogs
    FROM sales_data sd
    WHERE sd.restaurant_id = $1 AND sd.sale_date >= CURRENT_DATE - INTERVAL '30 days'
  `, [restaurant.id]);

  const { rows: actual } = await client.query(`
    SELECT SUM(poi.quantity * poi.unit_price) AS actual_cogs
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    WHERE po.restaurant_id = $1 AND po.order_date >= CURRENT_DATE - INTERVAL '30 days' AND po.status = 'delivered'
  `, [restaurant.id]);

  const theoreticalCogs = parseFloat(theoretical[0]?.theoretical_cogs || 0);
  const actualCogs = parseFloat(actual[0]?.actual_cogs || 0);

  if (theoreticalCogs === 0 || actualCogs === 0) return [];

  const variance_pct = ((actualCogs - theoreticalCogs) / theoreticalCogs) * 100;
  if (variance_pct < THRESHOLDS.portion_variance.medium) return [];

  const variance_dollar = actualCogs - theoreticalCogs;

  return [{
    alert_type: 'portion_variance',
    severity: variance_pct > THRESHOLDS.portion_variance.high ? 'high' : 'medium',
    title: `Actual COGS is ${variance_pct.toFixed(1)}% above theoretical — possible over-portioning or waste`,
    description: `Recipes say COGS should be $${theoreticalCogs.toFixed(2)}/month, but invoices show $${actualCogs.toFixed(2)}/month — a $${variance_dollar.toFixed(2)} gap. This indicates over-portioning, spoilage, or unauthorized prep waste.`,
    affected_item: 'kitchen operations',
    financial_impact_monthly: parseFloat(variance_dollar.toFixed(2)),
    confidence_score: 0.78,
    ai_recommendation: `Conduct a portion-weight audit on your top 5 highest-volume dishes. Weigh actual portions vs recipe spec for 3 consecutive services.`,
    reasoning_lineage: {
      alert_type: 'portion_variance',
      theoretical_cogs: theoreticalCogs, actual_cogs: actualCogs,
      variance_pct: parseFloat(variance_pct.toFixed(1)),
      calculation: `$${actualCogs.toFixed(2)} actual - $${theoreticalCogs.toFixed(2)} theoretical = $${variance_dollar.toFixed(2)}/mo`
    }
  }];
}

// ── Vendor Concentration Risk ─────────────────────────────────────────────────

async function detectVendorConcentrationRisk(client, restaurant) {
  const { rows } = await client.query(`
    SELECT v.category, v.name AS vendor, SUM(poi.quantity * poi.unit_price) AS spend
    FROM purchase_order_items poi
    JOIN purchase_orders po ON po.id = poi.purchase_order_id
    JOIN vendors v          ON v.id  = po.vendor_id
    WHERE po.restaurant_id = $1
      AND po.order_date >= CURRENT_DATE - INTERVAL '30 days' AND po.status = 'delivered'
    GROUP BY v.category, v.name ORDER BY v.category, spend DESC
  `, [restaurant.id]);

  if (rows.length === 0) return [];

  const byCategory = {};
  for (const row of rows) {
    if (!byCategory[row.category]) byCategory[row.category] = [];
    byCategory[row.category].push({ vendor: row.vendor, spend: parseFloat(row.spend) });
  }

  const alerts = [];
  for (const [category, vendors] of Object.entries(byCategory)) {
    const totalSpend = vendors.reduce((s, v) => s + v.spend, 0);
    const topVendor = vendors[0];
    const concentration = topVendor.spend / totalSpend;

    if (concentration >= THRESHOLDS.single_vendor_risk.high) {
      alerts.push({
        alert_type: 'single_vendor_risk',
        severity: 'medium',
        title: `${topVendor.vendor} holds ${(concentration * 100).toFixed(0)}% of ${category} spend — pricing monopoly risk`,
        description: `${topVendor.vendor} accounts for $${topVendor.spend.toFixed(2)} (${(concentration * 100).toFixed(0)}%) of your ${category} spend. Single-vendor dependency removes negotiating leverage and creates supply chain risk.`,
        affected_item: `${category} (${topVendor.vendor})`,
        financial_impact_monthly: totalSpend * 0.05,
        confidence_score: 0.85,
        ai_recommendation: `Qualify at least one alternative ${category} supplier. Splitting 20% of spend with a second vendor signals price competition and typically yields a 5-8% reduction from the incumbent.`,
        reasoning_lineage: {
          alert_type: 'single_vendor_risk', category, vendor: topVendor.vendor,
          concentration_pct: parseFloat((concentration * 100).toFixed(1)),
          total_category_spend: totalSpend
        }
      });
    }
  }
  return alerts;
}

// ── Health Score ──────────────────────────────────────────────────────────────

function calculateHealthScore(alerts, restaurant) {
  const revenue = restaurant.monthly_revenue_estimate || 60000;
  const totalImpact = alerts.reduce((s, a) => s + (a.financial_impact_monthly || 0), 0);
  let score = 100;
  score -= (totalImpact / revenue) * 100 * 1.5;
  score -= alerts.filter(a => a.severity === 'critical').length * 15;
  score -= alerts.filter(a => a.severity === 'high').length * 8;
  score -= alerts.filter(a => a.severity === 'medium').length * 3;
  return Math.max(10, Math.min(99, Math.round(score)));
}

async function upsertMarginSnapshot(client, restaurant, alerts, health_score) {
  const today = new Date().toISOString().split('T')[0];
  const totalImpact = alerts.reduce((s, a) => s + (a.financial_impact_monthly || 0), 0);
  await client.query(`
    INSERT INTO margin_snapshots (restaurant_id, snapshot_date, health_score, metadata)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (restaurant_id, snapshot_date) DO UPDATE
      SET health_score = EXCLUDED.health_score, metadata = EXCLUDED.metadata, calculated_at = now()
  `, [restaurant.id, today, health_score,
      JSON.stringify({ alerts_count: alerts.length, total_monthly_impact: totalImpact })]);
}

// ── Batch runner ──────────────────────────────────────────────────────────────

async function detectAllRestaurants(pool) {
  const { rows: restaurants } = await pool.query(`SELECT id, name FROM restaurants ORDER BY created_at ASC`);
  const results = [];
  for (const r of restaurants) {
    try {
      const result = await detectMarginLeaks(pool, r.id);
      results.push({ ...result, success: true });
      console.log(`[MarginDetector] ${r.name}: ${result.total_alerts} alerts, $${result.total_monthly_impact}/mo`);
    } catch (err) {
      console.error(`[MarginDetector] Failed for ${r.name}:`, err.message);
      results.push({ restaurant: r.name, success: false, error: err.message });
    }
  }
  return results;
}

module.exports = { detectMarginLeaks, detectAllRestaurants, calculateHealthScore, THRESHOLDS };
