import { db, pool } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { rw3lawDokumen, insertRw3lawDokumenSchema, updateRw3lawDokumenSchema, RW3LAW_STATUS } from "@shared/schema";
import { z } from "zod";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { RW3LAW_PERATURAN_DASAR } from "@shared/rw3law-peraturan-dasar";

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
}

let rw3lawReady = false;
let rw3lawReadyPromise: Promise<void> | null = null;

export function isMissingRw3lawTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /does not exist|relation.*rw3law|undefined_table|42P01/i.test(msg);
}

/** Pastikan tabel ada dan dapat di-query (cache per proses). */
export async function ensureRw3lawReady(force = false): Promise<void> {
  if (rw3lawReady && !force) return;

  if (!rw3lawReadyPromise || force) {
    rw3lawReadyPromise = (async () => {
      await ensureRw3lawSchema();
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
    if (isMissingRw3lawTableError(error)) {
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
  isi_preview: string;
};

export async function listRw3lawPublic() {
  await ensureRw3lawReady();
  const previewLen = EXCERPT_LEN + 80;
  const { rows } = await pool.query<Rw3lawPublicRow>(
    `SELECT id, judul, slug, kategori, versi, tanggal_berlaku AS "tanggalBerlaku",
            rt_asal AS "rtAsal", disetujui_at AS "disetujuiAt",
            LEFT(isi, $1) AS isi_preview
     FROM rw3law_dokumen
     WHERE status = 'disetujui'
     ORDER BY urutan ASC, disetujui_at DESC NULLS LAST`,
    [previewLen],
  );
  return rows.map((r) => ({
    id: r.id,
    judul: r.judul,
    slug: r.slug,
    kategori: r.kategori,
    versi: r.versi,
    tanggalBerlaku: r.tanggalBerlaku,
    rtAsal: r.rtAsal,
    cuplikan: excerpt(r.isi_preview ?? ""),
    disetujuiAt: r.disetujuiAt,
  }));
}

export async function getRw3lawBySlugPublic(slug: string) {
  return withRw3lawDb(async () => {
    const [row] = await db
      .select()
      .from(rw3lawDokumen)
      .where(and(eq(rw3lawDokumen.slug, slug.toLowerCase()), eq(rw3lawDokumen.status, "disetujui")));
    return row ?? null;
  });
}

export async function listRw3lawAdmin(statusFilter?: string) {
  return withRw3lawDb(async () => {
    if (statusFilter && (RW3LAW_STATUS as readonly string[]).includes(statusFilter)) {
      return db
        .select()
        .from(rw3lawDokumen)
        .where(eq(rw3lawDokumen.status, statusFilter))
        .orderBy(desc(rw3lawDokumen.updatedAt));
    }
    return db.select().from(rw3lawDokumen).orderBy(desc(rw3lawDokumen.updatedAt));
  });
}

async function selectRw3lawById(id: number) {
  const [row] = await db.select().from(rw3lawDokumen).where(eq(rw3lawDokumen.id, id));
  return row ?? null;
}

export async function getRw3lawById(id: number) {
  return withRw3lawDb(() => selectRw3lawById(id));
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
      versi: parsed.versi?.trim() || null,
      tanggalBerlaku: parsed.tanggalBerlaku?.trim() || null,
      urutan: parsed.urutan ?? 0,
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
  if (existing.status !== "draft") throw new Error("Hanya draft yang dapat diedit");

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
  if (parsed.versi !== undefined) patch.versi = parsed.versi?.trim() || null;
  if (parsed.tanggalBerlaku !== undefined) patch.tanggalBerlaku = parsed.tanggalBerlaku?.trim() || null;
  if (parsed.urutan != null) patch.urutan = parsed.urutan;
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

  const [row] = await db
    .update(rw3lawDokumen)
    .set({
      status: "disetujui",
      disetujuiOleh: adminUsername,
      disetujuiAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(rw3lawDokumen.id, id))
    .returning();
  return row;
  });
}

export async function cabutRw3law(id: number) {
  return withRw3lawDb(async () => {
  const existing = await selectRw3lawById(id);
  if (!existing) throw new Error("Dokumen tidak ditemukan");
  if (existing.status !== "disetujui") throw new Error("Hanya peraturan berlaku yang dapat dicabut");

  const [row] = await db
    .update(rw3lawDokumen)
    .set({ status: "dicabut", updatedAt: new Date() })
    .where(eq(rw3lawDokumen.id, id))
    .returning();
  return row;
  });
}

/** Mengisi peraturan dasar RW (idempoten per slug). */
export async function seedRw3lawPeraturanDasar(options?: {
  createdBy?: string;
  includeDraftSample?: boolean;
  allowProduction?: boolean;
}) {
  if (process.env.SEED_RW3LAW_DEMO === "0") {
    return { inserted: 0, skipped: RW3LAW_PERATURAN_DASAR.length, skippedProduction: true };
  }

  await ensureRw3lawReady();

  const actor = options?.createdBy ?? "seed-rw3law-dasar";
  let inserted = 0;
  let skipped = 0;

  for (const p of RW3LAW_PERATURAN_DASAR) {
    const [existing] = await db
      .select({ id: rw3lawDokumen.id })
      .from(rw3lawDokumen)
      .where(eq(rw3lawDokumen.slug, p.slug))
      .limit(1);
    if (existing) {
      skipped++;
      continue;
    }
    await db.insert(rw3lawDokumen).values({
      judul: p.judul,
      slug: p.slug,
      isi: p.isi,
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
        isi: "Draft internal untuk musyawarah RT — pengelolaan sampah terpilah dan jadwal pengangkutan per RT 01–07.",
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

  return { inserted, skipped };
}

export async function seedRw3lawDevIfNeeded() {
  const existing = await withRw3lawDb(async () => {
    return db.select({ id: rw3lawDokumen.id }).from(rw3lawDokumen).limit(1);
  }).catch(() => [] as { id: number }[]);

  const isEmpty = existing.length === 0;
  const result = await seedRw3lawPeraturanDasar({ includeDraftSample: isEmpty });

  if (result.inserted > 0) {
    console.log(
      `[RW3LAW] Peraturan dasar: ${result.inserted} dokumen baru, ${result.skipped} slug sudah ada`,
    );
  }
}
