import crypto from "crypto";
import { storage } from "./storage";
import {
  buildWargaRows,
  countPerRt,
  propagandaFilterSchema,
  resolvePropagandaRecipients,
  type PropagandaFilterInput,
  type PropagandaPreviewResult,
} from "@shared/propaganda-filters";
import { buildHelixPlan, estimateHelixTimeline, HELIX_FORMULA_VERSION } from "@shared/propaganda-helix";
import type { PropagandaProfil } from "@shared/schema";
import {
  createCampaignBundle,
  getCooldownMap,
  getCooldownPhones,
  refreshPropagandaCampaignCounts,
} from "./propaganda-storage";

const COOLDOWN_DAYS = parseInt(process.env.PROPAGANDA_COOLDOWN_DAYS || "7", 10);
const MAX_PER_BLAST = parseInt(process.env.PROPAGANDA_MAX_PER_BLAST || "200", 10);

async function loadWargaContext() {
  const [wargaList, kkList] = await Promise.all([
    storage.getAllWargaWithKkPemukiman(),
    storage.getAllKkPemukiman(),
  ]);
  const kkBansosMap = new Map(kkList.map((kk) => [kk.id, kk.penerimaBansos]));
  return buildWargaRows(
    wargaList.map((w) => ({
      id: w.id,
      kkId: w.kkId,
      namaLengkap: w.namaLengkap,
      nomorWhatsapp: w.nomorWhatsapp,
      jenisKelamin: w.jenisKelamin,
      kedudukanKeluarga: w.kedudukanKeluarga,
      kategoriUmur: w.kategoriUmur,
      pekerjaan: w.pekerjaan,
      statusKependudukan: w.statusKependudukan,
      rt: w.rt,
      alamat: w.alamat,
    })),
    kkBansosMap,
  );
}

function buildPreviewSeed(filter: PropagandaFilterInput, profil: PropagandaProfil, count: number): string {
  const payload = JSON.stringify({ filter, profil, count });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export async function buildPropagandaPreview(
  filterInput: PropagandaFilterInput,
  profil: PropagandaProfil,
  abaikanCooldown: boolean,
): Promise<PropagandaPreviewResult> {
  const filter = propagandaFilterSchema.parse(filterInput);
  const wargaRows = await loadWargaContext();
  const cooldownPhones = abaikanCooldown ? new Set<string>() : await getCooldownPhones(COOLDOWN_DAYS);
  const cooldownMap = abaikanCooldown ? new Map<string, Date>() : await getCooldownMap(COOLDOWN_DAYS);

  const { recipients, dilewatiCooldown, tanpaWa } = resolvePropagandaRecipients(
    wargaRows,
    filter,
    cooldownPhones,
    abaikanCooldown,
  );

  if (recipients.length === 0) {
    return {
      jumlahTarget: 0,
      jumlahDilewatiCooldown: dilewatiCooldown,
      jumlahTanpaWa: tanpaWa,
      perRt: {},
      helix: {
        formulaVersi: HELIX_FORMULA_VERSION,
        seed: "",
        jumlahGelombang: 0,
        gapRataMs: 0,
        fairnessScore: 100,
        gelombang: [],
      },
      timeline: {
        mulaiEstimasi: new Date().toISOString(),
        selesaiEstimasi: new Date().toISOString(),
        durasiJam: 0,
        profilDistribusi: profil,
      },
      sample: [],
    };
  }

  const seed = buildPreviewSeed(filter, profil, recipients.length);
  const plan = buildHelixPlan(recipients, profil, { seed, cooldownLastSent: cooldownMap });

  return {
    jumlahTarget: recipients.length,
    jumlahDilewatiCooldown: dilewatiCooldown,
    jumlahTanpaWa: tanpaWa,
    perRt: countPerRt(recipients),
    helix: {
      formulaVersi: HELIX_FORMULA_VERSION,
      seed: plan.seed,
      jumlahGelombang: plan.jumlahGelombang,
      gapRataMs: plan.gapRataMs,
      fairnessScore: plan.fairnessScore,
      gelombang: plan.gelombang.map((g) => ({
        nomor: g.nomor,
        jumlahSlot: g.jumlahSlot,
        mulai: g.jadwalMulai.toISOString(),
        selesai: g.jadwalSelesai.toISOString(),
        istirahatMenit: Math.round(g.istirahatSesudahMs / 60_000),
        perRt: g.perRt,
      })),
    },
    timeline: {
      mulaiEstimasi: plan.mulai.toISOString(),
      selesaiEstimasi: plan.selesai.toISOString(),
      durasiJam: Math.round(((plan.selesai.getTime() - plan.mulai.getTime()) / 3_600_000) * 10) / 10,
      profilDistribusi: profil,
    },
    sample: recipients.slice(0, 5).map((r) => ({
      nama: r.nama,
      rt: r.rt,
      nomorWhatsapp: r.nomorWhatsapp.replace(/(\d{4})\d+(\d{2})/, "$1****$2"),
    })),
  };
}

export async function getPropagandaFilterOptions() {
  const wargaRows = await loadWargaContext();
  const pekerjaanSet = new Set<string>();
  for (const w of wargaRows) {
    const pk = (w.pekerjaan ?? "").trim();
    if (pk) pekerjaanSet.add(pk);
  }
  return { pekerjaan: [...pekerjaanSet].sort((a, b) => a.localeCompare(b, "id")) };
}

export type CreateCampaignResult = { campaignId: number; preview: PropagandaPreviewResult };

export async function createPropagandaCampaignWithAntrian(opts: {
  judul: string;
  pesanTemplate: string;
  filterInput: PropagandaFilterInput;
  profil: PropagandaProfil;
  abaikanCooldown: boolean;
  konfirmasiBesar: boolean;
  createdBy: string;
}): Promise<CreateCampaignResult> {
  const filter = propagandaFilterSchema.parse(opts.filterInput);
  const preview = await buildPropagandaPreview(filter, opts.profil, opts.abaikanCooldown);

  if (preview.jumlahTarget === 0) {
    throw new Error("Tidak ada penerima yang memenuhi filter. Periksa filter atau cooldown.");
  }
  if (preview.jumlahTarget > MAX_PER_BLAST && !opts.konfirmasiBesar) {
    throw new Error(
      `Kampanye ${preview.jumlahTarget} penerima melebihi batas ${MAX_PER_BLAST}. Centang konfirmasi risiko atau pecah per RT.`,
    );
  }

  const wargaRows = await loadWargaContext();
  const cooldownPhones = opts.abaikanCooldown ? new Set<string>() : await getCooldownPhones(COOLDOWN_DAYS);
  const cooldownMap = opts.abaikanCooldown ? new Map<string, Date>() : await getCooldownMap(COOLDOWN_DAYS);
  const { recipients } = resolvePropagandaRecipients(wargaRows, filter, cooldownPhones, opts.abaikanCooldown);

  const seed = buildPreviewSeed(filter, opts.profil, recipients.length);
  const plan = buildHelixPlan(recipients, opts.profil, { seed, cooldownLastSent: cooldownMap });

  const campaign = await createCampaignBundle({
    judul: opts.judul.trim(),
    pesanTemplate: opts.pesanTemplate,
    filterJson: JSON.stringify(filter),
    profilDistribusi: opts.profil,
    abaikanCooldown: opts.abaikanCooldown,
    createdBy: opts.createdBy,
    plan,
  });

  await refreshPropagandaCampaignCounts(campaign.id);

  return { campaignId: campaign.id, preview };
}
