import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { wargaAnggotaQueryOptions, wargaCurhatKuotaQueryOptions, wargaMitraQueryOptions } from "@/lib/warga-prefetch";
import {
  MessageCircleHeart, Lock, Sparkles, Send, Phone,
  Store, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ShoppingBag, Star,
  Sun, Users, Award, Coffee, Lightbulb,
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

const CONFETTI_PIECES = [
  { x: 8,  y: -10, color: "#F59E0B", size: 9,  rot: 20,  delay: 0 },
  { x: 20, y: -20, color: "#10B981", size: 7,  rot: -30, delay: 0.08 },
  { x: 35, y: -8,  color: "#EF4444", size: 8,  rot: 45,  delay: 0.15 },
  { x: 50, y: -25, color: "#8B5CF6", size: 6,  rot: -10, delay: 0.05 },
  { x: 65, y: -12, color: "#F59E0B", size: 10, rot: 60,  delay: 0.2 },
  { x: 78, y: -18, color: "#3B82F6", size: 7,  rot: -45, delay: 0.1 },
  { x: 90, y: -6,  color: "#EC4899", size: 8,  rot: 15,  delay: 0.18 },
  { x: 14, y: -30, color: "#06B6D4", size: 6,  rot: -60, delay: 0.25 },
  { x: 42, y: -15, color: "#F97316", size: 9,  rot: 30,  delay: 0.12 },
  { x: 72, y: -28, color: "#84CC16", size: 7,  rot: -20, delay: 0.22 },
  { x: 55, y: -5,  color: "#A855F7", size: 8,  rot: 75,  delay: 0.03 },
  { x: 30, y: -22, color: "#F59E0B", size: 5,  rot: -50, delay: 0.17 },
  { x: 85, y: -14, color: "#EF4444", size: 6,  rot: 40,  delay: 0.07 },
  { x: 5,  y: -32, color: "#10B981", size: 7,  rot: -35, delay: 0.28 },
  { x: 60, y: -20, color: "#3B82F6", size: 9,  rot: 55,  delay: 0.14 },
  { x: 95, y: -10, color: "#EC4899", size: 6,  rot: -25, delay: 0.09 },
];

function CelebrationOverlay({ coin, onDismiss }: { coin: number; onDismiss: () => void }) {
  const [displayed, setDisplayed] = useState(0);
  const [phase, setPhase] = useState<"in" | "out">("in");

  useEffect(() => {
    const steps = 50;
    const duration = 1800;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * coin));
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    const outTimer = setTimeout(() => setPhase("out"), 3800);
    const dismissTimer = setTimeout(onDismiss, 4400);

    return () => {
      clearInterval(timer);
      clearTimeout(outTimer);
      clearTimeout(dismissTimer);
    };
  }, [coin, onDismiss]);

  const tier = coin >= 2500 ? "luar biasa" : coin >= 1800 ? "sangat baik" : coin >= 1000 ? "baik" : "cukup baik";
  const tierColor = coin >= 2500 ? "#F59E0B" : coin >= 1800 ? "#10B981" : coin >= 1000 ? "#3B82F6" : "#8B5CF6";

  return (
    <>
      <style>{`
        @keyframes celebFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes celebFadeOut { from { opacity: 1 } to { opacity: 0 } }
        @keyframes celebCardUp { from { opacity: 0; transform: translateY(40px) scale(0.88) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes celebCardOut { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(0.9) } }
        @keyframes coinPop { 0% { transform: scale(0) rotate(-20deg) } 60% { transform: scale(1.25) rotate(8deg) } 80% { transform: scale(0.92) rotate(-4deg) } 100% { transform: scale(1) rotate(0deg) } }
        @keyframes coinGlow { 0%,100% { box-shadow: 0 0 24px 6px rgba(245,158,11,0.5) } 50% { box-shadow: 0 0 48px 16px rgba(245,158,11,0.8) } }
        @keyframes numPop { 0% { opacity: 0; transform: scale(0.4) } 70% { transform: scale(1.1) } 100% { opacity: 1; transform: scale(1) } }
        @keyframes confettiUp { 0% { transform: translateY(0) rotate(0deg); opacity: 1 } 100% { transform: translateY(-220px) rotate(360deg); opacity: 0 } }
        @keyframes starPulse { 0%,100% { transform: scale(1) rotate(0deg); opacity: 0.9 } 50% { transform: scale(1.4) rotate(180deg); opacity: 1 } }
        @keyframes floatBadge { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        .celeb-overlay { animation: celebFadeIn 0.3s ease forwards }
        .celeb-overlay.out { animation: celebFadeOut 0.6s ease forwards }
        .celeb-card { animation: celebCardUp 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s both }
        .celeb-card.out { animation: celebCardOut 0.5s ease forwards }
        .coin-anim { animation: coinPop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.3s both, coinGlow 1.5s ease-in-out 1s infinite }
        .num-anim { animation: numPop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.7s both }
        .star-anim { animation: starPulse 2s ease-in-out infinite }
        .badge-float { animation: floatBadge 2s ease-in-out 1s infinite }
      `}</style>
      <div
        className={`celeb-overlay${phase === "out" ? " out" : ""} fixed inset-0 z-50 flex items-center justify-center px-4`}
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
        onClick={onDismiss}
      >
        {/* Confetti */}
        {CONFETTI_PIECES.map((p, i) => (
          <div
            key={i}
            style={{
              position: "fixed",
              left: `${p.x}%`,
              bottom: "38%",
              width: p.size,
              height: p.size * 1.6,
              background: p.color,
              borderRadius: 2,
              animation: `confettiUp 1.4s ease-out ${p.delay + 0.4}s both`,
              transform: `rotate(${p.rot}deg)`,
            }}
          />
        ))}

        {/* Card */}
        <div
          className={`celeb-card${phase === "out" ? " out" : ""} w-full max-w-sm mx-4 rounded-3xl overflow-hidden`}
          style={{ background: "linear-gradient(160deg, #1a3a2e 0%, #0f2419 100%)" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Top decoration */}
          <div className="flex justify-center gap-3 pt-6 pb-2">
            {[0, 0.3, 0.6].map((d, i) => (
              <div key={i} className="star-anim" style={{ animationDelay: `${d}s` }}>
                <Star fill={tierColor} stroke="none" className="w-5 h-5" />
              </div>
            ))}
          </div>

          {/* Coin */}
          <div className="flex justify-center pt-2 pb-4">
            <div
              className="coin-anim w-24 h-24 rounded-full flex items-center justify-center"
              style={{ background: "radial-gradient(circle at 35% 35%, #FCD34D, #D97706)" }}
            >
              <svg width="64" height="64" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="9.5" fill="#92400E" />
                <circle cx="10" cy="10" r="9" fill="#D97706" />
                <circle cx="10" cy="10" r="8" fill="#F59E0B" />
                <circle cx="10" cy="10" r="6.8" fill="#FCD34D" />
                <circle cx="10" cy="10" r="5.8" fill="none" stroke="#D97706" strokeWidth="0.6" />
                <ellipse cx="8" cy="7.5" rx="2.2" ry="1.1" fill="white" fillOpacity="0.28" transform="rotate(-25 8 7.5)" />
                <text x="10" y="13.2" textAnchor="middle" fill="#78350F" fontSize="4.8" fontWeight="900" fontFamily="Arial,sans-serif">RW</text>
              </svg>
            </div>
          </div>

          {/* Amount */}
          <div className="num-anim text-center px-6 pb-2">
            <p className="text-white/60 text-sm mb-1">Kamu mendapatkan</p>
            <p className="text-5xl font-black tracking-tight" style={{ color: tierColor }}>
              +{displayed.toLocaleString("id-ID")}
            </p>
            <p className="text-white/80 text-lg font-semibold mt-1">RWcoin</p>
          </div>

          {/* Tier badge */}
          <div className="flex justify-center pb-4">
            <div
              className="badge-float flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
              style={{ background: `${tierColor}22`, border: `1.5px solid ${tierColor}55`, color: tierColor }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Rasa syukur {tier}!
            </div>
          </div>

          {/* Bottom hint */}
          <div
            className="text-center py-3 text-white/40 text-xs border-t"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            Ketuk di mana saja untuk menutup
          </div>
        </div>
      </div>
    </>
  );
}

const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
function formatTanggalHariIni() {
  const d = new Date();
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

const KATEGORI_SYUKUR = [
  {
    Icon: Sun,
    label: "Kejadian hari ini",
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    dotColor: "#F59E0B",
    placeholder: "Cerita satu hal yang terjadi hari ini dan bikin kamu lega, senang, atau merasa beruntung...",
  },
  {
    Icon: Users,
    label: "Orang di sekitarmu hari ini",
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    dotColor: "#10B981",
    placeholder: "Siapa yang menyapamu, membantumu, atau hadir di hidupmu hari ini?",
  },
  {
    Icon: Award,
    label: "Yang kamu capai hari ini",
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-200",
    dotColor: "#3B82F6",
    placeholder: "Hal kecil yang kamu selesaikan atau berhasil kamu lakukan hari ini, sekecil apapun...",
  },
  {
    Icon: Coffee,
    label: "Nikmat yang kamu rasakan hari ini",
    colorClass: "text-violet-600",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-200",
    dotColor: "#8B5CF6",
    placeholder: "Makanan, udara segar, kesehatan, atau hal sederhana yang kamu nikmati hari ini...",
  },
  {
    Icon: Lightbulb,
    label: "Yang kamu pelajari hari ini",
    colorClass: "text-pink-600",
    bgClass: "bg-pink-50",
    borderClass: "border-pink-200",
    dotColor: "#EC4899",
    placeholder: "Satu pelajaran, momen kesadaran, atau perasaan baru yang muncul hari ini...",
  },
] as const;

const MITRA_PER_PAGE = 5;

export default function WargaBeranda() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [items, setItems] = useState(["", "", "", "", ""]);
  const [hasil, setHasil] = useState<{
    coin: number; balasan: string;
  } | null>(null);
  const [celebration, setCelebration] = useState<{ coin: number } | null>(null);
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [halamanMitra, setHalamanMitra] = useState(1);
  const [showDetailCurhat, setShowDetailCurhat] = useState(false);
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<"fwd" | "bwd">("fwd");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: anggota, isLoading } = useQuery<Warga[]>({
    ...wargaAnggotaQueryOptions(user?.kkId),
  });

  const { data: kuota } = useQuery<{ sudahCurhatHariIni: boolean; coinDiberikan: number; balasanGemini: string | null }>({
    ...wargaCurhatKuotaQueryOptions(),
    enabled: !!user,
  });

  const { data: mitraList = [] } = useQuery<any[]>({
    ...wargaMitraQueryOptions(),
  });

  const curhatMutation = useMutation({
    mutationFn: async (itemsList: string[]) => {
      const res = await fetch("/api/warga/curhat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsList }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Terjadi kesalahan, coba lagi");
      return data;
    },
    onSuccess: (data) => {
      setHasil(data);
      setShowDetailCurhat(true);
      setItems(["", "", "", "", ""]);
      setStep(0);
      setCelebration({ coin: data.coin });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/curhat/kuota"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warga/rwcoin/wallet"] });
    },
  });

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [step]);

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

  // ---- Kartu syukur ----
  const coinHariIni = hasil ? hasil.coin : (kuota?.coinDiberikan ?? 0);
  const balasanHariIni = hasil ? hasil.balasan : (kuota?.balasanGemini ?? null);
  const tanggalHariIni = formatTanggalHariIni();

  const kat = KATEGORI_SYUKUR[step];
  const stepFilled = items[step].trim().length >= 3;
  const isLastStep = step === 4;

  function goNext() {
    setSlideDir("fwd");
    setStep(s => s + 1);
  }
  function goPrev() {
    setSlideDir("bwd");
    setStep(s => s - 1);
  }

  let curhatCard: React.ReactNode;

  if (sudahCurhat || hasil) {
    curhatCard = (
      <Card className="border-0 overflow-hidden shadow-sm">
        <button
          onClick={() => setShowDetailCurhat((v) => !v)}
          className="w-full bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,15%)] px-5 py-3.5 flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <Star className="w-3.5 h-3.5 text-[hsl(40,45%,65%)]" fill="currentColor" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm leading-tight">Jurnal Syukur, {namaDepan}</p>
              <p className="text-white/50 text-[10px]">{tanggalHariIni}</p>
            </div>
            {coinHariIni > 0 && (
              <span className="flex items-center gap-1 bg-white/15 rounded-full px-2 py-0.5 text-[10px] text-white/90 font-medium ml-1">
                +{coinHariIni.toLocaleString("id-ID")} <CoinIcon size={10} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-white/50 text-[11px]">
            <span>{showDetailCurhat ? "Tutup" : "Lihat"}</span>
            {showDetailCurhat ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </button>
        {showDetailCurhat && (
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
              <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <CoinIcon size={26} />
              </div>
              <div>
                <p className="text-[11px] text-amber-700">Hadiah syukur hari ini</p>
                <p className="text-xl font-bold text-amber-800 leading-tight">
                  +{coinHariIni.toLocaleString("id-ID")} <span className="text-sm font-semibold">RWcoin</span>
                </p>
                <p className="text-[10px] text-amber-600 mt-0.5">Sudah masuk ke dompetmu</p>
              </div>
            </div>
            {balasanHariIni && (
              <div className="bg-[hsl(163,55%,22%)]/5 border border-[hsl(163,55%,22%)]/15 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <MessageCircleHeart className="w-3.5 h-3.5 text-[hsl(163,55%,22%)] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-semibold text-[hsl(163,55%,22%)]">Apresiasi untukmu</p>
                </div>
                <p className="text-sm leading-relaxed">{balasanHariIni}</p>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              <Lock className="w-3 h-3 flex-shrink-0" />
              <span>Selesai hari ini. Jurnal besok buka lagi pukul 00:00.</span>
            </div>
          </CardContent>
        )}
      </Card>
    );
  } else {
    curhatCard = (
      <Card className="border-0 overflow-hidden shadow-sm">
        <style>{`
          @keyframes slideFwd { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: translateX(0) } }
          @keyframes slideBwd { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
          .slide-fwd { animation: slideFwd 0.22s ease both }
          .slide-bwd { animation: slideBwd 0.22s ease both }
        `}</style>

        {/* Header: tanggal + progress */}
        <div className="bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,15%)] px-5 pt-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60 text-[11px]">{tanggalHariIni}</span>
            <span className="text-white/60 text-[11px]">{step + 1} dari 5</span>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {KATEGORI_SYUKUR.map((k, i) => (
              <div
                key={i}
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: i < step
                    ? k.dotColor
                    : i === step
                    ? `${k.dotColor}cc`
                    : "rgba(255,255,255,0.18)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Step content */}
        <div key={step} className={`slide-${slideDir}`}>
          {/* Category header */}
          <div
            className="px-5 pt-5 pb-4 flex items-center gap-4"
            style={{ background: `${kat.dotColor}10` }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${kat.dotColor}20` }}
            >
              <kat.Icon className="w-7 h-7" style={{ color: kat.dotColor }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: kat.dotColor }}>
                {kat.label}
              </p>
              <p className="text-base font-bold text-foreground leading-snug mt-0.5">
                {[
                  "Apa yang terjadi hari ini yang bikin kamu lega atau senang?",
                  "Siapa yang hadir dan berarti bagimu hari ini?",
                  "Apa yang berhasil kamu lakukan hari ini?",
                  "Nikmat apa yang kamu rasakan hari ini?",
                  "Apa yang kamu pelajari atau sadari hari ini?",
                ][step]}
              </p>
            </div>
          </div>

          {/* Textarea */}
          <div className="px-5 py-4">
            <Textarea
              ref={textareaRef}
              value={items[step]}
              onChange={(e) => {
                const next = [...items];
                next[step] = e.target.value;
                setItems(next);
              }}
              placeholder={kat.placeholder}
              rows={4}
              className="text-sm resize-none leading-relaxed w-full border-muted-foreground/20 focus:border-[hsl(163,55%,22%)]/50"
              disabled={curhatMutation.isPending}
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {[
                "Contoh: rapat lancar, dapat rezeki tak terduga, sembuh dari sakit...",
                "Contoh: teman yang menghibur, keluarga yang menemani, tetangga yang baik...",
                "Contoh: selesaikan pekerjaan, tidak marah padahal capek, bantu orang lain...",
                "Contoh: makan enak, tubuh sehat, tidur nyenyak, air bersih, udara segar...",
                "Contoh: sabar itu berat tapi perlu, rejeki datang tak terduga, hidup itu indah...",
              ][step]}
            </p>
          </div>

          {/* Error */}
          {curhatMutation.isError && isLastStep && (
            <p className="text-xs text-destructive px-5 pb-2">{(curhatMutation.error as Error).message}</p>
          )}

          {/* Navigation */}
          <div className="px-5 pb-5 flex gap-3">
            {step > 0 ? (
              <Button
                variant="outline"
                className="flex-1 h-12 gap-2"
                onClick={goPrev}
                disabled={curhatMutation.isPending}
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </Button>
            ) : (
              <div className="flex-1" />
            )}

            {!isLastStep ? (
              <Button
                className="flex-1 h-12 gap-2 font-semibold"
                style={{ background: stepFilled ? kat.dotColor : undefined }}
                onClick={goNext}
                disabled={!stepFilled}
              >
                Lanjut <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="flex-1 h-12 gap-2 bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)] text-white font-semibold"
                onClick={() => curhatMutation.mutate(items)}
                disabled={curhatMutation.isPending || !stepFilled}
              >
                {curhatMutation.isPending ? (
                  <><Sparkles className="w-4 h-4 animate-pulse" />Menilai...</>
                ) : (
                  <><Send className="w-4 h-4" />Kirim Jurnal</>
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  const kategoriList = ["Semua", ...Array.from(new Set(mitraList.map((m: any) => m.kategori))).sort()];
  const mitraFiltered = filterKategori === "Semua" ? mitraList : mitraList.filter((m: any) => m.kategori === filterKategori);
  const totalHalamanMitra = Math.max(1, Math.ceil(mitraFiltered.length / MITRA_PER_PAGE));
  const mitraHalaman = mitraFiltered.slice((halamanMitra - 1) * MITRA_PER_PAGE, halamanMitra * MITRA_PER_PAGE);

  return (
    <div className="space-y-4">
      {celebration && (
        <CelebrationOverlay
          coin={celebration.coin}
          onDismiss={() => setCelebration(null)}
        />
      )}
      {curhatCard}

      {/* Banner UMKM */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-[hsl(40,45%,55%)] to-[hsl(40,45%,45%)] px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Ayo Belanja di UMKM RW 03!</p>
              <p className="text-white/80 text-[11px] mt-0.5 leading-relaxed">
                Dukung usaha warga sekitar — bayar pakai RWcoin, dapat keuntungan lebih!
              </p>
            </div>
          </div>
          <button
            onClick={() => setLocation("/warga/rwcoin")}
            className="flex-shrink-0 bg-white text-[hsl(40,45%,40%)] font-semibold text-[11px] px-3 py-2 rounded-lg hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            Belanja Sekarang
          </button>
        </div>
      </Card>

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
