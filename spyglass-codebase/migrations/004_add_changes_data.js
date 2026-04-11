/**
 * Migration: Add changes_data JSONB column to daily_briefs
 * Enables structured Markdown export from competitive briefs
 */
module.exports = {
  name: '004_add_changes_data',
  up: async (client) => {
    await client.query(`
      ALTER TABLE daily_briefs
      ADD COLUMN IF NOT EXISTS changes_data JSONB DEFAULT NULL
    `);
  }
};
