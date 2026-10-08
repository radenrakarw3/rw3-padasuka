import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, CheckCircle2, Clock, Info, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RTJUARA_API } from "@shared/rtjuara-api";
import {
  RTJUARA_PERIODE,
  RTJUARA_PERIODE_KETERANGAN,
  RTJUARA_PERIODE_LABEL,
  bulanLabel,
  type RtjuaraPeriode,
} from "@shared/rtjuara";
import { rtjuaraApi, type QuestUntukRt } from "@/lib/rtjuara-api";
import { PoinBadge, StatusBuktiBadge } from "@/components/rtjuara/rtjuara-ui";
import { useRtjuaraAuth } from "@/lib/rtjuara-auth";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";

function KartuQuest({ quest, onKirim }: { quest: QuestUntukRt; onKirim: () => void }) {
  const klaim = quest.klaim;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3" data-testid={`quest-${quest.id}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-snug flex-1" style={{ color: HIJAU }}>
          {quest.judul}
        </h3>
        <PoinBadge poin={quest.poin} muted={klaim?.status === "ditolak"} />
      </div>

      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{quest.deskripsi}</p>

      {quest.instruksiBukti && (
        <div className="flex gap-2 rounded-lg bg-muted/60 p-2.5">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{quest.instruksiBukti}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarCheck className="w-3.5 h-3.5" />
          Minimal {quest.minFoto} foto dokumentasi
        </span>
        {quest.wajibJumlahPeserta && <span>Wajib isi jumlah peserta</span>}
      </div>

      {klaim ? (
        <div className="rounded-lg border p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <StatusBuktiBadge status={klaim.status} />
            {klaim.status === "disetujui" && (
              <span className="text-xs font-bold" style={{ color: EMAS }}>
                +{klaim.poinDiberikan} poin
              </span>
            )}
          </div>
          {klaim.catatanAdmin && (
            <p className="text-[11px] text-muted-foreground">Catatan admin: {klaim.catatanAdmin}</p>
          )}
          {klaim.status === "menunggu" && (
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> Bukti sedang diperiksa admin RW.
            </p>
          )}
          {klaim.status === "disetujui" && (
            <p className="text-[11px] text-emerald-700 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Selesai untuk periode ini.
            </p>
          )}
          {klaim.status === "ditolak" && (
            <p className="text-[11px] text-red-700 inline-flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Bukti ditolak — kamu masih bisa kirim ulang.
            </p>
          )}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={onKirim}
        disabled={!quest.bisaKirim}
        className="w-full h-10 text-white text-sm font-semibold"
        style={{ backgroundColor: quest.bisaKirim ? HIJAU : undefined }}
        variant={quest.bisaKirim ? "default" : "secondary"}
        data-testid={`button-kirim-${quest.id}`}
      >
        {quest.bisaKirim
          ? klaim?.status === "ditolak"
            ? "Kirim Bukti Ulang"
            : "Kirim Bukti"
          : "Sudah dikirim periode ini"}
      </Button>
    </div>
  );
}

export default function RtjuaraQuest() {
  const [, setLocation] = useLocation();
  const { sesi } = useRtjuaraAuth();
  const [tab, setTab] = useState<RtjuaraPeriode>("harian");

  const { data: quests = [], isPending } = useQuery({
    queryKey: [RTJUARA_API.quest],
    queryFn: () => rtjuaraApi.rt.quest(),
  });

  const { data: ringkasan } = useQuery({
    queryKey: [RTJUARA_API.ringkasan],
    queryFn: () => rtjuaraApi.rt.ringkasan(),
  });

  const perPeriode = useMemo(() => {
    const map: Record<RtjuaraPeriode, QuestUntukRt[]> = { harian: [], mingguan: [], bulanan: [] };
    for (const q of quests) {
      const p = q.periode as RtjuaraPeriode;
      if (map[p]) map[p].push(q);
    }
    return map;
  }, [quests]);

  const daftar = perPeriode[tab];

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 text-white"
        style={{ background: `linear-gradient(135deg, ${HIJAU}, hsl(163,45%,32%))` }}
      >
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
          {ringkasan ? bulanLabel(ringkasan.bulan) : "Bulan ini"}
        </p>
        <div className="flex items-end justify-between gap-3 mt-1">
          <div>
            <p className="text-3xl font-bold" style={{ color: "hsl(40,45%,70%)" }}>
              {ringkasan?.totalPoin ?? 0}
              <span className="text-sm font-medium ml-1 text-white/80">poin</span>
            </p>
            <p className="text-xs text-white/80 mt-0.5">
              {ringkasan?.disetujui ?? 0} quest selesai
              {(ringkasan?.menunggu ?? 0) > 0 && ` · ${ringkasan?.menunggu} menunggu`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setLocation("/rtjuara/peringkat")}
            className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-2"
          >
            <Trophy className="w-4 h-4" style={{ color: "hsl(40,45%,70%)" }} />
            <span className="text-xs font-semibold">Peringkat {ringkasan?.peringkat ?? "-"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted rounded-lg">
        {RTJUARA_PERIODE.map((periode) => (
          <button
            key={periode}
            type="button"
            onClick={() => setTab(periode)}
            className={`py-2 rounded-md text-xs font-semibold transition-colors ${
              tab === periode ? "bg-white shadow-sm text-[hsl(163,55%,22%)]" : "text-muted-foreground"
            }`}
            data-testid={`tab-${periode}`}
          >
            {RTJUARA_PERIODE_LABEL[periode]}
            {perPeriode[periode].length > 0 && (
              <span className="ml-1 text-[10px] opacity-70">({perPeriode[periode].length})</span>
            )}
          </button>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground -mt-2 px-1">{RTJUARA_PERIODE_KETERANGAN[tab]}</p>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : daftar.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Belum ada quest {RTJUARA_PERIODE_LABEL[tab].toLowerCase()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Admin RW belum membuat quest untuk periode ini. Cek lagi nanti ya.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {daftar.map((quest) => (
            <KartuQuest
              key={quest.id}
              quest={quest}
              onKirim={() => setLocation(`/rtjuara/kirim/${quest.id}`)}
            />
          ))}
        </div>
      )}

      {sesi && (
        <p className="text-center text-[11px] text-muted-foreground pt-2">
          Poin masuk setelah bukti diverifikasi admin RW 03.
        </p>
      )}
    </div>
  );
}
