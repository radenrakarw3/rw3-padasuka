/**
 * Cek Warga (admin): satu kata kunci (nama / nama anggota keluarga / NIK) dicari serentak
 * di data warga RW3, Visit RW3, dan RW3BIZ.
 *
 * Hemat round-trip: Visit RW3 dan RW3BIZ masing-masing satu query (anggota rombongan via json_agg);
 * warga RW3 dua tahap (cari KK, lalu anggota + kelengkapan paralel).
 * Pola `lower(kolom) LIKE` dan `nik = $1` sengaja dipakai agar index trigram / unique terpakai.
 */
import { pool } from "./db";
import { ringkasKeluarga } from "./wilayah-data";
import { isoTanggal, parseTanggal, umurTahun } from "@shared/wilayah";
import { isNomorHpValid, maskNik, normalizeNomorHp } from "@shared/kontak";
import type { BizCek, HasilCekWarga, KkCek, VisitCek, VonisCek } from "@shared/cek-warga";

const BATAS_KK = 10;
const BATAS_VISIT = 20;
const BATAS_BIZ = 20;

type Kriteria = { mode: "nama" | "nik"; persis: boolean; pola: string };

function kriteriaDari(q: string): Kriteria | null {
  const s = q.trim().replace(/\s+/g, " ").toLowerCase();
  const digit = s.replace(/\D/g, "");
  if (digit.length >= 6 && /^[\d\s.-]+$/.test(s)) {
    return digit.length === 16
      ? { mode: "nik", persis: true, pola: digit }
      : { mode: "nik", persis: false, pola: `%${digit}%` };
  }
  if (s.length < 3) return null;
  return { mode: "nama", persis: false, pola: `%${s.replace(/[%_\\]/g, (c) => `\\${c}`)}%` };
}

/** Kondisi SQL pencocokan; `p` adalah placeholder parameter pola (mis. "$1"). */
function cocokSql(k: Kriteria, p: string, namaCol: string, nikCol: string, aliasCol?: string): string {
  if (k.mode === "nik") return k.persis ? `${nikCol} = ${p}` : `${nikCol} LIKE ${p}`;
  const nama = `lower(${namaCol}) LIKE ${p}`;
  return aliasCol ? `(${nama} OR lower(${aliasCol}) LIKE ${p})` : nama;
}

/** Tanggal hari ini menurut WIB (server berjalan di UTC). */
function hariIniWib(): string {
  return isoTanggal(new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" })));
}

function sisaHari(tanggal: string | null | undefined, acuan: Date): number | null {
  const d = parseTanggal(tanggal);
  if (!d) return null;
  return Math.round((d.getTime() - acuan.getTime()) / 86_400_000);
}

function waTampil(v: string | null | undefined): string | null {
  return isNomorHpValid(v) ? normalizeNomorHp(v) : null;
}

function kendaraan(punya: boolean | null, jenis: string | null, plat: string | null): string | null {
  if (!punya && !plat) return null;
  return [jenis, plat].filter(Boolean).join(" · ") || "Ada";
}

const nikTampil = (v: string | null | undefined) => (v ? maskNik(v) : null);

/** Index pendukung pencarian — dipanggil sekali saat server start, tidak memblokir. */
export async function pastikanIndexCekWarga() {
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_visitrw3_penghuni_pengajuan ON visitrw3_penghuni (pengajuan_id);
    CREATE INDEX IF NOT EXISTS idx_visitrw3_pengajuan_ws ON visitrw3_pengajuan (warga_singgah_id);
    CREATE INDEX IF NOT EXISTS idx_rw3biz_pengajuan_usaha ON rw3biz_pengajuan (usaha_id);
    CREATE INDEX IF NOT EXISTS idx_rw3biz_tagihan_usaha_status ON rw3biz_tagihan (usaha_id, status);
  `);
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  } catch (e) {
    console.warn("[cek-warga] pg_trgm tidak tersedia, pencarian nama tetap jalan tanpa index trigram:", (e as Error).message);
    return;
  }
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_warga_nama_trgm ON warga USING gin (lower(nama_lengkap) gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_warga_alias_trgm ON warga USING gin (lower(nama_alias) gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_warga_nik_trgm ON warga USING gin (nik gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_warga_singgah_nama_trgm ON warga_singgah USING gin (lower(nama_lengkap) gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_visitrw3_penghuni_nama_trgm ON visitrw3_penghuni USING gin (lower(nama_lengkap) gin_trgm_ops);
    CREATE INDEX IF NOT EXISTS idx_rw3biz_orang_nama_trgm ON rw3biz_orang USING gin (lower(nama_lengkap) gin_trgm_ops);
  `);
}

