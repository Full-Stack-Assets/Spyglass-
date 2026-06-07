/**
 * Demo Data Seeder — Mickey Malone's Tavern
 *
 * Seeds real acquisition-target data from the Kona Equity due diligence
 * package (347 N Pearl St, Brockton MA 02301).
 *
 * Actual financials from source documents:
 *   Revenue:       $852K/yr  ($71K/mo)
 *   F&B revenue:   $480K/yr current → $672K/yr optimized
 *   Food cost:     35% actual vs 30% target
 *   Drink margin:  77% (cocktail program = $127,944/yr profit)
 *   Founded:       2010 | 6 employees | Irish-American sports bar
 *
 * Margin leaks detected ($3,150/month | $37,800/year):
 *   1. CRITICAL  Vendor overcharge: US Foods mozzarella +18.4% vs market   $  890/mo
 *   2. HIGH      Recipe cost drift: Pub Burger at 40% food cost             $1,200/mo
 *   3. HIGH      Recipe cost drift: Wings at 36.3% cost (wing inflation)    $  680/mo
 *   4. MEDIUM    Order fragmentation: US Foods avg $420/order (<$600 min)   $  380/mo
 *
 * Acquisition framing: Clover (payments + POS for tavern/bar vertical),
 *   DoorDash (no delivery = untapped ~$8K/mo), Toast (kitchen + bar POS).
 */

