import { sendStarSenderMessage, isStarSenderConfigured } from "./starsender";
import {
  claimNextDueAntrian,
  updatePropagandaAntrian,
  refreshPropagandaCampaignCounts,
  upsertPropagandaCooldown,
  countSentSince,
  countSentSinceByRt,
  insertLogKirim,
  releaseStaleClaims,
} from "./propaganda-storage";

const TICK_MS = 8_000;
const MAX_PER_HOUR = parseInt(process.env.PROPAGANDA_MAX_PER_HOUR || "40", 10);
const MAX_PER_RT_PER_HOUR = parseInt(process.env.PROPAGANDA_MAX_PER_RT_HOUR || "12", 10);
const MAX_RETRY = 2;
const RETRY_DELAY_MS = 30 * 60_000;

let dispatcherTimer: ReturnType<typeof setInterval> | null = null;
let processing = false;
let lastTickAt: Date | null = null;
let lastSentAt: Date | null = null;
let ticksTotal = 0;

export function getPropagandaDispatcherHealth() {
  return {
    aktif: dispatcherTimer != null,
    processing,
    lastTickAt: lastTickAt?.toISOString() ?? null,
    lastSentAt: lastSentAt?.toISOString() ?? null,
    ticksTotal,
    starsenderConfigured: isStarSenderConfigured(),
  };
}

async function processOneDueMessage(): Promise<boolean> {
  if (!isStarSenderConfigured()) return false;

  await releaseStaleClaims(5);

  const sinceHour = new Date(Date.now() - 60 * 60_000);
  const sentThisHour = await countSentSince(sinceHour);
  if (sentThisHour >= MAX_PER_HOUR) return false;

  const antrian = await claimNextDueAntrian();
  if (!antrian) return false;

  if (antrian.rt != null) {
    const sentRt = await countSentSinceByRt(sinceHour, antrian.rt);
    if (sentRt >= MAX_PER_RT_PER_HOUR) {
      await updatePropagandaAntrian(antrian.id, {
        status: "menunggu",
        claimedAt: null,
        jadwalKirim: new Date(Date.now() + 15 * 60_000),
        lastError: `Cap per RT/jam (${MAX_PER_RT_PER_HOUR}) — dijadwalkan ulang`,
      });
      return false;
    }
  }

  const result = await sendStarSenderMessage({
    to: antrian.nomorWhatsapp,
    body: antrian.pesan,
    delay: parseInt(process.env.PROPAGANDA_MIN_GAP_MS || "15000", 10),
  });

  const responseJson = JSON.stringify({
    ok: result.ok,
    error: result.error,
    message: result.message,
  });

  if (result.ok) {
    await updatePropagandaAntrian(antrian.id, {
      status: "terkirim",
      sentAt: new Date(),
      lastError: null,
    });
    await upsertPropagandaCooldown(antrian.nomorWhatsapp, antrian.campaignId);
    await insertLogKirim({
      antrianId: antrian.id,
      campaignId: antrian.campaignId,
      gelombangId: antrian.gelombangId,
      nomorWhatsapp: antrian.nomorWhatsapp,
      status: "sukses",
      responseJson,
    });
    lastSentAt = new Date();
  } else {
    const attempts = (antrian.attemptCount ?? 0) + 1;
    if (attempts < MAX_RETRY) {
      await updatePropagandaAntrian(antrian.id, {
        status: "menunggu",
        attemptCount: attempts,
        lastError: result.error ?? result.message ?? "Gagal kirim",
        jadwalKirim: new Date(Date.now() + RETRY_DELAY_MS),
        claimedAt: null,
      });
    } else {
      await updatePropagandaAntrian(antrian.id, {
        status: "gagal",
        attemptCount: attempts,
        lastError: result.error ?? result.message ?? "Gagal kirim",
      });
    }
    await insertLogKirim({
      antrianId: antrian.id,
      campaignId: antrian.campaignId,
      gelombangId: antrian.gelombangId,
      nomorWhatsapp: antrian.nomorWhatsapp,
      status: "gagal",
      responseJson,
    });
  }

  await refreshPropagandaCampaignCounts(antrian.campaignId);
  return result.ok;
}

async function tick(): Promise<void> {
  if (processing) return;
  processing = true;
  lastTickAt = new Date();
  ticksTotal++;
  try {
    await processOneDueMessage();
  } catch (err) {
    console.error("[propaganda-dispatcher]", err);
  } finally {
    processing = false;
  }
}

export function startPropagandaDispatcher(): void {
  if (dispatcherTimer) return;
  console.log("[propaganda] HELIX v2 dispatcher aktif");
  void tick();
  dispatcherTimer = setInterval(() => void tick(), TICK_MS);
}

export function stopPropagandaDispatcher(): void {
  if (dispatcherTimer) {
    clearInterval(dispatcherTimer);
    dispatcherTimer = null;
  }
}
