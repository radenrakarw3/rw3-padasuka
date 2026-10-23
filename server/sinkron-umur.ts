/**
 * Kolom turunan umur (warga.kategori_umur, warga.lansia) disimpan agar bisa difilter di SQL,
 * jadi harus diperbarui saat warga berulang tahun — bukan hanya saat datanya diedit.
 */
import { pool } from "./db";
import { invalidateWarga } from "./cache";
import { isUmurLansia, resolveKategoriUmur } from "@shared/kategori-umur";
import { getWargaAge } from "@shared/warga-form-tier";
import { isoTanggal } from "@shared/wilayah";

const CEK_SETIAP_MS = 60 * 60_000;

/** Nilai kolom turunan untuk tanggal lahir tertentu (dipakai saat INSERT/UPDATE tanggal_lahir). */
export function kolomUmur(tanggalLahir: string | null | undefined): { kategori_umur: string; lansia: boolean } {
  return { kategori_umur: resolveKategoriUmur(tanggalLahir), lansia: isUmurLansia(getWargaAge(tanggalLahir)) };
}

/** Perbarui baris yang kategori umur / status lansianya sudah tidak sesuai tanggal lahir. */
export async function sinkronUmurWarga(): Promise<number> {
  const { rows } = await pool.query(`SELECT id, tanggal_lahir, kategori_umur, lansia FROM warga`);
  const ids: number[] = [];
  const kategori: string[] = [];
  const lansia: boolean[] = [];
  for (const r of rows) {
    const k = kolomUmur(r.tanggal_lahir);
    if (r.kategori_umur === k.kategori_umur && r.lansia === k.lansia) continue;
    ids.push(r.id);
    kategori.push(k.kategori_umur);
    lansia.push(k.lansia);
  }
  if (!ids.length) return 0;
  await pool.query(
    `UPDATE warga w SET kategori_umur = u.kategori, lansia = u.lansia
       FROM UNNEST($1::int[], $2::text[], $3::boolean[]) AS u(id, kategori, lansia)
      WHERE w.id = u.id`,
    [ids, kategori, lansia],
  );
  invalidateWarga();
  return ids.length;
}

/** Jalan saat server mulai, lalu dicek tiap jam dan dikerjakan sekali setiap pergantian hari. */
export function startSinkronUmurScheduler(): void {
  let terakhir: string | null = null;
  const run = () => {
    const hari = isoTanggal(new Date());
    if (hari === terakhir) return;
    terakhir = hari;
    sinkronUmurWarga()
      .then((n) => { if (n) console.log(`[sinkron-umur] ${n} warga diperbarui kategori umur / status lansianya`); })
      .catch((err) => {
        terakhir = null;
        console.error("[sinkron-umur] gagal:", err);
      });
  };
  setTimeout(run, 30_000);
  setInterval(run, CEK_SETIAP_MS);
}
