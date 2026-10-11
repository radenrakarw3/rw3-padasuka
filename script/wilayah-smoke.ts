/**
 * Smoke test sistem wilayah RT/RW.
 *
 *   npm run test:wilayah                      # uji murni (tanpa database)
 *   WILAYAH_TEST_DATABASE_URL=... npm run test:wilayah
 *                                             # + uji integrasi di database UJI (sudah dimigrasi)
 *
 * Uji integrasi membuat data fiktif (nama "Uji …", NIK berawalan 99) lalu menghapusnya.
 * Jangan arahkan WILAYAH_TEST_DATABASE_URL ke database produksi.
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";

process.env.QR_TOKEN_SECRET ||= "uji-rahasia-token-qr-minimal-32-karakter";
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

function sama<T>(a: T, b: T, pesan: string) {
  if (a !== b) throw new Error(`${pesan}: dapat ${JSON.stringify(a)}, harap ${JSON.stringify(b)}`);
}

async function harusGagal(fn: () => Promise<unknown>, status: number, pesan: string) {
  try {
    await fn();
  } catch (e: any) {
    if (e?.status === status) return;
    if (status === 400 && e?.name === "ZodError") return;
    throw new Error(`${pesan}: status ${e?.status ?? "?"} (${e?.message})`);
  }
  throw new Error(`${pesan}: tidak ditolak`);
}

const ROOT = path.resolve(import.meta.dirname, "..");
const baca = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

function semuaFile(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "node_modules") semuaFile(p, ext, out);
    } else if (ext.test(e.name)) out.push(p);
  }
  return out;
}

async function main() {
  const { INDIKATOR_KECAMATAN, BAGIAN_INDIKATOR, JUMLAH_INDIKATOR_RESMI, validasiRegistry } = await import("@shared/indikator-kecamatan");
  const { hitungLaporan, hitungTotal } = await import("@shared/wilayah-hitung");
  const { looksLikeNik, maskNik } = await import("@shared/kontak");
  const { formatNomorSuratRw, JENIS_SURAT_RW } = await import("@shared/surat-nomor");
  const qr = await import("../server/wilayah-qr");
  const lap = await import("../server/wilayah-laporan");

  console.log("\n[Registry 119 indikator]");
  await uji("jumlah indikator 119 dan per bagian sesuai format kecamatan", () => {
    sama(INDIKATOR_KECAMATAN.length, JUMLAH_INDIKATOR_RESMI, "jumlah");
    const harap: Record<string, number> = { B: 4, C: 13, D: 4, E: 11, F: 18, G: 24, H: 12, I: 7, J: 3, K: 5, L: 15, M: 3 };
    for (const b of BAGIAN_INDIKATOR) {
      sama(INDIKATOR_KECAMATAN.filter((i) => i.bagian === b.kode).length, harap[b.kode], `bagian ${b.kode}`);
    }
    sama(validasiRegistry().length, 0, "validasiRegistry");
  });
  await uji("setiap indikator punya sumber, pengisi, verifikator, dedup", () => {
    for (const i of INDIKATOR_KECAMATAN) {
      pastikan(i.sumber?.trim() && i.pengisi && i.pemverifikasi && i.dedup?.trim(), `indikator ${i.no} ${i.kode} tidak lengkap`);
    }
  });
  await uji("lansia memakai batas 60 tahun", () => {
    const l = INDIKATOR_KECAMATAN.find((i) => i.kode === "C.12")!;
    pastikan(l.rumus.t === "umur" && l.rumus.minBulan === 720, "C.12 bukan 60+");
  });

  console.log("\n[Mesin hitung]");
  const ACUAN = "2026-10-31";
  const opsi = (rt: number | null) => ({ rt, tahun: 2026, bulan: 10, acuan: ACUAN });
  const indFaktaKk = INDIKATOR_KECAMATAN.find((i) => i.rumus.t === "fakta_kk" && i.status === "siap")!;
  const indListrik = INDIKATOR_KECAMATAN.find((i) => i.rumus.t === "fakta_rumah")!;
  const indPosyandu = INDIKATOR_KECAMATAN.find((i) => i.rumus.t === "fasilitas" && i.rumus.jenis === "posyandu" && !i.rumus.kunci && !i.rumus.jumlahkan)!;
  const nilaiListrik = (indListrik.rumus as { nilai: string[] }).nilai[0];
  const dsDasar = () => ({
    kk: [{ id: 1, rt: 1 }, { id: 2, rt: 1 }],
    warga: [
      { id: 11, kkId: 1, rt: 1, jk: "P" as const, tanggalLahir: "2026-05-15" },
      { id: 12, kkId: 1, rt: 1, jk: "L" as const, tanggalLahir: "2025-10-31" },
      { id: 21, kkId: 2, rt: 1, jk: "L" as const, tanggalLahir: "1966-10-31" },
      { id: 22, kkId: 2, rt: 1, jk: "P" as const, tanggalLahir: "1966-11-30" },
    ],
    rumah: [{ id: 100, rt: 1 }],
    usaha: [],
    fasilitas: [{ id: 500, jenis: "posyandu", rtLokasi: 1, pengelola: "rw" as const, rtLayanan: [1, 2], mulai: null, sampai: null }],
    kelompok: [],
    kegiatan: [],
    peserta: [],
    kejadian: [],
    fakta: [{ subjek: "rumah" as const, subjekId: 100, kunci: "listrik", nilai: nilaiListrik, mulai: "2026-01-01", sampai: null }],
    konfirmasi: [],
  });
  const sel = (h: ReturnType<typeof hitungLaporan>, kode: string) => h.find((x) => x.kode === kode)!;

  await uji("hasil selalu 119 baris", () => sama(hitungLaporan(dsDasar(), opsi(1)).length, 119, "baris"));
  await uji("bayi 0–11 bulan: 5 bulan dihitung, tepat 12 bulan tidak", () => sama(sel(hitungLaporan(dsDasar(), opsi(1)), "C.5").nilai, 1, "C.5"));
  await uji("lansia: tepat 60 tahun dihitung, 59 tahun 11 bulan tidak", () => sama(sel(hitungLaporan(dsDasar(), opsi(1)), "C.12").nilai, 1, "C.12"));
  await uji("belum diketahui ≠ 0 (tanpa jawaban → null)", () => {
    const h = hitungLaporan(dsDasar(), opsi(1)).find((x) => x.id === indFaktaKk.id)!;
    sama(h.nilai, null, "nilai");
    sama(h.status, "belum_diketahui", "status");
  });
  await uji("semua KK menjawab (tidak cocok) → 0 lengkap", () => {
    const ds = dsDasar();
    const r = indFaktaKk.rumus as { kunci: string; nilai: string[] };
    const nilai = r.nilai.includes("tidak") ? "ya" : "tidak";
    for (const id of [1, 2]) ds.fakta.push({ subjek: "kk" as any, subjekId: id, kunci: r.kunci, nilai, mulai: "2026-01-01", sampai: null });
    const h = hitungLaporan(ds, opsi(1)).find((x) => x.id === indFaktaKk.id)!;
    sama(h.nilai, 0, "nilai");
    sama(h.status, "lengkap", "status");
  });
  await uji("dua KK dalam satu rumah dihitung satu rumah", () => {
    const h = hitungLaporan(dsDasar(), opsi(1)).find((x) => x.id === indListrik.id)!;
    sama(h.nilai, 1, "rumah");
    sama(sel(hitungLaporan(dsDasar(), opsi(1)), "B.2").nilai, 2, "KK tetap 2");
  });
  await uji("fasilitas bersama RW dihitung sekali di rekap, tidak dobel ke RT", () => {
    const rekap = hitungLaporan(dsDasar(), opsi(null)).find((x) => x.id === indPosyandu.id)!;
    sama(rekap.nilai, 1, "rekap");
    const rt1 = hitungLaporan(dsDasar(), opsi(1)).find((x) => x.id === indPosyandu.id)!;
    sama(rt1.nilai, null, "sel RT");
    sama(rt1.status, "needs_confirmation", "status RT");
  });
  await uji("indikator needs_confirmation tidak pernah memberi angka", () => {
    for (const h of hitungLaporan(dsDasar(), opsi(1))) {
      const ind = INDIKATOR_KECAMATAN.find((i) => i.id === h.id)!;
      if (ind.status === "needs_confirmation") pastikan(h.nilai === null, `${ind.kode} memberi angka`);
    }
  });
  await uji("RT lain tidak melihat warga RT 1", () => sama(sel(hitungLaporan(dsDasar(), opsi(2)), "B.1").nilai, 0, "B.1 RT2"));
  await uji("TOTAL: kejadian dijumlah, populasi tidak, bulan kosong → null", () => {
    sama(hitungTotal({ periode: "kejadian", status: "siap" }, [1, 2, 0, 3]).nilai, 6, "kejadian");
    sama(hitungTotal({ periode: "kejadian", status: "siap" }, [1, null]).nilai, null, "kejadian ada null");
    sama(hitungTotal({ periode: "stok", status: "siap" }, [10, 10, 10, 10]).nilai, null, "stok");
    sama(hitungTotal({ periode: "kejadian", status: "needs_confirmation" }, [1]).nilai, null, "needs_confirmation");
  });

  console.log("\n[Token QR & form usulan]");
  await uji("token deterministik, 16 karakter, beda per nonce, hash tidak sama token", () => {
    const a = qr.turunkanToken(7, "n1");
    sama(a, qr.turunkanToken(7, "n1"), "deterministik");
    pastikan(a.length === 16 && a !== qr.turunkanToken(7, "n2") && a !== qr.turunkanToken(8, "n1"), "unik");
    const h = qr.hashToken(a);
    pastikan(/^[0-9a-f]{64}$/.test(h) && !h.includes(a.toLowerCase()), "hash");
  });
  await uji("normalisasi kode ketik (huruf kecil, strip, O→0, I/L→1)", () => {
    const t = qr.turunkanToken(3, "x");
    sama(qr.normalisasiToken(qr.formatToken(t).toLowerCase()), t, "format");
    sama(qr.normalisasiToken("ABC"), null, "terlalu pendek");
  });
  await uji("NIK dideteksi dan disamarkan", () => {
    pastikan(looksLikeNik("3277011234567890"), "NIK tidak terdeteksi");
    pastikan(!looksLikeNik("081234567890"), "HP dianggap NIK");
    pastikan(!maskNik("3277011234567890").includes("1234567890"), "mask bocor");
  });
  const isiValid = {
    versiForm: 1 as const, namaPengisi: "Uji Pengisi", hubunganPengisi: "Kepala Keluarga", nomorHp: "081234567890",
    rumahTangga: { air_bersih: "ya" },
    anggota: [{ nama: "Uji Pengisi", hubungan: "Kepala Keluarga", jenisKelamin: "Laki-laki", tanggalLahir: "1980-01-01", jawaban: {} }],
    usaha: [],
  };
  await uji("skema usulan menerima isian sah", () => {
    const r = qr.isiUsulanSchema.safeParse(isiValid);
    pastikan(r.success, JSON.stringify(!r.success && r.error.issues));
  });
  await uji("skema usulan menolak pertanyaan asing, jawaban asal, dan NIK di kolom HP", () => {
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, rumahTangga: { nik: "1" } }).success, "kunci asing lolos");
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, rumahTangga: { air_bersih: "mungkin" } }).success, "nilai asal lolos");
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, nomorHp: "3277011234567890" }).success, "NIK lolos");
  });
  await uji("batas laju menolak setelah kuota", () => {
    const k = `uji:${Date.now()}`;
    for (let i = 0; i < 3; i++) pastikan(!qr.kenaBatas(k, 3, 60_000), "terlalu cepat ditolak");
    pastikan(qr.kenaBatas(k, 3, 60_000), "tidak ditolak");
  });

  console.log("\n[Surat & ekspor]");
  await uji("format nomor surat: urut/kode/RW03/bulan romawi/tahun untuk 8 jenis", () => {
    sama(JENIS_SURAT_RW.length, 8, "jumlah jenis");
    for (const j of JENIS_SURAT_RW) {
      const n = formatNomorSuratRw(7, j, new Date(2026, 9, 8));
      pastikan(/^007\/[A-Z]+\/RW\.?03\/X\/2026$/.test(n) || /^0*7\/.+\/X\/2026$/.test(n), `format ${n}`);
    }
  });
  await uji("XLSX: kolom NO SUB INDIKATOR SEPT OKT NOV DES TOTAL, 119 baris, sel kosong bukan 0, tanpa identitas", () => {
    const hasil = hitungLaporan(dsDasar(), opsi(1));
    const d = {
      judul: "FORMAT LAPORAN RT TAHUN 2026", scope: "RT 01 / RW 03", tahun: 2026, bulan: [9, 10, 11, 12],
      kolomBulan: ["SEPT", "OKT", "NOV", "DES"], bulanFinal: [true, true, true, true],
      bagian: BAGIAN_INDIKATOR.map((b) => ({ kode: b.kode, judul: b.judul })),
      baris: INDIKATOR_KECAMATAN.map((ind) => {
        const h = hasil.find((x) => x.id === ind.id)!;
        return { no: ind.no, bagian: ind.bagian, kode: ind.kode, label: ind.label, satuan: ind.satuan, nilai: [h.nilai, h.nilai, h.nilai, h.nilai], status: [h.status], total: null, catatanTotal: "", catatan: "" };
      }),
      dibuat: new Date().toISOString(),
    };
    const wb = XLSX.read(lap.eksporXlsx(d), { type: "buffer" });
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(wb.Sheets.Laporan, { header: 1, defval: "" });
    const hi = rows.findIndex((r) => r[0] === "NO");
    sama(rows[hi].join("|"), "NO|SUB|INDIKATOR|SEPT|OKT|NOV|DES|TOTAL", "header");
    const dataRows = rows.slice(hi + 1).filter((r) => typeof r[0] === "number");
    sama(dataRows.length, 119, "baris indikator");
    const barisBelum = dataRows.find((r) => r[1] === indFaktaKk.kode && r[2] === indFaktaKk.label)!;
    sama(barisBelum[3], "", "belum diketahui tampil kosong");
    const teks = JSON.stringify(rows);
    pastikan(!/\d{16}/.test(teks) && !teks.includes("Uji"), "ada identitas di ekspor");
  });

  console.log("\n[Pemeriksaan statis keamanan]");
  await uji("tidak ada generator QR eksternal", () => {
    const pola = /api\.qrserver|chart\.googleapis|quickchart\.io|goqr\.me/;
    for (const f of [...semuaFile("client/src", /\.(tsx?|html)$/), ...semuaFile("server", /\.ts$/)]) {
      pastikan(!pola.test(baca(f)), `generator eksternal di ${f}`);
    }
  });
  await uji("halaman /isi: no-referrer, no-store, noindex, token dihapus dari URL", () => {
    const r = baca("server/wilayah-routes.ts");
    pastikan(r.includes("no-referrer") && r.includes("no-store") && r.includes("noindex"), "header keamanan");
    const c = baca("client/src/pages/public/isi.tsx");
    pastikan(c.includes("replaceState") && c.includes("no-referrer"), "token tidak dibersihkan dari URL");
  });
  await uji("kelola RT: wajib sesi admin RW, RT dari header tervalidasi, bukan body/query", () => {
    pastikan(!/req\.body\.rt\b/.test(baca("server/wilayah-routes.ts")), "rt dibaca dari body");
    const auth = baca("server/wilayah-auth.ts");
    pastikan(auth.includes("isAdmin") && auth.includes("x-wilayah-rt") && auth.includes("isWilayahRt(rt)") && !/req\.(body|query)/.test(auth), "aktor kelola RT tidak aman");
    pastikan(!auth.includes("rtjuaraRt"), "login PIN RT masih dipakai");
  });
  await uji("tidak ada PIN/kredensial ter-hardcode di Blusukan", () => {
    pastikan(!baca("server/blusukan-routes.ts").includes("664599"), "PIN lama masih ada");
  });

  if (DB_UJI) await ujiDatabase();
  else console.log("\n[Integrasi DB] dilewati — set WILAYAH_TEST_DATABASE_URL ke database UJI yang sudah dimigrasi.");

  console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal`);
  if (gagal) {
    console.log(`Gagal: ${gagalList.join("; ")}`);
    process.exit(1);
  }
  process.exit(0);
}

let draftUji: (kode: string, perihal: string, extra?: Record<string, unknown>) => Record<string, unknown>;
let hapusSuratUji: (pool: any, ids: number[]) => Promise<void>;

async function ujiDatabase() {
  console.log("\n[Integrasi DB]");
  const { pool } = await import("../server/db");
  const data = await import("../server/wilayah-data");
  const qr = await import("../server/wilayah-qr");
  const surat = {
    ...(await import("../server/wilayah-surat")),
    ...(await import("../server/surat-sakti/layanan")),
    ...(await import("../server/surat-sakti/tindak")),
  };
  const { contohData } = await import("../shared/surat-sakti/contoh");
  const { PETA_JENIS } = await import("../shared/surat-sakti");
  draftUji = (kode, perihal, extra = {}) => ({ kodeJenis: kode, perihal, tanggalSurat: "2026-10-08", dataForm: contohData(PETA_JENIS[kode]), ...extra });
  hapusSuratUji = (await import("./surat-sakti-integrasi")).hapusSuratUji;
  const lap = await import("../server/wilayah-laporan");
  const { rows: cek } = await pool.query(`SELECT to_regclass('wil_fakta') AS t`);
  if (!cek[0].t) {
    console.log("  dilewati: migrasi wilayah belum diterapkan di database uji");
    return;
  }

  const rt7 = { role: "rt" as const, rt: 7, label: "Uji RT 07" };
  const rt6 = { role: "rt" as const, rt: 6, label: "Uji RT 06" };
  const rw = { role: "rw" as const, rt: null, label: "Uji RW" };
  const acak = () => String(Math.floor(Math.random() * 1e12)).padStart(12, "0");
  const nomorKk = `9900${acak()}`;
  const nik1 = `9901${acak()}`;
  const bersih: { kk?: number; kkLain: number[]; surat: number[] } = { surat: [], kkLain: [] };

  try {
    let kkId = 0;
    await uji("RT membuat KK dan warga di RT-nya", async () => {
      kkId = (await data.tambahKeluarga(rt7, { nomorKk, alamat: "Jl. Uji No. 1" })).id;
      bersih.kk = kkId;
      await data.tambahWarga(rt7, kkId, { nama: "Uji Satu", nik: nik1, jenisKelamin: "Laki-laki", tanggalLahir: "1960-01-01", kedudukan: "Kepala Keluarga", statusPerkawinan: "Kawin" });
    });
    await uji("isolasi RT: RT lain tidak bisa membaca atau menambah", async () => {
      await harusGagal(() => data.detailKeluarga(rt6, kkId), 404, "baca lintas RT");
      await harusGagal(() => data.tambahWarga(rt6, kkId, { nama: "Uji Dua", nik: `9902${acak()}`, jenisKelamin: "Perempuan", kedudukan: "Istri", statusPerkawinan: "Kawin" }), 404, "tulis lintas RT");
    });
    await uji("RW hanya baca: NIK disamarkan, tidak bisa membuat master", async () => {
      const d = await data.detailKeluarga(rw, kkId);
      pastikan(!d.anggota.some((a: any) => a.nik === nik1), "NIK tampil penuh ke RW");
      await harusGagal(() => data.tambahKeluarga(rw, { nomorKk: `9903${acak()}`, alamat: "Jl. Uji" }), 403, "RW membuat KK");
    });
    await uji("NIK sama tidak membuat data ganda", async () => {
      await harusGagal(() => data.tambahWarga(rt7, kkId, { nama: "Uji Satu", nik: nik1, jenisKelamin: "Laki-laki", kedudukan: "Anak", statusPerkawinan: "Belum Kawin" }), 409, "duplikat");
    });

    let token = "";
    await uji("QR: buka token hanya memberi RT, usulan tidak mengubah data resmi, kirim ulang idempoten", async () => {
      const [kartu] = await qr.kartuUntukCetak(rt7, [kkId], false);
      token = qr.normalisasiToken(kartu.tokenTampil)!;
      const buka = await qr.bukaToken(token);
      sama(JSON.stringify(Object.keys(buka).sort()), JSON.stringify(["rt", "versiForm"]), "isi respons buka");
      const sebelum = JSON.stringify(await data.detailKeluarga(rt7, kkId).then((d) => [d.anggota, d.fakta]));
      const body = { idempotencyKey: `uji-${acak()}-kunci`, isi: { versiForm: 1, namaPengisi: "Uji Satu", hubunganPengisi: "Kepala Keluarga", rumahTangga: { air_bersih: "ya" }, anggota: [{ nama: "Uji Satu", hubungan: "Kepala Keluarga", jenisKelamin: "Laki-laki", jawaban: {} }], usaha: [] } };
      const a = await qr.kirimUsulan(token, body, "127.0.0.1");
      const b = await qr.kirimUsulan(token, body, "127.0.0.1");
      sama(b.kodeTerima, a.kodeTerima, "kirim ganda");
      const sesudah = JSON.stringify(await data.detailKeluarga(rt7, kkId).then((d) => [d.anggota, d.fakta]));
      sama(sesudah, sebelum, "data resmi berubah oleh usulan");
    });
    await uji("token dicabut ditolak (410)", async () => {
      await qr.cabutToken(rt7, kkId);
      await harusGagal(() => qr.bukaToken(token), 410, "token dicabut");
    });

    await uji("snapshot laporan tidak berubah; koreksi wajib alasan dan jadi versi baru", async () => {
      const v1 = await lap.finalkanLaporan(rt7, 2026, 9);
      const { rows: r1 } = await pool.query(`SELECT hasil FROM wil_laporan WHERE id = $1`, [v1.id]);
      await harusGagal(() => lap.finalkanLaporan(rt7, 2026, 9), 409, "final ulang tanpa alasan");
      await data.tambahWarga(rt7, kkId, { nama: "Uji Tiga", nik: `9904${acak()}`, jenisKelamin: "Perempuan", tanggalLahir: "2026-08-01", kedudukan: "Anak", statusPerkawinan: "Belum Kawin" });
      const v2 = await lap.finalkanLaporan(rt7, 2026, 9, "uji koreksi");
      sama(v2.versi, v1.versi + 1, "versi");
      const { rows: r1b } = await pool.query(`SELECT hasil FROM wil_laporan WHERE id = $1`, [v1.id]);
      sama(JSON.stringify(r1b[0].hasil), JSON.stringify(r1[0].hasil), "snapshot lama berubah");
      await pool.query(`DELETE FROM wil_laporan WHERE rt = 7 AND tahun = 2026 AND bulan = 9 AND dibuat_oleh = $1`, [rt7.label]);
    });

    await uji("nomor surat aman saat terbit bersamaan (tanpa duplikat)", async () => {
      for (let i = 0; i < 6; i++) {
        const s = await surat.simpanDraft(rw, draftUji("c_undangan", `Uji paralel ${i}`));
        bersih.surat.push(s.id);
      }
      const hasil = await Promise.all(bersih.surat.map((id) => surat.terbitkan(rw, id)));
      sama(new Set(hasil.map((h) => h.nomorSurat)).size, hasil.length, "nomor unik");
      await harusGagal(() => surat.simpanDraft(rw, draftUji("c_undangan", "Ubah"), bersih.surat[0]), 409, "surat terbit diubah");
      await harusGagal(() => surat.simpanDraft(rt7, draftUji("c_undangan", "RT")), 403, "RT membuat surat");
    });

    await alurLengkap({ pool, data, qr, surat, lap, rt7, rt6, rw, kkId: () => kkId, nik1, bersih, acak });
  } finally {
    await hapusSuratUji(pool, bersih.surat);
    await pool.query(`DELETE FROM wil_usulan WHERE diinput_oleh = $1`, [rw.label]).catch(() => {});
    if (bersih.kkLain.length) await pool.query(`DELETE FROM kartu_keluarga WHERE id = ANY($1::int[])`, [bersih.kkLain]).catch(() => {});
    if (bersih.kk) {
      await pool.query(`DELETE FROM wil_usulan WHERE kk_id = $1`, [bersih.kk]).catch(() => {});
      await pool.query(`DELETE FROM wil_kk_token WHERE kk_id = $1`, [bersih.kk]).catch(() => {});
      await pool.query(`DELETE FROM warga WHERE kk_id = $1`, [bersih.kk]).catch(() => {});
      await pool.query(`DELETE FROM kartu_keluarga WHERE id = $1`, [bersih.kk]).catch(() => {});
    }
    await pool.end().catch(() => {});
  }
}

/** Setiap modul yang dipakai halaman RT/RW dijalankan sekali terhadap database sungguhan. */
async function alurLengkap(k: any) {
  const { pool, data, qr, surat, lap, rt7, rt6, rw, nik1, bersih, acak } = k;
  const W = await import("@shared/wilayah");
  const dash = await import("../server/wilayah-dashboard");
  const kkId: number = k.kkId();
  const { rows: wr } = await pool.query(`SELECT id FROM warga WHERE nik = $1`, [nik1]);
  const wargaId: number = wr[0].id;
  const ids: Record<string, number> = {};

  await uji("fakta: simpan banyak, tidak berubah bila sama, riwayat", async () => {
    const f = [{ subjek: "kk", subjekId: kkId, kunci: "air_bersih", nilai: "ya" }, { subjek: "warga", subjekId: wargaId, kunci: "hipertensi", nilai: "tidak", sumber: W.SUMBER_INFORMASI[0].nilai }];
    sama((await data.simpanBanyakFakta(rt7, f)).disimpan, 2, "disimpan");
    sama((await data.simpanBanyakFakta(rt7, f)).tidakBerubah, 2, "tidak berubah");
    pastikan((await data.riwayatSubjek(rt7, "kk", kkId)).length >= 1, "riwayat kosong");
    await harusGagal(() => data.simpanBanyakFakta(rt6, f), 404, "RT lain menulis fakta");
  });
  await uji("rumah: buat, hubungkan KK, fakta listrik", async () => {
    ids.rumah = (await data.buatRumah(rt7, { alamat: "Jl. Uji Rumah" })).id;
    await data.hubungkanKkRumah(rt7, kkId, ids.rumah);
    const listrik = W.FAKTA_BY_KUNCI.get("listrik")!.pilihan![1].nilai;
    await data.simpanBanyakFakta(rt7, [{ subjek: "rumah", subjekId: ids.rumah, kunci: "listrik", nilai: listrik }]);
    const r = (await data.daftarRumah(rt7)).find((x: any) => x.id === ids.rumah);
    pastikan(r && r.kk.length === 1 && r.listrik === listrik, "rumah tidak lengkap");
  });
  await uji("fasilitas & kelompok: RW bersama dan RT sendiri, nonaktifkan", async () => {
    ids.fasRw = (await data.simpanFasilitas(rw, { jenis: "posyandu", nama: "Posyandu Uji", rtLokasi: 7, rtLayanan: [6, 7] })).id;
    ids.fasRt = (await data.simpanFasilitas(rt7, { jenis: W.JENIS_FASILITAS[0].nilai, nama: "Pos Uji", rtLokasi: 7 })).id;
    await harusGagal(() => data.simpanFasilitas(rt7, { jenis: "posyandu", nama: "Ubah", rtLayanan: [7] }, ids.fasRw), 403, "RT mengubah fasilitas RW");
    await data.simpanBanyakFakta(rw, [{ subjek: "fasilitas", subjekId: ids.fasRw, kunci: "jumlah_kader", nilai: "5" }]);
    ids.kel = (await data.simpanKelompok(rw, { jenis: W.JENIS_KELOMPOK[0].nilai, nama: "Kelompok Uji", rtTerlibat: [6, 7] })).id;
    await data.nonaktifkanObjek(rt7, "fasilitas", ids.fasRt);
    pastikan((await data.daftarFasilitas(rt7)).some((f: any) => f.id === ids.fasRw), "fasilitas RW tak terlihat RT");
    pastikan((await data.daftarKelompok(rw)).some((x: any) => x.id === ids.kel), "kelompok");
  });
  await uji("kegiatan RW: RT terlibat mencatat peserta, RT lain ditolak, kirim ulang idempoten", async () => {
    const isi = { jenis: W.JENIS_KEGIATAN[0].nilai, judul: "Kegiatan Uji", tanggal: "2026-10-05", rtTerlibat: [7], idempotencyKey: `keg-${acak()}` };
    ids.keg = (await data.simpanKegiatan(rw, isi)).id;
    sama((await data.simpanKegiatan(rw, isi)).id, ids.keg, "kegiatan ganda");
    await data.catatKehadiran(rt7, ids.keg, 12);
    await data.catatKehadiran(rt7, ids.keg, 15);
    await harusGagal(() => data.catatKehadiran(rt6, ids.keg, 3), 404, "RT tak terlibat");
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n, MAX(jumlah_hadir) AS j FROM wil_kegiatan_peserta WHERE kegiatan_id = $1`, [ids.keg]);
    pastikan(rows[0].n === 1 && rows[0].j === 15, "peserta dobel");
  });
  await uji("konfirmasi kelengkapan: RT dan RW sesuai bagian", async () => {
    const bRt = W.BAGIAN_KONFIRMASI.find((b) => b.scope === "rt")!.nilai;
    const bRw = W.BAGIAN_KONFIRMASI.find((b) => b.scope === "rw")!.nilai;
    await data.setKonfirmasi(rt7, 2026, 10, bRt, true);
    await data.setKonfirmasi(rt7, 2026, 10, bRt, true);
    await data.setKonfirmasi(rw, 2026, 10, bRw, true);
    await harusGagal(() => data.setKonfirmasi(rt7, 2026, 10, bRw, true), 403, "RT konfirmasi bagian RW");
    await data.setKonfirmasi(rt7, 2026, 10, bRt, false);
  });
  await uji("usulan warga: RT terima → fakta resmi berubah dengan sumber usulan", async () => {
    const [kartu] = await qr.kartuUntukCetak(rt7, [kkId], true);
    const token = qr.normalisasiToken(kartu.tokenTampil)!;
    const isi = { versiForm: 1, namaPengisi: "Uji Satu", hubunganPengisi: "Kepala Keluarga", rumahTangga: { air_bersih: "tidak" }, anggota: [{ nama: "Uji Satu", hubungan: "Kepala Keluarga", jenisKelamin: "Laki-laki", jawaban: {} }], usaha: [] };
    const { kodeTerima } = await qr.kirimUsulan(token, { idempotencyKey: `usl-${acak()}-kunci`, isi }, "127.0.0.2");
    sama((await qr.statusUsulan(kodeTerima)).status, "menunggu", "status");
    const u = (await qr.daftarUsulan(rt7)).find((x: any) => x.kk_id === kkId);
    pastikan(u, "usulan tak muncul di antrean RT");
    await harusGagal(() => qr.detailUsulan(rt6, u.id), 404, "RT lain membuka usulan");
    await qr.detailUsulan(rt7, u.id);
    await qr.putuskanUsulan(rt7, u.id, { aksi: "terima", fakta: [{ subjek: "kk", subjekId: kkId, kunci: "air_bersih", nilai: "tidak" }] });
    const d = await data.detailKeluarga(rt7, kkId);
    pastikan(d.fakta.some((f: any) => f.kunci === "air_bersih" && f.nilai === "tidak"), "fakta usulan tidak diterapkan");
    await harusGagal(() => qr.putuskanUsulan(rt7, u.id, { aksi: "tolak", catatan: "ulang" }), 409, "diputus dua kali");
  });
  await uji("semua fungsi baca halaman RT/RW berjalan", async () => {
    await Promise.all([
      data.daftarKeluarga(rt7, {}), data.daftarKeluarga(rw, { rt: 1 }), data.cariWarga(rt7, "Uji"),
      data.daftarUsaha(rw, null), data.daftarKegiatan(rt7, {}), data.daftarKejadian(rw, {}),
      data.daftarSerahTerima(rt7), qr.daftarUsulan(rt7, "semua"),
      dash.ringkasanRw(2026, 10), dash.aksiRw(2026, 10), lap.statusLaporanSemuaRt(2026, 10),
      lap.pratinjauLaporan(rt7, null, 2026, 10), lap.pratinjauLaporan(rw, null, 2026, 10), lap.pratinjauLaporan(rw, 1, 2026, 10),
      lap.daftarVersi(rw, 7, 2026, 9),
      ...["draft", "belum_distribusi", "arsip"].map((b) => surat.daftarSurat(rw, { bagian: b })),
      surat.daftarSurat(rt7, {}), surat.ringkasan(rw), surat.daftarTindak(rw), surat.referensi(rw),
    ]);
    const ex = await lap.dataEkspor(rw, null, 2026, [9, 10, 11, 12]);
    sama(ex.baris.length, 119, "ekspor rekap");
    pastikan(lap.eksporXlsx(ex).length > 1000, "xlsx kosong");
    const fin = await lap.finalkanLaporan(rw, 2026, 10);
    await pool.query(`DELETE FROM wil_laporan WHERE id = $1`, [fin.id]);
  });
  await uji("surat: draft → lampiran → terbit → kirim berbukti → tindak → salin jadi draft baru", async () => {
    const s = await surat.simpanDraft(rw, draftUji("b_permohonan_instansi", "Pengantar uji"));
    bersih.surat.push(s.id);
    const lamp = await surat.tambahLampiran(rw, s.id, { nama: "uji.png", data: "data:image/png;base64,iVBORw0KGgo=" });
    pastikan((await surat.ambilLampiranAman(rw, lamp.id)), "lampiran");
    const t = await surat.terbitkan(rw, s.id);
    await harusGagal(() => surat.tambahLampiran(rw, s.id, { nama: "x.png", data: "data:image/png;base64,AA==" }), 409, "lampiran setelah terbit");
    await harusGagal(() => surat.catatKirim(rw, s.id, { kanal: "WhatsApp", penerima: "Lurah", bukti: "data:text/html;base64,AA==", dikirimPada: new Date().toISOString() }), 400, "bukti bukan foto/PDF");
    await surat.catatKirim(rw, s.id, { kanal: "Diantar langsung", penerima: "Kelurahan", bukti: "Diterima staf kelurahan", dikirimPada: new Date().toISOString() });
    const td = await surat.tambahTindak(rw, s.id, { tindakan: "Tunggu balasan", picNama: "Ketua RW", tenggat: "2026-10-20" });
    await surat.perbaruiTindak(rw, td.id, { catatan: "Balasan diterima", status: "selesai", bukti: "Surat balasan kelurahan" });
    pastikan((await surat.pengantarWa(rw, s.id)).includes(t.nomorSurat), "pengantar WA tanpa nomor");
    const g = await surat.salinJadiDraft(rw, s.id);
    bersih.surat.push(g.id);
    await surat.terbitkan(rw, g.id);
    const lama = await surat.detailSurat(rw, s.id);
    sama(lama.status, "terbit", "surat asal");
    sama(lama.nomorSurat, t.nomorSurat, "nomor lama tetap");
  });
  await uji("serah-terima KK pindah RT atomik, tidak bisa diterima dua kali", async () => {
    const st = await data.ajukanSerahTerima(rt7, { jenis: "kk", kkId, rtTujuan: 6 });
    await harusGagal(() => data.putuskanSerahTerima(rt7, st.id, { terima: true }), 403, "RT asal menerima sendiri");
    await data.putuskanSerahTerima(rt6, st.id, { terima: true });
    await harusGagal(() => data.putuskanSerahTerima(rt6, st.id, { terima: true }), 409, "diterima dua kali");
    const { rows } = await pool.query(`SELECT rt FROM kartu_keluarga WHERE id = $1`, [kkId]);
    sama(rows[0].rt, 6, "RT KK");
    await harusGagal(() => data.detailKeluarga(rt7, kkId), 404, "RT asal masih melihat");
    await data.detailKeluarga(rt6, kkId);
  });
  await uji("sisa alur: ubah warga, data perlu dicek, cetak semua, batal/hapus surat", async () => {
    await data.ubahWarga(rt6, wargaId, { tanggalLahir: "1960-02-02" });
    await harusGagal(() => data.ubahWarga(rt7, wargaId, { tanggalLahir: "1960-02-03" }), 404, "RT lama mengubah");
    await harusGagal(() => data.ubahWarga(rt6, wargaId, { nomorHp: "3277011234567890" }), 400, "NIK di kolom HP");
    const { rows: pc } = await pool.query(
      `INSERT INTO wil_fakta (subjek, subjek_id, kunci, nilai, mulai, status_verifikasi, sumber, rt, dicatat_role, dicatat_oleh)
       VALUES ('kk', $1, 'jamban', 'ya', current_date, 'perlu_cek', 'data_lama', 6, 'rt', 'uji') RETURNING id`, [kkId]);
    await data.putuskanFaktaPerluCek(rt6, pc[0].id, true);
    pastikan((await qr.kartuUntukCetak(rt6, "semua", false)).length >= 1, "cetak semua kosong");
    const d1 = await surat.simpanDraft(rw, draftUji("c_edaran", "Edaran uji"));
    const l = await surat.tambahLampiran(rw, d1.id, { nama: "a.pdf", data: "data:application/pdf;base64,JVBERi0=" });
    await surat.hapusLampiran(rw, l.id);
    await surat.hapusDraft(rw, d1.id);
    const d2 = await surat.simpanDraft(rw, draftUji("c_edaran", "Edaran uji 2"));
    bersih.surat.push(d2.id);
    await surat.terbitkan(rw, d2.id);
    await harusGagal(() => surat.batalkan(rw, d2.id, "x"), 400, "batal tanpa alasan");
    await surat.batalkan(rw, d2.id, "Salah tujuan surat");
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
