import { Link } from "wouter";
import { BookOpen, Store, Clock, MessageCircle, ChevronRight, Wallet, HeartHandshake, BarChart3, Printer } from "lucide-react";
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
import {
  ANJURAN_RP0,
  LABEL_SETOR_SUMBANGSIH,
  PENGANTAR_SUMBANGSIH,
  SETOR_SUMBANGSIH,
} from "@shared/rw3biz-pernyataan";

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
          <p className="text-sm text-muted-foreground leading-relaxed">{PENGANTAR_SUMBANGSIH}</p>
        </div>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <Store className="w-4 h-4 text-brand" />
            Alur singkat
          </h2>
          <ol className="space-y-2">
            <FlowStep n={1}>
              Daftar <strong>online</strong> dari HP, atau <strong>cetak Formulir Sumbangsih</strong> lalu serahkan ke
              sekretariat RW 03. Isi data usaha: nama, jenis tempat, jenis dagangan, alamat, dan jam buka–tutup.
            </FlowStep>
            <FlowStep n={2}>
              Data <strong>satu orang</strong> saja: pemilik atau penanggung jawab (nama, WhatsApp aktif, tempat tinggal).{" "}
              <strong>Tidak perlu fotokopi KTP dan tidak perlu meterai.</strong>
            </FlowStep>
            <FlowStep n={3}>
              Tentukan sendiri <strong>sumbangsih seikhlasnya</strong> untuk program yang Anda setujui — boleh Rp0, boleh
              juga barang/jasa. Pilih masa berlaku, lalu setujui Surat Pernyataan.
            </FlowStep>
            <FlowStep n={4}>
              Pengajuan menunggu <strong>persetujuan Ketua RW 03</strong>. Setelah disetujui, usaha mendapat{" "}
              <strong>Nomor Induk Usaha (NIU-RW3-…)</strong> dan Surat Izin Usaha yang bisa dicetak dari cek status.
            </FlowStep>
            <FlowStep n={5}>
              Bila menyumbang uang: setor <strong>{LABEL_SETOR_SUMBANGSIH}</strong>. Sumbangsih boleh diubah, dikurangi,
              atau dihentikan kapan saja lewat WhatsApp sekretariat.
            </FlowStep>
            <FlowStep n={6}>
              Jaga lingkungan. Aduan warga yang terbukti ditangani lewat teguran resmi bertingkat (teguran lisan, SP-1,
              SP-2, SP-3) tanpa denda uang — tidak berkaitan dengan besar kecilnya sumbangsih.
            </FlowStep>
            <FlowStep n={7}>
              Sumbangsih untuk program voucher + kelebihan dana jadi <strong>voucher belanja warga</strong> yang dibelanjakan
              di usaha kontributor. Pengusaha menukar voucher ke kas RW dan dibayar penuh paling lambat 7 hari.
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
                <Printer className="w-4 h-4" /> Cetak formulir sumbangsih
              </Button>
            </Link>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-semibold text-sm">Siapkan sebelum mengisi</h2>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Nomor WhatsApp aktif — cukup data kontak; tidak perlu fotokopi KTP
            </li>
            <li className="flex gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              Jam operasional usaha (wajib)
            </li>
            <li className="flex gap-2">
              <Wallet className="w-4 h-4 shrink-0 mt-0.5" />
              Nominal sumbangsih seikhlasnya (boleh Rp0) — atau rencana sumbangsih barang/jasa
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">{ANJURAN_RP0}</p>
        </section>

        <section className="rounded-xl border bg-card p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-brand" />
            Manfaat untuk pengusaha
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Izin usaha RW3BIZ dan nomor usaha yang bisa dicek online berlaku untuk{" "}
            <strong className="text-foreground">semua usaha, berapa pun sumbangsihnya</strong>. Ditambah keamanan Linmas
            &amp; CCTV, surat pengantar tanpa biaya, Peta Usaha online, dan pelatihan UMKM. Usaha kontributor mendapat
            promo bergiliran, voucher belanja warga, dan lapak bazar gratis. Setor hanya{" "}
            <strong className="text-foreground">{LABEL_SETOR_SUMBANGSIH}</strong>.
          </p>
          <KebutuhanRw3 />
          <Accordion type="single" collapsible>
            <AccordionItem value="aturan" className="border-b-0">
              <AccordionTrigger className="text-sm py-2">Aturan, transparansi & voucher</AccordionTrigger>
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
          <p className="text-xs text-muted-foreground">
            Penerimaan dan pemakaian dana per program diumumkan setiap bulan. Diperbarui otomatis.
          </p>
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
            <AccordionTrigger className="text-sm">Apa ada biaya / tarif?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Tidak ada tarif dan tidak ada nominal minimal. Sumbangsih seikhlasnya — boleh Rp0. Bila menyumbang uang,
              setor {LABEL_SETOR_SUMBANGSIH}.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="keberatan">
            <AccordionTrigger className="text-sm">Bagaimana jika ingin mengubah sumbangsih?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Sumbangsih boleh diubah, dikurangi, atau dihentikan kapan saja lewat WhatsApp sekretariat. Atau buka halaman{" "}
              <Link href={RW3BIZ_ROUTES.status} className="text-brand font-medium underline">
                cek status
              </Link>
              . {ANJURAN_RP0}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="oknum">
            <AccordionTrigger className="text-sm">Bagaimana jika ada yang memungut atas nama RW?</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              Tolak. Setor resmi hanya kepada {SETOR_SUMBANGSIH.penerima} dengan {SETOR_SUMBANGSIH.bukti}. Laporkan ke
              Ketua RW 03 atau Lurah Padasuka.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Rw3bizShell>
  );
}
