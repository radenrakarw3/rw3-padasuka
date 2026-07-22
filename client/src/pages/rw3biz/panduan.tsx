import { Link } from "wouter";
import { BookOpen, Store, Clock, Camera, MessageCircle, ChevronRight } from "lucide-react";
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
            <FlowStep n={1}>Isi data usaha: nama, jenis tempat, kategori, jam buka–tutup, PJ.</FlowStep>
            <FlowStep n={2}>Isi data orang yang rutin di lokasi (KTP & WhatsApp).</FlowStep>
            <FlowStep n={3}>Setujui tata tertib & pilih masa berlaku.</FlowStep>
            <FlowStep n={4}>Tunggu survey pengurus — pantau status atau WhatsApp.</FlowStep>
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
              Foto KTP penanggung jawab / pekerja yang didaftarkan
            </li>
            <li className="flex gap-2">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" />
              Jam operasional usaha (wajib)
            </li>
            <li className="flex gap-2">
              <MessageCircle className="w-4 h-4 shrink-0 mt-0.5" />
              Nomor WhatsApp aktif untuk dihubungi survey
            </li>
          </ul>
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
              Ketentuan kontribusi/lingkungan mengikuti kebijakan RW yang berlaku. Admin akan
              menginformasikan setelah survey jika diperlukan.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </Rw3bizShell>
  );
}
