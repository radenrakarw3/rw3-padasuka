import { Link } from "wouter";
import { BookOpen, Store, Clock, Camera, MessageCircle, ChevronRight, Wallet, HeartHandshake, BarChart3, Printer } from "lucide-react";
import { AturanRw3biz, TransparansiKontribusi } from "@/components/rw3biz/transparansi";
import { KebutuhanRw3 } from "@/components/rw3biz/pernyataan";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

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

export default function Rw3bizPanduan() {
  return (
    <Rw3bizShell title="Panduan RW3BIZ" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-5">
        <div className="rounded-lg bg-brand/5 border border-brand/20 p-4 space-y-2">
          <div className="flex items-center gap-2 text-brand">
            <BookOpen className="w-5 h-5" />
            <p className="font-semibold text-sm">Baca ini dulu</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">RW3BIZ</strong> mengatur izin berjualan / usaha di
            RW 03. Bukan untuk tinggal (kost/kontrakan) — itu lewat{" "}
            <Link href="/visitrw3" className="text-brand font-medium underline">
              Visit RW3
            </Link>
            .
          </p>
        </div>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-brand" />
            Alur singkat
          </h2>
          <ol className="space-y-2">
            <FlowStep n={1}>
              Daftar <strong>online</strong> dari HP, atau <strong>cetak formulir komitmen</strong> lalu serahkan ke Ketua RW 03. Isi
              data usaha: nama, jenis tempat, jenis dagangan, alamat, dan jam buka–tutup.
            </FlowStep>
            <FlowStep n={2}>
              Data <strong>satu orang</strong> saja: pemilik atau penanggung jawab usaha (nama, NIK, WhatsApp, foto KTP). Data pegawai
              tidak perlu diisi.
            </FlowStep>
            <FlowStep n={3}>
              Tentukan sendiri <strong>sumbangsih bulanan sebesar kemampuan Anda</strong> untuk program RW 03, pilih masa berlaku (1, 3,
              6, atau 12 bulan), lalu setujui Surat Pernyataan. Angka total = <strong>komitmen setiap bulan paling lambat tanggal 1</strong>.
            </FlowStep>
            <FlowStep n={4}>
              Pengajuan menunggu <strong>persetujuan Ketua RW 03</strong>. Setelah disetujui, usaha mendapat{" "}
              <strong>Nomor Induk Usaha (NIU-RW3-…)</strong> dan Surat Izin Usaha yang bisa dicetak dari cek status.
            </FlowStep>
            <FlowStep n={5}>
              Setor tiap tanggal 1: transfer <strong>BCA 1390997490 a.n. Raden Raka</strong>, atau tunai dalam amplop — petugas RW
              mengambil sambil memberi kwitansi. Perbarui surat (kendaraan &amp; sumbangsih) sebelum masa berlaku habis.
            </FlowStep>
            <FlowStep n={6}>
              Ada razia kendaraan berat. Kendaraan menuju usaha yang plat/charternya belum terdaftar dikenai denda (masuk Kas RW, ada
              kwitansi) dan usaha wajib memperbarui datanya.
            </FlowStep>
            <FlowStep n={7}>
              Jaga lingkungan. Aduan warga yang terbukti (sampah tercecer, bising, parkir menutup jalan, limbah/bau, dll) atau temuan
              Ketua RW / Linmas dikenai teguran tertulis, lalu denda yang makin besar bila berulang dalam 12 bulan.
            </FlowStep>
            <FlowStep n={8}>
              Bila sumbangsih dan denda sebulan melebihi kebutuhan RW, kelebihannya jadi <strong>voucher belanja warga</strong> yang hanya
              bisa dipakai di usaha RW3BIZ yang tertib. Voucher yang Anda terima ditukar ke Kas RW 03 senilai penuh.
            </FlowStep>
          </ol>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href={RW3BIZ_ROUTES.pengajuan}>
              <Button className="w-full touch-target">
                Isi online
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href={RW3BIZ_ROUTES.formulir}>
              <Button variant="outline" className="w-full touch-target gap-1.5">
                <Printer className="w-4 h-4" /> Cetak formulir komitmen
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-semibold text-sm">Siapkan sebelum mengisi</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <Camera className="w-4 h-4 shrink-0 mt-0.5" />
              KTP pemilik / penanggung jawab (foto KTP untuk online, fotokopi KTP untuk formulir kertas)
            </li>
            <li className="flex gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              Jam operasional usaha (wajib)
            </li>
            <li className="flex gap-2">
              <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Nomor WhatsApp aktif untuk dihubungi Ketua RW 03
            </li>
            <li className="flex gap-2">
              <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
              Besar sumbangsih bulanan (sebesar kemampuan) yang siap Anda setorkan tiap tanggal 1
            </li>
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-brand" />
            Manfaat berkontribusi bagi usaha Anda
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dengan sumbangsih, usaha Anda mendapat lingkungan yang{" "}
            <strong className="text-foreground">aman (Linmas)</strong> dan{" "}
            <strong className="text-foreground">bersih</strong>, jalan &amp; lampu yang dipakai pembeli/kurir,{" "}
            <strong className="text-foreground">Surat Izin Usaha resmi</strong> yang bisa dicek online, serta setoran berkwitansi
            dengan laporan terbuka. Kelebihan dana di atas kebutuhan RW kembali sebagai{" "}
            <strong className="text-foreground">voucher belanja warga</strong> yang hanya berlaku di usaha RW3BIZ yang tertib —
            uang berputar lagi ke tempat Anda.{" "}
            <strong className="text-foreground">Garansi anti-oknum:</strong> setor hanya lewat transfer{" "}
            <strong className="text-foreground">BCA 1390997490 a.n. Raden Raka</strong> atau amplop tunai diambil petugas RW
            berkwitansi; permintaan dari pihak di luar itu boleh ditolak.{" "}
            <strong className="text-foreground">Tidak ada tarif</strong>: Anda tentukan sendiri besarannya, lalu setujui Surat
            Pernyataan Sumbangsih.
          </p>
          <KebutuhanRw3 />
          <Accordion type="single" collapsible>
            <AccordionItem value="aturan" className="border-b-0">
              <AccordionTrigger className="text-sm py-2">Aturan denda, kemudahan, & voucher</AccordionTrigger>
              <AccordionContent>
                <AturanRw3biz />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            Laporan pemakaian sumbangsih
          </h2>
          <p className="text-xs text-muted-foreground">Uang sumbangsih masuk Kas RW dan dipakai per program berikut. Diperbarui otomatis.</p>
          <TransparansiKontribusi />
        </section>

        <Accordion type="single" collapsible className="rounded-xl border bg-card px-4">
          <AccordionItem value="beda">
            <AccordionTrigger className="text-sm">Bedanya dengan Visit RW3?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Visit RW3 = tinggal (ngontrak/ngekost). RW3BIZ = usaha/jualan. Data yang dikumpulkan
              berbeda karena karakter kebutuhannya beda.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="biaya">
            <AccordionTrigger className="text-sm">Apa ada biaya?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Tidak ada tarif. Sumbangsih bulanan Anda tentukan sendiri — komitmen tiap tanggal 1. Setor lewat transfer{" "}
              <strong className="text-foreground">BCA 1390997490 a.n. Raden Raka</strong>, atau tunai dalam amplop diambil
              petugas RW sambil diberi kwitansi.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="keberatan">
            <AccordionTrigger className="text-sm">Bagaimana jika ingin mengubah sumbangsih?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Ubah saat memperbarui izin, atau buka halaman{" "}
              <Link href={RW3BIZ_ROUTES.status} className="text-brand font-medium underline">
                cek status
              </Link>{" "}
              dan ajukan perubahan dengan alasan Anda. Ketua RW 03 juga bisa memberi keringanan sementara bila usaha sedang sepi,
              pengusaha lansia/disabilitas, atau keluarga penerima bansos.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Rw3bizShell>
  );
}
