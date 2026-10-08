/**
 * Layanan data wilayah. Semua fungsi menerima Aktor; scope RT diambil dari aktor (sesi), bukan dari input.
 */
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { invalidateKk, invalidateWarga } from "./cache";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import {
  BAGIAN_KONFIRMASI,
  FAKTA_BY_KUNCI,
  FAKTA_INTI_KK,
  FAKTA_INTI_WARGA,
  JENIS_FASILITAS,
  JENIS_KEGIATAN,
  JENIS_KEJADIAN,
  JENIS_KELOMPOK,
  KATEGORI_USAHA,
  STATUS_KEJADIAN,
  isWilayahRt,
  isoTanggal,
  umurTahun,
  validasiNilaiFakta,
  type SubjekFakta,
} from "@shared/wilayah";
import { isNomorHpValid, looksLikeNik, maskNik, normalizeNomorHp } from "@shared/kontak";

type Q = { query: PoolClient["query"] };

const hariIni = () => isoTanggal(new Date());
const tanggalSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD");
const rtSchema = z.number().int().refine(isWilayahRt, "RT harus 1–7");
const nilaiDari = <T extends readonly { nilai: string }[]>(arr: T) => arr.map((a) => a.nilai) as [string, ...string[]];

export async function denganTransaksi<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

function wajibRt(aktor: Aktor): number {
  if (aktor.role !== "rt" || !aktor.rt) throw new WilayahError(403, "Hanya Ketua RT yang dapat mengubah data ini");
  return aktor.rt;
}

/** RT hanya boleh menyentuh RT-nya; RW boleh membaca semua. */
function cekBaca(aktor: Aktor, rtObjek: number | null) {
  if (aktor.role === "rt" && rtObjek !== aktor.rt) throw new WilayahError(404, "Data tidak ditemukan di wilayah RT Anda");
}

async function rtDariKk(kkId: number, q: Q = pool): Promise<number> {
  const { rows } = await q.query(`SELECT rt FROM kartu_keluarga WHERE id = $1`, [kkId]);
  if (!rows[0]) throw new WilayahError(404, "KK tidak ditemukan");
  return rows[0].rt;
}

async function rtDariWarga(wargaId: number, q: Q = pool): Promise<{ rt: number; kkId: number }> {
  const { rows } = await q.query(`SELECT k.rt, w.kk_id FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id WHERE w.id = $1`, [wargaId]);
  if (!rows[0]) throw new WilayahError(404, "Warga tidak ditemukan");
  return { rt: rows[0].rt, kkId: rows[0].kk_id };
}

// ===========================================================================
// Keluarga (daftar kontak) & detail
// ===========================================================================

export interface KeluargaRingkas {
  id: number;
  rt: number;
  kepala: string | null;
  alamat: string;
  noUnit: string | null;
  anggota: number;
  kelengkapan: number;
  punyaRumah: boolean;
  punyaQr: boolean;
  usulanMenunggu: number;
}

export async function daftarKeluarga(aktor: Aktor, opsi: { rt?: number | null; cari?: string; batas?: number }): Promise<KeluargaRingkas[]> {
  const rt = aktor.role === "rt" ? aktor.rt : opsi.rt ?? null;
  const cari = (opsi.cari ?? "").trim().toLowerCase();
  const batas = Math.min(opsi.batas ?? 300, 1000);
  const params: unknown[] = [];
  const where: string[] = [];
  if (rt) {
    params.push(rt);
    where.push(`k.rt = $${params.length}`);
  }
  if (cari) {
    params.push(`%${cari}%`);
    where.push(`(lower(k.alamat) LIKE $${params.length} OR EXISTS (SELECT 1 FROM warga x WHERE x.kk_id = k.id AND lower(x.nama_lengkap) LIKE $${params.length}))`);
  }
  params.push([...FAKTA_INTI_KK], [...FAKTA_INTI_WARGA], batas);
  const pKk = params.length - 2;
  const pW = params.length - 1;
  const pBatas = params.length;
  const { rows } = await pool.query(
    `SELECT k.id, k.rt, k.alamat, k.no_unit,
            (SELECT nama_lengkap FROM warga w WHERE w.kk_id = k.id AND w.kedudukan_keluarga = 'Kepala Keluarga' ORDER BY w.id LIMIT 1) AS kepala,
            (SELECT COUNT(*)::int FROM warga w WHERE w.kk_id = k.id AND w.status_kependudukan = 'Aktif') AS anggota,
            (SELECT COUNT(DISTINCT f.kunci)::int FROM wil_fakta f WHERE f.subjek = 'kk' AND f.subjek_id = k.id AND f.kunci = ANY($${pKk}) AND f.sampai IS NULL AND f.status_verifikasi = 'terverifikasi') AS fakta_kk,
            (SELECT COUNT(*)::int FROM wil_fakta f JOIN warga w ON w.id = f.subjek_id
               WHERE f.subjek = 'warga' AND w.kk_id = k.id AND w.status_kependudukan = 'Aktif' AND f.kunci = ANY($${pW}) AND f.sampai IS NULL AND f.status_verifikasi = 'terverifikasi') AS fakta_warga,
            EXISTS (SELECT 1 FROM wil_rumah_kk rk WHERE rk.kk_id = k.id AND rk.sampai IS NULL) AS punya_rumah,
            EXISTS (SELECT 1 FROM wil_kk_token t WHERE t.kk_id = k.id AND t.dicabut_at IS NULL AND t.expires_at > now()) AS punya_qr,
            (SELECT COUNT(*)::int FROM wil_usulan u WHERE u.kk_id = k.id AND u.status = 'menunggu') AS usulan_menunggu
       FROM kartu_keluarga k
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY k.rt, kepala NULLS LAST, k.id
      LIMIT $${pBatas}`,
    params,
  );
  return rows.map((r) => {
    const target = FAKTA_INTI_KK.length + FAKTA_INTI_WARGA.length * Math.max(r.anggota, 1) + 1;
    const terisi = r.fakta_kk + r.fakta_warga + (r.punya_rumah ? 1 : 0);
    return {
      id: r.id, rt: r.rt, kepala: r.kepala, alamat: r.alamat, noUnit: r.no_unit, anggota: r.anggota,
      kelengkapan: Math.min(1, terisi / target), punyaRumah: r.punya_rumah, punyaQr: r.punya_qr, usulanMenunggu: r.usulan_menunggu,
    };
  });
}

export interface FaktaView {
  id: number;
  subjek: SubjekFakta;
  subjekId: number;
  kunci: string;
  nilai: string;
  mulai: string;
  sumber: string;
  catatan: string | null;
  statusVerifikasi: string;
  dicatatOleh: string | null;
}

async function faktaAktif(subjek: SubjekFakta, ids: number[], q: Q = pool): Promise<FaktaView[]> {
  if (!ids.length) return [];
  const { rows } = await q.query(
    `SELECT id, subjek, subjek_id, kunci, nilai, to_char(mulai, 'YYYY-MM-DD') AS mulai, sumber, catatan, status_verifikasi, dicatat_oleh
       FROM wil_fakta
      WHERE subjek = $1 AND subjek_id = ANY($2) AND sampai IS NULL AND status_verifikasi IN ('terverifikasi', 'perlu_cek')
      ORDER BY mulai DESC, id DESC`,
    [subjek, ids],
  );
  return rows.map((r) => ({
    id: r.id, subjek: r.subjek, subjekId: r.subjek_id, kunci: r.kunci, nilai: r.nilai, mulai: r.mulai,
    sumber: r.sumber, catatan: r.catatan, statusVerifikasi: r.status_verifikasi, dicatatOleh: r.dicatat_oleh,
  }));
}

