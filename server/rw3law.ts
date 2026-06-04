import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { rw3lawDokumen, insertRw3lawDokumenSchema, updateRw3lawDokumenSchema, RW3LAW_STATUS } from "@shared/schema";
import { z } from "zod";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import {
  RW3LAW_PERATURAN_DASAR,
  RW3LAW_PERATURAN_DASAR_SLUGS,
} from "@shared/rw3law-peraturan-dasar";
import { canonicalizeRw3lawIsi } from "@shared/rw3law-structured";
import {
  bumpRw3lawVersi,
  defaultVersiBaru,
  formatNomorPeraturan,
  formatNomorPeraturanLengkap,
  resolveTahunNomor,
  type Rw3lawRevisiRingkas,
} from "@shared/rw3law-archive";

const EXCERPT_LEN = 200;

function slugify(judul: string): string {
  const base = judul
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
  return base || "peraturan";
}

async function uniqueSlug(judul: string, excludeId?: number): Promise<string> {
  let slug = slugify(judul);
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? slug : `${slug}-${i + 1}`;
    const rows = await db.select({ id: rw3lawDokumen.id }).from(rw3lawDokumen).where(eq(rw3lawDokumen.slug, candidate));
    const taken = rows.some((r) => r.id !== excludeId);
    if (!taken) return candidate;
  }
  return `${slug}-${Date.now()}`;
}

function excerpt(isi: string): string {
  const t = isi.replace(/\s+/g, " ").trim();
  return t.length <= EXCERPT_LEN ? t : `${t.slice(0, EXCERPT_LEN)}…`;
}

