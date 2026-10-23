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
  const W = await import("@shared/wilayah");
  const { looksLikeNik, maskNik } = await import("@shared/kontak");
  const { formatNomorSuratRw, JENIS_SURAT_RW } = await import("@shared/surat-nomor");
  const qr = await import("../server/wilayah-qr");

  console.log("\n[Standar data RW 03]");
  await uji("isi awal: kunci unik berawalan s_, sasaran kk/warga, enam kelompok pilihan RW", () => {
    const kunci = W.STANDAR_AWAL.map((d) => d.kunci);
    sama(new Set(kunci).size, kunci.length, "kunci ganda");
    pastikan(kunci.every((k) => /^s_[a-z0-9_]+$/.test(k)), "kunci tanpa awalan s_");
    pastikan(W.STANDAR_AWAL.every((d) => d.subjek === "kk" || d.subjek === "warga"), "sasaran asing");
    sama(JSON.stringify([...new Set(W.STANDAR_AWAL.map((d) => d.kelompok))].sort()), JSON.stringify([...W.KELOMPOK_STANDAR].sort()), "kelompok");
  });
  await uji("isi awal: pilihan minimal dua, nilai unik, tanda perhatian sesuai pilihan", () => {
    for (const d of W.STANDAR_AWAL) {
      const sah = d.tipe === "yatidak" ? ["ya", "tidak"] : (d.pilihan ?? []).map((p) => p.nilai);
      if (d.tipe === "pilihan" || d.tipe === "banyak") pastikan(sah.length >= 2 && new Set(sah).size === sah.length, `${d.kunci} pilihan`);
      pastikan((d.perhatian ?? []).every((v) => sah.includes(v)), `${d.kunci} perhatian asing`);
    }
  });
  const def = (k: string) => W.STANDAR_AWAL.find((d) => d.kunci === k)!;
  await uji("validasi jawaban: pilih satu, pilih beberapa, ya/tidak, isian singkat", () => {
    sama(W.validasiNilaiFakta(def("s_kondisi_rumah"), "rusak_berat"), null, "pilihan sah");
    pastikan(W.validasiNilaiFakta(def("s_kondisi_rumah"), "roboh") !== null, "pilihan asal lolos");
    sama(W.validasiNilaiFakta(def("s_bansos"), "pkh,bpnt"), null, "banyak sah");
    pastikan(W.validasiNilaiFakta(def("s_bansos"), "pkh,pkh") !== null, "banyak ganda lolos");
    pastikan(W.validasiNilaiFakta(def("s_bansos"), "pkh,emas") !== null, "banyak asing lolos");
    pastikan(W.validasiNilaiFakta(def("s_air_cukup"), "mungkin") !== null, "ya/tidak asal lolos");
    sama(W.validasiNilaiFakta(def("s_kontak_darurat"), "0812 3456 7890 (Bu Ani)"), null, "teks sah");
    pastikan(W.validasiNilaiFakta(def("s_kontak_darurat"), "3277011234567890") !== null, "NIK di teks lolos");
  });
  await uji("tanda perhatian & label pilih beberapa", () => {
    pastikan(W.kenaPerhatian(def("s_penyakit"), "tidak_ada,tbc"), "tbc tidak ditandai");
    pastikan(!W.kenaPerhatian(def("s_penyakit"), "tidak_ada"), "tidak ada ditandai");
    pastikan(!W.kenaPerhatian(def("s_penyakit"), null), "belum diketahui ditandai");
    sama(W.labelNilaiFakta(def("s_bansos"), "pkh,blt"), "PKH, BLT", "label");
  });
  await uji("pertanyaan anggota menyesuaikan jenis kelamin dan usia (usia tak diketahui tetap tampil)", () => {
    pastikan(!W.berlakuUntukWarga(def("s_hamil"), { jenisKelamin: "Laki-laki", umur: 30 }), "hamil untuk laki-laki");
    pastikan(W.berlakuUntukWarga(def("s_hamil"), { jenisKelamin: "Perempuan", umur: 30 }), "hamil untuk perempuan 30");
    pastikan(!W.berlakuUntukWarga(def("s_hamil"), { jenisKelamin: "Perempuan", umur: 70 }), "hamil untuk 70 th");
    pastikan(W.berlakuUntukWarga(def("s_yatim"), { jenisKelamin: "Laki-laki", umur: null }), "usia tak diketahui");
    pastikan(!W.berlakuUntukWarga(def("s_pekerjaan"), { jenisKelamin: "Laki-laki", umur: 4 }), "pekerjaan balita");
  });
  await uji("kelompok mengikuti urutan standar, kelompok baru di akhir", () => {
    const g = W.kelompokkan([{ ...def("s_bansos"), kelompok: "Zzz baru" }, def("s_status_tinggal"), def("s_kondisi_rumah")]);
    sama(g.map((x) => x.kelompok).join("|"), "Tempat tinggal & kontak|Rumah & fasilitas|Zzz baru", "urutan");
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
    rumahTangga: { s_internet: "ya" },
    anggota: [{ nama: "Uji Pengisi", hubungan: "Kepala Keluarga", jenisKelamin: "Laki-laki", tanggalLahir: "1980-01-01", jawaban: {} }],
  };
  await uji("skema usulan menerima isian sah", () => {
    const r = qr.isiUsulanSchema.safeParse(isiValid);
    pastikan(r.success, JSON.stringify(!r.success && r.error.issues));
  });
  await uji("skema usulan menolak NIK di kolom HP dan isian kosong", () => {
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, nomorHp: "3277011234567890" }).success, "NIK lolos");
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, anggota: [] }).success, "tanpa anggota lolos");
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, nomorHp: "" }).success, "tanpa nomor WA lolos");
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, nomorHp: null }).success, "nomor WA null lolos");
    pastikan(!qr.isiUsulanSchema.safeParse({ ...isiValid, nomorHp: "12345" }).success, "nomor WA asal lolos");
  });
  await uji("batas laju menolak setelah kuota", () => {
    const k = `uji:${Date.now()}`;
    for (let i = 0; i < 3; i++) pastikan(!qr.kenaBatas(k, 3, 60_000), "terlalu cepat ditolak");
    pastikan(qr.kenaBatas(k, 3, 60_000), "tidak ditolak");
  });

  console.log("\n[Surat]");
  await uji("format nomor surat: urut/kode/RW03/bulan romawi/tahun untuk 8 jenis", () => {
    sama(JENIS_SURAT_RW.length, 8, "jumlah jenis");
    for (const j of JENIS_SURAT_RW) {
      const n = formatNomorSuratRw(7, j, new Date(2026, 9, 8));
      pastikan(/^007\/[A-Z]+\/RW\.?03\/X\/2026$/.test(n) || /^0*7\/.+\/X\/2026$/.test(n), `format ${n}`);
    }
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
  const { rows: cek } = await pool.query(`SELECT to_regclass('wil_fakta') AS t, to_regclass('wil_pertanyaan') AS p`);
  if (!cek[0].t || !cek[0].p) {
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
  const bersihTtd = await (await import("./surat-sakti-integrasi")).pastikanTtdUji(pool);

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
    await uji("QR: buka token tanpa NIK/nilai, usulan tidak mengubah data resmi, kirim ulang idempoten", async () => {
      const [kartu] = await qr.kartuUntukCetak(rt7, [kkId], false);
      token = qr.normalisasiToken(kartu.tokenTampil)!;
      const buka = await qr.bukaToken(token);
      sama(JSON.stringify(Object.keys(buka).sort()), JSON.stringify(["keluarga", "pertanyaan", "rt", "versiForm"]), "isi respons buka");
      const teksBuka = JSON.stringify(buka.keluarga);
      pastikan(!teksBuka.includes(nik1) && !teksBuka.includes(nomorKk), "tidak ada NIK / nomor KK");
      pastikan(buka.keluarga.anggota.length > 0 && buka.keluarga.anggota[0].adaTanggalLahir, "anggota tercatat ikut");
      pastikan(!/\d{4}-\d{2}-\d{2}/.test(teksBuka), "tidak ada tanggal lahir");
      pastikan(buka.keluarga.anggota.every((a: any) => Object.keys(a).sort().join() === "adaTanggalLahir,hubungan,jenisKelamin,nama,terisi,umur"), "field anggota terbatas");
      pastikan(buka.keluarga.anggota.every((a: any) => a.terisi.every((k: string) => typeof k === "string" && !k.includes(":"))), "terisi hanya kunci");
      pastikan(buka.pertanyaan.length > 0 && buka.pertanyaan.every((p: any) => p.aktif && p.diQr), "pertanyaan QR");
      const sebelum = JSON.stringify(await data.detailKeluarga(rt7, kkId).then((d) => [d.anggota, d.fakta]));
      const body = { idempotencyKey: `uji-${acak()}-kunci`, isi: { versiForm: 1, namaPengisi: "Uji Satu", hubunganPengisi: "Kepala Keluarga", nomorHp: "081234567890", rumahTangga: { s_internet: "ya" }, anggota: [{ nama: "Uji Satu", hubungan: "Kepala Keluarga", jenisKelamin: "Laki-laki", jawaban: {} }] } };
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

    await uji("nomor surat aman saat terbit bersamaan (tanpa duplikat)", async () => {
      for (let i = 0; i < 6; i++) {
        const s = await surat.simpanDraft(rw, draftUji("c_edaran", `Uji paralel ${i}`));
        bersih.surat.push(s.id);
      }
      const hasil = await Promise.all(bersih.surat.map((id) => surat.terbitkan(rw, id)));
      sama(new Set(hasil.map((h) => h.nomorSurat)).size, hasil.length, "nomor unik");
      await harusGagal(() => surat.simpanDraft(rw, draftUji("c_edaran", "Ubah"), bersih.surat[0]), 409, "surat terbit diubah");
      await harusGagal(() => surat.simpanDraft(rt7, draftUji("c_edaran", "RT")), 403, "RT membuat surat");
    });

    await alurLengkap({ pool, data, qr, surat, rt7, rt6, rw, kkId: () => kkId, nik1, bersih, acak });
  } finally {
    await hapusSuratUji(pool, bersih.surat);
    await bersihTtd();
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
  const { pool, data, qr, surat, rt7, rt6, rw, nik1, bersih, acak } = k;
  const dash = await import("../server/wilayah-dashboard");
  const standar = await import("../server/wilayah-standar");
  const kkId: number = k.kkId();
  const { rows: wr } = await pool.query(`SELECT id FROM warga WHERE nik = $1`, [nik1]);
  const wargaId: number = wr[0].id;
  const ids: Record<string, number> = {};

  await uji("fakta: simpan banyak, tidak berubah bila sama, riwayat", async () => {
    const f = [{ subjek: "kk", subjekId: kkId, kunci: "s_internet", nilai: "ya" }, { subjek: "warga", subjekId: wargaId, kunci: "s_jaminan_kesehatan", nilai: "tidak_punya" }];
    sama((await data.simpanBanyakFakta(rt7, f)).disimpan, 2, "disimpan");
    sama((await data.simpanBanyakFakta(rt7, f)).tidakBerubah, 2, "tidak berubah");
    pastikan((await data.riwayatSubjek(rt7, "kk", kkId)).length >= 1, "riwayat kosong");
    await harusGagal(() => data.simpanBanyakFakta(rt6, f), 404, "RT lain menulis fakta");
    await harusGagal(() => data.simpanFakta(rt7, { subjek: "kk", subjekId: kkId, kunci: "air_bersih", nilai: "ya" }), 400, "kunci kecamatan lama");
    await harusGagal(() => data.simpanFakta(rw, f[0]), 403, "RW tanpa pilih RT");
  });
  await uji("kartu KK: kelengkapan dan tanda perhatian dari jawaban standar", async () => {
    const k = (await data.daftarKeluarga(rt7, {})).find((x: any) => x.id === kkId);
    pastikan(k && k.terjawab >= 2 && k.kelengkapan > 0 && k.pertanyaan > k.terjawab, "kelengkapan");
    pastikan(k.perhatian.some((p: any) => p.kunci === "s_jaminan_kesehatan" && p.detail === "1 orang"), "perhatian BPJS");
    sama(k.lansia, 1, "lansia (lahir 1960)");
  });
  await uji("standar: tambah, ubah, kunci tetap, jenis terkunci setelah ada jawaban, arsip & pulihkan", async () => {
    const baru = await standar.tambahStandar(rw, standar.inputStandarSchema.parse({
      subjek: "kk", kelompok: "Kelompok Uji", label: "Uji atap bocor", pertanyaan: "Apakah atap bocor?", tipe: "pilihan",
      pilihan: [{ label: "Tidak bocor" }, { label: "Bocor sedikit" }, { label: "Bocor parah" }], perhatian: ["bocor_parah"],
    }));
    ids.tanya = baru.id!;
    pastikan(baru.kunci.startsWith("s_uji_atap_bocor") && baru.perhatian!.includes("bocor_parah"), "kunci/perhatian");
    await harusGagal(() => qr.validasiJawabanIsi({ ...{ versiForm: 1, namaPengisi: "x", hubunganPengisi: "x", anggota: [] }, rumahTangga: { [baru.kunci]: "roboh" } } as any), 400, "jawaban QR asal");
    await data.simpanFakta(rt7, { subjek: "kk", subjekId: kkId, kunci: baru.kunci, nilai: "bocor_parah" });
    const input = (p: any) => standar.inputStandarSchema.parse({ subjek: "kk", kelompok: "Kelompok Uji", label: "Uji atap", pertanyaan: "Atap?", ...p });
    const ubah = await standar.ubahStandar(rw, baru.id!, input({ tipe: "pilihan", pilihan: baru.pilihan!.map((x: any) => ({ ...x, label: x.label + "!" })) }));
    sama(ubah.kunci, baru.kunci, "kunci berubah");
    await harusGagal(() => standar.ubahStandar(rw, baru.id!, input({ tipe: "yatidak" })), 409, "ganti jenis");
    await harusGagal(() => standar.ubahStandar(rw, baru.id!, input({ tipe: "pilihan", pilihan: baru.pilihan!.slice(0, 2) })), 409, "hapus pilihan terpakai");
    await harusGagal(() => standar.ubahStandar(rw, baru.id!, input({ subjek: "warga", tipe: "pilihan", pilihan: baru.pilihan })), 400, "ganti sasaran");
    await standar.aturAktifStandar(rw, baru.id!, false);
    await harusGagal(() => data.simpanFakta(rt7, { subjek: "kk", subjekId: kkId, kunci: baru.kunci, nilai: "tidak_bocor" }), 400, "tulis ke arsip");
    pastikan(!(await qr.bukaToken(qr.normalisasiToken((await qr.kartuUntukCetak(rt7, [kkId], true))[0].tokenTampil)!)).pertanyaan.some((p: any) => p.kunci === baru.kunci), "arsip tampil di QR");
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM wil_fakta WHERE kunci = $1`, [baru.kunci]);
    sama(rows[0].n, 1, "jawaban hilang saat arsip");
    await standar.aturAktifStandar(rw, baru.id!, true);
    const urut = (await standar.standarAktif("kk")).map((d: any) => d.id);
    await standar.urutkanStandar(rw, [...urut].reverse());
    sama((await standar.standarAktif("kk"))[0].id, urut[urut.length - 1], "urutan");
    await standar.urutkanStandar(rw, urut);
  });
  await uji("rumah: buat dan hubungkan KK", async () => {
    ids.rumah = (await data.buatRumah(rt7, { alamat: "Jl. Uji Rumah" })).id;
    await data.hubungkanKkRumah(rt7, kkId, ids.rumah);
    const r = (await data.daftarRumah(rt7)).find((x: any) => x.id === ids.rumah);
    pastikan(r && r.kk.length === 1, "rumah tidak lengkap");
  });
  await uji("usulan warga: RT terima → fakta resmi berubah dengan sumber usulan", async () => {
    const [kartu] = await qr.kartuUntukCetak(rt7, [kkId], true);
    const token = qr.normalisasiToken(kartu.tokenTampil)!;
    const isi = { versiForm: 1, namaPengisi: "Uji Satu", hubunganPengisi: "Kepala Keluarga", nomorHp: "081234567890", rumahTangga: { s_internet: "tidak" }, anggota: [{ nama: "Uji Satu", hubungan: "Kepala Keluarga", jenisKelamin: "Laki-laki", jawaban: { s_jaminan_kesehatan: "bpjs_pbi" } }] };
    const { kodeTerima } = await qr.kirimUsulan(token, { idempotencyKey: `usl-${acak()}-kunci`, isi }, "127.0.0.2");
    sama((await qr.statusUsulan(kodeTerima)).status, "menunggu", "status");
    const u = (await qr.daftarUsulan(rt7)).find((x: any) => x.kk_id === kkId);
    pastikan(u, "usulan tak muncul di antrean RT");
    await harusGagal(() => qr.detailUsulan(rt6, u.id), 404, "RT lain membuka usulan");
    await qr.detailUsulan(rt7, u.id);
    await qr.putuskanUsulan(rt7, u.id, { aksi: "terima", fakta: [{ subjek: "kk", subjekId: kkId, kunci: "s_internet", nilai: "tidak" }] });
    const d = await data.detailKeluarga(rt7, kkId);
    pastikan(d.fakta.some((f: any) => f.kunci === "s_internet" && f.nilai === "tidak"), "fakta usulan tidak diterapkan");
    await harusGagal(() => qr.putuskanUsulan(rt7, u.id, { aksi: "tolak", catatan: "ulang" }), 409, "diputus dua kali");
  });
  await uji("cetak F4: paket per KK tanpa NIK/No KK, jawaban tercetak, kode kartu hanya di RT sendiri", async () => {
    const [p] = await qr.paketUntukCetak(rt7, [kkId]);
    const json = JSON.stringify(p);
    pastikan(!json.includes(nik1) && !/"nik"|nomorKk|nomor_kk/.test(json), "NIK/No KK bocor ke bahan cetak");
    pastikan(p.anggota.some((a: any) => a.nama === "Uji Satu"), "anggota tidak ada di paket");
    sama(p.jawaban[`kk:${kkId}:s_internet`], "tidak", "jawaban saat ini");
    await harusGagal(() => qr.paketUntukCetak(rt6, [kkId]), 404, "paket lintas RT");
    sama((await qr.kkDariKodeKartu(rt7, p.kodeKartu.toLowerCase())).kkId, kkId, "cari kode kartu");
    await harusGagal(() => qr.kkDariKodeKartu(rt6, p.kodeKartu), 404, "kode kartu lintas RT");
    await data.simpanBanyakFakta(rt7, [{ subjek: "kk", subjekId: kkId, kunci: "s_internet", nilai: "ya", sumber: "formulir_kertas", catatan: `Formulir kertas ${p.kodeKartu}` }]);
    const d = await data.detailKeluarga(rt7, kkId);
    pastikan(d.fakta.some((f: any) => f.kunci === "s_internet" && f.nilai === "ya" && f.sumber === "formulir_kertas"), "sumber formulir_kertas");
  });
  await uji("semua fungsi baca halaman RT/RW berjalan", async () => {
    await Promise.all([
      data.daftarKeluarga(rt7, {}), data.daftarKeluarga(rw, { rt: 1 }), data.cariWarga(rt7, "Uji"),
      data.daftarSerahTerima(rt7), qr.daftarUsulan(rt7, "semua"), standar.daftarStandar({ semua: true }),
      ...["draft", "belum_distribusi", "arsip"].map((b) => surat.daftarSurat(rw, { bagian: b })),
      surat.daftarSurat(rt7, {}), surat.ringkasan(rw), surat.daftarTindak(rw), surat.referensi(rw),
    ]);
    const r = await dash.ringkasanRw();
    pastikan(r.total.kk >= 1 && r.perRt.some((x: any) => x.rt === 7) && r.sebaran.length > 0, "ringkasan RW");
    pastikan(r.perhatian.some((p: any) => p.kunci === "s_jaminan_kesehatan"), "ringkasan perhatian");
  });
  await uji("surat: draft → lampiran → terbit → kirim berbukti → tindak → salin jadi draft baru", async () => {
    const s = await surat.simpanDraft(rw, draftUji("mt_instansi", "Pengantar uji"));
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
       VALUES ('kk', $1, 's_jamban', 'sendiri_septik', current_date, 'perlu_cek', 'data_lama', 6, 'rt', 'uji') RETURNING id`, [kkId]);
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
  if (ids.tanya) {
    const { rows } = await pool.query(`DELETE FROM wil_pertanyaan WHERE id = $1 RETURNING kunci`, [ids.tanya]);
    if (rows[0]) await pool.query(`DELETE FROM wil_fakta WHERE kunci = $1`, [rows[0].kunci]);
    standar.muatUlangStandar();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
