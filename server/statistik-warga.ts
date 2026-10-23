import { pool } from "./db";
import { storage } from "./storage";
import { cache, CacheKey, TTL } from "./cache";
import { ringkasKeluarga } from "./wilayah-data";
import { normalizeNomorHp } from "@shared/kontak";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { isoTanggal } from "@shared/wilayah";
import { faktaKosong, terapkanFaktaKk, terapkanFaktaWarga, type FaktaSubjek } from "@shared/warga-efektif";
import {
  KATEGORI_DAFTAR,
  daftarKategoriWarga,
  hitungStatistikWarga,
  judulDaftar,
  perluNilai,
  type DaftarKategori,
  type KategoriDaftar,
  type OrangDaftar,
  type SinggahPerRt,
  type StatistikWarga,
} from "@shared/statistik-warga";

async function singgahPerRt(): Promise<SinggahPerRt[]> {
  try {
    const { rows } = await pool.query(
      `SELECT p.rt,
              COUNT(DISTINCT p.id)::int AS izin,
              COUNT(h.id)::int AS orang,
              COUNT(DISTINCT p.id) FILTER (WHERE p.tanggal_berlaku_sampai <= to_char(current_date + 30, 'YYYY-MM-DD'))::int AS segera_habis
         FROM visitrw3_pengajuan p LEFT JOIN visitrw3_penghuni h ON h.pengajuan_id = p.id
        WHERE p.status = 'disetujui' AND p.tanggal_berlaku_sampai >= to_char(current_date, 'YYYY-MM-DD')
          AND COALESCE(p.jenis_warga, '') <> 'jualan'
        GROUP BY p.rt`,
    );
    return rows.map((r) => ({ rt: r.rt, orang: r.orang, izin: r.izin, segeraHabis: r.segera_habis }));
  } catch (e) {
    console.warn("[statistik-warga] data Visit RW3 tidak terbaca:", (e as Error).message);
    return [];
  }
}

/** Jawaban Standar data yang berlaku (terverifikasi) dan yang menunggu dicek, per subjek. */
async function faktaBerlaku(): Promise<{ warga: Map<number, FaktaSubjek>; kk: Map<number, FaktaSubjek> }> {
  const hasil = { warga: new Map<number, FaktaSubjek>(), kk: new Map<number, FaktaSubjek>() };
  try {
    const { rows } = await pool.query(
      `SELECT subjek, subjek_id, kunci, nilai, to_char(mulai, 'YYYY-MM-DD') AS mulai, status_verifikasi
         FROM wil_fakta
        WHERE sampai IS NULL AND status_verifikasi IN ('terverifikasi', 'perlu_cek') AND rt = ANY($1)
        ORDER BY mulai DESC, id DESC`,
      [[...ACTIVE_RT_NUMBERS]],
    );
    for (const r of rows) {
      const peta = r.subjek === "kk" ? hasil.kk : hasil.warga;
      let f = peta.get(r.subjek_id);
      if (!f) peta.set(r.subjek_id, (f = faktaKosong()));
      if (r.status_verifikasi === "perlu_cek") {
        if (!f.perluCek.includes(r.kunci)) f.perluCek.push(r.kunci);
      } else if (!f.terverifikasi[r.kunci]) {
        f.terverifikasi[r.kunci] = { nilai: r.nilai, mulai: r.mulai };
      }
    }
  } catch (e) {
    console.warn("[statistik-warga] fakta Standar data tidak terbaca:", (e as Error).message);
  }
  return hasil;
}

/** KK & warga RT 01–04 dengan nilai efektif (Standar data didahulukan, kolom lama cadangan). */
export async function dataWargaEfektif() {
  const [kk, warga, fakta] = await Promise.all([storage.getAllKkPemukiman(), storage.getAllWargaPemukiman(), faktaBerlaku()]);
  return {
    kk: kk.map((k) => terapkanFaktaKk(k, fakta.kk.get(k.id))),
    warga: warga.map((w) => terapkanFaktaWarga(w, fakta.warga.get(w.id))),
  };
}

export async function statistikWarga(): Promise<StatistikWarga> {
  const key = CacheKey.statistikWarga(isoTanggal(new Date()));
  const cached = cache.get<StatistikWarga>(key);
  if (cached) return cached;
  const [{ kk, warga }, singgah] = await Promise.all([dataWargaEfektif(), singgahPerRt()]);
  const hasil = hitungStatistikWarga(kk, warga, singgah);
  cache.set(key, hasil, TTL.DASHBOARD);
  return hasil;
}

