/**
 * Layanan data wilayah. Semua fungsi menerima Aktor; scope RT diambil dari aktor (sesi), bukan dari input.
 */
import { z } from "zod";
import type { PoolClient } from "pg";
import { pool } from "./db";
import { invalidateKk, invalidateWarga } from "./cache";
import { catatAudit, WilayahError, type Aktor } from "./wilayah-auth";
import { registri, standarAktif } from "./wilayah-standar";
import {
  berlakuUntukWarga,
  isWilayahRt,
  isoTanggal,
  kenaPerhatian,
  labelNilaiFakta,
  umurTahun,
  validasiNilaiFakta,
  type DefinisiFakta,
  type SubjekFakta,
} from "@shared/wilayah";
import { isNomorHpValid, looksLikeNik, maskNik, normalizeNomorHp } from "@shared/kontak";
import { jawabanIndukKk, jawabanIndukWarga } from "@shared/wilayah-induk";
import { resolveKategoriUmurFromAge } from "@shared/kategori-umur";
import { kelompokUmurRingkas } from "@shared/statistik-warga";

type Q = { query: PoolClient["query"] };

/**
 * Jawaban dari data induk (kunci `kk:<id>:<kunci>` / `warga:<id>:<kunci>`) dan KK yang sudah punya nomor WA sah.
 * Hanya cadangan: fakta tercatat selalu didahulukan oleh pemanggil.
 */
export async function indukKeluarga(kkIds: number[], q: Q = pool) {
  const jawaban = new Map<string, string>();
  const punyaWa = new Set<number>();
  if (!kkIds.length) return { jawaban, punyaWa };
  const [{ rows: kk }, { rows: orang }] = await Promise.all([
    q.query(
      `SELECT id, penghasilan_bulanan, status_rumah, kondisi_bangunan, sumber_air, sanitasi_wc, listrik, penerima_bansos, jenis_bansos
         FROM kartu_keluarga WHERE id = ANY($1)`,
      [kkIds],
    ),
    q.query(
      `SELECT id, kk_id, pekerjaan, pendidikan, nomor_whatsapp FROM warga WHERE kk_id = ANY($1) AND status_kependudukan = 'Aktif'`,
      [kkIds],
    ),
  ]);
  for (const k of kk) for (const [kunci, nilai] of Object.entries(jawabanIndukKk(k))) jawaban.set(`kk:${k.id}:${kunci}`, nilai);
  for (const o of orang) {
    for (const [kunci, nilai] of Object.entries(jawabanIndukWarga(o))) jawaban.set(`warga:${o.id}:${kunci}`, nilai);
    if (isNomorHpValid(o.nomor_whatsapp)) punyaWa.add(o.kk_id);
  }
  return { jawaban, punyaWa };
}

const hariIni = () => isoTanggal(new Date());
const tanggalSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal YYYY-MM-DD");
const rtSchema = z.number().int().refine(isWilayahRt, "RT harus 1–7");

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

export interface PerhatianKeluarga {
  kunci: string;
  label: string;
  /** Contoh: "Rusak berat / tidak layak huni" atau "2 orang". */
  detail: string;
}

export interface KeluargaRingkas {
  id: number;
  rt: number;
  kepala: string | null;
  alamat: string;
  noUnit: string | null;
  anggota: number;
  lakiLaki: number;
  perempuan: number;
  balita: number;
  anak: number;
  lansia: number;
  /** 0–1: jawaban terisi dibanding pertanyaan aktif yang berlaku. */
  kelengkapan: number;
  terjawab: number;
  pertanyaan: number;
  perhatian: PerhatianKeluarga[];
  diperbarui: string | null;
  punyaRumah: boolean;
  punyaQr: boolean;
  usulanMenunggu: number;
}

type FaktaRingkas = { subjek: "kk" | "warga"; subjekId: number; kunci: string; nilai: string; mulai: string };

/** Label data yang belum terisi; kunci `anggota` = id warga. */
export interface KekuranganKeluarga {
  keluarga: string[];
  anggota: Map<number, string[]>;
}

type RingkasKeluarga = Omit<KeluargaRingkas, "id" | "rt" | "kepala" | "alamat" | "noUnit" | "punyaRumah" | "punyaQr" | "usulanMenunggu"> & {
  /** Hanya terisi bila dipanggil dengan `rinci: true`. */
  kurang?: KekuranganKeluarga;
};

