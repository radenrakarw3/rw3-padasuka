import "dotenv/config";
import pg from "pg";

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL harus tersedia");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
});

async function getDuplicates() {
  const { rows } = await client.query(`
    with dup_warga as (
      select 'warga'::text as kind, warga_id::text as owner_key, count(*)::int as total
      from rwcoin_wallet
      where warga_id is not null
      group by warga_id
      having count(*) > 1
    ),
    dup_mitra as (
      select 'mitra'::text as kind, mitra_id::text as owner_key, count(*)::int as total
      from rwcoin_wallet
      where mitra_id is not null
      group by mitra_id
      having count(*) > 1
    ),
    dup_kode as (
      select 'kode_wallet'::text as kind, kode_wallet::text as owner_key, count(*)::int as total
      from rwcoin_wallet
      group by kode_wallet
      having count(*) > 1
    )
    select * from dup_warga
    union all
    select * from dup_mitra
    union all
    select * from dup_kode
    order by kind, owner_key
  `);
  return rows;
}

async function getWalletIndexes() {
  const { rows } = await client.query(`
    select indexname, indexdef
    from pg_indexes
    where schemaname = 'public' and tablename = 'rwcoin_wallet'
    order by indexname
  `);
  return rows;
}

async function applyIndexes() {
  await client.query(`
    create unique index if not exists rwcoin_wallet_warga_unique
      on public.rwcoin_wallet (warga_id)
  `);
  await client.query(`
    create unique index if not exists rwcoin_wallet_mitra_unique
      on public.rwcoin_wallet (mitra_id)
  `);
}

async function main() {
  await client.connect();

  const beforeIndexes = await getWalletIndexes();
  const duplicates = await getDuplicates();

  console.log("Existing rwcoin_wallet indexes:");
  console.log(JSON.stringify(beforeIndexes, null, 2));

  if (duplicates.length > 0) {
    console.error("Duplicate rwcoin_wallet data found. Patch dibatalkan.");
    console.error(JSON.stringify(duplicates, null, 2));
    process.exitCode = 1;
    return;
  }

  await applyIndexes();

  const afterIndexes = await getWalletIndexes();
  console.log("Updated rwcoin_wallet indexes:");
  console.log(JSON.stringify(afterIndexes, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => {});
  });
