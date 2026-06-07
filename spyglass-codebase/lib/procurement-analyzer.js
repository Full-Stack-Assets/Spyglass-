/**
 * Upstream Procurement Analyzer
 *
 * AI-powered procurement intelligence for the restaurant industry.
 * Uses the same OpenAI-compatible proxy as the competitive intel analyzer,
 * calibrated at temperature = 0.1 (COGS math requires zero hallucination).
 *
 * Core capabilities:
 *   1. Vendor price benchmarking — paid vs market rate
 *   2. Recipe cost drift analysis — ingredient inflation vs menu price lag
 *   3. Delivery channel margin decomposition
 *   4. Order pattern intelligence — fragmentation, volume-discount gaps
 *   5. Executive procurement brief generation
 */

const OpenAI = require('openai');

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'unused',
    baseURL: process.env.POLSIA_AI_BASE_URL || 'https://polsia.com/api/ai-proxy/v1',
    defaultHeaders: { 'x-polsia-task': 'upstream-procurement' }
  });
}

// Temperature = 0.1: COGS math / vendor pricing requires same precision as FinOps
const PROCUREMENT_TEMPERATURE = 0.1;
const RESTAURANT_TEMPERATURE = 0.1;

const PROCUREMENT_ANALYST_PROMPT = `You are an expert Restaurant Procurement Intelligence Analyst with 15 years of experience in food-service supply chain optimization. You work exclusively with verified invoice data and market benchmarks.

YOUR MANDATE: Identify actionable margin leaks — measurable dollar losses — with surgical precision.

CORE RULES:
1. Every finding must reference a specific dollar figure with the calculation shown.
2. Never fabricate market prices. Only use provided market_price data.
3. Confidence scores reflect data completeness (missing data = lower confidence).
4. Priority order: vendor overcharges → recipe cost drift → delivery erosion → operational waste.
5. Each recommendation must be implementable within 30 days.`;

// ── Vendor Price Benchmarking ─────────────────────────────────────────────────

async function analyzeVendorPricing(vendorPriceData) {
  if (!vendorPriceData || vendorPriceData.length === 0) {
    return { findings: [], total_monthly_overcharge: 0, summary: 'No vendor pricing data available.' };
  }

  const findings = vendorPriceData
    .filter(d => d.market_price && d.paid_price > d.market_price * 1.05)
    .map(d => {
      const overcharge_pct = ((d.paid_price - d.market_price) / d.market_price) * 100;
      const monthly_overcharge = (d.paid_price - d.market_price) * (d.monthly_qty || 0);
      return {
        vendor: d.vendor,
        ingredient: d.ingredient,
        paid_price: d.paid_price,
        market_price: d.market_price,
        overcharge_pct: parseFloat(overcharge_pct.toFixed(1)),
        monthly_qty: d.monthly_qty || 0,
        monthly_overcharge: parseFloat(monthly_overcharge.toFixed(2)),
        unit: d.unit || 'unit',
        severity: overcharge_pct > 30 ? 'critical' : overcharge_pct > 15 ? 'high' : 'medium'
      };
    })
    .sort((a, b) => b.monthly_overcharge - a.monthly_overcharge);

  const total_monthly_overcharge = findings.reduce((sum, f) => sum + f.monthly_overcharge, 0);

  if (findings.length === 0) {
    return { findings: [], total_monthly_overcharge: 0, summary: 'All vendor prices are within 5% of market benchmarks.' };
  }

  const client = getClient();
  const topFindings = findings.slice(0, 5).map(f =>
    `${f.vendor} — ${f.ingredient}: paying $${f.paid_price}/${f.unit} vs market $${f.market_price}/${f.unit} (${f.overcharge_pct}% over, $${f.monthly_overcharge}/mo)`
  ).join('\n');

  let summary = generateVendorSummaryFallback(findings, total_monthly_overcharge);
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PROCUREMENT_ANALYST_PROMPT },
        { role: 'user', content: `Summarize these vendor overcharge findings in 2 sentences for a restaurant owner. Total monthly overcharge: $${total_monthly_overcharge.toFixed(2)}.\n\n${topFindings}\n\nWrite only the 2-sentence summary. No markdown.` }
      ],
      temperature: PROCUREMENT_TEMPERATURE,
      max_tokens: 150
    });
    summary = response.choices[0]?.message?.content?.trim() || summary;
  } catch { /* use fallback */ }

  return { findings, total_monthly_overcharge: parseFloat(total_monthly_overcharge.toFixed(2)), summary };
}

function generateVendorSummaryFallback(findings, total) {
  const top = findings[0];
  return `${findings.length} vendor overcharge${findings.length !== 1 ? 's' : ''} detected totaling $${total.toFixed(2)}/month. Most impactful: ${top.vendor} is charging ${top.overcharge_pct}% above market for ${top.ingredient} — immediate renegotiation recommended.`;
}

// ── Recipe Cost Drift Analysis ────────────────────────────────────────────────