export async function detailKeluarga(aktor: Aktor, kkId: number) {
  const { rows: kkRows } = await pool.query(`SELECT id, rt, alamat, no_unit, nomor_kk FROM kartu_keluarga WHERE id = $1`, [kkId]);
  const kk = kkRows[0];
  if (!kk) throw new WilayahError(404, "KK tidak ditemukan");
  cekBaca(aktor, kk.rt);

  const { rows: anggota } = await pool.query(
    `SELECT id, nama_lengkap, nik, jenis_kelamin, tanggal_lahir, kedudukan_keluarga, status_perkawinan, status_kependudukan, nomor_whatsapp
       FROM warga WHERE kk_id = $1 ORDER BY CASE WHEN kedudukan_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END, tanggal_lahir NULLS LAST, id`,
    [kkId],
  );
  const { rows: rumahRows } = await pool.query(
    `SELECT r.id, r.alamat, r.no_unit,
            (SELECT COUNT(*)::int FROM wil_rumah_kk x WHERE x.rumah_id = r.id AND x.sampai IS NULL) AS jumlah_kk
       FROM wil_rumah_kk rk JOIN wil_rumah r ON r.id = rk.rumah_id
      WHERE rk.kk_id = $1 AND rk.sampai IS NULL`,
    [kkId],
  );
  const rumah = rumahRows[0] ?? null;
  const { rows: usaha } = await pool.query(
    `SELECT DISTINCT u.id, u.nama, u.kategori FROM wil_usaha u
       JOIN wil_usaha_pemilik p ON p.usaha_id = u.id JOIN warga w ON w.id = p.warga_id
      WHERE w.kk_id = $1 AND u.sampai IS NULL`,
    [kkId],
  );
  const { rows: token } = await pool.query(
    `SELECT kode_kartu, created_at, expires_at FROM wil_kk_token WHERE kk_id = $1 AND dicabut_at IS NULL`,
    [kkId],
  );
  const { rows: usulan } = await pool.query(
    `SELECT id, status, created_at, kode_terima FROM wil_usulan WHERE kk_id = $1 ORDER BY created_at DESC LIMIT 10`,
    [kkId],
  );

  const wargaIds = anggota.map((a) => a.id);
  const [faktaKk, faktaWarga, faktaRumah] = await Promise.all([
    faktaAktif("kk", [kkId]),
    faktaAktif("warga", wargaIds),
    rumah ? faktaAktif("rumah", [rumah.id]) : Promise.resolve([]),
  ]);

  const rw = aktor.role === "rw";
  if (rw) await catatAudit(aktor, "lihat_detail", "kk", kkId, kk.rt);

  const acuan = hariIni();
  return {
    kk: { id: kk.id, rt: kk.rt, alamat: kk.alamat, noUnit: kk.no_unit, nomorKk: rw ? maskNik(kk.nomor_kk) : kk.nomor_kk },
    anggota: anggota.map((a) => ({
      id: a.id,
      nama: a.nama_lengkap,
      nik: rw ? maskNik(a.nik) : a.nik,
      jenisKelamin: a.jenis_kelamin,
      tanggalLahir: a.tanggal_lahir,
      umur: umurTahun(a.tanggal_lahir, acuan),
      kedudukan: a.kedudukan_keluarga,
      statusPerkawinan: a.status_perkawinan,
      status: a.status_kependudukan,
      nomorHp: rw ? null : isNomorHpValid(a.nomor_whatsapp) ? normalizeNomorHp(a.nomor_whatsapp) : null,
      nomorHpPerluCek: !rw && !!a.nomor_whatsapp && !isNomorHpValid(a.nomor_whatsapp),
      fakta: faktaWarga.filter((f) => f.subjekId === a.id),
    })),
    rumah: rumah ? { id: rumah.id, alamat: rumah.alamat, noUnit: rumah.no_unit, jumlahKk: rumah.jumlah_kk, fakta: faktaRumah } : null,
    usaha: usaha.map((u) => ({ id: u.id, nama: u.nama, kategori: u.kategori })),
    fakta: faktaKk,
    qr: token[0] ? { kodeKartu: token[0].kode_kartu, dibuat: token[0].created_at, berlakuSampai: token[0].expires_at } : null,
    usulan: usulan.map((u) => ({ id: u.id, status: u.status, dibuat: u.created_at, kodeTerima: u.kode_terima })),
  };
}

// ===========================================================================
// Master KK & warga (hanya RT, untuk RT-nya sendiri)
// ===========================================================================

const kkBaruSchema = z.object({
  nomorKk: z.string().regex(/^\d{16}$/, "Nomor KK harus 16 digit"),
  alamat: z.string().trim().min(3, "Alamat wajib diisi"),
  noUnit: z.string().trim().max(20).optional().nullable(),
});

export async function tambahKeluarga(aktor: Aktor, input: unknown) {
  const rt = wajibRt(aktor);
  const d = kkBaruSchema.parse(input);
  const { rows: ada } = await pool.query(`SELECT id, rt FROM kartu_keluarga WHERE nomor_kk = $1`, [d.nomorKk]);
  if (ada[0]) {
    throw new WilayahError(409, ada[0].rt === rt ? "Nomor KK ini sudah ada di RT Anda" : "Nomor KK ini sudah tercatat di RT lain. Gunakan serah-terima pindah RT.");
  }
  const { rows } = await pool.query(
    `INSERT INTO kartu_keluarga (nomor_kk, rt, alamat, no_unit, jumlah_penghuni) VALUES ($1, $2, $3, $4, 0) RETURNING id`,
    [d.nomorKk, rt, d.alamat, d.noUnit || null],
  );
  await catatAudit(aktor, "tambah", "kk", rows[0].id, rt, null, { alamat: d.alamat, noUnit: d.noUnit });
  invalidateKk();
  return { id: rows[0].id as number };
}

export const KEDUDUKAN = ["Kepala Keluarga", "Istri", "Suami", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain", "Lainnya"] as const;
export const STATUS_KAWIN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"] as const;
export const STATUS_PENDUDUK = ["Aktif", "Pindah", "Meninggal"] as const;

const wargaFields = {
  nama: z.string().trim().min(2, "Nama wajib diisi"),
  jenisKelamin: z.enum(["Laki-laki", "Perempuan"]),
  tanggalLahir: tanggalSchema.nullable().optional(),
  kedudukan: z.enum(KEDUDUKAN),
  statusPerkawinan: z.enum(STATUS_KAWIN),
  nomorHp: z.string().trim().max(20).nullable().optional(),
};

const wargaBaruSchema = z.object({ ...wargaFields, nik: z.string().regex(/^\d{16}$/, "NIK harus 16 digit") });
const wargaUbahSchema = z.object({ ...wargaFields, status: z.enum(STATUS_PENDUDUK) }).partial();

function cekNomorHp(v: string | null | undefined): string | null {
  if (!v) return null;
  if (looksLikeNik(v)) throw new WilayahError(400, "Nomor HP terlihat seperti NIK. Isi nomor HP yang benar (08…).");
  const n = normalizeNomorHp(v);
  if (!n) throw new WilayahError(400, "Nomor HP tidak valid (contoh: 0812xxxxxxx)");
  return n;
}

export async function tambahWarga(aktor: Aktor, kkId: number, input: unknown) {
  const rt = wajibRt(aktor);
  if ((await rtDariKk(kkId)) !== rt) throw new WilayahError(404, "KK tidak ditemukan di wilayah RT Anda");
  const d = wargaBaruSchema.parse(input);
  const hp = cekNomorHp(d.nomorHp);
  const { rows: ada } = await pool.query(`SELECT w.id, k.rt FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id WHERE w.nik = $1`, [d.nik]);
  if (ada[0]) {
    throw new WilayahError(409, ada[0].rt === rt ? "NIK ini sudah tercatat di RT Anda" : "NIK ini sudah tercatat di RT lain. Gunakan serah-terima pindah RT, jangan membuat data ganda.");
  }
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(
      `INSERT INTO warga (kk_id, nama_lengkap, nik, jenis_kelamin, tanggal_lahir, kedudukan_keluarga, status_perkawinan, nomor_whatsapp, status_kependudukan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Aktif') RETURNING id`,
      [kkId, d.nama, d.nik, d.jenisKelamin, d.tanggalLahir ?? null, d.kedudukan, d.statusPerkawinan, hp],
    );
    await c.query(`UPDATE kartu_keluarga SET jumlah_penghuni = (SELECT COUNT(*) FROM warga WHERE kk_id = $1) WHERE id = $1`, [kkId]);
    await catatAudit(aktor, "tambah", "warga", rows[0].id, rt, null, { nama: d.nama, kkId }, c);
    invalidateWarga();
    return { id: rows[0].id as number };
  });
}

