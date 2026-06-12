/**
 * Formula Propaganda HELIX v2 — SSOT penjadwalan distribusi informasi RW.
 *
 * Prinsip:
 * 1. Stratifikasi per RT (setiap RT punya bucket sendiri)
 * 2. Gelombang mikro (15–30 pesan) + istirahat wajib antar gelombang
 * 3. Interleave helix: round-robin berbobot proporsional populasi RT
 * 4. Prioritas cooldown: nomor yang lama tidak dikirimi mendapat slot lebih awal dalam bucket RT
 * 5. Jam aktif WIB + jitter humanisasi
 * 6. Deterministik jika seed diberikan (preview = rencana aktual)
 */

import type { PropagandaProfil } from "@shared/schema";
import type { PropagandaRecipientCandidate } from "@shared/propaganda-filters";

export const HELIX_FORMULA_VERSION = "helix-v2" as const;

export const PROPAGANDA_PROFIL_JAM: Record<PropagandaProfil, number> = {
  cepat_aman: 2,
  standar: 6,
  merata: 12,
  hati_hati: 24,
  sangat_hati_hati: 48,
};

export type HelixConfig = {
  minGapMs: number;
  waveMinSize: number;
  waveMaxSize: number;
  waveRestMs: number;
  activeHourStart: number;
  activeHourEnd: number;
  jitterMaxMs: number;
  bufferStartMs: number;
};

export function getHelixConfigFromEnv(): HelixConfig {
  return {
    minGapMs: parseInt(process.env.PROPAGANDA_MIN_GAP_MS || "15000", 10),
    waveMinSize: parseInt(process.env.PROPAGANDA_WAVE_MIN || "15", 10),
    waveMaxSize: parseInt(process.env.PROPAGANDA_WAVE_MAX || "30", 10),
    waveRestMs: parseInt(process.env.PROPAGANDA_WAVE_REST_MS || "600000", 10),
    activeHourStart: parseInt(process.env.PROPAGANDA_ACTIVE_HOUR_START || "8", 10),
    activeHourEnd: parseInt(process.env.PROPAGANDA_ACTIVE_HOUR_END || "20", 10),
    jitterMaxMs: parseInt(process.env.PROPAGANDA_JITTER_MS || "8000", 10),
    bufferStartMs: 120_000,
  };
}

