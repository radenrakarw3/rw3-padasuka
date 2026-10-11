import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bukaBerkas, unduh, wil } from "@/lib/wilayah-api";
import { Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import { PETA_JENIS } from "@shared/surat-sakti";
import { RT, TigaStatus, tanggalId, type RingkasSurat } from "./dasar";
import { DaftarTindak } from "./tindak";

/** Tab "Surat" di halaman RT: baca dokumen RW yang relevan dan laporkan tugas. RT tidak menerbitkan atas nama RW. */
export function SuratRt() {
  const [bagian, setBagian] = useState<"dokumen" | "tugas">("dokumen");
  const [galat, setGalat] = useState<string | null>(null);
  const dokumen = useQuery<RingkasSurat[]>({ queryKey: ["/api/wilayah/surat", "rt"], queryFn: () => wil("/api/wilayah/surat", RT), enabled: bagian === "dokumen" });

  return (
    <div className="space-y-3">
      <PilihTombol label="Bagian" belumTahu={false} kolom={2} nilai={bagian} onChange={(v) => { if (v) setBagian(v as typeof bagian); }}
        pilihan={[{ nilai: "dokumen", label: "Dokumen untuk RT" }, { nilai: "tugas", label: "Tugas saya" }]} />
      {galat && <Pesan jenis="error">{galat}</Pesan>}

      {bagian === "dokumen" && (
        <>
          <Pesan>Dokumen terbit dari Ketua RW yang berkaitan dengan RT Anda.</Pesan>
          {dokumen.isLoading && <Memuat />}
          {dokumen.error && <Pesan jenis="error">{(dokumen.error as Error).message}</Pesan>}
          {dokumen.data?.length === 0 && <Pesan>Belum ada dokumen.</Pesan>}
          <ul className="space-y-2">
            {dokumen.data?.map((s) => (
              <li key={s.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-2">
                <p className="text-lg font-semibold">{s.perihal}</p>
                <p className="text-base text-gray-600">{s.nomorSurat} · {PETA_JENIS[s.kodeJenis ?? ""]?.label ?? s.jenisSurat} · {tanggalId(s.tanggalSurat)}</p>
                <TigaStatus s={s} />
                <div className="grid grid-cols-2 gap-2">
                  <TombolBesar varian="kedua" onClick={() => bukaBerkas(`/api/wilayah/surat/${s.id}/pdf`, "rt").catch((e) => setGalat(e.message))}>Lihat PDF</TombolBesar>
                  <TombolBesar varian="kedua" onClick={() => unduh(`/api/wilayah/surat/${s.id}/pdf`, `${s.nomorSurat ?? s.id}.pdf`, "rt").catch((e) => setGalat(e.message))}>Unduh</TombolBesar>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {bagian === "tugas" && (
        <>
          <Pesan>Tugas dari dokumen RW yang penanggung jawabnya RT Anda. Laporkan progres dengan bukti.</Pesan>
          <DaftarTindak peran="rt" />
        </>
      )}
    </div>
  );
}
