/**
 * Smoke test Visit RW3 flows (schema, create, admin detail).
 * Run: npx tsx script/visitrw3-flow-check.ts
 */
import "dotenv/config";
import { db } from "../server/db";
import { pemilikKost } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  ensureVisitrw3Schema,
  createPengajuanBaru,
  getPengajuanDetailAdmin,
  getStatusByNomor,
  listPengajuanAdmin,
} from "../server/visitrw3";

function randomNik() {
  const t = String(Date.now()).slice(-12);
  return `32${t}0001`.slice(0, 16);
}

async function main() {
  const results: { name: string; ok: boolean; err?: string }[] = [];

  try {
    await ensureVisitrw3Schema();
    results.push({ name: "schema", ok: true });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    results.push({ name: "schema", ok: false, err });
    console.error(results);
    process.exit(1);
  }

  const kostTinggal = await db.select().from(pemilikKost).where(eq(pemilikKost.izinTinggal, true)).limit(1);
  const kostBisnis = await db.select().from(pemilikKost).where(eq(pemilikKost.izinBisnis, true)).limit(1);

  const baseBayar = {
    tanggalBayar: "2026-06-01",
    terminBulan: 3,
    nomorUnit: "U-TEST",
    catatanPemohon: "Smoke test otomatis",
    setujuTataTertib: true as const,
  };

  if (kostTinggal[0]) {
    const nik = randomNik();
    try {
      const p = await createPengajuanBaru({
        keperluanPengajuan: "tinggal",
        rt: kostTinggal[0].rt,
        pemilikKostId: kostTinggal[0].id,
        jumlahPenghuni: 1,
        ...baseBayar,
        penghuni: [
          {
            namaLengkap: "Test Tinggal",
            tanggalLahir: "1990-01-01",
            isAnak: false,
            nik,
            nomorWhatsapp: "081234567890",
            jenisKelamin: "Laki-laki",
            pekerjaan: "Karyawan",
            keperluanTinggal: "Kerja",
            namaTempatKerja: "PT Test",
            namaSekolah: null,
            punyaKendaraan: false,
            jenisKendaraan: null,
            platNomor: null,
            fotoKtpPath: "/uploads/visitrw3-ktp/test.jpg",
          },
        ],
      });
      const detail = await getPengajuanDetailAdmin(p.id);
      const status = await getStatusByNomor(p.nomorVisitrw3);
      results.push({ name: "tinggal", ok: Boolean(detail && status) });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      results.push({ name: "tinggal", ok: false, err });
    }
  } else {
    results.push({ name: "tinggal", ok: false, err: "no kost izin tinggal (aktif)" });
  }

  if (kostBisnis[0]) {
    const nik = randomNik();
    try {
      const p = await createPengajuanBaru({
        keperluanPengajuan: "bisnis",
        rt: kostBisnis[0].rt,
        pemilikKostId: kostBisnis[0].id,
        tinggalDiWilayahRw3: true,
        namaUsaha: "Warung Test",
        jenisTempatUsaha: "kiosk",
        penanggungJawab: "PJ Bisnis Dalam",
        jumlahPenghuni: 1,
        ...baseBayar,
        penghuni: [
          {
            namaLengkap: "PJ Bisnis Dalam",
            tanggalLahir: "1985-05-05",
            isAnak: false,
            nik,
            nomorWhatsapp: "081234567891",
            jenisKelamin: "Perempuan",
            pekerjaan: "Wiraswasta",
            keperluanTinggal: null,
            namaTempatKerja: "Warung Test",
            namaSekolah: null,
            punyaKendaraan: false,
            fotoKtpPath: "/uploads/visitrw3-ktp/test.jpg",
          },
        ],
      });
      const detail = await getPengajuanDetailAdmin(p.id);
      results.push({ name: "bisnis_dalam", ok: Boolean(detail?.pengajuan.namaUsaha) });
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      results.push({ name: "bisnis_dalam", ok: false, err });
    }
  } else {
    results.push({ name: "bisnis_dalam", ok: false, err: "no kost izin bisnis (aktif)" });
  }

  const nikLuar = randomNik();
  try {
    const p = await createPengajuanBaru({
      keperluanPengajuan: "bisnis",
      rt: kostTinggal[0]?.rt ?? kostBisnis[0]?.rt ?? 1,
      pemilikKostId: null,
      tinggalDiWilayahRw3: false,
      namaUsaha: "Lapak Luar",
      jenisTempatUsaha: "lapak",
      penanggungJawab: "PJ Luar",
      jamBuka: "08:00",
      jamTutup: "21:00",
      alamatUsaha: "Jl. Test No. 1",
      jumlahPenghuni: 1,
      ...baseBayar,
      penghuni: [
        {
          namaLengkap: "PJ Luar",
          tanggalLahir: "1988-03-03",
          isAnak: false,
          nik: nikLuar,
          nomorWhatsapp: "081234567892",
          pekerjaan: "Usaha",
          fotoKtpPath: "/uploads/visitrw3-ktp/test.jpg",
        },
      ],
    });
    const detail = await getPengajuanDetailAdmin(p.id);
    results.push({
      name: "bisnis_luar",
      ok: Boolean(detail?.pengajuan.jamBuka && detail.pengajuan.pemilikKostId == null),
    });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    results.push({ name: "bisnis_luar", ok: false, err });
  }

  try {
    const list = await listPengajuanAdmin("menunggu_survey");
    results.push({ name: "admin_list", ok: Array.isArray(list) });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    results.push({ name: "admin_list", ok: false, err });
  }

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  const skipProperty = failed.every((r) => r.err?.includes("no kost"));
  if (skipProperty && failed.length > 0 && failed.length < results.length) {
    console.log("Catatan: beberapa tes butuh properti aktif (izin tinggal/bisnis). Jalankan setelah ada properti disetujui.");
    process.exit(0);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
