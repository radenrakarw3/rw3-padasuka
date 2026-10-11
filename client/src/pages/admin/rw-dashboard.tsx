import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { unduh, useKirimSekali, wil } from "@/lib/wilayah-api";
import { eksporPdfLaporan } from "@/lib/laporan-pdf";
import { FormFakta, kunciAwal } from "@/components/wilayah/form-fakta";
import { TabelIndikator, LABEL_STATUS, type HasilSel } from "@/pages/rt/laporan";
import DataWarga from "./rw-data-warga";
import { BAGIAN_KONFIRMASI, JENIS_FASILITAS, JENIS_KEGIATAN, JENIS_KELOMPOK, NAMA_BULAN, STATUS_KEJADIAN, isoTanggal } from "@shared/wilayah";

const RW = { peran: "rw" as const };
const rt2 = (rt: number | null) => (rt == null ? "Rekap RW" : `RT ${String(rt).padStart(2, "0")}`);
const labelDari = (l: readonly { nilai: string; label: string }[], v: string) => l.find((x) => x.nilai === v)?.label ?? v;

function PilihBulan({ tahun, bulan, ubah }: { tahun: number; bulan: number; ubah: (t: number, b: number) => void }) {
  const now = new Date();
  return (
    <div className="flex gap-2 items-center">
      <select className="h-10 border rounded-md px-2" value={bulan} onChange={(e) => ubah(tahun, Number(e.target.value))}>
        {NAMA_BULAN.map((n, i) => <option key={n} value={i + 1} disabled={tahun === now.getFullYear() && i > now.getMonth()}>{n}</option>)}
      </select>
      <select className="h-10 border rounded-md px-2" value={tahun} onChange={(e) => ubah(Number(e.target.value), bulan)}>
        {[now.getFullYear() - 1, now.getFullYear()].map((t) => <option key={t}>{t}</option>)}
      </select>
    </div>
  );
}

function Galat({ e }: { e: unknown }) {
  return e ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{(e as Error).message ?? String(e)}</p> : null;
}

