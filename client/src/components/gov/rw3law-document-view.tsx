import { formatTanggalHukum } from "@/lib/rw3law-format";
import { formatNomorPeraturanLengkap } from "@shared/rw3law-archive";
import { rw3lawKategoriLabels } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Rw3lawStructuredBody } from "@/components/gov/rw3law-structured-body";

type Rw3lawDocumentViewProps = {
  judul: string;
  isi: string;
  kategori: string;
  versi?: string | null;
  tanggalBerlaku?: string | null;
  rtAsal?: number | null;
  nomorPeraturan?: number | null;
  tahunNomor?: number | null;
  revisiDariLabel?: string | null;
  docketId?: string;
  className?: string;
};

export function Rw3lawDocumentView({
  judul,
  isi,
  kategori,
  versi,
  tanggalBerlaku,
  rtAsal,
  nomorPeraturan,
  tahunNomor,
  revisiDariLabel,
  docketId,
  className,
}: Rw3lawDocumentViewProps) {
  const kategoriLabel = rw3lawKategoriLabels[kategori] ?? kategori;
  const effective = tanggalBerlaku ? formatTanggalHukum(tanggalBerlaku) : null;
  const nomorLabel =
    formatNomorPeraturanLengkap(nomorPeraturan, tahunNomor) ?? null;

  return (
    <article
      className={cn(
        "bg-[#fffef9] shadow-[0_4px_24px_rgba(26,39,68,0.12)] border border-[#d4cfc4]",
        className,
      )}
    >
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

        {revisiDariLabel && (
          <p className="mt-4 font-serif text-xs text-[#5c4033] max-w-prose mx-auto leading-relaxed">
            Mengubah dan menggantikan: <span className="font-semibold">{revisiDariLabel}</span>
          </p>
        )}

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-left max-w-md mx-auto text-[12px] font-serif">
          {nomorLabel && (
            <>
              <dt className="uppercase tracking-wider text-[#6b6b6b]">Penomeran</dt>
              <dd className="text-[#1a2744] font-medium">{nomorLabel}</dd>
            </>
          )}
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

      <div className="px-4 sm:px-8 md:px-12 py-8 sm:py-10">
        <p className="text-center font-serif text-[13px] uppercase tracking-[0.15em] text-[#6b6b6b] mb-8">
          Peraturan berikut ditetapkan dan wajib dipatuhi seluruh warga RW 03 Padasuka.
        </p>

        <Rw3lawStructuredBody isi={isi} />
      </div>

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