/** Hitung kelengkapan & tanda perhatian per keluarga dari standar aktif. `rinci` = sertakan label data yang belum terisi. */
export async function ringkasKeluarga(kkIds: number[], opsi: { rinci?: boolean } = {}) {
  const hasil = new Map<number, RingkasKeluarga>();
  if (!kkIds.length) return hasil;
  const defs = await standarAktif();
  const defKk = defs.filter((d) => d.subjek === "kk");
  const defWarga = defs.filter((d) => d.subjek === "warga");
  const kunci = defs.map((d) => d.kunci);
  const acuan = hariIni();

  const [{ rows: anggota }, { rows: fakta }, induk] = await Promise.all([
    pool.query(
      `SELECT id, kk_id, nik, jenis_kelamin, tanggal_lahir
         FROM warga WHERE kk_id = ANY($1) AND status_kependudukan = 'Aktif'`,
      [kkIds],
    ),
    pool.query(
      `SELECT f.subjek, f.subjek_id, f.kunci, f.nilai, to_char(f.mulai, 'YYYY-MM-DD') AS mulai,
              CASE WHEN f.subjek = 'kk' THEN f.subjek_id ELSE w.kk_id END AS kk_id
         FROM wil_fakta f LEFT JOIN warga w ON f.subjek = 'warga' AND w.id = f.subjek_id
        WHERE f.sampai IS NULL AND f.status_verifikasi IN ('terverifikasi', 'perlu_cek') AND f.kunci = ANY($2)
          AND ((f.subjek = 'kk' AND f.subjek_id = ANY($1)) OR (f.subjek = 'warga' AND w.kk_id = ANY($1)))`,
      [kkIds, kunci],
    ),
    indukKeluarga(kkIds),
  ]);

  const faktaPerKk = new Map<number, FaktaRingkas[]>();
  for (const r of fakta) {
    const list = faktaPerKk.get(r.kk_id) ?? [];
    list.push({ subjek: r.subjek, subjekId: r.subjek_id, kunci: r.kunci, nilai: r.nilai, mulai: r.mulai });
    faktaPerKk.set(r.kk_id, list);
  }
  const anggotaPerKk = new Map<number, typeof anggota>();
  for (const a of anggota) anggotaPerKk.set(a.kk_id, [...(anggotaPerKk.get(a.kk_id) ?? []), a]);

  for (const kkId of kkIds) {
    const list = faktaPerKk.get(kkId) ?? [];
    const nilai = new Map(list.map((f) => [`${f.subjek}:${f.subjekId}:${f.kunci}`, f.nilai]));
    const orang = anggotaPerKk.get(kkId) ?? [];
    for (const k of [`kk:${kkId}:`, ...orang.map((o) => `warga:${o.id}:`)]) {
      for (const d of defs) {
        const v = induk.jawaban.get(k + d.kunci);
        if (v != null && !nilai.has(k + d.kunci)) nilai.set(k + d.kunci, v);
      }
    }
    const ada = new Set(nilai.keys());
    // Data dasar: nomor WA keluarga + tanggal lahir tiap anggota.
    let pertanyaan = defKk.length + 1 + orang.length;
    let terjawab = defKk.filter((d) => ada.has(`kk:${kkId}:${d.kunci}`)).length
      + (induk.punyaWa.has(kkId) ? 1 : 0)
      + orang.filter((o) => !!o.tanggal_lahir).length;
    const kurang: KekuranganKeluarga | undefined = opsi.rinci
      ? {
        keluarga: [
          ...(induk.punyaWa.has(kkId) ? [] : ["Nomor WhatsApp keluarga"]),
          ...defKk.filter((d) => !ada.has(`kk:${kkId}:${d.kunci}`)).map((d) => d.label),
        ],
        anggota: new Map(),
      }
      : undefined;
    let lakiLaki = 0, perempuan = 0, balita = 0, anak = 0, lansia = 0;
    for (const o of orang) {
      if (o.jenis_kelamin === "Laki-laki") lakiLaki++;
      else if (o.jenis_kelamin === "Perempuan") perempuan++;
      const umur = umurTahun(o.tanggal_lahir, acuan);
      const kelompok = kelompokUmurRingkas(resolveKategoriUmurFromAge(umur));
      if (kelompok === "balita") balita++;
      else if (kelompok === "anak") anak++;
      else if (kelompok === "lansia") lansia++;
      const kurangOrang: string[] = [];
      if (kurang) {
        if (String(o.nik ?? "").replace(/\D/g, "").length !== 16) kurangOrang.push("NIK 16 digit");
        if (!o.jenis_kelamin) kurangOrang.push("Jenis kelamin");
        if (!o.tanggal_lahir) kurangOrang.push("Tanggal lahir");
      }
      for (const d of defWarga) {
        if (!berlakuUntukWarga(d, { jenisKelamin: o.jenis_kelamin, umur })) continue;
        pertanyaan++;
        if (ada.has(`warga:${o.id}:${d.kunci}`)) terjawab++;
        else if (kurang) kurangOrang.push(d.label);
      }
      if (kurang && kurangOrang.length) kurang.anggota.set(o.id, kurangOrang);
    }
    const perhatian: PerhatianKeluarga[] = [];
    for (const d of defKk) {
      const v = nilai.get(`kk:${kkId}:${d.kunci}`);
      if (kenaPerhatian(d, v)) perhatian.push({ kunci: d.kunci, label: d.label, detail: labelNilaiFakta(d, v) });
    }
    for (const d of defWarga) {
      const kena = orang.filter((o) => kenaPerhatian(d, nilai.get(`warga:${o.id}:${d.kunci}`))).length;
      if (kena) perhatian.push({ kunci: d.kunci, label: d.label, detail: `${kena} orang` });
    }
    const diperbarui = list.reduce<string | null>((m, f) => (!m || f.mulai > m ? f.mulai : m), null);
    hasil.set(kkId, {
      anggota: orang.length, lakiLaki, perempuan, balita, anak, lansia,
      kelengkapan: pertanyaan ? Math.min(1, terjawab / pertanyaan) : 0, terjawab, pertanyaan, perhatian, diperbarui,
      ...(kurang ? { kurang } : {}),
    });
  }
  return hasil;
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
  params.push(batas);
  const { rows } = await pool.query(
    `SELECT k.id, k.rt, k.alamat, k.no_unit,
            (SELECT nama_lengkap FROM warga w WHERE w.kk_id = k.id AND w.kedudukan_keluarga = 'Kepala Keluarga' ORDER BY w.id LIMIT 1) AS kepala,
            EXISTS (SELECT 1 FROM wil_rumah_kk rk WHERE rk.kk_id = k.id AND rk.sampai IS NULL) AS punya_rumah,
            EXISTS (SELECT 1 FROM wil_kk_token t WHERE t.kk_id = k.id AND t.dicabut_at IS NULL AND t.expires_at > now()) AS punya_qr,
            (SELECT COUNT(*)::int FROM wil_usulan u WHERE u.kk_id = k.id AND u.status = 'menunggu') AS usulan_menunggu
       FROM kartu_keluarga k
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY k.rt, kepala NULLS LAST, k.id
      LIMIT $${params.length}`,
    params,
  );
  const ringkas = await ringkasKeluarga(rows.map((r) => r.id));
  return rows.map((r) => ({
    id: r.id, rt: r.rt, kepala: r.kepala, alamat: r.alamat, noUnit: r.no_unit,
    ...ringkas.get(r.id)!,
    punyaRumah: r.punya_rumah, punyaQr: r.punya_qr, usulanMenunggu: r.usulan_menunggu,
  }));
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
  const aktif = new Set((await standarAktif()).map((d) => d.kunci));
  const [faktaKk, faktaWarga] = (await Promise.all([faktaAktif("kk", [kkId]), faktaAktif("warga", wargaIds)]))
    .map((list) => list.filter((f) => aktif.has(f.kunci)));
  const ringkas = (await ringkasKeluarga([kkId])).get(kkId)!;
  const tercatat = new Set([...faktaKk, ...faktaWarga].map((f) => `${f.subjek}:${f.subjekId}:${f.kunci}`));
  const jawabanInduk: Record<string, string> = {};
  for (const [k, v] of (await indukKeluarga([kkId])).jawaban) {
    if (aktif.has(k.slice(k.lastIndexOf(":") + 1)) && !tercatat.has(k)) jawabanInduk[k] = v;
  }

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
    rumah: rumah ? { id: rumah.id, alamat: rumah.alamat, noUnit: rumah.no_unit, jumlahKk: rumah.jumlah_kk } : null,
    usaha: usaha.map((u) => ({ id: u.id, nama: u.nama, kategori: u.kategori })),
    fakta: faktaKk,
    jawabanInduk,
    ringkas,
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
  subjek: z.enum(["warga", "kk"]),
  subjekId: z.number().int().positive(),
  kunci: z.string(),
  /** null = jadikan "belum diketahui" (mengakhiri fakta yang berlaku). */
  nilai: z.string().nullable(),
  mulai: tanggalSchema.optional(),
  sumber: z.string().min(2).optional(),
  catatan: z.string().max(500).optional().nullable(),
});

/** Menentukan RT pemilik subjek dan memastikan aktor berhak menulis. */
async function scopeTulisSubjek(aktor: Aktor, subjek: "warga" | "kk", id: number, q: Q): Promise<number> {
  const rt = wajibRt(aktor);
  const rtSubjek = subjek === "warga" ? (await rtDariWarga(id, q)).rt : await rtDariKk(id, q);
  if (rtSubjek !== rt) throw new WilayahError(404, "Data tidak ditemukan di wilayah RT Anda");
  return rt;
}

export async function simpanFakta(aktor: Aktor, input: unknown, q?: PoolClient) {
  const d = faktaSchema.parse(input);
  const def = (await registri()).get(d.kunci);
  if (!def || def.subjek !== d.subjek) throw new WilayahError(400, "Pertanyaan tidak dikenal");
  if (d.nilai != null) {
    if (!def.aktif) throw new WilayahError(400, `${def.label}: pertanyaan sudah diarsipkan`);
    const err = validasiNilaiFakta(def, d.nilai);
    if (err) throw new WilayahError(400, `${def.label}: ${err}`);
  }
  const sumber = d.sumber ?? "keterangan_keluarga";
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
// Pencarian warga
// ===========================================================================

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
