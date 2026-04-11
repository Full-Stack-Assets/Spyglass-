/**
 * Migration 011: Vertical Temperature Calibration
 *
 * Adds `vertical` column to the `scans` table so that async scan jobs
 * can carry vertical context for LLM temperature selection.
 *
 * Also adds `vertical_temperature` tracking to scans for audit/cost attribution.
 *
 * v2.2: Per-vertical temperature calibration
 *   - InsurTech (T=0.1): geo-risk/contagion, zero hallucination tolerance
 *   - MedTech (T=0.1):   regulatory/FDA, 1:1 attribution
 *   - Security (T=0.2):  analytical grounding
 *   - FinOps (T=0.1):    math/COGS precision
 *   - Support/CX (T=0.4): higher-level strategic inference allowed
 *   - Talent/Comp (T=0.3): read between the lines of job descriptions
 */

exports.up = async (pool) => {
  // Add vertical column to scans table
  await pool.query(`
    ALTER TABLE scans
    ADD COLUMN IF NOT EXISTS vertical VARCHAR(100) DEFAULT NULL
  `);

  // Add vertical_temperature for audit trail (what temperature was actually used)
  await pool.query(`
    ALTER TABLE scans
    ADD COLUMN IF NOT EXISTS vertical_temperature NUMERIC(3,1) DEFAULT NULL
  `);

  // Index for querying scans by vertical (analytics)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_scans_vertical
    ON scans (vertical)
    WHERE vertical IS NOT NULL
  `);

  console.log('[Migration 011] Added vertical + vertical_temperature columns to scans table');
};

exports.down = async (pool) => {
  await pool.query(`DROP INDEX IF EXISTS idx_scans_vertical`);
  await pool.query(`ALTER TABLE scans DROP COLUMN IF EXISTS vertical`);
  await pool.query(`ALTER TABLE scans DROP COLUMN IF EXISTS vertical_temperature`);
};
