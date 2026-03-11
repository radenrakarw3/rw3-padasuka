import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import {
  FileText, Heart, User, MapPin, ClipboardList,
  Smartphone, CheckCircle, Shield, HelpCircle,
  ChevronRight, Megaphone, HandCoins, Printer
} from "lucide-react";
import type { KartuKeluarga, Warga } from "@shared/schema";
import logoGold from "@assets/RW3-Cimahi-Logo-Gold@16x_1772999415512.png";

function maskKk(nomorKk: string | null | undefined): string {
  if (!nomorKk || nomorKk.length < 6) return "••••••••••••••••";
  return nomorKk.slice(0, 4) + "••••••••" + nomorKk.slice(-4);
}

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
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  const kepala = anggota?.find(w => w.kedudukanKeluarga === "Kepala Keluarga");

  const fiturList = [
    {
      icon: FileText,
      title: "Pengajuan Surat",
      desc: "Ajukan surat keterangan (domisili, usaha, belum menikah, dll) secara online. Surat diproses oleh AI dan disetujui admin RT/RW.",
      path: "/warga/layanan",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      icon: ClipboardList,
      title: "Laporan Warga",
      desc: "Laporkan masalah lingkungan, keamanan, infrastruktur, atau sosial ke pengurus RT/RW untuk ditindaklanjuti.",
      path: "/warga/layanan",
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      icon: Heart,
      title: "Donasi",
      desc: "Lihat campaign donasi aktif, berdonasi via transfer bank, dan pantau progres pengumpulan dana komunitas.",
      path: "/warga/donasi",
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-950/30",
    },
    {
      icon: User,
      title: "Data Profil",
      desc: "Lihat dan ajukan perubahan data keluarga. Upload dokumen KK & KTP untuk verifikasi admin.",
      path: "/warga/profil",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
  ];

  const caraPakaiSteps = [
    {
      icon: Smartphone,
      title: "Login dengan OTP",
      desc: "Masukkan nomor KK, pilih anggota keluarga, lalu verifikasi OTP via WhatsApp.",
    },
    {
      icon: FileText,
      title: "Ajukan Surat",
      desc: "Pilih jenis surat, isi perihal, pilih metode layanan (cetak mandiri/tau beres). Surat dibuat otomatis oleh AI.",
    },
    {
      icon: CheckCircle,
      title: "Tunggu Persetujuan",
      desc: "Admin RT/RW akan memeriksa dan menyetujui pengajuan Anda. Status bisa dipantau di halaman Layanan.",
    },
    {
      icon: Printer,
      title: "Ambil Surat",
      desc: "Surat yang disetujui bisa diunduh PDF atau dikirim via WhatsApp. Untuk tau beres, ambil langsung di RT/RW.",
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="bg-gradient-to-br from-[hsl(163,55%,22%)] to-[hsl(163,55%,16%)] text-white border-0 overflow-hidden relative">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <img src={logoGold} alt="Logo RW 03" className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="min-w-0 flex-1">
              <p className="text-[hsl(40,30%,80%)] text-[11px]">Selamat datang di</p>
              <h2 className="text-base font-bold leading-tight" data-testid="text-welcome-title">
                Sistem Informasi Warga
              </h2>
              <p className="text-[hsl(40,30%,80%)] text-xs mt-0.5">RW 03 Padasuka, Cimahi</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-sm font-semibold" data-testid="text-welcome-name">
              {kepala?.namaLengkap || "Keluarga"}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3 text-[hsl(40,45%,65%)]" />
              <p className="text-xs text-white/70 truncate" data-testid="text-alamat">{kk?.alamat}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
              <span className="bg-white/15 px-2 py-0.5 rounded" data-testid="text-rt-number">
                RT {kk?.rt?.toString().padStart(2, "0")} / RW 03
              </span>
              <span className="bg-white/15 px-2 py-0.5 rounded flex items-center gap-1" data-testid="text-kk-number">
                <Shield className="w-2.5 h-2.5" />
                KK {maskKk(kk?.nomorKk)}
              </span>
              <span className="bg-white/15 px-2 py-0.5 rounded">
                {anggota?.length || 0} anggota
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-[hsl(163,55%,22%)]" />
          <h3 className="text-sm font-bold" data-testid="text-tentang-title">Tentang Aplikasi Ini</h3>
        </div>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Aplikasi ini adalah sistem pelayanan digital untuk warga RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi. Dengan aplikasi ini, warga dapat mengurus surat-menyurat, melaporkan permasalahan, berdonasi untuk kegiatan komunitas, dan memperbarui data kependudukan — semua secara online tanpa perlu datang langsung ke pengurus RT/RW.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <HandCoins className="w-4 h-4 text-[hsl(163,55%,22%)]" />
          <h3 className="text-sm font-bold" data-testid="text-fitur-title">Fitur yang Tersedia</h3>
        </div>
        <div className="space-y-2">
          {fiturList.map((item) => (
            <Card
              key={item.title}
              className="cursor-pointer border hover:shadow-sm transition-shadow"
              onClick={() => setLocation(item.path)}
              data-testid={`card-fitur-${item.title.toLowerCase().replace(/\s/g, '-')}`}
            >
              <CardContent className="p-3.5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-4.5 h-4.5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="w-4 h-4 text-[hsl(163,55%,22%)]" />
          <h3 className="text-sm font-bold" data-testid="text-cara-pakai-title">Cara Menggunakan</h3>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              {caraPakaiSteps.map((step, idx) => (
                <div key={step.title} className="flex gap-3" data-testid={`step-cara-${idx}`}>
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-[hsl(163,55%,22%)] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    {idx < caraPakaiSteps.length - 1 && (
                      <div className="w-0.5 flex-1 bg-[hsl(163,55%,22%)]/20 mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-1.5">
                      <step.icon className="w-3.5 h-3.5 text-[hsl(163,55%,22%)]" />
                      <p className="text-xs font-semibold">{step.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[hsl(163,55%,22%)]/20 bg-[hsl(163,55%,22%)]/5">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-[hsl(163,55%,22%)] mb-1.5" data-testid="text-catatan-title">Catatan Penting</p>
          <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-[hsl(163,55%,22%)] mt-0.5">•</span>
              <span>Semua pengajuan surat dan perubahan data memerlukan persetujuan admin RT/RW.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[hsl(163,55%,22%)] mt-0.5">•</span>
              <span>Data pribadi (NIK, KK, KTP) tersimpan aman dan hanya diakses oleh pengurus yang berwenang.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[hsl(163,55%,22%)] mt-0.5">•</span>
              <span>Donasi dilakukan melalui transfer bank BCA dan dikonfirmasi oleh admin setelah pembayaran terverifikasi.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-[hsl(163,55%,22%)] mt-0.5">•</span>
              <span>Jika mengalami kendala, hubungi pengurus RT/RW setempat untuk bantuan.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
