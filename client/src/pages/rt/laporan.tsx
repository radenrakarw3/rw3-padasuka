import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText } from "lucide-react";
import { unduh, useKirimSekali, wil } from "@/lib/wilayah-api";
import { IsianTeks, Judul, Memuat, Pesan, PilihTombol, TombolBesar, HIJAU } from "@/components/wilayah/ui";
import { BAGIAN_KONFIRMASI, NAMA_BULAN, awalBulan, akhirBulan } from "@shared/wilayah";
import { BAGIAN_INDIKATOR } from "@shared/indikator-kecamatan";
import { eksporPdfLaporan } from "@/lib/laporan-pdf";

export interface HasilSel { id: string; no: number; bagian: string; kode: string; label: string; satuan: string; nilai: number | null; status: string; catatan: string }
interface Pratinjau {
  rt: number | null; tahun: number; bulan: number; acuan: string; hasil: HasilSel[]; ringkas: Record<string, number>;
  konfirmasi: { rt: number | null; bagian: string }[];
  final: { versi: number; dibuat: string; oleh: string; berbeda: number } | null;
  peringatanHistoris: string | null;
}

export const LABEL_STATUS: Record<string, string> = {
  lengkap: "Lengkap", sebagian: "Sebagian", belum_diketahui: "Belum diketahui", menunggu_rw: "Menunggu data tingkat RW", needs_confirmation: "Menunggu definisi kecamatan",
};

const LANGKAH = ["pilih", "tarik", "lengkapi", "periksa", "final"] as const;
const JUDUL: Record<string, string> = { pilih: "Pilih bulan", tarik: "Tarik data", lengkapi: "Lengkapi", periksa: "Periksa", final: "Finalkan & unduh" };

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

function KehadiranRw({ tahun, bulan }: { tahun: number; bulan: number }) {
  const qc = useQueryClient();
  const key = ["/api/wilayah/kegiatan", tahun, bulan];
  const { data } = useQuery<{ id: number; judul: string; tanggal: string; pengelola: string; peserta: { jumlahHadir: number }[] }[]>({
    queryKey: key, queryFn: () => wil(`/api/wilayah/kegiatan?dari=${awalBulan(tahun, bulan)}&sampai=${akhirBulan(tahun, bulan)}`),
  });
  const [isi, setIsi] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const rw = (data ?? []).filter((g) => g.pengelola === "rw");
  if (!rw.length) return null;
  return (
    <section className="bg-white rounded-2xl border-2 border-gray-200 p-4">
      <h3 className="text-lg font-bold mb-2">Kehadiran warga RT pada kegiatan RW</h3>
      {err && <Pesan jenis="error">{err}</Pesan>}
      {rw.map((g) => (
        <div key={g.id} className="py-3 border-b last:border-0">
          <p className="text-lg">{g.judul} · {new Date(g.tanggal).toLocaleDateString("id-ID")}</p>
          <div className="flex gap-2 mt-2">
            <input inputMode="numeric" className="flex-1 min-h-[52px] rounded-xl border-2 border-gray-300 px-3 text-lg"
              placeholder={g.peserta[0] ? `Tercatat ${g.peserta[0].jumlahHadir} orang` : "Jumlah hadir"}
              value={isi[g.id] ?? ""} onChange={(e) => setIsi({ ...isi, [g.id]: e.target.value.replace(/\D/g, "") })} />
            <button type="button" className="min-h-[52px] px-4 rounded-xl text-white text-lg font-semibold disabled:opacity-50" style={{ backgroundColor: HIJAU }}
              disabled={!isi[g.id]}
              onClick={async () => {
                setErr(null);
                try {
                  await wil(`/api/wilayah/rt/kegiatan/${g.id}/hadir`, { body: { jumlahHadir: Number(isi[g.id]) } });
                  setIsi({ ...isi, [g.id]: "" });
                  await qc.invalidateQueries({ queryKey: key });
                  await qc.invalidateQueries({ queryKey: ["/api/wilayah/laporan"] });
                } catch (e) { setErr((e as Error).message); }
              }}>Simpan</button>
          </div>
        </div>
      ))}
    </section>
  );
}

