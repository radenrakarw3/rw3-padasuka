import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getQueryFn } from "@/lib/queryClient";
import { CalendarDays, Clock, Building2, User, Briefcase, Users, MapPin } from "lucide-react";

interface SinggahProfil {
  id: number;
  namaLengkap: string;
  nik: string;
  nomorWhatsapp: string;
  pekerjaan: string;
  tanggalMulaiKontrak: string;
  tanggalHabisKontrak: string;
  jumlahPenghuni: number;
  keperluanTinggal: string;
  status: string;
  namaKost: string;
  namaPemilik: string;
  alamatKost: string;
  sisaHari: number;
  sudahHabis: boolean;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function SinggahBeranda() {
  const { data: profil, isLoading } = useQuery<SinggahProfil>({
    queryKey: ["/api/singgah/profil"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!profil) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Data tidak ditemukan
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    if (profil.sudahHabis) {
      return <Badge variant="destructive" data-testid="badge-status-habis">Kontrak Habis</Badge>;
    }
    if (profil.sisaHari <= 7) {
      return <Badge className="bg-amber-500 text-white" data-testid="badge-status-mendekati">Mendekati Habis</Badge>;
    }
    return <Badge className="bg-[hsl(163,55%,22%)] text-white" data-testid="badge-status-aktif">Aktif</Badge>;
  };

  const getCountdownColor = () => {
    if (profil.sudahHabis) return "text-red-600";
    if (profil.sisaHari <= 7) return "text-amber-600";
    return "text-[hsl(163,55%,22%)]";
  };

  return (
    <div className="space-y-4">
      <Card data-testid="card-countdown">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold">Sisa Kontrak</h2>
            {getStatusBadge()}
          </div>

          <div className="flex items-center justify-center py-4">
            <div className="text-center">
              <div className={`text-5xl font-black ${getCountdownColor()}`} data-testid="text-sisa-hari">
                {profil.sudahHabis ? "0" : profil.sisaHari}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {profil.sudahHabis ? "Kontrak telah habis" : "hari tersisa"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <CalendarDays className="w-4 h-4 text-[hsl(163,55%,22%)] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Mulai Kontrak</p>
                <p className="text-xs font-semibold truncate" data-testid="text-tanggal-mulai">{formatDate(profil.tanggalMulaiKontrak)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">Habis Kontrak</p>
                <p className="text-xs font-semibold truncate" data-testid="text-tanggal-habis">{formatDate(profil.tanggalHabisKontrak)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-info-pribadi">
        <CardContent className="p-5">
          <h2 className="text-base font-bold mb-3">Informasi Pribadi</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Nama Lengkap</p>
                <p className="text-sm font-medium" data-testid="text-nama">{profil.namaLengkap}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Keperluan Tinggal</p>
                <p className="text-sm font-medium" data-testid="text-keperluan">{profil.keperluanTinggal}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Jumlah Penghuni</p>
                <p className="text-sm font-medium" data-testid="text-penghuni">{profil.jumlahPenghuni} orang</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-info-kost">
        <CardContent className="p-5">
          <h2 className="text-base font-bold mb-3">Informasi Kost</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Nama Kost</p>
                <p className="text-sm font-medium" data-testid="text-nama-kost">{profil.namaKost}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Pemilik</p>
                <p className="text-sm font-medium" data-testid="text-pemilik">{profil.namaPemilik}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Alamat Kost</p>
                <p className="text-sm font-medium" data-testid="text-alamat-kost">{profil.alamatKost}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
