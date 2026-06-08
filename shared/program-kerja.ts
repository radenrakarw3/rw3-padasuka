export type PilarProgram = "infrastruktur" | "digitalisasi" | "ekonomi";

export type SubProgramSlug =
  | "audit-drainase"
  | "sumur-resapan"
  | "paving-marka"
  | "sensus-digital"
  | "registrasi-properti"
  | "portal-pelaporan"
  | "storefront-makeover"
  | "kampung-umkm"
  | "ekonomi-sirkular";

export const PILAR_PROGRAM_OPTIONS: PilarProgram[] = [
  "infrastruktur",
  "digitalisasi",
  "ekonomi",
];

export const pilarProgramLabels: Record<PilarProgram, string> = {
  infrastruktur: "Infrastruktur & Ketahanan Lingkungan",
  digitalisasi: "Digitalisasi & Tata Kelola Demografi",
  ekonomi: "Pemberdayaan Ekonomi & Placemaking",
};

export const pilarProgramFokus: Record<PilarProgram, string> = {
  infrastruktur: "Wilayah Bebas Banjir dan Genangan",
  digitalisasi: "Wilayah Terdata (Data-Driven Neighborhood)",
  ekonomi: "Kampung UMKM dan Permak Interior",
};

export const visiProgramRw =
  "Mewujudkan Kawasan Permukiman yang Berketahanan, Terintegrasi Secara Digital, dan Mandiri Secara Ekonomi Melalui Pendekatan Inovasi Ruang (Placemaking).";

export type SubProgramDef = {
  slug: SubProgramSlug;
  pilar: PilarProgram;
  nama: string;
  deskripsi: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export const SUB_PROGRAM_DEFS: SubProgramDef[] = [
  {
    slug: "audit-drainase",
    pilar: "infrastruktur",
    nama: "Audit & Pemetaan Tata Air",
    deskripsi:
      "Inspeksi jaringan drainase untuk mengidentifikasi titik buta dan area rawan genangan.",
    ctaHref: "/lapor",
    ctaLabel: "Laporkan genangan",
  },
  {
    slug: "sumur-resapan",
    pilar: "infrastruktur",
    nama: "Sistem Resapan Terintegrasi",
    deskripsi:
      "Pembangunan sumur resapan dan biopori massal untuk menahan debit air permukaan.",
  },
  {
    slug: "paving-marka",
    pilar: "infrastruktur",
    nama: "Revitalisasi Permukaan & Marka",
    deskripsi:
      "Perbaikan jalan lingkungan dengan material berdaya serap tinggi dan marka jalan tertata.",
  },
  {
    slug: "sensus-digital",
    pilar: "digitalisasi",
    nama: "Sensus Kependudukan Digital",
    deskripsi:
      "Pendataan profil demografi, status sosial-ekonomi, dan keahlian SDM warga domisili.",
    ctaHref: "/program/transparansi",
    ctaLabel: "Lihat capaian",
  },
  {
    slug: "registrasi-properti",
    pilar: "digitalisasi",
    nama: "Inventarisasi Properti & Registrasi Pendatang",
    deskripsi:
      "Pendataan wajib pemilik aset komersial dan pencatatan identitas penyewa secara berkala.",
    ctaHref: "/visitrw3",
    ctaLabel: "Visit RW3",
  },
  {
    slug: "portal-pelaporan",
    pilar: "digitalisasi",
    nama: "Sistem Pelaporan Terpadu",
    deskripsi:
      "Portal layanan warga untuk pelaporan fasilitas umum dengan respons cepat pengurus.",
    ctaHref: "/lapor",
    ctaLabel: "Laporkan masalah",
  },
  {
    slug: "storefront-makeover",
    pilar: "ekonomi",
    nama: "Revitalisasi Visual UMKM",
    deskripsi:
      "Standardisasi dan perbaikan estetika fasad, etalase, dan interior unit usaha warga.",
    ctaHref: "/kampung-umkm",
    ctaLabel: "Kampung UMKM",
  },
  {
    slug: "kampung-umkm",
    pilar: "ekonomi",
    nama: "Aktivasi Kampung UMKM",
    deskripsi:
      "Integrasi unit usaha warga menjadi destinasi komersial lokal yang layak kunjung.",
    ctaHref: "/kampung-umkm",
    ctaLabel: "Jelajahi Kampung UMKM",
  },
  {
    slug: "ekonomi-sirkular",
    pilar: "ekonomi",
    nama: "Pengembangan Ekonomi Sirkular",
    deskripsi:
      "Rantai pasok internal antar pelaku usaha dan partisipasi penghuni kos sebagai konsumen aktif.",
    ctaHref: "/kampung-umkm",
    ctaLabel: "Dukung usaha tetangga",
  },
];

export function getSubProgramDef(slug: string): SubProgramDef | undefined {
  return SUB_PROGRAM_DEFS.find((s) => s.slug === slug);
}

export function getSubProgramsByPilar(pilar: PilarProgram): SubProgramDef[] {
  return SUB_PROGRAM_DEFS.filter((s) => s.pilar === pilar);
}

export const statusProgramKerjaLabels: Record<string, string> = {
  rencana: "Rencana",
  berjalan: "Berjalan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const subJenisInfrastrukturOptions = [
  { value: "drainase", label: "Drainase" },
  { value: "genangan", label: "Genangan air" },
  { value: "penerangan", label: "Penerangan jalan" },
  { value: "jalan", label: "Kondisi jalan" },
  { value: "sampah", label: "Persampahan" },
] as const;

export type SubJenisInfrastruktur = (typeof subJenisInfrastrukturOptions)[number]["value"];

export const statusProyekInfrastrukturLabels: Record<string, string> = {
  inventaris: "Inventaris",
  rencana: "Rencana",
  berjalan: "Berjalan",
  selesai: "Selesai",
};

export const statusMakeoverLabels: Record<string, string> = {
  belum_dinilai: "Belum dinilai",
  perlu_renovasi: "Perlu renovasi",
  sedang_dikerjakan: "Sedang dikerjakan",
  selesai: "Selesai",
};

export function formatLaporanRef(id: number): string {
  return `LAP-${id}`;
}

export function parseLaporanRef(ref: string): number | null {
  const m = ref.trim().toUpperCase().match(/^LAP-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function calcProgressPercent(target?: number | null, capaian?: number | null): number {
  if (!target || target <= 0) return 0;
  const c = capaian ?? 0;
  return Math.min(100, Math.round((c / target) * 100));
}