export async function ensureRw3lawSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rw3law_dokumen (
      id serial PRIMARY KEY,
      judul text NOT NULL,
      slug text NOT NULL UNIQUE,
      isi text NOT NULL,
      kategori text NOT NULL DEFAULT 'umum',
      status text NOT NULL DEFAULT 'draft',
      rt_asal integer,
      versi text,
      tanggal_berlaku text,
      urutan integer NOT NULL DEFAULT 0,
      catatan_internal text,
      created_by text,
      disetujui_oleh text,
      disetujui_at timestamp,
      created_at timestamp DEFAULT now(),
      updated_at timestamp DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS rw3law_dokumen_status_idx ON rw3law_dokumen (status);
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rw3law_seed_suppressed (
      slug text PRIMARY KEY,
      suppressed_at timestamp DEFAULT now()
    );
  `);
  await pool.query(`ALTER TABLE rw3law_dokumen ADD COLUMN IF NOT EXISTS nomor_peraturan integer`);
  await pool.query(`ALTER TABLE rw3law_dokumen ADD COLUMN IF NOT EXISTS tahun_nomor integer`);
  await pool.query(`ALTER TABLE rw3law_dokumen ADD COLUMN IF NOT EXISTS revisi_dari_id integer`);
  await pool.query(`ALTER TABLE rw3law_dokumen ADD COLUMN IF NOT EXISTS dicabut_at timestamp`);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS rw3law_dokumen_tahun_nomor_idx
    ON rw3law_dokumen (tahun_nomor DESC, nomor_peraturan DESC)
  `);
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS rw3law_dokumen_nomor_tahun_uq
    ON rw3law_dokumen (tahun_nomor, nomor_peraturan)
    WHERE nomor_peraturan IS NOT NULL
      AND tahun_nomor IS NOT NULL
      AND status IN ('disetujui', 'dicabut')
  `);
}

function isUniqueNomorViolation(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /unique|duplicate key|23505|rw3law_dokumen_nomor_tahun/i.test(msg);
}

async function maxNomorPeraturanTahun(tahun: number): Promise<number> {
  const { rows } = await pool.query<{ m: number | null }>(
    `SELECT MAX(nomor_peraturan) AS m FROM rw3law_dokumen
     WHERE tahun_nomor = $1 AND nomor_peraturan IS NOT NULL
       AND status IN ('disetujui', 'dicabut')`,
    [tahun],
  );
  return rows[0]?.m ?? 0;
}

/** Nomor berikutnya (preview; belum direservasi). */
export async function peekNextNomorPeraturan(tahun: number): Promise<number> {
  return (await maxNomorPeraturanTahun(tahun)) + 1;
}

/** Alokasi nomor unik per tahun — dikunci agar tidak bentrok saat approve bersamaan. */
export async function reserveNomorPeraturan(tahun: number): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [900_000 + tahun]);
    const { rows } = await client.query<{ m: number | null }>(
      `SELECT MAX(nomor_peraturan) AS m FROM rw3law_dokumen
       WHERE tahun_nomor = $1 AND nomor_peraturan IS NOT NULL
         AND status IN ('disetujui', 'dicabut')`,
      [tahun],
    );
    const nomor = (rows[0]?.m ?? 0) + 1;
    await client.query("COMMIT");
    return nomor;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type Rw3lawPublishPreview = {
  tahun: number;
  nomorBerikut: number;
  label: string;
  singkat: string;
  versiBerikut: string;
  urutanBerikut: number;
  adalahRevisi: boolean;
};

export async function peekNextUrutanBerlaku(): Promise<number> {
  const { rows } = await pool.query<{ m: number | null }>(
    `SELECT MAX(urutan) AS m FROM rw3law_dokumen WHERE status = 'disetujui'`,
  );
  return (rows[0]?.m ?? 0) + 1;
}

async function resolveVersiOnApprove(existing: {
  revisiDariId: number | null;
  versi: string | null;
}): Promise<string> {
  if (existing.revisiDariId) {
    const v = existing.versi?.trim();
    if (v) return v;
    const parent = await selectRw3lawById(existing.revisiDariId);
    if (parent) return bumpRw3lawVersi(parent.versi, "minor");
  }
  return defaultVersiBaru();
}

async function resolveUrutanOnApprove(
  existing: { revisiDariId: number | null },
  parent: { urutan: number } | null,
): Promise<number> {
  if (existing.revisiDariId && parent != null) return parent.urutan ?? 0;
  return peekNextUrutanBerlaku();
}

/** Pratinjau metadata saat publikasi (nomor, versi, urutan — semua otomatis). */
export async function getRw3lawPublishPreview(options?: {
  tanggalBerlaku?: string | null;
  draftId?: number;
}): Promise<Rw3lawPublishPreview> {
  await ensureRw3lawReady();
  const tahun = resolveTahunNomor(options?.tanggalBerlaku, new Date());
  const nomorBerikut = await peekNextNomorPeraturan(tahun);

  let versiBerikut = defaultVersiBaru();
  let urutanBerikut = await peekNextUrutanBerlaku();
  let adalahRevisi = false;

  if (options?.draftId) {
    const draft = await selectRw3lawById(options.draftId);
    if (draft?.revisiDariId) {
      adalahRevisi = true;
      versiBerikut = (await resolveVersiOnApprove(draft)) ?? defaultVersiBaru();
      const parent = await selectRw3lawById(draft.revisiDariId);
      urutanBerikut = await resolveUrutanOnApprove(draft, parent);
    }
  }

  return {
    tahun,
    nomorBerikut,
    label:
      formatNomorPeraturanLengkap(nomorBerikut, tahun) ??
      `Nomor ${nomorBerikut} Tahun ${tahun}`,
    singkat: formatNomorPeraturan(nomorBerikut, tahun) ?? `${nomorBerikut}/${tahun}`,
    versiBerikut,
    urutanBerikut,
    adalahRevisi,
  };
}

/** @deprecated Gunakan getRw3lawPublishPreview */
export async function getRw3lawNomorPreview(tanggalBerlaku?: string | null) {
  return getRw3lawPublishPreview({ tanggalBerlaku });
}

/** Isi nomor/tahun untuk peraturan berlaku & arsip yang belum punya penomeran. */
export async function syncRw3lawNomorExisting(): Promise<{ updated: number }> {
  await ensureRw3lawReady();
  const { rows } = await pool.query<{
    id: number;
    tanggal_berlaku: string | null;
    disetujui_at: Date | null;
  }>(
    `SELECT id, tanggal_berlaku, disetujui_at FROM rw3law_dokumen
     WHERE (nomor_peraturan IS NULL OR tahun_nomor IS NULL)
       AND status IN ('disetujui', 'dicabut')
     ORDER BY COALESCE(disetujui_at, updated_at) ASC NULLS LAST, id ASC`,
  );

  let updated = 0;
  for (const row of rows) {
    const tahun = resolveTahunNomor(row.tanggal_berlaku, row.disetujui_at);
    const nomor = await reserveNomorPeraturan(tahun);
    await db
      .update(rw3lawDokumen)
      .set({ nomorPeraturan: nomor, tahunNomor: tahun, updatedAt: new Date() })
      .where(eq(rw3lawDokumen.id, row.id));
    updated++;
  }
  if (updated > 0) {
    console.log(`[RW3LAW] Penomeran otomatis: ${updated} dokumen dilengkapi`);
  }
  return { updated };
}

function revisiRingkasFromRow(row: {
  id: number;
  slug: string;
  judul: string;
  nomorPeraturan: number | null;
  tahunNomor: number | null;
}): Rw3lawRevisiRingkas {
  return {
    id: row.id,
    slug: row.slug,
    judul: row.judul,
    nomorPeraturan: row.nomorPeraturan,
    tahunNomor: row.tahunNomor,
    label:
      formatNomorPeraturanLengkap(row.nomorPeraturan, row.tahunNomor) ??
      row.judul.slice(0, 80),
  };
}

async function getRw3lawSuppressedSeedSlugs(): Promise<Set<string>> {
  const { rows } = await pool.query<{ slug: string }>(
    "SELECT slug FROM rw3law_seed_suppressed",
  );
  return new Set(rows.map((r) => r.slug));
}

/** Mencegah seed startup mengisi ulang peraturan yang sudah dihapus permanen admin. */
async function suppressRw3lawSeedSlug(slug: string) {
  await pool.query(
    `INSERT INTO rw3law_seed_suppressed (slug) VALUES ($1) ON CONFLICT (slug) DO NOTHING`,
    [slug],
  );
}

let rw3lawReady = false;
let rw3lawReadyPromise: Promise<void> | null = null;

export function isMissingRw3lawTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /does not exist|relation.*rw3law|undefined_table|42P01/i.test(msg);
}

function isMissingRw3lawArchiveColumnError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /revisi_dari_id|nomor_peraturan|tahun_nomor|dicabut_at|42703|column.*does not exist/i.test(
    msg,
  );
}

/** Pastikan tabel ada dan dapat di-query (cache per proses). */
export async function ensureRw3lawReady(force = false): Promise<void> {
  await ensureRw3lawSchema();

  if (rw3lawReady && !force) return;

  if (!rw3lawReadyPromise || force) {
    rw3lawReadyPromise = (async () => {
      await pool.query("SELECT 1 FROM rw3law_dokumen LIMIT 1");
      rw3lawReady = true;
    })();
  }

  try {
    await rw3lawReadyPromise;
  } catch (error) {
    rw3lawReady = false;
    rw3lawReadyPromise = null;
    throw error;
  }
}

export async function withRw3lawDb<T>(fn: () => Promise<T>): Promise<T> {
  try {
    await ensureRw3lawReady();
    return await fn();
  } catch (error) {
    if (isMissingRw3lawTableError(error) || isMissingRw3lawArchiveColumnError(error)) {
      rw3lawReady = false;
      rw3lawReadyPromise = null;
      await ensureRw3lawSchema();
      await ensureRw3lawReady(true);
      return await fn();
    }
    throw error;
  }
}

export type Rw3lawConnectionStatus = {
  ok: boolean;
  tableExists: boolean;
  total: number;
  publicCount: number;
  message?: string;
};

export async function checkRw3lawConnection(): Promise<Rw3lawConnectionStatus> {
  try {
    await ensureRw3lawReady();
    const { rows } = await pool.query<{ status: string; n: string }>(`
      SELECT status, COUNT(*)::text AS n
      FROM rw3law_dokumen
      GROUP BY status
    `);
    let draft = 0;
    let disetujui = 0;
    let dicabut = 0;
    for (const r of rows) {
      const n = parseInt(r.n, 10) || 0;
      if (r.status === "draft") draft = n;
      else if (r.status === "disetujui") disetujui = n;
      else if (r.status === "dicabut") dicabut = n;
    }
    const total = draft + disetujui + dicabut;
    return { ok: true, tableExists: true, total, publicCount: disetujui };
  } catch (error) {
    return {
      ok: false,
      tableExists: !isMissingRw3lawTableError(error),
      total: 0,
      publicCount: 0,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Ringkasan koneksi DB untuk panel admin. */
export async function getRw3lawOverview() {
  return withRw3lawDb(async () => {
    const rows = await db
      .select({ status: rw3lawDokumen.status })
      .from(rw3lawDokumen);
    const counts = { draft: 0, disetujui: 0, dicabut: 0, total: rows.length };
    for (const r of rows) {
      if (r.status === "draft") counts.draft++;
      else if (r.status === "disetujui") counts.disetujui++;
      else if (r.status === "dicabut") counts.dicabut++;
    }
    return { ready: true, counts };
  });
}

type Rw3lawPublicRow = {
  id: number;
  judul: string;
  slug: string;
  kategori: string;
  versi: string | null;
  tanggalBerlaku: string | null;
  rtAsal: number | null;
  disetujuiAt: Date | null;
  nomorPeraturan: number | null;
  tahunNomor: number | null;
  revisiDariId: number | null;
  isi_preview: string;
};

export async function listRw3lawPublic() {
  await ensureRw3lawReady();
  const previewLen = EXCERPT_LEN + 80;
  const { rows } = await pool.query<Rw3lawPublicRow>(
    `SELECT id, judul, slug, kategori, versi, tanggal_berlaku AS "tanggalBerlaku",
            rt_asal AS "rtAsal", disetujui_at AS "disetujuiAt",
            nomor_peraturan AS "nomorPeraturan", tahun_nomor AS "tahunNomor",
            revisi_dari_id AS "revisiDariId",
            LEFT(isi, $1) AS isi_preview
     FROM rw3law_dokumen
     WHERE status = 'disetujui'
     ORDER BY tahun_nomor DESC NULLS LAST, nomor_peraturan DESC NULLS LAST,
              urutan ASC, disetujui_at DESC NULLS LAST`,
    [previewLen],
  );
  const revisiCache = new Map<number, Rw3lawRevisiRingkas>();
  const out = [];
  for (const r of rows) {
    let revisiDari: Rw3lawRevisiRingkas | null = null;
    if (r.revisiDariId) {
      if (!revisiCache.has(r.revisiDariId)) {
        const meta = await getRw3lawRevisiMeta(r.revisiDariId);
        if (meta) revisiCache.set(r.revisiDariId, meta);
      }
      revisiDari = revisiCache.get(r.revisiDariId) ?? null;
    }
    out.push({
      id: r.id,
      judul: r.judul,
      slug: r.slug,
      kategori: r.kategori,
      versi: r.versi,
      tanggalBerlaku: r.tanggalBerlaku,
      rtAsal: r.rtAsal,
      cuplikan: excerpt(r.isi_preview ?? ""),
      disetujuiAt: r.disetujuiAt,
      nomorPeraturan: r.nomorPeraturan,
      tahunNomor: r.tahunNomor,
      revisiDari,
    });
  }
  return out;
}

export async function listRw3lawDicabutPublic() {
  await ensureRw3lawReady();
  const previewLen = EXCERPT_LEN + 80;
  const { rows } = await pool.query<
    Rw3lawPublicRow & { dicabutAt: Date | null; updatedAt: Date | null }
  >(
    `SELECT id, judul, slug, kategori, versi, tanggal_berlaku AS "tanggalBerlaku",
            rt_asal AS "rtAsal", disetujui_at AS "disetujuiAt",
            nomor_peraturan AS "nomorPeraturan", tahun_nomor AS "tahunNomor",
            revisi_dari_id AS "revisiDariId",
            dicabut_at AS "dicabutAt", updated_at AS "updatedAt",
            LEFT(isi, $1) AS isi_preview
     FROM rw3law_dokumen
     WHERE status = 'dicabut'
     ORDER BY tahun_nomor DESC NULLS LAST, nomor_peraturan DESC NULLS LAST,
              COALESCE(dicabut_at, updated_at) DESC NULLS LAST`,
    [previewLen],
  );
  const revisiCache = new Map<number, Rw3lawRevisiRingkas>();
  const out = [];
  for (const r of rows) {
    let revisiDari: Rw3lawRevisiRingkas | null = null;
    if (r.revisiDariId) {
      if (!revisiCache.has(r.revisiDariId)) {
        const meta = await getRw3lawRevisiMeta(r.revisiDariId);
        if (meta) revisiCache.set(r.revisiDariId, meta);
      }
      revisiDari = revisiCache.get(r.revisiDariId) ?? null;
    }
    out.push({
      id: r.id,
      judul: r.judul,
      slug: r.slug,
      kategori: r.kategori,
      versi: r.versi,
      tanggalBerlaku: r.tanggalBerlaku,
      rtAsal: r.rtAsal,
      cuplikan: excerpt(r.isi_preview ?? ""),
      disetujuiAt: r.disetujuiAt,
      nomorPeraturan: r.nomorPeraturan,
      tahunNomor: r.tahunNomor,
      revisiDari,
      dicabutAt: r.dicabutAt ?? r.updatedAt,
    });
  }
  return out;
}

export async function getRw3lawBySlugPublic(slug: string) {
  return withRw3lawDb(async () => {
    const [row] = await db
      .select()
      .from(rw3lawDokumen)
      .where(eq(rw3lawDokumen.slug, slug.toLowerCase()));
    if (!row || (row.status !== "disetujui" && row.status !== "dicabut")) return null;
    return row;
  });
}

const STATUS_SORT_ORDER: Record<string, number> = {
  disetujui: 0,
  draft: 1,
  dicabut: 2,
};

function sortRw3lawAdminRows<T extends { status: string; urutan: number; updatedAt: Date | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    const sa = STATUS_SORT_ORDER[a.status] ?? 9;
    const sb = STATUS_SORT_ORDER[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    if (a.status === "disetujui" && b.status === "disetujui") {
      return (a.urutan ?? 0) - (b.urutan ?? 0);
    }
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });
}

export async function listRw3lawAdmin(statusFilter?: string) {
  return withRw3lawDb(async () => {
    if (statusFilter && (RW3LAW_STATUS as readonly string[]).includes(statusFilter)) {
      const rows = await db
        .select()
        .from(rw3lawDokumen)
        .where(eq(rw3lawDokumen.status, statusFilter))
        .orderBy(desc(rw3lawDokumen.updatedAt));
      return statusFilter === "disetujui"
        ? [...rows].sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0))
        : rows;
    }
    const rows = await db.select().from(rw3lawDokumen);
    return sortRw3lawAdminRows(rows);
  });
}

async function selectRw3lawById(id: number) {
  const [row] = await db.select().from(rw3lawDokumen).where(eq(rw3lawDokumen.id, id));
  return row ?? null;
}

export async function getRw3lawById(id: number) {
  return withRw3lawDb(() => selectRw3lawById(id));
}

export async function getRw3lawRevisiMeta(
  revisiDariId: number | null | undefined,
): Promise<Rw3lawRevisiRingkas | null> {
  if (!revisiDariId) return null;
  const parent = await selectRw3lawById(revisiDariId);
  if (!parent) return null;
  return revisiRingkasFromRow(parent);
}

export async function createRw3lawRevisiDraft(id: number, adminUsername: string) {
  return withRw3lawDb(async () => {
    const parent = await selectRw3lawById(id);
    if (!parent) throw new Error("Dokumen tidak ditemukan");
    if (parent.status !== "disetujui") {
      throw new Error("Hanya peraturan yang masih berlaku yang dapat direvisi.");
    }

    const pending = await db
      .select({ id: rw3lawDokumen.id })
      .from(rw3lawDokumen)
      .where(
        and(eq(rw3lawDokumen.revisiDariId, id), eq(rw3lawDokumen.status, "draft")),
      );
    if (pending.length > 0) {
      const existingDraft = await selectRw3lawById(pending[0].id);
      if (existingDraft) return existingDraft;
    }

    const versi = bumpRw3lawVersi(parent.versi, "minor");
    const nomorLabel = formatNomorPeraturanLengkap(parent.nomorPeraturan, parent.tahunNomor);
    const catatan = nomorLabel
      ? `Revisi mengubah ${nomorLabel}.`
      : `Revisi mengubah peraturan #${parent.id}.`;

    const slug = await uniqueSlug(`${parent.slug}-revisi-v${versi.replace(".", "-")}`);
    const [row] = await db
      .insert(rw3lawDokumen)
      .values({
        judul: parent.judul,
        slug,
        isi: parent.isi,
        kategori: parent.kategori,
        status: "draft",
        rtAsal: parent.rtAsal,
        versi,
        revisiDariId: parent.id,
        tanggalBerlaku: parent.tanggalBerlaku,
        urutan: 0,
        catatanInternal: catatan,
        createdBy: adminUsername,
        updatedAt: new Date(),
      })
      .returning();
    return row;
  });
}

