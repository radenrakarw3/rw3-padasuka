import "dotenv/config";
import { db } from "../server/db";
import { wargaSinggah, visitrw3Penghuni, visitrw3Pengajuan, pemilikKost } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const ws = await db.select().from(wargaSinggah);
  console.log(`=== warga_singgah: ${ws.length}`);
  for (const r of ws) {
    console.log(
      `  [${r.id}] ${r.namaLengkap} | NIK ${r.nik} | kost#${r.pemilikKostId} | ${r.nomorVisitrw3 ?? "-"} | ${r.status}`,
    );
  }

  const vp = await db.select().from(visitrw3Penghuni);
  console.log(`\n=== visitrw3_penghuni (baris form): ${vp.length}`);
  for (const r of vp) {
    console.log(`  [${r.id}] pengajuan#${r.pengajuanId} | ${r.namaLengkap} | NIK ${r.nik ?? "-"}`);
  }

  const pg = await db.select().from(visitrw3Pengajuan);
  console.log(`\n=== visitrw3_pengajuan: ${pg.length}`);
  for (const r of pg) {
    console.log(`  [${r.id}] ${r.nomorVisitrw3} | ${r.status} | ${r.keperluanPengajuan} | kost#${r.pemilikKostId ?? "-"}`);
  }

  const pk = await db.select().from(pemilikKost);
  console.log(`\n=== pemilik_kost: ${pk.length}`);
  for (const r of pk) {
    console.log(`  [${r.id}] ${r.namaKost} | ${r.nomorPendaftaran ?? "-"} | ${r.statusProperti}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