export async function ubahWarga(aktor: Aktor, wargaId: number, input: unknown) {
  const rt = wajibRt(aktor);
  const lokasi = await rtDariWarga(wargaId);
  if (lokasi.rt !== rt) throw new WilayahError(404, "Warga tidak ditemukan di wilayah RT Anda");
  const d = wargaUbahSchema.parse(input);
  const kolom: Record<string, unknown> = {};
  if (d.nama !== undefined) kolom.nama_lengkap = d.nama;
  if (d.jenisKelamin !== undefined) kolom.jenis_kelamin = d.jenisKelamin;
  if (d.tanggalLahir !== undefined) kolom.tanggal_lahir = d.tanggalLahir;
  if (d.kedudukan !== undefined) kolom.kedudukan_keluarga = d.kedudukan;
  if (d.statusPerkawinan !== undefined) kolom.status_perkawinan = d.statusPerkawinan;
  if (d.status !== undefined) kolom.status_kependudukan = d.status;
  if (d.nomorHp !== undefined) kolom.nomor_whatsapp = cekNomorHp(d.nomorHp);
  const keys = Object.keys(kolom);
  if (!keys.length) throw new WilayahError(400, "Tidak ada perubahan");
  return denganTransaksi(async (c) => {
    const { rows: before } = await c.query(`SELECT ${keys.join(", ")} FROM warga WHERE id = $1 FOR UPDATE`, [wargaId]);
    await c.query(`UPDATE warga SET ${keys.map((k, i) => `${k} = $${i + 2}`).join(", ")} WHERE id = $1`, [wargaId, ...keys.map((k) => kolom[k])]);
    await catatAudit(aktor, "ubah", "warga", wargaId, rt, before[0], kolom, c);
    invalidateWarga();
    return { ok: true };
  });
}

// ===========================================================================
// Fakta berwaktu
// ===========================================================================

const faktaSchema = z.object({
  subjek: z.enum(["warga", "kk", "rumah", "usaha", "fasilitas"]),
  subjekId: z.number().int().positive(),
  kunci: z.string(),
  /** null = jadikan "belum diketahui" (mengakhiri fakta yang berlaku). */
  nilai: z.string().nullable(),
  mulai: tanggalSchema.optional(),
  sumber: z.string().min(2).optional(),
  catatan: z.string().max(500).optional().nullable(),
});

/** Menentukan RT pemilik subjek dan memastikan aktor berhak menulis. */
async function scopeTulisSubjek(aktor: Aktor, subjek: SubjekFakta, id: number, q: Q): Promise<number | null> {
  if (subjek === "fasilitas") {
    const { rows } = await q.query(`SELECT pengelola, rt_pengelola, rt_lokasi FROM wil_fasilitas WHERE id = $1`, [id]);
    const f = rows[0];
    if (!f) throw new WilayahError(404, "Fasilitas tidak ditemukan");
    if (f.pengelola === "rw" ? aktor.role !== "rw" : aktor.role !== "rt" || aktor.rt !== f.rt_pengelola) {
      throw new WilayahError(403, f.pengelola === "rw" ? "Fasilitas ini dikelola RW. Kirim usulan koreksi." : "Fasilitas ini dikelola RT lain");
    }
    return f.rt_lokasi ?? f.rt_pengelola ?? null;
  }
  const rt = wajibRt(aktor);
  let rtSubjek: number;
  if (subjek === "warga") rtSubjek = (await rtDariWarga(id, q)).rt;
  else if (subjek === "kk") rtSubjek = await rtDariKk(id, q);
  else {
    const tabel = subjek === "rumah" ? "wil_rumah" : "wil_usaha";
    const { rows } = await q.query(`SELECT rt FROM ${tabel} WHERE id = $1`, [id]);
    if (!rows[0]) throw new WilayahError(404, "Data tidak ditemukan");
    rtSubjek = rows[0].rt;
  }
  if (rtSubjek !== rt) throw new WilayahError(404, "Data tidak ditemukan di wilayah RT Anda");
  return rt;
}

export async function simpanFakta(aktor: Aktor, input: unknown, q?: PoolClient) {
  const d = faktaSchema.parse(input);
  const def = FAKTA_BY_KUNCI.get(d.kunci);
  if (!def || def.subjek !== d.subjek) throw new WilayahError(400, "Pertanyaan tidak dikenal");
  if (d.nilai != null) {
    const err = validasiNilaiFakta(def, d.nilai);
    if (err) throw new WilayahError(400, `${def.label}: ${err}`);
  }
  const sumber = d.sumber ?? (aktor.role === "rt" ? "kunjungan_rt" : "keterangan_keluarga");
  if (def.wajibSumber && d.nilai != null && !d.sumber) throw new WilayahError(400, `${def.label}: sebutkan sumber informasinya`);
  const mulai = d.mulai ?? hariIni();
  if (mulai > hariIni()) throw new WilayahError(400, "Tanggal tidak boleh di masa depan");

  const jalankan = async (c: PoolClient) => {
    const rt = await scopeTulisSubjek(aktor, d.subjek, d.subjekId, c);
    if (def.khususPerempuan && d.subjek === "warga" && d.nilai === "ya") {
      const { rows } = await c.query(`SELECT jenis_kelamin FROM warga WHERE id = $1`, [d.subjekId]);
      if (rows[0]?.jenis_kelamin !== "Perempuan") throw new WilayahError(400, `${def.label} hanya untuk perempuan`);
    }
    const { rows: lama } = await c.query(
      `SELECT id, nilai, to_char(mulai, 'YYYY-MM-DD') AS mulai FROM wil_fakta
        WHERE subjek = $1 AND subjek_id = $2 AND kunci = $3 AND sampai IS NULL AND status_verifikasi = 'terverifikasi'
        ORDER BY mulai DESC, id DESC FOR UPDATE`,
      [d.subjek, d.subjekId, d.kunci],
    );
    const sebelum = lama[0] ?? null;
    if (sebelum && mulai < sebelum.mulai) {
      throw new WilayahError(400, `Sudah ada catatan sejak ${sebelum.mulai}. Tanggal perubahan harus sama atau sesudahnya.`);
    }
    if (sebelum && sebelum.nilai === d.nilai) return { id: sebelum.id, tidakBerubah: true };
    for (const l of lama) {
      if (l.mulai === mulai) {
        await c.query(`UPDATE wil_fakta SET status_verifikasi = 'dikoreksi', sampai = mulai WHERE id = $1`, [l.id]);
      } else {
        await c.query(`UPDATE wil_fakta SET sampai = ($2::date - 1) WHERE id = $1`, [l.id, mulai]);
      }
    }
    // Usulan lama "perlu_cek" untuk kunci yang sama dianggap terselesaikan oleh keputusan ini.
    await c.query(
      `UPDATE wil_fakta SET status_verifikasi = 'ditolak', sampai = current_date
        WHERE subjek = $1 AND subjek_id = $2 AND kunci = $3 AND status_verifikasi = 'perlu_cek'`,
      [d.subjek, d.subjekId, d.kunci],
    );
    let id: number | null = null;
    if (d.nilai != null) {
      const { rows } = await c.query(
        `INSERT INTO wil_fakta (subjek, subjek_id, kunci, nilai, mulai, sumber, catatan, rt, dicatat_role, dicatat_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [d.subjek, d.subjekId, d.kunci, d.nilai, mulai, sumber, d.catatan ?? null, rt, aktor.role, aktor.label],
      );
      id = rows[0].id;
    }
    await catatAudit(aktor, d.nilai == null ? "kosongkan_fakta" : "catat_fakta", d.subjek, d.subjekId, rt, sebelum ? { [d.kunci]: sebelum.nilai } : null, { [d.kunci]: d.nilai, mulai, sumber }, c);
    return { id, tidakBerubah: false };
  };
  return q ? jalankan(q) : denganTransaksi(jalankan);
}

/** Simpan banyak jawaban sekaligus (satu form bertahap = satu transaksi). */
export async function simpanBanyakFakta(aktor: Aktor, input: unknown) {
  const list = z.array(z.unknown()).min(1).max(200).parse(input);
  return denganTransaksi(async (c) => {
    const hasil = [];
    for (const item of list) hasil.push(await simpanFakta(aktor, item, c));
    return { disimpan: hasil.filter((h) => !h.tidakBerubah).length, tidakBerubah: hasil.filter((h) => h.tidakBerubah).length };
  });
}

export async function putuskanFaktaPerluCek(aktor: Aktor, faktaId: number, terima: boolean) {
  const rt = wajibRt(aktor);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT * FROM wil_fakta WHERE id = $1 AND status_verifikasi = 'perlu_cek' FOR UPDATE`, [faktaId]);
    const f = rows[0];
    if (!f || f.rt !== rt) throw new WilayahError(404, "Catatan tidak ditemukan");
    await c.query(`UPDATE wil_fakta SET status_verifikasi = 'ditolak', sampai = current_date WHERE id = $1`, [faktaId]);
    if (terima) {
      await simpanFakta(aktor, { subjek: f.subjek, subjekId: f.subjek_id, kunci: f.kunci, nilai: f.nilai, sumber: f.sumber === "data_lama" ? "kunjungan_rt" : f.sumber, catatan: f.catatan }, c);
    } else {
      await catatAudit(aktor, "tolak_fakta", f.subjek, f.subjek_id, rt, { [f.kunci]: f.nilai }, null, c);
    }
    return { ok: true };
  });
}

