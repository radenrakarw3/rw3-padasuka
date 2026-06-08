import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { Skeleton } from "@/components/ui/skeleton";
import type { UmkmMakeover } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";

type KampungUmkmResponse = {
  units: UmkmMakeover[];
  progress: { total: number; selesai: number; percent: number };
};

export default function PublicKampungUmkm() {
  const { data, isLoading } = useQuery<KampungUmkmResponse>({
    queryKey: ["/api/public/kampung-umkm"],
  });

  const byRt = ACTIVE_RT_NUMBERS.map((rt) => ({
    rt,
    units: (data?.units ?? []).filter((u) => u.rt === rt),
  })).filter((g) => g.units.length > 0);

  return (
    <PublicKioskLayout title="Kampung UMKM" backHref="/program/ekonomi">
      <div className="space-y-6">
        <div className="rounded-xl bg-brand/5 border border-brand/15 p-4 flex gap-3">
          <Store className="w-8 h-8 text-brand flex-shrink-0" />
          <div>
            <p className="font-semibold text-brand">Destinasi usaha warga RW 03</p>
            <p className="text-sm text-muted-foreground mt-1">
              Unit usaha yang telah melalui program revitalisasi visual fasad dan etalase.
            </p>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : data ? (
          <div className="rounded-xl border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progres makeover</span>
              <span className="font-semibold">{data.progress.selesai} / {data.progress.total} unit</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-brand rounded-full" style={{ width: `${data.progress.percent}%` }} />
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : data && data.units.length > 0 ? (
          <div className="space-y-6">
            {byRt.map((group) => (
              <div key={group.rt} className="space-y-3">
                <h3 className="font-semibold text-brand">RT {String(group.rt).padStart(2, "0")}</h3>
                {group.units.map((unit) => (
                  <div key={unit.id} className="rounded-xl border overflow-hidden">
                    {unit.fotoSesudah && (
                      <img
                        src={unit.fotoSesudah.startsWith("data:") ? unit.fotoSesudah : `data:image/jpeg;base64,${unit.fotoSesudah}`}
                        alt={unit.namaUnit}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-4 space-y-1">
                      <div className="flex justify-between gap-2">
                        <p className="font-semibold">{unit.namaUnit}</p>
                        <Badge variant="outline">{unit.jenisUsaha}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{unit.alamat}</p>
                      {unit.rantaiPasok && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Rantai pasok: {unit.rantaiPasok}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Belum ada unit yang dipublikasikan. Program makeover sedang berjalan.
          </p>
        )}
      </div>
    </PublicKioskLayout>
  );
}
