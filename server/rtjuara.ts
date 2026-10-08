/**
 * Layer service RT JUARA — "RW3 Muncul, RT-nya JUARA".
 * Quest dibuat admin RW, bukti dikirim ketua RT, poin masuk setelah diverifikasi.
 */
import bcrypt from "bcryptjs";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, pool } from "./db";
import {
  rtjuaraQuest,
  rtjuaraSubmission,
  rtjuaraSubmissionFoto,
  rtjuaraRtAkun,
  rtjuaraJuara,
  insertRtjuaraQuestSchema,
  patchRtjuaraQuestSchema,
  insertRtjuaraSubmissionSchema,
  reviewRtjuaraSubmissionSchema,
  upsertRtjuaraAkunSchema,
  type RtjuaraQuest,
  type RtjuaraSubmission,
  type RtjuaraJuara,
} from "@shared/schema";
import {
  RTJUARA_BACKDATE_HARI,
  RTJUARA_MAX_FOTO,
  RTJUARA_RT_NUMBERS,
  bulanKey as toBulanKey,
  hariKey,
  isRtjuaraPeriode,
  isRtjuaraRt,
  periodeKey,
  questBerlakuPada,
  tanggalTerawalLapor,
  type RtjuaraPeriode,
  type RtjuaraStatus,
} from "@shared/rtjuara";

const BCRYPT_ROUNDS = 10;

/** Perkiraan ukuran byte sebuah data URL base64. */
function base64Bytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((payload.length * 3) / 4);
}

/** Batas aman agar body JSON (20 MB) tidak jebol walau client gagal mengompresi. */
const MAX_FOTO_BYTES = 2 * 1024 * 1024;


export function isMissingRtjuaraTableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /does not exist|relation.*rtjuara|undefined_table/i.test(msg);
}

