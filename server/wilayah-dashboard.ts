/**
 * Dashboard Ketua RW — hanya baca. Setiap angka membawa periode, scope, satuan, kelengkapan, dan rincian per RT.
 */
import { pool } from "./db";
import { muatDataset, statusLaporanSemuaRt } from "./wilayah-laporan";
import { hitungLaporan } from "@shared/wilayah-hitung";
import { FAKTA_INTI_KK, NAMA_BULAN, WILAYAH_RT_NUMBERS, awalBulan, akhirBulan, tanggalAcuan } from "@shared/wilayah";

export interface Angka {
  label: string;
  nilai: number | null;
  satuan: string;
  periode: string;
  scope: string;
  /** 0–100, null bila tidak relevan. */
  kelengkapan: number | null;
  rincian: { rt: number; nilai: number | null }[];
  catatan?: string;
}

/** Kode indikator yang ditampilkan di ringkasan. */
const KODE_RINGKAS = [
  { bagian: "B", kode: "B.1" }, { bagian: "B", kode: "B.2" }, { bagian: "B", kode: "B.4" },
  { bagian: "C", kode: "C.1" }, { bagian: "C", kode: "C.12" },
  { bagian: "F", kode: "F.1" }, { bagian: "F", kode: "F.3" },
];

export async function ringkasanRw(tahun: number, bulan: number) {
  const periode = `${NAMA_BULAN[bulan - 1]} ${tahun}`;
  const acuan = tanggalAcuan(tahun, bulan);
  const ds = await muatDataset();
  const rekap = hitungLaporan(ds, { rt: null, tahun, bulan, acuan });
  const perRt = WILAYAH_RT_NUMBERS.map((rt) => ({ rt, hasil: hitungLaporan(ds, { rt, tahun, bulan, acuan }) }));

  const angka = KODE_RINGKAS.map(({ bagian, kode }): Angka | null => {
    const h = rekap.find((x) => x.bagian === bagian && x.kode === kode);
    if (!h) return null;
    return {
      label: h.label,
      nilai: h.nilai,
      satuan: h.satuan,
      periode,
      scope: "RW 03 (objek unik)",
      kelengkapan: h.kelengkapan,
      rincian: perRt.map((p) => ({ rt: p.rt, nilai: p.hasil.find((x) => x.id === h.id)?.nilai ?? null })),
      catatan: h.catatan || undefined,
    };
  }).filter((x): x is Angka => x !== null);

  const kunciInti = FAKTA_INTI_KK as readonly string[];
  const faktaKk = new Map<number, Set<string>>();
  for (const f of ds.fakta) {
    if (f.subjek !== "kk" || !kunciInti.includes(f.kunci) || f.mulai > acuan || (f.sampai && f.sampai < acuan)) continue;
    if (!faktaKk.has(f.subjekId)) faktaKk.set(f.subjekId, new Set());
    faktaKk.get(f.subjekId)!.add(f.kunci);
  }
  const rumahKk = new Set((await pool.query(`SELECT kk_id FROM wil_rumah_kk WHERE sampai IS NULL`)).rows.map((r) => r.kk_id));

  const { rows: antre } = await pool.query(
    `SELECT r.rt,
       (SELECT COUNT(*)::int FROM wil_usulan u WHERE u.rt = r.rt AND u.status = 'menunggu') AS usulan,
       (SELECT COUNT(*)::int FROM wil_kejadian k WHERE k.rt = r.rt AND k.status <> 'selesai') AS kejadian_terbuka,
       (SELECT COUNT(*)::int FROM wil_serah_terima s WHERE (s.rt_asal = r.rt OR s.rt_tujuan = r.rt) AND s.status = 'diajukan') AS pindah
     FROM unnest($1::int[]) AS r(rt)`,
    [WILAYAH_RT_NUMBERS],
  );
  const laporan = await statusLaporanSemuaRt(tahun, bulan);

  const kelengkapanRt = WILAYAH_RT_NUMBERS.map((rt) => {
    const kks = ds.kk.filter((k) => k.rt === rt);
    const lengkap = kks.filter((k) => (faktaKk.get(k.id)?.size ?? 0) >= kunciInti.length && rumahKk.has(k.id)).length;
    const a = antre.find((x) => x.rt === rt);
    const l = laporan.find((x) => x.rt === rt);
    return {
      rt,
      kk: kks.length,
      warga: ds.warga.filter((w) => w.rt === rt).length,
      kkLengkap: lengkap,
      persen: kks.length ? Math.round((lengkap / kks.length) * 100) : null,
      usulanMenunggu: a?.usulan ?? 0,
      kejadianTerbuka: a?.kejadian_terbuka ?? 0,
      pindahMenunggu: a?.pindah ?? 0,
      laporanVersi: l?.versi ?? null,
      laporanTerakhir: l?.terakhir ?? null,
      tanpaDataLama: kks.length === 0,
    };
  });

  const { rows: keputusan } = await pool.query(
    `SELECT 'kejadian' AS jenis, id, rt, judul AS judul, created_at FROM wil_kejadian WHERE status = 'perlu_rw'
     UNION ALL
     SELECT 'koreksi', id, rt_pengusul, left(uraian, 120), created_at FROM wil_usulan_koreksi WHERE status = 'baru'
     UNION ALL
     SELECT 'permintaan_surat', id, rt, perihal, created_at FROM wil_permintaan_surat WHERE status = 'baru'
     ORDER BY created_at LIMIT 50`,
  );

  const { rows: perubahan } = await pool.query(
    `SELECT aksi || ':' || entitas AS aksi, rt, COUNT(*)::int AS jumlah FROM wil_audit
      WHERE created_at >= $1::date AND created_at < ($2::date + 1) AND aktor_role = 'rt'
        AND aksi IN ('tambah', 'ubah', 'terima_pindah', 'usulan_terima') AND entitas IN ('warga', 'kk', 'rumah', 'usaha', 'kejadian', 'usulan')
      GROUP BY aksi, entitas, rt ORDER BY aksi, rt`,
    [awalBulan(tahun, bulan), akhirBulan(tahun, bulan)],
  );

  return {
    periode, acuan,
    angka,
    kelengkapanRt,
    laporan,
    keputusan,
    perubahan,
    statusIndikator: rekap.reduce<Record<string, number>>((m, h) => ((m[h.status] = (m[h.status] ?? 0) + 1), m), {}),
  };
}

