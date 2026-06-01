/** Estimasi kontribusi Visit RW3 — tarif berjenjang (ukuran & jenis). */

export function hitungTanggalBerlaku(tanggalBayar: string, terminBulan: number): string {
  const d = new Date(`${tanggalBayar}T00:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error("Tanggal bayar tidak valid");
  d.setMonth(d.getMonth() + terminBulan);
  return d.toISOString().split("T")[0];
}

export type UkuranProperti = "kecil" | "sedang" | "besar";

export type KontribusiRincian = {
  jenis: string;
  label: string;
  kelompok?: string;
  ukuranProperti?: UkuranProperti;
  jumlahHari?: number;
  terminBulan?: number;
  tarifSatuan: number;
  satuanLabel: string;
  total: number;
};

export type KontribusiSettings = {
  tierPintuSedangMin: number;
  tierPintuBesarMin: number;
  feeBisnisLapakPerHari: number;
  feeBisnisKioskPerHari: number;
  feeBisnisLainPerHari: number;
  feeKostKecilPerUnitBulan: number;
  feeKostSedangPerUnitBulan: number;
  feeKostBesarPerUnitBulan: number;
  feeKontrakanKecilPerUnitBulan: number;
  feeKontrakanSedangPerUnitBulan: number;
  feeKontrakanBesarPerUnitBulan: number;
  feePemilikLapakPerBulan: number;
  feePemilikKioskPerBulan: number;
  feePemilikKostKecilPerBulan: number;
  feePemilikKostSedangPerBulan: number;
  feePemilikKostBesarPerBulan: number;
  feePemilikKontrakanKecilPerBulan: number;
  feePemilikKontrakanSedangPerBulan: number;
  feePemilikKontrakanBesarPerBulan: number;
};

function intVal(map: Record<string, string>, key: string, fallback: number): number {
  const n = parseInt(map[key] ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** @deprecated gunakan parseKontribusiSettings */
export type Visitrw3Tarif = {
  feeBisnisPerHari: number;
  feeKostPerUnitBulan: number;
  feeKontrakanPerUnitBulan: number;
  feePemilikPerBulan: number;
};

export function parseKontribusiSettings(rows: { key: string; value: string }[]): KontribusiSettings {
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const legacyBisnis = intVal(map, "fee_bisnis_per_hari", 5000);
  const legacyKost = intVal(map, "fee_kost_per_unit_bulan", 10000);
  const legacyKontrakan = intVal(map, "fee_kontrakan_per_unit_bulan", 15000);
  const legacyPemilik = intVal(map, "fee_pemilik_per_bulan", 50000);

  return {
    tierPintuSedangMin: intVal(map, "tier_pintu_sedang_min", 6),
    tierPintuBesarMin: intVal(map, "tier_pintu_besar_min", 16),
    feeBisnisLapakPerHari: intVal(map, "fee_bisnis_lapak_per_hari", 3000),
    feeBisnisKioskPerHari: intVal(map, "fee_bisnis_kiosk_per_hari", legacyBisnis),
    feeBisnisLainPerHari: intVal(map, "fee_bisnis_lain_per_hari", 8000),
    feeKostKecilPerUnitBulan: intVal(map, "fee_kost_kecil_per_unit_bulan", Math.round(legacyKost * 0.8)),
    feeKostSedangPerUnitBulan: intVal(map, "fee_kost_sedang_per_unit_bulan", legacyKost),
    feeKostBesarPerUnitBulan: intVal(map, "fee_kost_besar_per_unit_bulan", Math.round(legacyKost * 1.2)),
    feeKontrakanKecilPerUnitBulan: intVal(map, "fee_kontrakan_kecil_per_unit_bulan", Math.round(legacyKontrakan * 0.8)),
    feeKontrakanSedangPerUnitBulan: intVal(map, "fee_kontrakan_sedang_per_unit_bulan", legacyKontrakan),
    feeKontrakanBesarPerUnitBulan: intVal(map, "fee_kontrakan_besar_per_unit_bulan", Math.round(legacyKontrakan * 1.2)),
    feePemilikLapakPerBulan: intVal(map, "fee_pemilik_lapak_per_bulan", 30000),
    feePemilikKioskPerBulan: intVal(map, "fee_pemilik_kiosk_per_bulan", 35000),
    feePemilikKostKecilPerBulan: intVal(map, "fee_pemilik_kost_kecil_per_bulan", Math.round(legacyPemilik * 0.8)),
    feePemilikKostSedangPerBulan: intVal(map, "fee_pemilik_kost_sedang_per_bulan", legacyPemilik),
    feePemilikKostBesarPerBulan: intVal(map, "fee_pemilik_kost_besar_per_bulan", Math.round(legacyPemilik * 1.3)),
    feePemilikKontrakanKecilPerBulan: intVal(map, "fee_pemilik_kontrakan_kecil_per_bulan", Math.round(legacyPemilik * 0.9)),
    feePemilikKontrakanSedangPerBulan: intVal(map, "fee_pemilik_kontrakan_sedang_per_bulan", Math.round(legacyPemilik * 1.1)),
    feePemilikKontrakanBesarPerBulan: intVal(map, "fee_pemilik_kontrakan_besar_per_bulan", Math.round(legacyPemilik * 1.4)),
  };
}

/** @deprecated */
export function parseTarifFromSettings(rows: { key: string; value: string }[]): Visitrw3Tarif {
  const s = parseKontribusiSettings(rows);
  return {
    feeBisnisPerHari: s.feeBisnisKioskPerHari,
    feeKostPerUnitBulan: s.feeKostSedangPerUnitBulan,
    feeKontrakanPerUnitBulan: s.feeKontrakanSedangPerUnitBulan,
    feePemilikPerBulan: s.feePemilikKostSedangPerBulan,
  };
}

export function getUkuranProperti(
  jumlahPintu: number,
  settings: Pick<KontribusiSettings, "tierPintuSedangMin" | "tierPintuBesarMin">,
): UkuranProperti {
  const n = Math.max(1, jumlahPintu);
  if (n >= settings.tierPintuBesarMin) return "besar";
  if (n >= settings.tierPintuSedangMin) return "sedang";
  return "kecil";
}

export function labelUkuranProperti(
  ukuran: UkuranProperti,
  settings: Pick<KontribusiSettings, "tierPintuSedangMin" | "tierPintuBesarMin">,
): string {
  if (ukuran === "kecil") return `kecil (1–${settings.tierPintuSedangMin - 1} pintu)`;
  if (ukuran === "sedang") {
    return `sedang (${settings.tierPintuSedangMin}–${settings.tierPintuBesarMin - 1} pintu)`;
  }
  return `besar (${settings.tierPintuBesarMin}+ pintu)`;
}

function feeBisnisPerHari(
  jenisTempatUsaha: string | null | undefined,
  settings: KontribusiSettings,
): number {
  if (jenisTempatUsaha === "lapak") return settings.feeBisnisLapakPerHari;
  if (jenisTempatUsaha === "kiosk") return settings.feeBisnisKioskPerHari;
  if (jenisTempatUsaha === "lainnya") return settings.feeBisnisLainPerHari;
  return settings.feeBisnisKioskPerHari;
}

function feeTinggalPerUnitBulan(
  jenisProperti: string | null | undefined,
  ukuran: UkuranProperti,
  settings: KontribusiSettings,
): number {
  const isKontrakan = jenisProperti === "kontrakan";
  if (isKontrakan) {
    if (ukuran === "besar") return settings.feeKontrakanBesarPerUnitBulan;
    if (ukuran === "sedang") return settings.feeKontrakanSedangPerUnitBulan;
    return settings.feeKontrakanKecilPerUnitBulan;
  }
  if (ukuran === "besar") return settings.feeKostBesarPerUnitBulan;
  if (ukuran === "sedang") return settings.feeKostSedangPerUnitBulan;
  return settings.feeKostKecilPerUnitBulan;
}

export function diffDaysInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(0, days);
}

export function hitungEstimasiPenyewa(params: {
  keperluan: "tinggal" | "bisnis";
  jenisProperti?: string | null;
  jenisTempatUsaha?: string | null;
  jumlahPintu?: number | null;
  tanggalBayar: string;
  tanggalBerlakuSampai: string;
  terminBulan: number;
  settings: KontribusiSettings;
}): KontribusiRincian | null {
  const {
    keperluan,
    jenisProperti,
    jenisTempatUsaha,
    jumlahPintu,
    tanggalBayar,
    tanggalBerlakuSampai,
    terminBulan,
    settings,
  } = params;

  if (keperluan === "bisnis") {
    if (!jenisTempatUsaha) return null;
    const jumlahHari = diffDaysInclusive(tanggalBayar, tanggalBerlakuSampai);
    const tarifSatuan = feeBisnisPerHari(jenisTempatUsaha, settings);
    const jenisLabel =
      jenisTempatUsaha === "lapak" ? "lapak" : jenisTempatUsaha === "kiosk" ? "kiosk" : "usaha lain";
    return {
      jenis: "bisnis",
      label: `Kontribusi bisnis (${jenisLabel})`,
      kelompok: `Tarif ${jenisLabel} — per hari`,
      jumlahHari,
      tarifSatuan,
      satuanLabel: "hari",
      total: jumlahHari * tarifSatuan,
    };
  }

  const pintu = jumlahPintu ?? 1;
  const ukuran = getUkuranProperti(pintu, settings);
  const tarifSatuan = feeTinggalPerUnitBulan(jenisProperti, ukuran, settings);
  const jenisLabel = jenisProperti === "kontrakan" ? "kontrakan" : "kost";
  return {
    jenis: jenisLabel,
    label: `Kontribusi ${jenisLabel} (per unit/bulan)`,
    kelompok: `Properti ${labelUkuranProperti(ukuran, settings)} · ${pintu} pintu terdaftar`,
    ukuranProperti: ukuran,
    terminBulan,
    tarifSatuan,
    satuanLabel: "bulan",
    total: terminBulan * tarifSatuan,
  };
}

export function hitungEstimasiPemilik(params: {
  jenisProperti: string;
  jumlahPintu: number;
  settings: KontribusiSettings;
}): KontribusiRincian {
  const { jenisProperti, jumlahPintu, settings } = params;
  const pintu = Math.max(1, jumlahPintu);

  if (jenisProperti === "lapak") {
    return {
      jenis: "pemilik",
      label: "Kontribusi pemilik lapak",
      kelompok: "Lapak / gerai kecil",
      terminBulan: 1,
      tarifSatuan: settings.feePemilikLapakPerBulan,
      satuanLabel: "bulan",
      total: settings.feePemilikLapakPerBulan,
    };
  }
  if (jenisProperti === "kiosk") {
    return {
      jenis: "pemilik",
      label: "Kontribusi pemilik kiosk",
      kelompok: "Kiosk",
      terminBulan: 1,
      tarifSatuan: settings.feePemilikKioskPerBulan,
      satuanLabel: "bulan",
      total: settings.feePemilikKioskPerBulan,
    };
  }

  const ukuran = getUkuranProperti(pintu, settings);
  const isKontrakan = jenisProperti === "kontrakan";
  let tarifSatuan: number;
  if (isKontrakan) {
    if (ukuran === "besar") tarifSatuan = settings.feePemilikKontrakanBesarPerBulan;
    else if (ukuran === "sedang") tarifSatuan = settings.feePemilikKontrakanSedangPerBulan;
    else tarifSatuan = settings.feePemilikKontrakanKecilPerBulan;
  } else {
    if (ukuran === "besar") tarifSatuan = settings.feePemilikKostBesarPerBulan;
    else if (ukuran === "sedang") tarifSatuan = settings.feePemilikKostSedangPerBulan;
    else tarifSatuan = settings.feePemilikKostKecilPerBulan;
  }

  const jenisLabel = isKontrakan ? "kontrakan" : "kost";
  return {
    jenis: "pemilik",
    label: `Kontribusi pemilik ${jenisLabel}`,
    kelompok: `${jenisLabel} ${labelUkuranProperti(ukuran, settings)} · ${pintu} pintu`,
    ukuranProperti: ukuran,
    terminBulan: 1,
    tarifSatuan,
    satuanLabel: "bulan",
    total: tarifSatuan,
  };
}
