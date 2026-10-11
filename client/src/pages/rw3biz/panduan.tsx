import { Link } from "wouter";
import { BookOpen, Store, Clock, Camera, MessageCircle, ChevronRight, Wallet, HeartHandshake, BarChart3 } from "lucide-react";
import { RumusKontribusi, TransparansiKontribusi } from "@/components/rw3biz/transparansi";
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
              Isi data usaha: nama, jenis tempat, kategori, jam buka–tutup, PJ, serta data penentu kontribusi (luas, omzet, sampah,
              parkir, kendaraan operasional — motor, mobil, kolbak, truk), termasuk kolbak/truk <strong>charter (sewaan)</strong> yang
              datang ke usaha beserta berapa kali datang per minggu.
            </FlowStep>
            <FlowStep n={2}>
              Data <strong>semua</strong> pemilik, PJ, dan pegawai (nama, NIK, peran, asal tempat tinggal). Jumlah pegawai ikut menentukan
              kontribusi.
            </FlowStep>
            <FlowStep n={3}>Setujui tata tertib, pilih masa berlaku (1, 3, 6, atau 12 bulan), dan lihat estimasi kontribusi bulanan.</FlowStep>
            <FlowStep n={4}>
              Setelah survey dan disetujui, usaha mendapat <strong>Nomor Induk Usaha (NIU-RW3-…)</strong> dan Surat Izin Usaha yang bisa
              dicetak dari cek status.
            </FlowStep>
            <FlowStep n={5}>
              Bayar kontribusi tiap bulan — setiap pembayaran masuk Kas RW 03 dan diberi kwitansi. Perbarui surat (beserta data pegawai
              dan kendaraan) sebelum masa berlakunya habis.
            </FlowStep>
            <FlowStep n={6}>
              Ada razia kendaraan berat. Kendaraan menuju usaha yang plat/charternya belum terdaftar dikenai denda (masuk Kas RW, ada
              kwitansi) dan usaha wajib memperbarui datanya.
            </FlowStep>
            <FlowStep n={7}>
              Jaga lingkungan. Aduan warga yang terbukti (sampah tercecer, bising, parkir menutup jalan, limbah/bau, dll) atau temuan
              petugas dikenai teguran tertulis, lalu denda yang makin besar bila berulang dalam 12 bulan.
            </FlowStep>
            <FlowStep n={8}>
              Bila kontribusi dan denda sebulan melebihi kebutuhan RW, kelebihannya jadi <strong>voucher belanja warga</strong> yang hanya
              bisa dipakai di usaha RW3BIZ yang tertib. Voucher yang Anda terima ditukar ke Kas RW 03 senilai penuh.
            </FlowStep>
          </ol>
          <Link href={RW3BIZ_ROUTES.pengajuan}>
            <Button className="w-full touch-target mt-2">
              Mulai ajukan
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-semibold text-sm">Siapkan sebelum mengisi</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <Camera className="w-4 h-4 shrink-0 mt-0.5" />
              Data KTP pemilik/PJ dan seluruh pegawai (foto KTP wajib untuk pemilik/PJ)
            </li>
            <li className="flex gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              Jam operasional usaha (wajib)
            </li>
            <li className="flex gap-2">
              <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Nomor WhatsApp aktif untuk dihubungi survey
            </li>
            <li className="flex gap-2">
              <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
              Perkiraan omzet per bulan (cukup kisaran), luas tempat, serta jumlah dan plat kendaraan operasional
            </li>
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-brand" />
            Kontribusi bulanan untuk lingkungan
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Semua yang berusaha di wilayah RW 03 ikut menanggung biaya bersama: <strong className="text-foreground">Linmas</strong> yang
            ronda malam, <strong className="text-foreground">petugas kebersihan</strong>, dana sosial warga sakit dan meninggal, serta
            pemeliharaan lampu jalan dan selokan. Besarnya dihitung dengan rumus yang sama untuk semua usaha — usaha kecil membayar kecil,
            dan usaha yang mempekerjakan warga RW 03 mendapat potongan. Kelebihan dana di atas kebutuhan RW kembali ke usaha lewat
            voucher belanja warga.
          </p>
          <Accordion type="single" collapsible>
            <AccordionItem value="rumus" className="border-b-0">
              <AccordionTrigger className="text-sm py-2">Lihat rumus lengkap</AccordionTrigger>
              <AccordionContent>
                <RumusKontribusi />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand" />
            Laporan pemakaian kontribusi
          </h2>
          <p className="text-xs text-muted-foreground">Uang kontribusi masuk Kas RW dan dipakai per pos berikut. Diperbarui otomatis.</p>
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
              Ada kontribusi bulanan sesuai rumus di atas. Estimasinya muncul sebelum Anda mengirim pengajuan; angka final ditetapkan
              setelah survey. Pembayaran dicatat pengurus dan tercatat di Kas RW.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="keberatan">
            <AccordionTrigger className="text-sm">Bagaimana jika merasa terlalu berat?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Buka halaman{" "}
              <Link href={RW3BIZ_ROUTES.status} className="text-brand font-medium underline">
                cek status
              </Link>
              , lalu ajukan peninjauan dengan alasan Anda. Pengurus akan survey ulang atau memberi keringanan sementara bila usaha sedang
              sepi, pengusaha lansia/disabilitas, atau keluarga penerima bansos.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Rw3bizShell>
  );
}