export async function riwayatSubjek(aktor: Aktor, subjek: SubjekFakta, id: number) {
  const { rows } = await pool.query(
    `SELECT f.kunci, f.nilai, to_char(f.mulai, 'YYYY-MM-DD') AS mulai, to_char(f.sampai, 'YYYY-MM-DD') AS sampai,
            f.sumber, f.status_verifikasi, f.dicatat_oleh, f.created_at, f.rt
       FROM wil_fakta f WHERE f.subjek = $1 AND f.subjek_id = $2 ORDER BY f.kunci, f.mulai DESC, f.id DESC`,
    [subjek, id],
  );
  if (rows[0]) cekBaca(aktor, rows[0].rt);
  return rows;
}

// ===========================================================================
// Rumah (satu rumah dapat dihuni beberapa KK)
// ===========================================================================

const rumahSchema = z.object({ alamat: z.string().trim().min(3), noUnit: z.string().trim().max(20).optional().nullable(), catatan: z.string().max(300).optional().nullable() });

export async function daftarRumah(aktor: Aktor, rtQuery?: number | null) {
  const rt = aktor.role === "rt" ? aktor.rt : rtQuery ?? null;
  const { rows } = await pool.query(
    `SELECT r.id, r.rt, r.alamat, r.no_unit,
            COALESCE(json_agg(json_build_object('kkId', k.id, 'kepala', (SELECT nama_lengkap FROM warga w WHERE w.kk_id = k.id AND w.kedudukan_keluarga = 'Kepala Keluarga' LIMIT 1)))
              FILTER (WHERE k.id IS NOT NULL), '[]') AS kk,
            (SELECT nilai FROM wil_fakta f WHERE f.subjek = 'rumah' AND f.subjek_id = r.id AND f.kunci = 'listrik' AND f.sampai IS NULL AND f.status_verifikasi = 'terverifikasi' LIMIT 1) AS listrik
       FROM wil_rumah r
       LEFT JOIN wil_rumah_kk rk ON rk.rumah_id = r.id AND rk.sampai IS NULL
       LEFT JOIN kartu_keluarga k ON k.id = rk.kk_id
      WHERE ($1::int IS NULL OR r.rt = $1)
      GROUP BY r.id ORDER BY r.alamat, r.no_unit`,
    [rt],
  );
  return rows;
}

export async function buatRumah(aktor: Aktor, input: unknown) {
  const rt = wajibRt(aktor);
  const d = rumahSchema.parse(input);
  const { rows } = await pool.query(
    `INSERT INTO wil_rumah (rt, alamat, no_unit, catatan, dibuat_oleh) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [rt, d.alamat, d.noUnit || null, d.catatan || null, aktor.label],
  );
  await catatAudit(aktor, "tambah", "rumah", rows[0].id, rt, null, d);
  return { id: rows[0].id as number };
}

export async function hubungkanKkRumah(aktor: Aktor, kkId: number, rumahId: number) {
  const rt = wajibRt(aktor);
  return denganTransaksi(async (c) => {
    if ((await rtDariKk(kkId, c)) !== rt) throw new WilayahError(404, "KK tidak ditemukan di wilayah RT Anda");
    const { rows: r } = await c.query(`SELECT rt FROM wil_rumah WHERE id = $1`, [rumahId]);
    if (r[0]?.rt !== rt) throw new WilayahError(404, "Rumah tidak ditemukan di wilayah RT Anda");
    const { rows: lama } = await c.query(`SELECT id, rumah_id FROM wil_rumah_kk WHERE kk_id = $1 AND sampai IS NULL FOR UPDATE`, [kkId]);
    if (lama[0]?.rumah_id === rumahId) return { ok: true };
    if (lama[0]) await c.query(`UPDATE wil_rumah_kk SET sampai = current_date WHERE id = $1`, [lama[0].id]);
    await c.query(`INSERT INTO wil_rumah_kk (rumah_id, kk_id, dicatat_oleh) VALUES ($1, $2, $3)`, [rumahId, kkId, aktor.label]);
    await catatAudit(aktor, "hubungkan_rumah", "kk", kkId, rt, lama[0] ? { rumahId: lama[0].rumah_id } : null, { rumahId }, c);
    return { ok: true };
  });
}

// ===========================================================================
// Usaha
// ===========================================================================

const usahaSchema = z.object({
  nama: z.string().trim().min(2),
  kategori: z.enum(nilaiDari(KATEGORI_USAHA)).nullable(),
  alamat: z.string().trim().max(200).optional().nullable(),
  rumahId: z.number().int().positive().optional().nullable(),
  mulai: tanggalSchema.optional().nullable(),
  pemilikWargaIds: z.array(z.number().int().positive()).min(1, "Pilih minimal satu pemilik").max(5),
});

export async function daftarUsaha(aktor: Aktor, rtQuery?: number | null) {
  const rt = aktor.role === "rt" ? aktor.rt : rtQuery ?? null;
  const { rows } = await pool.query(
    `SELECT u.id, u.rt, u.nama, u.kategori, u.alamat, to_char(u.mulai, 'YYYY-MM-DD') AS mulai, to_char(u.sampai, 'YYYY-MM-DD') AS sampai,
            COALESCE(json_agg(json_build_object('wargaId', w.id, 'nama', w.nama_lengkap, 'jk', w.jenis_kelamin)) FILTER (WHERE w.id IS NOT NULL), '[]') AS pemilik
       FROM wil_usaha u LEFT JOIN wil_usaha_pemilik p ON p.usaha_id = u.id LEFT JOIN warga w ON w.id = p.warga_id
      WHERE ($1::int IS NULL OR u.rt = $1) AND u.status_verifikasi = 'terverifikasi'
      GROUP BY u.id ORDER BY u.sampai NULLS FIRST, u.nama`,
    [rt],
  );
  if (aktor.role === "rw") return rows.map((r) => ({ ...r, pemilik: (r.pemilik as { jk: string }[]).map((p) => ({ jk: p.jk })) }));
  const ids = rows.map((r) => r.id);
  const fakta = await faktaAktif("usaha", ids);
  return rows.map((r) => ({ ...r, fakta: fakta.filter((f) => f.subjekId === r.id) }));
}

export async function simpanUsaha(aktor: Aktor, input: unknown, id?: number) {
  const rt = wajibRt(aktor);
  const d = usahaSchema.parse(input);
  return denganTransaksi(async (c) => {
    const { rows: pem } = await c.query(
      `SELECT w.id FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id WHERE w.id = ANY($1) AND k.rt = $2`,
      [d.pemilikWargaIds, rt],
    );
    if (pem.length !== d.pemilikWargaIds.length) throw new WilayahError(400, "Pemilik harus warga RT Anda");
    if (d.rumahId) {
      const { rows: r } = await c.query(`SELECT rt FROM wil_rumah WHERE id = $1`, [d.rumahId]);
      if (r[0]?.rt !== rt) throw new WilayahError(400, "Rumah tidak ditemukan di RT Anda");
    }
    let usahaId = id;
    if (usahaId) {
      const { rows } = await c.query(`SELECT rt FROM wil_usaha WHERE id = $1 FOR UPDATE`, [usahaId]);
      if (rows[0]?.rt !== rt) throw new WilayahError(404, "Usaha tidak ditemukan di RT Anda");
      await c.query(`UPDATE wil_usaha SET nama = $2, kategori = $3, alamat = $4, rumah_id = $5, mulai = COALESCE($6, mulai) WHERE id = $1`, [usahaId, d.nama, d.kategori, d.alamat || null, d.rumahId || null, d.mulai || null]);
      await c.query(`DELETE FROM wil_usaha_pemilik WHERE usaha_id = $1`, [usahaId]);
    } else {
      const { rows } = await c.query(
        `INSERT INTO wil_usaha (rt, nama, kategori, alamat, rumah_id, mulai, dibuat_oleh) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [rt, d.nama, d.kategori, d.alamat || null, d.rumahId || null, d.mulai || hariIni(), aktor.label],
      );
      usahaId = rows[0].id;
    }
    for (const w of d.pemilikWargaIds) await c.query(`INSERT INTO wil_usaha_pemilik (usaha_id, warga_id) VALUES ($1, $2)`, [usahaId, w]);
    await catatAudit(aktor, id ? "ubah" : "tambah", "usaha", usahaId!, rt, null, d, c);
    return { id: usahaId! };
  });
}

