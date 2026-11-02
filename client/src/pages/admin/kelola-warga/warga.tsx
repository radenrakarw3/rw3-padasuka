import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  ClipboardPen,
  Inbox,
  Plus,
  QrCode,
  Search,
  Users,
} from "lucide-react";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { useKotakMasuk } from "@/lib/kotak-masuk";
import { BarisRingkas, HIJAU, IsianTeks, Judul, Langkah, Memuat, Pesan, rt2 } from "@/components/wilayah/ui";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { useRtKelolaCtx } from "./konteks";
import { cn } from "@/lib/utils";

interface Keluarga {
  id: number;
  kepala: string | null;
  alamat: string;
  noUnit: string | null;
  anggota: number;
  kelengkapan: number;
  punyaRumah: boolean;
  punyaQr: boolean;
  usulanMenunggu: number;
}

function inisial(nama: string | null) {
  return (nama ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

export function KeluargaBaru({
  selesai,
  awal,
  draftKey = "kk-baru",
}: {
  selesai: (id: number) => void;
  awal?: { alamat?: string; noUnit?: string | null };
  draftKey?: string;
}) {
  const { nilai, setNilai, hapus } = useDraft(draftKey, {
    langkah: 1,
    alamat: awal?.alamat ?? "",
    noUnit: awal?.noUnit ?? "",
    nomorKk: "",
  });
  const qc = useQueryClient();
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    const r = await wil<{ id: number }>("/api/wilayah/rt/keluarga", {
      body: { alamat: nilai.alamat, noUnit: nilai.noUnit || null, nomorKk: nilai.nomorKk },
    });
    hapus();
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
    return r;
  });
  const set = (p: Partial<typeof nilai>) => setNilai({ ...nilai, ...p });
  if (nilai.langkah === 1) {
    return (
      <Langkah
        lengket="admin"
        langkah={1}
        total={3}
        judul="Alamat rumah"
        onLanjut={() => set({ langkah: 2 })}
        bisaLanjut={nilai.alamat.trim().length >= 3}
      >
        <IsianTeks
          label="Alamat (jalan / gang)"
          nilai={nilai.alamat}
          onChange={(v) => set({ alamat: v })}
          placeholder="Contoh: Jl. Padasuka Gg. Melati"
        />
        <IsianTeks label="Nomor rumah (bila ada)" nilai={nilai.noUnit} onChange={(v) => set({ noUnit: v })} />
      </Langkah>
    );
  }
  if (nilai.langkah === 2) {
    return (
      <Langkah
        lengket="admin"
        langkah={2}
        total={3}
        judul="Nomor Kartu Keluarga"
        onKembali={() => set({ langkah: 1 })}
        onLanjut={() => set({ langkah: 3 })}
        bisaLanjut={/^\d{16}$/.test(nilai.nomorKk)}
      >
        <IsianTeks
          label="Nomor KK (16 angka)"
          inputMode="numeric"
          maks={16}
          nilai={nilai.nomorKk}
          onChange={(v) => set({ nomorKk: v.replace(/\D/g, "") })}
          bantuan="Lihat di bagian atas Kartu Keluarga."
        />
      </Langkah>
    );
  }
  return (
    <Langkah
      lengket="admin"
      langkah={3}
      total={3}
      judul="Periksa sebelum menyimpan"
      onKembali={() => set({ langkah: 2 })}
      labelLanjut="Simpan"
      memuat={mengirim}
      onLanjut={async () => {
        const r = await kirim();
        if (r) selesai(r.id);
      }}
    >
      <BarisRingkas label="Alamat" nilai={`${nilai.alamat}${nilai.noUnit ? ` No. ${nilai.noUnit}` : ""}`} />
      <BarisRingkas label="Nomor KK" nilai={nilai.nomorKk} />
      <p className="mt-3 text-base text-gray-600">Setelah disimpan, tambahkan anggota keluarga.</p>
      {error && (
        <div className="mt-4">
          <Pesan jenis="error">{error}</Pesan>
        </div>
      )}
    </Langkah>
  );
}

