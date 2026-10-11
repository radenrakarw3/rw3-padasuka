/**
 * Migrasi modul wilayah (0023–0026, termasuk Surat Sakti v2 dan standar data RW 03). Default DRY-RUN: SQL dijalankan dalam transaksi lalu ROLLBACK.
 *
 *   npm run wilayah:migrate                 # dry-run + laporan rekonsiliasi
 *   npm run wilayah:migrate -- --apply      # commit
 *   npm run wilayah:migrate -- --import-lama [--apply]
 *       Salin data lama (pendidikan, sumber air, jamban, listrik, bansos) menjadi fakta
 *       berstatus "perlu_cek" — tidak ikut dihitung sampai RT memverifikasi.
 *
 * Tidak pernah menghapus atau mengubah data lama. Rollback: migrations/0023_wilayah.down.sql
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import pg from "pg";

const apply = process.argv.includes("--apply");
const importLama = process.argv.includes("--import-lama");

const TABEL_BARU = [
  "wil_rumah", "wil_rumah_kk", "wil_fakta", "wil_usaha", "wil_usaha_pemilik", "wil_fasilitas", "wil_kelompok",
  "wil_kegiatan", "wil_kegiatan_peserta", "wil_kejadian", "wil_tindak_lanjut", "wil_usulan_koreksi", "wil_serah_terima",
  "wil_konfirmasi", "wil_laporan", "wil_kk_token", "wil_usulan", "wil_audit", "wil_surat_counter", "wil_surat_lampiran",
  "wil_surat_kirim", "wil_surat_tindak", "wil_permintaan_surat",
  "wil_surat_rangkaian", "wil_surat_berkas", "wil_surat_tindak_update", "wil_surat_masuk", "wil_surat_bantuan", "wil_surat_fakta",
  "wil_pertanyaan",
];

/** Pemetaan nilai lama → fakta. Nilai lama punya default (mis. "PDAM"), jadi hasilnya wajib dicek RT. */
const PETA_PENDIDIKAN: Record<string, string> = {
  "tidak/belum sekolah": "tidak_sekolah", "tidak sekolah": "tidak_sekolah", "belum sekolah": "tidak_sekolah",
  "belum tamat sd/sederajat": "belum_tamat_sd", "tamat sd/sederajat": "sd", sd: "sd", "sd/sederajat": "sd",
  sltp: "smp", "sltp/sederajat": "smp", smp: "smp", "smp/sederajat": "smp",
  slta: "sma", "slta/sederajat": "sma", sma: "sma", smk: "sma", "sma/sederajat": "sma",
  "diploma i/ii": "diploma", "akademi/diploma iii/s. muda": "diploma", d3: "diploma", diploma: "diploma",
  "diploma iv/strata i": "s1", s1: "s1", "strata ii": "s2", s2: "s2", "strata iii": "s3", s3: "s3",
};

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum diatur");
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=") ? undefined : process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  const sql = ["0023_wilayah.sql", "0024_wilayah_input_rw.sql", "0025_surat_sakti.sql", "0026_wilayah_standar.sql"]
    .map((f) => fs.readFileSync(path.join(process.cwd(), "migrations", f), "utf8"))
    .join("\n");

  console.log(`\n== Migrasi wilayah 0023 — mode ${apply ? "APPLY (commit)" : "DRY-RUN (rollback)"} ==\n`);

  const sebelum = await client.query<{ t: string; ada: boolean }>(
    `SELECT t, to_regclass(t) IS NOT NULL AS ada FROM unnest($1::text[]) AS t`,
    [TABEL_BARU],
  );
  const sudahAda = sebelum.rows.filter((r) => r.ada).map((r) => r.t);
  console.log(`Tabel sudah ada: ${sudahAda.length}/${TABEL_BARU.length}`);

  console.log("\n-- Rekonsiliasi data lama (tidak diubah) --");
  const perRt = await client.query(
    `SELECT k.rt, COUNT(DISTINCT k.id)::int AS kk, COUNT(w.id)::int AS warga,
            COUNT(w.id) FILTER (WHERE w.status_kependudukan = 'Aktif')::int AS warga_aktif
       FROM kartu_keluarga k LEFT JOIN warga w ON w.kk_id = k.id
      GROUP BY k.rt ORDER BY k.rt`,
  );
  console.table(perRt.rows);
  const rtBaru = perRt.rows.filter((r) => r.rt >= 5 && r.rt <= 7);
  console.log(rtBaru.length ? `Catatan: ada data lama di RT05–07 (${rtBaru.map((r) => r.rt).join(", ")}) — tidak dipindah.` : "RT05–07 belum punya data lama (sesuai harapan; tidak dibuat data apa pun).");
  const suratLama = await client.query(`SELECT COUNT(*)::int AS n, COUNT(nomor_surat)::int AS bernomor FROM surat_rw`);
  console.log(`Surat RW lama: ${suratLama.rows[0].n} (bernomor ${suratLama.rows[0].bernomor}) — akan ditandai status 'terbit'.`);

  await client.query("BEGIN");
  try {
    await client.query(sql);

    // Inisialisasi penghitung nomor surat dari nomor lama tahun berjalan (format "NNN/...").
    await client.query(`
      INSERT INTO wil_surat_counter (tahun, terakhir)
      SELECT EXTRACT(YEAR FROM created_at)::int, MAX(NULLIF(split_part(nomor_surat, '/', 1), '')::int)
        FROM surat_rw
       WHERE nomor_surat ~ '^[0-9]+/'
       GROUP BY 1
      ON CONFLICT (tahun) DO UPDATE SET terakhir = GREATEST(wil_surat_counter.terakhir, EXCLUDED.terakhir)`);

    if (importLama) {
      const kk = await client.query(`SELECT id, rt, sumber_air, sanitasi_wc, penerima_bansos, jenis_bansos FROM kartu_keluarga`);
      const warga = await client.query(`SELECT w.id, k.rt, w.pendidikan FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id WHERE w.pendidikan IS NOT NULL`);
      let n = 0;
      const tambah = async (subjek: string, id: number, rt: number, kunci: string, nilai: string, catatan: string) => {
        const r = await client.query(
          `INSERT INTO wil_fakta (subjek, subjek_id, kunci, nilai, mulai, sumber, catatan, rt, status_verifikasi, dicatat_role, dicatat_oleh)
           SELECT $1, $2, $3, $4, current_date, 'data_lama', $5, $6, 'perlu_cek', 'sistem', 'migrasi-0023'
            WHERE NOT EXISTS (SELECT 1 FROM wil_fakta WHERE subjek = $1 AND subjek_id = $2 AND kunci = $3 AND sumber = 'data_lama')`,
          [subjek, id, kunci, nilai, catatan, rt],
        );
        n += r.rowCount ?? 0;
      };
      for (const w of warga.rows) {
        const v = PETA_PENDIDIKAN[String(w.pendidikan).trim().toLowerCase()];
        if (v) await tambah("warga", w.id, w.rt, "pendidikan_terakhir", v, `Nilai lama: ${w.pendidikan}`);
      }
      for (const k of kk.rows) {
        const air = String(k.sumber_air ?? "").toLowerCase();
        if (air) await tambah("kk", k.id, k.rt, "air_bersih", /tidak|sungai|hujan/.test(air) ? "tidak" : "ya", `Nilai lama: ${k.sumber_air}`);
        const wc = String(k.sanitasi_wc ?? "").toLowerCase();
        if (wc) await tambah("kk", k.id, k.rt, "jamban", /tidak|sungai|kebun/.test(wc) ? "tidak" : "ya", `Nilai lama: ${k.sanitasi_wc}`);
        if (k.penerima_bansos && k.jenis_bansos) {
          const j = String(k.jenis_bansos).toLowerCase();
          for (const [kunci, pola] of [["bantuan_pkh", /pkh/], ["bantuan_bpnt", /bpnt|sembako/], ["bantuan_blt", /blt/], ["bantuan_pbi_jk", /pbi|kis/]] as const) {
            if (pola.test(j)) await tambah("kk", k.id, k.rt, kunci, "ya", `Nilai lama: ${k.jenis_bansos}`);
          }
        }
      }
      console.log(`\nImpor data lama: ${n} fakta 'perlu_cek' (tidak dihitung sampai diverifikasi RT).`);
    }

    const sesudah = await client.query<{ t: string; ada: boolean }>(
      `SELECT t, to_regclass(t) IS NOT NULL AS ada FROM unnest($1::text[]) AS t`,
      [TABEL_BARU],
    );
    const dibuat = sesudah.rows.filter((r) => r.ada && !sudahAda.includes(r.t)).map((r) => r.t);
    console.log(`\nTabel baru: ${dibuat.length ? dibuat.join(", ") : "(tidak ada — sudah termigrasi)"}`);
    const counter = await client.query(`SELECT * FROM wil_surat_counter ORDER BY tahun`);
    console.log("Penghitung nomor surat:", counter.rows);

    if (apply) {
      await client.query("COMMIT");
      console.log("\nSELESAI: perubahan disimpan.");
    } else {
      await client.query("ROLLBACK");
      console.log("\nDRY-RUN: semua perubahan dibatalkan. Jalankan dengan --apply untuk menyimpan.");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("\nGAGAL — tidak ada perubahan disimpan:", error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
