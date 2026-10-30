/**
 * Tanda tangan Ketua RW: diunggah sekali, dibubuhkan otomatis pada setiap dokumen saat terbit (bukan pada draf).
 * Hanya satu yang aktif; penggantian menonaktifkan yang lama (tidak dihapus) agar sha256 di snapshot tetap terlacak.
 */
import { z } from "zod";
import { pool } from "../db";
import { catatAudit, WilayahError, type Aktor } from "../wilayah-auth";
import { denganTransaksi } from "../wilayah-data";
import { parseGambar } from "../visitrw3-dokumen";
import { hanyaRw } from "./akses";
import { capAktif } from "./cap";

const MAKS_BYTES = 1_500_000;

export interface TtdAktif {
  id: number;
  mime: "image/png" | "image/jpeg";
  dataUrl: string;
  sha256: string;
}

export async function ttdAktif(): Promise<TtdAktif | null> {
  const { rows } = await pool.query(`SELECT id, mime, data, sha256 FROM wil_surat_ttd WHERE aktif ORDER BY id DESC LIMIT 1`);
  const r = rows[0];
  return r ? { id: r.id, mime: r.mime, dataUrl: `data:${r.mime};base64,${r.data}`, sha256: r.sha256 } : null;
}

/** Gambar TTD Ketua RW untuk dokumen publik (formulir cetak, PDF RW3BIZ) — tanpa metadata admin. */
export async function ttdPublik(): Promise<{ ada: false } | { ada: true; gambar: string }> {
  const t = await ttdAktif();
  return t ? { ada: true, gambar: t.dataUrl } : { ada: false };
}

/** TTD + cap Ketua RW untuk dokumen/cetak publik. */
export async function atributKetuaPublik(): Promise<{
  ttd: { ada: false } | { ada: true; gambar: string };
  cap: { ada: false } | { ada: true; gambar: string };
}> {
  const [t, c] = await Promise.all([ttdAktif(), capAktif()]);
  return {
    ttd: t ? { ada: true, gambar: t.dataUrl } : { ada: false },
    cap: c ? { ada: true, gambar: c.dataUrl } : { ada: false },
  };
}

export async function statusTtd(aktor: Aktor) {
  hanyaRw(aktor);
  const { rows } = await pool.query(`SELECT id, mime, data, diunggah_oleh, created_at FROM wil_surat_ttd WHERE aktif ORDER BY id DESC LIMIT 1`);
  const r = rows[0];
  return r
    ? { ada: true, gambar: `data:${r.mime};base64,${r.data}`, diunggahOleh: r.diunggah_oleh, diunggahPada: r.created_at }
    : { ada: false };
}

const unggahSchema = z.object({ gambar: z.string().min(100).max(2_200_000) });

export async function unggahTtd(aktor: Aktor, raw: unknown) {
  hanyaRw(aktor);
  const { gambar } = unggahSchema.parse(raw);
  let g;
  try {
    g = parseGambar(gambar, "Gambar tanda tangan", MAKS_BYTES);
  } catch (e) {
    throw new WilayahError(400, (e as Error).message);
  }
  if (g.mime !== "image/png" && g.mime !== "image/jpeg") throw new WilayahError(400, "Gambar tanda tangan harus PNG atau JPG");
  const id = await denganTransaksi(async (c) => {
    await c.query(`UPDATE wil_surat_ttd SET aktif = false, dinonaktifkan_at = now() WHERE aktif`);
    const { rows } = await c.query(
      `INSERT INTO wil_surat_ttd (mime, data, sha256, aktif, diunggah_oleh) VALUES ($1, $2, $3, true, $4) RETURNING id`,
      [g.mime, g.buffer.toString("base64"), g.sha256, aktor.label],
    );
    await catatAudit(aktor, "unggah_ttd_surat", "surat_ttd", rows[0].id, null, null, { sha256: g.sha256 }, c);
    return rows[0].id as number;
  });
  return { ok: true, id };
}

export async function hapusTtd(aktor: Aktor) {
  hanyaRw(aktor);
  await pool.query(`UPDATE wil_surat_ttd SET aktif = false, dinonaktifkan_at = now() WHERE aktif`);
  await catatAudit(aktor, "hapus_ttd_surat", "surat_ttd", null, null, null, null);
  return { ok: true };
}