export default function Warga() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const ctx = useRtKelolaCtx();
  const rt = ctx?.rt ?? ACTIVE_RT_NUMBERS[0];
  const setRt = ctx?.setRt;
  const { data: kotak } = useKotakMasuk();
  const perRt = kotak?.perRt.find((x) => x.rt === rt);
  const menunggu = (perRt?.usulan ?? 0) + (perRt?.pindah ?? 0);

  const [cari, setCari] = useState(params.get("cari") ?? "");
  const [tambah, setTambah] = useState(false);
  const perlu = params.get("perlu");
  const aksi = params.get("aksi");
  const { data, isLoading, error } = useQuery<Keluarga[]>({
    queryKey: ["/api/wilayah/keluarga"],
    queryFn: () => wil("/api/wilayah/keluarga?batas=1000"),
  });
  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return (data ?? []).filter((k) => {
      if (!q) return true;
      return (k.kepala ?? "").toLowerCase().includes(q) || k.alamat.toLowerCase().includes(q);
    });
  }, [data, cari]);

  if (tambah) {
    return (
      <div>
        <Judul kembali={() => setTambah(false)}>Keluarga baru</Judul>
        <KeluargaBaru selesai={(id) => go(`/keluarga/${id}?langkah=anggota`)} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(163,55%,22%)]">Kependudukan</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Data warga &amp; KK</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {aksi === "catat"
                ? "Pilih keluarga yang berubah"
                : perlu === "cek"
                  ? "Buka keluarga untuk mengecek data lama"
                  : `Wilayah ${rt2(rt)} · ${data?.length ?? "…"} keluarga`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTambah(true)}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: HIJAU }}
          >
            <Plus className="h-4 w-4" />
            Keluarga baru
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 print:hidden" role="group" aria-label="Filter RT">
          {ACTIVE_RT_NUMBERS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRt?.(n)}
              aria-pressed={rt === n}
              className={cn(
                "h-9 min-w-[3.25rem] rounded-full px-3 text-xs font-bold transition-colors",
                rt === n ? "text-white shadow-sm" : "border border-border bg-white text-gray-700 hover:bg-muted",
              )}
              style={rt === n ? { backgroundColor: HIJAU } : undefined}
            >
              {rt2(n)}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            enterKeyHint="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari kepala keluarga atau alamat…"
            className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-3 text-base shadow-sm focus:border-[hsl(163,55%,22%)] focus:outline-none focus:ring-2 focus:ring-[hsl(163,55%,22%)]/20"
            aria-label="Cari keluarga"
          />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 print:hidden">
        <button
          type="button"
          onClick={() => go("/masuk")}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <Inbox className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Kotak masuk</span>
              {menunggu > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{menunggu}</span>
              )}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {menunggu > 0 ? "Ada usulan / pindah menunggu keputusan" : "Isian QR & pindah RT dari warga"}
            </span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </button>

        <button
          type="button"
          onClick={() => go("/input-kertas")}
          className="group flex items-start gap-3 rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)]">
            <ClipboardPen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold text-foreground">Input kertas</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">Salin formulir fisik ke sistem</span>
          </span>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
        </button>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Keluarga di {rt2(rt)}
          </h2>
          {data && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {daftar.length === data.length ? `${daftar.length} KK` : `${daftar.length} dari ${data.length}`}
            </p>
          )}
        </div>

        {isLoading && <Memuat />}
        {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}

        {!isLoading && data && daftar.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-10 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground/60" />
            <p className="mt-2 text-sm font-medium">Tidak ada keluarga yang cocok</p>
            <p className="mt-1 text-xs text-muted-foreground">Ubah kata kunci atau tambah keluarga baru.</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {daftar.map((k) => {
            const persen = Math.round(k.kelengkapan * 100);
            return (
              <button
                key={k.id}
                type="button"
                onClick={() => go(`/keluarga/${k.id}`)}
                className="flex flex-col rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-all hover:border-[hsl(163,55%,22%)]/40 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: HIJAU }}
                  >
                    {inisial(k.kepala)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-foreground">
                      {k.kepala ?? "Kepala keluarga belum dicatat"}
                    </span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                      {k.alamat}
                      {k.noUnit ? ` No. ${k.noUnit}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-[11px]">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium tabular-nums text-muted-foreground">
                    {k.anggota} orang
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-semibold tabular-nums",
                      persen >= 80
                        ? "bg-emerald-50 text-emerald-800"
                        : persen >= 40
                          ? "bg-amber-50 text-amber-800"
                          : "bg-rose-50 text-rose-800",
                    )}
                  >
                    Data {persen}%
                  </span>
                  {k.usulanMenunggu > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-medium text-red-700">
                      <Inbox className="h-3 w-3" />
                      {k.usulanMenunggu} isian
                    </span>
                  )}
                  {k.punyaQr && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <QrCode className="h-3.5 w-3.5" />
                      QR
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
