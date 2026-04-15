const { Client } = require('pg');

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:utm123@localhost:5432/pravels_dev?schema=public';

  const c = new Client({ connectionString });
  await c.connect();

  const cols = await c.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name='user_profiles' order by ordinal_position",
  );
  console.log('user_profiles columns:', cols.rows.map((r) => r.column_name));

  const migrations = await c.query(
    'select migration_name, finished_at, rolled_back_at from "_prisma_migrations" order by started_at',
  );
  console.log('migrations:', migrations.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