async function cariWargaRw3(k: Kriteria, acuanIso: string) {
  const { rows: kkRows } = await pool.query(
    `SELECT k.id, k.nomor_kk, k.rt, k.alamat, k.no_unit FROM kartu_keluarga k
      WHERE k.id IN (SELECT w.kk_id FROM warga w WHERE ${cocokSql(k, "$1", "w.nama_lengkap", "w.nik", "w.nama_alias")})
      ORDER BY k.rt, k.id LIMIT ${BATAS_KK + 1}`,
    [k.pola],
  );
  const terpotong = kkRows.length > BATAS_KK;
  const daftarKk = kkRows.slice(0, BATAS_KK);
  const kkIds: number[] = daftarKk.map((r) => r.id);
  if (!kkIds.length) return { warga: [] as KkCek[], terpotong };

  const [{ rows: anggota }, ringkas] = await Promise.all([
    pool.query(
      `SELECT id, kk_id, nama_lengkap, nik, jenis_kelamin, tanggal_lahir, kedudukan_keluarga, status_kependudukan,
              nomor_whatsapp, pekerjaan, (${cocokSql(k, "$2", "nama_lengkap", "nik", "nama_alias")}) AS cocok
         FROM warga WHERE kk_id = ANY($1)
        ORDER BY CASE WHEN kedudukan_keluarga = 'Kepala Keluarga' THEN 0 ELSE 1 END, tanggal_lahir NULLS LAST, id`,
      [kkIds, k.pola],
    ),
    ringkasKeluarga(kkIds, { rinci: true }),
  ]);

  const warga: KkCek[] = daftarKk.map((kk) => {
    const r = ringkas.get(kk.id);
    return {
      kkId: kk.id,
      nomorKk: maskNik(kk.nomor_kk),
      rt: kk.rt,
      alamat: kk.alamat,
      noUnit: kk.no_unit,
      kelengkapan: Math.round((r?.kelengkapan ?? 0) * 100),
      kurangKeluarga: r?.kurang?.keluarga ?? [],
      anggota: anggota.filter((a) => a.kk_id === kk.id).map((a) => ({
        id: a.id,
        nama: a.nama_lengkap,
        nik: maskNik(a.nik),
        jenisKelamin: a.jenis_kelamin,
        umur: umurTahun(a.tanggal_lahir, acuanIso),
        kedudukan: a.kedudukan_keluarga,
        status: a.status_kependudukan,
        pekerjaan: a.pekerjaan,
        punyaWa: isNomorHpValid(a.nomor_whatsapp),
        nomorWa: waTampil(a.nomor_whatsapp),
        cocok: !!a.cocok,
        kurang: r?.kurang?.anggota.get(a.id) ?? [],
      })),
    };
  });
  return { warga, terpotong };
}

type OrangJson = {
  nama: string;
  nik: string | null;
  isAnak: boolean;
  pekerjaan: string | null;
  wa: string | null;
  punyaKendaraan: boolean | null;
  jenisKendaraan: string | null;
  plat: string | null;
  cocok: boolean;
};

const orangJsonSql = (alias: string, k: Kriteria, p: string) => `
  'nama', ${alias}.nama_lengkap, 'nik', ${alias}.nik, 'isAnak', ${alias}.is_anak, 'pekerjaan', ${alias}.pekerjaan,
  'wa', ${alias}.nomor_whatsapp, 'punyaKendaraan', ${alias}.punya_kendaraan, 'jenisKendaraan', ${alias}.jenis_kendaraan,
  'plat', ${alias}.plat_nomor, 'cocok', (${cocokSql(k, p, `${alias}.nama_lengkap`, `${alias}.nik`)})`;

