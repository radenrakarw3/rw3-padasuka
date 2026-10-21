import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { FileWarning, Loader2, MessageSquareText, Search } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  ADUAN_ROUTES, IKON_KATEGORI, LencanaStatus, PilihFotoBukti, TAHAP_ADUAN, formatWaktu, tahapKe,
} from "@/components/aduan/aduan-ui";
import { KATEGORI_ADUAN_INFO, MODE_IDENTITAS_INFO, type KategoriAduan, type ModeIdentitas } from "@shared/aduan";

type HasilLacak = {
  nomor: string;
  kategori: KategoriAduan;
  judul: string;
  status: string;
  statusLabel: string;
  statusPublik: string;
  tutup: boolean;
  mode: ModeIdentitas;
  pesanPublik: string | null;
  jumlahTeguran: number;
  dibuat: string;
  timeline: { jenis: string; isi: string; waktu: string }[];
};

export default function AduanLacak() {
  const { toast } = useToast();
  const awal = new URLSearchParams(useSearch()).get("kode") ?? "";
  const [kode, setKode] = useState(awal.toUpperCase());
  const [pin, setPin] = useState("");
  const [hasil, setHasil] = useState<HasilLacak | null>(null);
  const [tambahIsi, setTambahIsi] = useState("");
  const [tambahFoto, setTambahFoto] = useState<string[]>([]);

  const lacak = useMutation({
    mutationFn: async () => readJsonSafely<HasilLacak>(await apiRequest("POST", "/api/public/aduan/lacak", { kode, pin })),
    onSuccess: setHasil,
    onError: (e: unknown) => toast({ title: "Tidak ditemukan", description: getApiErrorMessage(e), variant: "destructive" }),
  });
  const tambah = useMutation({
    mutationFn: async () => readJsonSafely(await apiRequest("POST", "/api/public/aduan/lacak/tambah", { kode, pin, isi: tambahIsi, foto: tambahFoto })),
    onSuccess: () => {
      setTambahIsi("");
      setTambahFoto([]);
      toast({ title: "Keterangan terkirim", description: "Pengurus RW akan membacanya." });
      lacak.mutate();
    },
    onError: (e: unknown) => toast({ title: "Gagal mengirim", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  if (!hasil) {
    return (
      <PublicKioskLayout title="Lacak aduan" backHref={ADUAN_ROUTES.beranda}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); lacak.mutate(); }}>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white"><Search className="h-6 w-6" /></span>
            <div>
              <h1 className="text-xl font-bold">Lacak aduan Anda</h1>
              <p className="text-sm text-muted-foreground">Masukkan kode lacak dan PIN yang muncul saat aduan dikirim.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kode" className="text-base">Kode lacak</Label>
            <Input id="kode" className="h-14 text-center font-mono text-2xl tracking-[0.25em]" maxLength={8} autoComplete="off"
              value={kode} onChange={(e) => setKode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="XXXXXXXX" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin" className="text-base">PIN (6 angka)</Label>
            <Input id="pin" className="h-14 text-center font-mono text-2xl tracking-[0.4em]" maxLength={6} inputMode="numeric" autoComplete="off"
              type="password" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••••" />
          </div>
          <Button type="submit" className="h-12 w-full text-base" disabled={kode.length < 6 || pin.length !== 6 || lacak.isPending}>
            {lacak.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lihat perkembangan"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Belum mengadu? <Link href={ADUAN_ROUTES.buat} className="font-semibold text-brand underline">Buat aduan</Link>
          </p>
        </form>
      </PublicKioskLayout>
    );
  }

  const Ikon = IKON_KATEGORI[hasil.kategori] ?? FileWarning;
  const tahap = tahapKe(hasil.status);
  return (
    <PublicKioskLayout title={hasil.nomor} backHref={ADUAN_ROUTES.beranda} onBack={() => setHasil(null)}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"><Ikon className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{KATEGORI_ADUAN_INFO[hasil.kategori]?.label} · {formatWaktu(hasil.dibuat)}</p>
              <p className="text-lg font-bold leading-snug">{hasil.judul}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <LencanaStatus status={hasil.status} />
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">Identitas: {MODE_IDENTITAS_INFO[hasil.mode]?.label}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-1">
            {TAHAP_ADUAN.map((t, i) => (
              <div key={t.label} className="space-y-1 text-center">
                <div className={cn("h-2 rounded-full", i <= tahap ? "bg-brand" : "bg-muted")} />
                <p className={cn("text-[11px] font-semibold", i <= tahap ? "text-brand" : "text-muted-foreground")}>{t.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{hasil.statusPublik}</p>
          {hasil.jumlahTeguran > 0 && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-900">
              {hasil.jumlahTeguran} teguran resmi sudah diberikan kepada pihak yang diadukan.
            </p>
          )}
        </div>

        {hasil.pesanPublik && (
          <div className="flex gap-3 rounded-2xl border-2 border-brand/30 bg-brand/5 p-4">
            <MessageSquareText className="h-6 w-6 flex-shrink-0 text-brand" />
            <div>
              <p className="text-sm font-semibold text-brand">Pesan dari pengurus RW</p>
              <p className="whitespace-pre-wrap">{hasil.pesanPublik}</p>
            </div>
          </div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Perjalanan aduan</h2>
          <ol className="relative space-y-4 border-l-2 border-brand/20 pl-5">
            {[...hasil.timeline].reverse().map((t, i) => (
              <li key={i} className="relative">
                <span className={cn("absolute -left-[27px] top-1 h-3.5 w-3.5 rounded-full border-2 border-background", i === 0 ? "bg-brand" : "bg-brand/40")} />
                <p className="text-xs text-muted-foreground">{formatWaktu(t.waktu)}</p>
                <p className="text-sm">{t.isi}</p>
              </li>
            ))}
          </ol>
        </section>

        {!hasil.tutup && (
          <section className="space-y-3 rounded-2xl border bg-card p-4">
            <h2 className="font-bold">Tambah keterangan atau foto</h2>
            <Textarea rows={3} value={tambahIsi} maxLength={2000} onChange={(e) => setTambahIsi(e.target.value)}
              placeholder="Misalnya: kejadian terulang lagi tadi malam pukul 23.00" />
            <PilihFotoBukti foto={tambahFoto} onChange={setTambahFoto} />
            <Button className="h-12 w-full" disabled={tambahIsi.trim().length < 5 || tambah.isPending} onClick={() => tambah.mutate()}>
              {tambah.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kirim keterangan"}
            </Button>
          </section>
        )}
      </div>
    </PublicKioskLayout>
  );
}
