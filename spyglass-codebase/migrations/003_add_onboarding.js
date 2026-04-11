module.exports = {
  name: 'add_onboarding_completed',
  up: async (client) => {
    // Add the column with default false
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false
    `);

    // Auto-complete onboarding for existing users who already have competitors set up
    // (so they don't see the wizard after a deploy)
    await client.query(`
      UPDATE users u
        SET onboarding_completed = true
      WHERE EXISTS (
        SELECT 1 FROM competitors c WHERE c.user_id = u.id AND c.active = true
      )
    `);
  }
};
