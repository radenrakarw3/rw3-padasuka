import { parseRw3lawIsi, formatTanggalHukum, type Rw3lawBlock } from "@/lib/rw3law-format";
import { rw3lawKategoriLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Rw3lawDocumentViewProps = {
  judul: string;
  isi: string;
  kategori: string;
  versi?: string | null;
  tanggalBerlaku?: string | null;
  rtAsal?: number | null;
  docketId?: string;
  className?: string;
};

function BlockRenderer({ block }: { block: Rw3lawBlock }) {
  switch (block.type) {
    case "whereas": {
      const teks = block.text.replace(/^WHEREAS\b/i, "MENIMBANG").replace(/;\s*and\b/gi, "; dan");
      return (
        <p className="rw3law-whereas font-serif text-[15px] leading-relaxed text-[#2c2c2c] italic pl-6 border-l-2 border-[#8b7355]/40 mb-4">
          {teks}
        </p>
      );
    }
    case "article": {
      const isSection = block.label.startsWith("§");
      const isRomanOrNum = /^[IVXLC\d]+$/i.test(block.label);
      const isStandaloneHeading = !isSection && !isRomanOrNum;
      if (isStandaloneHeading) {
        return (
          <h3 className="mt-10 mb-3 font-serif text-sm font-bold uppercase tracking-[0.25em] text-[#1a2744] text-center border-b border-[#1a2744]/15 pb-2">
            {block.label}
          </h3>
        );
      }
      return (
        <div className="mt-8 mb-4 first:mt-0">
          <div className="flex items-baseline gap-3 border-b border-[#1a2744]/20 pb-2">
            <span className="font-serif text-sm font-bold uppercase tracking-[0.2em] text-[#1a2744]">
              {isSection ? block.label.replace(/^§\s*/, "Pasal ") : `Pasal ${block.label}`}
            </span>
            {block.title && (
              <span className="font-serif text-sm text-[#4a4a4a]">— {block.title}</span>
            )}
          </div>
        </div>
      );
    }
    case "provision":
      return (
        <div className="flex gap-4 mb-3 pl-2">
          <span
            className="font-serif text-sm font-semibold text-[#1a2744] w-10 flex-shrink-0 text-right tabular-nums"
            aria-hidden
          >
            {block.label}.
          </span>
          <p className="font-serif text-[15px] leading-[1.75] text-[#2c2c2c] text-justify flex-1 m-0">
            {block.text}
          </p>
        </div>
      );
    case "paragraph":
      return (
        <p className="font-serif text-[15px] leading-[1.8] text-[#2c2c2c] text-justify mb-4 indent-8">
          {block.text}
        </p>
      );
  }
}

export function Rw3lawDocumentView({
  judul,
  isi,
  kategori,
  versi,
  tanggalBerlaku,
  rtAsal,
  docketId,
  className,
}: Rw3lawDocumentViewProps) {
  const blocks = parseRw3lawIsi(isi);
  const kategoriLabel = rw3lawKategoriLabels[kategori] ?? kategori;
  const effective = tanggalBerlaku ? formatTanggalHukum(tanggalBerlaku) : null;

  return (
    <article
      className={cn(
        "bg-[#fffef9] shadow-[0_4px_24px_rgba(26,39,68,0.12)] border border-[#d4cfc4]",
        className,
      )}
    >
      {/* Court caption */}
      <header className="px-6 sm:px-10 pt-10 pb-6 text-center border-b-2 border-[#1a2744]">
        <p className="text-[11px] uppercase tracking-[0.4em] text-[#5c5c5c] mb-3">
          Dalam Hal Ketertiban Lingkungan
        </p>
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#1a2744] font-semibold mb-1">
          Rukun Warga 03 Kelurahan Padasuka
        </p>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b6b6b] mb-6">
          Kecamatan Cimahi Tengah · Kota Cimahi
        </p>

        <div className="inline-block border-2 border-[#1a2744] px-6 py-2 mb-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[#1a2744]">Peraturan</p>
        </div>

        <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#1a2744] leading-snug max-w-prose mx-auto">
          {judul}
        </h2>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left max-w-md mx-auto text-[12px] font-serif">
          {docketId && (
            <>
              <dt className="uppercase tracking-wider text-[#6b6b6b]">Nomor Berkas</dt>
              <dd className="text-[#1a2744] font-medium tabular-nums">{docketId}</dd>
            </>
          )}
          <dt className="uppercase tracking-wider text-[#6b6b6b]">Klasifikasi</dt>
          <dd className="text-[#1a2744]">{kategoriLabel}</dd>
          {versi && (
            <>
              <dt className="uppercase tracking-wider text-[#6b6b6b]">Revisi</dt>
              <dd className="text-[#1a2744]">Versi {versi}</dd>
            </>
          )}
          {effective && (
            <>
              <dt className="uppercase tracking-wider text-[#6b6b6b]">Berlaku Sejak</dt>
              <dd className="text-[#1a2744]">{effective}</dd>
            </>
          )}
          {rtAsal != null && (
            <>
              <dt className="uppercase tracking-wider text-[#6b6b6b]">RT Asal</dt>
              <dd className="text-[#1a2744]">RT {String(rtAsal).padStart(2, "0")}</dd>
            </>
          )}
        </dl>
      </header>

      {/* Body */}
      <div className="px-6 sm:px-12 py-8 sm:py-10">
        <p className="text-center font-serif text-[13px] uppercase tracking-[0.15em] text-[#6b6b6b] mb-8">
          Peraturan berikut ditetapkan dan wajib dipatuhi seluruh warga RW 03 Padasuka.
        </p>

        {blocks.length > 0 ? (
          <div className="space-y-1">
            {blocks.map((block, i) => (
              <BlockRenderer key={i} block={block} />
            ))}
          </div>
        ) : (
          <div className="font-serif text-[15px] leading-[1.8] text-[#2c2c2c] text-justify whitespace-pre-wrap">
            {isi}
          </div>
        )}
      </div>

      {/* Certification footer */}
      <footer className="px-6 sm:px-10 py-8 border-t border-[#d4cfc4] bg-[#f8f6f0]">
        <p className="font-serif text-[13px] text-center text-[#4a4a4a] leading-relaxed italic max-w-prose mx-auto">
          Dokumen ini merupakan peraturan resmi RW 03 Padasuka sebagaimana disahkan pengurus RW.
          Pelanggaran dapat ditindaklanjuti melalui musyawarah lingkungan dan koordinasi dengan pihak
          terkait sesuai ketentuan yang berlaku.
        </p>
        <div className="mt-8 flex justify-center">
          <div className="text-center">
            <div className="w-48 border-t border-[#1a2744] mx-auto mb-2" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#6b6b6b]">
              Ketua RW 03 Padasuka
            </p>
          </div>
        </div>
      </footer>
    </article>
  );
}
