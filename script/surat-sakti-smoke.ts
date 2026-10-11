/**
 * Uji Surat Sakti v2.
 *
 *   npm run test:surat                         # uji murni: registry, validasi, PDF semua jenis (tanpa database)
 *   WILAYAH_TEST_DATABASE_URL=... npm run test:surat
 *                                              # + uji integrasi di database UJI yang sudah dimigrasi (0023–0025)
 *
 * PDF contoh ditulis ke tmp/surat-sakti-contoh/. Jangan arahkan ke database produksi.
 */
import fs from "fs";
import path from "path";

const DB_UJI = process.env.WILAYAH_TEST_DATABASE_URL;
process.env.DATABASE_URL = DB_UJI || "postgres://uji:uji@127.0.0.1:1/uji";

let lulus = 0;
let gagal = 0;
const gagalList: string[] = [];

async function uji(nama: string, fn: () => unknown | Promise<unknown>) {
  try {
    await fn();
    lulus++;
    console.log(`  ok  ${nama}`);
  } catch (e) {
    gagal++;
    gagalList.push(nama);
    console.log(`  GAGAL ${nama}\n        ${(e as Error).message}`);
  }
}

function pastikan(kondisi: unknown, pesan: string): asserts kondisi {
  if (!kondisi) throw new Error(pesan);
}

