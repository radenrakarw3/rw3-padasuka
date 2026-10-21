import { useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  BedDouble, Building2, Camera, Car, ChevronRight, EyeOff, HelpCircle, ImageIcon, Loader2, Lock, Megaphone, PawPrint, Scale, ShieldAlert,
  Store, Trash2, UserCheck, Volume2, X, type LucideIcon,
} from "lucide-react";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { cn } from "@/lib/utils";
import {
  MAKS_FOTO_ADUAN, MODE_IDENTITAS_INFO, PRIORITAS_ADUAN_LABEL, STATUS_ADUAN_INFO,
  type KategoriAduan, type ModeIdentitas, type PrioritasAduan, type StatusAduan,
} from "@shared/aduan";

export const IKON_KATEGORI: Record<KategoriAduan, LucideIcon> = {
  sampah: Trash2,
  kebisingan: Volume2,
  keamanan: ShieldAlert,
  parkir: Car,
  usaha: Store,
  kost: BedDouble,
  bangunan: Building2,
  ketertiban: Scale,
  hewan: PawPrint,
  lainnya: HelpCircle,
};

export const IKON_MODE: Record<ModeIdentitas, LucideIcon> = {
  rahasia: Lock,
  anonim: EyeOff,
  terbuka: UserCheck,
};

/** Kartu hijau-emas khas RW 03 untuk judul halaman aduan. */
export function KartuMegah({ judul, sub, children }: { judul: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[hsl(40,55%,58%)]/50 p-5 text-white shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)]">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, hsl(163,52%,12%) 0%, hsl(163,48%,20%) 45%, hsl(163,55%,16%) 100%)" }}
        aria-hidden
      />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border border-[hsl(40,45%,55%)]/25" aria-hidden />
      <div className="absolute -bottom-16 right-0 h-48 w-48 rounded-full border border-[hsl(40,45%,55%)]/15" aria-hidden />
      <Megaphone className="absolute right-5 top-5 h-8 w-8 text-[hsl(40,58%,68%)]/70" aria-hidden />
      <div className="relative">
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[hsl(40,45%,72%)]">Aduan Warga · RW 03 Padasuka</p>
        <h1 className="mt-2 max-w-[85%] text-2xl font-extrabold leading-tight">{judul}</h1>
        {sub && <p className="mt-2 max-w-[90%] text-sm text-white/75">{sub}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
}

/** Kartu Aduan Warga di halaman depan portal. */
export function KartuAduanBeranda() {
  return (
    <Link href={ADUAN_ROUTES.beranda} className="group block" aria-label="Aduan Warga — laporkan gangguan, identitas dilindungi">
      <div className="relative overflow-hidden rounded-2xl border border-[hsl(40,55%,58%)]/50 p-5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.45)] transition-all duration-300 group-hover:-translate-y-0.5">
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, hsl(0,45%,22%) 0%, hsl(163,45%,16%) 55%, hsl(163,55%,12%) 100%)" }} aria-hidden />
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full border border-[hsl(40,45%,55%)]/25" aria-hidden />
        <div className="relative flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(40,55%,72%)] to-[hsl(40,40%,42%)] text-[hsl(163,55%,12%)] shadow-inner">
            <Megaphone className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[hsl(40,45%,72%)]">Identitas pelapor dilindungi</p>
            <p className="text-2xl font-extrabold leading-tight text-white">Aduan Warga</p>
            <p className="text-sm text-white/70">Laporkan gangguan — diperiksa & ditegur resmi oleh RW</p>
          </div>
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-[hsl(40,50%,75%)] transition-transform group-hover:translate-x-0.5" aria-hidden />
        </div>
      </div>
    </Link>
  );
}

