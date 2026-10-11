import type { Blok } from "@shared/surat-sakti";
import { LABEL_STATUS_DISTRIBUSI, LABEL_STATUS_DOKUMEN, LABEL_STATUS_PEKERJAAN, type StatusDistribusi, type StatusDokumen, type StatusPekerjaan } from "@shared/surat-sakti";
import { cn } from "@/lib/utils";

export const RW = { peran: "rw" as const };
export const RT = { peran: "rt" as const };
export const rt2 = (rt: number | null | undefined) => (rt ? `RT ${String(rt).padStart(2, "0")}` : "");

export interface RingkasSurat {
  id: number; nomorSurat: string | null; jenisSurat: string; kodeJenis: string | null; perihal: string; tujuan: string | null;
  tanggalSurat: string | null; status: StatusDokumen; dataForm?: Record<string, unknown>; akses: string; rtTerkait: number[];
  kejadianId: number | null; kegiatanId: number | null;
  alasanBatal: string | null; perluPemeriksaan: boolean; finalV2: boolean; diterbitkanAt: string | null; updatedAt: string | null;
  statusDokumen: StatusDokumen; statusDistribusi: StatusDistribusi; statusPekerjaan: StatusPekerjaan; terlambat: number;
}

export function Galat({ e }: { e: unknown }) {
  if (!e) return null;
  return <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 whitespace-pre-line">{e instanceof Error ? e.message : String(e)}</p>;
}

export function bacaFile(f: File, maks = 3_000_000): Promise<string> {
  if (f.size > maks) return Promise.reject(new Error(`Berkas maksimal ${Math.round(maks / 1_000_000)} MB`));
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => gagal(new Error("Gagal membaca berkas"));
    r.readAsDataURL(f);
  });
}

const WARNA: Record<string, string> = {
  draft: "bg-stone-100 text-stone-700 border-stone-300",
  terbit: "bg-emerald-50 text-emerald-800 border-emerald-300",
  dibatalkan: "bg-red-50 text-red-700 border-red-300",
  digantikan: "bg-amber-50 text-amber-800 border-amber-300",
  belum: "bg-stone-50 text-stone-600 border-stone-300",
  diserahkan: "bg-sky-50 text-sky-800 border-sky-300",
  gagal: "bg-red-50 text-red-700 border-red-300",
  diterima: "bg-emerald-50 text-emerald-800 border-emerald-300",
  tidak_diperlukan: "bg-stone-50 text-stone-500 border-stone-200",
  menunggu: "bg-amber-50 text-amber-800 border-amber-300",
  berjalan: "bg-sky-50 text-sky-800 border-sky-300",
  selesai: "bg-emerald-50 text-emerald-800 border-emerald-300",
};

function Lencana({ nilai, label, judul }: { nilai: string; label: string; judul: string }) {
  return (
    <span title={judul} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", WARNA[nilai] ?? WARNA.belum)}>
      {label}
    </span>
  );
}

/** Tiga status terpisah: dokumen, distribusi, pekerjaan. */
export function TigaStatus({ s }: { s: Pick<RingkasSurat, "statusDokumen" | "statusDistribusi" | "statusPekerjaan" | "terlambat"> }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Lencana nilai={s.statusDokumen} label={LABEL_STATUS_DOKUMEN[s.statusDokumen]} judul="Status dokumen" />
      {s.statusDokumen !== "draft" && <Lencana nilai={s.statusDistribusi} label={LABEL_STATUS_DISTRIBUSI[s.statusDistribusi]} judul="Status distribusi" />}
      {s.statusDokumen !== "draft" && s.statusPekerjaan !== "tidak_diperlukan" && (
        <Lencana nilai={s.statusPekerjaan} label={`Pekerjaan: ${LABEL_STATUS_PEKERJAAN[s.statusPekerjaan]}`} judul="Status pekerjaan" />
      )}
      {s.terlambat > 0 && <Lencana nilai="gagal" label={`${s.terlambat} terlambat`} judul="Tindak lanjut melewati tenggat" />}
    </span>
  );
}

export function LencanaTindak({ status, terlambat }: { status: string; terlambat?: boolean }) {
  return (
    <span className="inline-flex gap-1">
      <Lencana nilai={status} label={LABEL_STATUS_PEKERJAAN[status as StatusPekerjaan] ?? status} judul="Status tindak lanjut" />
      {terlambat && <Lencana nilai="gagal" label="Terlambat" judul="Melewati tenggat" />}
    </span>
  );
}