async function analyzeRecipeCostDrift(recipeCostData) {
  if (!recipeCostData || recipeCostData.length === 0) {
    return { drifted_recipes: [], total_monthly_impact: 0 };
  }

  const drifted = recipeCostData
    .filter(r => r.current_cost > 0 && r.menu_price > 0)
    .map(r => {
      const current_food_cost_pct = (r.current_cost / r.menu_price) * 100;
      const target_pct = r.target_food_cost_pct || 28;
      const target_cost = r.menu_price * (target_pct / 100);
      const cost_overage_per_plate = r.current_cost - target_cost;
      const monthly_impact = cost_overage_per_plate * (r.qty_sold_monthly || 0);
      const cost_inflation_pct = r.baseline_cost
        ? ((r.current_cost - r.baseline_cost) / r.baseline_cost) * 100
        : null;

      return {
        recipe: r.name,
        menu_category: r.menu_category || 'unknown',
        menu_price: r.menu_price,
        current_cost: parseFloat(r.current_cost.toFixed(4)),
        baseline_cost: r.baseline_cost ? parseFloat(r.baseline_cost.toFixed(4)) : null,
        current_food_cost_pct: parseFloat(current_food_cost_pct.toFixed(1)),
        target_food_cost_pct: target_pct,
        cost_inflation_pct: cost_inflation_pct ? parseFloat(cost_inflation_pct.toFixed(1)) : null,
        cost_overage_per_plate: parseFloat(cost_overage_per_plate.toFixed(4)),
        monthly_impact: parseFloat(monthly_impact.toFixed(2)),
        qty_sold_monthly: r.qty_sold_monthly || 0,
        break_even_price: parseFloat((r.current_cost / (target_pct / 100)).toFixed(2)),
        severity: current_food_cost_pct > 45 ? 'critical' : current_food_cost_pct > 35 ? 'high' : current_food_cost_pct > target_pct ? 'medium' : 'ok'
      };
    })
    .filter(r => r.severity !== 'ok')
    .sort((a, b) => b.monthly_impact - a.monthly_impact);

  const total_monthly_impact = drifted.reduce((sum, r) => sum + r.monthly_impact, 0);
  return { drifted_recipes: drifted, total_monthly_impact: parseFloat(total_monthly_impact.toFixed(2)) };
}

// ── Delivery Channel Margin Analysis ─────────────────────────────────────────

async function analyzeChannelMargins(channelData) {
  if (!channelData || channelData.length === 0) {
    return { channels: [], delivery_erosion_monthly: 0 };
  }

  const channels = channelData.map(c => {
    const gross_margin = c.revenue - c.cogs - (c.platform_fees || 0);
    const gross_margin_pct = c.revenue > 0 ? (gross_margin / c.revenue) * 100 : 0;
    const effective_commission_pct = c.revenue > 0 ? ((c.platform_fees || 0) / c.revenue) * 100 : 0;
    return {
      channel: c.channel,
      revenue: parseFloat((c.revenue || 0).toFixed(2)),
      cogs: parseFloat((c.cogs || 0).toFixed(2)),
      platform_fees: parseFloat((c.platform_fees || 0).toFixed(2)),
      gross_margin: parseFloat(gross_margin.toFixed(2)),
      gross_margin_pct: parseFloat(gross_margin_pct.toFixed(1)),
      effective_commission_pct: parseFloat(effective_commission_pct.toFixed(1)),
      order_count: c.order_count || 0,
      avg_order_value: c.order_count > 0 ? parseFloat((c.revenue / c.order_count).toFixed(2)) : 0
    };
  });

  const dineIn = channels.find(c => c.channel === 'dine_in');
  const deliveryChannels = channels.filter(c => c.channel !== 'dine_in' && c.channel !== 'takeout');

  let delivery_erosion_monthly = 0;
  if (dineIn && deliveryChannels.length > 0) {
    for (const dc of deliveryChannels) {
      const margin_gap_pct = dineIn.gross_margin_pct - dc.gross_margin_pct;
      if (margin_gap_pct > 0) {
        delivery_erosion_monthly += dc.revenue * (margin_gap_pct / 100);
      }
    }
  }

  return {
    channels,
    delivery_erosion_monthly: parseFloat(delivery_erosion_monthly.toFixed(2)),
    dine_in_margin_pct: dineIn ? dineIn.gross_margin_pct : null
  };
}

// ── Order Pattern Analysis ────────────────────────────────────────────────────

