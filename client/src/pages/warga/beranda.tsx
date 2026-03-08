import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { User, FileText, ClipboardList, MessageCircle, Users } from "lucide-react";
import type { KartuKeluarga, Warga } from "@shared/schema";

export default function WargaBeranda() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: kk, isLoading: kkLoading } = useQuery<KartuKeluarga>({
    queryKey: ["/api/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  const { data: anggota, isLoading: wargaLoading } = useQuery<Warga[]>({
    queryKey: ["/api/warga/kk", user?.kkId],
    enabled: !!user?.kkId,
  });

  if (kkLoading || wargaLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  const kepala = anggota?.find(w => w.kedudukanKeluarga === "Kepala Keluarga");

  const menuItems = [
    {
      icon: User,
      label: "Data Profil",
      desc: "Lihat & edit data keluarga",
      path: "/warga/profil",
      color: "bg-[hsl(163,55%,22%)]",
    },
    {
      icon: ClipboardList,
      label: "Laporan",
      desc: "Buat laporan ke RW",
      path: "/warga/laporan",
      color: "bg-[hsl(40,45%,50%)]",
    },
    {
      icon: FileText,
      label: "Pelayanan Surat",
      desc: "Ajukan surat keterangan",
      path: "/warga/pelayanan",
      color: "bg-[hsl(220,55%,35%)]",
    },
    {
      icon: Users,
      label: "Anggota KK",
      desc: `${anggota?.length || 0} anggota keluarga`,
      path: "/warga/profil",
      color: "bg-[hsl(348,55%,38%)]",
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,18%)] text-white border-0">
        <CardContent className="p-4">
          <p className="text-[hsl(40,30%,80%)] text-xs mb-1">Selamat datang,</p>
          <h2 className="text-lg font-bold" data-testid="text-welcome-name">
            {kepala?.namaLengkap || "Keluarga"}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-white/15 px-2.5 py-1 rounded-md" data-testid="text-kk-number">
              KK: {kk?.nomorKk}
            </span>
            <span className="bg-white/15 px-2.5 py-1 rounded-md" data-testid="text-rt-number">
              RT {kk?.rt?.toString().padStart(2, "0")} / RW 03
            </span>
          </div>
          <p className="text-[hsl(40,30%,80%)] text-xs mt-2 truncate" data-testid="text-alamat">
            {kk?.alamat}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item) => (
          <Card
            key={item.label}
            className="cursor-pointer border hover-elevate active-elevate-2"
            onClick={() => setLocation(item.path)}
            data-testid={`card-menu-${item.label.toLowerCase().replace(/\s/g, '-')}`}
          >
            <CardContent className="p-4 flex flex-col items-start gap-2">
              <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center`}>
                <item.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-[hsl(163,55%,22%)]" />
            <h3 className="text-sm font-semibold">Informasi</h3>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Selamat datang di Sistem Informasi Warga RW 03 Padasuka, Cimahi.</p>
            <p>Melalui aplikasi ini Anda dapat:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>Melihat dan mengajukan perubahan data keluarga</li>
              <li>Membuat laporan untuk RT/RW</li>
              <li>Mengajukan surat keterangan secara online</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
