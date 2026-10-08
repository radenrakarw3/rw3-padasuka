import type { ReactNode } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { FAKTA_BY_KUNCI, type DefinisiFakta } from "@shared/wilayah";

export const HIJAU = "hsl(163,55%,22%)";
export const EMAS = "hsl(40,45%,55%)";

export function Judul({ children, kembali, sub }: { children: ReactNode; kembali?: () => void; sub?: ReactNode }) {
  return (
    <div className="flex items-start gap-2 mb-4">
      {kembali && (
        <button type="button" onClick={kembali} className="min-h-[52px] min-w-[52px] -ml-2 flex items-center justify-center rounded-xl active:bg-black/5" aria-label="Kembali">
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      <div className="pt-2">
        <h1 className="text-2xl font-bold leading-tight" style={{ color: HIJAU }}>{children}</h1>
        {sub && <p className="text-lg text-gray-700 mt-1">{sub}</p>}
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
  const gaya = {
    utama: { backgroundColor: HIJAU, color: "white", border: `2px solid ${HIJAU}` },
    emas: { backgroundColor: EMAS, color: "#1f1a0e", border: `2px solid ${EMAS}` },
    kedua: { backgroundColor: "white", color: HIJAU, border: `2px solid ${HIJAU}` },
    bahaya: { backgroundColor: "white", color: "#b91c1c", border: "2px solid #b91c1c" },
  }[varian];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || memuat}
      className="w-full min-h-[56px] rounded-2xl px-4 py-3 text-lg font-semibold flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.99] transition"
      style={gaya}
    >
      {memuat ? <Loader2 className="w-6 h-6 animate-spin" /> : ikon}
      <span>{children}</span>
    </button>
  );
}

export function KartuMenu({ ikon, judul, sub, onClick, angka }: { ikon: ReactNode; judul: string; sub?: string; onClick: () => void; angka?: number }) {
  return (
    <button type="button" onClick={onClick} className="w-full min-h-[72px] bg-white rounded-2xl border-2 border-gray-200 px-4 py-3 flex items-center gap-4 text-left active:bg-gray-50">
      <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "hsl(163,40%,92%)", color: HIJAU }}>{ikon}</span>
      <span className="flex-1">
        <span className="block text-lg font-semibold text-gray-900">{judul}</span>
        {sub && <span className="block text-base text-gray-600">{sub}</span>}
      </span>
      {angka != null && angka > 0 && (
        <span className="min-w-[36px] h-9 px-2 rounded-full text-white text-lg font-bold flex items-center justify-center" style={{ backgroundColor: "#b45309" }}>{angka}</span>
      )}
    </button>
  );
}

export function Pesan({ jenis = "info", children }: { jenis?: "info" | "error" | "sukses" | "peringatan"; children: ReactNode }) {
  const c = {
    info: "bg-blue-50 border-blue-300 text-blue-900",
    error: "bg-red-50 border-red-400 text-red-900",
    sukses: "bg-green-50 border-green-400 text-green-900",
    peringatan: "bg-amber-50 border-amber-400 text-amber-900",
  }[jenis];
  return <div role={jenis === "error" ? "alert" : "status"} className={`border-2 rounded-2xl p-4 text-lg ${c}`}>{children}</div>;
}

export function Memuat({ teks = "Memuat…" }: { teks?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-lg text-gray-600">
      <Loader2 className="w-7 h-7 animate-spin" /> {teks}
    </div>
  );
}