export async function ensureRtjuaraSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rtjuara_quest (
      id serial PRIMARY KEY,
      judul text NOT NULL,
      deskripsi text NOT NULL,
      periode text NOT NULL,
      poin integer NOT NULL DEFAULT 10,
      instruksi_bukti text,
      min_foto integer NOT NULL DEFAULT 1,
      wajib_jumlah_peserta boolean NOT NULL DEFAULT false,
      berlaku_mulai text,
      berlaku_sampai text,
      aktif boolean NOT NULL DEFAULT true,
      dibuat_oleh text,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_rtjuara_quest_periode ON rtjuara_quest (periode);
    CREATE INDEX IF NOT EXISTS idx_rtjuara_quest_aktif ON rtjuara_quest (aktif);

    CREATE TABLE IF NOT EXISTS rtjuara_submission (
      id serial PRIMARY KEY,
      quest_id integer NOT NULL REFERENCES rtjuara_quest (id) ON DELETE CASCADE,
      rt integer NOT NULL,
      periode_key text NOT NULL,
      bulan_key text NOT NULL,
      judul_kegiatan text NOT NULL,
      tanggal_kegiatan text NOT NULL,
      lokasi text NOT NULL,
      jumlah_peserta integer,
      deskripsi text NOT NULL,
      status text NOT NULL DEFAULT 'menunggu',
      poin_potensi integer NOT NULL DEFAULT 0,
      poin_diberikan integer NOT NULL DEFAULT 0,
      catatan_admin text,
      reviewed_at timestamp,
      reviewed_by text,
      dikirim_oleh text,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_rt ON rtjuara_submission (rt);
    CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_status ON rtjuara_submission (status);
    CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_bulan ON rtjuara_submission (bulan_key);
    CREATE INDEX IF NOT EXISTS idx_rtjuara_submission_quest ON rtjuara_submission (quest_id);
    CREATE UNIQUE INDEX IF NOT EXISTS rtjuara_submission_klaim_unique
      ON rtjuara_submission (quest_id, rt, periode_key)
      WHERE status <> 'ditolak';

    CREATE TABLE IF NOT EXISTS rtjuara_submission_foto (
      id serial PRIMARY KEY,
      submission_id integer NOT NULL REFERENCES rtjuara_submission (id) ON DELETE CASCADE,
      foto_data text NOT NULL,
      urutan integer NOT NULL DEFAULT 0,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_rtjuara_foto_submission ON rtjuara_submission_foto (submission_id);

    CREATE TABLE IF NOT EXISTS rtjuara_rt_akun (
      id serial PRIMARY KEY,
      rt integer NOT NULL UNIQUE,
      nama_ketua text NOT NULL,
      nomor_whatsapp text,
      pin_hash text NOT NULL,
      aktif boolean NOT NULL DEFAULT true,
      last_login_at timestamp,
      created_at timestamp DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS rtjuara_juara (
      id serial PRIMARY KEY,
      bulan_key text NOT NULL,
      rt integer NOT NULL,
      peringkat integer NOT NULL,
      total_poin integer NOT NULL DEFAULT 0,
      jumlah_quest integer NOT NULL DEFAULT 0,
      catatan text,
      diumumkan_at timestamp DEFAULT now(),
      diumumkan_oleh text
    );
    CREATE UNIQUE INDEX IF NOT EXISTS rtjuara_juara_bulan_rt_unique ON rtjuara_juara (bulan_key, rt);
    CREATE INDEX IF NOT EXISTS idx_rtjuara_juara_bulan ON rtjuara_juara (bulan_key);
  `);
}

// ===================== QUEST =====================

export async function listQuestAdmin(filter?: { periode?: string | null; aktif?: boolean | null }) {
  const conds = [];
  if (filter?.periode && isRtjuaraPeriode(filter.periode)) {
    conds.push(eq(rtjuaraQuest.periode, filter.periode));
  }
  if (filter?.aktif != null) {
    conds.push(eq(rtjuaraQuest.aktif, filter.aktif));
  }
  const rows = await db
    .select()
    .from(rtjuaraQuest)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(rtjuaraQuest.aktif), desc(rtjuaraQuest.createdAt));
  return rows;
}

export async function getQuestById(id: number): Promise<RtjuaraQuest | undefined> {
  const [row] = await db.select().from(rtjuaraQuest).where(eq(rtjuaraQuest.id, id));
  return row;
}

export async function createQuest(input: unknown, dibuatOleh: string): Promise<RtjuaraQuest> {
  const parsed = insertRtjuaraQuestSchema.parse(input);
  const [row] = await db
    .insert(rtjuaraQuest)
    .values({
      judul: parsed.judul.trim(),
      deskripsi: parsed.deskripsi.trim(),
      periode: parsed.periode,
      poin: parsed.poin,
      instruksiBukti: parsed.instruksiBukti?.trim() || null,
      minFoto: parsed.minFoto ?? 1,
      wajibJumlahPeserta: parsed.wajibJumlahPeserta ?? false,
      berlakuMulai: parsed.berlakuMulai || null,
      berlakuSampai: parsed.berlakuSampai || null,
      aktif: parsed.aktif ?? true,
      dibuatOleh,
    })
    .returning();
  return row;
}

export async function updateQuest(id: number, input: unknown): Promise<RtjuaraQuest> {
  const parsed = patchRtjuaraQuestSchema.parse(input);
  const patch: Record<string, unknown> = {};
  if (parsed.judul !== undefined) patch.judul = parsed.judul.trim();
  if (parsed.deskripsi !== undefined) patch.deskripsi = parsed.deskripsi.trim();
  if (parsed.periode !== undefined) patch.periode = parsed.periode;
  if (parsed.poin !== undefined) patch.poin = parsed.poin;
  if (parsed.instruksiBukti !== undefined) patch.instruksiBukti = parsed.instruksiBukti?.trim() || null;
  if (parsed.minFoto !== undefined) patch.minFoto = parsed.minFoto;
  if (parsed.wajibJumlahPeserta !== undefined) patch.wajibJumlahPeserta = parsed.wajibJumlahPeserta;
  if (parsed.berlakuMulai !== undefined) patch.berlakuMulai = parsed.berlakuMulai || null;
  if (parsed.berlakuSampai !== undefined) patch.berlakuSampai = parsed.berlakuSampai || null;
  if (parsed.aktif !== undefined) patch.aktif = parsed.aktif;

  if (Object.keys(patch).length === 0) {
    const existing = await getQuestById(id);
    if (!existing) throw new Error("Quest tidak ditemukan");
    return existing;
  }

  const [row] = await db.update(rtjuaraQuest).set(patch).where(eq(rtjuaraQuest.id, id)).returning();
  if (!row) throw new Error("Quest tidak ditemukan");
  if (row.berlakuMulai && row.berlakuSampai && row.berlakuSampai < row.berlakuMulai) {
    throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai");
  }
  return row;
}

export async function deleteQuest(id: number): Promise<boolean> {
  const [dipakai] = await db
    .select({ jumlah: sql<number>`count(*)::int` })
    .from(rtjuaraSubmission)
    .where(eq(rtjuaraSubmission.questId, id));
  if ((dipakai?.jumlah ?? 0) > 0) {
    throw new Error(
      "Quest sudah punya bukti dari RT. Nonaktifkan quest ini saja supaya riwayat poin tetap utuh.",
    );
  }
  const deleted = await db.delete(rtjuaraQuest).where(eq(rtjuaraQuest.id, id)).returning({ id: rtjuaraQuest.id });
  return deleted.length > 0;
}

export type QuestUntukRt = RtjuaraQuest & {
  periodeKey: string;
  /** Bukti RT ini pada periode berjalan, bila sudah ada. */
  klaim: {
    id: number;
    status: RtjuaraStatus;
    poinDiberikan: number;
    catatanAdmin: string | null;
    createdAt: Date | null;
  } | null;
  bisaKirim: boolean;
};

/** Quest aktif yang berlaku hari ini, lengkap dengan status klaim RT pada periode berjalan. */
export async function listQuestForRt(rt: number, acuan: Date = new Date()): Promise<QuestUntukRt[]> {
  const hariIni = hariKey(acuan);
  const semua = await db
    .select()
    .from(rtjuaraQuest)
    .where(eq(rtjuaraQuest.aktif, true))
    .orderBy(desc(rtjuaraQuest.poin), asc(rtjuaraQuest.judul));

  const berlaku = semua.filter((q) => questBerlakuPada(q, hariIni));
  if (berlaku.length === 0) return [];

  const klaimRows = await db
    .select({
      id: rtjuaraSubmission.id,
      questId: rtjuaraSubmission.questId,
      periodeKey: rtjuaraSubmission.periodeKey,
      status: rtjuaraSubmission.status,
      poinDiberikan: rtjuaraSubmission.poinDiberikan,
      catatanAdmin: rtjuaraSubmission.catatanAdmin,
      createdAt: rtjuaraSubmission.createdAt,
    })
    .from(rtjuaraSubmission)
    .where(
      and(
        eq(rtjuaraSubmission.rt, rt),
        inArray(rtjuaraSubmission.questId, berlaku.map((q) => q.id)),
      ),
    )
    .orderBy(desc(rtjuaraSubmission.createdAt));

  return berlaku.map((quest) => {
    const key = periodeKey(quest.periode as RtjuaraPeriode, acuan);
    const klaimPeriode = klaimRows.filter((k) => k.questId === quest.id && k.periodeKey === key);
    // Bukti yang masih berlaku (menunggu / disetujui) mengunci klaim periode ini.
    const aktifKlaim = klaimPeriode.find((k) => k.status !== "ditolak") ?? klaimPeriode[0] ?? null;
    return {
      ...quest,
      periodeKey: key,
      klaim: aktifKlaim
        ? {
            id: aktifKlaim.id,
            status: aktifKlaim.status as RtjuaraStatus,
            poinDiberikan: aktifKlaim.poinDiberikan,
            catatanAdmin: aktifKlaim.catatanAdmin,
            createdAt: aktifKlaim.createdAt,
          }
        : null,
      bisaKirim: !aktifKlaim || aktifKlaim.status === "ditolak",
    };
  });
}

// ===================== SUBMISSION =====================

export type SubmissionView = RtjuaraSubmission & {
  questJudul: string;
  questPeriode: string;
  questPoin: number;
  fotoIds: number[];
};

async function attachFotoIds<T extends { id: number }>(rows: T[]): Promise<(T & { fotoIds: number[] })[]> {
  if (rows.length === 0) return [];
  const fotos = await db
    .select({ id: rtjuaraSubmissionFoto.id, submissionId: rtjuaraSubmissionFoto.submissionId })
    .from(rtjuaraSubmissionFoto)
    .where(inArray(rtjuaraSubmissionFoto.submissionId, rows.map((r) => r.id)))
    .orderBy(asc(rtjuaraSubmissionFoto.urutan), asc(rtjuaraSubmissionFoto.id));

  const bySubmission = new Map<number, number[]>();
  for (const f of fotos) {
    const list = bySubmission.get(f.submissionId) ?? [];
    list.push(f.id);
    bySubmission.set(f.submissionId, list);
  }
  return rows.map((r) => ({ ...r, fotoIds: bySubmission.get(r.id) ?? [] }));
}

/** Kolom submission tanpa base64 — foto diambil terpisah lewat endpoint by-id. */
const submissionSelect = {
  id: rtjuaraSubmission.id,
  questId: rtjuaraSubmission.questId,
  rt: rtjuaraSubmission.rt,
  periodeKey: rtjuaraSubmission.periodeKey,
  bulanKey: rtjuaraSubmission.bulanKey,
  judulKegiatan: rtjuaraSubmission.judulKegiatan,
  tanggalKegiatan: rtjuaraSubmission.tanggalKegiatan,
  lokasi: rtjuaraSubmission.lokasi,
  jumlahPeserta: rtjuaraSubmission.jumlahPeserta,
  deskripsi: rtjuaraSubmission.deskripsi,
  status: rtjuaraSubmission.status,
  poinPotensi: rtjuaraSubmission.poinPotensi,
  poinDiberikan: rtjuaraSubmission.poinDiberikan,
  catatanAdmin: rtjuaraSubmission.catatanAdmin,
  reviewedAt: rtjuaraSubmission.reviewedAt,
  reviewedBy: rtjuaraSubmission.reviewedBy,
  dikirimOleh: rtjuaraSubmission.dikirimOleh,
  createdAt: rtjuaraSubmission.createdAt,
  questJudul: rtjuaraQuest.judul,
  questPeriode: rtjuaraQuest.periode,
  questPoin: rtjuaraQuest.poin,
};

export async function listSubmission(filter?: {
  rt?: number | null;
  status?: string | null;
  bulan?: string | null;
  questId?: number | null;
  limit?: number;
}): Promise<SubmissionView[]> {
  const conds = [];
  if (filter?.rt != null && isRtjuaraRt(filter.rt)) conds.push(eq(rtjuaraSubmission.rt, filter.rt));
  if (filter?.status) conds.push(eq(rtjuaraSubmission.status, filter.status));
  if (filter?.bulan) conds.push(eq(rtjuaraSubmission.bulanKey, filter.bulan));
  if (filter?.questId != null) conds.push(eq(rtjuaraSubmission.questId, filter.questId));

  const rows = await db
    .select(submissionSelect)
    .from(rtjuaraSubmission)
    .innerJoin(rtjuaraQuest, eq(rtjuaraQuest.id, rtjuaraSubmission.questId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(rtjuaraSubmission.createdAt))
    .limit(Math.min(filter?.limit ?? 200, 500));

  return attachFotoIds(rows) as Promise<SubmissionView[]>;
}

export async function getSubmissionDetail(id: number): Promise<SubmissionView | undefined> {
  const [row] = await db
    .select(submissionSelect)
    .from(rtjuaraSubmission)
    .innerJoin(rtjuaraQuest, eq(rtjuaraQuest.id, rtjuaraSubmission.questId))
    .where(eq(rtjuaraSubmission.id, id));
  if (!row) return undefined;
  const [withFoto] = await attachFotoIds([row]);
  return withFoto as SubmissionView;
}

export async function createSubmission(rt: number, input: unknown): Promise<SubmissionView> {
  if (!isRtjuaraRt(rt)) throw new Error("RT tidak valid");
  const parsed = insertRtjuaraSubmissionSchema.parse(input);

  const quest = await getQuestById(parsed.questId);
  if (!quest) throw new Error("Quest tidak ditemukan");
  if (!quest.aktif) throw new Error("Quest ini sudah tidak aktif");

  if (parsed.tanggalKegiatan > hariKey()) {
    throw new Error("Tanggal kegiatan tidak boleh di masa depan");
  }
  if (parsed.tanggalKegiatan < tanggalTerawalLapor()) {
    throw new Error(
      `Kegiatan hanya bisa dilaporkan maksimal ${RTJUARA_BACKDATE_HARI} hari setelah pelaksanaan`,
    );
  }
  if (!questBerlakuPada(quest, parsed.tanggalKegiatan)) {
    throw new Error("Quest tidak berlaku pada tanggal kegiatan tersebut");
  }

  const bulan = toBulanKey(parsed.tanggalKegiatan);
  const sudahDiumumkan = await getJuara(bulan);
  if (sudahDiumumkan.length > 0) {
    throw new Error(`Juara ${bulan} sudah diumumkan — bukti untuk bulan itu tidak bisa ditambah lagi`);
  }

  // Periode klaim mengikuti tanggal kegiatan, bukan tanggal kirim.
  const key = periodeKey(quest.periode as RtjuaraPeriode, parsed.tanggalKegiatan);

  if (parsed.foto.length < quest.minFoto) {
    throw new Error(`Quest ini butuh minimal ${quest.minFoto} foto dokumentasi`);
  }
  if (parsed.foto.length > RTJUARA_MAX_FOTO) {
    throw new Error(`Maksimal ${RTJUARA_MAX_FOTO} foto dokumentasi`);
  }
  for (const foto of parsed.foto) {
    if (base64Bytes(foto) > MAX_FOTO_BYTES) {
      throw new Error("Ukuran foto terlalu besar. Coba unggah ulang fotonya.");
    }
  }
  if (quest.wajibJumlahPeserta && (parsed.jumlahPeserta == null || parsed.jumlahPeserta < 1)) {
    throw new Error("Quest ini wajib mencantumkan jumlah peserta");
  }

  const existing = await db
    .select({ id: rtjuaraSubmission.id, status: rtjuaraSubmission.status })
    .from(rtjuaraSubmission)
    .where(
      and(
        eq(rtjuaraSubmission.questId, quest.id),
        eq(rtjuaraSubmission.rt, rt),
        eq(rtjuaraSubmission.periodeKey, key),
      ),
    );
  if (existing.some((e) => e.status !== "ditolak")) {
    throw new Error("Quest ini sudah dikirim RT kamu untuk periode berjalan");
  }

  const submissionId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(rtjuaraSubmission)
      .values({
        questId: quest.id,
        rt,
        periodeKey: key,
        bulanKey: toBulanKey(parsed.tanggalKegiatan),
        judulKegiatan: parsed.judulKegiatan.trim(),
        tanggalKegiatan: parsed.tanggalKegiatan,
        lokasi: parsed.lokasi.trim(),
        jumlahPeserta: parsed.jumlahPeserta ?? null,
        deskripsi: parsed.deskripsi.trim(),
        status: "menunggu",
        poinPotensi: quest.poin,
        poinDiberikan: 0,
        dikirimOleh: parsed.dikirimOleh?.trim() || null,
      })
      .returning({ id: rtjuaraSubmission.id });

    await tx.insert(rtjuaraSubmissionFoto).values(
      parsed.foto.map((fotoData, urutan) => ({ submissionId: row.id, fotoData, urutan })),
    );
    return row.id;
  });

  const detail = await getSubmissionDetail(submissionId);
  if (!detail) throw new Error("Gagal memuat bukti yang baru dikirim");
  return detail;
}

export async function reviewSubmission(
  id: number,
  reviewedBy: string,
  input: unknown,
): Promise<SubmissionView> {
  const parsed = reviewRtjuaraSubmissionSchema.parse(input);
  const current = await getSubmissionDetail(id);
  if (!current) throw new Error("Bukti tidak ditemukan");

  const [row] = await db
    .update(rtjuaraSubmission)
    .set({
      status: parsed.status,
      poinDiberikan: parsed.status === "disetujui" ? current.poinPotensi : 0,
      catatanAdmin: parsed.catatanAdmin?.trim() || null,
      reviewedAt: new Date(),
      reviewedBy,
    })
    .where(eq(rtjuaraSubmission.id, id))
    .returning({ id: rtjuaraSubmission.id });
  if (!row) throw new Error("Bukti tidak ditemukan");

  const detail = await getSubmissionDetail(id);
  if (!detail) throw new Error("Gagal memuat bukti setelah verifikasi");
  return detail;
}

export async function deleteSubmission(id: number): Promise<boolean> {
  const deleted = await db
    .delete(rtjuaraSubmission)
    .where(eq(rtjuaraSubmission.id, id))
    .returning({ id: rtjuaraSubmission.id });
  return deleted.length > 0;
}

/** Foto tunggal untuk endpoint by-id (satu-satunya tempat base64 dibaca). */
export async function getFoto(fotoId: number) {
  const [row] = await db
    .select({
      id: rtjuaraSubmissionFoto.id,
      fotoData: rtjuaraSubmissionFoto.fotoData,
      submissionId: rtjuaraSubmissionFoto.submissionId,
      rt: rtjuaraSubmission.rt,
      status: rtjuaraSubmission.status,
    })
    .from(rtjuaraSubmissionFoto)
    .innerJoin(rtjuaraSubmission, eq(rtjuaraSubmission.id, rtjuaraSubmissionFoto.submissionId))
    .where(eq(rtjuaraSubmissionFoto.id, fotoId));
  return row;
}

// ===================== LEADERBOARD & JUARA =====================

export type LeaderboardRow = {
  rt: number;
  totalPoin: number;
  jumlahQuest: number;
  menunggu: number;
  peringkat: number;
};

/** Papan peringkat satu bulan. RT tanpa poin tetap muncul dengan nilai 0. */
export async function getLeaderboard(bulan: string = toBulanKey()): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      rt: rtjuaraSubmission.rt,
      totalPoin: sql<number>`coalesce(sum(case when ${rtjuaraSubmission.status} = 'disetujui' then ${rtjuaraSubmission.poinDiberikan} else 0 end), 0)::int`,
      jumlahQuest: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'disetujui')::int`,
      menunggu: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'menunggu')::int`,
    })
    .from(rtjuaraSubmission)
    .where(eq(rtjuaraSubmission.bulanKey, bulan))
    .groupBy(rtjuaraSubmission.rt);

  const byRt = new Map(rows.map((r) => [r.rt, r]));
  const lengkap = RTJUARA_RT_NUMBERS.map((rt) => ({
    rt: rt as number,
    totalPoin: byRt.get(rt)?.totalPoin ?? 0,
    jumlahQuest: byRt.get(rt)?.jumlahQuest ?? 0,
    menunggu: byRt.get(rt)?.menunggu ?? 0,
  }));

  lengkap.sort((a, b) => b.totalPoin - a.totalPoin || b.jumlahQuest - a.jumlahQuest || a.rt - b.rt);

  // Poin sama berbagi peringkat yang sama (peringkat kompetisi standar).
  let peringkat = 0;
  let sebelumnya: { totalPoin: number; jumlahQuest: number } | null = null;
  return lengkap.map((row, index) => {
    if (!sebelumnya || sebelumnya.totalPoin !== row.totalPoin || sebelumnya.jumlahQuest !== row.jumlahQuest) {
      peringkat = index + 1;
      sebelumnya = { totalPoin: row.totalPoin, jumlahQuest: row.jumlahQuest };
    }
    return { ...row, peringkat };
  });
}

export async function getJuara(bulan: string): Promise<RtjuaraJuara[]> {
  return db
    .select()
    .from(rtjuaraJuara)
    .where(eq(rtjuaraJuara.bulanKey, bulan))
    .orderBy(asc(rtjuaraJuara.peringkat));
}

/** Bulan-bulan yang sudah pernah diumumkan, terbaru dulu. */
export async function listBulanJuara(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ bulanKey: rtjuaraJuara.bulanKey })
    .from(rtjuaraJuara)
    .orderBy(desc(rtjuaraJuara.bulanKey));
  return rows.map((r) => r.bulanKey);
}

/** Bekukan papan peringkat satu bulan menjadi pengumuman RT Juara. */
export async function tetapkanJuara(
  bulan: string,
  diumumkanOleh: string,
  catatan?: string | null,
): Promise<RtjuaraJuara[]> {
  const papan = await getLeaderboard(bulan);
  if (papan.every((r) => r.totalPoin === 0)) {
    throw new Error("Belum ada poin disetujui pada bulan ini — juara belum bisa diumumkan");
  }
  const menunggu = papan.reduce((total, r) => total + r.menunggu, 0);
  if (menunggu > 0) {
    throw new Error(`Masih ada ${menunggu} bukti menunggu verifikasi pada bulan ini. Selesaikan dulu.`);
  }

  await db.transaction(async (tx) => {
    await tx.delete(rtjuaraJuara).where(eq(rtjuaraJuara.bulanKey, bulan));
    await tx.insert(rtjuaraJuara).values(
      papan.map((r) => ({
        bulanKey: bulan,
        rt: r.rt,
        peringkat: r.peringkat,
        totalPoin: r.totalPoin,
        jumlahQuest: r.jumlahQuest,
        catatan: catatan?.trim() || null,
        diumumkanAt: new Date(),
        diumumkanOleh,
      })),
    );
  });

  return getJuara(bulan);
}

export async function batalkanJuara(bulan: string): Promise<boolean> {
  const deleted = await db
    .delete(rtjuaraJuara)
    .where(eq(rtjuaraJuara.bulanKey, bulan))
    .returning({ id: rtjuaraJuara.id });
  return deleted.length > 0;
}

/** Dokumentasi kegiatan yang sudah disetujui — untuk galeri publik. */
export async function getGaleriPublik(bulan?: string | null, limit = 24) {
  const conds = [eq(rtjuaraSubmission.status, "disetujui")];
  if (bulan) conds.push(eq(rtjuaraSubmission.bulanKey, bulan));

  const rows = await db
    .select({
      id: rtjuaraSubmission.id,
      rt: rtjuaraSubmission.rt,
      judulKegiatan: rtjuaraSubmission.judulKegiatan,
      tanggalKegiatan: rtjuaraSubmission.tanggalKegiatan,
      lokasi: rtjuaraSubmission.lokasi,
      poinDiberikan: rtjuaraSubmission.poinDiberikan,
      questJudul: rtjuaraQuest.judul,
      questPeriode: rtjuaraQuest.periode,
    })
    .from(rtjuaraSubmission)
    .innerJoin(rtjuaraQuest, eq(rtjuaraQuest.id, rtjuaraSubmission.questId))
    .where(and(...conds))
    .orderBy(desc(rtjuaraSubmission.tanggalKegiatan), desc(rtjuaraSubmission.id))
    .limit(Math.min(limit, 60));

  const withFoto = await attachFotoIds(rows);
  return withFoto.map((r) => ({ ...r, fotoId: r.fotoIds[0] ?? null }));
}

// ===================== RINGKASAN =====================

export async function getRingkasanRt(rt: number, bulan: string = toBulanKey()) {
  const [agg] = await db
    .select({
      totalPoin: sql<number>`coalesce(sum(case when ${rtjuaraSubmission.status} = 'disetujui' then ${rtjuaraSubmission.poinDiberikan} else 0 end), 0)::int`,
      disetujui: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'disetujui')::int`,
      menunggu: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'menunggu')::int`,
      ditolak: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'ditolak')::int`,
    })
    .from(rtjuaraSubmission)
    .where(and(eq(rtjuaraSubmission.rt, rt), eq(rtjuaraSubmission.bulanKey, bulan)));

  const papan = await getLeaderboard(bulan);
  const posisi = papan.find((p) => p.rt === rt);

  return {
    rt,
    bulan,
    totalPoin: agg?.totalPoin ?? 0,
    disetujui: agg?.disetujui ?? 0,
    menunggu: agg?.menunggu ?? 0,
    ditolak: agg?.ditolak ?? 0,
    peringkat: posisi?.peringkat ?? papan.length,
    leaderboard: papan,
  };
}