export async function createRw3lawDraft(
  input: z.infer<typeof insertRw3lawDokumenSchema>,
  adminUsername: string,
) {
  return withRw3lawDb(async () => {
  const parsed = insertRw3lawDokumenSchema.parse(input);
  if (parsed.rtAsal != null && !(ACTIVE_RT_NUMBERS as readonly number[]).includes(parsed.rtAsal)) {
    throw new Error("RT asal tidak valid");
  }
  const slug = await uniqueSlug(parsed.judul);
  const [row] = await db
    .insert(rw3lawDokumen)
    .values({
      judul: parsed.judul.trim(),
      slug,
      isi: parsed.isi.trim(),
      kategori: parsed.kategori,
      status: "draft",
      rtAsal: parsed.rtAsal ?? null,
      versi: null,
      tanggalBerlaku: parsed.tanggalBerlaku?.trim() || null,
      urutan: 0,
      catatanInternal: parsed.catatanInternal?.trim() || null,
      createdBy: parsed.createdBy?.trim() || adminUsername,
      updatedAt: new Date(),
    })
    .returning();
  return row;
  });
}

export async function updateRw3lawDraft(
  id: number,
  input: z.infer<typeof updateRw3lawDokumenSchema>,
) {
  return withRw3lawDb(async () => {
  const existing = await selectRw3lawById(id);
  if (!existing) throw new Error("Dokumen tidak ditemukan");
  if (existing.status === "disetujui") {
    throw new Error("Peraturan yang masih berlaku tidak dapat diedit. Cabut terlebih dahulu atau buat draft baru.");
  }
  if (existing.status === "dicabut") {
    throw new Error("Peraturan yang sudah dicabut tidak dapat diedit.");
  }
  if (existing.status !== "draft") {
    throw new Error("Hanya draft yang dapat diedit.");
  }

  const parsed = updateRw3lawDokumenSchema.parse(input);
  if (parsed.rtAsal != null && !(ACTIVE_RT_NUMBERS as readonly number[]).includes(parsed.rtAsal)) {
    throw new Error("RT asal tidak valid");
  }

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.judul != null) {
    patch.judul = parsed.judul.trim();
    patch.slug = await uniqueSlug(parsed.judul, id);
  }
  if (parsed.isi != null) patch.isi = parsed.isi.trim();
  if (parsed.kategori != null) patch.kategori = parsed.kategori;
  if (parsed.rtAsal !== undefined) patch.rtAsal = parsed.rtAsal;
  if (parsed.tanggalBerlaku !== undefined) patch.tanggalBerlaku = parsed.tanggalBerlaku?.trim() || null;
  if (parsed.catatanInternal !== undefined) patch.catatanInternal = parsed.catatanInternal?.trim() || null;

  const [row] = await db.update(rw3lawDokumen).set(patch).where(eq(rw3lawDokumen.id, id)).returning();
  return row;
  });
}

