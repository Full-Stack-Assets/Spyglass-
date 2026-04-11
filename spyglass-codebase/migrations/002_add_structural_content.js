module.exports = {
  name: 'add_structural_content',
  up: async (client) => {
    // Add structural_content column to page_snapshots (stores simplified HTML skeleton)
    await client.query(`
      ALTER TABLE page_snapshots
      ADD COLUMN IF NOT EXISTS structural_content TEXT
    `);

    // Add structural_hash for quick structural change detection
    await client.query(`
      ALTER TABLE page_snapshots
      ADD COLUMN IF NOT EXISTS structural_hash VARCHAR(64)
    `);

    // Add structural_diff to detected_changes (stores structural change details)
    await client.query(`
      ALTER TABLE detected_changes
      ADD COLUMN IF NOT EXISTS structural_diff TEXT
    `);

    // Add structural_changes array (JSON of categorized structural changes)
    await client.query(`
      ALTER TABLE detected_changes
      ADD COLUMN IF NOT EXISTS structural_changes JSONB
    `);
  }
};
