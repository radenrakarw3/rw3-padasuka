import { Link } from "wouter";
import { Download, Printer, Smartphone, ExternalLink } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { FORMULIR_SUMBANGSIH_PDF_URL } from "@shared/rw3biz-kontribusi";
import { PENGANTAR_SUMBANGSIH, SETOR_SUMBANGSIH } from "@shared/rw3biz-pernyataan";

/**
 * Halaman cetak memakai PDF resmi Formulir Sumbangsih Pengusaha RW3BIZ
 * (versi November 2026) — sama dengan yang diedarkan di sekretariat.
 */
export default function Rw3bizFormulir() {
  const pdfUrl = FORMULIR_SUMBANGSIH_PDF_URL;

  return (
    <Rw3bizShell title="Formulir sumbangsih" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-base font-semibold">Formulir Sumbangsih Pengusaha RW3BIZ</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{PENGANTAR_SUMBANGSIH}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cetak PDF resmi di bawah, isi dengan huruf kapital, centang kotak, lalu serahkan ke sekretariat RW 03.
            Cukup data kontak — tidak perlu fotokopi KTP dan tidak perlu meterai. Setor tunai kepada{" "}
            <strong>{SETOR_SUMBANGSIH.penerima}</strong> + {SETOR_SUMBANGSIH.bukti}.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button className="h-12 gap-2 text-base" asChild>
            <a href={pdfUrl} target="_blank" rel="noreferrer">
              <Printer className="h-5 w-5" /> Buka &amp; cetak PDF
            </a>
          </Button>
          <Button variant="outline" className="h-12 gap-2 text-base" asChild>
            <a href={pdfUrl} download="Formulir-Sumbangsih-RW3BIZ.pdf">
              <Download className="h-5 w-5" /> Unduh PDF
            </a>
          </Button>
        </div>

        <Link href={RW3BIZ_ROUTES.pengajuan}>
          <Button variant="outline" className="h-11 w-full gap-2">
            <Smartphone className="h-4 w-4" /> Lebih mudah isi online
          </Button>
        </Link>

        <div className="overflow-hidden rounded-xl border bg-muted/20">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Pratinjau PDF resmi</p>
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Layar penuh <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <iframe title="Formulir Sumbangsih RW3BIZ" src={pdfUrl} className="h-[70vh] w-full bg-white" />
        </div>
      </div>
    </Rw3bizShell>
  );
}
