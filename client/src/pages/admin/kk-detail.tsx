import { useQuery } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { ArrowLeft, Pencil, Users, AlertTriangle } from "lucide-react";
import { KependudukanAdminNav } from "@/components/admin/kependudukan-admin-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StatusKependudukanBadge } from "@/components/kependudukan/status-kependudukan-badge";
import type { Warga } from "@shared/schema";
import { readJsonSafely } from "@/lib/queryClient";

type KkDetailResponse = {
  kk: {
    id: number;
    nomorKk: string;
    rt: number;
    alamat: string;
    jumlahPenghuni: number;
    penerimaBansos: boolean;
    kategoriEkonomi: string | null;
    penghasilanBulanan: string | null;
    statusRumah: string;
  };
  anggota: Warga[];
  kepalaKeluarga: Warga | null;
  flags: {
    penghuniMismatch: boolean;
    noKepalaKeluarga: boolean;
    multipleKepalaKeluarga: boolean;
    belumVerifikasi: number;
  };
  completeness: {
    isComplete: boolean;
    completionPercent: number;
    missingFields: { key: string; label: string; wargaNama?: string }[];
    totalRequired: number;
    totalFilled: number;
    anggotaCount: number;
  };
};

export default function KkDetailPage() {
  const [, params] = useRoute("/admin/kependudukan/kk/:id");
  const id = params?.id ? parseInt(params.id, 10) : NaN;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["/api/kk", id, "detail"],
    queryFn: async () => {
      const res = await fetch(`/api/kk/${id}/detail`, { credentials: "include" });
      if (!res.ok) throw new Error("KK tidak ditemukan");
      return readJsonSafely<KkDetailResponse>(res);
    },
    enabled: !isNaN(id),
  });

  if (isNaN(id)) {
    return <p className="text-sm text-muted-foreground">ID tidak valid</p>;
  }

  return (
    <div>
      <KependudukanAdminNav
        title="Detail Kartu Keluarga"
        description={data?.kk.nomorKk ?? "Memuat…"}
        actions={
          <Link href="/admin/kependudukan/kk">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Daftar KK
            </Button>
          </Link>
        }
      />

      {isLoading && <Skeleton className="h-48 w-full" />}
      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Gagal memuat</AlertTitle>
          <AlertDescription>KK tidak ditemukan atau akses ditolak.</AlertDescription>
        </Alert>
      )}

      {data && (
        <div className="space-y-4">
          {(data.flags.penghuniMismatch ||
            data.flags.noKepalaKeluarga ||
            data.flags.multipleKepalaKeluarga) && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Perlu perhatian</AlertTitle>
              <AlertDescription className="text-sm space-y-1">
                {data.flags.penghuniMismatch && (
                  <p>
                    Jumlah penghuni ({data.kk.jumlahPenghuni}) ≠ anggota terdaftar ({data.anggota.length})
                  </p>
                )}
                {data.flags.noKepalaKeluarga && <p>Belum ada Kepala Keluarga</p>}
                {data.flags.multipleKepalaKeluarga && <p>Lebih dari satu Kepala Keluarga</p>}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-mono">{data.kk.nomorKk}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{data.kk.alamat}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge>RT {String(data.kk.rt).padStart(2, "0")}</Badge>
                {data.kk.penerimaBansos && <Badge variant="secondary">Bansos</Badge>}
                {data.kk.kategoriEkonomi && <Badge variant="outline">{data.kk.kategoriEkonomi}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="text-sm grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">Kepala keluarga:</span>{" "}
                {data.kepalaKeluarga?.namaLengkap ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Status rumah:</span> {data.kk.statusRumah}
              </p>
              <p>
                <span className="text-muted-foreground">Penghasilan:</span>{" "}
                {data.kk.penghasilanBulanan || "Belum diisi"}
              </p>
              <p>
                <span className="text-muted-foreground">Kelengkapan data:</span>{" "}
                {data.completeness.completionPercent}%
                {data.completeness.isComplete ? " · lengkap" : ""}
              </p>
            </CardContent>
          </Card>

          {data.completeness.missingFields.length > 0 && (
            <Alert>
              <AlertTitle>Field belum lengkap (form internasional)</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-1 text-sm space-y-0.5">
                  {data.completeness.missingFields.slice(0, 10).map((m, i) => (
                    <li key={i}>
                      {m.label}
                      {m.wargaNama ? ` — ${m.wargaNama}` : ""}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4" />
                Anggota ({data.anggota.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {data.anggota.map((w) => (
                <div key={w.id} className="py-3 flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{w.namaLengkap}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.kedudukanKeluarga} · {w.statusPekerjaan || "—"} · {w.statusVerifikasiData}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusKependudukanBadge status={w.statusKependudukan} />
                  <Link href={`/admin/kependudukan/warga`}>
                    <Button variant="ghost" size="sm">
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Kelola
                    </Button>
                  </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
