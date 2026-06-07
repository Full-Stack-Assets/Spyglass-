/**
 * Upstream Recipe Costing Engine
 *
 * Calculates theoretical food cost per recipe using current ingredient prices.
 * Supports unit-of-measure conversion, yield factors, and waste coefficients.
 *
 * This is the "source of truth" for margin math — every alert and recommendation
 * traces back to a recipe cost calculation documented here.
 */

// ── Unit conversion: everything normalizes to oz (weight) or fl-oz (volume) ──

const UNIT_TO_OZ = {
  oz: 1, ounce: 1, ounces: 1,
  lb: 16, lbs: 16, pound: 16, pounds: 16,
  g: 0.035274, gram: 0.035274, grams: 0.035274,
  kg: 35.274, kilogram: 35.274,
  floz: 1, 'fl oz': 1,
  cup: 8, cups: 8,
  pint: 16, pints: 16,
  quart: 32, quarts: 32,
  gallon: 128, gallons: 128,
  liter: 33.814, liters: 33.814, l: 33.814,
  ml: 0.033814, milliliter: 0.033814,
  tbsp: 0.5, tablespoon: 0.5, tablespoons: 0.5,
  tsp: 0.1667, teaspoon: 0.1667, teaspoons: 0.1667,
  each: 1, ea: 1, piece: 1, pieces: 1,
  case: 24, cases: 24,
  bunch: 1, head: 1, clove: 1, sprig: 1
};

function convertUnit(qty, fromUnit, toUnit) {
  const from = (fromUnit || '').toLowerCase().trim();
  const to = (toUnit || '').toLowerCase().trim();
  if (from === to) return qty;
  const fromFactor = UNIT_TO_OZ[from];
  const toFactor = UNIT_TO_OZ[to];
  if (!fromFactor || !toFactor) return null;
  return (qty * fromFactor) / toFactor;
}

// ── Standard yield factors (usable portion / as-purchased weight) ─────────────

const DEFAULT_YIELD_FACTORS = {
  avocado: 0.72, lettuce: 0.80, onion: 0.88, tomato: 0.90, garlic: 0.87,
  broccoli: 0.81, cauliflower: 0.72, carrots: 0.82, celery: 0.83,
  mushrooms: 0.97, spinach: 0.92, kale: 0.85, peppers: 0.82, zucchini: 0.95,
  eggplant: 0.81, chicken_breast: 0.84, chicken_thigh: 0.76,
  beef_tenderloin: 0.80, beef_sirloin: 0.85, salmon: 0.90,
  shrimp: 0.68, pork_loin: 0.88, butter: 1.00, cheese: 0.98,
  cream: 1.00, eggs: 0.88
};

function getYieldFactor(ingredientName, override = null) {
  if (override !== null && override > 0) return override;
  const key = (ingredientName || '').toLowerCase().replace(/\s+/g, '_');
  for (const [k, v] of Object.entries(DEFAULT_YIELD_FACTORS)) {
    if (key.includes(k) || k.includes(key.split('_')[0])) return v;
  }
  return 1.00;
}

// ── Per-plate cost calculation ────────────────────────────────────────────────

function calculateRecipeCost(recipe, recipeIngredients) {
  const lines = [];
  let total_cost = 0;
  let has_missing_prices = false;

  for (const ri of recipeIngredients) {
    const yieldFactor = getYieldFactor(ri.ingredient?.name || '', ri.ingredient?.yield_factor);
    const wasteFactor = typeof ri.waste_factor === 'number' ? ri.waste_factor : 0.05;
    const unitPrice = ri.vendor_price ?? ri.ingredient?.current_market_price ?? null;

    if (unitPrice === null) {
      has_missing_prices = true;
      lines.push({
        ingredient: ri.ingredient?.name || 'Unknown', quantity: ri.quantity,
        unit: ri.unit, unit_price: null, yield_factor: yieldFactor,
        waste_factor: wasteFactor, line_cost: 0, note: 'price_missing'
      });
      continue;
    }

    const effective_qty = (ri.quantity / yieldFactor) * (1 + wasteFactor);
    const line_cost = effective_qty * unitPrice;
    total_cost += line_cost;

    lines.push({
      ingredient: ri.ingredient?.name || 'Unknown', quantity: ri.quantity, unit: ri.unit,
      unit_price: parseFloat(unitPrice.toFixed(4)), yield_factor: yieldFactor,
      waste_factor: wasteFactor, effective_qty: parseFloat(effective_qty.toFixed(4)),
      line_cost: parseFloat(line_cost.toFixed(4))
    });
  }

  const menu_price = parseFloat(recipe.menu_price);
  const target_pct = parseFloat(recipe.target_food_cost_pct || 28);
  const food_cost_pct = menu_price > 0 ? (total_cost / menu_price) * 100 : null;
  const target_cost = menu_price * (target_pct / 100);
  const cost_overage = total_cost - target_cost;
  const break_even_price = target_pct > 0 ? total_cost / (target_pct / 100) : null;

  return {
    recipe_id: recipe.id,
    recipe_name: recipe.name,
    menu_price,
    total_cost: parseFloat(total_cost.toFixed(4)),
    food_cost_pct: food_cost_pct !== null ? parseFloat(food_cost_pct.toFixed(2)) : null,
    target_food_cost_pct: target_pct,
    cost_overage_per_plate: parseFloat(cost_overage.toFixed(4)),
    break_even_price: break_even_price ? parseFloat(break_even_price.toFixed(2)) : null,
    is_over_target: food_cost_pct !== null && food_cost_pct > target_pct,
    has_missing_prices,
    ingredient_lines: lines
  };
}

