import React from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import {
  MessageCircleHeart, Lock, Sparkles, Send, Heart, Phone,
  Store, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";
import type { Warga } from "@shared/schema";

function CoinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: "inline-block", verticalAlign: "-0.18em", flexShrink: 0 }}>
      <circle cx="10" cy="10" r="9.5" fill="#92400E" />
      <circle cx="10" cy="10" r="9" fill="#D97706" />
      <circle cx="10" cy="10" r="8" fill="#F59E0B" />
      <circle cx="10" cy="10" r="6.8" fill="#FCD34D" />
      <circle cx="10" cy="10" r="5.8" fill="none" stroke="#D97706" strokeWidth="0.6" />
      <ellipse cx="8" cy="7.5" rx="2.2" ry="1.1" fill="white" fillOpacity="0.28" transform="rotate(-25 8 7.5)" />
      <text x="10" y="13.2" textAnchor="middle" fill="#78350F" fontSize="4.8" fontWeight="900" fontFamily="Arial,sans-serif">RW</text>
    </svg>
  );
}

const MITRA_PER_PAGE = 5;

export default function WargaBeranda() {
  const { user } = useAuth();
  const [isi, setIsi] = useState("");
  const [hasil, setHasil] = useState<{
    coin: number; balasan: string;
  } | null>(null);
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [halamanMitra, setHalamanMitra] = useState(1);
  const [showDetailCurhat, setShowDetailCurhat] = useState(false);

  const { data: anggota, isLoading } = useQuery<Warga[]>({
    queryKey: ["/api/warga/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const { data: kuota } = useQuery<{ sudahCurhatHariIni: boolean; coinDiberikan: number; balasanGemini: string | null }>({
    queryKey: ["/api/warga/curhat/kuota"],
    staleTime: 30_000,
    enabled: !!user,
  });

  const { data: mitraList = [] } = useQuery<any[]>({
    queryKey: ["/api/warga/rwcoin/mitra"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 60_000,
  });

  const curhatMutation = useMutation({
    mutationFn: async (teks: string) => {
      const res = await apiRequest("POST", "/api/warga/curhat", { isi: teks });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      return await res.json();
    },
    onSuccess: (data) => {
      setHasil(data);
      setShowDetailCurhat(true);
      setIsi("");
      queryClient.invalidateQueries({ queryKey: ["/api/warga/curhat/kuota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const namaDepan = (
    anggota?.find(w => w.id === user?.wargaId)
    ?? anggota?.find(w => w.kedudukanKeluarga === "Kepala Keluarga")
    ?? anggota?.[0]
  )?.namaLengkap?.split(" ")[0] ?? "Kamu";

  const sudahCurhat = kuota?.sudahCurhatHariIni ?? false;

  const kontakPenting = [
    { jabatan: "Sekretaris 1", nama: "Pak Iwan", nomor: "082129674194" },
    { jabatan: "Sekretaris 2", nama: "Bu Tini", nomor: "089635339625" },
    { jabatan: "Danru Linmas", nama: "Pak Parmin", nomor: "081321887841" },
    { jabatan: "Kepala Kiosk Pelayanan", nama: "Teh Eka", nomor: "085860604142" },
    { jabatan: "Ajudan Ketua RW", nama: "Kang Yayan", nomor: "085285341039" },
    { jabatan: "Ketua PKK", nama: "Bu Dillah", nomor: "082118833719" },
    { jabatan: "Ketua RW Siaga", nama: "Bu Andini", nomor: "082116415299" },
  ];

  function toWaLink(nomor: string) {
    return `https://wa.me/62${nomor.replace(/^0/, "")}`;
  }

  // ---- Kartu curhat berdasarkan kondisi ----
  let curhatCard: React.ReactNode;

  const coinHariIni = hasil ? hasil.coin : (kuota?.coinDiberikan ?? 0);
  const balasanHariIni = hasil ? hasil.balasan : (kuota?.balasanGemini ?? null);

  if (sudahCurhat || hasil) {
    curhatCard = (
      <Card className="border-0 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowDetailCurhat((v) => !v)}
          className="w-full bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,15%)] px-5 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[hsl(40,45%,65%)]" />
            <span className="text-white font-semibold text-sm">Ruang Curhat</span>
            {coinHariIni > 0 && (
              <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-[10px] text-white/90 font-medium">
                +{coinHariIni.toLocaleString("id-ID")} <CoinIcon size={10} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-white/60 text-[11px]">
            <span>{showDetailCurhat ? "Tutup" : "Lihat balasan"}</span>
            {showDetailCurhat ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>
        {showDetailCurhat && (
          <CardContent className="p-4 space-y-3">
            {coinHariIni > 0 ? (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <CoinIcon size={26} />
                </div>
                <div>
                  <p className="text-[11px] text-amber-700">Hadiah curhat hari ini</p>
                  <p className="text-xl font-bold text-amber-800 leading-tight">
                    +{coinHariIni.toLocaleString("id-ID")} <span className="text-sm font-semibold">RWcoin</span>
                  </p>
                  <p className="text-[10px] text-amber-600 mt-0.5">Sudah masuk ke dompetmu</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                <Heart className="w-8 h-8 text-rose-300 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Curhat diterima</p>
                  <p className="text-[11px] text-muted-foreground">Nggak ada coin kali ini, tapi ceritamu tetap didengar</p>
                </div>
              </div>
            )}
            {balasanHariIni && (
              <div className="bg-[hsl(163,55%,22%)]/5 border border-[hsl(163,55%,22%)]/15 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MessageCircleHeart className="w-3.5 h-3.5 text-[hsl(163,55%,22%)] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-[hsl(163,55%,22%)]">Dari sahabatmu</p>
                </div>
                <p className="text-sm leading-relaxed">{balasanHariIni}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Lock className="w-3 h-3 flex-shrink-0" />
              <span>Curhat sudah digunakan hari ini. Bisa dipakai lagi besok setelah tengah malam.</span>
            </div>
          </CardContent>
        )}
      </Card>
    );
  } else {
    curhatCard = (
      <Card className="border-0 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,15%)] px-5 py-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageCircleHeart className="w-5 h-5 text-[hsl(40,45%,65%)]" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Ruang Curhat, {namaDepan}</h2>
              <p className="text-white/70 text-[12px] mt-0.5 leading-relaxed">
                Tulis apapun yang lagi kamu rasain. Bersifat <span className="text-[hsl(40,55%,70%)] font-medium">rahasia</span> — pengurus RW tidak bisa baca isinya.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <Lock className="w-2.5 h-2.5 text-white/70" />
              <span className="text-white/70 text-[10px]">Privasi terjaga</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
              <CoinIcon size={11} />
              <span className="text-white/70 text-[10px]">Dapat hingga 500 coin hari ini</span>
            </div>
          </div>
        </div>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={isi}
            onChange={(e) => setIsi(e.target.value)}
            placeholder={"Ceritain aja semuanya di sini...\n\nMau soal kerjaan, keluarga, tetangga, keuangan, atau perasaan yang nggak tau mau disampaikan ke siapa — tulis aja. Nggak ada yang judge di sini."}
            rows={7}
            className="text-sm resize-none leading-relaxed border-muted-foreground/20 focus:border-[hsl(163,55%,22%)]/50"
            disabled={curhatMutation.isPending}
          />
          {curhatMutation.isError && (
            <p className="text-xs text-destructive px-1">{(curhatMutation.error as Error).message}</p>
          )}
          <Button
            className="w-full gap-2 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)] text-white h-11"
            onClick={() => curhatMutation.mutate(isi)}
            disabled={curhatMutation.isPending || isi.trim().length < 10}
          >
            {curhatMutation.isPending ? (
              <><Sparkles className="w-4 h-4 animate-pulse" />Lagi dianalisis...</>
            ) : (
              <><Send className="w-4 h-4" />Kirim Curhat</>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Curhatanmu dianalisis AI untuk memberi respons yang tepat dan menentukan hadiah coin. Isi curhat bersifat pribadi dan tidak dapat diakses pengurus RW.
          </p>
        </CardContent>
      </Card>
    );
  }

  const kategoriList = ["Semua", ...Array.from(new Set(mitraList.map((m: any) => m.kategori))).sort()];
  const mitraFiltered = filterKategori === "Semua" ? mitraList : mitraList.filter((m: any) => m.kategori === filterKategori);
  const totalHalamanMitra = Math.max(1, Math.ceil(mitraFiltered.length / MITRA_PER_PAGE));
  const mitraHalaman = mitraFiltered.slice((halamanMitra - 1) * MITRA_PER_PAGE, halamanMitra * MITRA_PER_PAGE);

  return (
    <div className="space-y-4">
      {curhatCard}

      {/* Daftar Mitra RWcoin */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4 text-[hsl(163,55%,22%)]" />
            <h3 className="font-semibold text-sm text-[hsl(163,55%,22%)]">Mitra RWcoin</h3>
            {mitraList.length > 0 && (
              <span className="ml-auto text-[11px] text-muted-foreground">{mitraFiltered.length} toko</span>
            )}
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-muted-foreground">
              Toko & usaha warga yang menerima pembayaran RWcoin.
            </p>
            <a
              href="https://wa.me/62895424577140?text=Halo%20Admin%2C%20saya%20ingin%20mendaftarkan%20usaha%20saya%20sebagai%20Mitra%20RWcoin%20RW%2003%20Padasuka."
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 ml-3 flex items-center gap-1.5 text-[11px] font-semibold text-white bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)] rounded-full px-3 py-1.5 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.862L.057 23.882a.5.5 0 0 0 .61.61l6.101-1.494A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.892 0-3.666-.523-5.176-1.432l-.362-.217-3.754.919.944-3.668-.236-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              Daftar Mitra
            </a>
          </div>

          {/* Filter Kategori */}
          {kategoriList.length > 1 && (
            <div className="flex gap-1.5 flex-wrap mb-3">
              {kategoriList.map((k) => (
                <button
                  key={k}
                  onClick={() => { setFilterKategori(k); setHalamanMitra(1); }}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    filterKategori === k
                      ? "bg-[hsl(163,55%,22%)] text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          )}

          {/* List Mitra */}
          {mitraList.length === 0 ? (
            <div className="text-center py-6">
              <Store className="w-8 h-8 mx-auto text-muted-foreground opacity-30 mb-2" />
              <p className="text-sm text-muted-foreground">Belum ada mitra terdaftar</p>
            </div>
          ) : mitraHalaman.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Tidak ada mitra di kategori ini</p>
          ) : (
            <div className="space-y-2">
              {mitraHalaman.map((m: any) => (
                <div key={m.id} className="flex items-start gap-3 py-2.5 border-b last:border-0">
                  <div className="w-9 h-9 rounded-full bg-[hsl(163,55%,22%)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                    {m.namaUsaha[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{m.namaUsaha}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)] px-2 py-0.5 rounded-full font-medium">{m.kategori}</span>
                      <span className="text-[11px] text-muted-foreground">RT {String(m.rt).padStart(2, "0")}</span>
                    </div>
                    {m.alamat && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-[11px] text-muted-foreground truncate">{m.alamat}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground flex-shrink-0 mt-1">{m.kodeWallet}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalHalamanMitra > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <button
                onClick={() => setHalamanMitra((p) => Math.max(1, p - 1))}
                disabled={halamanMitra === 1}
                className="flex items-center gap-1 text-xs font-medium text-[hsl(163,55%,22%)] disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-xs text-muted-foreground">{halamanMitra} / {totalHalamanMitra}</span>
              <button
                onClick={() => setHalamanMitra((p) => Math.min(totalHalamanMitra, p + 1))}
                disabled={halamanMitra === totalHalamanMitra}
                className="flex items-center gap-1 text-xs font-medium text-[hsl(163,55%,22%)] disabled:text-muted-foreground disabled:cursor-not-allowed"
              >
                Berikutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Nomor Penting Perangkat RW */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-[hsl(163,55%,22%)]" />
            <h3 className="font-semibold text-sm text-[hsl(163,55%,22%)]">Kontak Perangkat RW 03</h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Hubungi langsung via WhatsApp untuk keperluan administrasi, keamanan, atau layanan warga.
          </p>
          <div className="space-y-2">
            {kontakPenting.map((k) => (
              <div key={k.nomor} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium leading-tight">{k.nama}</p>
                  <p className="text-[11px] text-muted-foreground">{k.jabatan}</p>
                </div>
                <a
                  href={toWaLink(k.nomor)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-medium text-white bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)] rounded-full px-3 py-1.5 transition-colors flex-shrink-0"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.862L.057 23.882a.5.5 0 0 0 .61.61l6.101-1.494A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.892 0-3.666-.523-5.176-1.432l-.362-.217-3.754.919.944-3.668-.236-.374A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                  </svg>
                  WA
                </a>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