export default function Laporan() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const qc = useQueryClient();
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [langkah, setLangkah] = useState<(typeof LANGKAH)[number]>(params.get("langkah") === "lengkapi" ? "lengkapi" : "pilih");
  const [alasan, setAlasan] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const aktifTarik = langkah !== "pilih";
  const key = ["/api/wilayah/laporan", tahun, bulan];
  const { data: p, isLoading, error, refetch, isFetching } = useQuery<Pratinjau>({
    queryKey: key, queryFn: () => wil(`/api/wilayah/laporan?tahun=${tahun}&bulan=${bulan}`), enabled: aktifTarik,
  });
  const final = useKirimSekali(async () => {
    const r = await wil<{ versi: number }>("/api/wilayah/laporan/final", { body: { tahun, bulan, alasanKoreksi: alasan || undefined } });
    await qc.invalidateQueries({ queryKey: key });
    return r;
  });
  const i = LANGKAH.indexOf(langkah);
  const konfirmasiAktif = new Set((p?.konfirmasi ?? []).filter((k) => k.rt != null).map((k) => k.bagian));
  const toggleKonfirmasi = async (bagian: string, aktif: boolean) => {
    setErr(null);
    try {
      await wil("/api/wilayah/konfirmasi", { body: { tahun, bulan, bagian, aktif } });
      await refetch();
    } catch (e) { setErr((e as Error).message); }
  };
  const ekspor = async (format: "xlsx" | "pdf") => {
    setErr(null);
    try {
      const dari = tahun === 2026 ? 9 : 1;
      if (format === "xlsx") await unduh(`/api/wilayah/laporan/ekspor?tahun=${tahun}&dari=${dari}&sampai=12&format=xlsx`, `Laporan-${tahun}.xlsx`, "rt");
      else eksporPdfLaporan(await wil(`/api/wilayah/laporan/ekspor?tahun=${tahun}&dari=${dari}&sampai=12`, { peran: "rt" }));
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/rt")} sub={`${NAMA_BULAN[bulan - 1]} ${tahun}`}>Laporan bulanan</Judul>
      <div className="flex gap-1" aria-hidden>{LANGKAH.map((l, n) => <span key={l} className="h-2 flex-1 rounded-full" style={{ backgroundColor: n <= i ? HIJAU : "#e5e7eb" }} />)}</div>
      <h2 className="text-xl font-bold">{i + 1}. {JUDUL[langkah]}</h2>
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      {err && <Pesan jenis="error">{err}</Pesan>}

      {langkah === "pilih" && (
        <>
          <PilihTombol label="Tahun" belumTahu={false} kolom={3} nilai={String(tahun)} onChange={(v) => v && setTahun(Number(v))}
            pilihan={[now.getFullYear() - 1, now.getFullYear()].map((t) => ({ nilai: String(t), label: String(t) }))} />
          <PilihTombol label="Bulan" belumTahu={false} kolom={3} nilai={String(bulan)} onChange={(v) => v && setBulan(Number(v))}
            pilihan={NAMA_BULAN.map((n, idx) => ({ nilai: String(idx + 1), label: n })).filter((b) => tahun < now.getFullYear() || Number(b.nilai) <= now.getMonth() + 1)} />
          <TombolBesar onClick={() => setLangkah("tarik")}>Lanjut: tarik data</TombolBesar>
        </>
      )}

      {aktifTarik && (isLoading || isFetching) && <Memuat teks="Menghitung dari data terverifikasi…" />}
      {aktifTarik && error && <Pesan jenis="error">{(error as Error).message}</Pesan>}

      {langkah === "tarik" && p && (
        <>
          <Pesan>Data ditarik otomatis dari catatan yang sudah terverifikasi. Kosong berarti belum diketahui, bukan nol.</Pesan>
          {p.peringatanHistoris && <Pesan jenis="peringatan">{p.peringatanHistoris}</Pesan>}
          <div className="grid grid-cols-2 gap-2 text-lg">
            {Object.entries(p.ringkas).map(([s, n]) => (
              <div key={s} className="bg-white rounded-xl border-2 border-gray-200 p-3"><p className="text-2xl font-bold">{n}</p><p className="text-base">{LABEL_STATUS[s]}</p></div>
            ))}
          </div>
          {p.final && <Pesan jenis="info">Sudah final versi {p.final.versi} ({new Date(p.final.dibuat).toLocaleDateString("id-ID")}). {p.final.berbeda ? `${p.final.berbeda} angka berbeda dengan data sekarang.` : "Sama dengan data sekarang."}</Pesan>}
          <div className="grid grid-cols-2 gap-3"><TombolBesar varian="kedua" onClick={() => setLangkah("pilih")}>Kembali</TombolBesar><TombolBesar onClick={() => setLangkah("lengkapi")}>Lanjut</TombolBesar></div>
        </>
      )}

      {langkah === "lengkapi" && p && (
        <>
          <p className="text-lg">Centang bila memang sudah dicatat semua. Dengan begitu, “tidak ada kejadian” terhitung 0, bukan “belum diketahui”.</p>
          {BAGIAN_KONFIRMASI.filter((b) => b.scope === "rt").map((b) => {
            const aktif = konfirmasiAktif.has(b.nilai);
            return (
              <button key={b.nilai} type="button" onClick={() => toggleKonfirmasi(b.nilai, !aktif)} aria-pressed={aktif}
                className={`w-full min-h-[64px] rounded-2xl border-2 px-4 py-3 text-left text-lg flex gap-3 items-center ${aktif ? "bg-green-50 border-green-600" : "bg-white border-gray-300"}`}>
                <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 ${aktif ? "bg-green-600 border-green-600 text-white" : "border-gray-400"}`}>{aktif ? "✓" : ""}</span>
                {b.label}
              </button>
            );
          })}
          <KehadiranRw tahun={tahun} bulan={bulan} />
          <TombolBesar varian="kedua" onClick={() => go("/rt/objek")}>Tambah kegiatan / fasilitas / kelompok</TombolBesar>
          <TombolBesar varian="kedua" onClick={() => go("/rt/masalah/baru")}>Catat kejadian bulan ini</TombolBesar>
          <div className="grid grid-cols-2 gap-3"><TombolBesar varian="kedua" onClick={() => setLangkah("tarik")}>Kembali</TombolBesar><TombolBesar onClick={() => setLangkah("periksa")}>Lanjut</TombolBesar></div>
        </>
      )}

      {langkah === "periksa" && p && (
        <>
          <Pesan>Periksa angka per bagian. Ketuk judul bagian untuk membuka.</Pesan>
          <TabelIndikator hasil={p.hasil} />
          <div className="grid grid-cols-2 gap-3"><TombolBesar varian="kedua" onClick={() => setLangkah("lengkapi")}>Kembali</TombolBesar><TombolBesar onClick={() => setLangkah("final")}>Lanjut</TombolBesar></div>
        </>
      )}

      {langkah === "final" && p && (
        <>
          {p.final ? (
            <>
              <Pesan jenis="info">Laporan bulan ini sudah final (versi {p.final.versi}). Laporan final tidak berubah. Untuk koreksi, tulis alasannya — akan dibuat versi baru.</Pesan>
              <IsianTeks label="Alasan koreksi" nilai={alasan} onChange={setAlasan} />
            </>
          ) : (
            <Pesan>Setelah difinalkan, angka bulan ini dibekukan dan menjadi dasar unduhan.</Pesan>
          )}
          {final.error && <Pesan jenis="error">{final.error}</Pesan>}
          <TombolBesar ikon={<FileText className="w-6 h-6" />} memuat={final.mengirim} disabled={!!p.final && alasan.trim().length < 5}
            onClick={async () => { const r = await final.kirim(); if (r) setInfo(`Laporan final versi ${r.versi} tersimpan.`); }}>
            {p.final ? "Simpan koreksi (versi baru)" : "Finalkan laporan"}
          </TombolBesar>
          <h3 className="text-lg font-bold pt-2">Unduh untuk kecamatan</h3>
          <TombolBesar varian="kedua" ikon={<Download className="w-6 h-6" />} onClick={() => ekspor("pdf")}>Unduh PDF</TombolBesar>
          <TombolBesar varian="kedua" ikon={<Download className="w-6 h-6" />} onClick={() => ekspor("xlsx")}>Unduh Excel (XLSX)</TombolBesar>
          <p className="text-base text-gray-600">Bulan yang belum final ditandai bintang (*). Unduhan hanya berisi angka, tanpa nama atau NIK.</p>
          <TombolBesar varian="kedua" onClick={() => setLangkah("periksa")}>Kembali</TombolBesar>
        </>
      )}
    </div>
  );
}