export async function tutupUsaha(aktor: Aktor, id: number, tanggal?: string) {
  const rt = wajibRt(aktor);
  const t = tanggal ? tanggalSchema.parse(tanggal) : hariIni();
  const { rowCount } = await pool.query(`UPDATE wil_usaha SET sampai = $3 WHERE id = $1 AND rt = $2 AND sampai IS NULL`, [id, rt, t]);
  if (!rowCount) throw new WilayahError(404, "Usaha tidak ditemukan atau sudah ditutup");
  await catatAudit(aktor, "tutup", "usaha", id, rt, null, { sampai: t });
  return { ok: true };
}

// ===========================================================================
// Objek bersama: fasilitas, kelompok, kegiatan, kejadian
// ===========================================================================

function pengelolaDari(aktor: Aktor) {
  return aktor.role === "rw" ? { pengelola: "rw" as const, rtPengelola: null } : { pengelola: "rt" as const, rtPengelola: aktor.rt };
}

/** Objek hanya boleh diubah pengelolanya. RT tidak menimpa objek RW; RW tidak menimpa objek RT. */
function cekPengelola(aktor: Aktor, row: { pengelola: string; rt_pengelola: number | null }) {
  if (row.pengelola === "rw" && aktor.role !== "rw") throw new WilayahError(403, "Data ini dikelola RW. Kirim usulan koreksi.");
  if (row.pengelola === "rt" && (aktor.role !== "rt" || aktor.rt !== row.rt_pengelola)) throw new WilayahError(403, "Data ini dikelola Ketua RT wilayahnya");
}

const rtListSchema = z.array(rtSchema).max(7).default([]);

const fasilitasSchema = z.object({
  jenis: z.enum(nilaiDari(JENIS_FASILITAS)),
  nama: z.string().trim().min(2),
  rtLokasi: rtSchema.nullable().optional(),
  rtLayanan: rtListSchema,
  lokasi: z.string().trim().max(200).optional().nullable(),
  mulai: tanggalSchema.optional().nullable(),
});

export async function daftarFasilitas(aktor: Aktor) {
  const { rows } = await pool.query(
    `SELECT f.id, f.jenis, f.nama, f.pengelola, f.rt_pengelola, f.rt_lokasi, f.rt_layanan, f.lokasi,
            to_char(f.mulai, 'YYYY-MM-DD') AS mulai, to_char(f.sampai, 'YYYY-MM-DD') AS sampai
       FROM wil_fasilitas f
      WHERE f.status_verifikasi = 'terverifikasi'
        AND ($1::int IS NULL OR f.rt_pengelola = $1 OR f.rt_lokasi = $1 OR $1 = ANY(f.rt_layanan))
      ORDER BY f.sampai NULLS FIRST, f.jenis, f.nama`,
    [aktor.role === "rt" ? aktor.rt : null],
  );
  const fakta = await faktaAktif("fasilitas", rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, fakta: fakta.filter((f) => f.subjekId === r.id), bolehUbah: r.pengelola === aktor.role && (aktor.role === "rw" || r.rt_pengelola === aktor.rt) }));
}

