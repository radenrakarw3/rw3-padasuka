import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import {
  propagandaCampaign,
  propagandaGelombang,
  propagandaAntrian,
  propagandaCooldown,
  propagandaLogKirim,
  type PropagandaCampaign,
  type PropagandaAntrian,
  type PropagandaGelombang,
} from "@shared/schema";
import type { HelixPlan } from "@shared/propaganda-helix";
import { personalizePropagandaMessage } from "@shared/propaganda-filters";

export async function ensurePropagandaSchema(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS propaganda_campaign (
      id serial PRIMARY KEY,
      judul text NOT NULL,
      pesan_template text NOT NULL,
      filter_json text NOT NULL DEFAULT '{}',
      profil_distribusi text NOT NULL DEFAULT 'standar',
      formula_versi text NOT NULL DEFAULT 'helix-v2',
      distribusi_plan_json text,
      helix_seed text,
      fairness_score integer,
      abaikan_cooldown boolean NOT NULL DEFAULT false,
      status text NOT NULL DEFAULT 'draft',
      jumlah_target integer NOT NULL DEFAULT 0,
      jumlah_terkirim integer NOT NULL DEFAULT 0,
      jumlah_gagal integer NOT NULL DEFAULT 0,
      jumlah_dilewati integer NOT NULL DEFAULT 0,
      jumlah_menunggu integer NOT NULL DEFAULT 0,
      jumlah_gelombang integer NOT NULL DEFAULT 0,
      mulai_kirim timestamp,
      estimasi_selesai timestamp,
      selesai_kirim timestamp,
      created_by text,
      created_at timestamp DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS propaganda_gelombang (
      id serial PRIMARY KEY,
      campaign_id integer NOT NULL REFERENCES propaganda_campaign(id) ON DELETE CASCADE,
      nomor_gelombang integer NOT NULL,
      jumlah_slot integer NOT NULL DEFAULT 0,
      jumlah_terkirim integer NOT NULL DEFAULT 0,
      jumlah_gagal integer NOT NULL DEFAULT 0,
      jadwal_mulai timestamp NOT NULL,
      jadwal_selesai timestamp NOT NULL,
      istirahat_sesudah_ms integer NOT NULL DEFAULT 0,
      per_rt_json text NOT NULL DEFAULT '{}',
      status text NOT NULL DEFAULT 'menunggu',
      created_at timestamp DEFAULT now(),
      UNIQUE (campaign_id, nomor_gelombang)
    );
    CREATE TABLE IF NOT EXISTS propaganda_antrian (
      id serial PRIMARY KEY,
      campaign_id integer NOT NULL REFERENCES propaganda_campaign(id) ON DELETE CASCADE,
      gelombang_id integer REFERENCES propaganda_gelombang(id) ON DELETE SET NULL,
      warga_id integer,
      kk_id integer,
      nama text NOT NULL,
      nomor_whatsapp text NOT NULL,
      rt integer,
      pesan text NOT NULL,
      jadwal_kirim timestamp NOT NULL,
      urutan_global integer NOT NULL DEFAULT 0,
      urutan_dalam_gelombang integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'menunggu',
      attempt_count integer NOT NULL DEFAULT 0,
      last_error text,
      claimed_at timestamp,
      sent_at timestamp,
      created_at timestamp DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS propaganda_antrian_campaign_phone_idx
      ON propaganda_antrian (campaign_id, nomor_whatsapp);
    CREATE INDEX IF NOT EXISTS idx_propaganda_antrian_dispatch ON propaganda_antrian (status, jadwal_kirim);
    CREATE INDEX IF NOT EXISTS idx_propaganda_antrian_campaign ON propaganda_antrian (campaign_id);
    CREATE INDEX IF NOT EXISTS idx_propaganda_antrian_gelombang ON propaganda_antrian (gelombang_id, status);
    CREATE TABLE IF NOT EXISTS propaganda_log_kirim (
      id serial PRIMARY KEY,
      antrian_id integer REFERENCES propaganda_antrian(id) ON DELETE SET NULL,
      campaign_id integer NOT NULL REFERENCES propaganda_campaign(id) ON DELETE CASCADE,
      gelombang_id integer REFERENCES propaganda_gelombang(id) ON DELETE SET NULL,
      nomor_whatsapp text NOT NULL,
      status text NOT NULL,
      response_json text,
      created_at timestamp DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_propaganda_log_campaign ON propaganda_log_kirim (campaign_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS propaganda_cooldown (
      nomor_whatsapp text PRIMARY KEY,
      last_campaign_id integer REFERENCES propaganda_campaign(id) ON DELETE SET NULL,
      last_sent_at timestamp NOT NULL DEFAULT now(),
      total_terkirim integer NOT NULL DEFAULT 1
    );
  `);
}

export async function listPropagandaCampaigns(): Promise<PropagandaCampaign[]> {
  return db.select().from(propagandaCampaign).orderBy(desc(propagandaCampaign.createdAt));
}

export async function getPropagandaCampaign(id: number): Promise<PropagandaCampaign | undefined> {
  const [row] = await db.select().from(propagandaCampaign).where(eq(propagandaCampaign.id, id));
  return row;
}

export type CreateCampaignBundle = {
  judul: string;
  pesanTemplate: string;
  filterJson: string;
  profilDistribusi: string;
  abaikanCooldown: boolean;
  createdBy: string;
  plan: HelixPlan;
};

/** Transaksi atomik: kampanye + gelombang + antrian sekaligus. */
export async function createCampaignBundle(bundle: CreateCampaignBundle): Promise<PropagandaCampaign> {
  return db.transaction(async (tx) => {
    const [campaign] = await tx
      .insert(propagandaCampaign)
      .values({
        judul: bundle.judul,
        pesanTemplate: bundle.pesanTemplate,
        filterJson: bundle.filterJson,
        profilDistribusi: bundle.profilDistribusi,
        formulaVersi: bundle.plan.formulaVersi,
        distribusiPlanJson: JSON.stringify(bundle.plan),
        helixSeed: bundle.plan.seed,
        fairnessScore: bundle.plan.fairnessScore,
        abaikanCooldown: bundle.abaikanCooldown,
        status: "berjalan",
        jumlahTarget: bundle.plan.totalPenerima,
        jumlahMenunggu: bundle.plan.totalPenerima,
        jumlahGelombang: bundle.plan.jumlahGelombang,
        mulaiKirim: bundle.plan.mulai,
        estimasiSelesai: bundle.plan.selesai,
        createdBy: bundle.createdBy,
      })
      .returning();

    const gelombangIdByNomor = new Map<number, number>();
    for (const wave of bundle.plan.gelombang) {
      const [g] = await tx
        .insert(propagandaGelombang)
        .values({
          campaignId: campaign.id,
          nomorGelombang: wave.nomor,
          jumlahSlot: wave.jumlahSlot,
          jadwalMulai: wave.jadwalMulai,
          jadwalSelesai: wave.jadwalSelesai,
          istirahatSesudahMs: wave.istirahatSesudahMs,
          perRtJson: JSON.stringify(wave.perRt),
          status: "menunggu",
        })
        .returning();
      gelombangIdByNomor.set(wave.nomor, g.id);
    }

    const antrianRows = bundle.plan.slots.map((slot) => ({
      campaignId: campaign.id,
      gelombangId: gelombangIdByNomor.get(slot.gelombangNomor) ?? null,
      wargaId: slot.wargaId,
      kkId: slot.kkId,
      nama: slot.nama,
      nomorWhatsapp: slot.nomorWhatsapp,
      rt: slot.rt,
      pesan: personalizePropagandaMessage(bundle.pesanTemplate, slot),
      jadwalKirim: slot.jadwalKirim,
      urutanGlobal: slot.urutanGlobal,
      urutanDalamGelombang: slot.urutanDalamGelombang,
      status: "menunggu" as const,
    }));

    const chunk = 150;
    for (let i = 0; i < antrianRows.length; i += chunk) {
      await tx.insert(propagandaAntrian).values(antrianRows.slice(i, i + chunk));
    }

    return campaign;
  });
}

export async function refreshPropagandaCampaignCounts(campaignId: number): Promise<PropagandaCampaign | undefined> {
  const rows = await db
    .select({ status: propagandaAntrian.status, total: count() })
    .from(propagandaAntrian)
    .where(eq(propagandaAntrian.campaignId, campaignId))
    .groupBy(propagandaAntrian.status);

  const totals = new Map(rows.map((r) => [r.status, Number(r.total)]));
  const terkirim = totals.get("terkirim") ?? 0;
  const gagal = totals.get("gagal") ?? 0;
  const dilewati = (totals.get("dilewati") ?? 0) + (totals.get("dibatalkan") ?? 0);
  const menunggu = (totals.get("menunggu") ?? 0) + (totals.get("mengirim") ?? 0);
  const target = rows.reduce((s, r) => s + Number(r.total), 0);

  const campaign = await getPropagandaCampaign(campaignId);
  if (!campaign || campaign.status === "dibatalkan") return campaign;

  let status: string | undefined;
  if (menunggu === 0 && target > 0) {
    status = gagal > 0 && terkirim > 0 ? "selesai" : gagal > 0 && terkirim === 0 ? "gagal" : "selesai";
  }

  const [updated] = await db
    .update(propagandaCampaign)
    .set({
      jumlahTarget: target,
      jumlahTerkirim: terkirim,
      jumlahGagal: gagal,
      jumlahDilewati: dilewati,
      jumlahMenunggu: menunggu,
      ...(status ? { status, selesaiKirim: new Date() } : {}),
    })
    .where(eq(propagandaCampaign.id, campaignId))
    .returning();

  await refreshGelombangCounts(campaignId);
  return updated;
}

async function refreshGelombangCounts(campaignId: number): Promise<void> {
  const gelombangList = await db
    .select()
    .from(propagandaGelombang)
    .where(eq(propagandaGelombang.campaignId, campaignId));

  for (const g of gelombangList) {
    const stats = await db
      .select({ status: propagandaAntrian.status, total: count() })
      .from(propagandaAntrian)
      .where(eq(propagandaAntrian.gelombangId, g.id))
      .groupBy(propagandaAntrian.status);

    const map = new Map(stats.map((s) => [s.status, Number(s.total)]));
    const terkirim = map.get("terkirim") ?? 0;
    const gagal = map.get("gagal") ?? 0;
    const pending = (map.get("menunggu") ?? 0) + (map.get("mengirim") ?? 0);
    let status = g.status;
    if (pending === 0 && g.jumlahSlot > 0) status = gagal > 0 && terkirim > 0 ? "selesai" : terkirim > 0 ? "selesai" : "gagal";
    else if (terkirim > 0 || pending < g.jumlahSlot) status = "berjalan";

    await db
      .update(propagandaGelombang)
      .set({ jumlahTerkirim: terkirim, jumlahGagal: gagal, status })
      .where(eq(propagandaGelombang.id, g.id));
  }
}

export async function updatePropagandaCampaign(
  id: number,
  data: Partial<typeof propagandaCampaign.$inferInsert>,
): Promise<PropagandaCampaign | undefined> {
  const [row] = await db.update(propagandaCampaign).set(data).where(eq(propagandaCampaign.id, id)).returning();
  return row;
}

export async function getCooldownMap(withinDays: number): Promise<Map<string, Date>> {
  const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      phone: propagandaCooldown.nomorWhatsapp,
      lastSent: propagandaCooldown.lastSentAt,
    })
    .from(propagandaCooldown)
    .where(sql`${propagandaCooldown.lastSentAt} >= ${since}`);
  return new Map(rows.map((r) => [r.phone, r.lastSent!]));
}

export async function getCooldownPhones(withinDays: number): Promise<Set<string>> {
  const map = await getCooldownMap(withinDays);
  return new Set(map.keys());
}

export async function upsertPropagandaCooldown(phone: string, campaignId: number): Promise<void> {
  await db
    .insert(propagandaCooldown)
    .values({ nomorWhatsapp: phone, lastCampaignId: campaignId, lastSentAt: new Date(), totalTerkirim: 1 })
    .onConflictDoUpdate({
      target: propagandaCooldown.nomorWhatsapp,
      set: {
        lastCampaignId: campaignId,
        lastSentAt: new Date(),
        totalTerkirim: sql`${propagandaCooldown.totalTerkirim} + 1`,
      },
    });
}

/** Klaim atomik antrian — FOR UPDATE SKIP LOCKED mencegah race antar worker. */
export async function claimNextDueAntrian(): Promise<PropagandaAntrian | undefined> {
  const result = await db.execute(sql`
    UPDATE propaganda_antrian AS a
    SET status = 'mengirim', claimed_at = NOW()
    FROM propaganda_campaign AS c
    WHERE a.campaign_id = c.id
      AND c.status = 'berjalan'
      AND a.status = 'menunggu'
      AND a.jadwal_kirim <= NOW()
      AND a.id = (
        SELECT a2.id FROM propaganda_antrian AS a2
        INNER JOIN propaganda_campaign AS c2 ON a2.campaign_id = c2.id
        WHERE c2.status = 'berjalan'
          AND a2.status = 'menunggu'
          AND a2.jadwal_kirim <= NOW()
        ORDER BY a2.jadwal_kirim ASC, a2.urutan_global ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
    RETURNING a.*;
  `);

  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) return undefined;

  return {
    id: Number(row.id),
    campaignId: Number(row.campaign_id),
    gelombangId: row.gelombang_id != null ? Number(row.gelombang_id) : null,
    wargaId: row.warga_id != null ? Number(row.warga_id) : null,
    kkId: row.kk_id != null ? Number(row.kk_id) : null,
    nama: String(row.nama),
    nomorWhatsapp: String(row.nomor_whatsapp),
    rt: row.rt != null ? Number(row.rt) : null,
    pesan: String(row.pesan),
    jadwalKirim: new Date(String(row.jadwal_kirim)),
    urutanGlobal: Number(row.urutan_global ?? 0),
    urutanDalamGelombang: Number(row.urutan_dalam_gelombang ?? 0),
    status: String(row.status),
    attemptCount: Number(row.attempt_count ?? 0),
    lastError: row.last_error != null ? String(row.last_error) : null,
    claimedAt: row.claimed_at ? new Date(String(row.claimed_at)) : null,
    sentAt: row.sent_at ? new Date(String(row.sent_at)) : null,
    createdAt: row.created_at ? new Date(String(row.created_at)) : null,
  };
}

export async function releaseStaleClaims(staleMinutes = 5): Promise<number> {
  const result = await db
    .update(propagandaAntrian)
    .set({ status: "menunggu", claimedAt: null })
    .where(
      and(
        eq(propagandaAntrian.status, "mengirim"),
        sql`${propagandaAntrian.claimedAt} < ${new Date(Date.now() - staleMinutes * 60_000)}`,
      ),
    )
    .returning({ id: propagandaAntrian.id });
  return result.length;
}

export async function updatePropagandaAntrian(
  id: number,
  data: Partial<typeof propagandaAntrian.$inferInsert>,
): Promise<void> {
  await db.update(propagandaAntrian).set(data).where(eq(propagandaAntrian.id, id));
}

export async function insertLogKirim(data: {
  antrianId: number;
  campaignId: number;
  gelombangId: number | null;
  nomorWhatsapp: string;
  status: "sukses" | "gagal";
  responseJson?: string;
}): Promise<void> {
  await db.insert(propagandaLogKirim).values({
    antrianId: data.antrianId,
    campaignId: data.campaignId,
    gelombangId: data.gelombangId,
    nomorWhatsapp: data.nomorWhatsapp,
    status: data.status,
    responseJson: data.responseJson ?? null,
  });
}

export async function listPropagandaAntrian(
  campaignId: number,
  limit: number,
  offset: number,
): Promise<PropagandaAntrian[]> {
  return db
    .select()
    .from(propagandaAntrian)
    .where(eq(propagandaAntrian.campaignId, campaignId))
    .orderBy(asc(propagandaAntrian.urutanGlobal))
    .limit(limit)
    .offset(offset);
}

export async function listGelombang(campaignId: number): Promise<PropagandaGelombang[]> {
  return db
    .select()
    .from(propagandaGelombang)
    .where(eq(propagandaGelombang.campaignId, campaignId))
    .orderBy(asc(propagandaGelombang.nomorGelombang));
}

export async function cancelPendingAntrian(campaignId: number): Promise<void> {
  await db
    .update(propagandaAntrian)
    .set({ status: "dibatalkan", lastError: "Dibatalkan admin" })
    .where(
      and(eq(propagandaAntrian.campaignId, campaignId), inArray(propagandaAntrian.status, ["menunggu", "mengirim"])),
    );
  await db
    .update(propagandaGelombang)
    .set({ status: "dibatalkan" })
    .where(and(eq(propagandaGelombang.campaignId, campaignId), inArray(propagandaGelombang.status, ["menunggu", "berjalan"])));
}

export async function rescheduleFailedAntrian(campaignId: number, delayMinutes: number): Promise<number> {
  const newTime = new Date(Date.now() + delayMinutes * 60_000);
  const result = await db
    .update(propagandaAntrian)
    .set({ status: "menunggu", jadwalKirim: newTime, lastError: null, attemptCount: 0, claimedAt: null })
    .where(and(eq(propagandaAntrian.campaignId, campaignId), eq(propagandaAntrian.status, "gagal")))
    .returning({ id: propagandaAntrian.id });
  return result.length;
}

export async function countSentSince(since: Date): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(propagandaAntrian)
    .where(and(eq(propagandaAntrian.status, "terkirim"), sql`${propagandaAntrian.sentAt} >= ${since}`));
  return Number(row?.total ?? 0);
}

export async function countSentSinceByRt(since: Date, rt: number): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(propagandaAntrian)
    .where(
      and(
        eq(propagandaAntrian.status, "terkirim"),
        eq(propagandaAntrian.rt, rt),
        sql`${propagandaAntrian.sentAt} >= ${since}`,
      ),
    );
  return Number(row?.total ?? 0);
}

export async function getPerRtCounts(campaignId: number): Promise<Record<string, number>> {
  const rows = await db
    .select({ rt: propagandaAntrian.rt, total: count() })
    .from(propagandaAntrian)
    .where(eq(propagandaAntrian.campaignId, campaignId))
    .groupBy(propagandaAntrian.rt);
  const perRt: Record<string, number> = {};
  for (const r of rows) {
    if (r.rt != null) perRt[String(r.rt).padStart(2, "0")] = Number(r.total);
  }
  return perRt;
}

export async function getCampaignStats(campaignId: number) {
  const perRtRows = await db
    .select({
      rt: propagandaAntrian.rt,
      status: propagandaAntrian.status,
      total: count(),
    })
    .from(propagandaAntrian)
    .where(eq(propagandaAntrian.campaignId, campaignId))
    .groupBy(propagandaAntrian.rt, propagandaAntrian.status);

  const perRt: Record<string, { menunggu: number; terkirim: number; gagal: number; total: number }> = {};
  for (const row of perRtRows) {
    if (row.rt == null) continue;
    const key = String(row.rt).padStart(2, "0");
    const bucket = perRt[key] ?? { menunggu: 0, terkirim: 0, gagal: 0, total: 0 };
    const n = Number(row.total);
    bucket.total += n;
    if (row.status === "terkirim") bucket.terkirim += n;
    else if (row.status === "gagal") bucket.gagal += n;
    else if (row.status === "menunggu" || row.status === "mengirim") bucket.menunggu += n;
    perRt[key] = bucket;
  }

  const [logCount] = await db
    .select({ total: count() })
    .from(propagandaLogKirim)
    .where(eq(propagandaLogKirim.campaignId, campaignId));

  const campaign = await getPropagandaCampaign(campaignId);
  return {
    perRt,
    fairnessScore: campaign?.fairnessScore ?? null,
    formulaVersi: campaign?.formulaVersi ?? "helix-v2",
    totalLogKirim: Number(logCount?.total ?? 0),
  };
}
