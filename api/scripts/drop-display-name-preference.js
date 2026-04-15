const { Client } = require('pg');

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    'postgresql://postgres:utm123@localhost:5432/pravels_dev?schema=public';

  const c = new Client({ connectionString });
  await c.connect();

  await c.query('DROP TYPE IF EXISTS "DisplayNamePreference"');
  console.log('Dropped type DisplayNamePreference (if existed).');

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
