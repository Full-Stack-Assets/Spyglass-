/**
 * Migration 012: Upstream Procurement & Margin-Leak Detection Schema
 *
 * Adds the full restaurant supply-chain intelligence layer:
 *
 *   restaurants → vendors → ingredients → vendor_prices
 *   restaurants → recipes → recipe_ingredients
 *   restaurants → purchase_orders → purchase_order_items
 *   restaurants → sales_data
 *   restaurants → margin_snapshots
 *   restaurants → margin_alerts          ← autonomous leak detection output
 *   restaurants → procurement_recommendations ← AI action items
 *   ingredient_price_history              ← trend analysis & benchmarking
 *
 * Designed for acquisition by Toast / DoorDash / Clover:
 *   - Toast:     POS-native COGS intelligence → retention hook
 *   - DoorDash:  Delivery margin erosion detection → reduces partner churn
 *   - Clover:    Supply-chain + payments = complete restaurant OS
 *
 * Strategy: fully additive — zero changes to existing tables.
 */

module.exports = {
  name: 'procurement_margin_schema',
  up: async (client) => {

    // ── 1. restaurants — multi-location profiles anchored to an org ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id                   UUID REFERENCES organizations(id) ON DELETE SET NULL,
        name                     TEXT NOT NULL,
        slug                     TEXT UNIQUE NOT NULL,
        cuisine_type             TEXT,
        location                 TEXT,
        monthly_revenue_estimate DECIMAL(12,2),
        target_food_cost_pct     DECIMAL(5,2) DEFAULT 28.0,
        pos_system               TEXT DEFAULT 'unknown',
        delivery_platforms       TEXT[] DEFAULT '{}',
        metadata                 JSONB DEFAULT '{}',
        created_at               TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 2. vendors — ingredient suppliers ────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        name                  TEXT NOT NULL,
        category              TEXT NOT NULL,
        payment_terms         TEXT DEFAULT 'net30',
        lead_time_days        INTEGER DEFAULT 2,
        minimum_order_value   DECIMAL(10,2),
        reliability_score     DECIMAL(3,2) DEFAULT 0.95,
        rep_name              TEXT,
        rep_email             TEXT,
        metadata              JSONB DEFAULT '{}',
        created_at            TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 3. ingredients — catalog with live market pricing ────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id         UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        name                  TEXT NOT NULL,
        category              TEXT NOT NULL,
        unit                  TEXT NOT NULL,
        current_market_price  DECIMAL(10,4),
        price_updated_at      TIMESTAMPTZ,
        yield_factor          DECIMAL(4,3) DEFAULT 1.00,
        metadata              JSONB DEFAULT '{}',
        created_at            TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 4. vendor_prices — per-vendor pricing (enables benchmarking) ─────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_prices (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id         UUID REFERENCES vendors(id) ON DELETE CASCADE,
        ingredient_id     UUID REFERENCES ingredients(id) ON DELETE CASCADE,
        price_per_unit    DECIMAL(10,4) NOT NULL,
        minimum_order_qty DECIMAL(10,2),
        effective_date    DATE NOT NULL DEFAULT CURRENT_DATE,
        invoice_ref       TEXT,
        created_at        TIMESTAMPTZ DEFAULT now(),
        UNIQUE(vendor_id, ingredient_id, effective_date)
      )
    `);

    // ── 5. recipes — menu items with pricing & cost targets ──────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id        UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        name                 TEXT NOT NULL,
        menu_category        TEXT NOT NULL,
        menu_price           DECIMAL(10,2) NOT NULL,
        target_food_cost_pct DECIMAL(5,2),
        active               BOOLEAN DEFAULT true,
        available_channels   TEXT[] DEFAULT '{dine_in,takeout,delivery}',
        metadata             JSONB DEFAULT '{}',
        created_at           TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 6. recipe_ingredients — ingredient composition per recipe ─────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipe_id      UUID REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id  UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity       DECIMAL(10,4) NOT NULL,
        unit           TEXT NOT NULL,
        waste_factor   DECIMAL(4,3) DEFAULT 0.05
      )
    `);

    // ── 7. purchase_orders — historical & upcoming vendor orders ─────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id  UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        vendor_id      UUID REFERENCES vendors(id) ON DELETE RESTRICT,
        order_date     DATE NOT NULL,
        delivery_date  DATE,
        status         TEXT DEFAULT 'delivered',
        total_amount   DECIMAL(12,2),
        invoice_number TEXT,
        metadata       JSONB DEFAULT '{}',
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 8. purchase_order_items — line items per order ────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_order_id  UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
        ingredient_id      UUID REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity           DECIMAL(10,2) NOT NULL,
        unit               TEXT NOT NULL,
        unit_price         DECIMAL(10,4) NOT NULL,
        line_total         DECIMAL(12,2),
        variance_flag      BOOLEAN DEFAULT false,
        variance_pct       DECIMAL(6,2)
      )
    `);

    // ── 9. sales_data — POS integration (Toast / Clover / Square hook) ────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_data (
        id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id           UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        sale_date               DATE NOT NULL,
        recipe_id               UUID REFERENCES recipes(id) ON DELETE SET NULL,
        quantity_sold           INTEGER NOT NULL DEFAULT 0,
        sale_price              DECIMAL(10,2) NOT NULL,
        channel                 TEXT DEFAULT 'dine_in',
        platform_commission_pct DECIMAL(5,2) DEFAULT 0,
        platform_fee_flat       DECIMAL(10,2) DEFAULT 0,
        net_revenue             DECIMAL(12,2),
        created_at              TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 10. margin_snapshots — rolling margin health (daily roll-up) ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS margin_snapshots (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id       UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        snapshot_date       DATE NOT NULL,
        total_revenue       DECIMAL(12,2),
        total_cogs          DECIMAL(12,2),
        total_platform_fees DECIMAL(12,2) DEFAULT 0,
        gross_margin_pct    DECIMAL(5,2),
        net_margin_pct      DECIMAL(5,2),
        food_cost_pct       DECIMAL(5,2),
        delivery_mix_pct    DECIMAL(5,2),
        health_score        INTEGER DEFAULT 0 CHECK (health_score BETWEEN 0 AND 100),
        calculated_at       TIMESTAMPTZ DEFAULT now(),
        metadata            JSONB DEFAULT '{}',
        UNIQUE(restaurant_id, snapshot_date)
      )
    `);

    // ── 11. margin_alerts — autonomous margin leak detection output ───────────
    //
    //   alert_type values:
    //     vendor_overcharge   paying above market benchmark
    //     recipe_cost_drift   ingredient cost rose, menu price unchanged
    //     delivery_erosion    delivery commission vs dine-in margin gap
    //     waste_spike         food waste above par
    //     order_inefficiency  fragmented orders missing volume discounts
    //     portion_variance    actual vs theoretical food cost drift
    //     single_vendor_risk  concentration risk / pricing monopoly
    //     menu_price_lag      menu price below break-even at current COGS
    await client.query(`
      CREATE TABLE IF NOT EXISTS margin_alerts (
        id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id            UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        alert_type               TEXT NOT NULL,
        severity                 TEXT DEFAULT 'medium' CHECK (severity IN ('critical','high','medium','low')),
        title                    TEXT NOT NULL,
        description              TEXT NOT NULL,
        affected_item            TEXT,
        financial_impact_monthly DECIMAL(12,2),
        confidence_score         DECIMAL(3,2) DEFAULT 0.90 CHECK (confidence_score BETWEEN 0 AND 1),
        status                   TEXT DEFAULT 'active' CHECK (status IN ('active','acknowledged','resolved','dismissed')),
        ai_recommendation        TEXT,
        reasoning_lineage        JSONB DEFAULT '{}',
        detected_at              TIMESTAMPTZ DEFAULT now(),
        resolved_at              TIMESTAMPTZ,
        metadata                 JSONB DEFAULT '{}'
      )
    `);

    // ── 12. procurement_recommendations — AI action items with ROI ───────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS procurement_recommendations (
        id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id             UUID REFERENCES restaurants(id) ON DELETE CASCADE,
        alert_id                  UUID REFERENCES margin_alerts(id) ON DELETE SET NULL,
        category                  TEXT NOT NULL,
        title                     TEXT NOT NULL,
        description               TEXT NOT NULL,
        action_steps              JSONB DEFAULT '[]',
        potential_monthly_savings DECIMAL(12,2),
        implementation_effort     TEXT DEFAULT 'low' CHECK (implementation_effort IN ('low','medium','high')),
        payback_days              INTEGER,
        confidence_score          DECIMAL(3,2) DEFAULT 0.90,
        status                    TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','in_progress','completed','dismissed')),
        reasoning_lineage         JSONB DEFAULT '{}',
        created_at                TIMESTAMPTZ DEFAULT now(),
        metadata                  JSONB DEFAULT '{}'
      )
    `);

    // ── 13. ingredient_price_history — trend analysis & benchmarking ──────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ingredient_price_history (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ingredient_id  UUID REFERENCES ingredients(id) ON DELETE CASCADE,
        vendor_id      UUID REFERENCES vendors(id) ON DELETE SET NULL,
        price          DECIMAL(10,4) NOT NULL,
        recorded_date  DATE NOT NULL,
        source         TEXT DEFAULT 'invoice',
        created_at     TIMESTAMPTZ DEFAULT now()
      )
    `);

    // ── 14. Performance indices ──────────────────────────────────────────────
    await client.query(`CREATE INDEX IF NOT EXISTS idx_restaurants_org        ON restaurants(org_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendors_restaurant     ON vendors(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ingredients_restaurant ON ingredients(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendor_prices_vendor   ON vendor_prices(vendor_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vendor_prices_ingr     ON vendor_prices(ingredient_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recipes_restaurant     ON recipes(restaurant_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_restaurant_date  ON sales_data(restaurant_id, sale_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_channel          ON sales_data(channel)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_po_restaurant_date     ON purchase_orders(restaurant_id, order_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_margin_snapshots_date  ON margin_snapshots(restaurant_id, snapshot_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_margin_alerts_status   ON margin_alerts(restaurant_id, status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_margin_alerts_type     ON margin_alerts(alert_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_price_history_ingr     ON ingredient_price_history(ingredient_id, recorded_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_recs_restaurant        ON procurement_recommendations(restaurant_id, status)`);

    console.log('[Migration 012] Upstream Procurement & Margin-Leak schema installed.');
    console.log('[Migration 012] 13 new tables: restaurants, vendors, ingredients, vendor_prices,');
    console.log('[Migration 012]   recipes, recipe_ingredients, purchase_orders, purchase_order_items,');
    console.log('[Migration 012]   sales_data, margin_snapshots, margin_alerts,');
    console.log('[Migration 012]   procurement_recommendations, ingredient_price_history');
  }
};
