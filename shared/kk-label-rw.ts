/**
 * Tag internal KK (kolom `label_rw` — JSON array string).
 * Hanya untuk admin/ketua RW: menilai kondisi keluarga & menandai tindak lanjut.
 */

export type KkTagKategoriId =
  | "tindakan"
  | "ekonomi"
  | "kesehatan"
  | "sosial"
  | "ketertiban"
  | "kependudukan"
  | "hunian"
  | "pendidikan"
  | "proses";

export type KkTagKategori = {
  id: KkTagKategoriId;
  label: string;
  deskripsi: string;
  /** Warna badge Tailwind-ish hint untuk UI */
  tone: "amber" | "rose" | "emerald" | "sky" | "violet" | "slate" | "orange" | "teal";
  tags: readonly string[];
};

/** Katalog tag — banyak pilihan per kategori agar mudah menilai & menandai rencana. */
export const KK_TAG_KATEGORI: readonly KkTagKategori[] = [
  {
    id: "tindakan",
    label: "Tindakan saya",
    deskripsi: "Apa yang akan / sedang dikerjakan untuk keluarga ini",
    tone: "amber",
    tags: [
      "Perlu kunjungan rumah",
      "Kunjungan ulang",
      "Follow-up WhatsApp",
      "Telepon kepala keluarga",
      "Jadwalkan mediasi RT/RW",
      "Kirim bantuan logistik",
      "Ajukan ke program kelurahan",
      "Dampingi ke puskesmas",
      "Dampingi ke Dinas Sosial",
      "Panggil ke sekretariat RW",
      "Koordinasi dengan Ketua RT",
      "Catat untuk musyawarah RW",
      "Prioritas blusukan minggu ini",
      "Tunda — pantau dulu",
    ],
  },
  {
    id: "ekonomi",
    label: "Ekonomi & bansos",
    deskripsi: "Kondisi ekonomi dan kelayakan bantuan",
    tone: "orange",
    tags: [
      "Prioritas bansos",
      "Calon penerima bansos",
      "Sudah terima bansos",
      "Bansos bermasalah / salah sasaran",
      "Keluarga pra-sejahtera",
      "Penghasilan tidak menentu",
      "Kehilangan pekerjaan",
      "Utang / kesulitan keuangan",
      "Usaha informal / warung",
      "Butuh modal usaha kecil",
      "Layak dicek ulang ekonomi",
    ],
  },
  {
    id: "kesehatan",
    label: "Kesehatan",
    deskripsi: "Isu kesehatan anggota keluarga",
    tone: "rose",
    tags: [
      "Butuh bantuan kesehatan",
      "Anggota sakit kronis",
      "Disabilitas",
      "Lansia rentan",
      "Ibu hamil / nifas",
      "Balita gizi perlu pantau",
      "Tanpa BPJS / asuransi",
      "Perlu rujukan medis",
      "Kesehatan jiwa / trauma",
    ],
  },
  {
    id: "sosial",
    label: "Sosial & kerentanan",
    deskripsi: "Kerentanan sosial di luar ekonomi murni",
    tone: "violet",
    tags: [
      "Keluarga rentan",
      "Single parent",
      "Anak yatim / piatu",
      "Korban bencana / kebakaran",
      "Korban KDRT — pantau",
      "Konflik tetangga",
      "Isolasi sosial",
      "Perlu dukungan komunitas",
      "Keluarga baru pindah masuk",
    ],
  },
  {
    id: "ketertiban",
    label: "Ketertiban & keamanan",
    deskripsi: "Isu ketertiban di unit / lingkungan",
    tone: "slate",
    tags: [
      "Laporan warga masuk",
      "Peringatan lisan sudah diberikan",
      "SP / teguran tertulis",
      "Dugaan asusila — pantau",
      "Kebisingan / keributan",
      "Sampah / lingkungan kotor",
      "Parkir mengganggu",
      "Tamu bermasalah",
      "Koordinasi dengan Linmas",
      "Koordinasi dengan polisi",
    ],
  },
  {
    id: "kependudukan",
    label: "Data kependudukan",
    deskripsi: "Kelengkapan dan kualitas data KK/warga",
    tone: "sky",
    tags: [
      "Data belum lengkap",
      "NIK bermasalah",
      "KK belum update",
      "Belum ada WhatsApp valid",
      "Foto / dokumen kurang",
      "Perlu verifikasi lapangan",
      "Double data / duplikat",
      "Anggota belum tercatat",
      "Status kependudukan perlu dicek",
    ],
  },
  {
    id: "hunian",
    label: "Hunian & lingkungan",
    deskripsi: "Kondisi rumah dan fasilitas",
    tone: "teal",
    tags: [
      "Rumah tidak layak huni",
      "Kontrakan / kost padat",
      "Sanitasi buruk",
      "Tanpa air bersih memadai",
      "Listrik bermasalah",
      "Rawan banjir / longsor",
      "Perlu bedah rumah",
      "Sewa akan habis",
    ],
  },
  {
    id: "pendidikan",
    label: "Pendidikan & anak",
    deskripsi: "Anak sekolah dan pendidikan",
    tone: "emerald",
    tags: [
      "Anak putus sekolah",
      "Anak usia sekolah belum sekolah",
      "Butuh beasiswa / PIP",
      "Anak berkebutuhan khusus",
      "Pengasuhan kurang",
      "Remaja perlu pendampingan",
    ],
  },
  {
    id: "proses",
    label: "Status proses",
    deskripsi: "Progress penanganan oleh pengurus",
    tone: "slate",
    tags: [
      "Baru ditandai",
      "Sedang diproses",
      "Menunggu respons warga",
      "Menunggu pihak ketiga",
      "Sudah ditangani — pantau",
      "Selesai / tutup kasus",
      "Tidak perlu tindak lanjut",
      "Arsip — referensi saja",
    ],
  },
] as const;