export async function simpanFasilitas(aktor: Aktor, input: unknown, id?: number) {
  const d = fasilitasSchema.parse(input);
  const p = pengelolaDari(aktor);
  const rtLokasi = aktor.role === "rt" ? aktor.rt : d.rtLokasi ?? null;
  const rtLayanan = aktor.role === "rt" ? [aktor.rt!] : d.rtLayanan;
  if (id) {
    const { rows } = await pool.query(`SELECT pengelola, rt_pengelola FROM wil_fasilitas WHERE id = $1`, [id]);
    if (!rows[0]) throw new WilayahError(404, "Fasilitas tidak ditemukan");
    cekPengelola(aktor, rows[0]);
    await pool.query(`UPDATE wil_fasilitas SET jenis = $2, nama = $3, rt_lokasi = $4, rt_layanan = $5, lokasi = $6, mulai = COALESCE($7, mulai) WHERE id = $1`, [id, d.jenis, d.nama, rtLokasi, rtLayanan, d.lokasi || null, d.mulai || null]);
    await catatAudit(aktor, "ubah", "fasilitas", id, rtLokasi, null, d);
    return { id };
  }
  const { rows } = await pool.query(
    `INSERT INTO wil_fasilitas (jenis, nama, pengelola, rt_pengelola, rt_lokasi, rt_layanan, lokasi, mulai, dibuat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [d.jenis, d.nama, p.pengelola, p.rtPengelola, rtLokasi, rtLayanan, d.lokasi || null, d.mulai || null, aktor.label],
  );
  await catatAudit(aktor, "tambah", "fasilitas", rows[0].id, rtLokasi, null, d);
  return { id: rows[0].id as number };
}

export async function nonaktifkanObjek(aktor: Aktor, tabel: "fasilitas" | "kelompok", id: number) {
  const t = tabel === "fasilitas" ? "wil_fasilitas" : "wil_kelompok";
  const { rows } = await pool.query(`SELECT pengelola, rt_pengelola FROM ${t} WHERE id = $1`, [id]);
  if (!rows[0]) throw new WilayahError(404, "Data tidak ditemukan");
  cekPengelola(aktor, rows[0]);
  await pool.query(`UPDATE ${t} SET sampai = current_date WHERE id = $1 AND sampai IS NULL`, [id]);
  await catatAudit(aktor, "nonaktifkan", tabel, id, rows[0].rt_pengelola);
  return { ok: true };
}

const kelompokSchema = z.object({
  jenis: z.enum(nilaiDari(JENIS_KELOMPOK)),
  nama: z.string().trim().min(2),
  rtBasis: rtSchema.nullable().optional(),
  rtTerlibat: rtListSchema,
  ketua: z.string().trim().max(100).optional().nullable(),
  mulai: tanggalSchema.optional().nullable(),
});

export async function daftarKelompok(aktor: Aktor) {
  const { rows } = await pool.query(
    `SELECT id, jenis, nama, pengelola, rt_pengelola, rt_basis, rt_terlibat, ketua, to_char(mulai, 'YYYY-MM-DD') AS mulai, to_char(sampai, 'YYYY-MM-DD') AS sampai
       FROM wil_kelompok
      WHERE status_verifikasi = 'terverifikasi' AND ($1::int IS NULL OR rt_pengelola = $1 OR rt_basis = $1 OR $1 = ANY(rt_terlibat))
      ORDER BY sampai NULLS FIRST, jenis, nama`,
    [aktor.role === "rt" ? aktor.rt : null],
  );
  return rows.map((r) => ({ ...r, bolehUbah: r.pengelola === aktor.role && (aktor.role === "rw" || r.rt_pengelola === aktor.rt) }));
}

export async function simpanKelompok(aktor: Aktor, input: unknown, id?: number) {
  const d = kelompokSchema.parse(input);
  const p = pengelolaDari(aktor);
  const rtBasis = aktor.role === "rt" ? aktor.rt : d.rtBasis ?? null;
  if (id) {
    const { rows } = await pool.query(`SELECT pengelola, rt_pengelola FROM wil_kelompok WHERE id = $1`, [id]);
    if (!rows[0]) throw new WilayahError(404, "Kelompok tidak ditemukan");
    cekPengelola(aktor, rows[0]);
    await pool.query(`UPDATE wil_kelompok SET jenis = $2, nama = $3, rt_basis = $4, rt_terlibat = $5, ketua = $6, mulai = COALESCE($7, mulai) WHERE id = $1`, [id, d.jenis, d.nama, rtBasis, d.rtTerlibat, d.ketua || null, d.mulai || null]);
    await catatAudit(aktor, "ubah", "kelompok", id, rtBasis, null, d);
    return { id };
  }
  const { rows } = await pool.query(
    `INSERT INTO wil_kelompok (jenis, nama, pengelola, rt_pengelola, rt_basis, rt_terlibat, ketua, mulai, dibuat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [d.jenis, d.nama, p.pengelola, p.rtPengelola, rtBasis, d.rtTerlibat, d.ketua || null, d.mulai || null, aktor.label],
  );
  await catatAudit(aktor, "tambah", "kelompok", rows[0].id, rtBasis, null, d);
  return { id: rows[0].id as number };
}

const kegiatanSchema = z.object({
  jenis: z.enum(nilaiDari(JENIS_KEGIATAN)),
  judul: z.string().trim().min(3),
  tanggal: tanggalSchema,
  rtTerlibat: rtListSchema,
  lokasi: z.string().trim().max(200).optional().nullable(),
  uraian: z.string().trim().max(2000).optional().nullable(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});

export async function daftarKegiatan(aktor: Aktor, opsi: { dari?: string; sampai?: string }) {
  const { rows } = await pool.query(
    `SELECT g.id, g.jenis, g.judul, to_char(g.tanggal, 'YYYY-MM-DD') AS tanggal, g.pengelola, g.rt_pengelola, g.rt_terlibat, g.lokasi, g.uraian,
            COALESCE((SELECT json_agg(json_build_object('rt', p.rt, 'jumlahHadir', p.jumlah_hadir) ORDER BY p.rt) FROM wil_kegiatan_peserta p WHERE p.kegiatan_id = g.id), '[]') AS peserta
       FROM wil_kegiatan g
      WHERE g.status_verifikasi = 'terverifikasi'
        AND ($1::int IS NULL OR g.rt_pengelola = $1 OR $1 = ANY(g.rt_terlibat))
        AND ($2::date IS NULL OR g.tanggal >= $2) AND ($3::date IS NULL OR g.tanggal <= $3)
      ORDER BY g.tanggal DESC, g.id DESC LIMIT 300`,
    [aktor.role === "rt" ? aktor.rt : null, opsi.dari || null, opsi.sampai || null],
  );
  return rows.map((r) => ({
    ...r,
    bolehUbah: r.pengelola === aktor.role && (aktor.role === "rw" || r.rt_pengelola === aktor.rt),
    peserta: aktor.role === "rt" ? (r.peserta as { rt: number }[]).filter((p) => p.rt === aktor.rt) : r.peserta,
  }));
}

export async function simpanKegiatan(aktor: Aktor, input: unknown) {
  const d = kegiatanSchema.parse(input);
  if (d.tanggal > hariIni()) throw new WilayahError(400, "Kegiatan dicatat setelah terlaksana (tanggal tidak boleh di masa depan)");
  const p = pengelolaDari(aktor);
  if (aktor.role === "rt" && d.jenis === "rembug_rw") throw new WilayahError(403, "Rembug RW dicatat oleh RW; RT mengisi jumlah hadir warganya");
  const rtTerlibat = aktor.role === "rt" ? [aktor.rt!] : d.rtTerlibat.length ? d.rtTerlibat : [1, 2, 3, 4, 5, 6, 7];
  if (d.idempotencyKey) {
    const { rows } = await pool.query(`SELECT id FROM wil_kegiatan WHERE idempotency_key = $1`, [d.idempotencyKey]);
    if (rows[0]) return { id: rows[0].id as number, duplikat: true };
  }
  const { rows } = await pool.query(
    `INSERT INTO wil_kegiatan (jenis, judul, tanggal, pengelola, rt_pengelola, rt_terlibat, lokasi, uraian, idempotency_key, dibuat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
    [d.jenis, d.judul, d.tanggal, p.pengelola, p.rtPengelola, rtTerlibat, d.lokasi || null, d.uraian || null, d.idempotencyKey ?? null, aktor.label],
  );
  if (!rows[0]) {
    const { rows: ada } = await pool.query(`SELECT id FROM wil_kegiatan WHERE idempotency_key = $1`, [d.idempotencyKey]);
    return { id: ada[0].id as number, duplikat: true };
  }
  await catatAudit(aktor, "tambah", "kegiatan", rows[0].id, p.rtPengelola, null, d);
  return { id: rows[0].id as number, duplikat: false };
}

/** RT mencatat jumlah warganya yang hadir pada kegiatan (termasuk kegiatan RW yang sama). */
export async function catatKehadiran(aktor: Aktor, kegiatanId: number, jumlahHadir: number) {
  const rt = wajibRt(aktor);
  if (!Number.isInteger(jumlahHadir) || jumlahHadir < 0 || jumlahHadir > 2000) throw new WilayahError(400, "Jumlah hadir harus angka 0 atau lebih");
  const { rows } = await pool.query(`SELECT pengelola, rt_pengelola, rt_terlibat FROM wil_kegiatan WHERE id = $1`, [kegiatanId]);
  const g = rows[0];
  if (!g || !(g.rt_pengelola === rt || (g.rt_terlibat as number[]).includes(rt))) throw new WilayahError(404, "Kegiatan tidak melibatkan RT Anda");
  await pool.query(
    `INSERT INTO wil_kegiatan_peserta (kegiatan_id, rt, jumlah_hadir, dicatat_oleh) VALUES ($1, $2, $3, $4)
     ON CONFLICT (kegiatan_id, rt) DO UPDATE SET jumlah_hadir = EXCLUDED.jumlah_hadir, dicatat_oleh = EXCLUDED.dicatat_oleh, updated_at = now()`,
    [kegiatanId, rt, jumlahHadir, aktor.label],
  );
  await catatAudit(aktor, "catat_hadir", "kegiatan", kegiatanId, rt, null, { jumlahHadir });
  return { ok: true };
}

const kejadianSchema = z.object({
  jenis: z.enum(nilaiDari(JENIS_KEJADIAN)),
  judul: z.string().trim().min(3),
  uraian: z.string().trim().max(3000).optional().nullable(),
  tanggal: tanggalSchema,
  rt: rtSchema.nullable().optional(),
  lokasi: z.string().trim().max(200).optional().nullable(),
  jumlahPelaku: z.number().int().min(0).nullable().optional(),
  jumlahKorban: z.number().int().min(0).nullable().optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});

export async function daftarKejadian(aktor: Aktor, opsi: { status?: string; rt?: number | null }) {
  const rt = aktor.role === "rt" ? aktor.rt : opsi.rt ?? null;
  const { rows } = await pool.query(
    `SELECT k.id, k.jenis, k.judul, k.uraian, to_char(k.tanggal, 'YYYY-MM-DD') AS tanggal, k.rt, k.pengelola, k.lokasi,
            k.jumlah_pelaku, k.jumlah_korban, k.status, k.created_at, k.updated_at,
            COALESCE((SELECT json_agg(json_build_object('catatan', t.catatan, 'status', t.status_baru, 'oleh', t.oleh, 'waktu', t.created_at) ORDER BY t.created_at)
                        FROM wil_tindak_lanjut t WHERE t.kejadian_id = k.id), '[]') AS tindak_lanjut,
            (SELECT json_agg(json_build_object('id', s.id, 'nomor', s.nomor_surat, 'perihal', s.perihal, 'status', s.status)) FROM surat_rw s WHERE s.kejadian_id = k.id) AS surat
       FROM wil_kejadian k
      WHERE k.status_verifikasi = 'terverifikasi'
        AND ($1::int IS NULL OR k.rt = $1)
        AND ($2::text IS NULL OR k.status = $2)
      ORDER BY (k.status = 'selesai'), k.tanggal DESC, k.id DESC LIMIT 300`,
    [rt, opsi.status || null],
  );
  return rows.map((r) => ({ ...r, bolehUbah: r.pengelola === aktor.role && (aktor.role === "rw" || r.rt === aktor.rt) }));
}

export async function catatKejadian(aktor: Aktor, input: unknown) {
  const d = kejadianSchema.parse(input);
  if (d.tanggal > hariIni()) throw new WilayahError(400, "Tanggal kejadian tidak boleh di masa depan");
  const p = pengelolaDari(aktor);
  const rt = aktor.role === "rt" ? aktor.rt : d.rt ?? null;
  const { rows } = await pool.query(
    `INSERT INTO wil_kejadian (jenis, judul, uraian, tanggal, rt, pengelola, lokasi, jumlah_pelaku, jumlah_korban, idempotency_key, dibuat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`,
    [d.jenis, d.judul, d.uraian || null, d.tanggal, rt, p.pengelola, d.lokasi || null, d.jumlahPelaku ?? null, d.jumlahKorban ?? null, d.idempotencyKey ?? null, aktor.label],
  );
  if (!rows[0]) {
    const { rows: ada } = await pool.query(`SELECT id FROM wil_kejadian WHERE idempotency_key = $1`, [d.idempotencyKey]);
    return { id: ada[0].id as number, duplikat: true };
  }
  await catatAudit(aktor, "tambah", "kejadian", rows[0].id, rt, null, { jenis: d.jenis, judul: d.judul });
  return { id: rows[0].id as number, duplikat: false };
}

const tindakSchema = z.object({
  catatan: z.string().trim().min(3).max(2000),
  status: z.enum(nilaiDari(STATUS_KEJADIAN)).optional(),
  jumlahPelaku: z.number().int().min(0).nullable().optional(),
});

export async function tindakLanjutKejadian(aktor: Aktor, id: number, input: unknown) {
  const d = tindakSchema.parse(input);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT rt, pengelola, status FROM wil_kejadian WHERE id = $1 FOR UPDATE`, [id]);
    const k = rows[0];
    if (!k) throw new WilayahError(404, "Kejadian tidak ditemukan");
    const pemilik = k.pengelola === aktor.role && (aktor.role === "rw" || k.rt === aktor.rt);
    // RW boleh memberi keputusan pada kasus yang diteruskan RT, tanpa mengubah isi catatan RT.
    const rwMemutus = aktor.role === "rw" && k.status === "perlu_rw";
    if (!pemilik && !rwMemutus) throw new WilayahError(403, aktor.role === "rt" ? "Kejadian ini dikelola RW atau RT lain" : "Kejadian ini dikelola Ketua RT; RW memberi keputusan setelah diteruskan");
    if (d.jumlahPelaku !== undefined && !pemilik) throw new WilayahError(403, "Hanya pengelola yang dapat mengubah jumlah pelaku");
    if (d.status || d.jumlahPelaku !== undefined) {
      await c.query(`UPDATE wil_kejadian SET status = COALESCE($2, status), jumlah_pelaku = CASE WHEN $3::boolean THEN $4 ELSE jumlah_pelaku END, updated_at = now() WHERE id = $1`, [id, d.status ?? null, d.jumlahPelaku !== undefined, d.jumlahPelaku ?? null]);
    }
    await c.query(`INSERT INTO wil_tindak_lanjut (kejadian_id, catatan, status_baru, oleh_role, oleh) VALUES ($1, $2, $3, $4, $5)`, [id, d.catatan, d.status ?? null, aktor.role, aktor.label]);
    await catatAudit(aktor, "tindak_lanjut", "kejadian", id, k.rt, { status: k.status }, { status: d.status, catatan: d.catatan }, c);
    return { ok: true };
  });
}

const koreksiSchema = z.object({ objek: z.enum(["fasilitas", "kelompok", "kegiatan", "kejadian"]), objekId: z.number().int().positive(), uraian: z.string().trim().min(5).max(1000) });

export async function usulkanKoreksi(aktor: Aktor, input: unknown) {
  const rt = wajibRt(aktor);
  const d = koreksiSchema.parse(input);
  const { rows } = await pool.query(`INSERT INTO wil_usulan_koreksi (objek, objek_id, rt_pengusul, uraian) VALUES ($1, $2, $3, $4) RETURNING id`, [d.objek, d.objekId, rt, d.uraian]);
  await catatAudit(aktor, "usul_koreksi", d.objek, d.objekId, rt, null, { uraian: d.uraian });
  return { id: rows[0].id as number };
}

export async function daftarUsulanKoreksi(aktor: Aktor) {
  const { rows } = await pool.query(
    `SELECT id, objek, objek_id, rt_pengusul, uraian, status, jawaban, created_at, diputus_at FROM wil_usulan_koreksi
      WHERE ($1::int IS NULL OR rt_pengusul = $1) ORDER BY (status <> 'baru'), created_at DESC LIMIT 200`,
    [aktor.role === "rt" ? aktor.rt : null],
  );
  return rows;
}

export async function putuskanKoreksi(aktor: Aktor, id: number, terima: boolean, jawaban: string) {
  if (aktor.role !== "rw") throw new WilayahError(403, "Hanya RW");
  const { rowCount } = await pool.query(`UPDATE wil_usulan_koreksi SET status = $2, jawaban = $3, diputus_at = now() WHERE id = $1 AND status = 'baru'`, [id, terima ? "diterima" : "ditolak", jawaban]);
  if (!rowCount) throw new WilayahError(404, "Usulan tidak ditemukan atau sudah diputus");
  await catatAudit(aktor, terima ? "terima_koreksi" : "tolak_koreksi", "usulan_koreksi", id, null, null, { jawaban });
  return { ok: true };
}

// ===========================================================================
// Konfirmasi kelengkapan bulanan
// ===========================================================================

export async function setKonfirmasi(aktor: Aktor, tahun: number, bulan: number, bagian: string, aktif: boolean) {
  const def = BAGIAN_KONFIRMASI.find((b) => b.nilai === bagian);
  if (!def) throw new WilayahError(400, "Bagian tidak dikenal");
  if (def.scope !== aktor.role) throw new WilayahError(403, def.scope === "rw" ? "Bagian ini dikonfirmasi RW" : "Bagian ini dikonfirmasi Ketua RT");
  const rt = aktor.role === "rt" ? aktor.rt : null;
  if (aktif) {
    await pool.query(
      `INSERT INTO wil_konfirmasi (rt, tahun, bulan, bagian, oleh) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (COALESCE(rt, 0), tahun, bulan, bagian) DO NOTHING`,
      [rt, tahun, bulan, bagian, aktor.label],
    );
  } else {
    await pool.query(`DELETE FROM wil_konfirmasi WHERE COALESCE(rt, 0) = COALESCE($1::int, 0) AND tahun = $2 AND bulan = $3 AND bagian = $4`, [rt, tahun, bulan, bagian]);
  }
  await catatAudit(aktor, aktif ? "konfirmasi" : "batal_konfirmasi", "laporan", null, rt, null, { tahun, bulan, bagian });
  return { ok: true };
}

// ===========================================================================
// Serah-terima pindah RT (atomik)
// ===========================================================================

const serahSchema = z.object({
  jenis: z.enum(["kk", "warga"]),
  kkId: z.number().int().positive(),
  wargaId: z.number().int().positive().optional(),
  rtTujuan: rtSchema,
  alasan: z.string().trim().max(500).optional(),
});

export async function ajukanSerahTerima(aktor: Aktor, input: unknown) {
  const rt = wajibRt(aktor);
  const d = serahSchema.parse(input);
  if (d.rtTujuan === rt) throw new WilayahError(400, "RT tujuan sama dengan RT asal");
  if ((await rtDariKk(d.kkId)) !== rt) throw new WilayahError(404, "KK tidak ditemukan di wilayah RT Anda");
  if (d.jenis === "warga") {
    if (!d.wargaId) throw new WilayahError(400, "Pilih warga yang pindah");
    const lok = await rtDariWarga(d.wargaId);
    if (lok.kkId !== d.kkId) throw new WilayahError(400, "Warga bukan anggota KK ini");
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO wil_serah_terima (jenis, kk_id, warga_id, rt_asal, rt_tujuan, alasan, diajukan_oleh) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [d.jenis, d.kkId, d.jenis === "warga" ? d.wargaId : null, rt, d.rtTujuan, d.alasan || null, aktor.label],
    );
    await catatAudit(aktor, "ajukan_pindah", d.jenis, d.jenis === "warga" ? d.wargaId! : d.kkId, rt, null, { rtTujuan: d.rtTujuan });
    return { id: rows[0].id as number };
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new WilayahError(409, "Sudah ada pengajuan pindah yang menunggu untuk data ini");
    throw e;
  }
}

