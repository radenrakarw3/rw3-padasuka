/**
 * Cap/stempel Ketua RW: diunggah sekali, dibubuhkan bersama tanda tangan pada dokumen resmi.
 * Satu yang aktif; penggantian menonaktifkan yang lama agar jejak sha256 tetap terlacak.
 */
import { z } from "zod";
import { pool } from "../db";
import { catatAudit, WilayahError, type Aktor } from "../wilayah-auth";
import { denganTransaksi } from "../wilayah-data";
import { parseGambar } from "../visitrw3-dokumen";
import { hanyaRw } from "./akses";

const MAKS_BYTES = 1_500_000;

export interface CapAktif {
  id: number;
  mime: "image/png" | "image/jpeg";
  dataUrl: string;
  sha256: string;
}

export async function capAktif(): Promise<CapAktif | null> {
  const { rows } = await pool.query(`SELECT id, mime, data, sha256 FROM wil_surat_cap WHERE aktif ORDER BY id DESC LIMIT 1`);
  const r = rows[0];
  return r ? { id: r.id, mime: r.mime, dataUrl: `data:${r.mime};base64,${r.data}`, sha256: r.sha256 } : null;
}

export async function statusCap(aktor: Aktor) {
  hanyaRw(aktor);
  const { rows } = await pool.query(`SELECT id, mime, data, diunggah_oleh, created_at FROM wil_surat_cap WHERE aktif ORDER BY id DESC LIMIT 1`);
  const r = rows[0];
  return r
    ? { ada: true, gambar: `data:${r.mime};base64,${r.data}`, diunggahOleh: r.diunggah_oleh, diunggahPada: r.created_at }
    : { ada: false };
}

const unggahSchema = z.object({ gambar: z.string().min(100).max(2_200_000) });

export async function unggahCap(aktor: Aktor, raw: unknown) {
  hanyaRw(aktor);
  const { gambar } = unggahSchema.parse(raw);
  let g;
  try {
    g = parseGambar(gambar, "Gambar cap/stempel", MAKS_BYTES);
  } catch (e) {
    throw new WilayahError(400, (e as Error).message);
  }
  if (g.mime !== "image/png" && g.mime !== "image/jpeg") throw new WilayahError(400, "Gambar cap harus PNG atau JPG");
  const id = await denganTransaksi(async (c) => {
    await c.query(`UPDATE wil_surat_cap SET aktif = false, dinonaktifkan_at = now() WHERE aktif`);
    const { rows } = await c.query(
      `INSERT INTO wil_surat_cap (mime, data, sha256, aktif, diunggah_oleh) VALUES ($1, $2, $3, true, $4) RETURNING id`,
      [g.mime, g.buffer.toString("base64"), g.sha256, aktor.label],
    );
    await catatAudit(aktor, "unggah_cap_surat", "surat_cap", rows[0].id, null, null, { sha256: g.sha256 }, c);
    return rows[0].id as number;
  });
  return { ok: true, id };
}

export async function hapusCap(aktor: Aktor) {
  hanyaRw(aktor);
  await pool.query(`UPDATE wil_surat_cap SET aktif = false, dinonaktifkan_at = now() WHERE aktif`);
  await catatAudit(aktor, "hapus_cap_surat", "surat_cap", null, null, null, null);
  return { ok: true };
}
