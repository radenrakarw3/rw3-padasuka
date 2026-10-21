/**
 * Data kendaraan penghuni Visit RW3 / RW3 Biz.
 * Disimpan sebagai JSON array di kolom `jenis_kendaraan`; baris lama bisa berupa teks biasa
 * (satu kendaraan) atau array `{ jenis, platNomor }` tanpa status kepemilikan.
 */

export const STATUS_KENDARAAN = [
  { value: "lunas", label: "Milik sendiri, sudah lunas", singkat: "Lunas" },
  { value: "cicilan", label: "Milik sendiri, masih cicilan/kredit", singkat: "Masih cicilan" },
  { value: "keluarga", label: "Milik keluarga / orang lain (dipinjam)", singkat: "Milik keluarga/orang lain" },
  { value: "kantor", label: "Kendaraan kantor / dinas", singkat: "Kendaraan kantor" },
  { value: "sewa", label: "Sewa / rental", singkat: "Sewa" },
] as const;

export type StatusKendaraan = (typeof STATUS_KENDARAAN)[number]["value"];

export type KendaraanData = {
  jenis: string;
  platNomor: string | null;
  merek?: string | null;
  warna?: string | null;
  status?: StatusKendaraan | null;
  /** Nama pemilik yang tertulis di STNK. */
  atasNama?: string | null;
  /** Nama leasing/finance (khusus cicilan). */
  leasing?: string | null;
  /** Perkiraan lunas, format YYYY-MM (khusus cicilan). */
  lunasPada?: string | null;
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export function formatBulanTahun(ym?: string | null): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym?.trim() ?? "");
  if (!m) return ym?.trim() || "-";
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx < 12 ? `${BULAN[idx]} ${m[1]}` : ym!.trim();
}

/** YYYY-MM bulan berjalan (WIB). */
export function bulanIni(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).slice(0, 7);
}

export function isStatusKendaraan(v: unknown): v is StatusKendaraan {
  return STATUS_KENDARAAN.some((s) => s.value === v);
}

export function labelStatusKendaraan(v?: string | null): string {
  return STATUS_KENDARAAN.find((s) => s.value === v)?.singkat ?? "Status belum diisi";
}

function teks(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function parseKendaraan(jenisKendaraan?: string | null, platNomor?: string | null): KendaraanData[] {
  const raw = jenisKendaraan?.trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((k): k is Record<string, unknown> => Boolean(k) && typeof k === "object")
          .map((k) => ({
            jenis: teks(k.jenis) ?? "",
            platNomor: teks(k.platNomor),
            merek: teks(k.merek),
            warna: teks(k.warna),
            status: isStatusKendaraan(k.status) ? k.status : null,
            atasNama: teks(k.atasNama),
            leasing: teks(k.leasing),
            lunasPada: teks(k.lunasPada),
          }))
          .filter((k) => k.jenis);
      }
    } catch {
      /* teks biasa */
    }
  }
  return [{ jenis: raw, platNomor: platNomor?.trim() || null }];
}

export function serializeKendaraan(list: KendaraanData[]): string | null {
  if (!list.length) return null;
  return JSON.stringify(
    list.map((k) => ({
      jenis: k.jenis.trim(),
      platNomor: k.platNomor?.trim() || null,
      merek: k.merek?.trim() || null,
      warna: k.warna?.trim() || null,
      status: k.status ?? null,
      atasNama: k.atasNama?.trim() || null,
      leasing: k.status === "cicilan" ? k.leasing?.trim() || null : null,
      lunasPada: k.status === "cicilan" ? k.lunasPada?.trim() || null : null,
    })),
  );
}

const PLAT_REGEX = /^[A-Z]{1,3} \d{1,5} [A-Z]{1,4}$/;

/** Sepeda tidak punya plat nomor. */
export function kendaraanBerplat(jenis: string | null | undefined): boolean {
  return jenis?.trim().toLowerCase() !== "sepeda";
}

/**
 * Validasi pengajuan baru: pemohon cukup mengisi jenis + plat.
 * Merek, warna, status kepemilikan, dan nama di STNK dicocokkan petugas saat survey.
 */
export function validateKendaraan(k: KendaraanData, no: number): string | null {
  const ke = `kendaraan #${no}`;
  if (!k.jenis?.trim()) return `Pilih jenis ${ke}`;
  if (!kendaraanBerplat(k.jenis)) return null;
  const plat = k.platNomor?.trim().toUpperCase() ?? "";
  if (!plat) return `Lengkapi plat nomor ${ke}`;
  if (!PLAT_REGEX.test(plat)) return `Plat nomor ${ke} harus kode daerah, nomor, dan akhiran (contoh D 1234 ABC)`;
  return null;
}

/** Satu baris ringkas untuk admin, ringkasan form, dan surat cetak. */
export function formatKendaraanBaris(k: KendaraanData): string {
  const unit = [k.jenis, k.merek].filter(Boolean).join(" ");
  const bagian = [unit || "Kendaraan"];
  if (k.warna) bagian.push(k.warna);
  if (k.platNomor) bagian.push(k.platNomor);
  let s = bagian.join(", ");
  if (k.status) {
    let status = labelStatusKendaraan(k.status);
    if (k.status === "cicilan") {
      const rinci = [k.leasing, k.lunasPada ? `lunas ${formatBulanTahun(k.lunasPada)}` : null].filter(Boolean).join(", ");
      if (rinci) status += ` (${rinci})`;
    }
    s += `. ${status}`;
  }
  if (k.atasNama) s += `. STNK a.n. ${k.atasNama}`;
  return s;
}
