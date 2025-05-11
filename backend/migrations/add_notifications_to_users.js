import sequelize from '../db.js';

export async function up() {
  try {
    await sequelize.query(`
      ALTER TABLE "Users"
      ADD COLUMN IF NOT EXISTS "notifications" BOOLEAN NOT NULL DEFAULT true;
    `);
    console.log('Migration up completed successfully');
  } catch (error) {
    console.error('Error in migration up:', error);
    throw error;
  }
}

export async function down() {
  try {
    await sequelize.query(`
      ALTER TABLE "Users"
      DROP COLUMN IF EXISTS "notifications";
    `);
    console.log('Migration down completed successfully');
  } catch (error) {
    console.error('Error in migration down:', error);
    throw error;
  }
} 