import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AlarmClock, Camera, CheckCircle2, ExternalLink, Gavel, Inbox, Megaphone, Search, Siren, TimerReset } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ambilAduanJson, useRingkasanAduan } from "@/hooks/use-aduan-admin";
import {
  ADUAN_ROUTES, IKON_KATEGORI, IKON_MODE, LencanaPrioritas, LencanaStatus, formatWaktu,
} from "@/components/aduan/aduan-ui";
import {
  JENIS_TERADU_LABEL, KATEGORI_ADUAN, KATEGORI_ADUAN_INFO, MODE_IDENTITAS_INFO,
  type JenisTeradu, type KategoriAduan, type ModeIdentitas,
} from "@shared/aduan";

export type BarisAduan = {
  id: number;
  nomor: string;
  kategori: KategoriAduan;
  judul: string;
  lokasi: string | null;
  rtLokasi: number | null;
  prioritas: string;
  status: string;
  mode: ModeIdentitas;
  teraduJenis: JenisTeradu;
  teraduNama: string | null;
  dibuat: string;
  belumDibaca: boolean;
  jumlahFoto: number;
  jumlahTeguran: number;
};

const FILTER = [
  { nilai: "aktif", label: "Perlu ditangani" },
  { nilai: "darurat", label: "Darurat & tinggi" },
  { nilai: "masuk", label: "Baru masuk" },
  { nilai: "teguran", label: "Sedang ditegur" },
  { nilai: "selesai", label: "Selesai" },
  { nilai: "semua", label: "Semua" },
];

function Statistik({ label, n, ikon: Ikon, kelas, onClick }: { label: string; n?: number; ikon: typeof Inbox; kelas?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("min-w-0 rounded-xl border bg-card p-3 text-left shadow-sm transition hover:border-brand/40", kelas)}>
      <Ikon className="mb-1 h-4 w-4 opacity-70" />
      <p className="text-2xl font-bold tabular-nums">{n ?? "–"}</p>
      <p className="text-xs leading-tight text-muted-foreground">{label}</p>
    </button>
  );
}

