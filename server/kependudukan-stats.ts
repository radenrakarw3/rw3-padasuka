import {
  WARGA_FORM_SECTIONS,
  KK_ANALYTICS_FIELDS,
  isFieldFilled,
  isWargaEligibleForAnalyticsField,
  type WargaFormSectionDef,
} from "@shared/kependudukan-analytics";
import { getWargaAge } from "@shared/warga-form-tier";
import {
  isLegacyPekerjaanDiLuarAngkatanKerja,
  isLegacyPekerjaanPengangguran,
} from "@shared/pekerjaan-labor";
import {
  needsLiterasi,
  needsCrvsDocuments,
  needsStatusAngkatanKerja,
} from "@shared/warga-international";
import { countPeristiwaKependudukan, type PeristiwaCounts } from "@shared/kependudukan-peristiwa";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import type { KartuKeluarga, Warga } from "@shared/schema";

export type FillRateItem = { field: string; label: string; filled: number; total: number; percent: number };
export type DistributionItem = { field: string; label: string; buckets: Record<string, number> };
export type BooleanItem = { field: string; label: string; true: number; false: number };
export type TopBucketItem = { field: string; label: string; items: { name: string; count: number }[] };

export type SectionStats = {
  key: string;
  title: string;
  description: string;
  totalWarga: number;
  sectionFillPercent: number;
  fillRates: FillRateItem[];
  distributions: DistributionItem[];
  booleans: BooleanItem[];
};

export type KkAnalytics = {
  totalKk: number;
  distributions: DistributionItem[];
  booleans: BooleanItem[];
  fillRates: FillRateItem[];
  penghuniMismatch: number;
  penerimaBansos: number;
  layakBansos: number;
  kkEkonomiTerisi: number;
};

/** Ringkasan KPI dashboard — dihitung dari KK/warga saja (tanpa load seluruh DB seperti getDashboardStats). */
export type KependudukanLegacySummary = {
  totalKk: number;
  totalWarga: number;
  jenisKelamin: Record<string, number>;
  kelompokUsia: Record<string, number>;
  pendidikan: Record<string, number>;
  pekerjaan: { name: string; count: number }[];
  pengangguran: {
    total: number;
    perUsia: Record<string, number>;
    daftarNama: { nama: string; usia: number | null; rt: number | null }[];
  };
  bansos: { penerima: number; bukan: number };
  totalDisabilitas: number;
  totalIbuHamil: number;
  totalLayakBansos: number;
  kkEkonomiTerisi: number;
  kategoriEkonomi: Record<string, number>;
  literasi: Record<string, number>;
  statusPekerjaan: Record<string, number>;
  capaian: {
    waPercent: number;
    bansosPercent: number;
    literasiPercent: number;
    iloPercent: number;
    crvsPercent: number;
    wgDetailPercent: number;
  };
  crvs: { anak: number; punyaAkta: number; punyaKia: number; punyaSalahSatu: number };
  peristiwa: PeristiwaCounts;
  perRt: { rt: number; kk: number; warga: number; bansos: number; lakiLaki: number; perempuan: number }[];
  rtList: number[];
};

export type KependudukanStats = {
  generatedAt: string;
  rtFilter?: number;
  totals: { kk: number; warga: number };
  legacy: KependudukanLegacySummary;
  kk: KkAnalytics;
  sections: SectionStats[];
  qualityBySection: { key: string; title: string; fillPercent: number }[];
};

export type SegmentRow = {
  wargaId: number;
  namaLengkap: string;
  nik: string;
  rt: number | null;
  kkId: number;
  nomorKk: string | null;
  fieldValue: string | null;
};

function countByField(items: Record<string, unknown>[], field: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const raw = item[field];
    const val =
      raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")
        ? "Belum diisi"
        : String(raw);
    map[val] = (map[val] || 0) + 1;
  }
  return map;
}

