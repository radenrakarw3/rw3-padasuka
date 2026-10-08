import { Trophy, Medal, Award } from "lucide-react";
import {
  RTJUARA_PERIODE_LABEL,
  RTJUARA_STATUS_LABEL,
  rtLabel,
  type RtjuaraPeriode,
  type RtjuaraStatus,
} from "@shared/rtjuara";
import { rtjuaraApi, type LeaderboardRow } from "@/lib/rtjuara-api";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";

const statusStyle: Record<RtjuaraStatus, string> = {
  menunggu: "bg-amber-50 text-amber-800 border-amber-200",
  disetujui: "bg-emerald-50 text-emerald-800 border-emerald-200",
  ditolak: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBuktiBadge({ status }: { status: RtjuaraStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusStyle[status] ?? statusStyle.menunggu}`}
    >
      {RTJUARA_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PeriodeBadge({ periode }: { periode: RtjuaraPeriode | string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {RTJUARA_PERIODE_LABEL[periode as RtjuaraPeriode] ?? periode}
    </span>
  );
}

export function PoinBadge({ poin, muted = false }: { poin: number; muted?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: muted ? "hsl(0,0%,65%)" : EMAS }}
    >
      {poin} poin
    </span>
  );
}

/** Deretan thumbnail dokumentasi; klik untuk membuka foto ukuran penuh. */
export function FotoStrip({ fotoIds, alt }: { fotoIds: number[]; alt: string }) {
  if (!fotoIds.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {fotoIds.map((id) => (
        <a
          key={id}
          href={rtjuaraApi.fotoUrl(id)}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0"
        >
          <img
            src={rtjuaraApi.fotoUrl(id)}
            alt={alt}
            loading="lazy"
            className="w-20 h-20 object-cover rounded-lg border"
          />
        </a>
      ))}
    </div>
  );
}

function PeringkatIkon({ peringkat }: { peringkat: number }) {
  if (peringkat === 1) return <Trophy className="w-4 h-4" style={{ color: EMAS }} />;
  if (peringkat === 2) return <Medal className="w-4 h-4 text-slate-400" />;
  if (peringkat === 3) return <Award className="w-4 h-4 text-amber-700" />;
  return <span className="w-4 text-center text-xs font-bold text-muted-foreground">{peringkat}</span>;
}

/** Papan peringkat RT — dipakai di portal RT, panel admin, dan halaman publik. */
export function PapanPeringkat({
  rows,
  sorotRt,
}: {
  rows: LeaderboardRow[];
  sorotRt?: number | null;
}) {
  const poinTertinggi = Math.max(1, ...rows.map((r) => r.totalPoin));

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const disorot = sorotRt === row.rt;
        return (
          <div
            key={row.rt}
            className={`rounded-xl border p-3 ${disorot ? "border-[hsl(163,55%,22%)] bg-[hsl(163,55%,97%)]" : "bg-card"}`}
            data-testid={`peringkat-rt-${row.rt}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 flex justify-center">
                <PeringkatIkon peringkat={row.peringkat} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm" style={{ color: HIJAU }}>
                    {rtLabel(row.rt)}
                    {disorot && <span className="ml-1 text-[10px] font-normal text-muted-foreground">(RT kamu)</span>}
                  </p>
                  <p className="text-sm font-bold" style={{ color: EMAS }}>
                    {row.totalPoin} poin
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((row.totalPoin / poinTertinggi) * 100)}%`,
                      backgroundColor: HIJAU,
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {row.jumlahQuest} quest selesai
                  {row.menunggu > 0 && ` · ${row.menunggu} menunggu verifikasi`}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