export default function AdminAduan() {
  const [, go] = useLocation();
  const [status, setStatus] = useState("aktif");
  const [kategori, setKategori] = useState("semua");
  const [rt, setRt] = useState("semua");
  const [cari, setCari] = useState("");
  const { data: r } = useRingkasanAduan();
  const qs = new URLSearchParams({ status, ...(kategori !== "semua" ? { kategori } : {}), ...(rt !== "semua" ? { rt } : {}), ...(cari.trim().length >= 2 ? { cari: cari.trim() } : {}) });
  const { data: list = [], isLoading, error } = useQuery<BarisAduan[]>({
    queryKey: ["/api/admin/aduan", qs.toString()],
    queryFn: () => ambilAduanJson(`/api/admin/aduan?${qs}`),
    placeholderData: keepPreviousData,
  });
  const maksKat = Math.max(1, ...(r?.perKategori ?? []).map((k) => k.n));

  return (
    <div className="max-w-6xl space-y-5">
      <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: "linear-gradient(135deg, hsl(163,52%,14%), hsl(163,48%,22%))" }}>
        <Megaphone className="absolute right-4 top-4 h-10 w-10 text-[hsl(40,58%,68%)]/40" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[hsl(40,45%,72%)]">Ketua RW 03</p>
        <h1 className="text-2xl font-extrabold">Pusat Aduan Warga</h1>
        <p className="mt-1 max-w-xl text-sm text-white/75">Periksa aduan, panggil klarifikasi, dan terbitkan teguran resmi bertingkat. Identitas pelapor rahasia hanya bisa dibuka dengan alasan dan selalu tercatat.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={ADUAN_ROUTES.beranda} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20">
            <ExternalLink className="h-3.5 w-3.5" /> Halaman warga
          </a>
          <button type="button" onClick={() => go(ADUAN_ROUTES.adminTeguran)} className="inline-flex items-center gap-1 rounded-lg bg-[hsl(40,58%,62%)] px-3 py-1.5 text-xs font-bold text-[hsl(163,55%,12%)]">
            <Gavel className="h-3.5 w-3.5" /> Teguran & SP
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Statistik label="Belum dibaca" n={r?.belumDibaca} ikon={Inbox} kelas={r?.belumDibaca ? "border-blue-300 bg-blue-50" : ""} onClick={() => setStatus("aktif")} />
        <Statistik label="Darurat aktif" n={r?.darurat} ikon={Siren} kelas={r?.darurat ? "border-red-400 bg-red-50 text-red-900" : ""} onClick={() => setStatus("darurat")} />
        <Statistik label="Menunggu diperiksa" n={r?.menunggu} ikon={TimerReset} onClick={() => setStatus("aktif")} />
        <Statistik label="Teguran aktif" n={r?.teguranAktif} ikon={Gavel} onClick={() => go(ADUAN_ROUTES.adminTeguran)} />
        <Statistik label="Tenggat lewat" n={r?.tenggatLewat} ikon={AlarmClock} kelas={r?.tenggatLewat ? "border-orange-400 bg-orange-50 text-orange-900" : ""} onClick={() => go(`${ADUAN_ROUTES.adminTeguran}?filter=lewat`)} />
        <Statistik label="Selesai bulan ini" n={r?.selesaiBulanIni} ikon={CheckCircle2} onClick={() => setStatus("selesai")} />
      </div>

      {(r?.perKategori?.length ?? 0) > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-sm font-semibold">Masalah terbanyak 90 hari terakhir</p>
          <div className="space-y-2">
            {r!.perKategori.slice(0, 6).map((k) => {
              const Ikon = IKON_KATEGORI[k.kategori as KategoriAduan] ?? Megaphone;
              return (
                <button key={k.kategori} type="button" onClick={() => { setKategori(k.kategori); setStatus("semua"); }} className="flex w-full items-center gap-2 text-left">
                  <Ikon className="h-4 w-4 flex-shrink-0 text-brand" />
                  <span className="w-40 flex-shrink-0 truncate text-sm">{KATEGORI_ADUAN_INFO[k.kategori as KategoriAduan]?.label ?? k.kategori}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full bg-brand" style={{ width: `${(k.n / maksKat) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right text-sm font-semibold tabular-nums">{k.n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTER.map((f) => (
            <button key={f.nilai} type="button" onClick={() => setStatus(f.nilai)}
              className={cn("whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium", status === f.nilai ? "border-brand bg-brand text-white" : "bg-card")}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[1fr_200px_120px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Cari nomor, judul, teradu, lokasi…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>
          <Select value={kategori} onValueChange={setKategori}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua kategori</SelectItem>
              {KATEGORI_ADUAN.map((k) => <SelectItem key={k} value={k}>{KATEGORI_ADUAN_INFO[k].label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={rt} onValueChange={setRt}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua RT</SelectItem>
              {[1, 2, 3, 4].map((n) => <SelectItem key={n} value={String(n)}>RT 0{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{(error as Error).message}</p>
      ) : isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
          Tidak ada aduan pada filter ini.
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => <ItemAduan key={a.id} a={a} onClick={() => go(`${ADUAN_ROUTES.admin}/${a.id}`)} />)}
        </div>
      )}
    </div>
  );
}

function ItemAduan({ a, onClick }: { a: BarisAduan; onClick: () => void }) {
  const Ikon = IKON_KATEGORI[a.kategori] ?? Megaphone;
  const IkonMode = IKON_MODE[a.mode];
  return (
    <button type="button" onClick={onClick}
      className={cn("flex w-full items-start gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition hover:border-brand/40 hover:shadow",
        a.prioritas === "darurat" && "border-l-4 border-l-red-600", a.prioritas === "tinggi" && "border-l-4 border-l-orange-500")}>
      <span className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Ikon className="h-5 w-5" />
        {a.belumDibaca && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-card bg-blue-600" aria-label="Belum dibaca" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-xs font-semibold text-muted-foreground">{a.nomor}</span>
          <LencanaPrioritas prioritas={a.prioritas} />
          <LencanaStatus status={a.status} />
        </span>
        <span className={cn("mt-1 block truncate", a.belumDibaca ? "font-bold" : "font-semibold")}>{a.judul}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {KATEGORI_ADUAN_INFO[a.kategori]?.label}
          {a.rtLokasi ? ` · RT 0${a.rtLokasi}` : ""}
          {a.lokasi ? ` · ${a.lokasi}` : ""}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Teradu: <b className="text-foreground">{a.teraduNama || JENIS_TERADU_LABEL[a.teraduJenis]}</b></span>
          <span className="inline-flex items-center gap-1"><IkonMode className="h-3.5 w-3.5" />{MODE_IDENTITAS_INFO[a.mode]?.label}</span>
          {a.jumlahFoto > 0 && <span className="inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" />{a.jumlahFoto}</span>}
          {a.jumlahTeguran > 0 && <span className="inline-flex items-center gap-1 font-semibold text-red-700"><Gavel className="h-3.5 w-3.5" />{a.jumlahTeguran}</span>}
          <span>{formatWaktu(a.dibuat)}</span>
        </span>
      </span>
    </button>
  );
}
