import { pool } from "./db";
import { storage } from "./storage";
import { cache, CacheKey, TTL } from "./cache";
import { hitungStatistikWarga, type SinggahPerRt, type StatistikWarga } from "@shared/statistik-warga";

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

export async function statistikWarga(): Promise<StatistikWarga> {
  const key = CacheKey.statistikWarga();
  const cached = cache.get<StatistikWarga>(key);
  if (cached) return cached;
  const [kk, warga, singgah] = await Promise.all([
    storage.getAllKkPemukiman(),
    storage.getAllWargaPemukiman(),
    singgahPerRt(),
  ]);
  const hasil = hitungStatistikWarga(kk, warga, singgah);
  cache.set(key, hasil, TTL.DASHBOARD);
  return hasil;
}
