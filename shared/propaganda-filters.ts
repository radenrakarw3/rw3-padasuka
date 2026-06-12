import { z } from "zod";
import { KATEGORI_UMUR_IDS, type KategoriUmurId } from "@shared/kategori-umur";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import type { PropagandaProfil } from "@shared/schema";

export const propagandaFilterSchema = z.object({
  mode: z.enum(["per_warga", "per_kk"]).default("per_warga"),
  rt: z.array(z.number().int().min(1).max(4)).optional(),
  kategoriUmur: z.array(z.enum(KATEGORI_UMUR_IDS as unknown as [string, ...string[]])).optional(),
  pekerjaan: z.array(z.string()).optional(),
  penerimaBansos: z.boolean().optional(),
  kepalaKeluargaOnly: z.boolean().optional(),
  jenisKelamin: z.enum(["Laki-laki", "Perempuan"]).optional(),
  statusKependudukan: z.string().default("Aktif"),
  lewatiAnak: z.boolean().default(true),
});

export type PropagandaFilterInput = z.infer<typeof propagandaFilterSchema>;

export type PropagandaRecipientCandidate = {
  wargaId: number | null;
  kkId: number;
  nama: string;
  nomorWhatsapp: string;
  rt: number;
  alamat: string;
  jenisKelamin: string;
  penerimaBansos: boolean;
};

export type PropagandaPreviewResult = {
  jumlahTarget: number;
  jumlahDilewatiCooldown: number;
  jumlahTanpaWa: number;
  perRt: Record<string, number>;
  helix: {
    formulaVersi: string;
    seed: string;
    jumlahGelombang: number;
    gapRataMs: number;
    fairnessScore: number;
    gelombang: {
      nomor: number;
      jumlahSlot: number;
      mulai: string;
      selesai: string;
      istirahatMenit: number;
      perRt: Record<string, number>;
    }[];
  };
  timeline: {
    mulaiEstimasi: string;
    selesaiEstimasi: string;
    durasiJam: number;
    profilDistribusi: PropagandaProfil;
  };
  sample: { nama: string; rt: number; nomorWhatsapp: string }[];
};

const ANAK_KATEGORI = new Set<KategoriUmurId>(["0-5", "6", "7-18"]);

export function isValidWaNumber(phone: string | null | undefined): boolean {
  if (!phone?.trim()) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 9;
}

export function normalizeWaDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = `0${digits.slice(2)}`;
  else if (digits.startsWith("8")) digits = `0${digits}`;
  return digits;
}

type WargaRow = {
  id: number;
  kkId: number;
  namaLengkap: string;
  nomorWhatsapp: string | null;
  jenisKelamin: string;
  kedudukanKeluarga: string;
  kategoriUmur: string | null;
  pekerjaan: string | null;
  statusKependudukan: string | null;
  rt: number;
  alamat: string;
  penerimaBansos: boolean;
};

export function buildWargaRows(
  wargaList: Array<{
    id: number;
    kkId: number;
    namaLengkap: string;
    nomorWhatsapp: string | null;
    jenisKelamin: string;
    kedudukanKeluarga: string;
    kategoriUmur: string | null;
    pekerjaan: string | null;
    statusKependudukan: string | null;
    rt: number;
    alamat: string;
  }>,
  kkBansosMap: Map<number, boolean>,
): WargaRow[] {
  return wargaList.map((w) => ({
    ...w,
    penerimaBansos: kkBansosMap.get(w.kkId) ?? false,
  }));
}

function matchesFilter(w: WargaRow, filter: PropagandaFilterInput): boolean {
  const rtList = filter.rt?.length ? filter.rt : [...ACTIVE_RT_NUMBERS];
  if (!rtList.includes(w.rt)) return false;

  if (filter.statusKependudukan && w.statusKependudukan !== filter.statusKependudukan) return false;
  if (filter.jenisKelamin && w.jenisKelamin !== filter.jenisKelamin) return false;
  if (filter.penerimaBansos && !w.penerimaBansos) return false;
  if (filter.kepalaKeluargaOnly && w.kedudukanKeluarga !== "Kepala Keluarga") return false;

  if (filter.lewatiAnak && w.kategoriUmur && ANAK_KATEGORI.has(w.kategoriUmur as KategoriUmurId)) {
    return false;
  }

  if (filter.kategoriUmur?.length) {
    const kat = w.kategoriUmur ?? "belum_diisi";
    if (!filter.kategoriUmur.includes(kat as KategoriUmurId)) return false;
  }

  if (filter.pekerjaan?.length) {
    const pk = (w.pekerjaan ?? "").trim();
    if (!filter.pekerjaan.some((p) => p === pk)) return false;
  }

  return true;
}

