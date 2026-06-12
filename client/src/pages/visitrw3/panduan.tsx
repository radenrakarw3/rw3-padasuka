import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  Users,
  ChevronRight,
  FileText,
  Camera,
  Clock,
  Wallet,
  Loader2,
} from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { readJsonSafely } from "@/lib/queryClient";
import {
  formatRupiah,
  parseKontribusiSettings,
  labelUkuranProperti,
} from "@/lib/visitrw3-kontribusi";

function FlowStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand text-brand-foreground text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="pt-0.5 text-muted-foreground">{children}</span>
    </li>
  );
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-brand" />
        </div>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function Visitrw3Panduan() {
  const { data: settingsRows = [], isLoading: tarifLoading } = useQuery({
    queryKey: ["/api/public/visitrw3/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/visitrw3/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string }[]>(res);
    },
    staleTime: 60_000,
  });

  const tarif = useMemo(() => parseKontribusiSettings(settingsRows), [settingsRows]);

  return (
    <Visitrw3Shell title="Panduan Visit RW3" backHref="/visitrw3">
      <div className="space-y-5">
        <div className="rounded-lg bg-brand/5 border border-brand/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-brand">
            <BookOpen className="w-5 h-5" />
            <p className="font-semibold text-sm">Baca ini dulu — 3 menit</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Visit RW3</strong> adalah izin administrasi bagi
            penyewa atau pengusaha yang tinggal/berusaha di wilayah RW 03 Padasuka. Formulir diisi{" "}
            <strong className="text-foreground">langkah demi langkah</strong> lewat HP; tidak perlu
            datang ke sekretariat dulu untuk mengisi data awal.
          </p>
        </div>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Pilih situasi — supaya tidak double</h2>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="font-medium">Tinggal saja</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ngekost/kontrak di RW 03, tidak punya usaha di sini → isi data penghuni kost.
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-brand/5 border-brand/20">
              <p className="font-medium text-brand">Tinggal sekaligus usaha</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ngekost dan punya lapak/kiosk/warung → <strong className="text-foreground">satu form</strong>,
                isi usaha + penghuni. Jangan ajukan tinggal dan bisnis terpisah.
              </p>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="font-medium">Usaha saja</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Berjualan di RW 03, rumah tinggal di luar RW 03 → isi data usaha & penanggung jawab.
              </p>
            </div>
          </div>
        </section>

        <SectionCard icon={Building2} title="Pemilik kost, kontrakan, kiosk, atau lapak">
          <p className="text-xs text-muted-foreground">
            Daftarkan properti dulu agar bisa dipilih penyewa saat mengajukan Visit RW3.
          </p>
          <ol className="space-y-2.5">
            <FlowStep n={1}>
              Buka <strong>Daftar properti</strong> → pilih jenis (kost, kontrakan, kiosk, lapak).
            </FlowStep>
            <FlowStep n={2}>
              Isi nama, RT, alamat, jumlah kamar/unit, data pemilik & pengelola.
            </FlowStep>
            <FlowStep n={3}>
              Setujui tata tertib → kirim. Simpan nomor <strong>PROP-…</strong>.
            </FlowStep>
            <FlowStep n={4}>
              Tunggu verifikasi admin RW. Cek status lewat menu{" "}
              <strong>Cek status pendaftaran</strong>.
            </FlowStep>
            <FlowStep n={5}>
              Setelah <strong>aktif</strong>, properti muncul di formulir pengajuan penyewa.
            </FlowStep>
          </ol>
          <Link href="/visitrw3/daftar-properti">
            <Button className="w-full touch-target mt-1" size="sm">
              Mulai daftar properti <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </SectionCard>

        <SectionCard icon={Users} title="Penyewa / penghuni / pengusaha">
          <p className="text-xs text-muted-foreground">
            Properti tempat Anda tinggal atau berusaha harus sudah terdaftar dan disetujui admin.
          </p>
          <ol className="space-y-2.5">
            <FlowStep n={1}>
              Pastikan kost/kontrakan/kiosk sudah didaftarkan pemiliknya. Kalau belum, minta pemilik
              daftar dulu atau hubungi pengurus RW.
            </FlowStep>
            <FlowStep n={2}>
              Buka <strong>Pengajuan baru</strong> → pilih situasi Anda:{" "}
              <strong>Tinggal saja</strong>, <strong>Tinggal sekaligus usaha</strong>, atau{" "}
              <strong>Usaha saja</strong>.
            </FlowStep>
            <FlowStep n={3}>
              Isi lokasi & data sesuai pilihan. Kalau ngekost + berbisnis, cukup{" "}
              <strong>satu kali</strong> isi — pilih &quot;Tinggal sekaligus usaha&quot;.
            </FlowStep>
            <FlowStep n={4}>
              Setujui syarat → isi tanggal bayar & termin → kirim. Simpan nomor{" "}
              <strong>VRW3-…</strong>.
            </FlowStep>
            <FlowStep n={5}>
              Admin RW akan survey. Lacak status di menu <strong>Cek status pengajuan</strong>.
            </FlowStep>
          </ol>
          <Link href="/visitrw3/pengajuan">
            <Button className="w-full touch-target mt-1" size="sm">
              Mulai pengajuan <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </SectionCard>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-brand" />
            </div>
            <h2 className="font-semibold text-sm">Siapkan sebelum mengisi</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Camera className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand" />
              <span>
                <strong className="text-foreground">Foto KTP</strong> setiap penghuni dewasa (ambil
                foto jelas, tidak buram).
              </span>
            </li>
            <li className="flex gap-2">
              <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand" />
              <span>
                <strong className="text-foreground">NIK 16 digit</strong> & nomor WhatsApp aktif
                setiap dewasa.
              </span>
            </li>
            <li className="flex gap-2">
              <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand" />
              <span>
                <strong className="text-foreground">Nomor kamar/unit</strong> — contoh: &quot;Kamar
                3B&quot;, &quot;Unit depan&quot;, &quot;Ruko blok B&quot;.
              </span>
            </li>
            <li className="flex gap-2">
              <Wallet className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand" />
              <span>
                <strong className="text-foreground">Tanggal bayar kontribusi</strong> & pilih termin
                (1, 3, 6, atau 12 bulan).
              </span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground border-t pt-2">
            Anak tidak perlu NIK — cukup nama, tanggal lahir, dan jenjang sekolah.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-brand" />
            </div>
            <h2 className="font-semibold text-sm">Perkiraan kontribusi</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Angka resmi ditetapkan pengurus RW. Estimasi di bawah mengikuti pengaturan terbaru;
            nominal final ditentukan saat survey admin.
          </p>
          {tarifLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" />
          ) : (
            <div className="space-y-3 text-xs">
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="font-medium text-foreground">Penyewa tinggal — kost (per unit/bulan)</p>
                <p>
                  {labelUkuranProperti("kecil", tarif)}: {formatRupiah(tarif.feeKostKecilPerUnitBulan)}
                </p>
                <p>
                  {labelUkuranProperti("sedang", tarif)}: {formatRupiah(tarif.feeKostSedangPerUnitBulan)}
                </p>
                <p>
                  {labelUkuranProperti("besar", tarif)}: {formatRupiah(tarif.feeKostBesarPerUnitBulan)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="font-medium text-foreground">Penyewa tinggal — kontrakan (per unit/bulan)</p>
                <p>
                  {labelUkuranProperti("kecil", tarif)}:{" "}
                  {formatRupiah(tarif.feeKontrakanKecilPerUnitBulan)}
                </p>
                <p>
                  {labelUkuranProperti("sedang", tarif)}:{" "}
                  {formatRupiah(tarif.feeKontrakanSedangPerUnitBulan)}
                </p>
                <p>
                  {labelUkuranProperti("besar", tarif)}:{" "}
                  {formatRupiah(tarif.feeKontrakanBesarPerUnitBulan)}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <p className="font-medium text-foreground">Bisnis (per hari)</p>
                <p>Lapak: {formatRupiah(tarif.feeBisnisLapakPerHari)}</p>
                <p>Kiosk: {formatRupiah(tarif.feeBisnisKioskPerHari)}</p>
                <p>Usaha lain: {formatRupiah(tarif.feeBisnisLainPerHari)}</p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm">Pertanyaan sering ditanya</h2>
          </div>
          <Accordion type="single" collapsible className="px-2">
            <AccordionItem value="belum-properti">
              <AccordionTrigger className="text-sm text-left">
                Properti saya belum ada di daftar — apa yang harus dilakukan?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Minta pemilik kost/kontrakan mendaftar lewat menu{" "}
                <Link href="/visitrw3/daftar-properti" className="text-brand underline">
                  Daftar properti
                </Link>
                . Setelah admin menyetujui, baru Anda bisa lanjut pengajuan. Kalau Anda sendiri
                pemiliknya, daftarkan dulu properti Anda.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="tinggal-bisnis">
              <AccordionTrigger className="text-sm text-left">
                Ngekost sekaligus berbisnis — isi sekali atau dua kali?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Cukup sekali.</strong> Pilih{" "}
                  <strong>Tinggal sekaligus usaha</strong> di langkah pertama, lalu isi data usaha
                  dan data penghuni kost dalam formulir yang sama.
                </p>
                <p>
                  Jangan ajukan <strong>Tinggal</strong> dan <strong>Bisnis</strong> terpisah —
                  itu yang bikin double. Kalau hanya ngekost tanpa usaha, pilih{" "}
                  <strong>Tinggal saja</strong>. Kalau hanya berjualan dan rumah di luar RW 03,
                  pilih <strong>Usaha saja</strong>.
                </p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nomor">
              <AccordionTrigger className="text-sm text-left">
                Apa beda nomor PROP dan VRW3?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <strong>PROP-…</strong> = nomor pendaftaran properti (pemilik).{" "}
                <strong>VRW3-…</strong> = nomor pengajuan izin penyewa/penghuni. Simpan keduanya
                untuk cek status.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="perpanjang">
              <AccordionTrigger className="text-sm text-left">
                Bagaimana cara perpanjang izin?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Buka menu{" "}
                <Link href="/visitrw3/perpanjang" className="text-brand underline">
                  Perpanjang izin
                </Link>
                , masukkan nomor VRW3 lama yang masih aktif, pilih tanggal bayar & termin baru.
                Ajukan sebelum masa berlaku habis.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="lama">
              <AccordionTrigger className="text-sm text-left">
                Berapa lama prosesnya?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Setelah formulir terkirim, pengajuan masuk antrian survey admin RW. Waktu
                penyelesaian tergantung kelengkapan data — Anda bisa dicek status kapan saja. Admin
                akan menghubungi lewat WhatsApp jika ada yang perlu dilengkapi.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="bantuan">
              <AccordionTrigger className="text-sm text-left">
                Masih bingung — siapa yang bisa dihubungi?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Hubungi ketua RT wilayah Anda lewat menu{" "}
                <Link href="/pelayanan" className="text-brand underline">
                  Hubungi ketua RT
                </Link>{" "}
                di beranda utama, atau pengurus RW 03 Padasuka.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <div className="grid grid-cols-2 gap-2 pb-2">
          <Link href="/visitrw3/pemilik">
            <Button variant="outline" className="w-full h-auto py-3 text-xs">
              Menu pemilik
            </Button>
          </Link>
          <Link href="/visitrw3/penyewa">
            <Button variant="outline" className="w-full h-auto py-3 text-xs">
              Menu penyewa
            </Button>
          </Link>
        </div>
      </div>
    </Visitrw3Shell>
  );
}