// ---------------------------------------------------------------- Ringkasan
function Ringkasan({ tahun, bulan }: { tahun: number; bulan: number }) {
  const { data, isLoading, error } = useQuery<any>({ queryKey: ["/api/wilayah/rw/ringkasan", tahun, bulan], queryFn: () => wil(`/api/wilayah/rw/ringkasan?tahun=${tahun}&bulan=${bulan}`, RW) });
  const [buka, setBuka] = useState<string | null>(null);
  const [rtKeluarga, setRtKeluarga] = useState<number | null>(null);
  if (isLoading) return <p>Memuat…</p>;
  if (error) return <Galat e={error} />;
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {data.angka.map((a: any) => (
          <button key={a.label} type="button" onClick={() => setBuka(buka === a.label ? null : a.label)} className="text-left border rounded-lg p-3 bg-white hover:bg-muted/40">
            <p className="text-xs text-muted-foreground">{a.label}</p>
            <p className="text-2xl font-bold">{a.nilai ?? "—"} <span className="text-sm font-normal">{a.satuan}</span></p>
            <p className="text-xs text-muted-foreground">{a.periode} · {a.scope}{a.kelengkapan != null ? ` · lengkap ${Math.round(a.kelengkapan * 100)}%` : ""}</p>
            {a.catatan && <p className="text-xs text-amber-700 mt-1">{a.catatan}</p>}
            {buka === a.label && (
              <div className="mt-2 grid grid-cols-4 gap-1 text-xs">{a.rincian.map((r: any) => <span key={r.rt}>{rt2(r.rt)}: <b>{r.nilai ?? "—"}</b></span>)}</div>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Status 119 indikator bulan ini: {Object.entries(data.statusIndikator).map(([s, n]) => `${LABEL_STATUS[s] ?? s} ${n}`).join(" · ")}</p>

      <section>
        <h3 className="font-semibold mb-2">Kelengkapan per RT ({data.periode})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-muted"><tr>{["RT", "KK", "Warga", "KK lengkap", "Isian warga", "Masalah terbuka", "Pindah", "Laporan", ""].map((h) => <th key={h} className="p-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {data.kelengkapanRt.map((r: any) => (
                <tr key={r.rt} className="border-t">
                  <td className="p-2 font-medium">{rt2(r.rt)}</td>
                  <td className="p-2">{r.kk}</td>
                  <td className="p-2">{r.warga}</td>
                  <td className="p-2">{r.persen == null ? (r.tanpaDataLama ? "Belum ada data" : "—") : `${r.kkLengkap} (${r.persen}%)`}</td>
                  <td className="p-2">{r.usulanMenunggu}</td>
                  <td className="p-2">{r.kejadianTerbuka}</td>
                  <td className="p-2">{r.pindahMenunggu}</td>
                  <td className="p-2">{r.laporanVersi ? `Final v${r.laporanVersi}` : "Belum final"}</td>
                  <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setRtKeluarga(r.rt)}>Lihat keluarga</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {rtKeluarga && <DaftarKeluargaRt rt={rtKeluarga} tutup={() => setRtKeluarga(null)} />}

      <section>
        <h3 className="font-semibold mb-2">Perlu keputusan RW ({data.keputusan.length})</h3>
        {data.keputusan.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada.</p> : (
          <ul className="text-sm space-y-1">{data.keputusan.map((k: any) => <li key={`${k.jenis}-${k.id}`}>• [{k.jenis.replace("_", " ")}] {rt2(k.rt)} — {k.judul}</li>)}</ul>
        )}
        <p className="text-xs text-muted-foreground mt-1">Tindak lanjuti di tab “Kegiatan & Aksi RW” atau “Surat RW”.</p>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Perubahan oleh RT bulan ini</h3>
        {data.perubahan.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada.</p> : (
          <ul className="text-sm grid sm:grid-cols-2 gap-1">{data.perubahan.map((p: any, i: number) => <li key={i}>{rt2(p.rt)} · {p.aksi.replace(":", " ")}: <b>{p.jumlah}</b></li>)}</ul>
        )}
      </section>
    </div>
  );
}

/** Daftar keluarga per RT: tanpa NIK; detail dibuka terbatas (NIK disamarkan) dan tercatat di log akses. */
function DaftarKeluargaRt({ rt, tutup }: { rt: number; tutup: () => void }) {
  const { data, isLoading, error } = useQuery<any[]>({ queryKey: ["/api/wilayah/keluarga", rt], queryFn: () => wil(`/api/wilayah/keluarga?rt=${rt}&batas=1000`, RW) });
  const [detail, setDetail] = useState<any>(null);
  const [err, setErr] = useState<unknown>(null);
  return (
    <section className="border rounded-lg p-3 bg-muted/20">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Keluarga {rt2(rt)} (hanya baca)</h3>
        <Button size="sm" variant="outline" onClick={tutup}>Tutup</Button>
      </div>
      <p className="text-xs text-muted-foreground mb-2">Membuka detail keluarga tercatat di log akses. Perubahan data dilakukan Ketua RT.</p>
      {isLoading && <p>Memuat…</p>}
      <Galat e={error || err} />
      <ul className="text-sm max-h-64 overflow-y-auto divide-y">
        {data?.map((k) => (
          <li key={k.id} className="py-1 flex justify-between gap-2">
            <span>{k.kepala ?? "—"} · {k.alamat} · {k.anggota} org · data {Math.round(k.kelengkapan * 100)}%</span>
            <Button size="sm" variant="ghost" onClick={async () => { setErr(null); try { setDetail(await wil(`/api/wilayah/keluarga/${k.id}`, RW)); } catch (e) { setErr(e); } }}>Detail</Button>
          </li>
        ))}
      </ul>
      {detail && (
        <div className="mt-3 border-t pt-2 text-sm">
          <p className="font-medium">{detail.kk.alamat} · No. KK {detail.kk.nomorKk}</p>
          <ul>{detail.anggota.map((a: any) => <li key={a.id}>{a.nama} · {a.kedudukan} · {a.umur ?? "?"} th · NIK {a.nik}</li>)}</ul>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Data bersama
function DataBersama() {
  const qc = useQueryClient();
  const { data: fas, error: e1 } = useQuery<any[]>({ queryKey: ["/api/wilayah/fasilitas", "rw"], queryFn: () => wil("/api/wilayah/fasilitas", RW) });
  const { data: kel, error: e2 } = useQuery<any[]>({ queryKey: ["/api/wilayah/kelompok", "rw"], queryFn: () => wil("/api/wilayah/kelompok", RW) });
  const [f, setF] = useState({ tabel: "fasilitas", jenis: "posyandu", nama: "", rtLokasi: "", rtLayanan: [] as number[], lokasi: "" });
  const [posyandu, setPosyandu] = useState<any>(null);
  const simpan = useKirimSekali(async () => {
    const body = f.tabel === "fasilitas"
      ? { jenis: f.jenis, nama: f.nama, rtLokasi: f.rtLokasi ? Number(f.rtLokasi) : null, rtLayanan: f.rtLayanan, lokasi: f.lokasi || null }
      : { jenis: f.jenis, nama: f.nama, rtBasis: f.rtLokasi ? Number(f.rtLokasi) : null, rtTerlibat: f.rtLayanan };
    await wil(`/api/wilayah/${f.tabel}`, { ...RW, body });
    await qc.invalidateQueries({ queryKey: [`/api/wilayah/${f.tabel}`, "rw"] });
    setF({ ...f, nama: "", lokasi: "" });
    return true;
  });
  if (posyandu) {
    return (
      <div className="max-w-xl">
        <FormFakta peran="rw" draftKey={`fasilitas:${posyandu.id}`} batal={() => setPosyandu(null)}
          selesai={async () => { await qc.invalidateQueries({ queryKey: ["/api/wilayah/fasilitas", "rw"] }); setPosyandu(null); }}
          langkah={[{ judul: `Posyandu ${posyandu.nama}`, subjek: "fasilitas", subjekId: posyandu.id, kunci: ["memenuhi_6_spm", "bangunan_sendiri", "strata", "jumlah_kader", "kader_terlatih"] }]}
          awal={kunciAwal("fasilitas", posyandu.id, posyandu.fakta)} />
      </div>
    );
  }
  const daftarJenis = f.tabel === "fasilitas" ? JENIS_FASILITAS : JENIS_KELOMPOK;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Objek bersama dikelola RW dengan satu data induk. RT hanya dapat melihat dan mengusulkan koreksi. Objek dengan nama sama tidak digabung otomatis.</p>
      <section className="border rounded-lg p-3 space-y-2">
        <h3 className="font-semibold">Tambah objek bersama RW</h3>
        <div className="grid sm:grid-cols-3 gap-2">
          <select className="h-10 border rounded-md px-2" value={f.tabel} onChange={(e) => setF({ ...f, tabel: e.target.value, jenis: e.target.value === "fasilitas" ? "posyandu" : "pkk" })}>
            <option value="fasilitas">Fasilitas</option><option value="kelompok">Kelompok</option>
          </select>
          <select className="h-10 border rounded-md px-2" value={f.jenis} onChange={(e) => setF({ ...f, jenis: e.target.value })}>
            {daftarJenis.map((j) => <option key={j.nilai} value={j.nilai}>{j.label}</option>)}
          </select>
          <Input placeholder="Nama" value={f.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} />
          <select className="h-10 border rounded-md px-2" value={f.rtLokasi} onChange={(e) => setF({ ...f, rtLokasi: e.target.value })}>
            <option value="">Lokasi RT (opsional)</option>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{rt2(n)}</option>)}
          </select>
          <Input placeholder="Lokasi" value={f.lokasi} onChange={(e) => setF({ ...f, lokasi: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2 text-sm items-center">
          <span>{f.tabel === "fasilitas" ? "Melayani RT:" : "RT terlibat:"}</span>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <label key={n} className="flex items-center gap-1"><input type="checkbox" checked={f.rtLayanan.includes(n)} onChange={(e) => setF({ ...f, rtLayanan: e.target.checked ? [...f.rtLayanan, n] : f.rtLayanan.filter((x) => x !== n) })} />{String(n).padStart(2, "0")}</label>
          ))}
        </div>
        <Galat e={simpan.error} />
        <Button disabled={f.nama.trim().length < 2 || simpan.mengirim} onClick={() => simpan.kirim()}>Simpan</Button>
      </section>
      <Galat e={e1 || e2} />
      <section>
        <h3 className="font-semibold mb-2">Fasilitas</h3>
        <ul className="text-sm divide-y border rounded-lg">
          {fas?.map((x) => (
            <li key={x.id} className="p-2 flex justify-between gap-2">
              <span>{labelDari(JENIS_FASILITAS, x.jenis)} · <b>{x.nama}</b> · {x.pengelola === "rw" ? "RW" : rt2(x.rt_pengelola)} · melayani {(x.rt_layanan ?? []).map((n: number) => String(n).padStart(2, "0")).join(", ") || "—"}{x.sampai ? " · nonaktif" : ""}</span>
              {x.bolehUbah && x.jenis === "posyandu" && <Button size="sm" variant="outline" onClick={() => setPosyandu(x)}>Data posyandu</Button>}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="font-semibold mb-2">Kelompok</h3>
        <ul className="text-sm divide-y border rounded-lg">
          {kel?.map((x) => <li key={x.id} className="p-2">{labelDari(JENIS_KELOMPOK, x.jenis)} · <b>{x.nama}</b> · {x.pengelola === "rw" ? "RW" : rt2(x.rt_pengelola)}{x.sampai ? " · nonaktif" : ""}</li>)}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- Kegiatan & aksi
function Aksi({ tahun, bulan }: { tahun: number; bulan: number }) {
  const qc = useQueryClient();
  const [, go] = useLocation();
  const { data, error } = useQuery<any>({ queryKey: ["/api/wilayah/rw/aksi", tahun, bulan], queryFn: () => wil(`/api/wilayah/rw/aksi?tahun=${tahun}&bulan=${bulan}`, RW) });
  const { data: koreksi } = useQuery<any[]>({ queryKey: ["/api/wilayah/koreksi", "rw"], queryFn: () => wil("/api/wilayah/koreksi", RW) });
  const { data: surat } = useQuery<any>({ queryKey: ["/api/wilayah/rw/surat-ringkasan"], queryFn: () => wil("/api/wilayah/rw/surat-ringkasan", RW) });
  const { data: lap } = useQuery<any>({ queryKey: ["/api/wilayah/laporan", "rw-konf", tahun, bulan], queryFn: () => wil(`/api/wilayah/laporan?tahun=${tahun}&bulan=${bulan}`, RW) });
  const [g, setG] = useState({ jenis: "rembug_rw", judul: "", tanggal: isoTanggal(new Date()), lokasi: "", rt: [1, 2, 3, 4, 5, 6, 7] });
  const [err, setErr] = useState<unknown>(null);
  const segar = () => Promise.all(["/api/wilayah/rw/aksi", "/api/wilayah/koreksi", "/api/wilayah/laporan", "/api/wilayah/rw/ringkasan"].map((k) => qc.invalidateQueries({ queryKey: [k] })));
  const jalankan = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await segar(); } catch (e) { setErr(e); } };
  const tambah = useKirimSekali(async (kunci) => {
    await wil("/api/wilayah/kegiatan", { ...RW, body: { jenis: g.jenis, judul: g.judul, tanggal: g.tanggal, lokasi: g.lokasi || null, rtTerlibat: g.rt, idempotencyKey: kunci } });
    setG({ ...g, judul: "", lokasi: "" });
    await segar();
    return true;
  });
  const konf = new Set((lap?.konfirmasi ?? []).filter((k: any) => k.rt == null).map((k: any) => k.bagian));
  return (
    <div className="space-y-6">
      <Galat e={error || err} />
      <section className="border rounded-lg p-3 space-y-2">
        <h3 className="font-semibold">Catat kegiatan RW (sudah terlaksana)</h3>
        <div className="grid sm:grid-cols-4 gap-2">
          <select className="h-10 border rounded-md px-2" value={g.jenis} onChange={(e) => setG({ ...g, jenis: e.target.value })}>{JENIS_KEGIATAN.map((j) => <option key={j.nilai} value={j.nilai}>{j.label}</option>)}</select>
          <Input placeholder="Judul" value={g.judul} onChange={(e) => setG({ ...g, judul: e.target.value })} />
          <Input type="date" value={g.tanggal} max={isoTanggal(new Date())} onChange={(e) => setG({ ...g, tanggal: e.target.value })} />
          <Input placeholder="Lokasi" value={g.lokasi} onChange={(e) => setG({ ...g, lokasi: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2 text-sm items-center"><span>RT terlibat:</span>
          {[1, 2, 3, 4, 5, 6, 7].map((n) => <label key={n} className="flex items-center gap-1"><input type="checkbox" checked={g.rt.includes(n)} onChange={(e) => setG({ ...g, rt: e.target.checked ? [...g.rt, n] : g.rt.filter((x) => x !== n) })} />{String(n).padStart(2, "0")}</label>)}
        </div>
        <p className="text-xs text-muted-foreground">Satu kegiatan RW = satu data. Tiap RT mengisi jumlah hadir warganya sendiri; rekap RW menghitung kegiatan satu kali.</p>
        <Galat e={tambah.error} />
        <Button disabled={g.judul.trim().length < 3 || tambah.mengirim} onClick={() => tambah.kirim()}>Simpan kegiatan</Button>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Kegiatan RW {NAMA_BULAN[bulan - 1]}</h3>
        <ul className="text-sm divide-y border rounded-lg">
          {data?.kegiatan.length === 0 && <li className="p-2 text-muted-foreground">Belum ada.</li>}
          {data?.kegiatan.map((k: any) => (
            <li key={k.id} className="p-2">{k.tanggal} · <b>{k.judul}</b> · hadir: {k.peserta.length ? k.peserta.map((p: any) => `${rt2(p.rt)} ${p.hadir}`).join(", ") : "belum diisi RT"}
              {" "}· belum mengisi: {(k.rt_terlibat as number[]).filter((r) => !k.peserta.some((p: any) => p.rt === r)).map((r) => String(r).padStart(2, "0")).join(", ") || "—"}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Konfirmasi tingkat RW ({NAMA_BULAN[bulan - 1]})</h3>
        {BAGIAN_KONFIRMASI.filter((b) => b.scope === "rw").map((b) => (
          <label key={b.nilai} className="flex items-center gap-2 text-sm py-1">
            <input type="checkbox" checked={konf.has(b.nilai)} onChange={(e) => jalankan(() => wil("/api/wilayah/konfirmasi", { ...RW, body: { tahun, bulan, bagian: b.nilai, aktif: e.target.checked } }))} />{b.label}
          </label>
        ))}
      </section>

      <section>
        <h3 className="font-semibold mb-2">Masalah wilayah</h3>
        <ul className="text-sm divide-y border rounded-lg">
          {data?.kejadian.map((k: any) => (
            <li key={k.id} className="p-2 space-y-1">
              <p>{k.tanggal} · {rt2(k.rt)} · <b>{k.judul}</b> · {labelDari(STATUS_KEJADIAN, k.status)} · {k.tindak} tindak lanjut</p>
              {k.status === "perlu_rw" && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { const c = prompt("Keputusan / arahan RW:"); if (c) jalankan(() => wil(`/api/wilayah/kejadian/${k.id}/tindak`, { ...RW, body: { catatan: c, status: "ditangani" } })); }}>Beri keputusan</Button>
                  <Button size="sm" variant="outline" onClick={() => go(`/admin/surat-rw?kejadian=${k.id}`)}>Buat surat</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-semibold mb-2">Usulan koreksi dari RT</h3>
        <ul className="text-sm divide-y border rounded-lg">
          {koreksi?.filter((k) => k.status === "baru").length === 0 && <li className="p-2 text-muted-foreground">Tidak ada.</li>}
          {koreksi?.filter((k) => k.status === "baru").map((k) => (
            <li key={k.id} className="p-2 flex flex-wrap justify-between gap-2">
              <span>{rt2(k.rt_pengusul)} · {k.objek} #{k.objek_id}: {k.uraian}</span>
              <span className="flex gap-2">
                <Button size="sm" onClick={() => jalankan(() => wil(`/api/wilayah/rw/koreksi/${k.id}/putuskan`, { ...RW, body: { terima: true, jawaban: prompt("Jawaban untuk RT:") ?? "Diterima" } }))}>Terima</Button>
                <Button size="sm" variant="outline" onClick={() => { const j = prompt("Alasan menolak:"); if (j) jalankan(() => wil(`/api/wilayah/rw/koreksi/${k.id}/putuskan`, { ...RW, body: { terima: false, jawaban: j } })); }}>Tolak</Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Surat Sakti</h3>
          <Button size="sm" variant="outline" onClick={() => go("/admin/surat-rw")}>Buka Surat Sakti</Button>
        </div>
        {surat && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-sm">
            {([
              ["Draft", surat.draft], ["Terbit belum diserahkan", surat.belum_distribusi],
              ["Tindak lanjut terlambat", surat.tindak_terlambat], ["Jatuh tempo ≤3 hari", surat.tindak_jatuh_tempo],
              ["Pekerjaan selesai 30 hari", surat.pekerjaan_selesai_30h],
            ] as [string, number][]).map(([l, n]) => (
              <button key={l} type="button" onClick={() => go("/admin/surat-rw")} className="rounded-lg border p-2 text-left hover:bg-muted/40">
                <p className={`text-xl font-bold ${n && (l.includes("terlambat") || l.includes("belum")) ? "text-amber-700" : ""}`}>{n}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </button>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

// ---------------------------------------------------------------- Laporan kecamatan
function LaporanKecamatan({ tahun, bulan }: { tahun: number; bulan: number }) {
  const qc = useQueryClient();
  const [rt, setRt] = useState<number | null>(null);
  const [alasan, setAlasan] = useState("");
  const [err, setErr] = useState<unknown>(null);
  const { data: status } = useQuery<any[]>({ queryKey: ["/api/wilayah/rw/laporan-status", tahun, bulan], queryFn: () => wil(`/api/wilayah/rw/laporan-status?tahun=${tahun}&bulan=${bulan}`, RW) });
  const { data: p, isLoading, error } = useQuery<{ hasil: HasilSel[]; ringkas: Record<string, number>; final: any }>({
    queryKey: ["/api/wilayah/laporan", "rw", rt, tahun, bulan], queryFn: () => wil(`/api/wilayah/laporan?tahun=${tahun}&bulan=${bulan}${rt ? `&rt=${rt}` : ""}`, RW),
  });
  const final = useKirimSekali(async () => {
    const r = await wil<{ versi: number }>("/api/wilayah/laporan/final", { ...RW, body: { tahun, bulan, alasanKoreksi: alasan || undefined } });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/laporan"] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/laporan-status"] });
    return r;
  });
  const dari = tahun === 2026 ? 9 : 1;
  const q = `tahun=${tahun}&dari=${dari}&sampai=12${rt ? `&rt=${rt}` : ""}`;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[null, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Button key={String(n)} size="sm" variant={rt === n ? "default" : "outline"} onClick={() => setRt(n)}>
            {rt2(n)} {status?.find((s) => s.rt === n)?.versi ? `✓v${status.find((s) => s.rt === n).versi}` : ""}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Rekap RW menghitung objek unik (rumah, fasilitas, kegiatan bersama tidak dihitung ganda). RW hanya memfinalkan rekap; laporan RT difinalkan Ketua RT.</p>
      <Galat e={error || err} />
      {isLoading && <p>Memuat…</p>}
      {p && <p className="text-sm">{Object.entries(p.ringkas).map(([s, n]) => `${LABEL_STATUS[s]}: ${n}`).join(" · ")}{p.final ? ` · Final v${p.final.versi}` : " · Belum final"}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={async () => { setErr(null); try { await unduh(`/api/wilayah/laporan/ekspor?${q}&format=xlsx`, "laporan.xlsx", "rw"); } catch (e) { setErr(e); } }}><Download className="w-4 h-4 mr-1" /> XLSX</Button>
        <Button variant="outline" onClick={async () => { setErr(null); try { eksporPdfLaporan(await wil(`/api/wilayah/laporan/ekspor?${q}`, RW)); } catch (e) { setErr(e); } }}><Download className="w-4 h-4 mr-1" /> PDF</Button>
      </div>
      {rt == null && (
        <div className="border rounded-lg p-3 space-y-2">
          {p?.final && <Input placeholder="Alasan koreksi (wajib untuk versi baru)" value={alasan} onChange={(e) => setAlasan(e.target.value)} />}
          <Galat e={final.error} />
          <Button disabled={final.mengirim || (!!p?.final && alasan.trim().length < 5)} onClick={() => final.kirim()}>{p?.final ? "Simpan koreksi rekap (versi baru)" : "Finalkan rekap RW"}</Button>
        </div>
      )}
      {p && <TabelIndikator hasil={p.hasil} />}
    </div>
  );
}

const MODUL_LAIN = [
  { href: "/admin/keuangan", label: "Kas RW" },
  { href: "/admin/rw3law", label: "RW3LAW (peraturan)" },
  { href: "/admin/laporan", label: "Laporan warga" },
  { href: "/admin/kependudukan", label: "Kependudukan (lama, baca)" },
  { href: "/admin/visitrw3", label: "Visit RW3 (hunian)" },
  { href: "/admin/rw3biz", label: "RW3BIZ (usaha)" },
  { href: "/admin/karangtaruna", label: "Karang Taruna" },
  { href: "/admin/rtjuara/akun", label: "Akun & PIN Ketua RT" },
  { href: "/admin/rtjuara", label: "RT JUARA" },
];

export default function RwDashboard() {
  const now = new Date();
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(163,55%,22%)]">Dashboard RW 03</h1>
          <p className="text-sm text-muted-foreground">Hanya baca untuk data warga. Data master dikelola Ketua RT masing-masing.</p>
        </div>
        <PilihBulan tahun={tahun} bulan={bulan} ubah={(t, b) => { setTahun(t); setBulan(b); }} />
      </div>
      <Tabs defaultValue="ringkasan">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="warga">Data Warga</TabsTrigger>
          <TabsTrigger value="bersama">Data Bersama</TabsTrigger>
          <TabsTrigger value="aksi">Kegiatan & Aksi RW</TabsTrigger>
          <TabsTrigger value="laporan">Laporan Kecamatan</TabsTrigger>
        </TabsList>
        <TabsContent value="ringkasan"><Ringkasan tahun={tahun} bulan={bulan} /></TabsContent>
        <TabsContent value="warga"><DataWarga /></TabsContent>
        <TabsContent value="bersama"><DataBersama /></TabsContent>
        <TabsContent value="aksi"><Aksi tahun={tahun} bulan={bulan} /></TabsContent>
        <TabsContent value="laporan"><LaporanKecamatan tahun={tahun} bulan={bulan} /></TabsContent>
      </Tabs>
      <details className="border rounded-lg p-3">
        <summary className="cursor-pointer font-medium">Modul lain</summary>
        <div className="flex flex-wrap gap-2 mt-2">
          {MODUL_LAIN.map((m) => <Link key={m.href} href={m.href} className="text-sm border rounded-md px-3 py-1.5 hover:bg-muted inline-flex items-center gap-1">{m.label} <ExternalLink className="w-3 h-3" /></Link>)}
        </div>
      </details>
    </div>
  );
}
