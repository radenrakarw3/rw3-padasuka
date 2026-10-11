/**
 * Standar data RW 03: daftar pertanyaan keluarga & anggota (tabel wil_pertanyaan).
 * Hapus = arsip (aktif=false) agar jawaban lama tetap tersimpan. Kunci tidak pernah berubah.
 */
import { z } from "zod";
import { pool } from "./db";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import { STANDAR_AWAL, TIPE_FAKTA, SUBJEK_STANDAR, type DefinisiFakta } from "@shared/wilayah";

type Baris = Record<string, any>;

function keDefinisi(r: Baris): DefinisiFakta {
  return {
    id: r.id,
    kunci: r.kunci,
    subjek: r.subjek,
    kelompok: r.kelompok,
    label: r.label,
    pertanyaan: r.pertanyaan,
    bantuan: r.bantuan,
    tipe: r.tipe,
    pilihan: r.pilihan ?? [],
    perhatian: r.perhatian ?? [],
    diQr: r.di_qr,
    khususPerempuan: r.khusus_perempuan,
    usiaMin: r.usia_min,
    usiaMax: r.usia_max,
    urutan: r.urutan,
    aktif: r.aktif,
  };
}

let cache: { semua: DefinisiFakta[]; peta: Map<string, DefinisiFakta> } | null = null;

function hapusCache() {
  cache = null;
}

async function isiAwalBilaKosong() {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM wil_pertanyaan`);
  if (rows[0].n > 0) return;
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('wil_pertanyaan_awal'))`);
    const cek = await c.query(`SELECT COUNT(*)::int AS n FROM wil_pertanyaan`);
    if (cek.rows[0].n === 0) {
      for (const d of STANDAR_AWAL) {
        await c.query(
          `INSERT INTO wil_pertanyaan (kunci, subjek, kelompok, label, pertanyaan, bantuan, tipe, pilihan, perhatian, di_qr, khusus_perempuan, usia_min, usia_max, urutan, diubah_oleh)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'standar awal')`,
          [d.kunci, d.subjek, d.kelompok, d.label, d.pertanyaan, d.bantuan ?? null, d.tipe, JSON.stringify(d.pilihan ?? []), JSON.stringify(d.perhatian ?? []),
            d.diQr ?? true, d.khususPerempuan ?? false, d.usiaMin ?? null, d.usiaMax ?? null, d.urutan ?? 0],
        );
      }
    }
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

async function muat() {
  if (cache) return cache;
  await isiAwalBilaKosong();
  const { rows } = await pool.query(`SELECT * FROM wil_pertanyaan ORDER BY subjek, urutan, id`);
  const semua = rows.map(keDefinisi);
  cache = { semua, peta: new Map(semua.map((d) => [d.kunci, d])) };
  return cache;
}

/** Semua pertanyaan (termasuk yang diarsipkan) per kunci. */
export async function registri(): Promise<Map<string, DefinisiFakta>> {
  return (await muat()).peta;
}

export async function daftarStandar(opsi: { semua?: boolean } = {}): Promise<DefinisiFakta[]> {
  const { semua } = await muat();
  return opsi.semua ? semua : semua.filter((d) => d.aktif);
}

export async function standarAktif(subjek?: "kk" | "warga"): Promise<DefinisiFakta[]> {
  return (await daftarStandar()).filter((d) => !subjek || d.subjek === subjek);
}

// ---------------------------------------------------------------------------
// Ubah standar (admin RW)
// ---------------------------------------------------------------------------

const teks = (maks: number) => z.string().trim().min(1).max(maks);

export const inputStandarSchema = z.object({
  subjek: z.enum(SUBJEK_STANDAR),
  kelompok: teks(60),
  label: teks(80),
  pertanyaan: teks(240),
  bantuan: z.string().trim().max(240).nullish(),
  tipe: z.enum(TIPE_FAKTA),
  pilihan: z.array(z.object({ nilai: z.string().trim().max(40).optional(), label: teks(100) })).max(30).default([]),
  perhatian: z.array(z.string()).max(30).default([]),
  diQr: z.boolean().default(true),
  khususPerempuan: z.boolean().default(false),
  usiaMin: z.number().int().min(0).max(120).nullish(),
  usiaMax: z.number().int().min(0).max(120).nullish(),
});
export type InputStandar = z.infer<typeof inputStandarSchema>;

function slug(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "x";
}

function rapikan(input: InputStandar, lama?: DefinisiFakta) {
  let pilihan: { nilai: string; label: string }[] = [];
  if (input.tipe === "pilihan" || input.tipe === "banyak") {
    const dipakai = new Set<string>();
    for (const x of input.pilihan) {
      let nilai = x.nilai && lama?.pilihan?.some((q) => q.nilai === x.nilai) ? x.nilai : slug(x.label);
      for (let i = 2; dipakai.has(nilai); i++) nilai = `${slug(x.label)}_${i}`;
      dipakai.add(nilai);
      pilihan.push({ nilai, label: x.label });
    }
    if (pilihan.length < 2) throw new WilayahError(400, "Isi minimal dua pilihan jawaban");
  }
  const sah = input.tipe === "yatidak" ? ["ya", "tidak"] : pilihan.map((x) => x.nilai);
  const perhatian = Array.from(new Set(input.perhatian.filter((v) => sah.includes(v))));
  if (input.usiaMin != null && input.usiaMax != null && input.usiaMin > input.usiaMax) throw new WilayahError(400, "Usia minimum melebihi usia maksimum");
  return { ...input, pilihan, perhatian, bantuan: input.bantuan || null, khususPerempuan: input.subjek === "warga" && input.khususPerempuan };
}

