import { BAGIAN_INDIKATOR } from "@shared/indikator-kecamatan";

export interface HasilSel { id: string; no: number; bagian: string; kode: string; label: string; satuan: string; nilai: number | null; status: string; catatan: string }

export const LABEL_STATUS: Record<string, string> = {
  lengkap: "Lengkap", sebagian: "Sebagian", belum_diketahui: "Belum diketahui", menunggu_rw: "Menunggu data tingkat RW", needs_confirmation: "Menunggu definisi kecamatan",
};

export function TabelIndikator({ hasil }: { hasil: HasilSel[] }) {
  return (
    <div className="space-y-4">
      {BAGIAN_INDIKATOR.map((b) => (
        <details key={b.kode} className="bg-white rounded-2xl border-2 border-gray-200" open={false}>
          <summary className="min-h-[56px] px-4 flex items-center text-lg font-semibold cursor-pointer">{b.kode}. {b.judul}</summary>
          <ul className="divide-y divide-gray-100">
            {hasil.filter((h) => h.bagian === b.kode).map((h) => (
              <li key={h.id} className="px-4 py-3">
                <div className="flex justify-between gap-3">
                  <span className="text-base">{h.kode} {h.label}</span>
                  <span className="text-lg font-bold shrink-0">{h.nilai ?? "—"}</span>
                </div>
                {h.status !== "lengkap" && <p className={`text-base ${h.status === "sebagian" ? "text-amber-700" : "text-gray-600"}`}>{LABEL_STATUS[h.status]}{h.catatan ? ` · ${h.catatan}` : ""}</p>}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
