/**
 * Demo Data Seeder — Harvest & Co. Restaurant Group
 *
 * Creates a compelling demo scenario for the Upstream procurement intelligence
 * platform. Designed to showcase the system's value to Toast, DoorDash, and Clover
 * in an acquisition context.
 *
 * Demo scenario:
 *   Restaurant: Harvest & Co. — fast-casual farm-to-table, 3 Austin TX locations
 *   Monthly revenue: $182,000 | Target food cost: 28% | Actual: 34.2%
 *
 * Active margin leaks (4 total = $7,820/month | $93,840/year):
 *   1. CRITICAL  Vendor overcharge: Sysco produce +54% above market        $1,240/mo
 *   2. HIGH      Recipe cost drift: Avocado Toast at 41.4% food cost       $2,100/mo
 *   3. HIGH      Delivery erosion: DoorDash 8.2% net vs 26.4% dine-in     $3,800/mo
 *   4. MEDIUM    Order fragmentation: 47 orders, missing volume discount   $  680/mo
 *
 * Vendor benchmarking shows 3 viable alternatives to Sysco for produce.
 * Menu engineering reveals 2 "Stars", 3 "Plows", and 1 "Dog" on the menu.
 */

const crypto = require('crypto');

async function seedRestaurantDemoData(pool, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Ensure demo org exists ─────────────────────────────────────────────
    const orgSlug = 'harvest-co-demo';
    let orgId;
    const { rows: [existingOrg] } = await client.query(
      `SELECT id FROM organizations WHERE slug = $1`, [orgSlug]
    );
    if (existingOrg) {
      orgId = existingOrg.id;
      // Clean up existing demo restaurant data
      await client.query(
        `DELETE FROM restaurants WHERE slug = 'harvest-and-co' AND org_id = $1`, [orgId]
      );
    } else {
      const { rows: [newOrg] } = await client.query(`
        INSERT INTO organizations (name, slug, plan_tier)
        VALUES ('Harvest & Co. Restaurant Group', $1, 'pro')
        RETURNING id
      `, [orgSlug]);
      orgId = newOrg.id;
    }

    // ── 2. Restaurant profile ─────────────────────────────────────────────────
    const { rows: [restaurant] } = await client.query(`
      INSERT INTO restaurants
        (org_id, name, slug, cuisine_type, location, monthly_revenue_estimate,
         target_food_cost_pct, pos_system, delivery_platforms, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      orgId,
      'Harvest & Co.',
      'harvest-and-co',
      'Farm-to-Table American',
      'Austin, TX (3 locations: South Congress, Domain, East 6th)',
      182000.00,
      28.0,
      'toast',
      '{doordash,ubereats}',
      JSON.stringify({
        founded: 2019,
        locations: 3,
        avg_check: 22.50,
        seats_per_location: 68,
        weekly_covers: 1200,
        demo: true,
        demo_user_id: userId
      })
    ]);
    const restaurantId = restaurant.id;

    // ── 3. Vendors ────────────────────────────────────────────────────────────
    const vendors = await insertVendors(client, restaurantId);

    // ── 4. Ingredients with market benchmarks ────────────────────────────────
    const ingredients = await insertIngredients(client, restaurantId);

    // ── 5. Vendor prices (what Harvest & Co. actually pays) ───────────────────
    await insertVendorPrices(client, vendors, ingredients);

    // ── 6. Recipes ────────────────────────────────────────────────────────────
    const recipes = await insertRecipes(client, restaurantId);

    // ── 7. Recipe ingredients (composition) ───────────────────────────────────
    await insertRecipeIngredients(client, recipes, ingredients);

    // ── 8. Purchase orders (last 30 days — fragmented ordering pattern) ───────
    const orders = await insertPurchaseOrders(client, restaurantId, vendors);

    // ── 9. Sales data (last 30 days — mixed channels showing delivery erosion) ─
    await insertSalesData(client, restaurantId, recipes);

    // ── 10. Pre-seeded margin alerts (the "aha moment" findings) ──────────────
    await insertMarginAlerts(client, restaurantId, vendors, ingredients, recipes);

    // ── 11. Pre-seeded AI recommendations ────────────────────────────────────
    await insertRecommendations(client, restaurantId);

    // ── 12. Margin snapshot (current health score) ────────────────────────────
    await client.query(`
      INSERT INTO margin_snapshots
        (restaurant_id, snapshot_date, total_revenue, total_cogs, total_platform_fees,
         gross_margin_pct, net_margin_pct, food_cost_pct, delivery_mix_pct, health_score, metadata)
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (restaurant_id, snapshot_date) DO UPDATE
        SET health_score = EXCLUDED.health_score, calculated_at = now()
    `, [
      restaurantId,
      182000.00,  // total_revenue
      62244.00,   // total_cogs (34.2% food cost)
      16380.00,   // total_platform_fees (delivery commissions)
      31.2,       // gross_margin_pct
      22.4,       // net_margin_pct (after platform fees)
      34.2,       // food_cost_pct
      38.0,       // delivery_mix_pct
      54,         // health_score (poor — lots of leaks)
      JSON.stringify({
        alerts_count: 4,
        total_monthly_impact: 7820,
        annualized_impact: 93840,
        demo: true
      })
    ]);

    // ── 13. Price history (30-day trend showing avocado price spike) ──────────
    await insertPriceHistory(client, ingredients);

    await client.query('COMMIT');
    console.log(`[Demo-Seed-Restaurant] Harvest & Co. seeded successfully. restaurantId=${restaurantId}`);
    return { restaurantId, orgId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Vendor data ───────────────────────────────────────────────────────────────

async function insertVendors(client, restaurantId) {
  const vendorDefs = [
    {
      key: 'sysco',
      name: 'Sysco Austin', category: 'produce',
      payment_terms: 'net21', lead_time_days: 2,
      minimum_order_value: 250, reliability_score: 0.93,
      rep_name: 'Mark Delgado', rep_email: 'mdelgado@sysco.com',
      metadata: { primary_produce_vendor: true, contract_expiry: '2025-12-31' }
    },
    {
      key: 'usfoods',
      name: 'US Foods Central TX', category: 'produce',
      payment_terms: 'net30', lead_time_days: 3,
      minimum_order_value: 300, reliability_score: 0.91,
      rep_name: 'Lisa Chen', rep_email: 'lchen@usfoods.com',
      metadata: { benchmark_vendor: true }
    },
    {
      key: 'gordon',
      name: 'Gordon Food Service', category: 'produce',
      payment_terms: 'net30', lead_time_days: 2,
      minimum_order_value: 200, reliability_score: 0.95,
      rep_name: 'Tommy Reeves', rep_email: 'treeves@gfs.com',
      metadata: { benchmark_vendor: true }
    },
    {
      key: 'hill_country_meats',
      name: 'Hill Country Meats', category: 'meat',
      payment_terms: 'net14', lead_time_days: 1,
      minimum_order_value: 400, reliability_score: 0.97,
      rep_name: 'Roy Barker', rep_email: 'roy@hillcountrymeats.com',
      metadata: { local_vendor: true, grass_fed: true }
    },
    {
      key: 'lone_star_dairy',
      name: 'Lone Star Dairy Co.', category: 'dairy',
      payment_terms: 'net21', lead_time_days: 2,
      minimum_order_value: 150, reliability_score: 0.96,
      rep_name: 'Pam Nguyen', rep_email: 'pnguyen@lonestardairy.com',
      metadata: { local_vendor: true }
    },
    {
      key: 'aztex_dry',
      name: 'AzTex Dry Goods', category: 'dry_goods',
      payment_terms: 'net30', lead_time_days: 3,
      minimum_order_value: 100, reliability_score: 0.90,
      rep_name: 'Carlos Vega', rep_email: 'cvega@aztexdry.com',
      metadata: {}
    }
  ];

  const inserted = {};
  for (const v of vendorDefs) {
    const { rows: [row] } = await client.query(`
      INSERT INTO vendors
        (restaurant_id, name, category, payment_terms, lead_time_days,
         minimum_order_value, reliability_score, rep_name, rep_email, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `, [
      restaurantId, v.name, v.category, v.payment_terms, v.lead_time_days,
      v.minimum_order_value, v.reliability_score, v.rep_name, v.rep_email,
      JSON.stringify(v.metadata)
    ]);
    inserted[v.key] = row.id;
  }
  return inserted;
}

// ── Ingredient data ───────────────────────────────────────────────────────────

async function insertIngredients(client, restaurantId) {
  const ingredientDefs = [
    // Produce
    { key: 'avocado',     name: 'Avocado (Hass)',       category: 'produce',    unit: 'lb',     current_market_price: 1.20, yield_factor: 0.72 },
    { key: 'mixed_greens',name: 'Mixed Greens',         category: 'produce',    unit: 'lb',     current_market_price: 2.80, yield_factor: 0.95 },
    { key: 'roma_tomato', name: 'Roma Tomato',          category: 'produce',    unit: 'lb',     current_market_price: 0.95, yield_factor: 0.90 },
    { key: 'lemon',       name: 'Lemon',                category: 'produce',    unit: 'each',   current_market_price: 0.28, yield_factor: 0.88 },
    { key: 'garlic',      name: 'Garlic',               category: 'produce',    unit: 'lb',     current_market_price: 2.10, yield_factor: 0.87 },
    { key: 'shallots',    name: 'Shallots',             category: 'produce',    unit: 'lb',     current_market_price: 1.85, yield_factor: 0.88 },
    { key: 'arugula',     name: 'Baby Arugula',         category: 'produce',    unit: 'lb',     current_market_price: 3.40, yield_factor: 0.96 },
    { key: 'microgreens', name: 'Microgreens',          category: 'produce',    unit: 'oz',     current_market_price: 1.20, yield_factor: 0.98 },
    // Proteins
    { key: 'salmon',      name: 'Atlantic Salmon Fillet',category: 'protein',   unit: 'lb',     current_market_price: 8.40, yield_factor: 0.90 },
    { key: 'chicken',     name: 'Chicken Breast (8oz)', category: 'protein',    unit: 'lb',     current_market_price: 3.20, yield_factor: 0.84 },
    { key: 'eggs',        name: 'Cage-Free Eggs',       category: 'protein',    unit: 'each',   current_market_price: 0.38, yield_factor: 0.88 },
    // Dairy
    { key: 'feta',        name: 'Feta Cheese',          category: 'dairy',      unit: 'lb',     current_market_price: 4.20, yield_factor: 0.98 },
    { key: 'parmesan',    name: 'Parmigiano Reggiano',  category: 'dairy',      unit: 'lb',     current_market_price: 7.50, yield_factor: 0.98 },
    { key: 'butter',      name: 'Unsalted Butter',      category: 'dairy',      unit: 'lb',     current_market_price: 3.80, yield_factor: 1.00 },
    { key: 'heavy_cream', name: 'Heavy Cream',          category: 'dairy',      unit: 'gallon', current_market_price: 5.20, yield_factor: 1.00 },
    // Dry goods
    { key: 'sourdough',   name: 'Sourdough Boule (loaf)',category: 'dry_goods', unit: 'each',   current_market_price: 4.50, yield_factor: 0.92 },
    { key: 'olive_oil',   name: 'Extra Virgin Olive Oil',category: 'dry_goods', unit: 'gallon', current_market_price: 28.00, yield_factor: 1.00 },
    { key: 'sea_salt',    name: 'Fleur de Sel Sea Salt', category: 'dry_goods', unit: 'lb',     current_market_price: 6.00, yield_factor: 1.00 },
    { key: 'honey',       name: 'Local Wildflower Honey',category: 'dry_goods', unit: 'lb',     current_market_price: 8.00, yield_factor: 1.00 }
  ];

  const inserted = {};
  for (const ing of ingredientDefs) {
    const { rows: [row] } = await client.query(`
      INSERT INTO ingredients
        (restaurant_id, name, category, unit, current_market_price, price_updated_at, yield_factor)
      VALUES ($1,$2,$3,$4,$5,now(),$6)
      RETURNING id
    `, [restaurantId, ing.name, ing.category, ing.unit, ing.current_market_price, ing.yield_factor]);
    inserted[ing.key] = row.id;
  }
  return inserted;
}

// ── Vendor prices (what they're actually charging) ────────────────────────────

async function insertVendorPrices(client, vendors, ingredients) {
  // Sysco — primary vendor, overcharging on key produce items
  const syscoPrices = [
    { ingredient: 'avocado',      price: 1.85, note: '54% above market' },
    { ingredient: 'mixed_greens', price: 3.10, note: '11% above market' },
    { ingredient: 'roma_tomato',  price: 1.18, note: '24% above market' },
    { ingredient: 'lemon',        price: 0.38, note: '36% above market' },
    { ingredient: 'garlic',       price: 2.45, note: '17% above market' },
    { ingredient: 'arugula',      price: 3.95, note: '16% above market' },
    { ingredient: 'microgreens',  price: 1.40, note: '17% above market' }
  ];

  // US Foods benchmark — competitive market rates
  const usFoodsPrices = [
    { ingredient: 'avocado',      price: 1.22, note: 'market rate' },
    { ingredient: 'mixed_greens', price: 2.85, note: 'market rate' },
    { ingredient: 'roma_tomato',  price: 0.97, note: 'market rate' },
    { ingredient: 'lemon',        price: 0.29, note: 'market rate' }
  ];

  // Gordon Food Service — also competitive
  const gordonPrices = [
    { ingredient: 'avocado',      price: 1.25, note: 'market rate' },
    { ingredient: 'arugula',      price: 3.42, note: 'market rate' },
    { ingredient: 'microgreens',  price: 1.22, note: 'market rate' }
  ];

  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

  for (const p of syscoPrices) {
    if (!ingredients[p.ingredient]) continue;
    await client.query(`
      INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date, invoice_ref)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (vendor_id, ingredient_id, effective_date) DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit
    `, [vendors.sysco, ingredients[p.ingredient], p.price, today, `SYSCO-INV-${Math.floor(Math.random()*90000+10000)}`]);
  }
  for (const p of usFoodsPrices) {
    if (!ingredients[p.ingredient]) continue;
    await client.query(`
      INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (vendor_id, ingredient_id, effective_date) DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit
    `, [vendors.usfoods, ingredients[p.ingredient], p.price, lastMonth]);
  }
  for (const p of gordonPrices) {
    if (!ingredients[p.ingredient]) continue;
    await client.query(`
      INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (vendor_id, ingredient_id, effective_date) DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit
    `, [vendors.gordon, ingredients[p.ingredient], p.price, lastMonth]);
  }

  // Meat vendor — fair pricing
  await client.query(`
    INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (vendor_id, ingredient_id, effective_date) DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit
  `, [vendors.hill_country_meats, ingredients.salmon, 8.80, today]);
  await client.query(`
    INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (vendor_id, ingredient_id, effective_date) DO UPDATE SET price_per_unit = EXCLUDED.price_per_unit
  `, [vendors.hill_country_meats, ingredients.chicken, 3.35, today]);
}

// ── Recipes ───────────────────────────────────────────────────────────────────

async function insertRecipes(client, restaurantId) {
  const recipeDefs = [
    { key: 'avocado_toast',  name: 'Avocado Toast',          category: 'brunch',   price: 14.00, target_pct: 28 },
    { key: 'harvest_bowl',   name: 'Harvest Grain Bowl',      category: 'entree',   price: 17.50, target_pct: 28 },
    { key: 'salmon_plate',   name: 'Pan-Seared Salmon',        category: 'entree',   price: 28.00, target_pct: 30 },
    { key: 'chicken_salad',  name: 'Grilled Chicken Salad',    category: 'entree',   price: 16.00, target_pct: 28 },
    { key: 'arugula_salad',  name: 'Wild Arugula & Feta',     category: 'appetizer',price: 11.00, target_pct: 25 },
    { key: 'egg_toast',      name: 'Farm Egg Toast',           category: 'brunch',   price: 12.00, target_pct: 28 }
  ];

  const inserted = {};
  for (const r of recipeDefs) {
    const { rows: [row] } = await client.query(`
      INSERT INTO recipes
        (restaurant_id, name, menu_category, menu_price, target_food_cost_pct, active)
      VALUES ($1,$2,$3,$4,$5,true)
      RETURNING id
    `, [restaurantId, r.name, r.category, r.price, r.target_pct]);
    inserted[r.key] = row.id;
  }
  return inserted;
}

// ── Recipe ingredients ────────────────────────────────────────────────────────

async function insertRecipeIngredients(client, recipes, ingredients) {
  const compositions = [
    // Avocado Toast — the star example of cost drift (41.4% food cost vs 28% target)
    { recipe: 'avocado_toast',  ingredient: 'avocado',     quantity: 0.375, unit: 'lb',   waste: 0.05 },
    { recipe: 'avocado_toast',  ingredient: 'sourdough',   quantity: 0.25,  unit: 'each', waste: 0.03 },
    { recipe: 'avocado_toast',  ingredient: 'lemon',       quantity: 0.25,  unit: 'each', waste: 0.05 },
    { recipe: 'avocado_toast',  ingredient: 'microgreens', quantity: 0.5,   unit: 'oz',   waste: 0.05 },
    { recipe: 'avocado_toast',  ingredient: 'sea_salt',    quantity: 0.01,  unit: 'lb',   waste: 0.00 },
    { recipe: 'avocado_toast',  ingredient: 'olive_oil',   quantity: 0.02,  unit: 'gallon',waste: 0.00 },

    // Harvest Grain Bowl — solid margin item
    { recipe: 'harvest_bowl',   ingredient: 'mixed_greens',quantity: 0.20,  unit: 'lb',   waste: 0.05 },
    { recipe: 'harvest_bowl',   ingredient: 'roma_tomato', quantity: 0.20,  unit: 'lb',   waste: 0.08 },
    { recipe: 'harvest_bowl',   ingredient: 'avocado',     quantity: 0.125, unit: 'lb',   waste: 0.05 },
    { recipe: 'harvest_bowl',   ingredient: 'feta',        quantity: 0.05,  unit: 'lb',   waste: 0.02 },
    { recipe: 'harvest_bowl',   ingredient: 'lemon',       quantity: 0.20,  unit: 'each', waste: 0.05 },
    { recipe: 'harvest_bowl',   ingredient: 'olive_oil',   quantity: 0.015, unit: 'gallon',waste: 0.00 },

    // Pan-Seared Salmon — premium, healthy margin
    { recipe: 'salmon_plate',   ingredient: 'salmon',      quantity: 0.40,  unit: 'lb',   waste: 0.05 },
    { recipe: 'salmon_plate',   ingredient: 'arugula',     quantity: 0.15,  unit: 'lb',   waste: 0.05 },
    { recipe: 'salmon_plate',   ingredient: 'lemon',       quantity: 0.50,  unit: 'each', waste: 0.05 },
    { recipe: 'salmon_plate',   ingredient: 'butter',      quantity: 0.05,  unit: 'lb',   waste: 0.02 },
    { recipe: 'salmon_plate',   ingredient: 'garlic',      quantity: 0.02,  unit: 'lb',   waste: 0.05 },
    { recipe: 'salmon_plate',   ingredient: 'olive_oil',   quantity: 0.01,  unit: 'gallon',waste: 0.00 },

    // Grilled Chicken Salad — mid-margin
    { recipe: 'chicken_salad',  ingredient: 'chicken',     quantity: 0.50,  unit: 'lb',   waste: 0.05 },
    { recipe: 'chicken_salad',  ingredient: 'mixed_greens',quantity: 0.25,  unit: 'lb',   waste: 0.05 },
    { recipe: 'chicken_salad',  ingredient: 'roma_tomato', quantity: 0.15,  unit: 'lb',   waste: 0.08 },
    { recipe: 'chicken_salad',  ingredient: 'parmesan',    quantity: 0.03,  unit: 'lb',   waste: 0.02 },
    { recipe: 'chicken_salad',  ingredient: 'lemon',       quantity: 0.25,  unit: 'each', waste: 0.05 },

    // Arugula & Feta — high margin starter
    { recipe: 'arugula_salad',  ingredient: 'arugula',     quantity: 0.18,  unit: 'lb',   waste: 0.05 },
    { recipe: 'arugula_salad',  ingredient: 'feta',        quantity: 0.06,  unit: 'lb',   waste: 0.02 },
    { recipe: 'arugula_salad',  ingredient: 'roma_tomato', quantity: 0.10,  unit: 'lb',   waste: 0.08 },
    { recipe: 'arugula_salad',  ingredient: 'honey',       quantity: 0.02,  unit: 'lb',   waste: 0.00 },
    { recipe: 'arugula_salad',  ingredient: 'lemon',       quantity: 0.25,  unit: 'each', waste: 0.05 },
    { recipe: 'arugula_salad',  ingredient: 'olive_oil',   quantity: 0.01,  unit: 'gallon',waste: 0.00 },

    // Farm Egg Toast — good margin
    { recipe: 'egg_toast',      ingredient: 'eggs',        quantity: 2,     unit: 'each', waste: 0.05 },
    { recipe: 'egg_toast',      ingredient: 'sourdough',   quantity: 0.20,  unit: 'each', waste: 0.03 },
    { recipe: 'egg_toast',      ingredient: 'butter',      quantity: 0.03,  unit: 'lb',   waste: 0.02 },
    { recipe: 'egg_toast',      ingredient: 'microgreens', quantity: 0.3,   unit: 'oz',   waste: 0.05 },
    { recipe: 'egg_toast',      ingredient: 'sea_salt',    quantity: 0.008, unit: 'lb',   waste: 0.00 }
  ];

  for (const c of compositions) {
    if (!recipes[c.recipe] || !ingredients[c.ingredient]) continue;
    await client.query(`
      INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, waste_factor)
      VALUES ($1,$2,$3,$4,$5)
    `, [recipes[c.recipe], ingredients[c.ingredient], c.quantity, c.unit, c.waste]);
  }
}

// ── Purchase orders (last 30 days) ────────────────────────────────────────────

async function insertPurchaseOrders(client, restaurantId, vendors) {
  const orders = [];

  // Sysco — fragmented ordering pattern (many small orders)
  const syscoOrders = [
    { daysAgo: 2,  amount: 312.40,  inv: 'SYS-2024-4821' },
    { daysAgo: 5,  amount: 287.60,  inv: 'SYS-2024-4789' },
    { daysAgo: 8,  amount: 341.20,  inv: 'SYS-2024-4756' },
    { daysAgo: 11, amount: 298.80,  inv: 'SYS-2024-4723' },
    { daysAgo: 14, amount: 276.40,  inv: 'SYS-2024-4691' },
    { daysAgo: 16, amount: 389.20,  inv: 'SYS-2024-4662' },
    { daysAgo: 19, amount: 264.80,  inv: 'SYS-2024-4634' },
    { daysAgo: 22, amount: 321.60,  inv: 'SYS-2024-4601' },
    { daysAgo: 25, amount: 295.40,  inv: 'SYS-2024-4572' },
    { daysAgo: 28, amount: 308.20,  inv: 'SYS-2024-4541' }
  ];

  for (const o of syscoOrders) {
    const orderDate = new Date(Date.now() - o.daysAgo * 86400000).toISOString().split('T')[0];
    const delivDate = new Date(Date.now() - (o.daysAgo - 1) * 86400000).toISOString().split('T')[0];
    const { rows: [po] } = await client.query(`
      INSERT INTO purchase_orders
        (restaurant_id, vendor_id, order_date, delivery_date, status, total_amount, invoice_number)
      VALUES ($1,$2,$3,$4,'delivered',$5,$6)
      RETURNING id
    `, [restaurantId, vendors.sysco, orderDate, delivDate, o.amount, o.inv]);
    orders.push({ id: po.id, vendor: 'sysco', amount: o.amount });
  }

  // Hill Country Meats — good order discipline
  for (let i = 0; i < 4; i++) {
    const daysAgo = [4, 11, 18, 25][i];
    const orderDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
    await client.query(`
      INSERT INTO purchase_orders
        (restaurant_id, vendor_id, order_date, status, total_amount, invoice_number)
      VALUES ($1,$2,$3,'delivered',$4,$5)
    `, [restaurantId, vendors.hill_country_meats, orderDate, 680 + Math.floor(Math.random() * 100), `HCM-2024-${1200 + i}`]);
  }

  // Lone Star Dairy — weekly
  for (let i = 0; i < 4; i++) {
    const daysAgo = [3, 10, 17, 24][i];
    const orderDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
    await client.query(`
      INSERT INTO purchase_orders
        (restaurant_id, vendor_id, order_date, status, total_amount, invoice_number)
      VALUES ($1,$2,$3,'delivered',$4,$5)
    `, [restaurantId, vendors.lone_star_dairy, orderDate, 240 + Math.floor(Math.random() * 60), `LSD-2024-${890 + i}`]);
  }

  return orders;
}

// ── Sales data (30 days, mixed channels) ─────────────────────────────────────

async function insertSalesData(client, restaurantId, recipes) {
  const recipeKeys = Object.keys(recipes);

  // Daily sales approximation: 1,200 covers/week = ~171/day across 3 locations
  // Channel mix: 62% dine-in, 28% DoorDash, 10% UberEats
  const channelMix = [
    { channel: 'dine_in',            commission: 0,  weight: 0.62 },
    { channel: 'delivery_doordash',  commission: 30, weight: 0.28 },
    { channel: 'delivery_ubereats',  commission: 27, weight: 0.10 }
  ];

  // Recipe volumes per day (avg per channel)
  const recipeVolumes = {
    avocado_toast: 42,
    harvest_bowl:  38,
    salmon_plate:  22,
    chicken_salad: 31,
    arugula_salad: 28,
    egg_toast:     18
  };

  // Insert aggregated daily records (last 30 days)
  for (let daysAgo = 1; daysAgo <= 30; daysAgo++) {
    const saleDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];

    for (const recipeKey of recipeKeys) {
      const recipeId = recipes[recipeKey];
      // Get menu price based on recipe key
      const menuPrices = { avocado_toast: 14.00, harvest_bowl: 17.50, salmon_plate: 28.00, chicken_salad: 16.00, arugula_salad: 11.00, egg_toast: 12.00 };
      const price = menuPrices[recipeKey] || 15.00;
      const baseQty = recipeVolumes[recipeKey] || 20;

      for (const ch of channelMix) {
        const qty = Math.round(baseQty * ch.weight * (0.85 + Math.random() * 0.3));
        if (qty === 0) continue;

        const net_revenue = price * qty * (1 - ch.commission / 100);
        await client.query(`
          INSERT INTO sales_data
            (restaurant_id, sale_date, recipe_id, quantity_sold, sale_price,
             channel, platform_commission_pct, net_revenue)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `, [restaurantId, saleDate, recipeId, qty, price, ch.channel, ch.commission, net_revenue]);
      }
    }
  }
}

// ── Pre-seeded margin alerts ──────────────────────────────────────────────────

async function insertMarginAlerts(client, restaurantId, vendors, ingredients, recipes) {
  const alerts = [
    {
      alert_type: 'vendor_overcharge',
      severity: 'critical',
      title: 'Sysco Austin overcharging 54% on Avocados — $1,240/month overage',
      description: 'You are paying $1.85/lb for Hass Avocados from Sysco Austin. Current USDA AMS market price for Texas region is $1.20/lb — a 54% premium. At ~1,920 lbs/month across all three locations, this costs $1,248 extra per month. US Foods Central TX quotes $1.22/lb and Gordon Food Service quotes $1.25/lb.',
      affected_item: 'Avocado (Hass) — Sysco Austin',
      financial_impact_monthly: 1240.00,
      confidence_score: 0.96,
      ai_recommendation: 'Schedule an immediate price review call with Mark Delgado (Sysco rep). Reference the US Foods quote at $1.22/lb. If Sysco cannot match within 5% by end of week, split avocado volume 60/40 with US Foods. Annual savings at full switch: $14,880.',
      reasoning_lineage: JSON.stringify({
        alert_type: 'vendor_overcharge',
        data_source: 'Sysco invoice SYSCO-INV-4821 vs USDA AMS Texas Produce Report',
        calculation: '($1.85 - $1.20) × 1,920 lbs = $1,248/mo',
        alternatives: [
          { vendor: 'US Foods Central TX', price: 1.22, savings_monthly: 1210 },
          { vendor: 'Gordon Food Service', price: 1.25, savings_monthly: 1152 }
        ],
        confidence_basis: 'Direct invoice comparison — very high confidence'
      })
    },
    {
      alert_type: 'recipe_cost_drift',
      severity: 'high',
      title: '"Avocado Toast" food cost at 41.4% — 13.4pp above 28% target ($2,100/mo)',
      description: 'Avocado Toast was priced at $14.00 in 2022 when avocado cost was $0.92/lb. At today\'s $1.85/lb (Sysco) the per-plate ingredient cost is $5.80, yielding 41.4% food cost vs your 28% target. You are serving 1,260 plates/month at a $1.67/plate loss vs target. Break-even price at current costs is $20.70.',
      affected_item: 'Avocado Toast',
      financial_impact_monthly: 2100.00,
      confidence_score: 0.93,
      ai_recommendation: 'Two paths: (1) Reprice to $18.50 (still under break-even but market-acceptable premium). (2) Switch avocado vendor to US Foods at $1.22/lb — drops per-plate cost to $3.72 and food cost to 26.6%. Option 2 is both the better margin fix AND solves Alert #1 simultaneously.',
      reasoning_lineage: JSON.stringify({
        alert_type: 'recipe_cost_drift',
        recipe: 'Avocado Toast',
        menu_price: 14.00,
        current_cost_per_plate: 5.80,
        food_cost_pct: 41.4,
        target_food_cost_pct: 28,
        qty_sold_monthly: 1260,
        break_even_price: 20.71,
        calculation: '($5.80 / $14.00) × 100 = 41.4% food cost; ($5.80 - $3.92 target) × 1,260 plates = $2,108/mo'
      })
    },
    {
      alert_type: 'delivery_erosion',
      severity: 'high',
      title: 'DoorDash orders yielding 8.2% net margin vs 26.4% dine-in — $3,800/mo gap',
      description: 'Delivery channels represent 38% of your revenue ($69,160/mo). DoorDash\'s 30% commission and UberEats\' 27% commission collapse your net margin to 8.2% and 11.4% respectively, vs 26.4% on dine-in. If this delivery revenue were served dine-in, it would generate an additional $3,842/month in gross profit.',
      affected_item: 'delivery_doordash',
      financial_impact_monthly: 3800.00,
      confidence_score: 0.91,
      ai_recommendation: 'Implement a delivery-specific price tier: raise all delivery menu prices 18-20% to offset commissions. DoorDash data shows <8% customer churn on price increases ≤20%. Additionally, negotiate DoorDash Preferred Plus tier (>$15K GMV/mo qualifies Harvest & Co.) which drops commission to 20-25%.',
      reasoning_lineage: JSON.stringify({
        alert_type: 'delivery_erosion',
        dine_in_margin_pct: 26.4,
        doordash_margin_pct: 8.2,
        ubereats_margin_pct: 11.4,
        delivery_revenue_monthly: 69160,
        margin_gap_pp: 18.2,
        calculation: '$69,160 delivery revenue × 18.2% margin gap = $12,587 max recovery; conservative 30% capture = $3,800/mo'
      })
    },
    {
      alert_type: 'order_inefficiency',
      severity: 'medium',
      title: 'Sysco order fragmentation: 10 orders averaging $310 — missing $500 volume threshold',
      description: 'In the last 30 days you placed 10 separate produce orders with Sysco averaging $310 each. Sysco\'s volume discount threshold is $500/order (3% rebate above threshold). Consolidating to 5 orders of ~$620 each would have saved $680 in volume discounts and reduced truck delivery charges by an estimated $120/month.',
      affected_item: 'Sysco Austin',
      financial_impact_monthly: 680.00,
      confidence_score: 0.84,
      ai_recommendation: 'Shift from 2-3x/week small orders to twice-weekly consolidated orders. Use the procurement order template in the Recommendations panel to build a Mon/Thu ordering cadence. Cold storage audit first — confirm you have capacity for larger delivery volumes.',
      reasoning_lineage: JSON.stringify({
        alert_type: 'order_inefficiency',
        vendor: 'Sysco Austin',
        order_count: 10,
        avg_order_value: 310,
        threshold_for_discount: 500,
        discount_pct: 3,
        calculation: 'Total spend $3,096 × 3% missed discount + $120 delivery fees = $213; conservative 3mo avg = $213 sustained/mo; plus opportunity cost rounded to $680 including optimal cadence'
      })
    }
  ];

  for (const alert of alerts) {
    await client.query(`
      INSERT INTO margin_alerts
        (restaurant_id, alert_type, severity, title, description, affected_item,
         financial_impact_monthly, confidence_score, ai_recommendation, reasoning_lineage)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)
    `, [
      restaurantId, alert.alert_type, alert.severity, alert.title,
      alert.description, alert.affected_item, alert.financial_impact_monthly,
      alert.confidence_score, alert.ai_recommendation, alert.reasoning_lineage
    ]);
  }
}

// ── Pre-seeded AI recommendations ────────────────────────────────────────────

async function insertRecommendations(client, restaurantId) {
  const recs = [
    {
      category: 'vendor_switch',
      title: 'Switch avocado sourcing to US Foods — $14,880/year savings',
      description: 'Sysco Austin is billing $1.85/lb vs US Foods Central TX at $1.22/lb for the same Hass avocado grade. A full switch to US Foods saves $1,240/month ($14,880/year) with no recipe or quality changes required.',
      action_steps: JSON.stringify([
        { step: 1, action: 'Call Lisa Chen at US Foods (lchen@usfoods.com) and request a formal produce quote for your current Sysco volume', timeline: 'Day 1' },
        { step: 2, action: 'Run a 2-week parallel trial: order avocados from both vendors to verify quality consistency', timeline: 'Days 3-17' },
        { step: 3, action: 'Give Sysco\'s Mark Delgado a final opportunity to match — they may drop to $1.30 to retain the account', timeline: 'Day 5' },
        { step: 4, action: 'Execute vendor switch. Update purchase order template to default avocado to US Foods', timeline: 'Day 18' }
      ]),
      potential_monthly_savings: 1240.00,
      implementation_effort: 'low',
      payback_days: 0,
      confidence_score: 0.95
    },
    {
      category: 'recipe_reprice',
      title: 'Reprice Avocado Toast to $18 — recovers $2,100/mo at current food costs',
      description: 'With avocados at market rate, Avocado Toast has a $20.71 break-even price at 28% food cost target. A reprice to $18.00 reduces the gap substantially. If the vendor switch (Rec #1) executes first, break-even drops to $13.29 making the current $14 price viable again.',
      action_steps: JSON.stringify([
        { step: 1, action: 'Execute Recommendation #1 (vendor switch) first — this resolves the cost problem without repricing', timeline: 'Days 1-18' },
        { step: 2, action: 'If vendor switch is delayed: update Toast POS menu price to $18.00 for all channels', timeline: 'Day 2 (if needed)' },
        { step: 3, action: 'For delivery channels: set delivery price to $21.00 to offset 30% DoorDash commission', timeline: 'Same day' }
      ]),
      potential_monthly_savings: 2100.00,
      implementation_effort: 'low',
      payback_days: 1,
      confidence_score: 0.90
    },
    {
      category: 'channel_rebalancing',
      title: 'Apply delivery surcharge pricing on DoorDash/UberEats — $1,400/mo recovery',
      description: 'Add a 15% delivery-specific price increase on all DoorDash and UberEats menu items. This partially offsets the 30%/27% commissions, recovering approximately $1,400/month while keeping delivery prices competitive (avg delivery check rises from $22.50 to $25.88).',
      action_steps: JSON.stringify([
        { step: 1, action: 'Log into DoorDash Merchant Portal and enable "Menu Pricing Customization"', timeline: 'Day 1 (30 min)' },
        { step: 2, action: 'Increase all item prices by 15% on DoorDash and UberEats menus', timeline: 'Day 1' },
        { step: 3, action: 'Monitor order volume for 2 weeks — acceptable churn is <8% per DoorDash benchmarks', timeline: 'Days 2-15' },
        { step: 4, action: 'Contact your DoorDash rep about Preferred Plus tier — $15K+/mo GMV qualifies Harvest & Co. for 20-25% commission', timeline: 'Day 3' }
      ]),
      potential_monthly_savings: 1400.00,
      implementation_effort: 'low',
      payback_days: 2,
      confidence_score: 0.87
    },
    {
      category: 'order_consolidation',
      title: 'Consolidate Sysco orders Mon/Thu — $680/mo in volume discounts',
      description: 'Shifting from 10 ad-hoc weekly micro-orders to twice-weekly consolidated orders (Mon/Thu) will push average order value above Sysco\'s $500 volume-discount threshold, unlocking a 3% rebate plus eliminating 4-6 redundant delivery fees per month.',
      action_steps: JSON.stringify([
        { step: 1, action: 'Conduct a cold storage audit — confirm capacity to receive 2 large deliveries/week vs 4-5 small ones', timeline: 'Day 1' },
        { step: 2, action: 'Build a standing Monday/Thursday order template in Sysco Order Management', timeline: 'Day 2' },
        { step: 3, action: 'Brief kitchen team on new order cadence — they\'ll need to plan prep 3 days ahead instead of 1', timeline: 'Day 3' },
        { step: 4, action: 'Request Sysco volume rebate documentation and confirm 3% threshold in writing', timeline: 'Day 5' }
      ]),
      potential_monthly_savings: 680.00,
      implementation_effort: 'medium',
      payback_days: 14,
      confidence_score: 0.82
    }
  ];

  for (const rec of recs) {
    await client.query(`
      INSERT INTO procurement_recommendations
        (restaurant_id, category, title, description, action_steps,
         potential_monthly_savings, implementation_effort, payback_days, confidence_score)
      VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9)
    `, [
      restaurantId, rec.category, rec.title, rec.description, rec.action_steps,
      rec.potential_monthly_savings, rec.implementation_effort, rec.payback_days, rec.confidence_score
    ]);
  }
}

// ── 30-day price history (avocado spike story) ────────────────────────────────

async function insertPriceHistory(client, ingredients) {
  if (!ingredients.avocado) return;

  // Show avocado price rising from $0.92 → $1.85 over 18 months
  const pricePoints = [
    { daysAgo: 540, price: 0.92 }, // 18 months ago — original menu price basis
    { daysAgo: 450, price: 0.98 },
    { daysAgo: 360, price: 1.10 },
    { daysAgo: 270, price: 1.24 },
    { daysAgo: 180, price: 1.35 },
    { daysAgo: 90,  price: 1.52 },
    { daysAgo: 60,  price: 1.68 },
    { daysAgo: 30,  price: 1.78 },
    { daysAgo: 14,  price: 1.82 },
    { daysAgo: 0,   price: 1.85 }  // current — paid to Sysco
  ];

  for (const p of pricePoints) {
    const date = new Date(Date.now() - p.daysAgo * 86400000).toISOString().split('T')[0];
    await client.query(`
      INSERT INTO ingredient_price_history (ingredient_id, price, recorded_date, source)
      VALUES ($1,$2,$3,'invoice')
      ON CONFLICT DO NOTHING
    `, [ingredients.avocado, p.price, date]);
  }

  // Salmon price history (stable — good vendor behavior)
  if (ingredients.salmon) {
    const salmonPoints = [
      { daysAgo: 90, price: 8.20 }, { daysAgo: 60, price: 8.40 },
      { daysAgo: 30, price: 8.50 }, { daysAgo: 0,  price: 8.80 }
    ];
    for (const p of salmonPoints) {
      const date = new Date(Date.now() - p.daysAgo * 86400000).toISOString().split('T')[0];
      await client.query(`
        INSERT INTO ingredient_price_history (ingredient_id, price, recorded_date, source)
        VALUES ($1,$2,$3,'invoice')
        ON CONFLICT DO NOTHING
      `, [ingredients.salmon, p.price, date]);
    }
  }
}

module.exports = { seedRestaurantDemoData };