// ── Bulk recipe cost calculation ─────────────────────────────────────────────

function calculateAllRecipeCosts(recipes) {
  const costs = recipes
    .map(r => calculateRecipeCost(r, r.ingredients || []))
    .sort((a, b) => (b.food_cost_pct || 0) - (a.food_cost_pct || 0));

  const over_target = costs.filter(c => c.is_over_target);
  const total_monthly_overage = over_target.reduce(
    (sum, c) => sum + (c.cost_overage_per_plate * (c.qty_sold_monthly || 0)), 0
  );
  const validCosts = costs.filter(c => c.food_cost_pct !== null);
  const avg_food_cost_pct = validCosts.length > 0
    ? validCosts.reduce((s, c) => s + c.food_cost_pct, 0) / validCosts.length
    : 0;

  return {
    recipe_costs: costs,
    summary: {
      total_recipes: costs.length,
      over_target_count: over_target.length,
      avg_food_cost_pct: parseFloat(avg_food_cost_pct.toFixed(1)),
      total_monthly_overage: parseFloat(total_monthly_overage.toFixed(2)),
      worst_offender: over_target[0]?.recipe_name || null
    }
  };
}

// ── Menu Engineering Matrix ───────────────────────────────────────────────────
// Stars: high margin × high volume | Plows: high volume × low margin
// Puzzles: high margin × low volume | Dogs: low margin × low volume

function runMenuEngineering(items) {
  if (items.length === 0) return [];

  const withMetrics = items.map(item => ({
    ...item,
    contribution_margin: item.menu_price - item.food_cost,
    revenue_contribution: (item.menu_price - item.food_cost) * item.qty_sold_monthly
  }));

  const avgVolume = withMetrics.reduce((s, i) => s + i.qty_sold_monthly, 0) / withMetrics.length;
  const avgMargin = withMetrics.reduce((s, i) => s + i.contribution_margin, 0) / withMetrics.length;

  return withMetrics.map(item => {
    const highVolume = item.qty_sold_monthly >= avgVolume;
    const highMargin = item.contribution_margin >= avgMargin;
    const quadrant =
      highMargin && highVolume ? 'star' :
      highMargin && !highVolume ? 'puzzle' :
      !highMargin && highVolume ? 'plow' : 'dog';

    const recommendation =
      quadrant === 'star'   ? 'Feature prominently. High-margin driver — protect.' :
      quadrant === 'puzzle' ? 'Market more aggressively. High margin but underexposed.' :
      quadrant === 'plow'   ? `Reprice to $${(item.menu_price * 1.12).toFixed(2)} or reduce cost target.` :
      'Candidate for removal or radical re-engineering.';

    return {
      ...item, quadrant, recommendation,
      contribution_margin: parseFloat(item.contribution_margin.toFixed(2)),
      revenue_contribution: parseFloat(item.revenue_contribution.toFixed(2))
    };
  }).sort((a, b) => b.revenue_contribution - a.revenue_contribution);
}

// ── Break-even & repricing analysis ──────────────────────────────────────────

function analyzeMenuRepricing(food_cost, target_food_cost_pct, current_price) {
  const break_even = food_cost / (target_food_cost_pct / 100);
  const suggested_prices = [0.25, 0.50, 1.00, 2.00].map(increment => {
    const price = Math.ceil(break_even / increment) * increment;
    return {
      price,
      food_cost_pct: parseFloat(((food_cost / price) * 100).toFixed(1)),
      price_increase: parseFloat((price - current_price).toFixed(2)),
      increase_pct: parseFloat(((price - current_price) / current_price * 100).toFixed(1))
    };
  });

  return {
    current_price, food_cost,
    break_even_price: parseFloat(break_even.toFixed(2)),
    current_food_cost_pct: parseFloat((food_cost / current_price * 100).toFixed(1)),
    target_food_cost_pct,
    suggested_prices: suggested_prices.filter(s => s.price >= break_even)
  };
}

module.exports = {
  calculateRecipeCost,
  calculateAllRecipeCosts,
  runMenuEngineering,
  analyzeMenuRepricing,
  convertUnit,
  getYieldFactor,
  UNIT_TO_OZ,
  DEFAULT_YIELD_FACTORS
};