const TAG_SET = new Set(KK_TAG_KATEGORI.flatMap((k) => [...k.tags]));
const TAG_TO_KATEGORI = new Map<string, KkTagKategoriId>();
for (const k of KK_TAG_KATEGORI) {
  for (const t of k.tags) TAG_TO_KATEGORI.set(t, k.id);
}

/** Semua tag katalog (urutan kategori). */
export const KK_TAG_SEMUA: readonly string[] = KK_TAG_KATEGORI.flatMap((k) => [...k.tags]);

/** @deprecated gunakan KK_TAG_SEMUA / KK_TAG_KATEGORI */
export const kkLabelRwSuggestions = KK_TAG_SEMUA;

export function kategoriTag(tag: string): KkTagKategori | undefined {
  const id = TAG_TO_KATEGORI.get(tag);
  return id ? KK_TAG_KATEGORI.find((k) => k.id === id) : undefined;
}

export function isTagKatalog(tag: string): boolean {
  return TAG_SET.has(tag);
}

export function parseKkLabelRw(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const x of parsed) {
      if (typeof x !== "string") continue;
      const t = x.trim().slice(0, 80);
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeKkLabelRw(tags: string[]): string | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const t = raw.trim().slice(0, 80);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length ? JSON.stringify(out) : null;
}

/** Validasi string JSON label_rw saat PATCH. */
export function validateKkLabelRwRaw(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return "label_rw harus array JSON";
    if (parsed.length > 40) return "Maksimal 40 tag per KK";
    for (const x of parsed) {
      if (typeof x !== "string" || !x.trim()) return "Setiap tag harus teks non-kosong";
      if (x.trim().length > 80) return "Tag maksimal 80 karakter";
    }
    return null;
  } catch {
    return "label_rw bukan JSON valid";
  }
}

export type KkTagCount = { tag: string; kategoriId: KkTagKategoriId | "lainnya"; jumlah: number };

/** Hitung frekuensi tag dari daftar KK (untuk panel kependudukan). */
export function hitungTagKk(
  daftar: { id: number; labelRw?: string | null }[],
): { totalKkBertag: number; byTag: KkTagCount[]; byKategori: { id: KkTagKategoriId | "lainnya"; label: string; jumlahKk: number }[] } {
  const tagCount = new Map<string, number>();
  let totalKkBertag = 0;
  const kategoriKk = new Map<string, Set<number>>();

  for (const kk of daftar) {
    const tags = parseKkLabelRw(kk.labelRw);
    if (!tags.length) continue;
    totalKkBertag++;
    for (const t of tags) {
      tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
      const kid = TAG_TO_KATEGORI.get(t) ?? "lainnya";
      if (!kategoriKk.has(kid)) kategoriKk.set(kid, new Set());
      kategoriKk.get(kid)!.add(kk.id);
    }
  }

  const byTag: KkTagCount[] = [...tagCount.entries()]
    .map(([tag, jumlah]) => ({
      tag,
      kategoriId: (TAG_TO_KATEGORI.get(tag) ?? "lainnya") as KkTagKategoriId | "lainnya",
      jumlah,
    }))
    .sort((a, b) => b.jumlah - a.jumlah || a.tag.localeCompare(b.tag, "id"));

  const byKategori = [
    ...KK_TAG_KATEGORI.map((k) => ({
      id: k.id as KkTagKategoriId | "lainnya",
      label: k.label,
      jumlahKk: kategoriKk.get(k.id)?.size ?? 0,
    })),
    {
      id: "lainnya" as const,
      label: "Lainnya / kustom",
      jumlahKk: kategoriKk.get("lainnya")?.size ?? 0,
    },
  ].filter((x) => x.jumlahKk > 0 || x.id !== "lainnya");

  return { totalKkBertag, byTag, byKategori };
}