/** PRNG deterministik untuk urutan yang bisa direproduksi (preview = eksekusi). */
export function createSeededRng(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function shuffleSeeded<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isWithinActiveHours(date: Date, start: number, end: number): boolean {
  const hour = date.getHours();
  return hour >= start && hour < end;
}

function nextActiveSlot(from: Date, start: number, end: number): Date {
  const d = new Date(from);
  if (isWithinActiveHours(d, start, end)) return d;
  if (d.getHours() >= end) d.setDate(d.getDate() + 1);
  d.setHours(start, 0, 0, 0);
  return d;
}

function computeWaveSize(n: number, cfg: HelixConfig): number {
  if (n <= cfg.waveMinSize) return n;
  const dynamic = Math.round(Math.sqrt(n) * 3);
  return Math.max(cfg.waveMinSize, Math.min(cfg.waveMaxSize, dynamic));
}

type RtBucket = {
  rt: number;
  items: PropagandaRecipientCandidate[];
};

function buildRtBuckets(
  recipients: PropagandaRecipientCandidate[],
  cooldownLastSent: Map<string, Date>,
  rng: () => number,
): RtBucket[] {
  const byRt = new Map<number, PropagandaRecipientCandidate[]>();
  for (const r of recipients) {
    const list = byRt.get(r.rt) ?? [];
    list.push(r);
    byRt.set(r.rt, list);
  }

  const buckets: RtBucket[] = [];
  for (const rt of [...byRt.keys()].sort((a, b) => a - b)) {
    const items = byRt.get(rt)!;
    items.sort((a, b) => {
      const ta = cooldownLastSent.get(a.nomorWhatsapp)?.getTime() ?? 0;
      const tb = cooldownLastSent.get(b.nomorWhatsapp)?.getTime() ?? 0;
      return ta - tb;
    });
    buckets.push({ rt, items: shuffleSeeded(items, rng) });
  }
  return buckets;
}

/** Helix interleave: round-robin ketat antar RT — tidak habiskan satu RT dulu. */
function helixPickOrder(buckets: RtBucket[]): PropagandaRecipientCandidate[] {
  const working = buckets.map((b) => ({ rt: b.rt, items: [...b.items] }));
  const total = working.reduce((s, b) => s + b.items.length, 0);
  const ordered: PropagandaRecipientCandidate[] = [];
  while (ordered.length < total) {
    let progressed = false;
    for (const bucket of working) {
      if (bucket.items.length > 0) {
        ordered.push(bucket.items.shift()!);
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  return ordered;
}

export type HelixSlot = PropagandaRecipientCandidate & {
  jadwalKirim: Date;
  urutanGlobal: number;
  gelombangNomor: number;
  urutanDalamGelombang: number;
};

export type HelixWavePlan = {
  nomor: number;
  jumlahSlot: number;
  jadwalMulai: Date;
  jadwalSelesai: Date;
  istirahatSesudahMs: number;
  perRt: Record<string, number>;
};

export type HelixPlan = {
  formulaVersi: typeof HELIX_FORMULA_VERSION;
  profil: PropagandaProfil;
  seed: string;
  totalPenerima: number;
  jumlahGelombang: number;
  gapRataMs: number;
  fairnessScore: number;
  gelombang: HelixWavePlan[];
  slots: HelixSlot[];
  mulai: Date;
  selesai: Date;
};

/** Skor 0–100: seberapa merata urutan pengiriman antar RT (100 = sempurna merata). */
export function computeFairnessScore(ordered: PropagandaRecipientCandidate[]): number {
  if (ordered.length <= 1) return 100;
  const rtIndices = new Map<number, number[]>();
  ordered.forEach((r, i) => {
    const list = rtIndices.get(r.rt) ?? [];
    list.push(i);
    rtIndices.set(r.rt, list);
  });
  const avgPositions = [...rtIndices.values()].map((indices) => indices.reduce((a, b) => a + b, 0) / indices.length);
  if (avgPositions.length <= 1) return 100;
  const mean = avgPositions.reduce((a, b) => a + b, 0) / avgPositions.length;
  const variance = avgPositions.reduce((s, v) => s + (v - mean) ** 2, 0) / avgPositions.length;
  const stddev = Math.sqrt(variance);
  const cv = mean > 0 ? stddev / mean : 0;
  return Math.round(Math.max(0, Math.min(100, 100 - cv * 200)));
}

export function buildHelixPlan(
  recipients: PropagandaRecipientCandidate[],
  profil: PropagandaProfil,
  options?: {
    config?: HelixConfig;
    seed?: string;
    cooldownLastSent?: Map<string, Date>;
    now?: Date;
  },
): HelixPlan {
  const cfg = options?.config ?? getHelixConfigFromEnv();
  const seed = options?.seed ?? `helix-${recipients.length}-${profil}-${Date.now()}`;
  const rng = createSeededRng(seed);
  const cooldown = options?.cooldownLastSent ?? new Map<string, Date>();
  const now = options?.now ?? new Date();

  if (recipients.length === 0) {
    return {
      formulaVersi: HELIX_FORMULA_VERSION,
      profil,
      seed,
      totalPenerima: 0,
      jumlahGelombang: 0,
      gapRataMs: 0,
      fairnessScore: 100,
      gelombang: [],
      slots: [],
      mulai: now,
      selesai: now,
    };
  }

  const buckets = buildRtBuckets(recipients, cooldown, rng);
  const ordered = helixPickOrder(buckets);
  const fairnessScore = computeFairnessScore(ordered);

  const waveSize = computeWaveSize(ordered.length, cfg);
  const waveCount = Math.ceil(ordered.length / waveSize);
  const totalWindowMs = PROPAGANDA_PROFIL_JAM[profil] * 3_600_000;
  const waveWindowMs = Math.max(waveSize * cfg.minGapMs, Math.floor(totalWindowMs / waveCount));

  let cursor = nextActiveSlot(new Date(now.getTime() + cfg.bufferStartMs), cfg.activeHourStart, cfg.activeHourEnd);
  const slots: HelixSlot[] = [];
  const gelombang: HelixWavePlan[] = [];
  let urutanGlobal = 0;

  for (let w = 0; w < waveCount; w++) {
    const waveStart = new Date(cursor);
    const slice = ordered.slice(w * waveSize, (w + 1) * waveSize);
    const gapMs = Math.max(cfg.minGapMs, Math.floor(waveWindowMs / Math.max(slice.length, 1)));
    const perRt: Record<string, number> = {};

    for (let i = 0; i < slice.length; i++) {
      urutanGlobal++;
      const jitter = Math.floor(rng() * cfg.jitterMaxMs);
      const slotTime = new Date(cursor.getTime() + jitter);
      const rtKey = String(slice[i].rt).padStart(2, "0");
      perRt[rtKey] = (perRt[rtKey] ?? 0) + 1;

      slots.push({
        ...slice[i],
        jadwalKirim: slotTime,
        urutanGlobal,
        gelombangNomor: w + 1,
        urutanDalamGelombang: i + 1,
      });

      cursor = new Date(cursor.getTime() + gapMs);
      if (!isWithinActiveHours(cursor, cfg.activeHourStart, cfg.activeHourEnd)) {
        cursor = nextActiveSlot(cursor, cfg.activeHourStart, cfg.activeHourEnd);
      }
    }

    const waveEnd = slots[slots.length - 1]?.jadwalKirim ?? waveStart;
    const isLast = w === waveCount - 1;
    gelombang.push({
      nomor: w + 1,
      jumlahSlot: slice.length,
      jadwalMulai: waveStart,
      jadwalSelesai: waveEnd,
      istirahatSesudahMs: isLast ? 0 : cfg.waveRestMs,
      perRt,
    });

    if (!isLast) {
      cursor = new Date(cursor.getTime() + cfg.waveRestMs);
      cursor = nextActiveSlot(cursor, cfg.activeHourStart, cfg.activeHourEnd);
    }
  }

  const gapRataMs =
    slots.length > 1
      ? Math.round((slots[slots.length - 1].jadwalKirim.getTime() - slots[0].jadwalKirim.getTime()) / (slots.length - 1))
      : 0;

  return {
    formulaVersi: HELIX_FORMULA_VERSION,
    profil,
    seed,
    totalPenerima: ordered.length,
    jumlahGelombang: waveCount,
    gapRataMs,
    fairnessScore,
    gelombang,
    slots,
    mulai: slots[0].jadwalKirim,
    selesai: slots[slots.length - 1].jadwalKirim,
  };
}

export function estimateHelixTimeline(
  jumlahPenerima: number,
  profil: PropagandaProfil,
  seed?: string,
): { mulaiEstimasi: Date; selesaiEstimasi: Date; durasiJam: number; plan: HelixPlan } {
  const dummy: PropagandaRecipientCandidate[] = Array.from({ length: jumlahPenerima }, (_, i) => ({
    wargaId: i + 1,
    kkId: Math.floor(i / 3) + 1,
    nama: `Warga ${i}`,
    nomorWhatsapp: `081234567${String(i).padStart(2, "0")}`,
    rt: (i % 4) + 1,
    alamat: "Padasuka",
    jenisKelamin: i % 2 === 0 ? "Laki-laki" : "Perempuan",
    penerimaBansos: false,
  }));
  const plan = buildHelixPlan(dummy, profil, { seed: seed ?? `estimate-${jumlahPenerima}-${profil}` });
  const durasiJam = Math.max(0, (plan.selesai.getTime() - plan.mulai.getTime()) / 3_600_000);
  return { mulaiEstimasi: plan.mulai, selesaiEstimasi: plan.selesai, durasiJam, plan };
}
