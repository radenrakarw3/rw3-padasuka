import { Fragment, lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FileText, Printer, Table2 } from "lucide-react";
import { aturRtKelola, wil } from "@/lib/wilayah-api";
import { HIJAU, Judul, Memuat, Pesan, TombolBesar, rt2 } from "@/components/wilayah/ui";
import { AlirF4, AreaCetak, GayaCetakF4, KopHemat, KotakCentang, PanduanPrinter } from "@/components/cetak/lembar-f4";
import { RtKelolaContext } from "@/pages/admin/kelola-warga/konteks";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { IDENTITAS_RW } from "@shared/surat-sakti/identitas";
import { KATEGORI_REKAP, KELOMPOK_REKAP, type BarisRekap, type DaftarRekap, type RingkasanRekap } from "@shared/rekap-kategori";

const Cetak = lazy(() => import("@/pages/admin/kelola-warga/cetak"));

type Tab = "kondisi" | "daftar" | "bahan";
const TAB: { id: Tab; label: string; Ikon: typeof Table2 }[] = [
  { id: "kondisi", label: "Kondisi wilayah", Ikon: Table2 },
  { id: "daftar", label: "Daftar verifikasi", Ikon: ClipboardCheck },
  { id: "bahan", label: "Bahan pendataan", Ikon: FileText },
];

const tanggalPanjang = (iso?: string) =>
  (iso ? new Date(iso) : new Date()).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

/** Parameter halaman disimpan di URL agar bisa dibagikan / dibuka dari dialog Dashboard. */
function useParam() {
  const [lokasi, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const ubah = (p: Record<string, string | null>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(p)) {
      if (v == null || v === "") q.delete(k);
      else q.set(k, v);
    }
    go(`${lokasi}${q.toString() ? `?${q}` : ""}`, { replace: true });
  };
  return { params, ubah };
}

function PilihRt({ rt, semua, onChange }: { rt: number | null; semua: boolean; onChange: (rt: number | null) => void }) {
  const pilihan: (number | null)[] = [...(semua ? [null] : []), ...ACTIVE_RT_NUMBERS];
  return (
    <div className={`grid gap-1 rounded-xl border bg-white p-1 ${semua ? "grid-cols-5" : "grid-cols-4"}`} role="group" aria-label="Pilih RT">
      {pilihan.map((n) => {
        const on = rt === n;
        return (
          <button key={n ?? "semua"} type="button" onClick={() => onChange(n)} aria-pressed={on}
            className={`h-8 min-w-0 rounded-lg px-2 text-xs font-bold ${on ? "text-white" : "text-gray-700 hover:bg-gray-100"}`}
            style={on ? { backgroundColor: HIJAU } : undefined}>
            {n == null ? "Semua" : rt2(n)}
          </button>
        );
      })}
    </div>
  );
}

const sel = { border: "1px solid #000", padding: "1mm 1.3mm", verticalAlign: "top" } as const;
const selKepala = { ...sel, fontWeight: 700, background: "#f2f2f2" } as const;

// ---------------------------------------------------------------------------
// Kondisi wilayah: matriks kategori × RT
// ---------------------------------------------------------------------------