export function KartuMode({ mode, aktif, onPilih, rekomendasi }: { mode: ModeIdentitas; aktif?: boolean; onPilih?: () => void; rekomendasi?: boolean }) {
  const info = MODE_IDENTITAS_INFO[mode];
  const Ikon = IKON_MODE[mode];
  const Tag = onPilih ? "button" : "div";
  return (
    <Tag
      {...(onPilih ? { type: "button" as const, onClick: onPilih, "aria-pressed": aktif } : {})}
      className={cn(
        "block w-full rounded-2xl border-2 bg-card p-4 text-left transition-colors",
        aktif ? "border-brand bg-brand/5 shadow-md" : "border-border",
        onPilih && !aktif && "hover:border-brand/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl", aktif ? "bg-brand text-white" : "bg-brand/10 text-brand")}>
          <Ikon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {info.label}
            {rekomendasi && <span className="rounded-full bg-[hsl(40,60%,90%)] px-2 py-0.5 text-xs font-semibold text-[hsl(40,55%,28%)]">Disarankan</span>}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{info.singkat}</p>
          {(aktif || !onPilih) && (
            <ul className="mt-2 space-y-1 text-sm">
              {info.poin.map((p) => (
                <li key={p} className="flex gap-2"><span className="text-brand">•</span><span>{p}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Tag>
  );
}

/** Pilih foto bukti (kamera/galeri), dikompres di HP sebelum dikirim. */
export function PilihFotoBukti({ foto, onChange, maks = MAKS_FOTO_ADUAN }: { foto: string[]; onChange: (f: string[]) => void; maks?: number }) {
  const kamera = useRef<HTMLInputElement>(null);
  const galeri = useRef<HTMLInputElement>(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const tambah = async (files: FileList | null) => {
    if (!files?.length) return;
    setProses(true);
    setGalat(null);
    try {
      const baru: string[] = [];
      for (const f of Array.from(files).slice(0, maks - foto.length)) {
        baru.push(await compressImageToDataUrl(f, { maxSide: 1280, quality: 0.72 }));
      }
      onChange([...foto, ...baru]);
    } catch {
      setGalat("Foto gagal diproses. Coba foto lain.");
    } finally {
      setProses(false);
    }
  };
  return (
    <div className="space-y-2">
      {foto.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {foto.map((f, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-xl border">
              <img src={f} alt={`Bukti ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(foto.filter((_, j) => j !== i))}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                aria-label={`Hapus foto ${i + 1}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {foto.length < maks && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={proses} onClick={() => kamera.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand bg-brand text-base font-semibold text-white disabled:opacity-60">
            {proses ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />} Ambil foto
          </button>
          <button type="button" disabled={proses} onClick={() => galeri.current?.click()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-brand/30 bg-card text-base font-semibold text-brand disabled:opacity-60">
            <ImageIcon className="h-5 w-5" /> Dari galeri
          </button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Maksimal {maks} foto. Foto otomatis diperkecil. Hindari memotret wajah orang yang tidak terkait.</p>
      {galat && <p className="text-sm text-destructive">{galat}</p>}
      <input ref={kamera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void tambah(e.target.files); e.target.value = ""; }} />
      <input ref={galeri} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void tambah(e.target.files); e.target.value = ""; }} />
    </div>
  );
}

const WARNA_STATUS: Record<StatusAduan, string> = {
  masuk: "bg-blue-100 text-blue-900",
  diproses: "bg-amber-100 text-amber-900",
  klarifikasi: "bg-violet-100 text-violet-900",
  terbukti: "bg-orange-100 text-orange-900",
  teguran: "bg-red-100 text-red-900",
  selesai: "bg-green-100 text-green-900",
  tidak_terbukti: "bg-gray-200 text-gray-800",
  digabung: "bg-gray-200 text-gray-800",
};

export function LencanaStatus({ status, className }: { status: string; className?: string }) {
  const s = status as StatusAduan;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", WARNA_STATUS[s] ?? "bg-muted", className)}>
      {STATUS_ADUAN_INFO[s]?.label ?? status}
    </span>
  );
}

const WARNA_PRIORITAS: Record<PrioritasAduan, string> = {
  darurat: "bg-red-600 text-white",
  tinggi: "bg-orange-500 text-white",
  sedang: "bg-amber-100 text-amber-900",
  rendah: "bg-gray-100 text-gray-700",
};

export function LencanaPrioritas({ prioritas, className }: { prioritas: string; className?: string }) {
  const p = prioritas as PrioritasAduan;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide", WARNA_PRIORITAS[p] ?? "bg-muted", className)}>
      {PRIORITAS_ADUAN_LABEL[p] ?? prioritas}
    </span>
  );
}

/** Urutan tahap untuk bilah kemajuan di halaman lacak. */
export const TAHAP_ADUAN: { status: StatusAduan[]; label: string }[] = [
  { status: ["masuk"], label: "Diterima" },
  { status: ["diproses", "klarifikasi"], label: "Diperiksa" },
  { status: ["terbukti", "teguran"], label: "Ditindak" },
  { status: ["selesai", "tidak_terbukti", "digabung"], label: "Selesai" },
];

export function tahapKe(status: string): number {
  const i = TAHAP_ADUAN.findIndex((t) => (t.status as string[]).includes(status));
  return i < 0 ? 0 : i;
}

export function formatWaktu(iso: string | Date | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

export function formatTanggal(iso: string | Date | null | undefined) {
  if (!iso) return "-";
  const d = typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export const ADUAN_ROUTES = {
  beranda: "/aduan",
  buat: "/aduan/buat",
  lacak: "/aduan/lacak",
  admin: "/admin/aduan",
  adminTeguran: "/admin/aduan-teguran",
  adminTeradu: "/admin/aduan-teradu",
} as const;
