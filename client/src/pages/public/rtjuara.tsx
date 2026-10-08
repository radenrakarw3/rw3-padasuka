import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Award, Camera, LogIn, Medal, Trophy } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { RTJUARA_API } from "@shared/rtjuara-api";
import {
  RTJUARA_PERIODE_LABEL,
  RTJUARA_TAGLINE,
  bulanKey,
  bulanLabel,
  bulanSebelumnya,
  rtLabel,
  type RtjuaraPeriode,
} from "@shared/rtjuara";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import { PapanPeringkat } from "@/components/rtjuara/rtjuara-ui";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";

function daftarBulan(): string[] {
  const list: string[] = [];
  let key = bulanKey();
  for (let i = 0; i < 4; i++) {
    list.push(key);
    key = bulanSebelumnya(key);
  }
  return list;
}

function PodiumIkon({ peringkat }: { peringkat: number }) {
  if (peringkat === 1) return <Trophy className="w-6 h-6" style={{ color: EMAS }} />;
  if (peringkat === 2) return <Medal className="w-6 h-6 text-slate-400" />;
  return <Award className="w-6 h-6 text-amber-700" />;
}

export default function PublicRtjuara() {
  const [bulan, setBulan] = useState(() => bulanKey());
  const bulanOptions = daftarBulan();

  const { data: papan, isPending: loadingPapan } = useQuery({
    queryKey: [RTJUARA_API.publik.leaderboard, bulan],
    queryFn: () => rtjuaraApi.publik.leaderboard(bulan),
  });

  const { data: juaraData } = useQuery({
    queryKey: [RTJUARA_API.publik.juara],
    queryFn: () => rtjuaraApi.publik.juara(),
  });

  const { data: galeri = [] } = useQuery({
    queryKey: [RTJUARA_API.publik.galeri, bulan],
    queryFn: () => rtjuaraApi.publik.galeri(bulan),
  });

  const podium = (juaraData?.juara ?? []).filter((j) => j.peringkat <= 3);

  return (
    <PublicKioskLayout title="RT JUARA">
      <div className="space-y-6">
        <div
          className="rounded-2xl p-5 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${HIJAU}, hsl(163,45%,34%))` }}
        >
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/70">Program RW 03 Padasuka</p>
          <h1 className="text-xl font-bold mt-1.5" style={{ color: "hsl(40,45%,72%)" }}>
            {RTJUARA_TAGLINE}
          </h1>
          <p className="text-xs text-white/85 mt-2 leading-relaxed">
            Setiap RT mengerjakan quest harian, mingguan, dan bulanan. Bukti kegiatan diverifikasi
            admin RW, poin dikumpulkan, dan RT dengan poin tertinggi diumumkan sebagai RT Juara
            setiap bulan.
          </p>
        </div>

        {podium.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold" style={{ color: HIJAU }}>
              RT Juara {bulanLabel(juaraData!.bulan)}
            </h2>
            <div className="space-y-2">
              {podium.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center gap-3 rounded-xl border p-3"
                  style={
                    j.peringkat === 1
                      ? { borderColor: EMAS, backgroundColor: "hsl(40,60%,97%)" }
                      : undefined
                  }
                >
                  <PodiumIkon peringkat={j.peringkat} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: HIJAU }}>
                      {rtLabel(j.rt)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Juara {j.peringkat} · {j.jumlahQuest} quest selesai
                    </p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: EMAS }}>
                    {j.totalPoin} poin
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold" style={{ color: HIJAU }}>
              Papan Peringkat
            </h2>
            {papan?.sudahDiumumkan && (
              <span className="text-[10px] rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5">
                Sudah diumumkan
              </span>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {bulanOptions.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setBulan(key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  bulan === key
                    ? "bg-[hsl(163,55%,22%)] text-white border-[hsl(163,55%,22%)]"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {bulanLabel(key)}
              </button>
            ))}
          </div>

          {loadingPapan ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : (
            <PapanPeringkat rows={papan?.leaderboard ?? []} />
          )}
        </section>

        {galeri.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: HIJAU }}>
              <Camera className="w-4 h-4" /> Dokumentasi Kegiatan
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {galeri.map((item) => (
                <div key={item.id} className="rounded-xl border overflow-hidden bg-card">
                  {item.fotoId != null ? (
                    <img
                      src={rtjuaraApi.fotoUrl(item.fotoId)}
                      alt={item.judulKegiatan}
                      loading="lazy"
                      className="w-full h-28 object-cover"
                    />
                  ) : (
                    <div className="w-full h-28 bg-muted" />
                  )}
                  <div className="p-2.5 space-y-1">
                    <p className="text-[11px] font-semibold leading-snug line-clamp-2" style={{ color: HIJAU }}>
                      {item.judulKegiatan}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {rtLabel(item.rt)} · {RTJUARA_PERIODE_LABEL[item.questPeriode as RtjuaraPeriode] ?? item.questPeriode}
                    </p>
                    <p className="text-[10px] font-bold" style={{ color: EMAS }}>
                      +{item.poinDiberikan} poin
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <Link
          href="/rtjuara/login"
          className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors no-underline"
        >
          <LogIn className="w-4 h-4" />
          Masuk sebagai Ketua RT
        </Link>
      </div>
    </PublicKioskLayout>
  );
}
