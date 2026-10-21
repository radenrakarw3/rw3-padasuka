import { createContext, useContext, type ReactNode } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { nilaiBanyak, type DefinisiFakta } from "@shared/wilayah";
import { defStandar } from "@/lib/standar";

export const HIJAU = "hsl(163,55%,22%)";
export const EMAS = "hsl(40,45%,55%)";

/** `true` di panel admin: komponen tampil ringkas. Formulir publik warga tetap besar. */
const RingkasContext = createContext(false);
export const UiRingkas = RingkasContext.Provider;
export const useRingkas = () => useContext(RingkasContext);

const IKON_KECIL = "[&_svg]:h-4 [&_svg]:w-4";

export function Judul({ children, kembali, sub }: { children: ReactNode; kembali?: () => void; sub?: ReactNode }) {
  const r = useRingkas();
  return (
    <div className={`flex items-start gap-1 ${r ? "mb-3" : "mb-4 sm:gap-2"}`}>
      {kembali && (
        <button type="button" onClick={kembali} aria-label="Kembali"
          className={r
            ? "h-9 w-9 shrink-0 -ml-1.5 flex items-center justify-center rounded-lg active:bg-black/5 hover:bg-black/5"
            : "min-h-[48px] min-w-[48px] shrink-0 -ml-2 flex items-center justify-center rounded-xl active:bg-black/5 sm:min-h-[52px] sm:min-w-[52px]"}>
          <ChevronLeft className={r ? "w-5 h-5" : "w-7 h-7 sm:w-8 sm:h-8"} />
        </button>
      )}
      <div className={`min-w-0 ${r ? "pt-1" : "pt-2"}`}>
        <h1 className={`font-bold leading-tight break-words ${r ? "text-lg" : "text-xl sm:text-2xl"}`} style={{ color: HIJAU }}>{children}</h1>
        {sub && <p className={`text-gray-700 break-words ${r ? "text-sm mt-0.5" : "text-base mt-1 sm:text-lg"}`}>{sub}</p>}
      </div>
    </div>
  );
}

export function TombolBesar({
  children, onClick, ikon, varian = "utama", disabled, type = "button", memuat,
}: {
  children: ReactNode; onClick?: () => void; ikon?: ReactNode; varian?: "utama" | "kedua" | "bahaya" | "emas";
  disabled?: boolean; type?: "button" | "submit"; memuat?: boolean;
}) {
  const r = useRingkas();
  const gaya = {
    utama: { backgroundColor: HIJAU, color: "white", border: `${r ? 1 : 2}px solid ${HIJAU}` },
    emas: { backgroundColor: EMAS, color: "#1f1a0e", border: `${r ? 1 : 2}px solid ${EMAS}` },
    kedua: { backgroundColor: "white", color: HIJAU, border: `${r ? 1 : 2}px solid ${HIJAU}` },
    bahaya: { backgroundColor: "white", color: "#b91c1c", border: `${r ? 1 : 2}px solid #b91c1c` },
  }[varian];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || memuat}
      className={r
        ? `w-full min-h-[40px] rounded-xl px-3 py-2 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99] transition ${IKON_KECIL}`
        : "w-full min-h-[56px] rounded-2xl px-4 py-3 text-lg font-semibold flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.99] transition"}
      style={gaya}
    >
      {memuat ? <Loader2 className={r ? "animate-spin" : "w-6 h-6 animate-spin"} /> : ikon}
      <span>{children}</span>
    </button>
  );
}

export function KartuMenu({ ikon, judul, sub, onClick, angka }: { ikon: ReactNode; judul: string; sub?: string; onClick: () => void; angka?: number }) {
  const r = useRingkas();
  return (
    <button type="button" onClick={onClick}
      className={r
        ? "w-full min-h-[52px] bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-center gap-3 text-left active:bg-gray-50 hover:border-emerald-300"
        : "w-full min-h-[72px] bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 flex items-center gap-4 text-left active:bg-gray-50"}>
      <span className={`${r ? `w-8 h-8 rounded-lg ${IKON_KECIL}` : "w-12 h-12 rounded-xl"} flex items-center justify-center shrink-0`} style={{ backgroundColor: "hsl(163,40%,92%)", color: HIJAU }}>{ikon}</span>
      <span className="min-w-0 flex-1 break-words">
        <span className={`block font-semibold text-gray-900 ${r ? "text-sm" : "text-lg"}`}>{judul}</span>
        {sub && <span className={`block text-gray-600 ${r ? "text-xs" : "text-base"}`}>{sub}</span>}
      </span>
      {angka != null && angka > 0 && (
        <span className={`rounded-full text-white font-bold flex items-center justify-center ${r ? "min-w-[24px] h-6 px-1.5 text-xs" : "min-w-[36px] h-9 px-2 text-lg"}`} style={{ backgroundColor: "#b45309" }}>{angka}</span>
      )}
    </button>
  );
}

