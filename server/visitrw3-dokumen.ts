import crypto from "crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, pool } from "./db";
import { visitrw3Dokumen } from "@shared/schema";

export type JenisDokumen = "ktp" | "kk";

/** Batas per foto setelah dikompres di HP. KK lebih besar karena tulisannya kecil. */
export const MAX_BYTES_DOKUMEN: Record<JenisDokumen, number> = {
  ktp: 1_000_000,
  kk: 2_000_000,
};

const LABEL: Record<JenisDokumen, string> = { ktp: "Foto KTP", kk: "Foto Kartu Keluarga" };

export type GambarDokumen = { mime: string; buffer: Buffer; sha256: string };

function deteksiMime(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

/**
 * Data URL dari klien → biner tervalidasi. Jenis file ditentukan dari isi (magic bytes),
 * bukan dari header data URL, agar file non-gambar tidak bisa disisipkan.
 */
export function parseGambarDataUrl(dataUrl: string, jenis: JenisDokumen, pemilik?: string): GambarDokumen {
  return parseGambar(dataUrl, pemilik ? `${LABEL[jenis]} ${pemilik}` : LABEL[jenis], MAX_BYTES_DOKUMEN[jenis]);
}

export function parseGambar(dataUrl: string, label: string, maxBytes: number): GambarDokumen {
  const m = /^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i.exec(dataUrl.trim());
  if (!m) throw new Error(`${label} harus berupa foto — unggah ulang`);
  const buffer = Buffer.from(m[1], "base64");
  if (buffer.length < 1024) throw new Error(`${label} rusak atau kosong — unggah ulang`);
  if (buffer.length > maxBytes) {
    throw new Error(`${label} terlalu besar — foto ulang lebih dekat dan terang`);
  }
  const mime = deteksiMime(buffer);
  if (!mime) throw new Error(`${label}: format tidak didukung, gunakan JPG/PNG/WEBP`);
  return { mime, buffer, sha256: crypto.createHash("sha256").update(buffer).digest("hex") };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function simpanDokumen(
  tx: Tx,
  input: { pengajuanId: number; penghuniId?: number | null; jenis: JenisDokumen; gambar: GambarDokumen },
): Promise<number> {
  const [row] = await tx
    .insert(visitrw3Dokumen)
    .values({
      pengajuanId: input.pengajuanId,
      penghuniId: input.penghuniId ?? null,
      jenis: input.jenis,
      mime: input.gambar.mime,
      ukuran: input.gambar.buffer.length,
      sha256: input.gambar.sha256,
      data: input.gambar.buffer,
    })
    .returning({ id: visitrw3Dokumen.id });
  return row.id;
}

export async function ambilDokumenKtp(penghuniId: number): Promise<{ mime: string; buffer: Buffer } | null> {
  const [row] = await db
    .select({ mime: visitrw3Dokumen.mime, data: visitrw3Dokumen.data })
    .from(visitrw3Dokumen)
    .where(and(eq(visitrw3Dokumen.penghuniId, penghuniId), eq(visitrw3Dokumen.jenis, "ktp")))
    .orderBy(sql`${visitrw3Dokumen.id} DESC`)
    .limit(1);
  return row ? { mime: row.mime, buffer: row.data } : null;
}

export async function ambilDokumenKk(pengajuanId: number): Promise<{ mime: string; buffer: Buffer } | null> {
  const [row] = await db
    .select({ mime: visitrw3Dokumen.mime, data: visitrw3Dokumen.data })
    .from(visitrw3Dokumen)
    .where(
      and(
        eq(visitrw3Dokumen.pengajuanId, pengajuanId),
        eq(visitrw3Dokumen.jenis, "kk"),
        isNull(visitrw3Dokumen.penghuniId),
      ),
    )
    .orderBy(sql`${visitrw3Dokumen.id} DESC`)
    .limit(1);
  return row ? { mime: row.mime, buffer: row.data } : null;
}

/** Ringkasan dokumen per pengajuan tanpa membaca isi biner. */
export async function ringkasDokumen(pengajuanIds: number[]) {
  if (pengajuanIds.length === 0) return new Map<number, { kk: boolean; ktpPenghuni: Set<number> }>();
  const rows = await db
    .select({
      pengajuanId: visitrw3Dokumen.pengajuanId,
      penghuniId: visitrw3Dokumen.penghuniId,
      jenis: visitrw3Dokumen.jenis,
    })
    .from(visitrw3Dokumen)
    .where(inArray(visitrw3Dokumen.pengajuanId, pengajuanIds));
  const map = new Map<number, { kk: boolean; ktpPenghuni: Set<number> }>();
  for (const r of rows) {
    const e = map.get(r.pengajuanId) ?? { kk: false, ktpPenghuni: new Set<number>() };
    if (r.jenis === "kk") e.kk = true;
    if (r.jenis === "ktp" && r.penghuniId) e.ktpPenghuni.add(r.penghuniId);
    map.set(r.pengajuanId, e);
  }
  return map;
}

export async function ensureVisitrw3DokumenSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visitrw3_dokumen (
      id serial PRIMARY KEY,
      pengajuan_id integer NOT NULL REFERENCES visitrw3_pengajuan(id) ON DELETE CASCADE,
      penghuni_id integer REFERENCES visitrw3_penghuni(id) ON DELETE CASCADE,
      jenis text NOT NULL,
      mime text NOT NULL,
      ukuran integer NOT NULL,
      sha256 text NOT NULL,
      data bytea NOT NULL,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS visitrw3_dokumen_pengajuan_idx ON visitrw3_dokumen (pengajuan_id, jenis);
    CREATE INDEX IF NOT EXISTS visitrw3_dokumen_penghuni_idx ON visitrw3_dokumen (penghuni_id);
  `);
  // Biner JPEG/WEBP sudah terkompresi; kompresi TOAST hanya membuang CPU.
  await pool.query(`ALTER TABLE visitrw3_dokumen ALTER COLUMN data SET STORAGE EXTERNAL;`);
}

/**
 * Pindahkan foto KTP lama (base64 di visitrw3_penghuni, sering tersimpan ganda di
 * foto_ktp_path + foto_ktp_data) ke visitrw3_dokumen. Per baris dalam transaksi;
 * baris yang gagal di-decode dibiarkan apa adanya.
 */
export async function migrasiKtpLamaKeDokumen(batas = 50): Promise<number> {
  let pindah = 0;
  let setelahId = 0;
  for (;;) {
    const { rows } = await pool.query<{ id: number; pengajuan_id: number; data_url: string }>(
      `SELECT p.id, p.pengajuan_id,
              COALESCE(NULLIF(p.foto_ktp_data, ''), p.foto_ktp_path) AS data_url
         FROM visitrw3_penghuni p
        WHERE p.id > $1
          AND (p.foto_ktp_data LIKE 'data:image/%' OR p.foto_ktp_path LIKE 'data:image/%')
          AND NOT EXISTS (SELECT 1 FROM visitrw3_dokumen d WHERE d.penghuni_id = p.id AND d.jenis = 'ktp')
        ORDER BY p.id
        LIMIT $2`,
      [setelahId, batas],
    );
    if (rows.length === 0) return pindah;
    setelahId = rows[rows.length - 1].id;
    pindah += await pindahkanBaris(rows);
  }
}

async function pindahkanBaris(rows: { id: number; pengajuan_id: number; data_url: string }[]): Promise<number> {
  let pindah = 0;
  for (const r of rows) {
    const m = /^data:image\/[a-z0-9.+-]+;base64,([\s\S]+)$/i.exec(r.data_url ?? "");
    if (!m) continue;
    const buffer = Buffer.from(m[1], "base64");
    const mime = deteksiMime(buffer);
    if (!mime) continue;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const ins = await client.query<{ id: number }>(
        `INSERT INTO visitrw3_dokumen (pengajuan_id, penghuni_id, jenis, mime, ukuran, sha256, data)
         VALUES ($1, $2, 'ktp', $3, $4, $5, $6) RETURNING id`,
        [r.pengajuan_id, r.id, mime, buffer.length, crypto.createHash("sha256").update(buffer).digest("hex"), buffer],
      );
      await client.query(
        `UPDATE visitrw3_penghuni SET foto_ktp_path = $1, foto_ktp_data = NULL WHERE id = $2`,
        [`dokumen:${ins.rows[0].id}`, r.id],
      );
      await client.query("COMMIT");
      pindah++;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error(`[Visit RW3] Migrasi KTP penghuni ${r.id} gagal:`, (e as Error).message);
    } finally {
      client.release();
    }
  }
  return pindah;
}