export async function aksiRw(tahun: number, bulan: number) {
  const dari = awalBulan(tahun, bulan);
  const sampai = akhirBulan(tahun, bulan);
  const { rows: kegiatan } = await pool.query(
    `SELECT g.id, g.jenis, g.judul, to_char(g.tanggal, 'YYYY-MM-DD') AS tanggal, g.rt_terlibat,
            COALESCE(json_agg(json_build_object('rt', p.rt, 'hadir', p.jumlah_hadir)) FILTER (WHERE p.rt IS NOT NULL), '[]') AS peserta
       FROM wil_kegiatan g LEFT JOIN wil_kegiatan_peserta p ON p.kegiatan_id = g.id
      WHERE g.pengelola = 'rw' AND g.tanggal BETWEEN $1 AND $2
      GROUP BY g.id ORDER BY g.tanggal`,
    [dari, sampai],
  );
  const { rows: kejadian } = await pool.query(
    `SELECT k.id, k.jenis, k.judul, k.rt, k.status, to_char(k.tanggal, 'YYYY-MM-DD') AS tanggal,
            (SELECT COUNT(*)::int FROM wil_tindak_lanjut t WHERE t.kejadian_id = k.id) AS tindak
       FROM wil_kejadian k WHERE k.status <> 'selesai' OR k.tanggal BETWEEN $1 AND $2
      ORDER BY (k.status = 'perlu_rw') DESC, k.tanggal DESC LIMIT 100`,
    [dari, sampai],
  );
  return { kegiatan, kejadian };
}
