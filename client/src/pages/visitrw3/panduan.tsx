import { Link } from "wouter";
import {
  BookOpen,
  Home,
  BedDouble,
  Store,
  ChevronRight,
  FileText,
  Camera,
  Clock,
  MessageCircle,
  Users,
} from "lucide-react";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import { JENIS_WARGA_DESKRIPSI, JENIS_WARGA_LABEL } from "@shared/visitrw3-jenis-warga";

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
  icon: typeof BookOpen;
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
  return (
    <Visitrw3Shell title="Panduan Visit RW3" backHref={VISITRW3_ROUTES.hub}>
      <div className="space-y-5">
        <div className="rounded-lg bg-brand/5 border border-brand/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-brand">
            <BookOpen className="w-5 h-5" />
            <p className="font-semibold text-sm">Baca ini dulu — 3 menit</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Visit RW3</strong> adalah pendaftaran warga yang{" "}
            <strong className="text-foreground">tinggal</strong> (ngontrak atau ngekost) di wilayah
            RW 03 Padasuka. Formulir diisi langsung oleh Anda — tanpa perantara pemilik properti.
            Setelah disetujui, Anda mendapat nomor VRW3. Untuk jualan/usaha, gunakan{" "}
            <Link href="/rw3biz" className="text-brand font-medium underline">
              RW3BIZ
            </Link>
            .
          </p>
        </div>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm">Dua jenis tinggal</h2>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border p-3 bg-muted/30 flex gap-3">
              <Home className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{JENIS_WARGA_LABEL.kontrak}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{JENIS_WARGA_DESKRIPSI.kontrak}</p>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-muted/30 flex gap-3">
              <BedDouble className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{JENIS_WARGA_LABEL.kost}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{JENIS_WARGA_DESKRIPSI.kost}</p>
              </div>
            </div>
            <div className="rounded-lg border border-dashed p-3 bg-muted/10 flex gap-3">
              <Store className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-muted-foreground">Jualan → RW3BIZ</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Izin usaha ditangani layanan terpisah{" "}
                  <Link href="/rw3biz" className="text-brand underline">
                    /rw3biz
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionCard icon={Users} title="Alur daftar tinggal">
          <p className="text-xs text-muted-foreground">
            Tidak perlu menunggu pemilik kost/kontrakan mendaftarkan properti terlebih dahulu.
          </p>
          <ol className="space-y-2.5">
            <FlowStep n={1}>
              Buka hub Visit RW3 → pilih <strong>Ngontrak</strong> atau <strong>Ngekost</strong>.
            </FlowStep>
            <FlowStep n={2}>
              Isi lokasi (RT + alamat). Untuk ngekost, sertakan nomor kamar/unit.
            </FlowStep>
            <FlowStep n={3}>Isi jumlah dan data diri penghuni (KTP & WhatsApp).</FlowStep>
            <FlowStep n={4}>
              Setujui tata tertib → isi tanggal bayar & termin → kirim. Simpan nomor{" "}
              <strong>VRW3-…</strong>.
            </FlowStep>
            <FlowStep n={5}>
              Admin RW akan survey. Lacak status di menu <strong>Cek status</strong>, atau tunggu
              pesan WhatsApp dari pengurus.
            </FlowStep>
          </ol>
          <Link href={VISITRW3_ROUTES.pengajuan}>
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
                <strong className="text-foreground">Alamat lengkap</strong> di RT yang dipilih —
                untuk ngekost juga siapkan nomor kamar/unit.
              </span>
            </li>
            <li className="flex gap-2">
              <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-brand" />
              <span>
                Pastikan WhatsApp bisa dihubungi — pengurus RW akan mengabari lewat WA setelah
                pengajuan masuk.
              </span>
            </li>
          </ul>
          <p className="text-xs text-muted-foreground border-t pt-2">
            Anak tidak perlu NIK — cukup nama, tanggal lahir, dan jenjang sekolah.
          </p>
        </section>

        <section className="rounded-xl border bg-card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm">Pertanyaan sering ditanya</h2>
          </div>
          <Accordion type="single" collapsible className="px-2">
            <AccordionItem value="langsung">
              <AccordionTrigger className="text-sm text-left">
                Harus minta izin pemilik kost dulu?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Tidak. Visit RW3 sekarang diisi langsung oleh warga singgah. Pemilik tidak perlu
                mendaftarkan properti di situs. Anda cukup isi data sendiri dan tunggu survey
                pengurus RW.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="jenis">
              <AccordionTrigger className="text-sm text-left">
                Ngontrak, ngekost, atau jualan — bedanya apa?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Ngontrak</strong>: tinggal di kontrakan / sewa rumah.{" "}
                  <strong>Ngekost</strong>: tinggal di kamar kost (wajib nomor kamar/unit).{" "}
                  <strong>Jualan</strong>: berjualan atau punya usaha di RW 03 — isi data usaha
                  tambahan.
                </p>
                <p>Pilih satu jenis yang paling sesuai. Tidak perlu mengisi dua kali.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nomor">
              <AccordionTrigger className="text-sm text-left">
                Apa itu nomor VRW3?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                <strong>VRW3-…</strong> adalah nomor pengajuan izin warga singgah Anda. Simpan untuk
                cek status dan perpanjang masa berlaku nanti.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="wa">
              <AccordionTrigger className="text-sm text-left">
                Bagaimana saya dihubungi setelah daftar?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Pengurus RW akan menghubungi nomor WhatsApp yang Anda isi (misalnya saat pengajuan
                masuk, disetujui, atau ditolak). Pastikan nomor aktif dan bisa menerima chat.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="perpanjang">
              <AccordionTrigger className="text-sm text-left">
                Bagaimana cara perpanjang izin?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Buka menu{" "}
                <Link href={VISITRW3_ROUTES.perpanjang} className="text-brand underline">
                  Perpanjang izin
                </Link>
                , masukkan nomor VRW3 yang masih aktif, pilih tanggal bayar & termin baru. Ajukan
                sebelum masa berlaku habis.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="lama">
              <AccordionTrigger className="text-sm text-left">
                Berapa lama prosesnya?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Setelah formulir terkirim, pengajuan masuk antrian survey admin RW. Waktu
                penyelesaian tergantung kelengkapan data — Anda bisa cek status kapan saja. Admin
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

        <div className="grid grid-cols-1 gap-2 pb-2">
          <Link href={VISITRW3_ROUTES.hub}>
            <Button variant="outline" className="w-full h-auto py-3 text-sm">
              Kembali ke Visit RW3
            </Button>
          </Link>
        </div>
      </div>
    </Visitrw3Shell>
  );
}