export async function daftarSerahTerima(aktor: Aktor) {
  const rt = wajibRt(aktor);
  const { rows } = await pool.query(
    `SELECT s.id, s.jenis, s.kk_id, s.warga_id, s.rt_asal, s.rt_tujuan, s.alasan, s.status, s.created_at, s.diputus_at, s.catatan_putusan,
            (SELECT nama_lengkap FROM warga w WHERE w.id = s.warga_id) AS nama_warga,
            (SELECT nama_lengkap FROM warga w WHERE w.kk_id = s.kk_id AND w.kedudukan_keluarga = 'Kepala Keluarga' LIMIT 1) AS kepala,
            (SELECT COUNT(*)::int FROM warga w WHERE w.kk_id = s.kk_id) AS anggota
       FROM wil_serah_terima s WHERE s.rt_asal = $1 OR s.rt_tujuan = $1
      ORDER BY (s.status <> 'diajukan'), s.created_at DESC LIMIT 100`,
    [rt],
  );
  return rows.map((r) => ({ ...r, arah: r.rt_tujuan === rt ? "masuk" : "keluar" }));
}

export async function putuskanSerahTerima(aktor: Aktor, id: number, input: unknown) {
  const rt = wajibRt(aktor);
  const d = z.object({ terima: z.boolean(), kkTujuanId: z.number().int().positive().optional(), catatan: z.string().max(500).optional() }).parse(input);
  return denganTransaksi(async (c) => {
    const { rows } = await c.query(`SELECT * FROM wil_serah_terima WHERE id = $1 FOR UPDATE`, [id]);
    const s = rows[0];
    if (!s) throw new WilayahError(404, "Pengajuan tidak ditemukan");
    const batalOlehAsal = !d.terima && s.rt_asal === rt;
    if (s.rt_tujuan !== rt && !batalOlehAsal) throw new WilayahError(403, "Hanya RT tujuan yang dapat menerima");
    if (s.status !== "diajukan") throw new WilayahError(409, "Pengajuan sudah diputus");

    if (!d.terima) {
      await c.query(`UPDATE wil_serah_terima SET status = $2, diputus_oleh = $3, diputus_at = now(), catatan_putusan = $4 WHERE id = $1`, [id, batalOlehAsal ? "dibatalkan" : "ditolak", aktor.label, d.catatan ?? null]);
      await catatAudit(aktor, batalOlehAsal ? "batal_pindah" : "tolak_pindah", s.jenis, s.warga_id ?? s.kk_id, rt, null, null, c);
      return { ok: true };
    }

    const { rows: kkRows } = await c.query(`SELECT rt FROM kartu_keluarga WHERE id = $1 FOR UPDATE`, [s.kk_id]);
    if (kkRows[0]?.rt !== s.rt_asal) throw new WilayahError(409, "Data KK sudah berubah sejak diajukan");

    if (s.jenis === "kk") {
      await c.query(`UPDATE kartu_keluarga SET rt = $2 WHERE id = $1`, [s.kk_id, s.rt_tujuan]);
      await c.query(`UPDATE wil_rumah_kk SET sampai = current_date WHERE kk_id = $1 AND sampai IS NULL`, [s.kk_id]);
      await c.query(`UPDATE wil_kk_token SET dicabut_at = now(), alasan_cabut = 'pindah RT' WHERE kk_id = $1 AND dicabut_at IS NULL`, [s.kk_id]);
      await c.query(
        `UPDATE wil_fakta SET rt = $2 WHERE (subjek = 'kk' AND subjek_id = $1) OR (subjek = 'warga' AND subjek_id IN (SELECT id FROM warga WHERE kk_id = $1))`,
        [s.kk_id, s.rt_tujuan],
      );
    } else {
      if (!d.kkTujuanId) throw new WilayahError(400, "Pilih KK tujuan di RT Anda");
      const { rows: tujuan } = await c.query(`SELECT rt FROM kartu_keluarga WHERE id = $1`, [d.kkTujuanId]);
      if (tujuan[0]?.rt !== rt) throw new WilayahError(400, "KK tujuan harus di RT Anda");
      await c.query(`UPDATE warga SET kk_id = $2 WHERE id = $1 AND kk_id = $3`, [s.warga_id, d.kkTujuanId, s.kk_id]);
      await c.query(`UPDATE wil_fakta SET rt = $2 WHERE subjek = 'warga' AND subjek_id = $1`, [s.warga_id, rt]);
      for (const k of [s.kk_id, d.kkTujuanId]) {
        await c.query(`UPDATE kartu_keluarga SET jumlah_penghuni = (SELECT COUNT(*) FROM warga WHERE kk_id = $1) WHERE id = $1`, [k]);
      }
    }
    await c.query(
      `UPDATE wil_serah_terima SET status = 'diterima', diputus_oleh = $2, diputus_at = now(), kk_tujuan_id = $3, catatan_putusan = $4 WHERE id = $1`,
      [id, aktor.label, d.kkTujuanId ?? null, d.catatan ?? null],
    );
    await catatAudit(aktor, "terima_pindah", s.jenis, s.warga_id ?? s.kk_id, rt, { rt: s.rt_asal, kkId: s.kk_id }, { rt: s.rt_tujuan, kkId: d.kkTujuanId ?? s.kk_id }, c);
    invalidateKk();
    invalidateWarga();
    return { ok: true };
  });
}

