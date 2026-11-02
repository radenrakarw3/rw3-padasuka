/**
 * Hubungi warga (kelengkapan/verifikasi data) — 1-per-1 via StarSender.
 * Tanpa blast/antrean massal.
 */

import { z } from "zod";
import { storage } from "./storage";
import { isStarSenderConfigured, isStarSenderDisabledFlag } from "./starsender";
import { sendWaWithResult } from "./wa-notify";
import { ringkasKeluarga } from "./wilayah-data";
import { isNomorHpValid } from "@shared/kontak";
import { isWargaDomisiliAktif } from "@shared/kependudukan-peristiwa";
import { computeKkCompleteness, computeWargaCompleteness } from "@shared/profile-completeness";
import type { Warga } from "@shared/schema";
import {
  detectWargaDataIssues,
  resolveWaVerifikasi,
  type WargaDataIssueId,
  type WargaIssueSlice,
} from "@shared/warga-data-issues";
import {
  bangunPoinBalasan,
  buildHubungiWargaPesanDariPoin,
  HUBUNGI_WARGA_JENIS_OPTIONS,
  labelsDariIssues,
  POIN_KONFIRMASI_KELUARGA,
  POIN_KONFIRMASI_PRIBADI,
  unikLabel,
  type HubungiWargaJenis,
  type HubungiWargaTemplateInput,
} from "@shared/wa-template-kependudukan";

const JENIS_IDS = HUBUNGI_WARGA_JENIS_OPTIONS.map((o) => o.id) as [
  HubungiWargaJenis,
  ...HubungiWargaJenis[],
];

export const hubungiWargaPreviewSchema = z.object({
  wargaId: z.number().int().positive(),
  jenis: z.enum(JENIS_IDS).default("minta_bantuan"),
  issueIds: z
    .array(
      z.enum([
        "tanpa_tanggal_lahir",
        "kategori_belum_sinkron",
        "tanpa_pekerjaan",
        "pekerjaan_tidak_standar",
        "pekerjaan_salah_kategori",
        "tanpa_status_pekerjaan",
        "status_pekerjaan_tidak_selaras",
        "status_lama_naik_usia",
      ]),
    )
    .optional(),
  chartLabel: z.string().max(120).optional().nullable(),
});

export const hubungiWargaKirimSchema = hubungiWargaPreviewSchema.extend({
  confirm: z.literal(true),
  /** Naikkan batas: daftar lengkap 1 keluarga bisa panjang. */
  pesan: z.string().min(20).max(8000).optional(),
});

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function starsenderStatus(): { ok: boolean; reason: string | null } {
  if (isStarSenderConfigured()) return { ok: true, reason: null };
  if (isStarSenderDisabledFlag()) {
    return { ok: false, reason: "StarSender dinonaktifkan (STARSENDER_DISABLED)" };
  }
  return { ok: false, reason: "STARSENDER_API_KEY belum dikonfigurasi" };
}

function toIssueSlice(w: Warga, rt: number): WargaIssueSlice {
  return {
    id: w.id,
    kkId: w.kkId,
    rt,
    namaLengkap: w.namaLengkap,
    nik: w.nik,
    kedudukanKeluarga: w.kedudukanKeluarga,
    tanggalLahir: w.tanggalLahir,
    kategoriUmur: w.kategoriUmur,
    pekerjaan: w.pekerjaan,
    statusPekerjaan: w.statusPekerjaan,
    nomorWhatsapp: w.nomorWhatsapp,
    sedangKuliah: w.sedangKuliah,
  };
}

async function loadKonteks(wargaId: number) {
  const warga = await storage.getWargaById(wargaId);
  if (!warga) return null;

  const kk = await storage.getKkById(warga.kkId);
  if (!kk) return null;

  const anggota = await storage.getWargaByKkId(warga.kkId);
  const allInKk: WargaIssueSlice[] = anggota.map((a) => toIssueSlice(a, kk.rt));
  const row = toIssueSlice(warga, kk.rt);
  const wa = resolveWaVerifikasi(row, allInKk);

  const kepala = anggota.find((a) => a.kedudukanKeluarga === "Kepala Keluarga");

  return { warga, kk, anggota, row, allInKk, wa, namaKepalaKeluarga: kepala?.namaLengkap ?? null };
}

/** Selalu deteksi penuh — filter UI tidak boleh memangkas daftar WA (hindari bolak-balik). */
function resolveIssues(
  row: WargaIssueSlice,
  issueIds?: WargaDataIssueId[],
): WargaDataIssueId[] {
  const detected = detectWargaDataIssues(row);
  if (!issueIds?.length) return detected;
  return Array.from(new Set([...detected, ...issueIds]));
}

function kurangUntukAnggota(
  warga: Warga,
  rt: number,
  kurangStandar: string[],
): string[] {
  const slice = toIssueSlice(warga, rt);
  return unikLabel([
    ...labelsDariIssues(detectWargaDataIssues(slice)),
    ...computeWargaCompleteness(warga).missingFields.map((f) => f.label),
    ...kurangStandar,
  ]);
}

