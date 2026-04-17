const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const c = new Client({ connectionString });
  await c.connect();

  const before = await c.query(
    'select count(*)::int as n from "user_profiles" where "birthDate" is null',
  );

  const updated = await c.query(
    'update "user_profiles" u set "birthDate" = r."birthDate" from "registration_requests" r where u."birthDate" is null and u."email" = r."email" and r."birthDate" is not null',
  );

  const after = await c.query(
    'select count(*)::int as n from "user_profiles" where "birthDate" is null',
  );

  console.log('user_profiles.birthDate NULL before:', before.rows[0].n);
  console.log('rows updated:', updated.rowCount);
  console.log('user_profiles.birthDate NULL after:', after.rows[0].n);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
