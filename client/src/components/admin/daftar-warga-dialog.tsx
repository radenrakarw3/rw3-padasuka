import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ExternalLink, MessageCircle, PhoneOff, QrCode, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchPublicJson, getApiErrorMessage } from "@/lib/queryClient";
import { toWaMeUrl } from "@/lib/wa";
import { jalurKelolaRt } from "@/pages/admin/kelola-warga/konteks";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { judulDaftar, type DaftarKategori, type KategoriDaftar, type PilihanDaftar } from "@shared/statistik-warga";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";
const PER_HALAMAN = 100;
/** Batas KK per sekali cetak paket QR agar URL & lembar cetak tetap wajar. */
const MAKS_CETAK = 60;
const rt2 = (rt: number) => `RT ${String(rt).padStart(2, "0")}`;

/** Kategori yang ditujukan untuk melengkapi data — tampilkan ajakan cetak QR. */
const KATEGORI_LENGKAPI: KategoriDaftar[] = ["belumDiisi", "kelengkapan", "perhatian", "kolomKosong", "tanpaWa"];

/** Daftar warga/KK di balik satu kartu angka atau batang grafik, dengan tombol WhatsApp & QR per baris. */
export function DaftarWargaDialog({ kategori, nilai, rtAwal, onTutup }: {
  kategori: KategoriDaftar | PilihanDaftar | null; nilai?: string; rtAwal?: number; onTutup: () => void;
}) {
  const pilihan: PilihanDaftar | null = kategori == null ? null : typeof kategori === "string" ? { kategori, nilai } : kategori;
  return (
    <Dialog open={pilihan != null} onOpenChange={(buka) => { if (!buka) onTutup(); }}>
      <DialogContent className="sm:max-w-2xl">
        {pilihan && (
          <IsiDaftar key={`${pilihan.kategori}-${pilihan.nilai ?? ""}-${rtAwal ?? "semua"}`} kategori={pilihan.kategori} nilai={pilihan.nilai} rtAwal={rtAwal} onTutup={onTutup} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function IsiDaftar({ kategori, nilai, rtAwal, onTutup }: { kategori: KategoriDaftar; nilai?: string; rtAwal?: number; onTutup: () => void }) {
  const [, go] = useLocation();
  const [rt, setRt] = useState<number | undefined>(rtAwal);
  const [cari, setCari] = useState("");
  const [batas, setBatas] = useState(PER_HALAMAN);
  const qs = new URLSearchParams({ kategori });
  if (rt != null) qs.set("rt", String(rt));
  if (nilai) qs.set("nilai", nilai);
  const { data, isLoading, error } = useQuery<DaftarKategori>({
    queryKey: ["/api/statistik-warga/daftar", kategori, nilai ?? null, rt ?? null],
    queryFn: () => fetchPublicJson<DaftarKategori>(`/api/statistik-warga/daftar?${qs}`, undefined, 60_000),
    staleTime: 30_000,
  });

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!data) return [];
    if (!q) return data.daftar;
    return data.daftar.filter((o) => `${o.nama} ${o.alamat ?? ""} ${o.keterangan}`.toLowerCase().includes(q));
  }, [data, cari]);
  const adaWa = tersaring.filter((o) => o.wa).length;

  /** KK unik per RT dari baris yang tampil, untuk cetak QR + formulir sekaligus. */
  const kkPerRt = useMemo(() => {
    const peta = new Map<number, number[]>();
    for (const o of tersaring) {
      if (o.kkId == null) continue;
      const list = peta.get(o.rt) ?? [];
      if (!list.includes(o.kkId)) list.push(o.kkId);
      peta.set(o.rt, list);
    }
    return Array.from(peta.entries()).sort((a, b) => a[0] - b[0]);
  }, [tersaring]);
  const ajakLengkapi = KATEGORI_LENGKAPI.includes(kategori);
  const cetak = (rtNo: number, kkIds: number[]) => {
    onTutup();
    go(jalurKelolaRt(rtNo, `/cetak?mode=paket&kk=${kkIds.slice(0, MAKS_CETAK).join(",")}`));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6" style={{ color: HIJAU }}>{data?.judul ?? judulDaftar(kategori, nilai)}</DialogTitle>
        <DialogDescription>
          {data ? `${data.daftar.length.toLocaleString("id-ID")} ${data.satuan} · ${adaWa} bisa dihubungi lewat WA` : "Mengambil data dari database…"}
        </DialogDescription>
      </DialogHeader>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Filter RT">
        {[undefined, ...ACTIVE_RT_NUMBERS].map((n) => {
          const aktif = rt === n;
          return (
            <button key={n ?? "semua"} type="button" aria-pressed={aktif} onClick={() => { setRt(n); setBatas(PER_HALAMAN); }}
              className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-medium sm:text-sm ${aktif ? "border-transparent text-white" : "border-gray-200 bg-gray-50 text-gray-700"}`}
              style={aktif ? { backgroundColor: HIJAU } : undefined}>
              {n == null ? "Semua RT" : rt2(n)}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input value={cari} onChange={(e) => { setCari(e.target.value); setBatas(PER_HALAMAN); }} placeholder="Cari nama atau alamat…" className="pl-9" />
      </div>

      {data && kkPerRt.length > 0 && (
        <div className={`rounded-xl border p-2.5 ${ajakLengkapi ? "border-emerald-200 bg-emerald-50/60" : "border-gray-200 bg-gray-50"}`}>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-800">
            <QrCode className="h-3.5 w-3.5" style={{ color: HIJAU }} />
            {ajakLengkapi ? "Cetak QR + formulir agar keluarga melengkapi datanya" : "Cetak QR + formulir untuk keluarga di daftar ini"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {kkPerRt.map(([rtNo, ids]) => (
              <Button key={rtNo} size="sm" className="h-8 text-xs text-white" style={{ backgroundColor: HIJAU }} onClick={() => cetak(rtNo, ids)}>
                {rt2(rtNo)} · {Math.min(ids.length, MAKS_CETAK)} KK
              </Button>
            ))}
          </div>
          {kkPerRt.some(([, ids]) => ids.length > MAKS_CETAK) && (
            <p className="mt-1 text-[11px] text-gray-500">Maksimal {MAKS_CETAK} KK per cetak; sisanya cetak lagi setelah yang pertama selesai.</p>
          )}
        </div>
      )}

      {isLoading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>}
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{getApiErrorMessage(error)}</p>}
      {data && tersaring.length === 0 && <p className="py-6 text-center text-sm text-gray-500">Tidak ada data.</p>}

      {data && tersaring.length > 0 && (
        <ul className="divide-y rounded-xl border border-gray-200">
          {tersaring.slice(0, batas).map((o) => (
            <li key={`${o.id}-${o.kkId ?? "s"}`} className="flex items-start gap-2.5 p-2.5 sm:p-3">
              <span className="mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(o.rt)}</span>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold text-gray-900">{o.nama}</p>
                <p className="break-words text-xs text-gray-600">{o.keterangan}</p>
                {o.alamat && <p className="break-words text-xs text-gray-500">{o.alamat}</p>}
                {o.waMilik && <p className="text-[11px] text-amber-700">{o.waMilik}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                {o.wa ? (
                  <Button asChild size="sm" className="h-8 bg-[#25D366] px-2.5 text-white hover:bg-[#1ebe5b]">
                    <a href={toWaMeUrl(o.wa, `Assalamu'alaikum, ${o.nama}. Kami dari pengurus RW 03 Padasuka.`)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${o.nama}`}>
                      <MessageCircle className="mr-1 h-4 w-4" />WA
                    </a>
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-gray-400"><PhoneOff className="h-3.5 w-3.5" />Tanpa WA</span>
                )}
                {o.kkId != null && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" aria-label={`Cetak QR keluarga ${o.nama}`} onClick={() => cetak(o.rt, [o.kkId!])}>
                      <QrCode className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">QR</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { onTutup(); go(jalurKelolaRt(o.rt, `/keluarga/${o.kkId}`)); }}>
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />KK
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data && tersaring.length > batas && (
        <Button variant="outline" onClick={() => setBatas(batas + PER_HALAMAN)}>
          Tampilkan {Math.min(PER_HALAMAN, tersaring.length - batas)} lagi (sisa {tersaring.length - batas})
        </Button>
      )}
    </>
  );
}