const orangDasar = (o: OrangJson) => ({
  nama: o.nama,
  nik: nikTampil(o.nik),
  isAnak: !!o.isAnak,
  pekerjaan: o.pekerjaan,
  nomorWa: waTampil(o.wa),
  kendaraan: kendaraan(o.punyaKendaraan, o.jenisKendaraan, o.plat),
  cocok: !!o.cocok,
});

async function cariVisit(k: Kriteria, acuan: Date): Promise<VisitCek[]> {
  const [{ rows: pengajuan }, { rows: lama }] = await Promise.all([
    pool.query(
      `SELECT p.id, p.nomor_visitrw3, p.tipe, p.jenis_warga, p.rt, p.alamat, p.nomor_unit, p.status, p.tanggal_bayar,
              p.tanggal_berlaku_sampai, p.keperluan_pengajuan, p.alasan_tolak, p.warga_singgah_id,
              ws.status AS ws_status, ws.tanggal_mulai_kontrak, ws.tanggal_habis_kontrak,
              (SELECT json_agg(json_build_object(${orangJsonSql("h", k, "$1")}, 'keperluan', h.keperluan_tinggal) ORDER BY h.urutan, h.id)
                 FROM visitrw3_penghuni h WHERE h.pengajuan_id = p.id) AS penghuni
         FROM visitrw3_pengajuan p
         LEFT JOIN warga_singgah ws ON ws.id = p.warga_singgah_id
        WHERE p.id IN (SELECT h.pengajuan_id FROM visitrw3_penghuni h WHERE ${cocokSql(k, "$1", "h.nama_lengkap", "h.nik")})
           OR p.warga_singgah_id IN (SELECT ws2.id FROM warga_singgah ws2 WHERE ${cocokSql(k, "$1", "ws2.nama_lengkap", "ws2.nik")})
        ORDER BY p.id DESC LIMIT ${BATAS_VISIT}`,
      [k.pola],
    ),
    // Data warga singgah lama yang tidak terhubung ke pengajuan mana pun.
    pool.query(
      `SELECT ws.id, ws.nomor_visitrw3, ws.jenis_warga, ws.rt, ws.alamat, ws.status, ws.tanggal_mulai_kontrak,
              ws.tanggal_habis_kontrak, ws.keperluan_tinggal, ws.nama_lengkap, ws.nik, ws.pekerjaan, ws.nomor_whatsapp
         FROM warga_singgah ws
        WHERE ${cocokSql(k, "$1", "ws.nama_lengkap", "ws.nik")}
          AND NOT EXISTS (SELECT 1 FROM visitrw3_pengajuan p WHERE p.warga_singgah_id = ws.id)
        ORDER BY ws.id DESC LIMIT ${BATAS_VISIT}`,
      [k.pola],
    ),
  ]);

  const hasil: VisitCek[] = pengajuan.map((p) => {
    const tanggalHabis = p.tanggal_habis_kontrak ?? p.tanggal_berlaku_sampai;
    return {
      pengajuanId: p.id,
      wargaSinggahId: p.warga_singgah_id,
      nomorVisitrw3: p.nomor_visitrw3,
      tipe: p.tipe,
      jenisWarga: p.jenis_warga,
      rt: p.rt,
      alamat: p.alamat,
      nomorUnit: p.nomor_unit,
      status: p.status,
      statusHunian: p.ws_status,
      tanggalMulai: p.tanggal_mulai_kontrak ?? p.tanggal_bayar,
      tanggalHabis,
      sisaHari: sisaHari(tanggalHabis, acuan),
      keperluan: p.keperluan_pengajuan,
      alasanTolak: p.alasan_tolak,
      penghuni: ((p.penghuni ?? []) as (OrangJson & { keperluan: string | null })[]).map((h) => ({
        ...orangDasar(h),
        keperluan: h.keperluan,
      })),
    };
  });

  for (const ws of lama) {
    hasil.push({
      pengajuanId: null,
      wargaSinggahId: ws.id,
      nomorVisitrw3: ws.nomor_visitrw3,
      tipe: null,
      jenisWarga: ws.jenis_warga,
      rt: ws.rt,
      alamat: ws.alamat,
      nomorUnit: null,
      status: "disetujui",
      statusHunian: ws.status,
      tanggalMulai: ws.tanggal_mulai_kontrak,
      tanggalHabis: ws.tanggal_habis_kontrak,
      sisaHari: sisaHari(ws.tanggal_habis_kontrak, acuan),
      keperluan: ws.keperluan_tinggal,
      alasanTolak: null,
      penghuni: [{
        nama: ws.nama_lengkap,
        nik: nikTampil(ws.nik),
        isAnak: false,
        pekerjaan: ws.pekerjaan,
        nomorWa: waTampil(ws.nomor_whatsapp),
        kendaraan: null,
        keperluan: ws.keperluan_tinggal,
        cocok: true,
      }],
    });
  }
  return hasil;
}