export async function getAdminDashboard(bulan: string = toBulanKey()) {
  const [questAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      aktif: sql<number>`count(*) filter (where ${rtjuaraQuest.aktif})::int`,
    })
    .from(rtjuaraQuest);

  const [submissionAgg] = await db
    .select({
      total: sql<number>`count(*)::int`,
      menunggu: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'menunggu')::int`,
      disetujui: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'disetujui')::int`,
      ditolak: sql<number>`count(*) filter (where ${rtjuaraSubmission.status} = 'ditolak')::int`,
      totalPoin: sql<number>`coalesce(sum(case when ${rtjuaraSubmission.status} = 'disetujui' then ${rtjuaraSubmission.poinDiberikan} else 0 end), 0)::int`,
    })
    .from(rtjuaraSubmission)
    .where(eq(rtjuaraSubmission.bulanKey, bulan));

  const [menungguSemuaBulan] = await db
    .select({ jumlah: sql<number>`count(*)::int` })
    .from(rtjuaraSubmission)
    .where(eq(rtjuaraSubmission.status, "menunggu"));

  const leaderboard = await getLeaderboard(bulan);
  const juara = await getJuara(bulan);
  const akun = await listAkun();

  return {
    bulan,
    quest: { total: questAgg?.total ?? 0, aktif: questAgg?.aktif ?? 0 },
    bukti: {
      total: submissionAgg?.total ?? 0,
      menunggu: submissionAgg?.menunggu ?? 0,
      disetujui: submissionAgg?.disetujui ?? 0,
      ditolak: submissionAgg?.ditolak ?? 0,
      menungguSemuaBulan: menungguSemuaBulan?.jumlah ?? 0,
    },
    totalPoin: submissionAgg?.totalPoin ?? 0,
    leaderboard,
    juara,
    akunAktif: akun.filter((a) => a.aktif).length,
    akunTotal: akun.length,
  };
}

