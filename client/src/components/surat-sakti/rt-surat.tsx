import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { bukaBerkas, unduh, useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, IsianPanjang, IsianTeks, Langkah, Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import { KATALOG, LABEL_TUJUAN, PETA_JENIS, jenisDariLabelLama, type TujuanUtama } from "@shared/surat-sakti";
import { RT, TigaStatus, bacaFile, tanggalId, type RingkasSurat } from "./dasar";
import { DaftarRangkaian, DaftarTindak, DetailRangkaianView } from "./rangkaian";

const TUJUAN_RT: TujuanUtama[] = ["masalah", "dukungan", "keputusan", "tugaskan", "pantau"];

/** Permintaan dokumen ke Ketua RW. RT tidak menerbitkan atas nama RW. */
export function FormPermintaanSurat({ kejadianId, selesai, batal }: { kejadianId: number | null; selesai: () => void; batal: () => void }) {
  const { nilai: d, setNilai, hapus } = useDraft("permintaan-surat-v2", { i: 1, tujuan: "", kode: "", perihal: "", uraian: "", sumber: "", bukti: "", buktiNama: "" });
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const [galat, setGalat] = useState<string | null>(null);
  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    const r = await wil<{ id: number }>("/api/wilayah/rt/permintaan-surat", {
      ...RT, body: { kodeJenis: d.kode && d.kode !== "belum" ? d.kode : undefined, perihal: d.perihal, uraian: d.uraian, kejadianId, idempotencyKey: kunci },
    });
    if (d.bukti || d.sumber) {
      await wil("/api/wilayah/surat-fakta", { ...RT, body: { permintaanId: r.id, isi: d.uraian, sumber: d.sumber || null, bukti: d.bukti || null, buktiNama: d.buktiNama || null } });
    }
    hapus();
    return true;
  });
  const jenis = KATALOG.filter((j) => j.tujuan === d.tujuan);
  if (d.i === 1) {
    return (
      <Langkah langkah={1} total={3} judul="Apa yang dibutuhkan dari RW?" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={!!d.tujuan && !!d.kode}>
        {kejadianId && <Pesan>Terkait masalah #{kejadianId}.</Pesan>}
        <PilihTombol label="Tujuan" belumTahu={false} kolom={1} nilai={d.tujuan || null} onChange={(v) => set({ tujuan: v ?? "", kode: "" })}
          pilihan={TUJUAN_RT.map((t) => ({ nilai: t, label: LABEL_TUJUAN[t].judul }))} />
        {d.tujuan && (
          <PilihTombol label="Jenis dokumen" belumTahu={false} kolom={1} nilai={d.kode || null} onChange={(v) => set({ kode: v ?? "" })}
            pilihan={[...jenis.map((j) => ({ nilai: j.kode, label: j.label })), { nilai: "belum", label: "Belum tahu — biar Ketua RW yang memilih" }]} />
        )}
        {d.kode && d.kode !== "belum" && <p className="text-base text-gray-600">{PETA_JENIS[d.kode]?.ringkas}</p>}
      </Langkah>
    );
  }
  if (d.i === 2) {
    return (
      <Langkah langkah={2} total={3} judul="Fakta dan keperluan" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })} bisaLanjut={d.perihal.trim().length >= 3 && d.uraian.trim().length >= 10}>
        <IsianTeks label="Perihal singkat" nilai={d.perihal} onChange={(v) => set({ perihal: v })} />
        <IsianPanjang label="Apa yang terjadi / dibutuhkan? (tulis fakta, bukan tuduhan)" nilai={d.uraian} onChange={(v) => set({ uraian: v })} />
        <IsianTeks label="Sumber fakta (tidak dicetak)" nilai={d.sumber} onChange={(v) => set({ sumber: v })} bantuan="Mis. pengamatan langsung, laporan warga, foto tanggal sekian." />
        <label className="block text-lg">
          Foto/dokumen pendukung (opsional)
          <input type="file" className="block mt-1 text-base" accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) bacaFile(f).then((b) => { setGalat(null); set({ bukti: b, buktiNama: f.name }); }).catch((x) => setGalat(x.message)); }} />
        </label>
        {d.buktiNama && <p className="text-base text-gray-600">Terpilih: {d.buktiNama}</p>}
        {galat && <Pesan jenis="error">{galat}</Pesan>}
      </Langkah>
    );
  }
  return (
    <Langkah langkah={3} total={3} judul="Periksa sebelum mengirim" onKembali={() => set({ i: 2 })} labelLanjut="Kirim ke Ketua RW" memuat={mengirim} onLanjut={async () => { if (await kirim()) selesai(); }}>
      <BarisRingkas label="Jenis" nilai={d.kode === "belum" ? "Dipilih Ketua RW" : PETA_JENIS[d.kode]?.label} />
      <BarisRingkas label="Perihal" nilai={d.perihal} />
      <BarisRingkas label="Uraian" nilai={d.uraian} />
      <BarisRingkas label="Bukti" nilai={d.buktiNama || null} />
      <p className="text-base text-gray-600 mt-2">Ketua RW akan memeriksa, menyusun, dan menerbitkan dokumennya. Anda dapat menambah fakta setelah terkirim.</p>
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

function TambahFakta({ permintaanId, selesai }: { permintaanId: number; selesai: () => void }) {
  const [isi, setIsi] = useState("");
  const [bukti, setBukti] = useState<{ data: string; nama: string } | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  return (
    <div className="mt-2 space-y-2 rounded-xl border-2 border-gray-200 p-3">
      <IsianPanjang label="Fakta tambahan" nilai={isi} onChange={setIsi} />
      <input type="file" className="block text-base" accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) bacaFile(f).then((b) => setBukti({ data: b, nama: f.name })).catch((x) => setGalat(x.message)); }} />
      {galat && <Pesan jenis="error">{galat}</Pesan>}
      <TombolBesar memuat={sibuk} onClick={async () => {
        if (isi.trim().length < 5) return setGalat("Tulis minimal 5 huruf.");
        setSibuk(true);
        try {
          await wil("/api/wilayah/surat-fakta", { ...RT, body: { permintaanId, isi, bukti: bukti?.data ?? null, buktiNama: bukti?.nama ?? null } });
          selesai();
        } catch (e) { setGalat((e as Error).message); } finally { setSibuk(false); }
      }}>Kirim fakta</TombolBesar>
    </div>
  );
}