export async function approveRw3law(id: number, adminUsername: string) {
  return withRw3lawDb(async () => {
  const existing = await selectRw3lawById(id);
  if (!existing) throw new Error("Dokumen tidak ditemukan");
  if (existing.status !== "draft") throw new Error("Hanya draft yang dapat disetujui");

  const now = new Date();
  const tahun = resolveTahunNomor(existing.tanggalBerlaku, now);
  const versi = await resolveVersiOnApprove(existing);

  const parent = existing.revisiDariId
    ? await selectRw3lawById(existing.revisiDariId)
    : null;
  if (parent?.status === "disetujui") {
    await db
      .update(rw3lawDokumen)
      .set({ status: "dicabut", dicabutAt: now, updatedAt: now })
      .where(eq(rw3lawDokumen.id, parent.id));
  }
  const urutan = await resolveUrutanOnApprove(existing, parent);

  for (let attempt = 0; attempt < 8; attempt++) {
    const nomor = await reserveNomorPeraturan(tahun);
    try {
      const [row] = await db
        .update(rw3lawDokumen)
        .set({
          status: "disetujui",
          disetujuiOleh: adminUsername,
          disetujuiAt: now,
          updatedAt: now,
          nomorPeraturan: nomor,
          tahunNomor: tahun,
          versi,
          urutan,
        })
        .where(eq(rw3lawDokumen.id, id))
        .returning();
      return row;
    } catch (error) {
      if (isUniqueNomorViolation(error) && attempt < 7) continue;
      throw error;
    }
  }
  throw new Error("Gagal menetapkan nomor peraturan unik. Silakan coba lagi.");
  });
}