async function daftarSinggah(rt: number | null): Promise<OrangDaftar[]> {
  const { rows } = await pool.query(
    `SELECT h.id, h.nama_lengkap, h.nomor_whatsapp, h.jenis_kelamin, h.is_anak, p.rt, p.alamat, p.nomor_unit, p.nomor_visitrw3,
            p.jenis_warga, p.tanggal_berlaku_sampai
       FROM visitrw3_penghuni h JOIN visitrw3_pengajuan p ON p.id = h.pengajuan_id
      WHERE p.status = 'disetujui' AND p.tanggal_berlaku_sampai >= to_char(current_date, 'YYYY-MM-DD')
        AND COALESCE(p.jenis_warga, '') <> 'jualan' AND ($1::int IS NULL OR p.rt = $1)
      ORDER BY p.rt, h.nama_lengkap`,
    [rt],
  );
  const waIzin = new Map<string, { wa: string; nama: string }>();
  for (const r of rows) {
    const wa = normalizeNomorHp(r.nomor_whatsapp);
    if (wa && !waIzin.has(r.nomor_visitrw3)) waIzin.set(r.nomor_visitrw3, { wa, nama: r.nama_lengkap });
  }
  return rows.map((r) => {
    const sendiri = normalizeNomorHp(r.nomor_whatsapp);
    const serumah = sendiri ? null : waIzin.get(r.nomor_visitrw3) ?? null;
    return {
      id: r.id,
      kkId: null,
      rt: r.rt,
      nama: r.nama_lengkap,
      keterangan: [r.jenis_warga, r.jenis_kelamin, r.is_anak ? "anak" : null, `izin ${r.nomor_visitrw3} s.d. ${r.tanggal_berlaku_sampai}`].filter(Boolean).join(" · "),
      alamat: [r.alamat, r.nomor_unit ? `No. ${r.nomor_unit}` : null].filter(Boolean).join(" ") || null,
      wa: sendiri ?? serumah?.wa ?? null,
      waMilik: serumah ? `WA serumah: ${serumah.nama}` : null,
    };
  });
}

async function daftarStandarData(kategori: "belumDiisi" | "perhatian" | "kelengkapan", kkRows: OrangDaftar[]): Promise<OrangDaftar[]> {
  const ringkas = await ringkasKeluarga(kkRows.map((k) => k.id));
  const dengan = kkRows.map((k) => ({ k, r: ringkas.get(k.id)! }));
  if (kategori === "belumDiisi") {
    return dengan.filter(({ r }) => r.terjawab === 0).map(({ k }) => k);
  }
  if (kategori === "perhatian") {
    return dengan
      .filter(({ r }) => r.perhatian.length)
      .sort((a, b) => b.r.perhatian.length - a.r.perhatian.length || a.k.rt - b.k.rt)
      .map(({ k, r }) => ({ ...k, keterangan: r.perhatian.map((p) => `${p.label}: ${p.detail}`).join(" · ") }));
  }
  return dengan
    .filter(({ r }) => r.kelengkapan < 1)
    .sort((a, b) => a.r.kelengkapan - b.r.kelengkapan || a.k.rt - b.k.rt)
    .map(({ k, r }) => ({ ...k, keterangan: `Kelengkapan ${Math.round(r.kelengkapan * 100)}% (${r.terjawab}/${r.pertanyaan} terjawab) · ${k.keterangan}` }));
}

export async function daftarStatistikWarga(kategori: KategoriDaftar, rt: number | null, nilai: string | null = null): Promise<DaftarKategori> {
  let daftar: OrangDaftar[];
  if (kategori === "singgah") {
    daftar = await daftarSinggah(rt);
  } else {
    const { kk, warga } = await dataWargaEfektif();
    if (kategori === "belumDiisi" || kategori === "perhatian" || kategori === "kelengkapan") {
      daftar = await daftarStandarData(kategori, daftarKategoriWarga("kk", kk, warga, rt));
    } else {
      daftar = daftarKategoriWarga(kategori, kk, warga, rt, nilai);
    }
  }
  const nilaiDipakai = perluNilai(kategori) ? nilai : null;
  return { kategori, nilai: nilaiDipakai, judul: judulDaftar(kategori, nilaiDipakai), satuan: KATEGORI_DAFTAR[kategori].satuan, rt, daftar };
}