/** Tab "Surat" di halaman RT. */
export function SuratRt({ kejadianAwal }: { kejadianAwal: number | null }) {
  const qc = useQueryClient();
  const [bagian, setBagian] = useState<"permintaan" | "dokumen" | "tugas" | "rangkaian">("permintaan");
  const [form, setForm] = useState(!!kejadianAwal);
  const [info, setInfo] = useState<string | null>(null);
  const [fakta, setFakta] = useState<number | null>(null);
  const [rangkaian, setRangkaian] = useState<number | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const permintaan = useQuery<any[]>({ queryKey: ["/api/wilayah/permintaan-surat", "rt"], queryFn: () => wil("/api/wilayah/permintaan-surat", RT), enabled: bagian === "permintaan" });
  const dokumen = useQuery<RingkasSurat[]>({ queryKey: ["/api/wilayah/surat", "rt"], queryFn: () => wil("/api/wilayah/surat", RT), enabled: bagian === "dokumen" });

  if (form) {
    return <FormPermintaanSurat kejadianId={kejadianAwal} batal={() => setForm(false)} selesai={async () => {
      setForm(false);
      setInfo("Permintaan terkirim ke Ketua RW.");
      await qc.invalidateQueries({ queryKey: ["/api/wilayah/permintaan-surat"] });
    }} />;
  }
  if (rangkaian) {
    return <DetailRangkaianView id={rangkaian} peran="rt" tutup={() => setRangkaian(null)} bukaSurat={() => setBagian("dokumen")} />;
  }
  return (
    <div className="space-y-3">
      <PilihTombol label="Bagian" belumTahu={false} kolom={2} nilai={bagian} onChange={(v) => { if (v) { setBagian(v as typeof bagian); setInfo(null); } }}
        pilihan={[{ nilai: "permintaan", label: "Permintaan saya" }, { nilai: "dokumen", label: "Dokumen untuk RT" }, { nilai: "tugas", label: "Tugas saya" }, { nilai: "rangkaian", label: "Kasus/program" }]} />
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      {galat && <Pesan jenis="error">{galat}</Pesan>}

      {bagian === "permintaan" && (
        <>
          <TombolBesar ikon={<Plus className="w-6 h-6" />} onClick={() => setForm(true)}>Minta dokumen ke Ketua RW</TombolBesar>
          {permintaan.isLoading && <Memuat />}
          {permintaan.data?.length === 0 && <Pesan>Belum ada permintaan.</Pesan>}
          <ul className="space-y-2">
            {permintaan.data?.map((p) => (
              <li key={p.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <p className="text-lg font-semibold">{p.perihal}</p>
                <p className="text-base text-gray-600">
                  {(PETA_JENIS[p.kode_jenis ?? ""] ?? jenisDariLabelLama(p.jenis_surat))?.label ?? p.jenis_surat} · {p.status === "baru" ? "menunggu RW" : p.status === "diproses" ? "sedang disusun RW" : p.status}
                  {p.nomor_surat ? ` · ${p.nomor_surat}` : ""}{p.jawaban ? ` · ${p.jawaban}` : ""}{p.jumlah_fakta ? ` · ${p.jumlah_fakta} fakta tambahan` : ""}
                </p>
                {(p.status === "baru" || p.status === "diproses") && (
                  fakta === p.id
                    ? <TambahFakta permintaanId={p.id} selesai={async () => { setFakta(null); setInfo("Fakta terkirim."); await qc.invalidateQueries({ queryKey: ["/api/wilayah/permintaan-surat"] }); }} />
                    : <div className="mt-2"><TombolBesar varian="kedua" onClick={() => setFakta(p.id)}>Tambah fakta/bukti</TombolBesar></div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

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

      {bagian === "rangkaian" && <DaftarRangkaian peran="rt" buka={setRangkaian} />}
    </div>
  );
}