export async function cabutRw3law(id: number) {
  return withRw3lawDb(async () => {
  const existing = await selectRw3lawById(id);
  if (!existing) throw new Error("Dokumen tidak ditemukan");
  if (existing.status === "draft") {
    throw new Error("Draft belum dipublikasikan. Hapus draft jika tidak diperlukan.");
  }
  if (existing.status === "dicabut") throw new Error("Peraturan ini sudah dicabut");
  if (existing.status !== "disetujui") throw new Error("Hanya peraturan berlaku yang dapat dicabut");

  const now = new Date();
  const [row] = await db
    .update(rw3lawDokumen)
    .set({ status: "dicabut", dicabutAt: now, updatedAt: now })
    .where(eq(rw3lawDokumen.id, id))
    .returning();
  return row;
  });
}

export async function deleteRw3law(id: number) {
  return withRw3lawDb(async () => {
    const existing = await selectRw3lawById(id);
    if (!existing) throw new Error("Dokumen tidak ditemukan");

    if (existing.status === "disetujui") {
      throw new Error("Peraturan masih berlaku. Cabut terlebih dahulu, baru dapat dihapus permanen.");
    }
    if (existing.status !== "draft" && existing.status !== "dicabut") {
      throw new Error("Status dokumen tidak mendukung penghapusan");
    }

    await db.delete(rw3lawDokumen).where(eq(rw3lawDokumen.id, id));
    if (RW3LAW_PERATURAN_DASAR_SLUGS.has(existing.slug)) {
      await suppressRw3lawSeedSlug(existing.slug);
    }
    return { id, slug: existing.slug, status: existing.status };
  });
}