/** Kumpulkan SEMUA gap: pribadi target + KK + anggota lain — 1 pesan cukup. */
async function kumpulkanKebutuhanData(ctx: NonNullable<Awaited<ReturnType<typeof loadKonteks>>>) {
  const ringkas = (await ringkasKeluarga([ctx.kk.id], { rinci: true })).get(ctx.kk.id);
  const kurangAnggota = ringkas?.kurang?.anggota.get(ctx.warga.id) ?? [];
  const kurangKeluargaStandar = ringkas?.kurang?.keluarga ?? [];

  const pribadiTier = computeWargaCompleteness(ctx.warga).missingFields.map((f) => f.label);
  const kkTier = computeKkCompleteness(ctx.anggota, ctx.kk)
    .missingFields.filter((f) => !f.wargaNama)
    .map((f) => f.label);

  const dataPribadi = unikLabel([
    ...labelsDariIssues(detectWargaDataIssues(ctx.row)),
    ...pribadiTier,
    ...kurangAnggota,
  ]);
  const dataKeluarga = unikLabel([...kkTier, ...kurangKeluargaStandar]);

  const dataAnggotaLain: NonNullable<HubungiWargaTemplateInput["dataAnggotaLain"]> = [];
  for (const a of ctx.anggota) {
    if (a.id === ctx.warga.id) continue;
    if (!isWargaDomisiliAktif(a.statusKependudukan)) continue;
    const kurang = kurangUntukAnggota(
      a,
      ctx.kk.rt,
      ringkas?.kurang?.anggota.get(a.id) ?? [],
    );
    if (!kurang.length) continue;
    dataAnggotaLain.push({
      nama: a.namaLengkap,
      kedudukan: a.kedudukanKeluarga,
      kurang,
    });
  }

  // Jangan kirim pesan kosong/generik — fallback poin konfirmasi baku.
  if (!dataPribadi.length && !dataKeluarga.length && !dataAnggotaLain.length) {
    return {
      dataPribadi: [...POIN_KONFIRMASI_PRIBADI],
      dataKeluarga: [...POIN_KONFIRMASI_KELUARGA],
      dataAnggotaLain,
    };
  }

  return { dataPribadi, dataKeluarga, dataAnggotaLain };
}

export async function previewHubungiWarga(input: z.infer<typeof hubungiWargaPreviewSchema>) {
  const ctx = await loadKonteks(input.wargaId);
  if (!ctx) {
    return { ok: false as const, status: 404, message: "Warga tidak ditemukan" };
  }
  if (!ctx.wa) {
    return {
      ok: false as const,
      status: 400,
      message: "Tidak ada nomor WhatsApp (warga maupun kepala keluarga)",
    };
  }
  if (!isNomorHpValid(ctx.wa.phone)) {
    return { ok: false as const, status: 400, message: "Nomor WhatsApp tidak valid" };
  }

  const issues = resolveIssues(ctx.row, input.issueIds as WargaDataIssueId[] | undefined);
  const { dataPribadi, dataKeluarga, dataAnggotaLain } = await kumpulkanKebutuhanData(ctx);
  const templateInput: HubungiWargaTemplateInput = {
    namaLengkap: ctx.row.namaLengkap,
    kedudukanKeluarga: ctx.row.kedudukanKeluarga,
    rt: ctx.row.rt,
    issues,
    tanggalLahir: ctx.row.tanggalLahir,
    kategoriUmur: ctx.row.kategoriUmur,
    pekerjaan: ctx.row.pekerjaan,
    statusPekerjaan: ctx.row.statusPekerjaan,
    jenis: input.jenis,
    via: ctx.wa.via,
    namaKepalaKeluarga: ctx.namaKepalaKeluarga,
    chartLabel: input.chartLabel,
    dataPribadi,
    dataKeluarga,
    dataAnggotaLain,
  };
  const poinBalasan = bangunPoinBalasan(templateInput);
  const pesan = buildHubungiWargaPesanDariPoin(templateInput, poinBalasan);

  const ss = starsenderStatus();

  return {
    ok: true as const,
    wargaId: ctx.warga.id,
    namaLengkap: ctx.row.namaLengkap,
    kedudukanKeluarga: ctx.row.kedudukanKeluarga,
    namaKepalaKeluarga: ctx.namaKepalaKeluarga,
    rt: ctx.row.rt,
    phone: ctx.wa.phone,
    via: ctx.wa.via,
    issues,
    dataPribadi,
    dataKeluarga,
    dataAnggotaLain,
    poinBalasan,
    jenis: input.jenis,
    pesan,
    starsenderOk: ss.ok,
    starsenderReason: ss.reason,
  };
}

export async function kirimHubungiWarga(input: z.infer<typeof hubungiWargaKirimSchema>) {
  const preview = await previewHubungiWarga(input);
  if (!preview.ok) return preview;

  const pesan = (input.pesan?.trim() || preview.pesan).trim();
  if (pesan.length < 20) {
    return { ok: false as const, status: 400, message: "Pesan terlalu pendek" };
  }

  const eventKey = `kependudukan:${input.jenis}:${input.wargaId}:${todayKey()}`;
  const result = await sendWaWithResult(preview.phone, pesan, {
    eventKey,
    referenceType: "warga",
    referenceId: input.wargaId,
    dedup: true,
  });

  if (result.status === "sent") {
    return {
      ok: true as const,
      status: "sent" as const,
      phone: result.phone,
      via: preview.via,
      eventKey: result.eventKey,
      pesan,
    };
  }

  if (result.status === "skipped" && result.reason === "dedup") {
    return {
      ok: false as const,
      status: 409,
      code: "dedup" as const,
      message: "Warga sudah dihubungi hari ini untuk jenis pesan ini",
    };
  }

  if (result.status === "skipped" && result.reason === "starsender_off") {
    return {
      ok: false as const,
      status: 503,
      code: "starsender_off" as const,
      message: preview.starsenderReason || "StarSender tidak aktif",
    };
  }

  if (result.status === "skipped") {
    return { ok: false as const, status: 400, message: "Nomor WhatsApp tidak valid" };
  }

  return {
    ok: false as const,
    status: 502,
    message: result.error || "Gagal mengirim WhatsApp",
  };
}