/** Pilihan berupa tombol besar. `null` = belum diketahui (berbeda dari "tidak" atau 0). */
export function PilihTombol({
  label, nilai, pilihan, onChange, belumTahu = true, kolom = 2, bantuan,
}: {
  label: string; nilai: string | null | undefined; pilihan: { nilai: string; label: string }[];
  onChange: (v: string | null) => void; belumTahu?: boolean; kolom?: 1 | 2 | 3; bantuan?: string;
}) {
  const semua = belumTahu ? [...pilihan, { nilai: "__null", label: "Belum tahu" }] : pilihan;
  return (
    <fieldset className="mb-5">
      <legend className="text-lg font-semibold text-gray-900 mb-1">{label}</legend>
      {bantuan && <p className="text-base text-gray-600 mb-2">{bantuan}</p>}
      <div className={`grid gap-2 ${kolom === 1 ? "grid-cols-1" : kolom === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {semua.map((p) => {
          const aktif = p.nilai === "__null" ? nilai == null : nilai === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              aria-pressed={aktif}
              onClick={() => onChange(p.nilai === "__null" ? null : p.nilai)}
              className={`min-h-[52px] rounded-xl border-2 px-3 py-2 text-lg font-medium text-left ${aktif ? "text-white" : "bg-white text-gray-900 border-gray-300"} ${p.nilai === "__null" && !aktif ? "text-gray-600 border-dashed" : ""}`}
              style={aktif ? { backgroundColor: HIJAU, borderColor: HIJAU } : undefined}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PilihFakta({ kunci, nilai, onChange }: { kunci: string; nilai: string | null | undefined; onChange: (v: string | null) => void }) {
  const def = FAKTA_BY_KUNCI.get(kunci) as DefinisiFakta | undefined;
  if (!def) return null;
  if (def.tipe === "angka") {
    return (
      <IsianTeks
        label={def.pertanyaan}
        bantuan="Kosongkan bila belum tahu. Isi 0 bila memang tidak ada."
        nilai={nilai ?? ""}
        inputMode="numeric"
        onChange={(v) => onChange(v.replace(/\D/g, "") === "" ? null : v.replace(/\D/g, ""))}
      />
    );
  }
  const pilihan = def.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : def.pilihan ?? [];
  return <PilihTombol label={def.pertanyaan} nilai={nilai} pilihan={pilihan} onChange={onChange} kolom={pilihan.length > 4 ? 1 : 2} />;
}

export function IsianTeks({
  label, nilai, onChange, tipe = "text", placeholder, bantuan, inputMode, maks,
}: {
  label: string; nilai: string; onChange: (v: string) => void; tipe?: string; placeholder?: string; bantuan?: string;
  inputMode?: "text" | "numeric" | "tel"; maks?: number;
}) {
  return (
    <label className="block mb-5">
      <span className="block text-lg font-semibold text-gray-900 mb-1">{label}</span>
      {bantuan && <span className="block text-base text-gray-600 mb-2">{bantuan}</span>}
      <input
        type={tipe}
        value={nilai}
        inputMode={inputMode}
        maxLength={maks}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[56px] rounded-xl border-2 border-gray-300 px-4 text-lg focus:outline-none focus:border-[hsl(163,55%,22%)]"
      />
    </label>
  );
}

export function IsianPanjang({ label, nilai, onChange, placeholder }: { label: string; nilai: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block mb-5">
      <span className="block text-lg font-semibold text-gray-900 mb-1">{label}</span>
      <textarea
        value={nilai}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 text-lg focus:outline-none focus:border-[hsl(163,55%,22%)]"
      />
    </label>
  );
}

/** Kerangka form bertahap: langkah X dari Y, tombol Kembali/Lanjut besar. */
export function Langkah({
  langkah, total, judul, children, onKembali, onLanjut, labelLanjut = "Lanjut", bisaLanjut = true, memuat,
}: {
  langkah: number; total: number; judul: string; children: ReactNode; onKembali?: () => void; onLanjut: () => void;
  labelLanjut?: string; bisaLanjut?: boolean; memuat?: boolean;
}) {
  return (
    <div className="pb-4">
      <div className="flex gap-1 mb-3" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: i < langkah ? HIJAU : "#e5e7eb" }} />
        ))}
      </div>
      <p className="text-base text-gray-600">Langkah {langkah} dari {total}</p>
      <h2 className="text-xl font-bold mb-4">{judul}</h2>
      {children}
      <div className="grid grid-cols-2 gap-3 mt-6">
        {onKembali ? <TombolBesar varian="kedua" onClick={onKembali}>Kembali</TombolBesar> : <span />}
        <TombolBesar onClick={onLanjut} disabled={!bisaLanjut} memuat={memuat}>{labelLanjut}</TombolBesar>
      </div>
    </div>
  );
}

export function BarisRingkas({ label, nilai }: { label: string; nilai: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3 border-b border-gray-200 text-lg">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-right">{nilai ?? <i className="text-gray-500">Belum diketahui</i>}</span>
    </div>
  );
}

export function rt2(rt: number | null | undefined) {
  return rt == null ? "RW" : `RT ${String(rt).padStart(2, "0")}`;
}