function KondisiWilayah({ buka }: { buka: (kategori: string, rt: number | null) => void }) {
  const { data, isLoading, error } = useQuery<RingkasanRekap>({
    queryKey: ["/api/rekap-warga/ringkasan"],
    queryFn: () => wil("/api/rekap-warga/ringkasan"),
  });
  if (isLoading) return <Memuat />;
  if (error) return <Pesan jenis="error">{(error as Error).message}</Pesan>;
  if (!data) return null;
  const rtList = data.rt;
  const grup = KELOMPOK_REKAP.map((k) => ({ kelompok: k, daftar: data.kategori.filter((x) => x.kelompok === k) })).filter((g) => g.daftar.length);

  return (
    <div className="space-y-4">
      <Pesan>Angka dihitung dari data hari ini: jawaban Standar data didahulukan, data lama dipakai bila belum ada jawaban. Klik angka untuk melihat dan mencetak daftar namanya.</Pesan>
      <div className="overflow-x-auto rounded-xl border bg-white print:hidden">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left">Kategori</th>
              {rtList.map((rt) => <th key={rt} className="px-2 py-2 text-right">{rt2(rt)}</th>)}
              <th className="px-3 py-2 text-right">RW 03</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t bg-emerald-50/50 text-xs text-gray-700">
              <td className="px-3 py-1.5">Warga aktif · KK</td>
              {rtList.map((rt) => <td key={rt} className="px-2 py-1.5 text-right">{data.totalWarga.perRt[rt]} · {data.totalKk.perRt[rt]}</td>)}
              <td className="px-3 py-1.5 text-right font-semibold">{data.totalWarga.total} · {data.totalKk.total}</td>
            </tr>
            {grup.map((g) => (
              <Fragment key={g.kelompok}>
                <tr className="border-t bg-gray-50"><td colSpan={rtList.length + 2} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600">{g.kelompok}</td></tr>
                {g.daftar.map((k) => (
                  <tr key={k.id} className="border-t">
                    <td className="px-3 py-1.5">{k.judul} <span className="text-xs text-gray-500">({k.satuan})</span></td>
                    {rtList.map((rt) => (
                      <td key={rt} className="px-1 py-0.5 text-right">
                        <button type="button" onClick={() => buka(k.id, rt)} disabled={!k.perRt[rt]}
                          className={`min-w-[2.5rem] rounded-md px-2 py-1 tabular-nums ${k.perRt[rt] ? "font-semibold hover:bg-emerald-50" : "text-gray-300"}`}>
                          {k.perRt[rt]}
                        </button>
                      </td>
                    ))}
                    <td className="px-1 py-0.5 text-right">
                      <button type="button" onClick={() => buka(k.id, null)} disabled={!k.total}
                        className={`min-w-[2.5rem] rounded-md px-2 py-1 tabular-nums ${k.total ? "font-bold hover:bg-emerald-50" : "text-gray-300"}`} style={k.total ? { color: HIJAU } : undefined}>
                        {k.total}
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <PanduanPrinter />
      <TombolBesar ikon={<Printer className="h-5 w-5" />} onClick={() => window.print()}>Cetak rekap kondisi wilayah</TombolBesar>
      <GayaCetakF4 />
      <AreaCetak>
        <AlirF4>
          <KopHemat kecil />
          <p style={{ fontSize: "13pt", fontWeight: 700, marginTop: "2mm" }}>REKAP KONDISI WILAYAH RW 03</p>
          <p style={{ fontSize: "9pt" }}>Data per {tanggalPanjang(data.dibuat)} · umur dihitung per tanggal cetak · lansia = 60 tahun ke atas</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8.5pt", marginTop: "2mm" }}>
            <thead style={{ display: "table-header-group" }}>
              <tr>
                <td style={selKepala}>Kategori</td>
                {rtList.map((rt) => <td key={rt} style={{ ...selKepala, width: "16mm", textAlign: "right" }}>{rt2(rt)}</td>)}
                <td style={{ ...selKepala, width: "18mm", textAlign: "right" }}>RW 03</td>
              </tr>
            </thead>
            <tbody>
              <tr className="jaga">
                <td style={sel}>Warga aktif (orang)</td>
                {rtList.map((rt) => <td key={rt} style={{ ...sel, textAlign: "right" }}>{data.totalWarga.perRt[rt]}</td>)}
                <td style={{ ...sel, textAlign: "right", fontWeight: 700 }}>{data.totalWarga.total}</td>
              </tr>
              <tr className="jaga">
                <td style={sel}>Kartu keluarga (KK)</td>
                {rtList.map((rt) => <td key={rt} style={{ ...sel, textAlign: "right" }}>{data.totalKk.perRt[rt]}</td>)}
                <td style={{ ...sel, textAlign: "right", fontWeight: 700 }}>{data.totalKk.total}</td>
              </tr>
              {grup.map((g) => (
                <Fragment key={g.kelompok}>
                  <tr className="jaga"><td colSpan={rtList.length + 2} style={{ ...sel, fontWeight: 700, background: "#f2f2f2" }}>{g.kelompok}</td></tr>
                  {g.daftar.map((k) => (
                    <tr key={k.id} className="jaga">
                      <td style={sel}>{k.judul} ({k.satuan})</td>
                      {rtList.map((rt) => <td key={rt} style={{ ...sel, textAlign: "right" }}>{k.perRt[rt]}</td>)}
                      <td style={{ ...sel, textAlign: "right", fontWeight: 700 }}>{k.total}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: "8pt", marginTop: "2mm" }}>Sumber: Sistem Informasi Warga RW 03 ({IDENTITAS_RW.situs}). Jawaban Standar data didahulukan; data lama dipakai bila belum ada jawaban. Daftar nama tiap angka dapat dicetak dari menu Rekap & cetak › Daftar verifikasi.</p>
        </AlirF4>
      </AreaCetak>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daftar verifikasi per kategori
// ---------------------------------------------------------------------------

function LembarDaftar({ data, rt, baris }: { data: DaftarRekap; rt: number; baris: BarisRekap[] }) {
  const k = data.kategori;
  const kk = k.satuan === "KK";
  return (
    <AlirF4>
      <KopHemat kecil />
      <p style={{ fontSize: "12.5pt", fontWeight: 700, marginTop: "2mm" }}>REKAP WARGA: {k.judul.toUpperCase()} · {rt2(rt)} / RW 03</p>
      <p style={{ fontSize: "8.5pt" }}>
        Data per {tanggalPanjang(data.dibuat)} · umur dihitung per tanggal cetak · {baris.length} {k.satuan}
      </p>
      <p style={{ fontSize: "8pt", marginTop: "1mm" }}><b>Definisi:</b> {k.definisi}</p>
      <p style={{ fontSize: "8pt" }}>
        <b>Petunjuk untuk Ketua RT:</b> centang <i>Sesuai</i> bila data benar; centang <i>Tidak</i> dan tulis perbaikannya bila salah
        (mis. sudah bekerja, pindah, meninggal, salah nama). Warga yang seharusnya masuk tetapi belum tercantum, tulis di baris kosong.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt", marginTop: "1.5mm" }}>
        <thead style={{ display: "table-header-group" }}>
          <tr>
            <td style={{ ...selKepala, width: "6mm" }}>No</td>
            <td style={selKepala}>{kk ? "Kepala keluarga" : "Nama"}</td>
            <td style={{ ...selKepala, width: "27mm" }}>NIK{kk ? " kepala" : ""}</td>
            {!kk && <td style={{ ...selKepala, width: "7mm" }}>L/P</td>}
            {!kk && <td style={{ ...selKepala, width: "9mm" }}>Umur</td>}
            <td style={selKepala}>Alamat</td>
            {kk && <td style={{ ...selKepala, width: "10mm" }}>Jiwa</td>}
            <td style={selKepala}>{k.labelNilai}</td>
            <td style={{ ...selKepala, width: "10mm", textAlign: "center" }}>Sesuai</td>
            <td style={{ ...selKepala, width: "9mm", textAlign: "center" }}>Tidak</td>
            <td style={{ ...selKepala, width: "34mm" }}>Keterangan perbaikan</td>
          </tr>
        </thead>
        <tbody>
          {baris.map((b, i) => (
            <tr key={`${b.kkId}-${b.id}`} className="jaga">
              <td style={sel}>{i + 1}</td>
              <td style={sel}>{b.nama}{!kk && b.kedudukan ? <span style={{ display: "block", fontSize: "7pt" }}>{b.kedudukan}</span> : null}</td>
              <td style={{ ...sel, fontFamily: "monospace", fontSize: "7.5pt" }}>{b.nikSamar ?? "—"}</td>
              {!kk && <td style={sel}>{b.jenisKelamin === "Laki-laki" ? "L" : b.jenisKelamin === "Perempuan" ? "P" : "—"}</td>}
              {!kk && <td style={sel}>{b.umur ?? "?"}</td>}
              <td style={sel}>{b.alamat ?? "—"}</td>
              {kk && <td style={sel}>{b.anggota}</td>}
              <td style={sel}>{b.nilai}</td>
              <td style={{ ...sel, textAlign: "center" }}><KotakCentang teks="" /></td>
              <td style={{ ...sel, textAlign: "center" }}><KotakCentang teks="" /></td>
              <td style={sel} />
            </tr>
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <tr key={`kosong-${i}`} className="jaga" style={{ height: "7mm" }}>
              <td style={sel}>{baris.length + i + 1}</td>
              {Array.from({ length: kk ? 8 : 9 }).map((__, j) => <td key={j} style={sel} />)}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="jaga" style={{ display: "flex", justifyContent: "space-between", marginTop: "6mm", fontSize: "9pt" }}>
        <div style={{ width: "45%", textAlign: "center" }}>
          <p>Diverifikasi oleh,</p>
          <p>Ketua {rt2(rt)}</p>
          <div style={{ height: "16mm" }} />
          <p>( .................................................. )</p>
          <p style={{ fontSize: "8pt" }}>Tanggal: ........................</p>
        </div>
        <div style={{ width: "45%", textAlign: "center" }}>
          <p>Mengetahui,</p>
          <p>Ketua RW 03</p>
          <div style={{ height: "16mm" }} />
          <p style={{ fontWeight: 700, textDecoration: "underline" }}>{IDENTITAS_RW.ketua.nama}</p>
        </div>
      </div>
    </AlirF4>
  );
}

function DaftarVerifikasi({ kategori, rt, nilai, ubah }: { kategori: string; rt: number | null; nilai: string | null; ubah: (p: Record<string, string | null>) => void }) {
  const { data, isLoading, error } = useQuery<DaftarRekap>({
    queryKey: ["/api/rekap-warga/daftar", kategori, rt],
    queryFn: () => wil(`/api/rekap-warga/daftar?kategori=${encodeURIComponent(kategori)}${rt ? `&rt=${rt}` : ""}`),
    enabled: !!kategori,
  });
  const pilihanNilai = useMemo(() => {
    const hitung = new Map<string, number>();
    for (const b of data?.baris ?? []) hitung.set(b.nilai, (hitung.get(b.nilai) ?? 0) + 1);
    return Array.from(hitung.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const baris = useMemo(() => (data?.baris ?? []).filter((b) => !nilai || b.nilai === nilai), [data, nilai]);
  const perRt = ACTIVE_RT_NUMBERS.map((r) => ({ rt: r, baris: baris.filter((b) => b.rt === r) })).filter((x) => x.baris.length);
  const kk = data?.kategori.satuan === "KK";

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="block text-sm font-semibold">Kategori</span>
        <select value={kategori} onChange={(e) => ubah({ kategori: e.target.value, nilai: null })}
          className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-[hsl(163,55%,22%)] focus:outline-none">
          <option value="">— Pilih kategori —</option>
          {KELOMPOK_REKAP.map((g) => (
            <optgroup key={g} label={g}>
              {KATEGORI_REKAP.filter((k) => k.kelompok === g).map((k) => <option key={k.id} value={k.id}>{k.judul}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      {!kategori && <Pesan>Pilih kategori, misalnya Pengangguran, lalu cetak daftarnya untuk diperiksa Ketua RT.</Pesan>}
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data && (
        <>
          <p className="text-sm text-gray-600">{data.kategori.definisi}</p>
          {pilihanNilai.length > 1 && (
            <label className="block space-y-1">
              <span className="block text-sm font-semibold">Saring {data.kategori.labelNilai.toLowerCase()}</span>
              <select value={nilai ?? ""} onChange={(e) => ubah({ nilai: e.target.value || null })}
                className="h-10 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm focus:border-[hsl(163,55%,22%)] focus:outline-none">
                <option value="">Semua ({data.baris.length})</option>
                {pilihanNilai.map(([v, n]) => <option key={v} value={v}>{v} ({n})</option>)}
              </select>
            </label>
          )}
          <p className="text-sm font-semibold">{baris.length} {data.kategori.satuan} {rt ? `di ${rt2(rt)}` : "di RW 03"}</p>
          {baris.length === 0 ? <Pesan jenis="sukses">Tidak ada data untuk kategori ini.</Pesan> : (
            <>
              <div className="overflow-x-auto rounded-xl border bg-white print:hidden">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-600">
                    <tr>
                      <th className="px-2 py-2 text-left">RT</th>
                      <th className="px-2 py-2 text-left">{kk ? "Kepala keluarga" : "Nama"}</th>
                      {!kk && <th className="px-2 py-2 text-right">Umur</th>}
                      <th className="px-2 py-2 text-left">Alamat</th>
                      <th className="px-2 py-2 text-left">{data.kategori.labelNilai}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baris.slice(0, 300).map((b) => (
                      <tr key={`${b.kkId}-${b.id}`} className="border-t">
                        <td className="px-2 py-1.5 text-xs">{rt2(b.rt)}</td>
                        <td className="px-2 py-1.5">
                          <span className="font-medium">{b.nama}</span>
                          <span className="block text-xs text-gray-500">{[b.kedudukan, b.nikSamar].filter(Boolean).join(" · ")}</span>
                        </td>
                        {!kk && <td className="px-2 py-1.5 text-right tabular-nums">{b.umur ?? "?"}</td>}
                        <td className="px-2 py-1.5 text-xs">{b.alamat ?? "—"}{kk ? ` · ${b.anggota} jiwa` : ""}</td>
                        <td className="px-2 py-1.5 text-xs">{b.nilai}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {baris.length > 300 && <p className="border-t px-3 py-2 text-xs text-gray-500">Menampilkan 300 baris pertama di layar. Semua baris tetap tercetak.</p>}
              </div>
              <PanduanPrinter />
              <TombolBesar ikon={<Printer className="h-5 w-5" />} onClick={() => window.print()}>
                Cetak untuk verifikasi RT ({perRt.length} {perRt.length > 1 ? "lembar RT, tiap RT halaman baru" : "RT"})
              </TombolBesar>
              <GayaCetakF4 />
              <AreaCetak>
                {perRt.map((x) => <LembarDaftar key={x.rt} data={data} rt={x.rt} baris={x.baris} />)}
              </AreaCetak>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bahan pendataan (QR, formulir, rekap keliling) — endpoint ber-scope satu RT
// ---------------------------------------------------------------------------

function BahanPendataan({ rt }: { rt: number }) {
  const qc = useQueryClient();
  // Diatur saat render agar permintaan pertama Cetak sudah membawa X-Wilayah-Rt (sama seperti Kelola warga).
  aturRtKelola(rt);
  useEffect(() => () => {
    aturRtKelola(null);
    qc.removeQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/wilayah/rt") });
  }, [qc]);
  return (
    <RtKelolaContext.Provider value={rt}>
      <Suspense fallback={<Memuat />}>
        <Cetak key={rt} />
      </Suspense>
    </RtKelolaContext.Provider>
  );
}

export default function KependudukanRekap() {
  const { params, ubah } = useParam();
  const tab = (TAB.some((t) => t.id === params.get("tab")) ? params.get("tab") : "kondisi") as Tab;
  const rtAngka = Number(params.get("rt"));
  const rt = (ACTIVE_RT_NUMBERS as readonly number[]).includes(rtAngka) ? rtAngka : null;
  const kategori = params.get("kategori") ?? "";
  const nilai = params.get("nilai");
  const [rtBahan, setRtBahan] = useState<number | null>(rt);
  useEffect(() => { if (rt) setRtBahan(rt); }, [rt]);

  return (
    <div className="max-w-4xl space-y-4 text-sm text-gray-900">
      <div className="print:hidden space-y-3">
        <Judul sub="Rekap kondisi warga per kategori, daftar nama untuk diverifikasi Ketua RT, dan bahan pendataan.">Rekap & cetak</Judul>
        <nav aria-label="Bagian rekap" className="grid grid-cols-3 gap-1 rounded-xl border bg-white p-1">
          {TAB.map(({ id, label, Ikon }) => {
            const on = tab === id;
            return (
              <button key={id} type="button" onClick={() => ubah({ tab: id === "kondisi" ? null : id })} aria-current={on ? "page" : undefined}
                className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold sm:text-sm ${on ? "text-white" : "text-gray-700 hover:bg-gray-100"}`}
                style={on ? { backgroundColor: HIJAU } : undefined}>
                <Ikon className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>
        {tab !== "kondisi" && (
          <PilihRt rt={tab === "bahan" ? rtBahan : rt} semua={tab === "daftar"}
            onChange={(n) => { if (tab === "bahan") setRtBahan(n); ubah({ rt: n ? String(n) : null, ...(tab === "bahan" ? { kk: null, mode: null } : {}) }); }} />
        )}
      </div>
      {tab === "kondisi" && <KondisiWilayah buka={(k, r) => ubah({ tab: "daftar", kategori: k, rt: r ? String(r) : null, nilai: null })} />}
      {tab === "daftar" && <DaftarVerifikasi kategori={kategori} rt={rt} nilai={nilai} ubah={ubah} />}
      {tab === "bahan" && (rtBahan ? <BahanPendataan rt={rtBahan} /> : <Pesan>Pilih RT dulu. Kartu QR dan formulir dicetak per RT.</Pesan>)}
    </div>
  );
}
