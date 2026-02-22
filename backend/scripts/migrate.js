import { runMigrations, getDb, DB_FILE } from '../src/db.js';

async function main() {
  await runMigrations();
  const db = await getDb();

  const usersCount = await db.get('SELECT COUNT(*) AS total FROM users');
  const responsesCount = await db.get('SELECT COUNT(*) AS total FROM user_item_responses');
  const recommendationsCount = await db.get('SELECT COUNT(*) AS total FROM user_major_recommendations');

  console.log(`Migration complete: ${DB_FILE}`);
  console.log(`users: ${Number(usersCount?.total || 0)}`);
  console.log(`user_item_responses: ${Number(responsesCount?.total || 0)}`);
  console.log(`user_major_recommendations: ${Number(recommendationsCount?.total || 0)}`);
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