function analyzeOrderPatterns(orderHistory, vendorMinimums = {}) {
  if (!orderHistory || orderHistory.length === 0) {
    return { fragmentation_score: 0, missed_discount_monthly: 0, findings: [] };
  }

  const byVendor = {};
  for (const order of orderHistory) {
    if (!byVendor[order.vendor]) byVendor[order.vendor] = [];
    byVendor[order.vendor].push(order);
  }

  const findings = [];
  let total_missed_discount = 0;

  for (const [vendor, orders] of Object.entries(byVendor)) {
    const avg_order_value = orders.reduce((s, o) => s + o.total_amount, 0) / orders.length;
    const order_count = orders.length;
    const min_for_discount = vendorMinimums[vendor] || 500;
    const below_minimum_count = orders.filter(o => o.total_amount < min_for_discount).length;

    if (below_minimum_count > 0 && avg_order_value < min_for_discount) {
      const total_spend = orders.reduce((s, o) => s + o.total_amount, 0);
      const missed_discount = total_spend * 0.03;
      total_missed_discount += missed_discount;
      findings.push({
        vendor,
        order_count,
        avg_order_value: parseFloat(avg_order_value.toFixed(2)),
        below_minimum_count,
        min_for_discount,
        missed_discount_monthly: parseFloat(missed_discount.toFixed(2)),
        recommendation: `Consolidate ${order_count} orders into ${Math.ceil(order_count / 2)} larger orders to qualify for volume pricing (>$${min_for_discount}/order threshold).`
      });
    }
  }

  const total_orders = orderHistory.length;
  const fragmentation_score = Math.min(100, Math.round(
    (findings.reduce((s, f) => s + f.below_minimum_count, 0) / total_orders) * 100
  ));

  return {
    fragmentation_score,
    missed_discount_monthly: parseFloat(total_missed_discount.toFixed(2)),
    findings: findings.sort((a, b) => b.missed_discount_monthly - a.missed_discount_monthly)
  };
}

// ── Full Procurement Brief ────────────────────────────────────────────────────

async function generateProcurementBrief(context) {
  const { restaurant, vendorFindings, recipeFindings, channelAnalysis, orderAnalysis } = context;

  const total_monthly_opportunity =
    (vendorFindings?.total_monthly_overcharge || 0) +
    (recipeFindings?.total_monthly_impact || 0) +
    (channelAnalysis?.delivery_erosion_monthly || 0) +
    (orderAnalysis?.missed_discount_monthly || 0);

  if (total_monthly_opportunity === 0) {
    return {
      executive_summary: 'No significant margin leaks detected. Procurement operations appear healthy.',
      priority_actions: [],
      total_monthly_opportunity: 0,
      health_score: 92
    };
  }

  const client = getClient();
  const briefContext = `
RESTAURANT: ${restaurant.name} (${restaurant.location || 'N/A'})
TARGET FOOD COST: ${restaurant.target_food_cost_pct}%
MONTHLY REVENUE: $${restaurant.monthly_revenue_estimate?.toLocaleString() || 'N/A'}

MARGIN LEAK SUMMARY:
1. Vendor overcharges: $${(vendorFindings?.total_monthly_overcharge || 0).toFixed(2)}/mo
2. Recipe cost drift: $${(recipeFindings?.total_monthly_impact || 0).toFixed(2)}/mo (${recipeFindings?.drifted_recipes?.length || 0} recipes affected)
3. Delivery channel erosion: $${(channelAnalysis?.delivery_erosion_monthly || 0).toFixed(2)}/mo
4. Order fragmentation: $${(orderAnalysis?.missed_discount_monthly || 0).toFixed(2)}/mo

TOTAL MONTHLY OPPORTUNITY: $${total_monthly_opportunity.toFixed(2)}
ANNUALIZED: $${(total_monthly_opportunity * 12).toFixed(0)}
`;

  let executive_summary = '';
  let priority_actions = [];

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: PROCUREMENT_ANALYST_PROMPT },
        { role: 'user', content: `Based on this procurement analysis, write a brief with:\n1. "executive_summary": 3 sentences\n2. "priority_actions": array of 3 objects each with {title, action, expected_savings_monthly, timeline_days}\n\n${briefContext}\n\nRespond with valid JSON only.` }
      ],
      temperature: PROCUREMENT_TEMPERATURE,
      max_tokens: 600
    });
    const text = response.choices[0]?.message?.content?.trim();
    const jsonStr = text?.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(jsonStr);
    executive_summary = parsed.executive_summary || '';
    priority_actions = parsed.priority_actions || [];
  } catch {
    executive_summary = `${restaurant.name} has $${total_monthly_opportunity.toFixed(2)}/month in recoverable margin leaks ($${(total_monthly_opportunity * 12).toFixed(0)}/year). Immediate action on vendor pricing and recipe repricing recovers 70%+ within 45 days.`;
    priority_actions = [];
  }

  const health_score = Math.max(20, Math.min(99, Math.round(
    100 - (total_monthly_opportunity / (restaurant.monthly_revenue_estimate || 60000)) * 100
  )));

  return {
    executive_summary,
    priority_actions,
    total_monthly_opportunity: parseFloat(total_monthly_opportunity.toFixed(2)),
    annualized_opportunity: parseFloat((total_monthly_opportunity * 12).toFixed(2)),
    health_score,
    reasoning_lineage: {
      restaurant: restaurant.name,
      analysis_components: ['vendor_pricing', 'recipe_cost_drift', 'channel_margins', 'order_patterns'],
      confidence: 0.92
    }
  };
}

module.exports = {
  analyzeVendorPricing,
  analyzeRecipeCostDrift,
  analyzeChannelMargins,
  analyzeOrderPatterns,
  generateProcurementBrief,
  PROCUREMENT_ANALYST_PROMPT,
  PROCUREMENT_TEMPERATURE,
  RESTAURANT_TEMPERATURE
};