function topBuckets(buckets: Record<string, number>, limit = 12): { name: string; count: number }[] {
  return Object.entries(buckets)
    .filter(([k]) => k !== "Belum diisi")
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function eligibleWarga(wargaList: Warga[], field: string): Warga[] {
  return wargaList.filter((w) => isWargaEligibleForAnalyticsField(w, field));
}

function aggregateSection(section: WargaFormSectionDef, wargaList: Warga[]): SectionStats {
  const fillRates: FillRateItem[] = [];
  const distributions: DistributionItem[] = [];
  const booleans: BooleanItem[] = [];
  const records = wargaList as unknown as Record<string, unknown>[];

  let filledSlots = 0;
  let totalSlots = 0;

  for (const f of section.fields) {
    if (f.type === "skip") continue;
    const eligible = eligibleWarga(wargaList, f.key);
    const eligibleRec = eligible as unknown as Record<string, unknown>[];

    if (f.type === "fillRate") {
      const filled = eligibleRec.filter((w) => isFieldFilled(w[f.key])).length;
      const total = eligible.length;
      totalSlots += total;
      filledSlots += filled;
      fillRates.push({
        field: f.key,
        label: f.label,
        filled,
        total,
        percent: total > 0 ? Math.round((filled / total) * 100) : 0,
      });
      continue;
    }

    if (f.type === "boolean") {
      const trueCount = eligible.filter((w) => (w as Record<string, unknown>)[f.key] === true).length;
      const falseCount = eligible.length - trueCount;
      totalSlots += eligible.length;
      filledSlots += eligible.length;
      booleans.push({ field: f.key, label: f.label, true: trueCount, false: falseCount });
      continue;
    }

    if (f.type === "categorical") {
      const buckets = countByField(eligibleRec, f.key);
      const nonEmpty = Object.entries(buckets).filter(([k]) => k !== "Belum diisi").reduce((s, [, c]) => s + c, 0);
      totalSlots += eligible.length;
      filledSlots += nonEmpty;
      if (Object.keys(buckets).length > 0) {
        distributions.push({ field: f.key, label: f.label, buckets });
      }
    }
  }

  const sectionFillPercent =
    totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return {
    key: section.key,
    title: section.title,
    description: section.description,
    totalWarga: wargaList.length,
    sectionFillPercent,
    fillRates,
    distributions,
    booleans,
  };
}

function aggregateKk(kkList: KartuKeluarga[], wargaByKk: Map<number, number>): KkAnalytics {
  const kkRecords = kkList as unknown as Record<string, unknown>[];
  const distributions: DistributionItem[] = [];
  const booleans: BooleanItem[] = [];
  const fillRates: FillRateItem[] = [];

  for (const f of KK_ANALYTICS_FIELDS) {
    if (f.type === "boolean") {
      const trueCount = kkList.filter((k) => (k as Record<string, unknown>)[f.key] === true).length;
      booleans.push({ field: f.key, label: f.label, true: trueCount, false: kkList.length - trueCount });
    } else if (f.type === "categorical") {
      distributions.push({ field: f.key, label: f.label, buckets: countByField(kkRecords, f.key) });
    } else if (f.type === "fillRate") {
      const filled = kkList.filter((k) => isFieldFilled((k as Record<string, unknown>)[f.key])).length;
      fillRates.push({
        field: f.key,
        label: f.label,
        filled,
        total: kkList.length,
        percent: kkList.length > 0 ? Math.round((filled / kkList.length) * 100) : 0,
      });
    }
  }

  let penghuniMismatch = 0;
  for (const k of kkList) {
    const actual = wargaByKk.get(k.id) ?? 0;
    if (k.jumlahPenghuni !== actual) penghuniMismatch++;
  }

  return {
    totalKk: kkList.length,
    distributions,
    booleans,
    fillRates,
    penghuniMismatch,
    penerimaBansos: kkList.filter((k) => k.penerimaBansos).length,
    layakBansos: kkList.filter((k) => k.layakBansos).length,
    kkEkonomiTerisi: kkList.filter((k) => k.penghasilanBulanan && k.penghasilanBulanan.trim() !== "").length,
  };
}

function calcAge(tanggalLahir: string | null | undefined): number | null {
  if (!tanggalLahir) return null;
  const birth = new Date(tanggalLahir);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** SSOT pengangguran — dipakai dashboard & snapshot bulanan. */
export function isPengangguran(w: Warga): boolean {
  const age = calcAge(w.tanggalLahir);
  if (age !== null && age < 18) return false;

  const st = (w.statusPekerjaan || "").trim();
  if (st === "Pelajar/Mahasiswa" || st === "Pensiun" || st === "Ibu Rumah Tangga") return false;
  if (st === "Mencari Kerja" || st === "Belum Bekerja") return true;
  if (["Bekerja", "Wiraswasta", "Pelaku Usaha", "Pekerja Lepas"].includes(st)) return false;

  if (isLegacyPekerjaanDiLuarAngkatanKerja(w.pekerjaan)) return false;
  return isLegacyPekerjaanPengangguran(w.pekerjaan);
}

export function buildLegacySummary(
  allKk: KartuKeluarga[],
  allWarga: Warga[],
  allKkForRt: KartuKeluarga[],
): KependudukanLegacySummary {
  const kkRtMap = new Map(allKkForRt.map((k) => [k.id, k.rt]));
  const rtList = [...ACTIVE_RT_NUMBERS];

  const countByField = (items: Warga[], field: keyof Warga): Record<string, number> => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const raw = item[field];
      const val =
        raw === null || raw === undefined || (typeof raw === "string" && String(raw).trim() === "")
          ? "Belum diisi"
          : String(raw);
      map[val] = (map[val] || 0) + 1;
    }
    return map;
  };

  const kelompokUsia: Record<string, number> = {
    "0-5": 0, "6-17": 0, "18-25": 0, "26-40": 0, "41-55": 0, "56-64": 0, "65+": 0,
  };
  for (const w of allWarga) {
    const age = calcAge(w.tanggalLahir);
    if (age === null) continue;
    if (age <= 5) kelompokUsia["0-5"]++;
    else if (age <= 17) kelompokUsia["6-17"]++;
    else if (age <= 25) kelompokUsia["18-25"]++;
    else if (age <= 40) kelompokUsia["26-40"]++;
    else if (age <= 55) kelompokUsia["41-55"]++;
    else if (age < 65) kelompokUsia["56-64"]++;
    else kelompokUsia["65+"]++;
  }

  const pekerjaanMap = countByField(allWarga, "pekerjaan");
  const pekerjaanSorted = Object.entries(pekerjaanMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const pekerjaan =
    pekerjaanSorted.length > 10
      ? [
          ...pekerjaanSorted.slice(0, 10),
          { name: "Lainnya", count: pekerjaanSorted.slice(10).reduce((s, p) => s + p.count, 0) },
        ]
      : pekerjaanSorted;

  const pengangguranWarga = allWarga.filter(isPengangguran);
  const pengangguranPerUsia: Record<string, number> = {};
  const pengangguranDaftar: { nama: string; usia: number | null; rt: number | null }[] = [];
  for (const w of pengangguranWarga) {
    const age = calcAge(w.tanggalLahir);
    let ageGroup = "Tidak Diketahui";
    if (age !== null) {
      if (age <= 25) ageGroup = "18-25";
      else if (age <= 40) ageGroup = "26-40";
      else if (age <= 55) ageGroup = "41-55";
      else ageGroup = "56+";
    }
    pengangguranPerUsia[ageGroup] = (pengangguranPerUsia[ageGroup] || 0) + 1;
    pengangguranDaftar.push({
      nama: w.namaLengkap,
      usia: age,
      rt: kkRtMap.get(w.kkId) ?? null,
    });
  }

  const waEligible = allWarga.filter((w) => getWargaAge(w.tanggalLahir) !== null && getWargaAge(w.tanggalLahir)! >= 16);
  const waRegistered = waEligible.filter((w) => w.nomorWhatsapp && w.nomorWhatsapp.trim() !== "").length;
  const literasiEligible = allWarga.filter((w) => needsLiterasi(getWargaAge(w.tanggalLahir)));
  const literasiFilled = literasiEligible.filter((w) => w.literasi && w.literasi.trim() !== "").length;
  const iloEligible = allWarga.filter((w) => needsStatusAngkatanKerja(getWargaAge(w.tanggalLahir)));
  const iloFilled = iloEligible.filter((w) => w.statusPekerjaan && w.statusPekerjaan.trim() !== "").length;
  const anak = allWarga.filter((w) => needsCrvsDocuments(getWargaAge(w.tanggalLahir)));
  const anakAkta = anak.filter((w) => w.punyaAktaLahir).length;
  const anakKia = anak.filter((w) => w.punyaKia).length;
  const anakSalahSatu = anak.filter((w) => w.punyaAktaLahir || w.punyaKia).length;
  const wgNeedDetail = allWarga.filter(
    (w) => w.statusDisabilitas && w.statusDisabilitas !== "Tidak Ada" && w.statusDisabilitas.trim() !== "",
  );
  const wgDetailOk = wgNeedDetail.filter(
    (w) => w.wgKesulitanMelihat?.trim() && w.wgKesulitanBerjalan?.trim(),
  ).length;

  const totalW = allWarga.length || 1;
  const totalK = allKk.length || 1;
  const penerimaBansos = allKk.filter((k) => k.penerimaBansos).length;

  const perRt = rtList.map((rt) => {
    const kkInRt = allKk.filter((k) => k.rt === rt);
    const wargaInRt = allWarga.filter((w) => kkRtMap.get(w.kkId) === rt);
    return {
      rt,
      kk: kkInRt.length,
      warga: wargaInRt.length,
      bansos: kkInRt.filter((k) => k.penerimaBansos).length,
      lakiLaki: wargaInRt.filter((w) => w.jenisKelamin === "Laki-laki").length,
      perempuan: wargaInRt.filter((w) => w.jenisKelamin === "Perempuan").length,
    };
  });

  return {
    totalKk: allKk.length,
    totalWarga: allWarga.length,
    jenisKelamin: countByField(allWarga, "jenisKelamin"),
    kelompokUsia,
    pendidikan: countByField(allWarga, "pendidikan"),
    pekerjaan,
    pengangguran: {
      total: pengangguranWarga.length,
      perUsia: pengangguranPerUsia,
      daftarNama: pengangguranDaftar,
    },
    bansos: { penerima: penerimaBansos, bukan: allKk.length - penerimaBansos },
    totalDisabilitas: allWarga.filter(
      (w) => w.statusDisabilitas && w.statusDisabilitas !== "Tidak Ada" && w.statusDisabilitas !== "",
    ).length,
    totalIbuHamil: allWarga.filter((w) => w.ibuHamil === true).length,
    totalLayakBansos: allKk.filter((k) => k.layakBansos === true).length,
    kkEkonomiTerisi: allKk.filter((k) => k.penghasilanBulanan && k.penghasilanBulanan.trim() !== "").length,
    kategoriEkonomi: (() => {
      const map: Record<string, number> = {};
      for (const k of allKk) {
        if (!k.kategoriEkonomi || k.kategoriEkonomi.trim() === "") continue;
        map[k.kategoriEkonomi] = (map[k.kategoriEkonomi] || 0) + 1;
      }
      return map;
    })(),
    literasi: countByField(literasiEligible, "literasi"),
    statusPekerjaan: countByField(iloEligible, "statusPekerjaan"),
    capaian: {
      waPercent: waEligible.length ? Math.round((waRegistered / waEligible.length) * 100) : 0,
      bansosPercent: Math.round((penerimaBansos / totalK) * 100),
      literasiPercent: literasiEligible.length
        ? Math.round((literasiFilled / literasiEligible.length) * 100)
        : 0,
      iloPercent: iloEligible.length ? Math.round((iloFilled / iloEligible.length) * 100) : 0,
      crvsPercent: anak.length ? Math.round((anakSalahSatu / anak.length) * 100) : 0,
      wgDetailPercent: wgNeedDetail.length ? Math.round((wgDetailOk / wgNeedDetail.length) * 100) : 100,
    },
    crvs: { anak: anak.length, punyaAkta: anakAkta, punyaKia: anakKia, punyaSalahSatu: anakSalahSatu },
    peristiwa: countPeristiwaKependudukan(allWarga),
    perRt,
    rtList,
  };
}

export function buildKependudukanStats(
  allKk: KartuKeluarga[],
  allWarga: Warga[],
  allKkForRt: KartuKeluarga[],
  rtFilter?: number,
): KependudukanStats {
  const legacy = buildLegacySummary(allKk, allWarga, allKkForRt);
  const sections = WARGA_FORM_SECTIONS.map((s) => aggregateSection(s, allWarga));

  const wargaByKk = new Map<number, number>();
  for (const w of allWarga) {
    wargaByKk.set(w.kkId, (wargaByKk.get(w.kkId) ?? 0) + 1);
  }

  const qualityBySection = sections.map((s) => ({
    key: s.key,
    title: s.title,
    fillPercent: s.sectionFillPercent,
  }));

  return {
    generatedAt: new Date().toISOString(),
    rtFilter,
    totals: { kk: allKk.length, warga: allWarga.length },
    legacy,
    kk: aggregateKk(allKk, wargaByKk),
    sections,
    qualityBySection,
  };
}

export function matchSegmentFilter(
  w: Warga,
  sectionKey: string,
  field: string,
  value: string,
  kkRtMap: Map<number, number>,
  nomorKkMap: Map<number, string>,
): boolean {
  if (sectionKey === "derived" && field === "pengangguran") {
    return value === "ya" ? isPengangguran(w) : !isPengangguran(w);
  }

  if (!isWargaEligibleForAnalyticsField(w, field) && field !== "pengangguran") {
    return false;
  }

  const raw = (w as Record<string, unknown>)[field];
  if (value === "__filled__") return isFieldFilled(raw);
  if (value === "__empty__") return !isFieldFilled(raw);
  if (value === "true") return raw === true;
  if (value === "false") return raw === false;

  const str =
    raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "")
      ? "Belum diisi"
      : String(raw);
  return str === value;
}

export function buildSegmentRows(
  allWarga: Warga[],
  allKk: KartuKeluarga[],
  sectionKey: string,
  field: string,
  value: string,
  rtFilter?: number,
): SegmentRow[] {
  const kkRtMap = new Map(allKk.map((k) => [k.id, k.rt]));
  const nomorKkMap = new Map(allKk.map((k) => [k.id, k.nomorKk]));

  return allWarga
    .filter((w) => {
      if (rtFilter && kkRtMap.get(w.kkId) !== rtFilter) return false;
      return matchSegmentFilter(w, sectionKey, field, value, kkRtMap, nomorKkMap);
    })
    .map((w) => ({
      wargaId: w.id,
      namaLengkap: w.namaLengkap,
      nik: w.nik,
      rt: kkRtMap.get(w.kkId) ?? null,
      kkId: w.kkId,
      nomorKk: nomorKkMap.get(w.kkId) ?? null,
      fieldValue: field === "pengangguran" ? (w.pekerjaan ?? null) : String((w as Record<string, unknown>)[field] ?? ""),
    }))
    .sort((a, b) => a.namaLengkap.localeCompare(b.namaLengkap, "id"));
}

export { topBuckets };