type OrangBizJson = OrangJson & { isPj: boolean; peran: string | null; asal: string | null; domisili: string | null };

async function cariBiz(k: Kriteria, acuan: Date): Promise<BizCek[]> {
  // Satu kartu per usaha: pengajuan paling baru yang memuat orang tersebut.
  const { rows } = await pool.query(
    `WITH pilih AS (
       SELECT DISTINCT ON (COALESCE('u' || pg.usaha_id, 'p' || pg.id)) pg.id
         FROM rw3biz_pengajuan pg
        WHERE pg.id IN (SELECT o.pengajuan_id FROM rw3biz_orang o WHERE ${cocokSql(k, "$1", "o.nama_lengkap", "o.nik")})
           OR ${cocokSql(k, "$1", "pg.pj_nama", "pg.pj_nik")}
        ORDER BY COALESCE('u' || pg.usaha_id, 'p' || pg.id), pg.id DESC
     )
     SELECT pg.id, pg.nomor_biz, pg.nama_usaha, pg.rt, pg.alamat, pg.alamat_usaha, pg.status, pg.tanggal_bayar,
            pg.tanggal_berlaku_sampai, pg.pj_nama, pg.pj_nomor_whatsapp,
            u.id AS u_id, u.nomor_induk, u.nama_usaha AS u_nama, u.status AS u_status, u.tanggal_mulai AS u_mulai,
            u.tanggal_habis AS u_habis, u.pengajuan_id AS u_pengajuan_id,
            (SELECT COUNT(*)::int FROM rw3biz_tagihan t WHERE t.usaha_id = u.id AND t.status IN ('belum', 'sebagian')
                AND t.periode <= to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM')) AS tunggakan,
            (SELECT json_agg(json_build_object(${orangJsonSql("o", k, "$1")},
                    'isPj', o.is_penanggung_jawab, 'peran', o.peran, 'asal', o.asal, 'domisili', o.domisili)
                    ORDER BY o.is_penanggung_jawab DESC, o.urutan, o.id)
               FROM rw3biz_orang o WHERE o.pengajuan_id = pg.id) AS orang
       FROM pilih JOIN rw3biz_pengajuan pg ON pg.id = pilih.id
       LEFT JOIN rw3biz_usaha u ON u.id = pg.usaha_id
      ORDER BY pg.id DESC LIMIT ${BATAS_BIZ}`,
    [k.pola],
  );

  return rows.map((p) => {
    const tanggalHabis = p.u_habis ?? p.tanggal_berlaku_sampai;
    return {
      pengajuanId: p.id,
      usahaId: p.u_id,
      namaUsaha: p.u_nama ?? p.nama_usaha,
      nomorInduk: p.nomor_induk,
      nomorBiz: p.nomor_biz,
      rt: p.rt,
      alamat: p.alamat_usaha || p.alamat,
      statusPengajuan: p.status,
      statusUsaha: p.u_status,
      tanggalMulai: p.u_mulai ?? p.tanggal_bayar,
      tanggalHabis,
      sisaHari: sisaHari(tanggalHabis, acuan),
      pjNama: p.pj_nama,
      pjNomorWa: waTampil(p.pj_nomor_whatsapp),
      tagihanBelumLunas: p.tunggakan ?? 0,
      dataLama: !!p.u_pengajuan_id && p.u_pengajuan_id !== p.id && p.status === "disetujui",
      orang: ((p.orang ?? []) as OrangBizJson[]).map((o) => ({
        ...orangDasar(o),
        peran: o.peran,
        asal: o.asal,
        domisili: o.domisili,
        isPj: !!o.isPj || o.peran === "pemilik" || o.peran === "penanggung_jawab",
      })),
    };
  });
}

