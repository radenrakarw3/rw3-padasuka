import { parseIsiToStructured, type Rw3lawStructuredIsi } from "@shared/rw3law-structured";
import { cn } from "@/lib/utils";

type Rw3lawStructuredBodyProps = {
  isi: string;
  /** Data terstruktur jika sudah di-parse di parent (hindari parse ulang). */
  structured?: Rw3lawStructuredIsi;
  className?: string;
};

function normalizeDisplay(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function Rw3lawStructuredBody({ isi, structured, className }: Rw3lawStructuredBodyProps) {
  const data = structured ?? parseIsiToStructured(isi);
  const menimbang = data.menimbang
    .map((m) => ({ ...m, teks: normalizeDisplay(m.teks) }))
    .filter((m) => m.teks.length > 0);

  const pasal = data.pasal
    .map((p, pasalIdx) => ({
      ...p,
      nomor: pasalIdx + 1,
      judul: normalizeDisplay(p.judul),
      ayat: p.ayat
        .map((a) => ({ ...a, teks: normalizeDisplay(a.teks) }))
        .filter((a) => a.teks.length > 0),
    }))
    .filter((p) => p.ayat.length > 0 || p.judul.length > 0);

  if (menimbang.length === 0 && pasal.length === 0) {
    return (
      <div
        className={cn(
          "font-serif text-[15px] leading-[1.8] text-[#2c2c2c] text-justify whitespace-pre-wrap",
          className,
        )}
      >
        {isi.trim() || "—"}
      </div>
    );
  }

  return (
    <div className={cn("space-y-8", className)}>
      {menimbang.length > 0 && (
        <section aria-labelledby="rw3law-menimbang-heading">
          <h3
            id="rw3law-menimbang-heading"
            className="text-sm font-semibold text-[#1a2744] mb-3 tracking-wide"
          >
            Menimbang
          </h3>
          <ul className="space-y-3 list-none m-0 p-0">
            {menimbang.map((m, i) => (
              <li
                key={m.id}
                className="flex gap-0 pl-4 border-l-2 border-[#8b7355]/50 bg-[#faf8f4]/60 rounded-r-md py-2 pr-2"
              >
                <p className="font-serif text-[15px] leading-relaxed text-[#2c2c2c] m-0">
                  <span className="font-semibold text-[#1a2744] not-italic uppercase text-[12px] tracking-wider mr-1">
                    Menimbang
                  </span>
                  <span className="italic">{m.teks}</span>
                  {i < menimbang.length - 1 ? (
                    <span className="not-italic text-[#5c5c5c]">; dan</span>
                  ) : (
                    <span className="not-italic">.</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pasal.length > 0 && (
        <section aria-labelledby="rw3law-pasal-heading" className="space-y-4">
          <h3
            id="rw3law-pasal-heading"
            className="text-sm font-semibold text-[#1a2744] tracking-wide sr-only"
          >
            Pasal dan ayat
          </h3>
          {pasal.map((p) => (
            <article
              key={p.id}
              className="rounded-lg border border-[#d4cfc4] bg-[#fffef9] shadow-sm overflow-hidden"
            >
              <header className="px-4 sm:px-5 py-3 border-b border-[#e5e0d5] bg-[#f0ebe3]/70">
                <h4 className="font-serif text-sm sm:text-base font-bold text-[#1a2744] m-0 leading-snug">
                  Pasal {p.nomor}
                  {p.judul ? (
                    <span className="font-semibold text-[#4a4a4a]"> — {p.judul}</span>
                  ) : null}
                </h4>
              </header>
              {p.ayat.length > 0 ? (
                <ol className="list-none m-0 px-4 sm:px-5 py-4 space-y-4">
                  {p.ayat.map((a, ayatIdx) => (
                    <li key={a.id} className="flex gap-3 sm:gap-4 items-start">
                      <span
                        className="font-serif text-sm font-bold text-[hsl(163,55%,22%)] w-7 sm:w-8 shrink-0 text-right tabular-nums pt-0.5"
                        aria-hidden
                      >
                        {ayatIdx + 1}.
                      </span>
                      <p className="font-serif text-[15px] leading-[1.75] text-[#2c2c2c] text-justify flex-1 m-0">
                        {a.teks.endsWith(".") ? a.teks : `${a.teks}.`}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground italic font-serif m-0">
                  (Belum ada ayat)
                </p>
              )}
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
