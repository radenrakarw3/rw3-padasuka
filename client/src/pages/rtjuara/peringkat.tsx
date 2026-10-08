import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RTJUARA_API } from "@shared/rtjuara-api";
import { RTJUARA_TAGLINE, bulanLabel, peringkatMedali, rtLabel } from "@shared/rtjuara";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import { PapanPeringkat } from "@/components/rtjuara/rtjuara-ui";
import { useRtjuaraAuth } from "@/lib/rtjuara-auth";

const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";

export default function RtjuaraPeringkat() {
  const { sesi } = useRtjuaraAuth();

  const { data: ringkasan, isPending } = useQuery({
    queryKey: [RTJUARA_API.ringkasan],
    queryFn: () => rtjuaraApi.rt.ringkasan(),
  });

  const { data: juaraData } = useQuery({
    queryKey: [RTJUARA_API.publik.juara],
    queryFn: () => rtjuaraApi.publik.juara(),
  });

  const juaraUtama = juaraData?.juara.find((j) => j.peringkat === 1);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="font-bold text-base" style={{ color: HIJAU }}>
          Papan Peringkat
        </h2>
        <p className="text-xs font-medium" style={{ color: EMAS }}>
          {RTJUARA_TAGLINE}
        </p>
      </div>

      {juaraUtama && (
        <div className="rounded-2xl border p-4 text-center" style={{ borderColor: EMAS, backgroundColor: "hsl(40,60%,97%)" }}>
          <Trophy className="w-8 h-8 mx-auto" style={{ color: EMAS }} />
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-2">
            {peringkatMedali(1)} {bulanLabel(juaraData!.bulan)}
          </p>
          <p className="text-xl font-bold mt-0.5" style={{ color: HIJAU }}>
            {rtLabel(juaraUtama.rt)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {juaraUtama.totalPoin} poin · {juaraUtama.jumlahQuest} quest selesai
          </p>
        </div>
      )}

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground text-center">
            Perolehan poin {ringkasan ? bulanLabel(ringkasan.bulan) : "bulan ini"}
          </p>
          <PapanPeringkat rows={ringkasan?.leaderboard ?? []} sorotRt={sesi?.rt ?? null} />
        </>
      )}

      <p className="text-center text-[11px] text-muted-foreground pt-1">
        Poin hanya dihitung dari bukti yang sudah disetujui admin RW 03.
      </p>
    </div>
  );
}