async function main() {
  const ss = await import("../shared/surat-sakti");
  const { contohData } = await import("../shared/surat-sakti/contoh");
  const { buatPdf } = await import("../server/surat-sakti/pdf");
  const keluar = path.join(process.cwd(), "tmp", "surat-sakti-contoh");
  fs.mkdirSync(keluar, { recursive: true });

  console.log("\n== Registry ==");
  await uji("kode unik & semua kelompok dikenal", () => {
    const kode = new Set<string>();
    for (const j of ss.KATALOG) {
      pastikan(!kode.has(j.kode), `kode ganda ${j.kode}`);
      kode.add(j.kode);
      for (const k of j.kelompok) pastikan(ss.KELOMPOK[k], `${j.kode}: kelompok ${k} tidak ada`);
    }
  });
  await uji("kategori A–F terisi dan 8 jenis lama terpetakan", async () => {
    for (const k of ["A", "B", "C", "D", "E", "F"]) pastikan(ss.KATALOG.some((j) => j.kategori === k), `kategori ${k} kosong`);
    const { JENIS_SURAT_RW } = await import("../shared/surat-nomor");
    for (const lama of JENIS_SURAT_RW) pastikan(ss.jenisDariLabelLama(lama), `jenis lama ${lama} tidak terpetakan`);
  });
  await uji("jumlah jenis ≥ 51", () => pastikan(ss.KATALOG.length >= 51, `hanya ${ss.KATALOG.length}`));

  console.log("\n== Redaksi ==");
  await uji("terbilang & rupiah", () => {
    pastikan(ss.terbilang(1_500_000) === "satu juta lima ratus ribu", ss.terbilang(1_500_000));
    pastikan(ss.terbilang(2026) === "dua ribu dua puluh enam", ss.terbilang(2026));
    pastikan(ss.terbilang(111) === "seratus sebelas", ss.terbilang(111));
    pastikan(ss.rupiahTerbilang(250000) === "Rp250.000 (dua ratus lima puluh ribu rupiah)", ss.rupiahTerbilang(250000));
  });
  await uji("hari/tanggal konsisten (12 Okt 2026 = Senin)", () => {
    pastikan(ss.hariTanggal("2026-10-12") === "Senin, 12 Oktober 2026", ss.hariTanggal("2026-10-12"));
    pastikan(ss.hariTanggalTerbilang("2026-10-12").startsWith("Pada hari Senin tanggal dua belas bulan Oktober"), "terbilang");
    pastikan(ss.urai("2026-02-30") === null, "tanggal tidak valid lolos");
  });

  console.log("\n== Validasi ==");
  await uji("kesepakatan tanpa konfirmasi para pihak ditolak", () => {
    const j = ss.PETA_JENIS.b_kesepakatan;
    const d = { ...contohData(j), konfirmasiPihak: false };
    const v = ss.validasiDokumen(j, d, { perihal: "Kesepakatan", tanggal: "2026-10-12" });
    pastikan(v.galat.some((g) => g.includes("dikonfirmasi")), "harus ditolak");
    pastikan(v.perluPemeriksaan, "harus perlu pemeriksaan");
  });
  await uji("penetapan tanpa dasar → perlu pemeriksaan, tidak bisa terbit", () => {
    const j = ss.PETA_JENIS.c_penetapan;
    const d = { ...contohData(j), dasar: [], sumberMusyawarah: "", dasarDiperiksa: false };
    const v = ss.validasiDokumen(j, d, { perihal: "Penetapan", tanggal: "2026-10-12" });
    pastikan(v.galat.length > 0 && v.perluPemeriksaan, "harus diblokir");
  });
  await uji("placeholder tersisa ditolak; kata sanksi diberi peringatan", () => {
    const j = ss.PETA_JENIS.b_imbauan;
    const v1 = ss.validasiDokumen(j, { ...contohData(j), kondisiDiamati: "Sampah di [isi lokasi]" }, { perihal: "Imbauan", tanggal: "2026-10-12" });
    pastikan(v1.galat.some((g) => g.includes("placeholder")), "placeholder lolos");
    const v2 = ss.validasiDokumen(j, { ...contohData(j), kondisiDiamati: "Akan dikenakan denda" }, { perihal: "Imbauan", tanggal: "2026-10-12" });
    pastikan(v2.peringatan.length > 0, "kata sanksi tanpa peringatan");
  });
  await uji("field wajib kosong ditolak", () => {
    const j = ss.PETA_JENIS.a_tugas;
    const v = ss.validasiDokumen(j, {}, { perihal: "Tugas", tanggal: "2026-10-12" });
    pastikan(v.galat.some((g) => g.startsWith("Petugas")), JSON.stringify(v.galat));
  });
  await uji("status independen & terlambat dihitung dari tenggat", () => {
    pastikan(ss.statusDistribusi([]) === "belum", "distribusi");
    pastikan(ss.statusDistribusi([{ status: "gagal" }, { status: "diterima" }]) === "diterima", "distribusi diterima");
    pastikan(ss.statusPekerjaan([]) === "tidak_diperlukan", "pekerjaan kosong");
    pastikan(ss.statusPekerjaan([{ status: "selesai" }, { status: "menunggu" }]) === "berjalan", "pekerjaan berjalan");
    pastikan(ss.terlambat({ status: "menunggu", tenggat: "2026-10-01" }, "2026-10-10"), "harus terlambat");
    pastikan(!ss.terlambat({ status: "selesai", tenggat: "2026-10-01" }, "2026-10-10"), "selesai tidak terlambat");
  });
  await uji("surat yang biasa merujuk surat lama tetap sah tanpa rujukan", () => {
    for (const kode of ["b_pengingat", "d_pengingat", "e_kembali", "a_ubah", "c_ubah", "a_minta_laporan"]) {
      const j = ss.PETA_JENIS[kode];
      const d = { ...contohData(j), suratRujukan: "", tanggalRujukan: "", penugasanRujukan: "", keputusanDiubah: "" };
      const v = ss.validasiDokumen(j, d, { perihal: "Uji tanpa rujukan", tanggal: "2026-10-12" });
      pastikan(v.galat.length === 0, `${kode}: ${v.galat.join("; ")}`);
    }
  });
  await uji("surat kustom: isi wajib, paragraf terpisah, berjudul atau ber-Kepada", () => {
    const j = ss.PETA_JENIS.f_kustom;
    pastikan(j && j.tujuan === "kustom", "jenis kustom tidak ada");
    const kosong = ss.validasiDokumen(j, {}, { perihal: "Kustom", tanggal: "2026-10-12" });
    pastikan(kosong.galat.some((g) => g.startsWith("Isi surat")), JSON.stringify(kosong.galat));
    const meta = { nomor: "001/SRT/RW.03/X/2026", tanggal: "2026-10-12", perihal: "Keterangan domisili", draft: false };
    const berjudul = ss.renderDokumen(j, { judulSurat: "Surat Keterangan", isiSurat: "Paragraf satu.\n\nParagraf dua.", penutupSurat: "-" }, meta);
    pastikan(berjudul[0].t === "judul" && (berjudul[0] as any).teks === "SURAT KETERANGAN", "judul");
    pastikan(berjudul.filter((b) => b.t === "paragraf").length === 2, "paragraf terpisah / penutup '-' tetap dicetak");
    const surat = ss.renderDokumen(j, { penerima: [{ nama: "Lurah Padasuka", jenis: "instansi" }], isiSurat: "Isi.", poinSurat: ["Satu", "Dua"] }, meta);
    pastikan(surat.some((b) => b.t === "alamat") && surat.some((b) => b.t === "daftar"), "kepala surat / poin");
    pastikan(surat.some((b) => b.t === "paragraf" && b.teks.startsWith("Demikian")), "penutup baku");
  });

  console.log("\n== PDF semua jenis ==");
  for (const j of ss.KATALOG) {
    await uji(`${j.kode} (${j.layout})`, async () => {
      const d = contohData(j);
      const v = ss.validasiDokumen(j, d, { perihal: `Contoh ${j.label}`, tanggal: "2026-10-12" });
      pastikan(v.galat.length === 0, `validasi: ${v.galat.join("; ")}`);
      const bloks = ss.renderDokumen(j, d, { nomor: `001/${j.nomorKode}/RW.03/X/2026`, tanggal: "2026-10-12", perihal: `Contoh ${j.label}`, draft: false });
      const teks = ss.teksPolos(bloks);
      pastikan(!ss.POLA_PLACEHOLDER.test(teks), "placeholder di hasil");
      pastikan(!/undefined|null|\[object/i.test(teks), "nilai kosong bocor ke dokumen");
      pastikan(bloks.some((b) => b.t === "ttd"), "tanpa blok tanda tangan");
      const { buffer, halaman } = await buatPdf({ bloks, nomor: `001/${j.nomorKode}/RW.03/X/2026`, draft: false, verifikasiUrl: "https://rw3padasukacimahi.org/verify/surat/contoh" });
      pastikan(buffer.subarray(0, 5).toString() === "%PDF-", "bukan PDF");
      pastikan(halaman >= 1, "halaman 0");
      const kotak = /\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/.exec(buffer.toString("latin1"));
      pastikan(!!kotak && Math.round(Number(kotak[1]) / 72 * 25.4) === 215 && Math.round(Number(kotak[2]) / 72 * 25.4) === 330, `bukan F4: ${kotak?.slice(1).join("x")}`);
      fs.writeFileSync(path.join(keluar, `${j.kode}.pdf`), buffer);
    });
  }
  await uji("dokumen panjang (tabel 60 baris, daftar 40 butir) multi-halaman", async () => {
    for (const kode of ["c_jadwal", "e_penggunaan", "b_ba_klarifikasi", "d_dana"]) {
      const j = ss.PETA_JENIS[kode];
      const bloks = ss.renderDokumen(j, contohData(j, true), { nomor: null, tanggal: "2026-10-12", perihal: "Dokumen panjang", draft: true });
      const { buffer, halaman } = await buatPdf({ bloks, nomor: null, draft: true });
      pastikan(halaman >= 3, `${kode}: hanya ${halaman} halaman`);
      fs.writeFileSync(path.join(keluar, `panjang-${kode}.pdf`), buffer);
    }
  });
  await uji("daftar hadir punya baris kosong untuk tanda tangan", () => {
    const j = ss.PETA_JENIS.e_daftar_hadir;
    const bloks = ss.renderDokumen(j, { namaKegiatan: "Rapat", waktuAcara: "2026-10-12", jamAcara: "19:30", tempatAcara: "Balai RW" }, { nomor: null, tanggal: "2026-10-12", perihal: "Rapat", draft: true });
    const t = bloks.find((b) => b.t === "tabel");
    pastikan(t && t.t === "tabel" && t.baris.length >= 15, "baris kosong");
  });

  if (DB_UJI) {
    const { ujiIntegrasi } = await import("./surat-sakti-integrasi");
    await ujiIntegrasi(uji, pastikan);
  } else {
    console.log("\n(Lewati uji integrasi: WILAYAH_TEST_DATABASE_URL tidak diatur.)");
  }

  console.log(`\n${lulus} lulus, ${gagal} gagal. PDF contoh: ${keluar}`);
  if (gagal) {
    console.log("Gagal:", gagalList.join(", "));
    process.exitCode = 1;
  }
  process.exit();
}

main();