export function Pesan({ jenis = "info", children }: { jenis?: "info" | "error" | "sukses" | "peringatan"; children: ReactNode }) {
  const r = useRingkas();
  const c = {
    info: "bg-blue-50 border-blue-300 text-blue-900",
    error: "bg-red-50 border-red-400 text-red-900",
    sukses: "bg-green-50 border-green-400 text-green-900",
    peringatan: "bg-amber-50 border-amber-400 text-amber-900",
  }[jenis];
  return <div role={jenis === "error" ? "alert" : "status"} className={`${r ? "border rounded-xl px-3 py-2 text-sm" : "border-2 rounded-2xl p-4 text-lg"} ${c}`}>{children}</div>;
}

export function Memuat({ teks = "Memuat…" }: { teks?: string }) {
  const r = useRingkas();
  return (
    <div className={`flex items-center justify-center gap-2 text-gray-600 ${r ? "py-6 text-sm" : "gap-3 py-10 text-lg"}`}>
      <Loader2 className={`animate-spin ${r ? "w-5 h-5" : "w-7 h-7"}`} /> {teks}
    </div>
  );
}

function kelasLegend(r: boolean) {
  return r ? "text-sm font-semibold text-gray-900 mb-1" : "text-lg font-semibold text-gray-900 mb-1";
}
function kelasBantuan(r: boolean) {
  return r ? "text-xs text-gray-600 mb-1.5" : "text-base text-gray-600 mb-2";
}
function kelasPilihan(r: boolean) {
  return r ? "min-h-[38px] rounded-lg border px-2.5 py-1.5 text-sm font-medium text-left" : "min-h-[52px] rounded-xl border-2 px-3 py-2 text-lg font-medium text-left";
}

/**
 * Pilihan berupa tombol besar. `null` = belum diketahui (berbeda dari "tidak" atau 0):
 * cukup dilewati, atau dikosongkan lagi lewat tautan di bawah tombol.
 */
