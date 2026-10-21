import { Link } from "wouter";
import { ClipboardCheck, FileWarning, Megaphone, Search, ShieldCheck, Send } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { ADUAN_ROUTES, KartuMegah, KartuMode } from "@/components/aduan/aduan-ui";

const ALUR = [
  { ikon: Send, judul: "Anda mengadu", isi: "Ceritakan masalahnya dan lampirkan foto. Pilih cara identitas Anda dijaga." },
  { ikon: Search, judul: "Pengurus memeriksa", isi: "Ketua RW memeriksa ke lapangan dan, bila perlu, mengundang pihak terkait memberi keterangan." },
  { ikon: FileWarning, judul: "Teguran resmi", isi: "Bila terbukti, RW menerbitkan teguran bertingkat: Lisan, SP-1, SP-2, hingga SP-3 dengan nomor surat resmi." },
  { ikon: ClipboardCheck, judul: "Dipantau sampai beres", isi: "Batas waktu perbaikan dipantau. Anda bisa mengikuti perkembangannya dengan kode lacak." },
];

export default function AduanBeranda() {
  return (
    <PublicKioskLayout title="Aduan Warga" backHref="/">
      <div className="space-y-6">
        <KartuMegah judul="Suara Anda menjaga ketertiban RW 03" sub="Laporkan gangguan di lingkungan. Setiap aduan diperiksa langsung oleh Ketua RW, dan identitas Anda dilindungi.">
          <div className="grid gap-2">
            <Link href={ADUAN_ROUTES.buat}
              className="flex h-14 items-center justify-center gap-2 rounded-xl bg-[hsl(40,58%,62%)] text-lg font-bold text-[hsl(163,55%,12%)] shadow-lg transition hover:brightness-105">
              <Megaphone className="h-5 w-5" /> Buat aduan
            </Link>
            <Link href={ADUAN_ROUTES.lacak}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 text-base font-semibold text-white backdrop-blur hover:bg-white/15">
              <Search className="h-5 w-5" /> Lacak aduan saya
            </Link>
          </div>
        </KartuMegah>

        <section className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border-2 border-green-200 bg-green-50 p-4">
            <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-700" aria-hidden />
            <div>
              <p className="font-bold text-green-900">Identitas Anda tidak pernah diberikan kepada pihak yang diadukan</p>
              <p className="text-sm text-green-900/80">Nama pelapor tidak dicetak di surat teguran. Anda yang memilih seberapa jauh identitas Anda diketahui:</p>
            </div>
          </div>
          <KartuMode mode="rahasia" rekomendasi />
          <KartuMode mode="anonim" />
          <KartuMode mode="terbuka" />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-brand">Bagaimana aduan ditangani</h2>
          <ol className="relative space-y-4 border-l-2 border-brand/20 pl-6">
            {ALUR.map(({ ikon: Ikon, judul, isi }, i) => (
              <li key={judul} className="relative">
                <span className="absolute -left-[38px] flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white shadow">
                  <Ikon className="h-4 w-4" aria-hidden />
                </span>
                <p className="font-semibold">{i + 1}. {judul}</p>
                <p className="text-sm text-muted-foreground">{isi}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">Gunakan dengan bijak</p>
          <p className="mt-1">
            Aduan diperiksa dulu sebelum ada tindakan. Aduan yang terbukti fitnah atau dibuat untuk menjatuhkan orang lain
            akan ditolak. Keadaan darurat (kebakaran, kejahatan yang sedang terjadi) segera hubungi 112 atau pos ronda terdekat.
          </p>
        </section>
      </div>
    </PublicKioskLayout>
  );
}