function pickKkRepresentative(members: WargaRow[]): WargaRow | null {
  const withWa = members.filter((m) => isValidWaNumber(m.nomorWhatsapp));
  if (withWa.length === 0) return null;
  const kepala = withWa.find((m) => m.kedudukanKeluarga === "Kepala Keluarga");
  if (kepala) return kepala;
  return withWa[0];
}

export function resolvePropagandaRecipients(
  wargaRows: WargaRow[],
  filter: PropagandaFilterInput,
  cooldownPhones: Set<string>,
  abaikanCooldown: boolean,
): { recipients: PropagandaRecipientCandidate[]; dilewatiCooldown: number; tanpaWa: number } {
  const filtered = wargaRows.filter((w) => matchesFilter(w, filter));
  let dilewatiCooldown = 0;
  let tanpaWa = 0;
  const recipients: PropagandaRecipientCandidate[] = [];
  const seenPhones = new Set<string>();

  if (filter.mode === "per_kk") {
    const byKk = new Map<number, WargaRow[]>();
    for (const w of filtered) {
      const list = byKk.get(w.kkId) ?? [];
      list.push(w);
      byKk.set(w.kkId, list);
    }
    for (const members of byKk.values()) {
      const pick = pickKkRepresentative(members);
      if (!pick || !isValidWaNumber(pick.nomorWhatsapp)) {
        tanpaWa++;
        continue;
      }
      const phone = normalizeWaDigits(pick.nomorWhatsapp!);
      if (!abaikanCooldown && cooldownPhones.has(phone)) {
        dilewatiCooldown++;
        continue;
      }
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      recipients.push({
        wargaId: pick.id,
        kkId: pick.kkId,
        nama: pick.namaLengkap,
        nomorWhatsapp: phone,
        rt: pick.rt,
        alamat: pick.alamat,
        jenisKelamin: pick.jenisKelamin,
        penerimaBansos: pick.penerimaBansos,
      });
    }
  } else {
    for (const w of filtered) {
      if (!isValidWaNumber(w.nomorWhatsapp)) {
        tanpaWa++;
        continue;
      }
      const phone = normalizeWaDigits(w.nomorWhatsapp!);
      if (!abaikanCooldown && cooldownPhones.has(phone)) {
        dilewatiCooldown++;
        continue;
      }
      if (seenPhones.has(phone)) continue;
      seenPhones.add(phone);
      recipients.push({
        wargaId: w.id,
        kkId: w.kkId,
        nama: w.namaLengkap,
        nomorWhatsapp: phone,
        rt: w.rt,
        alamat: w.alamat,
        jenisKelamin: w.jenisKelamin,
        penerimaBansos: w.penerimaBansos,
      });
    }
  }

  return { recipients, dilewatiCooldown, tanpaWa };
}

export function countPerRt(recipients: PropagandaRecipientCandidate[]): Record<string, number> {
  const perRt: Record<string, number> = {};
  for (const r of recipients) {
    const key = String(r.rt).padStart(2, "0");
    perRt[key] = (perRt[key] ?? 0) + 1;
  }
  return perRt;
}

export function personalizePropagandaMessage(
  template: string,
  recipient: Pick<PropagandaRecipientCandidate, "nama" | "jenisKelamin" | "rt" | "alamat">,
): string {
  const sapaan = recipient.jenisKelamin === "Perempuan" ? "Ibu" : "Bapak";
  const rtLabel = `RT ${String(recipient.rt).padStart(2, "0")}`;
  return template
    .replace(/\{sapaan\}/g, sapaan)
    .replace(/\{gender\}/g, sapaan)
    .replace(/\{nama\}/g, recipient.nama)
    .replace(/\{warga\}/g, recipient.nama)
    .replace(/\{rt\}/g, rtLabel)
    .replace(/\{rtxx\}/g, rtLabel)
    .replace(/\{alamat\}/g, recipient.alamat);
}