/** Mengisi & menyelaraskan peraturan dasar RW (idempoten per slug, isi format terstruktur). */
export async function seedRw3lawPeraturanDasar(options?: {
  createdBy?: string;
  includeDraftSample?: boolean;
  allowProduction?: boolean;
}) {
  if (process.env.SEED_RW3LAW_DEMO === "0") {
    return {
      inserted: 0,
      updated: 0,
      skipped: RW3LAW_PERATURAN_DASAR.length,
      skippedProduction: true,
    };
  }

  await ensureRw3lawReady();

  const actor = options?.createdBy ?? "seed-rw3law-dasar";
  const suppressed = await getRw3lawSuppressedSeedSlugs();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of RW3LAW_PERATURAN_DASAR) {
    if (suppressed.has(p.slug)) {
      skipped++;
      continue;
    }
    const isi = canonicalizeRw3lawIsi(p.isi);
    const [existing] = await db
      .select({
        id: rw3lawDokumen.id,
        status: rw3lawDokumen.status,
        isi: rw3lawDokumen.isi,
      })
      .from(rw3lawDokumen)
      .where(eq(rw3lawDokumen.slug, p.slug))
      .limit(1);

    if (existing) {
      const patch: Record<string, unknown> = {
        judul: p.judul,
        isi,
        kategori: p.kategori,
        rtAsal: p.rtAsal ?? null,
        versi: p.versi,
        tanggalBerlaku: p.tanggalBerlaku,
        urutan: p.urutan,
        updatedAt: new Date(),
      };
      if (existing.status !== "disetujui") {
        patch.status = "disetujui";
        patch.disetujuiOleh = actor;
        patch.disetujuiAt = new Date();
      }
      if (existing.isi === isi && existing.status === "disetujui") {
        skipped++;
        continue;
      }
      await db
        .update(rw3lawDokumen)
        .set(patch as typeof rw3lawDokumen.$inferInsert)
        .where(eq(rw3lawDokumen.id, existing.id));
      updated++;
      continue;
    }

    await db.insert(rw3lawDokumen).values({
      judul: p.judul,
      slug: p.slug,
      isi,
      kategori: p.kategori,
      status: "disetujui",
      rtAsal: p.rtAsal ?? null,
      versi: p.versi,
      tanggalBerlaku: p.tanggalBerlaku,
      urutan: p.urutan,
      createdBy: actor,
      disetujuiOleh: actor,
      disetujuiAt: new Date(),
      updatedAt: new Date(),
    });
    inserted++;
  }

  if (options?.includeDraftSample) {
    const draftSlug = "rancangan-sampah-terpilah-draft";
    const [draftExists] = await db
      .select({ id: rw3lawDokumen.id })
      .from(rw3lawDokumen)
      .where(eq(rw3lawDokumen.slug, draftSlug))
      .limit(1);
    if (!draftExists) {
      await db.insert(rw3lawDokumen).values({
        judul: "Rancangan: Pengelolaan Sampah Terpilah per RT (draft)",
        slug: draftSlug,
        isi: "Draft internal untuk musyawarah RT — pengelolaan sampah terpilah dan jadwal pengangkutan per RT 01–04.",
        kategori: "lingkungan",
        status: "draft",
        rtAsal: null,
        versi: "0.1",
        catatanInternal: "Contoh draft admin — belum disetujui pengurus RW",
        urutan: 99,
        createdBy: actor,
        updatedAt: new Date(),
      });
      inserted++;
    }
  }

  return { inserted, updated, skipped };
}