async function jumlahJawaban(kunci: string): Promise<number> {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM wil_fakta WHERE subjek IN ('kk','warga') AND kunci = $1`, [kunci]);
  return rows[0].n;
}

async function ambil(id: number): Promise<DefinisiFakta> {
  const d = (await muat()).semua.find((x) => x.id === id);
  if (!d) throw new WilayahError(404, "Pertanyaan tidak ditemukan");
  return d;
}

export async function tambahStandar(aktor: Aktor, input: InputStandar): Promise<DefinisiFakta> {
  const v = rapikan(input);
  const { peta } = await muat();
  let kunci = `s_${slug(v.label)}`;
  for (let i = 2; peta.has(kunci); i++) kunci = `s_${slug(v.label)}_${i}`;
  const { rows } = await pool.query(
    `INSERT INTO wil_pertanyaan (kunci, subjek, kelompok, label, pertanyaan, bantuan, tipe, pilihan, perhatian, di_qr, khusus_perempuan, usia_min, usia_max, urutan, diubah_oleh)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
       (SELECT COALESCE(MAX(urutan),0)+10 FROM wil_pertanyaan WHERE subjek=$2), $14)
     RETURNING *`,
    [kunci, v.subjek, v.kelompok, v.label, v.pertanyaan, v.bantuan, v.tipe, JSON.stringify(v.pilihan), JSON.stringify(v.perhatian),
      v.diQr, v.khususPerempuan, v.usiaMin ?? null, v.usiaMax ?? null, aktor.label],
  );
  hapusCache();
  const d = keDefinisi(rows[0]);
  await catatAudit(aktor, "tambah", "wil_pertanyaan", d.id!, null, null, d);
  return d;
}

export async function ubahStandar(aktor: Aktor, id: number, input: InputStandar): Promise<DefinisiFakta> {
  const lama = await ambil(id);
  if (input.subjek !== lama.subjek) throw new WilayahError(400, "Sasaran pertanyaan (keluarga/anggota) tidak dapat diubah. Buat pertanyaan baru.");
  const v = rapikan(input, lama);
  const n = await jumlahJawaban(lama.kunci);
  if (n > 0) {
    if (v.tipe !== lama.tipe) throw new WilayahError(409, `Jenis jawaban tidak dapat diubah karena sudah ada ${n} jawaban. Arsipkan lalu buat pertanyaan baru.`);
    const hilang = (lama.pilihan ?? []).filter((x) => !v.pilihan.some((q) => q.nilai === x.nilai)).map((x) => x.nilai);
    if (hilang.length) {
      const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS n FROM wil_fakta
          WHERE subjek IN ('kk','warga') AND kunci = $1 AND string_to_array(nilai, ',') && $2::text[]`,
        [lama.kunci, hilang],
      );
      if (rows[0].n > 0) throw new WilayahError(409, `Ada ${rows[0].n} jawaban yang memakai pilihan yang dihapus. Ubah labelnya saja, jangan dihapus.`);
    }
  }
  const { rows } = await pool.query(
    `UPDATE wil_pertanyaan SET kelompok=$2, label=$3, pertanyaan=$4, bantuan=$5, tipe=$6, pilihan=$7, perhatian=$8, di_qr=$9,
       khusus_perempuan=$10, usia_min=$11, usia_max=$12, diubah_oleh=$13, updated_at=now()
     WHERE id=$1 RETURNING *`,
    [id, v.kelompok, v.label, v.pertanyaan, v.bantuan, v.tipe, JSON.stringify(v.pilihan), JSON.stringify(v.perhatian),
      v.diQr, v.khususPerempuan, v.usiaMin ?? null, v.usiaMax ?? null, aktor.label],
  );
  hapusCache();
  const d = keDefinisi(rows[0]);
  await catatAudit(aktor, "ubah", "wil_pertanyaan", id, null, lama, d);
  return d;
}

export async function aturAktifStandar(aktor: Aktor, id: number, aktif: boolean): Promise<DefinisiFakta> {
  const lama = await ambil(id);
  const { rows } = await pool.query(`UPDATE wil_pertanyaan SET aktif=$2, diubah_oleh=$3, updated_at=now() WHERE id=$1 RETURNING *`, [id, aktif, aktor.label]);
  hapusCache();
  await catatAudit(aktor, aktif ? "pulihkan" : "arsipkan", "wil_pertanyaan", id, null, { aktif: lama.aktif }, { aktif });
  return keDefinisi(rows[0]);
}

export async function urutkanStandar(aktor: Aktor, ids: number[]): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (let i = 0; i < ids.length; i++) await c.query(`UPDATE wil_pertanyaan SET urutan=$2, updated_at=now() WHERE id=$1`, [ids[i], (i + 1) * 10]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  hapusCache();
  await catatAudit(aktor, "urutkan", "wil_pertanyaan", null, null, null, { ids });
}

/** Untuk uji: paksa muat ulang dari database. */
export function muatUlangStandar() {
  hapusCache();
}