// ===========================================================================
// Antrean pekerjaan RT (Beranda)
// ===========================================================================

export async function antreanRt(aktor: Aktor) {
  const rt = wajibRt(aktor);
  const { rows } = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM wil_usulan WHERE rt = $1 AND status = 'menunggu') AS usulan,
       (SELECT COUNT(*)::int FROM wil_serah_terima WHERE rt_tujuan = $1 AND status = 'diajukan') AS pindah_masuk,
       (SELECT COUNT(*)::int FROM wil_fakta WHERE rt = $1 AND status_verifikasi = 'perlu_cek') AS perlu_cek,
       (SELECT COUNT(*)::int FROM kartu_keluarga k WHERE k.rt = $1 AND NOT EXISTS (SELECT 1 FROM wil_rumah_kk rk WHERE rk.kk_id = k.id AND rk.sampai IS NULL)) AS kk_tanpa_rumah,
       (SELECT COUNT(*)::int FROM wil_kejadian WHERE rt = $1 AND pengelola = 'rt' AND status <> 'selesai') AS kejadian_terbuka,
       (SELECT COUNT(*)::int FROM wil_kegiatan g WHERE g.pengelola = 'rw' AND $1 = ANY(g.rt_terlibat) AND g.tanggal >= current_date - 60
           AND NOT EXISTS (SELECT 1 FROM wil_kegiatan_peserta p WHERE p.kegiatan_id = g.id AND p.rt = $1)) AS hadir_belum_diisi,
       (SELECT COUNT(*)::int FROM wil_usulan_koreksi WHERE rt_pengusul = $1 AND status <> 'baru' AND diputus_at > now() - interval '14 days') AS koreksi_dijawab,
       (SELECT COUNT(*)::int FROM wil_permintaan_surat WHERE rt = $1 AND status IN ('baru', 'diproses')) AS permintaan_surat`,
    [rt],
  );
  return rows[0];
}

export async function cariWarga(aktor: Aktor, q: string) {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const { rows } = await pool.query(
    `SELECT w.id, w.nama_lengkap AS nama, w.kk_id, k.rt, k.alamat, w.status_kependudukan AS status
       FROM warga w JOIN kartu_keluarga k ON k.id = w.kk_id
      WHERE ($1::int IS NULL OR k.rt = $1) AND (lower(w.nama_lengkap) LIKE $2 OR lower(k.alamat) LIKE $2 OR ($3::boolean AND w.nik = $4))
      ORDER BY w.nama_lengkap LIMIT 30`,
    [aktor.role === "rt" ? aktor.rt : null, `%${s}%`, aktor.role === "rt" && /^\d{16}$/.test(s), s],
  );
  return rows;
}
