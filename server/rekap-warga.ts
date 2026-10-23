import { cache, TTL } from "./cache";
import { dataWargaEfektif } from "./statistik-warga";
import { isoTanggal } from "@shared/wilayah";
import { daftarRekap, ringkasanRekap, type DaftarRekap, type KategoriRekap, type RingkasanRekap } from "@shared/rekap-kategori";

/** Prefiks "kependudukan:" ikut dibuang oleh invalidateWarga/invalidateKk. */
const kunciRingkasan = () => `kependudukan:rekap:v1:${isoTanggal(new Date())}`;

export async function ringkasanRekapWarga(): Promise<RingkasanRekap> {
  const key = kunciRingkasan();
  const ada = cache.get<RingkasanRekap>(key);
  if (ada) return ada;
  const { kk, warga } = await dataWargaEfektif();
  const hasil = ringkasanRekap(kk, warga);
  cache.set(key, hasil, TTL.DASHBOARD);
  return hasil;
}

export async function daftarRekapWarga(kategori: KategoriRekap, rt: number | null): Promise<DaftarRekap> {
  const { kk, warga } = await dataWargaEfektif();
  const { cocok: _cocok, ...info } = kategori;
  return { kategori: info, rt, dibuat: new Date().toISOString(), baris: daftarRekap(kategori, kk, warga, rt) };
}