export function PilihTombol({
  label, nilai, pilihan, onChange, belumTahu = true, kolom = 2, bantuan,
}: {
  label: string; nilai: string | null | undefined; pilihan: { nilai: string; label: string }[];
  onChange: (v: string | null) => void; belumTahu?: boolean; kolom?: 1 | 2 | 3; bantuan?: string;
}) {
  const r = useRingkas();
  const grid = r
    ? kolom === 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
    : kolom === 1 ? "grid-cols-1" : kolom === 3 ? "grid-cols-3" : "grid-cols-2";
  return (
    <fieldset className={r ? "mb-4" : "mb-5"}>
      <legend className={kelasLegend(r)}>{label}</legend>
      {bantuan && <p className={kelasBantuan(r)}>{bantuan}</p>}
      <div className={`grid ${r ? "gap-1.5" : "gap-2"} ${grid}`}>
        {pilihan.map((p) => {
          const aktif = nilai === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              aria-pressed={aktif}
              onClick={() => onChange(p.nilai)}
              className={`${kelasPilihan(r)} ${aktif ? "text-white" : "bg-white text-gray-900 border-gray-300"}`}
              style={aktif ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {belumTahu && nilai != null && (
        <button type="button" onClick={() => onChange(null)} className={`mt-2 text-gray-600 underline ${r ? "text-xs" : "text-base"}`}>
          Kosongkan (belum tahu)
        </button>
      )}
    </fieldset>
  );
}

const PILIHAN_TUNGGAL = ["tidak_ada", "tidak"];

/** Pilih beberapa. Pilihan "Tidak ada" otomatis menghapus pilihan lain (dan sebaliknya). */
export function PilihBanyak({
  label, nilai, pilihan, onChange, bantuan,
}: {
  label: string; nilai: string | null | undefined; pilihan: { nilai: string; label: string }[]; onChange: (v: string | null) => void; bantuan?: string | null;
}) {
  const r = useRingkas();
  const terpilih = nilaiBanyak(nilai);
  const ubah = (v: string) => {
    let baru = terpilih.includes(v) ? terpilih.filter((x) => x !== v) : [...terpilih, v];
    if (!terpilih.includes(v)) baru = PILIHAN_TUNGGAL.includes(v) ? [v] : baru.filter((x) => !PILIHAN_TUNGGAL.includes(x));
    onChange(baru.length ? pilihan.map((p) => p.nilai).filter((x) => baru.includes(x)).join(",") : null);
  };
  return (
    <fieldset className={r ? "mb-4" : "mb-5"}>
      <legend className={kelasLegend(r)}>{label}</legend>
      <p className={kelasBantuan(r)}>{bantuan || "Boleh pilih lebih dari satu."}</p>
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${r ? "gap-1.5" : "gap-2"}`}>
        {pilihan.map((p) => {
          const aktif = terpilih.includes(p.nilai);
          return (
            <button key={p.nilai} type="button" aria-pressed={aktif} onClick={() => ubah(p.nilai)}
              className={`${kelasPilihan(r)} flex items-center ${r ? "gap-2" : "gap-3"} ${aktif ? "text-white" : "bg-white text-gray-900 border-gray-300"}`}
              style={aktif ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}>
              <span className={`inline-flex shrink-0 items-center justify-center rounded border-2 ${r ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-sm"} ${aktif ? "border-white" : "border-gray-400"}`}>{aktif ? "✓" : ""}</span>
              {p.label}
            </button>
          );
        })}
      </div>
      {terpilih.length > 0 && (
        <button type="button" onClick={() => onChange(null)} className={`mt-2 text-gray-600 underline ${r ? "text-xs" : "text-base"}`}>Kosongkan (belum tahu)</button>
      )}
    </fieldset>
  );
}

export function PilihFakta({ kunci, def: defProp, nilai, onChange }: { kunci: string; def?: DefinisiFakta; nilai: string | null | undefined; onChange: (v: string | null) => void }) {
  const def = defProp ?? defStandar(kunci);
  if (!def) return null;
  if (def.tipe === "angka" || def.tipe === "teks") {
    const angka = def.tipe === "angka";
    return (
      <IsianTeks
        label={def.pertanyaan}
        bantuan={def.bantuan || (angka ? "Kosongkan bila belum tahu. Isi 0 bila memang tidak ada." : "Kosongkan bila belum tahu.")}
        nilai={nilai ?? ""}
        inputMode={angka ? "numeric" : "text"}
        maks={angka ? 6 : 200}
        onChange={(v) => {
          const bersih = angka ? v.replace(/\D/g, "") : v;
          onChange(bersih.trim() === "" ? null : bersih);
        }}
      />
    );
  }
  if (def.tipe === "banyak") return <PilihBanyak label={def.pertanyaan} bantuan={def.bantuan} nilai={nilai} pilihan={def.pilihan ?? []} onChange={onChange} />;
  const pilihan = def.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : def.pilihan ?? [];
  return <PilihTombol label={def.pertanyaan} bantuan={def.bantuan ?? undefined} nilai={nilai} pilihan={pilihan} onChange={onChange} kolom={pilihan.length > 4 ? 1 : 2} />;
}

export function IsianTeks({
  label, nilai, onChange, tipe = "text", placeholder, bantuan, inputMode, maks, wajib, galat, autoComplete,
}: {
  label: string; nilai: string; onChange: (v: string) => void; tipe?: string; placeholder?: string; bantuan?: string;
  inputMode?: "text" | "numeric" | "tel"; maks?: number; wajib?: boolean; galat?: string | null; autoComplete?: string;
}) {
  const r = useRingkas();
  return (
    <label className={`block ${r ? "mb-3" : "mb-5"}`}>
      <span className={`block font-semibold text-gray-900 mb-1 ${r ? "text-sm" : "text-lg"}`}>
        {label}
        {wajib && <span className="ml-2 align-middle rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Wajib</span>}
      </span>
      {bantuan && <span className={`block ${kelasBantuan(r)}`}>{bantuan}</span>}
      <input
        type={tipe}
        value={nilai}
        inputMode={inputMode}
        maxLength={maks}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={wajib}
        aria-invalid={galat ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full focus:outline-none ${r ? "h-10 rounded-lg border px-3 text-base" : "min-h-[56px] rounded-xl border-2 px-4 text-lg"} ${galat ? "border-red-500 bg-red-50/40 focus:border-red-600" : "border-gray-300 focus:border-[hsl(163,55%,22%)]"}`}
      />
      {galat && <span role="alert" className={`block mt-1 font-medium text-red-700 ${r ? "text-xs" : "text-base mt-2"}`}>{galat}</span>}
    </label>
  );
}

export function IsianPanjang({ label, nilai, onChange, placeholder }: { label: string; nilai: string; onChange: (v: string) => void; placeholder?: string }) {
  const r = useRingkas();
  return (
    <label className={`block ${r ? "mb-3" : "mb-5"}`}>
      <span className={`block font-semibold text-gray-900 mb-1 ${r ? "text-sm" : "text-lg"}`}>{label}</span>
      <textarea
        value={nilai}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={r ? 3 : 4}
        className={`w-full border-gray-300 focus:outline-none focus:border-[hsl(163,55%,22%)] ${r ? "rounded-lg border px-3 py-2 text-base" : "rounded-xl border-2 px-4 py-3 text-lg"}`}
      />
    </label>
  );
}

/** Bilah aksi admin: menempel di atas navigasi bawah HP, tampil biasa di ≥ lg. Induknya `<main>` ber-padding px-3 / sm:px-4. */
const KELAS_BILAH_ADMIN =
  "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-3 border-t border-gray-200 bg-background/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none";

export function BilahAksiAdmin({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${KELAS_BILAH_ADMIN} ${className}`}>{children}</div>;
}

/** Kerangka form bertahap: langkah X dari Y, tombol Kembali/Lanjut besar. */
export function Langkah({
  langkah, total, judul, children, onKembali, onLanjut, labelLanjut = "Lanjut", bisaLanjut = true, memuat, alasan, lengket,
}: {
  langkah: number; total: number; judul: string; children: ReactNode; onKembali?: () => void; onLanjut: () => void;
  labelLanjut?: string; bisaLanjut?: boolean; memuat?: boolean; alasan?: string | null;
  /**
   * Tombol menempel di bawah layar HP. `true` = halaman publik berlatar hijau muda;
   * `"admin"` = di atas navigasi bawah admin, kembali biasa di ≥ lg.
   */
  lengket?: boolean | "admin";
}) {
  const r = useRingkas();
  const kelasTombol = lengket === "admin"
    ? `${KELAS_BILAH_ADMIN} ${r ? "mt-4" : "mt-6"}`
    : lengket
      ? "sticky bottom-0 -mx-4 mt-6 border-t border-gray-200 bg-[hsl(163,30%,96%)]/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
      : r ? "mt-4" : "mt-6";
  const tampilLangkah = !r || total > 1;
  return (
    <div className="pb-4">
      {tampilLangkah && (
        <div className={`flex gap-1 ${r ? "mb-2" : "mb-3"}`} aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`${r ? "h-1.5" : "h-2"} flex-1 rounded-full`} style={{ backgroundColor: i < langkah ? HIJAU : "#e5e7eb" }} />
          ))}
        </div>
      )}
      {tampilLangkah && <p className={`text-gray-600 ${r ? "text-xs" : "text-base"}`}>Langkah {langkah} dari {total}</p>}
      <h2 className={`font-bold break-words ${r ? "text-base mb-3" : "text-xl mb-4"}`}>{judul}</h2>
      {children}
      <div className={kelasTombol}>
        {!bisaLanjut && alasan && <p className={`mb-2 font-medium text-amber-800 ${r ? "text-xs" : "text-base"}`}>{alasan}</p>}
        <div className={`grid grid-cols-2 ${r ? "gap-2" : "gap-3"}`}>
          {onKembali ? <TombolBesar varian="kedua" onClick={onKembali}>Kembali</TombolBesar> : <span />}
          <TombolBesar onClick={onLanjut} disabled={!bisaLanjut} memuat={memuat}>{labelLanjut}</TombolBesar>
        </div>
      </div>
    </div>
  );
}

export function BarisRingkas({ label, nilai }: { label: string; nilai: ReactNode }) {
  const r = useRingkas();
  return (
    <div className={`flex justify-between gap-4 border-b border-gray-200 ${r ? "py-2 text-sm" : "py-3 text-base sm:text-lg"}`}>
      <span className="min-w-0 text-gray-600">{label}</span>
      <span className="min-w-0 font-semibold text-right break-words">{nilai ?? <i className="text-gray-500">Belum diketahui</i>}</span>
    </div>
  );
}

export function rt2(rt: number | null | undefined) {
  return rt == null ? "RW" : `RT ${String(rt).padStart(2, "0")}`;
}