/** Perbarui isi dokumen peraturan dasar yang sudah ada di DB ke format terstruktur terbaru. */
export async function resyncRw3lawPeraturanDasarIsi() {
  if (process.env.SEED_RW3LAW_DEMO === "0") {
    return { updated: 0 };
  }

  await ensureRw3lawReady();
  const actor = "sync-rw3law-format";
  let updated = 0;

  const rows = await db
    .select({
      id: rw3lawDokumen.id,
      slug: rw3lawDokumen.slug,
      isi: rw3lawDokumen.isi,
    })
    .from(rw3lawDokumen)
    .where(eq(rw3lawDokumen.status, "disetujui"));

  for (const row of rows) {
    if (RW3LAW_PERATURAN_DASAR_SLUGS.has(row.slug)) continue;

    const targetIsi = canonicalizeRw3lawIsi(row.isi);
    if (targetIsi === row.isi) continue;

    await db
      .update(rw3lawDokumen)
      .set({ isi: targetIsi, updatedAt: new Date() })
      .where(eq(rw3lawDokumen.id, row.id));
    updated++;
  }

  if (updated > 0) {
    console.log(`[RW3LAW] Sinkron format isi: ${updated} dokumen diperbarui (${actor})`);
  }

  return { updated };
}

export async function seedRw3lawDevIfNeeded() {
  const existing = await withRw3lawDb(async () => {
    return db.select({ id: rw3lawDokumen.id }).from(rw3lawDokumen).limit(1);
  }).catch(() => [] as { id: number }[]);

  const isEmpty = existing.length === 0;
  const result = await seedRw3lawPeraturanDasar({ includeDraftSample: isEmpty });
  const resync = await resyncRw3lawPeraturanDasarIsi();

  if (result.inserted > 0 || result.updated > 0 || resync.updated > 0) {
    console.log(
      `[RW3LAW] Peraturan dasar: ${result.inserted} baru, ${result.updated} diperbarui seed, ${resync.updated} disinkronkan format`,
    );
  } else if (result.skipped > 0) {
    console.log(`[RW3LAW] Peraturan dasar: ${result.skipped} sudah sesuai format terbaru`);
  }
}
