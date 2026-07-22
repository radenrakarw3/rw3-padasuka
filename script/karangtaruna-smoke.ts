/**
 * Smoke test: form publik → DB → admin list/detail/update.
 * Jalankan: npx tsx script/karangtaruna-smoke.ts
 */
import "dotenv/config";
import {
  ensureKarangtarunaSchema,
  createAnggota,
  getStatusByNomor,
  listAnggotaAdmin,
  getAnggotaDetail,
  updateAnggotaAdmin,
  deleteAnggotaAdmin,
  daftarAnggotaSchema,
} from "../server/karangtaruna";

const samplePayload = {
  namaLengkap: "Pemuda Uji Coba KT",
  nik: null,
  rt: 7,
  alamat: "Jl. Smoke Test No. 1, RW 03",
  nomorWhatsapp: "081234567890",
  jenisKelamin: "Laki-laki",
  tanggalLahir: "2000-01-15",
  pendidikanTerakhir: "SMA / SMK",
  statusAktivitas: "mahasiswa",
  pekerjaan: "Mahasiswa",
  instagram: null,
  bidangKeahlian: ["Teknologi & IT", "Desain grafis"],
  ceritaSkill: "Bisa desain poster dan edit video untuk kegiatan pemuda RW.",
  pengalamanOrganisasi: "OSIS SMA",
  prestasi: null,
  bidangMinat: ["Digital & teknologi", "Seni & budaya"],
  harapanFasilitasi: "Ingin ada pelatihan desain dan wadah konten kreatif pemuda RW.",
  ketersediaanWaktu: "akhir_pekan",
  bersediaAktif: true,
  setuju: true as const,
};

async function main() {
  console.log("1. Schema...");
  await ensureKarangtarunaSchema();

  console.log("2. Validasi Zod (RT 07)...");
  const parsed = daftarAnggotaSchema.parse(samplePayload);
  if (parsed.rt !== 7) throw new Error("RT 07 gagal divalidasi");

  console.log("3. Tolak RT invalid...");
  let rejected = false;
  try {
    daftarAnggotaSchema.parse({ ...samplePayload, rt: 99 });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("RT 99 seharusnya ditolak");

  console.log("4. Create anggota (RT 07)...");
  const row = await createAnggota(samplePayload);
  console.log("   nomor:", row.nomorAnggota, "status:", row.statusKeanggotaan);

  console.log("5. Status publik by nomor...");
  const status = await getStatusByNomor(row.nomorAnggota);
  if (!status || status.namaLengkap !== samplePayload.namaLengkap) {
    throw new Error("getStatusByNomor gagal");
  }
  if (status.bidangKeahlian.length !== 2) {
    throw new Error("bidangKeahlian tidak ter-parse");
  }

  console.log("6. Admin list (status=baru)...");
  const baruList = await listAnggotaAdmin({ status: "baru" });
  const found = baruList.find((a) => a.id === row.id);
  if (!found) throw new Error("Anggota baru tidak muncul di admin list status=baru");
  if (found.rt !== 7) throw new Error("RT tidak cocok di admin list");

  console.log("7. Admin list filter RT 07...");
  const rt7 = await listAnggotaAdmin({ status: "baru", rt: 7 });
  if (!rt7.some((a) => a.id === row.id)) throw new Error("Filter RT 07 gagal");

  console.log("8. Admin detail...");
  const detail = await getAnggotaDetail(row.id);
  if (!detail?.ceritaSkill.includes("desain")) throw new Error("Detail admin tidak lengkap");

  console.log("9. Admin update → aktif...");
  const updated = await updateAnggotaAdmin(row.id, "smoke-test", {
    statusKeanggotaan: "aktif",
    potensiUnggulan: "Cocok jadi tim desain kegiatan RW.",
  });
  if (updated.statusKeanggotaan !== "aktif") throw new Error("Update status gagal");

  console.log("10. Admin list aktif...");
  const aktifList = await listAnggotaAdmin({ status: "aktif" });
  if (!aktifList.some((a) => a.id === row.id)) throw new Error("Tidak muncul di list aktif");

  console.log("11. Cleanup delete...");
  await deleteAnggotaAdmin(row.id);
  const gone = await getAnggotaDetail(row.id);
  if (gone != null) throw new Error("Delete gagal");

  console.log("\n✅ Semua smoke test Karang Taruna LULUS");
}

main().catch((e) => {
  console.error("\n❌ Smoke test GAGAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
