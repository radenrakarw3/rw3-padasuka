import { Link } from "wouter";
import { BookOpen, Home, BedDouble, Store, FileText, Printer } from "lucide-react";
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
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
        {n}
      </span>
      <span className="pt-0.5 text-muted-foreground">{children}</span>
    </li>
  );
}

export default function Visitrw3Panduan() {
  return (
    <Visitrw3Shell title="Panduan Visit RW3" backHref={VISITRW3_ROUTES.hub}>
      <div className="space-y-5">
        <div className="space-y-2 rounded-lg border border-brand/20 bg-brand/5 p-4">
          <div className="flex items-center gap-2 text-brand">
            <BookOpen className="h-5 w-5" />
            <p className="text-sm font-semibold">Cara main — singkat</p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Visit RW3</strong> adalah izin tinggal sementara untuk yang ngontrak
            atau ngekost di RW 03 (KTP luar). Kontribusi tetap <strong className="text-foreground">Rp1.000 / bulan</strong>.
            Tidak ada survey lapangan. Jualan/usaha lewat{" "}
            <Link href="/rw3biz" className="font-medium text-brand underline">
              RW3BIZ
            </Link>
            .
          </p>
        </div>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Alur utama (formulir kertas)</h2>
          <ol className="space-y-3">
            <FlowStep n={1}>
              Pengurus cetak formulir kosong, berikan ke <strong className="text-foreground">pemilik kost/kontrakan</strong>.
            </FlowStep>
            <FlowStep n={2}>
              Penghuni isi <strong className="text-foreground">2 lembar A4</strong>: (1) formulir — asal tinggal,
              kepentingan, penanggung jawab + anggota; (2) surat pernyataan tata tertib &amp; larangan.
              Lampirkan <strong className="text-foreground">fotokopi KTP semua anggota</strong> (anak: KK).
              Bayar <strong className="text-foreground">Rp1.000</strong>.
            </FlowStep>
            <FlowStep n={3}>Formulir dikumpulkan kembali → admin input ke sistem (mode petugas).</FlowStep>
            <FlowStep n={4}>
              Admin setujui → izin tinggal <strong className="text-foreground">aktif</strong>, nomor VRW3 + surat. Cek di{" "}
              <Link href={VISITRW3_ROUTES.status} className="text-brand underline">
                status
              </Link>
              .
            </FlowStep>
          </ol>
          <Button asChild className="mt-2 w-full gap-2">
            <Link href={VISITRW3_ROUTES.formulir}>
              <Printer className="h-4 w-4" /> Cetak formulir
            </Link>
          </Button>
        </section>

        <section className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Dua jenis tinggal</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
              <Home className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
              <div>
                <p className="font-medium">{JENIS_WARGA_LABEL.kontrak}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{JENIS_WARGA_DESKRIPSI.kontrak}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
              <BedDouble className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" />
              <div>
                <p className="font-medium">{JENIS_WARGA_LABEL.kost}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{JENIS_WARGA_DESKRIPSI.kost}</p>
              </div>
            </div>
            <div className="flex gap-3 rounded-lg border border-dashed bg-muted/10 p-3">
              <Store className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-muted-foreground">Jualan → RW3BIZ</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Usaha/warung tidak lewat Visit RW3.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-2 rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Tanya jawab</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="tarif">
              <AccordionTrigger className="text-sm">Berapa kontribusinya?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Tetap Rp1.000 (seribu rupiah) untuk setiap 1 bulan masa berlaku — sama untuk kost dan kontrakan.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="survey">
              <AccordionTrigger className="text-sm">Apakah ada survey ke lokasi?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Tidak. Pengurus cukup memverifikasi data di formulir dan mencatat pembayaran Rp1.000, lalu menyetujui.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="pemilik">
              <AccordionTrigger className="text-sm">Pemilik harus daftar properti?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Tidak. Pemilik hanya menyalurkan dan mengumpulkan formulir penghuni.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="perpanjang">
              <AccordionTrigger className="text-sm">Bagaimana perpanjang?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Sebelum habis, perpanjang 1 bulan lagi (Rp1.000) lewat{" "}
                <Link href={VISITRW3_ROUTES.perpanjang} className="text-brand underline">
                  menu perpanjang
                </Link>{" "}
                atau formulir ke pengurus. Anda juga dapat pengingat WhatsApp H-7, H-1, dan hari H.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="online">
              <AccordionTrigger className="text-sm">Boleh isi dari HP?</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Boleh sebagai cadangan di halaman Visit RW3. Cara utama tetap formulir kertas lewat pemilik.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1 gap-2">
            <Link href={VISITRW3_ROUTES.formulir}>
              <FileText className="h-4 w-4" /> Formulir
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href={VISITRW3_ROUTES.hub}>Kembali ke Visit RW3</Link>
          </Button>
        </div>
      </div>
    </Visitrw3Shell>
  );
}