/** Pratinjau HTML dari blok yang sama dengan PDF (PDF tetap acuan resmi). */
export function PratinjauBloks({ bloks, draft }: { bloks: Blok[]; draft?: boolean }) {
  return (
    <div className="relative bg-white border rounded-lg p-3 sm:p-8 font-serif text-[13px] leading-relaxed text-stone-900 overflow-hidden [overflow-wrap:anywhere]">
      {draft && <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-bold text-stone-900/5 -rotate-12">DRAF</div>}
      <div className="text-center border-b-2 border-stone-800 pb-2 mb-4">
        <p className="font-bold">RUKUN WARGA 03 KELURAHAN PADASUKA</p>
        <p className="text-xs">Kecamatan Cimahi Tengah · Kota Cimahi</p>
      </div>
      {bloks.map((b, i) => <BlokHtml key={i} b={b} />)}
    </div>
  );
}

function BlokHtml({ b }: { b: Blok }) {
  switch (b.t) {
    case "judul":
      return <div className="text-center my-3"><p className="font-bold underline">{b.teks}</p>{b.sub?.map((s, i) => <p key={i} className="text-xs">{s}</p>)}</div>;
    case "kepala":
      return (
        <div className="mb-3">
          {b.tempatTanggal && <p className="text-right">{b.tempatTanggal}</p>}
          <table className="text-left"><tbody>{b.baris.map(([k, v], i) => <tr key={i}><td className="pr-2 align-top">{k}</td><td className="pr-1 align-top">:</td><td>{v}</td></tr>)}</tbody></table>
        </div>
      );
    case "alamat":
      return <div className="mb-3">{b.baris.map((s, i) => <p key={i}>{s}</p>)}</div>;
    case "sub":
      return <p className="font-bold mt-3 mb-1">{b.teks}</p>;
    case "paragraf":
      return <p className="mb-2 text-justify whitespace-pre-line">{b.teks}</p>;
    case "label":
      return <table className="mb-2"><tbody>{b.baris.map(([k, v], i) => <tr key={i}><td className="pr-2 align-top whitespace-nowrap">{k}</td><td className="pr-1 align-top">:</td><td className="whitespace-pre-line">{v}</td></tr>)}</tbody></table>;
    case "daftar":
      return b.bernomor ? <ol className="list-decimal pl-6 mb-2">{b.item.map((s, i) => <li key={i}>{s}</li>)}</ol> : <ul className="list-disc pl-6 mb-2">{b.item.map((s, i) => <li key={i}>{s}</li>)}</ul>;
    case "tabel":
      return (
        <div className="overflow-x-auto mb-2">
          <table className="w-full min-w-[28rem] border-collapse text-xs [overflow-wrap:normal] sm:min-w-0">
            <thead><tr>{b.kolom.map((k, i) => <th key={i} className="border border-stone-500 px-1 py-0.5 bg-stone-100">{k}</th>)}</tr></thead>
            <tbody>
              {b.baris.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="border border-stone-400 px-1 py-0.5 align-top">{c || "\u00a0"}</td>)}</tr>)}
              {b.total && <tr className="font-bold">{b.total.map((c, j) => <td key={j} className="border border-stone-500 px-1 py-0.5">{c}</td>)}</tr>}
            </tbody>
          </table>
        </div>
      );
    case "ttd":
      return (
        <div className="mt-4">
          {b.tempatTanggal && <p className="text-right mb-1">{b.tempatTanggal}</p>}
          <div className="grid gap-2 sm:gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(b.kolom.length, 3)}, minmax(0, 1fr))` }}>
            {b.kolom.map((k, i) => (
              <div key={i} className="text-center">
                <p>{k.atas}</p>
                <div className="h-14" aria-label="ruang tanda tangan basah" />
                <p className="font-bold underline">{k.nama}</p>
                {k.jabatan && <p>{k.jabatan}</p>}
              </div>
            ))}
          </div>
        </div>
      );
    case "tembusan":
      return <div className="mt-3 text-xs"><p className="underline">Tembusan:</p><ol className="list-decimal pl-5">{b.item.map((s, i) => <li key={i}>{s}</li>)}</ol></div>;
    case "catatan":
      return <p className="mt-2 text-xs italic">{b.teks}</p>;
  }
}

export function tanggalId(v: string | null | undefined, jam = false) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return jam ? d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : d.toLocaleDateString("id-ID", { dateStyle: "medium" });
}