function simpulkan(warga: KkCek[], visit: VisitCek[], biz: BizCek[]) {
  const vonis = new Set<VonisCek>();
  const peringatan: string[] = [];

  for (const kk of warga) {
    for (const a of kk.anggota.filter((x) => x.cocok)) {
      if (a.status === "Aktif") vonis.add("warga_rw3");
      else peringatan.push(`${a.nama} tercatat warga RT ${String(kk.rt).padStart(2, "0")} dengan status "${a.status}".`);
    }
  }

  for (const v of visit) {
    const nama = v.penghuni.find((h) => h.cocok)?.nama ?? v.nomorVisitrw3 ?? "Penghuni";
    if (v.status === "disetujui") {
      if (v.sisaHari != null && v.sisaHari < 0) {
        vonis.add("visit_kedaluwarsa");
        peringatan.push(`Izin Visit RW3 ${nama} (${v.nomorVisitrw3 ?? "-"}) habis ${-v.sisaHari} hari lalu.`);
      } else {
        vonis.add("warga_singgah_aktif");
        if (v.sisaHari != null && v.sisaHari <= 7) peringatan.push(`Izin Visit RW3 ${nama} habis ${v.sisaHari} hari lagi.`);
      }
    } else if (v.status === "menunggu_survey") {
      peringatan.push(`Pengajuan Visit RW3 ${nama} (${v.nomorVisitrw3 ?? "-"}) masih menunggu survey — belum resmi.`);
    } else if (v.status === "ditolak") {
      peringatan.push(`Pengajuan Visit RW3 ${nama} (${v.nomorVisitrw3 ?? "-"}) DITOLAK${v.alasanTolak ? `: ${v.alasanTolak}` : ""}.`);
    }
  }

  for (const b of biz) {
    const orang = b.orang.filter((o) => o.cocok);
    const pjCocok = orang.some((o) => o.isPj) || (!orang.length);
    const nama = orang[0]?.nama ?? b.pjNama;
    const izinAktif = b.statusUsaha === "aktif" && (b.sisaHari == null || b.sisaHari >= 0);
    if (b.statusPengajuan === "disetujui" && izinAktif && !b.dataLama) {
      vonis.add(pjCocok ? "pj_usaha" : "pekerja_usaha");
    } else if (b.dataLama) {
      peringatan.push(`${nama} hanya tercatat di pengajuan lama "${b.namaUsaha}" — tidak ada di izin terbaru.`);
    } else if (b.statusPengajuan === "menunggu_survey") {
      peringatan.push(`Pengajuan RW3BIZ "${b.namaUsaha}" masih menunggu survey — belum resmi.`);
    } else if (b.statusPengajuan === "ditolak") {
      peringatan.push(`Pengajuan RW3BIZ "${b.namaUsaha}" DITOLAK.`);
    } else if (b.statusUsaha && !izinAktif) {
      peringatan.push(`Izin usaha "${b.namaUsaha}" tidak aktif / sudah habis.`);
    }
    if (b.tagihanBelumLunas > 0) peringatan.push(`"${b.namaUsaha}" punya ${b.tagihanBelumLunas} tagihan kontribusi belum lunas.`);
  }

  return { vonis: [...vonis], peringatan };
}

export async function cekWarga(q: string): Promise<HasilCekWarga> {
  const k = kriteriaDari(q);
  if (!k) return { q, mode: "pendek", vonis: [], peringatan: [], warga: [], wargaTerpotong: false, visit: [], biz: [] };
  const acuanIso = hariIniWib();
  const acuan = parseTanggal(acuanIso)!;
  const [rw3, visit, biz] = await Promise.all([cariWargaRw3(k, acuanIso), cariVisit(k, acuan), cariBiz(k, acuan)]);
  return { q, mode: k.mode, ...simpulkan(rw3.warga, visit, biz), warga: rw3.warga, wargaTerpotong: rw3.terpotong, visit, biz };
}