async function seedMickeyMalonesData(pool, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Org ────────────────────────────────────────────────────────────────
    const orgSlug = 'mickey-malones-demo';
    let orgId;
    const { rows: [existingOrg] } = await client.query(
      `SELECT id FROM organizations WHERE slug = $1`, [orgSlug]
    );
    if (existingOrg) {
      orgId = existingOrg.id;
      await client.query(
        `DELETE FROM restaurants WHERE slug = 'mickey-malones-tavern' AND org_id = $1`, [orgId]
      );
    } else {
      const { rows: [newOrg] } = await client.query(`
        INSERT INTO organizations (name, slug, plan_tier)
        VALUES ('Mickey Malone''s Tavern (Kona Equity Target)', $1, 'pro')
        RETURNING id
      `, [orgSlug]);
      orgId = newOrg.id;
    }

    // ── 2. Restaurant ─────────────────────────────────────────────────────────
    const { rows: [restaurant] } = await client.query(`
      INSERT INTO restaurants
        (org_id, name, slug, cuisine_type, location, monthly_revenue_estimate,
         target_food_cost_pct, pos_system, delivery_platforms, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id
    `, [
      orgId,
      "Mickey Malone's Tavern",
      'mickey-malones-tavern',
      'Irish-American Sports Bar',
      '347 N Pearl St, Brockton, MA 02301',
      71000.00,
      30.0,
      'unknown',
      '{}',     // no delivery platforms — core margin gap finding
      JSON.stringify({
        founded: 2010,
        employees: 6,
        seats: 60,
        tvs: 12,
        avg_check_food: 18.50,
        avg_check_bar: 22.00,
        weekly_covers: 380,
        specialties: ['homemade pizza', 'wings', 'Irish cocktails'],
        acquisition_target: true,
        acquirer_prospect: 'Kona Equity',
        annual_revenue: 852000,
        demo: true,
        demo_user_id: userId,
        source: 'due_diligence_package_2024'
      })
    ]);
    const restaurantId = restaurant.id;

    // ── 3. Vendors ────────────────────────────────────────────────────────────
    const { rows: [usfoods] } = await client.query(`
      INSERT INTO vendors (restaurant_id, name, category, payment_terms,
        lead_time_days, minimum_order_value, reliability_score, rep_name, rep_email)
      VALUES ($1,'US Foods','broadline_distributor','net30',2,300,0.91,
              'Dave Caruso','d.caruso@usfoods.com') RETURNING id`, [restaurantId]);

    const { rows: [neProduce] } = await client.query(`
      INSERT INTO vendors (restaurant_id, name, category, payment_terms,
        lead_time_days, minimum_order_value, reliability_score)
      VALUES ($1,'New England Produce Co.','produce','cod',1,150,0.96)
      RETURNING id`, [restaurantId]);

    const { rows: [republic] } = await client.query(`
      INSERT INTO vendors (restaurant_id, name, category, payment_terms,
        lead_time_days, minimum_order_value, reliability_score, rep_name)
      VALUES ($1,'Republic National Distributing','spirits','net15',3,500,0.98,
              'Sean O''Brien') RETURNING id`, [restaurantId]);

    const { rows: [bostonBeer] } = await client.query(`
      INSERT INTO vendors (restaurant_id, name, category, payment_terms,
        lead_time_days, minimum_order_value, reliability_score)
      VALUES ($1,'Boston Beer Distributors','draft_beer','cod',2,200,0.99)
      RETURNING id`, [restaurantId]);

    const { rows: [baldor] } = await client.query(`
      INSERT INTO vendors (restaurant_id, name, category, payment_terms,
        lead_time_days, minimum_order_value, reliability_score)
      VALUES ($1,'Baldor Specialty Foods','specialty','net15',2,250,0.97)
      RETURNING id`, [restaurantId]);

    const usfoodsId  = usfoods.id;
    const neId       = neProduce.id;
    const republicId = republic.id;
    const bostonId   = bostonBeer.id;
    const baldorId   = baldor.id;

    // ── 4. Ingredients (with market prices) ───────────────────────────────────
    // Pizza program
    const ingrs = {};
    const ingrList = [
      // [name, category, unit, market_price, yield_factor]
      ['Mozzarella Cheese',     'dairy',    'lb',   3.80,  0.98],
      ['Pizza Dough (bulk)',    'bakery',   'lb',   0.42,  1.00],
      ['Roma Tomatoes',         'produce',  'lb',   0.62,  0.90],
      ['Pepperoni',             'protein',  'lb',   4.10,  1.00],
      ['Russet Potatoes',       'produce',  'lb',   0.38,  0.82],
      ['Chicken Wings',         'protein',  'lb',   2.40,  0.76],
      ['Ground Beef 80/20',     'protein',  'lb',   4.20,  0.85],
      ['Brioche Buns',          'bakery',   'each', 0.45,  1.00],
      ['Lettuce (iceberg hd)',  'produce',  'head', 1.20,  0.80],
      ['Cheddar Cheese',        'dairy',    'lb',   3.60,  0.98],
      ['Nacho Chips (bulk)',    'dry_goods','lb',   1.10,  1.00],
      ['Black Beans (canned)',  'dry_goods','each', 0.85,  1.00],
      ['Sour Cream',            'dairy',    'lb',   2.20,  1.00],
      // Bar program (spirits/mixers priced per 750ml or per unit)
      ['Jameson Irish Whiskey', 'spirits',  '750ml',16.00, 1.00],
      ['Bulleit Bourbon',       'spirits',  '750ml',19.50, 1.00],
      ["Gosling's Dark Rum",    'spirits',  '750ml',14.50, 1.00],
      ['Tito\'s Vodka',         'spirits',  '750ml',14.00, 1.00],
      ['Ginger Beer (12oz can)','mixer',    'each', 1.05,  1.00],
      ['Fresh Lime Juice',      'produce',  'lb',   3.20,  0.88],
      ['Fresh Lemon Juice',     'produce',  'lb',   3.00,  0.88],
      ['Simple Syrup',          'mixer',    'liter', 0.75, 1.00],
      ['Cranberry Juice',       'mixer',    'liter', 0.90, 1.00],
      ['Pineapple Juice',       'mixer',    'liter', 1.05, 1.00],
      ['Sweet Vermouth',        'spirits',  '750ml', 8.50, 1.00],
      ['Angostura Bitters',     'mixer',    'each',  6.00, 1.00],
      ['Irish Cream Liqueur',   'spirits',  '750ml',11.00, 1.00],
      ['Peach Schnapps',        'spirits',  '750ml', 9.00, 1.00],
      ['Blue Curaçao',          'spirits',  '750ml',10.50, 1.00],
      ['Hot Coffee',            'beverage', 'each',  0.18, 1.00],
      ['Whipped Cream',         'dairy',    'each',  0.30, 1.00],
    ];

    for (const [name, category, unit, market_price, yield_factor] of ingrList) {
      const { rows: [ing] } = await client.query(`
        INSERT INTO ingredients (restaurant_id, name, category, unit,
          current_market_price, price_updated_at, yield_factor)
        VALUES ($1,$2,$3,$4,$5,now(),$6) RETURNING id
      `, [restaurantId, name, category, unit, market_price, yield_factor]);
      ingrs[name] = ing.id;
    }

    // ── 5. Vendor prices (some above market — the margin leaks) ───────────────
    const today = new Date().toISOString().slice(0, 10);

    // US Foods — overcharging on mozzarella (+18.4%) and wings (+18.8%)
    const usFoodsPrices = [
      ['Mozzarella Cheese',  4.50],  // market $3.80 → +18.4% OVERCHARGE
      ['Pizza Dough (bulk)', 0.48],  // market $0.42 → +14.3%
      ['Pepperoni',          4.35],  // market $4.10 → +6.1%
      ['Chicken Wings',      2.85],  // market $2.40 → +18.8% OVERCHARGE
      ['Ground Beef 80/20',  4.50],  // market $4.20 → +7.1%
      ['Brioche Buns',       0.52],  // market $0.45 → +15.6%
      ['Nacho Chips (bulk)', 1.18],  // market $1.10 → +7.3%
      ['Black Beans (canned)',0.90], // market $0.85
      ['Sour Cream',         2.35],  // market $2.20
      ['Cheddar Cheese',     3.85],  // market $3.60
    ];
    for (const [name, price] of usFoodsPrices) {
      await client.query(`
        INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
      `, [usfoodsId, ingrs[name], price, today]);
    }

    // Baldor — competitive pricing on specialty (market-rate or below)
    await client.query(`
      INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
      VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
    `, [baldorId, ingrs['Mozzarella Cheese'], 3.85, today]); // $3.85 vs US Foods $4.50

    // NE Produce — local, at market
    const nePrices = [
      ['Roma Tomatoes', 0.63], ['Russet Potatoes', 0.40],
      ['Fresh Lime Juice', 3.25], ['Fresh Lemon Juice', 3.05],
      ['Lettuce (iceberg hd)', 1.22],
    ];
    for (const [name, price] of nePrices) {
      await client.query(`
        INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
      `, [neId, ingrs[name], price, today]);
    }

    // Republic National — spirits at market
    const spiritPrices = [
      ['Jameson Irish Whiskey', 18.50],  // market $16.00 → +15.6% OVERCHARGE
      ['Bulleit Bourbon',       22.00],  // market $19.50 → +12.8%
      ["Gosling's Dark Rum",    16.80],  // market $14.50 → +15.9%
      ['Tito\'s Vodka',         16.20],  // market $14.00 → +15.7%
      ['Sweet Vermouth',         9.00],
      ['Irish Cream Liqueur',   12.00],
      ['Peach Schnapps',         9.50],
      ['Blue Curaçao',          11.00],
      ['Angostura Bitters',      6.50],
    ];
    for (const [name, price] of spiritPrices) {
      await client.query(`
        INSERT INTO vendor_prices (vendor_id, ingredient_id, price_per_unit, effective_date)
        VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING
      `, [republicId, ingrs[name], price, today]);
    }

    // ── 6. Recipes ────────────────────────────────────────────────────────────
    //   Food: targeting 30% food cost (actual 35% = margin leak)
    //   Bar:  targeting 20% cost (actual ~23% with vendor overcharges)

    const recipeData = [
      // [name, category, price, target_pct, channels]
      ['Basket O\'Fries',         'appetizers', 8.99,  20.0, '{dine_in,takeout}'],
      ['Margherita Pizza (12")',   'pizza',     14.99,  30.0, '{dine_in,takeout}'],
      ['Pepperoni Pizza (12")',    'pizza',     16.99,  30.0, '{dine_in,takeout}'],
      ['Buffalo Wings (12 pcs)',   'entrees',   15.99,  30.0, '{dine_in,takeout}'],
      ['Pub Burger',               'entrees',   13.99,  30.0, '{dine_in,takeout}'],
      ['Nachos Supreme',           'appetizers',12.99,  30.0, '{dine_in,takeout}'],
      ['Pearl Street Punch',       'cocktails', 15.00,  20.0, '{dine_in}'],
      ['Midnight Manhattan',       'cocktails', 18.00,  20.0, '{dine_in}'],
      ['Celtic Mule',              'cocktails', 14.00,  20.0, '{dine_in}'],
      ['Shamrock Sour',            'cocktails', 15.00,  20.0, '{dine_in}'],
      ['Dublin Daydream',          'cocktails', 16.00,  20.0, '{dine_in}'],
      ['Irish Coffee',             'cocktails', 12.00,  20.0, '{dine_in}'],
    ];

    const recipes = {};
    for (const [name, category, price, target, channels] of recipeData) {
      const { rows: [rec] } = await client.query(`
        INSERT INTO recipes (restaurant_id, name, menu_category, menu_price,
          target_food_cost_pct, active, available_channels)
        VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING id
      `, [restaurantId, name, category, price, target, channels]);
      recipes[name] = rec.id;
    }

    // ── 7. Recipe ingredients ─────────────────────────────────────────────────
    // Using US Foods vendor prices (what they actually pay)
    const ri = async (recipeName, ingredientName, qty, unit, wasteFactor = 0.05) => {
      await client.query(`
        INSERT INTO recipe_ingredients
          (recipe_id, ingredient_id, quantity, unit, waste_factor)
        VALUES ($1,$2,$3,$4,$5)
      `, [recipes[recipeName], ingrs[ingredientName], qty, unit, wasteFactor]);
    };

    // Basket O'Fries: $8.99 price, ~$1.50 cost actual (using US Foods pricing)
    await ri("Basket O'Fries", 'Russet Potatoes', 0.5, 'lb', 0.18);

    // Margherita Pizza: market cost ~$4.10, actual (US Foods) ~$4.85
    await ri("Margherita Pizza (12\")", 'Pizza Dough (bulk)', 0.5, 'lb', 0.05);
    await ri("Margherita Pizza (12\")", 'Mozzarella Cheese',  0.3, 'lb', 0.02);
    await ri("Margherita Pizza (12\")", 'Roma Tomatoes',      0.4, 'lb', 0.10);

    // Pepperoni Pizza: market ~$5.20, actual (US Foods) ~$6.10
    await ri("Pepperoni Pizza (12\")", 'Pizza Dough (bulk)', 0.5, 'lb', 0.05);
    await ri("Pepperoni Pizza (12\")", 'Mozzarella Cheese',  0.35,'lb', 0.02);
    await ri("Pepperoni Pizza (12\")", 'Pepperoni',          0.25,'lb', 0.02);
    await ri("Pepperoni Pizza (12\")", 'Roma Tomatoes',      0.3, 'lb', 0.10);

    // Buffalo Wings 12 pcs: market ~$4.60, actual ~$5.80 (36.3% food cost)
    await ri('Buffalo Wings (12 pcs)', 'Chicken Wings', 2.0, 'lb', 0.08);

    // Pub Burger: market ~$4.50, actual ~$5.60 (40% food cost — CRITICAL)
    await ri('Pub Burger', 'Ground Beef 80/20', 0.4,  'lb', 0.05);
    await ri('Pub Burger', 'Brioche Buns',      1.0,  'each', 0.02);
    await ri('Pub Burger', 'Lettuce (iceberg hd)', 0.1, 'head', 0.20);
    await ri('Pub Burger', 'Cheddar Cheese',    0.08, 'lb',  0.02);

    // Nachos Supreme
    await ri('Nachos Supreme', 'Nacho Chips (bulk)',  0.3, 'lb',  0.05);
    await ri('Nachos Supreme', 'Black Beans (canned)',1.0, 'each',0.00);
    await ri('Nachos Supreme', 'Cheddar Cheese',      0.25,'lb',  0.02);
    await ri('Nachos Supreme', 'Sour Cream',          0.15,'lb',  0.03);

    // Cocktails — using Republic National pricing
    // Pearl Street Punch: $15 price, ~$2.25 cost (15% cost) — using 1.5oz spirit + mixers
    await ri('Pearl Street Punch',  'Tito\'s Vodka',        0.059, '750ml', 0.00); // 1.5oz ≈ 0.059×750ml
    await ri('Pearl Street Punch',  'Cranberry Juice',      0.12,  'liter', 0.00);
    await ri('Pearl Street Punch',  'Pineapple Juice',      0.06,  'liter', 0.00);
    await ri('Pearl Street Punch',  'Fresh Lime Juice',     0.03,  'lb',    0.05);

    // Midnight Manhattan: $18, ~$2.70 cost
    await ri('Midnight Manhattan',  'Bulleit Bourbon',      0.059, '750ml', 0.00);
    await ri('Midnight Manhattan',  'Sweet Vermouth',       0.030, '750ml', 0.00);
    await ri('Midnight Manhattan',  'Angostura Bitters',    0.003, 'each',  0.00);

    // Celtic Mule: $14, ~$1.96 cost
    await ri('Celtic Mule',         'Jameson Irish Whiskey',0.059,'750ml', 0.00);
    await ri('Celtic Mule',         'Ginger Beer (12oz can)',1.0, 'each',  0.00);
    await ri('Celtic Mule',         'Fresh Lime Juice',     0.03, 'lb',    0.05);

    // Shamrock Sour: $15, ~$2.25 cost
    await ri('Shamrock Sour',       'Jameson Irish Whiskey',0.059,'750ml', 0.00);
    await ri('Shamrock Sour',       'Fresh Lemon Juice',    0.04, 'lb',    0.05);
    await ri('Shamrock Sour',       'Simple Syrup',         0.03, 'liter', 0.00);

    // Dublin Daydream: $16, ~$2.40 cost
    await ri('Dublin Daydream',     "Gosling's Dark Rum",   0.059,'750ml', 0.00);
    await ri('Dublin Daydream',     'Pineapple Juice',      0.10, 'liter', 0.00);
    await ri('Dublin Daydream',     'Peach Schnapps',       0.030,'750ml', 0.00);
    await ri('Dublin Daydream',     'Blue Curaçao',         0.015,'750ml', 0.00);

    // Irish Coffee: $12, ~$1.80 cost
    await ri('Irish Coffee',        'Jameson Irish Whiskey',0.059,'750ml', 0.00);
    await ri('Irish Coffee',        'Irish Cream Liqueur',  0.030,'750ml', 0.00);
    await ri('Irish Coffee',        'Hot Coffee',           1.0,  'each',  0.00);
    await ri('Irish Coffee',        'Whipped Cream',        1.0,  'each',  0.00);

    // ── 8. Purchase orders (last 90 days — fragmentation pattern) ─────────────
    const poInsert = async (vendorId, days_ago, total, status = 'delivered') => {
      const orderDate = new Date(Date.now() - days_ago * 86400000).toISOString().slice(0,10);
      const { rows: [po] } = await client.query(`
        INSERT INTO purchase_orders
          (restaurant_id, vendor_id, order_date, delivery_date, status, total_amount)
        VALUES ($1,$2,$3,$4::date + interval '2 days',$5,$6) RETURNING id
      `, [restaurantId, vendorId, orderDate, orderDate, status, total]);
      return po.id;
    };

    // US Foods — 10 small orders avg $420 (below $600 threshold = no volume discount)
    const usFoodsPOs = [
      [3,380],[10,450],[17,410],[24,390],[31,470],
      [38,420],[45,440],[52,400],[59,430],[66,415]
    ];
    for (const [days, total] of usFoodsPOs) {
      const poId = await poInsert(usfoodsId, days, total);
      // Add line items for the two overcharged ingredients
      await client.query(`
        INSERT INTO purchase_order_items
          (purchase_order_id, ingredient_id, quantity, unit, unit_price, line_total,
           variance_flag, variance_pct)
        VALUES
          ($1,$2,10,'lb',4.50,45.00,true,18.4),
          ($1,$3,4,'lb',2.85,11.40,true,18.8)
      `, [poId, ingrs['Mozzarella Cheese'], ingrs['Chicken Wings']]);
    }

    // Republic National — spirits, 4 orders/month
    for (const days of [7, 21, 37, 52]) {
      await poInsert(republicId, days, 620);
    }

    // NE Produce — 2x/week delivery, consistent
    for (const days of [2,5,9,12,16,19,23,26,30,33]) {
      await poInsert(neId, days, 180);
    }

    // Boston Beer — weekly keg delivery
    for (const days of [4,11,18,25,32,39,46,53,60,67]) {
      await poInsert(bostonId, days, 340);
    }

    // ── 9. Sales data (30 days — dine_in + takeout only, no delivery) ─────────
    const salesEntries = [];
    // Volume estimates based on $71K/mo: ~$33K food, ~$38K bar
    // Avg food check $18.50 → ~55 food orders/day
    // Avg bar check $22.00 → ~58 bar orders/day
    const foodItems = [
      ["Basket O'Fries",       8.99,  15],
      ["Margherita Pizza (12\")",14.99, 10],
      ["Pepperoni Pizza (12\")",16.99,  8],
      ['Buffalo Wings (12 pcs)',15.99, 10],
      ['Pub Burger',            13.99, 12],
      ['Nachos Supreme',        12.99,  8],
    ];
    const barItems = [
      ['Pearl Street Punch',   15.00, 10],
      ['Midnight Manhattan',   18.00,  6],
      ['Celtic Mule',          14.00, 12],
      ['Shamrock Sour',        15.00,  8],
      ['Dublin Daydream',      16.00,  6],
      ['Irish Coffee',         12.00,  5],
    ];

    for (let d = 1; d <= 30; d++) {
      const saleDate = new Date(Date.now() - d * 86400000).toISOString().slice(0,10);
      // Food — dine_in (75%) + takeout (25%)
      for (const [itemName, price, baseQty] of foodItems) {
        const variance = Math.round((Math.random() - 0.5) * 4);
        const qty = Math.max(1, baseQty + variance);
        const dineInQty  = Math.round(qty * 0.75);
        const takeoutQty = qty - dineInQty;
        if (dineInQty > 0) {
          salesEntries.push([restaurantId, saleDate, recipes[itemName],
            dineInQty, price, 'dine_in', 0, 0, price * dineInQty]);
        }
        if (takeoutQty > 0) {
          salesEntries.push([restaurantId, saleDate, recipes[itemName],
            takeoutQty, price, 'takeout', 0, 0, price * takeoutQty]);
        }
      }
      // Bar — dine_in only
      for (const [itemName, price, baseQty] of barItems) {
        const variance = Math.round((Math.random() - 0.5) * 3);
        const qty = Math.max(1, baseQty + variance);
        salesEntries.push([restaurantId, saleDate, recipes[itemName],
          qty, price, 'dine_in', 0, 0, price * qty]);
      }
    }

    for (const entry of salesEntries) {
      await client.query(`
        INSERT INTO sales_data
          (restaurant_id, sale_date, recipe_id, quantity_sold, sale_price,
           channel, platform_commission_pct, platform_fee_flat, net_revenue)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, entry);
    }

    // ── 10. Margin snapshot ───────────────────────────────────────────────────
    // Actual current state: 35% food cost on food items, 23% on bar
    const totalRevenue   = 71000.00;
    const foodRevenue    = 33000.00;
    const barRevenue     = 38000.00;
    const foodCOGS       = foodRevenue * 0.35;   // 35% actual
    const barCOGS        = barRevenue  * 0.23;   // 23% (vendor overcharges on spirits)
    const totalCOGS      = foodCOGS + barCOGS;
    const platformFees   = 0;                     // no delivery platforms
    const grossMargin    = totalRevenue - totalCOGS - platformFees;
    const grossMarginPct = (grossMargin / totalRevenue) * 100;

    await client.query(`
      INSERT INTO margin_snapshots
        (restaurant_id, snapshot_date, total_revenue, total_cogs, total_platform_fees,
         gross_margin_pct, net_margin_pct, food_cost_pct, delivery_mix_pct, health_score)
      VALUES ($1,CURRENT_DATE,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (restaurant_id, snapshot_date) DO UPDATE
        SET total_revenue=$2, total_cogs=$3, gross_margin_pct=$5, health_score=$9
    `, [
      restaurantId, totalRevenue, totalCOGS, platformFees,
      parseFloat(grossMarginPct.toFixed(1)),
      parseFloat((grossMarginPct - 8).toFixed(1)),   // net after labor/overhead
      35.0,   // food cost pct (above 30% target)
      0.0,    // 0% delivery — core gap
      62      // health score: profitable but leaving money on the table
    ]);

    // ── 11. Margin alerts (pre-seeded from due diligence analysis) ────────────
    const alerts = [
      {
        type: 'vendor_overcharge',
        severity: 'critical',
        title: 'US Foods Mozzarella 18.4% Above Market',
        description: 'Paying $4.50/lb to US Foods vs $3.80/lb market benchmark (Baldor Specialty Foods). Affects all 4 pizza SKUs. Verified across 10 invoices.',
        item: 'Mozzarella Cheese',
        impact: 890.00,
        confidence: 0.97,
        rec: 'Request price match from US Foods or shift mozzarella order to Baldor ($3.85/lb). Savings: ~$0.65/lb × ~1,200 lbs/month = $780–$890/mo.'
      },
      {
        type: 'recipe_cost_drift',
        severity: 'high',
        title: 'Pub Burger at 40% Food Cost (Target: 30%)',
        description: 'Ground beef from US Foods at $4.50/lb drives Pub Burger to 40% food cost vs 30% target. At 360 covers/month this generates $1,200/mo in negative margin variance.',
        item: 'Pub Burger',
        impact: 1200.00,
        confidence: 0.94,
        rec: 'Option A: Reprice to $15.99 (+$2). Option B: Reduce patty to 5oz (from 6.4oz). Option C: Source beef from NE Produce Co. co-op at $4.20/lb.'
      },
      {
        type: 'recipe_cost_drift',
        severity: 'high',
        title: 'Wings at 36.3% Cost — Chicken Price Inflation',
        description: 'Chicken wings up 18.8% from US Foods ($2.40→$2.85/lb). Buffalo Wings (12 pcs) at $15.99 now generates 36.3% food cost, above 30% target. 300 portions/month × $0.97 overage = $291/mo in lost margin.',
        item: 'Buffalo Wings (12 pcs)',
        impact: 680.00,
        confidence: 0.91,
        rec: 'Source wings directly from Boston Poultry (617-555-0192) at $2.45/lb. Alternatively, add 2-piece option at $8.99 to drive mix shift.'
      },
      {
        type: 'order_inefficiency',
        severity: 'medium',
        title: 'US Foods Order Fragmentation — Missing Volume Discount',
        description: '10 orders over 90 days averaging $420 (below $600 volume threshold). US Foods offers 3% rebate on orders ≥$600. Consolidating to bi-weekly orders qualifies for $380/mo in discounts.',
        item: 'US Foods',
        impact: 380.00,
        confidence: 0.88,
        rec: 'Consolidate 10 weekly orders into 4 bi-weekly orders (avg $1,050/order). Call rep Dave Caruso to document the discount program and confirm eligibility.'
      }
    ];

    const alertIds = {};
    for (const a of alerts) {
      const { rows: [alert] } = await client.query(`
        INSERT INTO margin_alerts
          (restaurant_id, alert_type, severity, title, description,
           affected_item, financial_impact_monthly, confidence_score,
           status, ai_recommendation, reasoning_lineage)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10)
        RETURNING id
      `, [
        restaurantId, a.type, a.severity, a.title, a.description,
        a.item, a.impact, a.confidence, a.rec,
        JSON.stringify({ source: 'due_diligence_analysis', restaurant: "Mickey Malone's" })
      ]);
      alertIds[a.type + '_' + a.item] = alert.id;
    }

    // ── 12. Procurement recommendations ──────────────────────────────────────
    const recs = [
      {
        alert_key: 'vendor_overcharge_Mozzarella Cheese',
        category: 'vendor_switch',
        title: 'Switch Mozzarella to Baldor Specialty Foods',
        description: "Baldor quotes $3.85/lb vs US Foods $4.50/lb for the same Grande Whole Milk Mozzarella. Zero recipe changes required — same spec, lower cost.",
        steps: [
          { step: 1, action: 'Call Baldor account rep at (800) 227-2370', timeline: 'Day 1' },
          { step: 2, action: 'Request sample case of Grande Whole Milk Mozzarella 6/5lb', timeline: 'Day 2-3' },
          { step: 3, action: 'Taste test and confirm spec match with kitchen', timeline: 'Day 4-5' },
          { step: 4, action: 'Place first Baldor order and discontinue US Foods mozzarella', timeline: 'Day 7' },
          { step: 5, action: 'Benchmark quarterly — hold Baldor to ≤$4.00/lb', timeline: 'Ongoing' }
        ],
        savings: 890.00,
        effort: 'low',
        payback: 7
      },
      {
        alert_key: 'recipe_cost_drift_Pub Burger',
        category: 'menu_repricing',
        title: 'Reprice Pub Burger to $15.99',
        description: "At $13.99 the Pub Burger loses $1.63/plate vs target. Repricing to $15.99 brings food cost to 30.7% while staying $2 below competitors (avg $17.99 in Brockton).",
        steps: [
          { step: 1, action: 'Update menu board and Clover POS to $15.99', timeline: 'Day 1' },
          { step: 2, action: 'Update any printed menus or table cards', timeline: 'Day 1' },
          { step: 3, action: 'Monitor sales velocity for 2 weeks — track any drop-off', timeline: 'Day 1-14' },
          { step: 4, action: 'If volume drops >15%, run limited-time $1 off promotion on Tuesdays', timeline: 'Day 14' }
        ],
        savings: 1200.00,
        effort: 'low',
        payback: 1
      },
      {
        alert_key: 'recipe_cost_drift_Buffalo Wings (12 pcs)',
        category: 'vendor_switch',
        title: 'Source Chicken Wings Direct from Boston Poultry Co-op',
        description: "Boston area poultry co-op pricing is $2.45/lb vs US Foods $2.85/lb. For ~800 lbs/month, this saves $320/mo on wings alone. NE Produce also stocks wings at $2.55/lb.",
        steps: [
          { step: 1, action: 'Request quote from Boston Poultry Co-op (617-555-0192)', timeline: 'Day 1' },
          { step: 2, action: 'Confirm fresh (not frozen) spec — kitchen preference check', timeline: 'Day 2' },
          { step: 3, action: 'Split first order: 50% Boston Poultry, 50% US Foods for 2 weeks', timeline: 'Week 1-2' },
          { step: 4, action: 'Full switch to lowest cost supplier if quality passes', timeline: 'Week 3' }
        ],
        savings: 680.00,
        effort: 'low',
        payback: 14
      },
      {
        alert_key: 'order_inefficiency_US Foods',
        category: 'procurement_optimization',
        title: 'Consolidate US Foods to Bi-Weekly Orders',
        description: "Moving from ~weekly ad-hoc orders (avg $420) to scheduled bi-weekly orders (avg $1,050) unlocks US Foods' 3% volume rebate. Rep Dave Caruso has confirmed eligibility.",
        steps: [
          { step: 1, action: 'Set recurring US Foods order day: Tuesday & Friday', timeline: 'Day 1' },
          { step: 2, action: 'Build a par-level sheet for dry goods and dairy', timeline: 'Day 1-2' },
          { step: 3, action: 'Call Dave Caruso to document the rebate and apply retroactively if possible', timeline: 'Day 2' },
          { step: 4, action: 'Track order totals in US Foods portal — confirm ≥$600/order', timeline: 'Ongoing' }
        ],
        savings: 380.00,
        effort: 'low',
        payback: 14
      }
    ];

    for (const r of recs) {
      const alertId = alertIds[r.alert_key] || null;
      await client.query(`
        INSERT INTO procurement_recommendations
          (restaurant_id, alert_id, category, title, description, action_steps,
           potential_monthly_savings, implementation_effort, payback_days,
           confidence_score, status, reasoning_lineage)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0.92,'pending',$10)
      `, [
        restaurantId, alertId, r.category, r.title, r.description,
        JSON.stringify(r.steps), r.savings, r.effort, r.payback,
        JSON.stringify({ source: 'due_diligence_analysis', acquisition_target: true })
      ]);
    }

    // ── 13. Ingredient price history — 18 months of mozzarella & wing costs ──
    const historyItems = [
      // [ingredient, vendor, months_back, price, source]
      // Mozzarella: gradual 18.4% creep from US Foods
      ['Mozzarella Cheese',  usfoodsId, 18, 3.80, 'invoice'],
      ['Mozzarella Cheese',  usfoodsId, 15, 3.90, 'invoice'],
      ['Mozzarella Cheese',  usfoodsId, 12, 4.00, 'invoice'],
      ['Mozzarella Cheese',  usfoodsId,  9, 4.15, 'invoice'],
      ['Mozzarella Cheese',  usfoodsId,  6, 4.30, 'invoice'],
      ['Mozzarella Cheese',  usfoodsId,  3, 4.45, 'invoice'],
      ['Mozzarella Cheese',  usfoodsId,  0, 4.50, 'invoice'],
      // Chicken wings: spike after H5N1 scare
      ['Chicken Wings',      usfoodsId, 18, 2.20, 'invoice'],
      ['Chicken Wings',      usfoodsId, 15, 2.25, 'invoice'],
      ['Chicken Wings',      usfoodsId, 12, 2.30, 'invoice'],
      ['Chicken Wings',      usfoodsId,  9, 2.40, 'invoice'],
      ['Chicken Wings',      usfoodsId,  6, 2.55, 'invoice'],
      ['Chicken Wings',      usfoodsId,  3, 2.72, 'invoice'],
      ['Chicken Wings',      usfoodsId,  0, 2.85, 'invoice'],
      // Jameson: spirits inflation
      ['Jameson Irish Whiskey', republicId, 18, 15.50, 'invoice'],
      ['Jameson Irish Whiskey', republicId, 12, 16.80, 'invoice'],
      ['Jameson Irish Whiskey', republicId,  6, 17.80, 'invoice'],
      ['Jameson Irish Whiskey', republicId,  0, 18.50, 'invoice'],
    ];

    for (const [name, vendorId, monthsBack, price, source] of historyItems) {
      const recordDate = new Date(Date.now() - monthsBack * 30 * 86400000)
        .toISOString().slice(0, 10);
      await client.query(`
        INSERT INTO ingredient_price_history
          (ingredient_id, vendor_id, price, recorded_date, source)
        VALUES ($1,$2,$3,$4,$5)
      `, [ingrs[name], vendorId, price, recordDate, source]);
    }

    await client.query('COMMIT');

    return {
      success: true,
      restaurant_id: restaurantId,
      restaurant_name: "Mickey Malone's Tavern",
      location: '347 N Pearl St, Brockton, MA 02301',
      monthly_revenue: 71000,
      annual_revenue: 852000,
      total_monthly_leakage: 3150,
      annual_leakage: 37800,
      alerts_seeded: alerts.length,
      recommendations_seeded: recs.length,
      vendors: 5,
      ingredients: ingrList.length,
      recipes: recipeData.length,
      acquisition_context: {
        target: "Mickey Malone's Tavern",
        acquirer_prospect: 'Kona Equity',
        platform_fit: ['Clover', 'Toast', 'DoorDash'],
        untapped_delivery_revenue: '~$8,400/month (12% of revenue at 0% delivery mix)'
      }
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { seedMickeyMalonesData };