// ===================== AKUN KETUA RT =====================

export type AkunView = {
  rt: number;
  namaKetua: string;
  nomorWhatsapp: string | null;
  aktif: boolean;
  lastLoginAt: Date | null;
  sudahDiatur: boolean;
};

export async function listAkun(): Promise<AkunView[]> {
  const rows = await db.select().from(rtjuaraRtAkun).orderBy(asc(rtjuaraRtAkun.rt));
  const byRt = new Map(rows.map((r) => [r.rt, r]));
  return RTJUARA_RT_NUMBERS.map((rt) => {
    const row = byRt.get(rt);
    return {
      rt: rt as number,
      namaKetua: row?.namaKetua ?? "",
      nomorWhatsapp: row?.nomorWhatsapp ?? null,
      aktif: row?.aktif ?? false,
      lastLoginAt: row?.lastLoginAt ?? null,
      sudahDiatur: !!row,
    };
  });
}

export async function upsertAkun(input: unknown): Promise<AkunView> {
  const parsed = upsertRtjuaraAkunSchema.parse(input);
  const [existing] = await db.select().from(rtjuaraRtAkun).where(eq(rtjuaraRtAkun.rt, parsed.rt));

  if (!existing && !parsed.pin) {
    throw new Error("PIN 6 digit wajib diisi saat membuat akun ketua RT baru");
  }

  const pinHash = parsed.pin ? await bcrypt.hash(parsed.pin, BCRYPT_ROUNDS) : existing!.pinHash;

  if (existing) {
    await db
      .update(rtjuaraRtAkun)
      .set({
        namaKetua: parsed.namaKetua.trim(),
        nomorWhatsapp: parsed.nomorWhatsapp?.trim() || null,
        pinHash,
        aktif: parsed.aktif ?? existing.aktif,
      })
      .where(eq(rtjuaraRtAkun.rt, parsed.rt));
  } else {
    await db.insert(rtjuaraRtAkun).values({
      rt: parsed.rt,
      namaKetua: parsed.namaKetua.trim(),
      nomorWhatsapp: parsed.nomorWhatsapp?.trim() || null,
      pinHash,
      aktif: parsed.aktif ?? true,
    });
  }

  const semua = await listAkun();
  return semua.find((a) => a.rt === parsed.rt)!;
}

