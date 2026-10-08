import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { bulanKey, bulanLabel, bulanSebelumnya } from "@shared/rtjuara";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import { FotoStrip, PeriodeBadge, PoinBadge, StatusBuktiBadge } from "@/components/rtjuara/rtjuara-ui";

const HIJAU = "hsl(163,55%,22%)";

/** Enam bulan terakhir sebagai pilihan filter. */
function daftarBulan(): string[] {
  const list: string[] = [];
  let key = bulanKey();
  for (let i = 0; i < 6; i++) {
    list.push(key);
    key = bulanSebelumnya(key);
  }
  return list;
}

export default function RtjuaraRiwayat() {
  const [bulan, setBulan] = useState(() => bulanKey());
  const bulanOptions = daftarBulan();

  const { data: riwayat = [], isPending } = useQuery({
    queryKey: [RTJUARA_API.submission, bulan],
    queryFn: () => rtjuaraApi.rt.riwayat(bulan),
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-bold text-base" style={{ color: HIJAU }}>
          Riwayat Bukti
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Semua bukti quest yang sudah dikirim RT kamu.
        </p>
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

      {isPending ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      ) : riwayat.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm font-medium">Belum ada bukti di {bulanLabel(bulan)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Kirim bukti quest dari tab Quest untuk mulai mengumpulkan poin.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {riwayat.map((item) => (
            <div key={item.id} className="rounded-xl border bg-card p-4 space-y-2.5" data-testid={`riwayat-${item.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm leading-snug" style={{ color: HIJAU }}>
                    {item.judulKegiatan}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Quest: {item.questJudul}</p>
                </div>
                <PoinBadge
                  poin={item.status === "disetujui" ? item.poinDiberikan : item.poinPotensi}
                  muted={item.status !== "disetujui"}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusBuktiBadge status={item.status} />
                <PeriodeBadge periode={item.questPeriode} />
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> {item.tanggalKegiatan}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> {item.lokasi}
                </span>
                {item.jumlahPeserta != null && (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {item.jumlahPeserta} peserta
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.deskripsi}</p>

              <FotoStrip fotoIds={item.fotoIds} alt={item.judulKegiatan} />

              {item.catatanAdmin && (
                <div className="rounded-lg bg-muted/60 p-2.5">
                  <p className="text-[11px] font-medium">Catatan admin RW</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.catatanAdmin}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