export async function hapusAkun(rt: number): Promise<boolean> {
  const deleted = await db
    .delete(rtjuaraRtAkun)
    .where(eq(rtjuaraRtAkun.rt, rt))
    .returning({ id: rtjuaraRtAkun.id });
  return deleted.length > 0;
}

/** Verifikasi PIN ketua RT. Mengembalikan null bila RT/PIN salah atau akun nonaktif. */
export async function verifikasiLogin(rt: number, pin: string): Promise<{ rt: number; namaKetua: string } | null> {
  const [akun] = await db.select().from(rtjuaraRtAkun).where(eq(rtjuaraRtAkun.rt, rt));
  if (!akun || !akun.aktif) return null;
  const cocok = await bcrypt.compare(pin, akun.pinHash);
  if (!cocok) return null;
  await db.update(rtjuaraRtAkun).set({ lastLoginAt: new Date() }).where(eq(rtjuaraRtAkun.rt, rt));
  return { rt: akun.rt, namaKetua: akun.namaKetua };
}

export async function getAkunRingkas(rt: number): Promise<{ rt: number; namaKetua: string } | null> {
  const [akun] = await db
    .select({ rt: rtjuaraRtAkun.rt, namaKetua: rtjuaraRtAkun.namaKetua, aktif: rtjuaraRtAkun.aktif })
    .from(rtjuaraRtAkun)
    .where(eq(rtjuaraRtAkun.rt, rt));
  if (!akun || !akun.aktif) return null;
  return { rt: akun.rt, namaKetua: akun.namaKetua };
}

/** Daftar RT yang sudah punya akun aktif — dipakai halaman login (tanpa membocorkan PIN). */
export async function listRtLogin(): Promise<{ rt: number; namaKetua: string }[]> {
  const rows = await db
    .select({ rt: rtjuaraRtAkun.rt, namaKetua: rtjuaraRtAkun.namaKetua })
    .from(rtjuaraRtAkun)
    .where(eq(rtjuaraRtAkun.aktif, true))
    .orderBy(asc(rtjuaraRtAkun.rt));
  return rows;
}
