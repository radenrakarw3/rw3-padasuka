import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FilePlus2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { bukaBerkas, wil } from "@/lib/wilayah-api";
import { PAKET, PETA_JENIS, rupiah, type StatusDistribusi, type StatusPekerjaan } from "@shared/surat-sakti";
import { Galat, LencanaTindak, RW, TigaStatus, bacaFile, rt2, tanggalId } from "./dasar";
import { editorBaru, Pilih, type Referensi, type StateEditor } from "./wizard";

const JENIS_RANGKAIAN = [["kasus", "Kasus/masalah"], ["program", "Program"], ["keputusan", "Keputusan"], ["fasilitas", "Fasilitas"], ["kegiatan", "Kegiatan"], ["lainnya", "Lainnya"]] as const;

// ---------------------------------------------------------------- tindak lanjut (RW & RT)
export function DaftarTindak({ peran, bukaSurat }: { peran: "rt" | "rw"; bukaSurat?: (id: number) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState("terbuka");
  const { data, error, isLoading } = useQuery<any[]>({
    queryKey: ["/api/wilayah/surat-tindak", peran, filter],
    queryFn: () => wil(`/api/wilayah/surat-tindak?filter=${filter}`, { peran }),
  });
  const [upd, setUpd] = useState<{ id: number; catatan: string; progres: string; status: string; bukti: string } | null>(null);
  const ubahUpd = (p: Partial<NonNullable<typeof upd>>) => setUpd((x) => (x ? { ...x, ...p } : x));
  const [err, setErr] = useState<unknown>(null);
  const [sibuk, setSibuk] = useState(false);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {[["terbuka", "Terbuka"], ["jatuh_tempo", "Jatuh tempo ≤3 hari / terlambat"], ["selesai", "Selesai"], ["semua", "Semua"]].map(([v, l]) => (
          <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>{l}</Button>
        ))}
      </div>
      <Galat e={error || err} />
      {isLoading && <p className="text-sm">Memuat…</p>}
      {data?.length === 0 && <p className="text-sm text-muted-foreground">{peran === "rt" ? "Tidak ada tugas untuk RT Anda." : "Tidak ada tindak lanjut."}</p>}
      <ul className="space-y-2">
        {data?.map((t) => (
          <li key={t.id} className="rounded-lg border bg-white p-3 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{t.tindakan}</span>
              <LencanaTindak status={t.status} terlambat={t.terlambat} />
            </div>
            <p className="text-xs text-muted-foreground">
              {t.nomor_surat ?? "-"} · {t.perihal} · PIC {t.pic_nama ?? "-"} · tenggat {t.tenggat ?? "-"} · {t.progres ?? 0}%
            </p>
            {t.catatan_terakhir && <p className="text-xs">Terakhir: {t.catatan_terakhir}</p>}
            <div className="flex gap-3 text-xs">
              {bukaSurat && <button type="button" className="underline" onClick={() => bukaSurat(t.surat_id)}>buka dokumen</button>}
              {t.status !== "selesai" && t.status !== "tidak_diperlukan" && (
                <button type="button" className="underline" onClick={() => setUpd({ id: t.id, catatan: "", progres: String(t.progres ?? 0), status: t.status, bukti: "" })}>laporkan progres</button>
              )}
            </div>
            {upd && upd.id === t.id && (
              <div className="rounded border p-2 space-y-2 bg-stone-50">
                <div className="grid grid-cols-2 gap-2">
                  <select className="h-10 border rounded-md px-2 bg-white" value={upd.status} onChange={(e) => ubahUpd({ status: e.target.value })}>
                    <option value="menunggu">Menunggu</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option>
                    {peran === "rw" && <option value="tidak_diperlukan">Tidak diperlukan</option>}
                  </select>
                  <Input inputMode="numeric" placeholder="Progres %" value={upd.progres} onChange={(e) => ubahUpd({ progres: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                </div>
                <Textarea rows={2} placeholder="Apa yang sudah dikerjakan?" value={upd.catatan} onChange={(e) => ubahUpd({ catatan: e.target.value })} />
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input placeholder="Bukti: keterangan" value={upd.bukti.startsWith("data:") ? "(berkas terpilih)" : upd.bukti} onChange={(e) => ubahUpd({ bukti: e.target.value })} />
                  <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) bacaFile(f).then((b) => ubahUpd({ bukti: b })).catch(setErr); }} />
                </div>
                {upd.status === "selesai" && <p className="text-xs text-amber-800">Selesai wajib disertai bukti (foto, dokumen, atau keterangan).</p>}
                <div className="flex gap-2">
                  <Button size="sm" disabled={sibuk || upd.catatan.trim().length < 3} onClick={async () => {
                    const x = upd;
                    if (!x) return;
                    setSibuk(true);
                    setErr(null);
                    try {
                      await wil(`/api/wilayah/surat-tindak/${x.id}/update`, { peran, body: { catatan: x.catatan, status: x.status, progres: Math.min(100, Number(x.progres) || 0), bukti: x.bukti || null } });
                      setUpd(null);
                      toast({ title: "Progres dicatat" });
                      await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-tindak"] });
                      await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat"] });
                    } catch (e) { setErr(e); } finally { setSibuk(false); }
                  }}>Kirim laporan</Button>
                  <Button size="sm" variant="ghost" onClick={() => setUpd(null)}>Batal</Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- rangkaian
interface DetailRangkaian {
  id: number; judul: string; jenis: string; paket: string | null; status: string; rt_terkait: number[]; catatan: string | null; evaluasi: string | null;
  created_at: string; ditutup_at: string | null;
  dokumen: { id: number; nomor_surat: string | null; kode_jenis: string | null; jenis_surat: string; perihal: string; status: any; tanggal_surat: string | null;
    statusDistribusi: StatusDistribusi; statusPekerjaan: StatusPekerjaan; terlambat: number; tindak: { id: number; tindakan: string; status: string; pic: string | null; tenggat: string | null }[] }[];
  masuk: { id: number; pengirim: string; tanggal: string; perihal: string; ringkasan: string | null }[];
  bantuan: { id: number; tahap: string; uraian: string; nominal: number | null; tanggal: string }[];
  bantuanPerTahap: Record<string, number>;
  fakta: { id: number; rt: number | null; isi: string; sumber: string | null; ada_bukti: boolean; bukti_nama: string | null; oleh: string; created_at: string }[];
}

export function DetailRangkaianView({ id, peran, tutup, bukaSurat, buat }: { id: number; peran: "rt" | "rw"; tutup: () => void; bukaSurat: (id: number) => void; buat?: (s: StateEditor) => void }) {
  const qc = useQueryClient();
  const { data: r, error } = useQuery<DetailRangkaian>({ queryKey: ["/api/wilayah/surat-rangkaian", id], queryFn: () => wil(`/api/wilayah/surat-rangkaian/${id}`, { peran }) });
  const [err, setErr] = useState<unknown>(null);
  const [evaluasi, setEvaluasi] = useState("");
  const [fakta, setFakta] = useState({ isi: "", sumber: "", bukti: "", buktiNama: "" });
  if (!r) return <div className="space-y-2"><Button variant="ghost" size="sm" onClick={tutup}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button><Galat e={error} /></div>;
  const paket = PAKET.find((p) => p.kode === r.paket);
  const adaKode = new Set(r.dokumen.map((d) => d.kode_jenis));
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="sm" onClick={tutup}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
        <div>
          <h2 className="text-lg font-bold">{r.judul}</h2>
          <p className="text-sm text-muted-foreground">{r.jenis} · {r.status === "aktif" ? "aktif" : `ditutup ${tanggalId(r.ditutup_at)}`} · {r.rt_terkait.map(rt2).join(", ") || "tanpa RT"}</p>
        </div>
      </div>
      <Galat e={err} />
      {r.evaluasi && <p className="rounded border bg-emerald-50 p-2 text-sm"><b>Evaluasi akhir:</b> {r.evaluasi}</p>}

      {paket && peran === "rw" && buat && (
        <section className="rounded-lg border bg-white p-3 space-y-2">
          <h3 className="font-semibold">Langkah paket: {paket.label}</h3>
          <ol className="space-y-1 text-sm">
            {paket.langkah.map((k, i) => (
              <li key={k} className="flex items-center gap-2">
                <span className="w-5 text-right">{i + 1}.</span>
                <span className="flex-1">{PETA_JENIS[k]?.label ?? k}</span>
                {adaKode.has(k) ? <span className="text-xs text-emerald-700">sudah ada</span>
                  : r.status === "aktif" && <Button size="sm" variant="outline" onClick={() => buat(editorBaru({ kode: k, tujuan: PETA_JENIS[k]?.tujuan, rangkaianId: r.id, rtTerkait: r.rt_terkait, perihal: r.judul, langkah: 1 }))}>Buat</Button>}
              </li>
            ))}
          </ol>
          <p className="text-xs text-muted-foreground">Setiap langkah tetap diisi dan diperiksa satu per satu sebelum terbit.</p>
        </section>
      )}

      <section className="rounded-lg border bg-white p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Dokumen ({r.dokumen.length})</h3>
          {peran === "rw" && buat && r.status === "aktif" && <Button size="sm" variant="outline" onClick={() => buat(editorBaru({ rangkaianId: r.id, rtTerkait: r.rt_terkait, perihal: r.judul }))}><FilePlus2 className="w-4 h-4 mr-1" /> Dokumen baru</Button>}
        </div>
        <ol className="border-l-2 pl-3 space-y-2">
          {r.dokumen.map((d) => (
            <li key={d.id}>
              <button type="button" className="text-left w-full" onClick={() => bukaSurat(d.id)}>
                <p className="text-sm font-medium">{PETA_JENIS[d.kode_jenis ?? ""]?.label ?? d.jenis_surat} — {d.perihal}</p>
                <p className="text-xs text-muted-foreground">{d.nomor_surat ?? "draft"} · {d.tanggal_surat ?? ""}</p>
                <TigaStatus s={{ statusDokumen: d.status, statusDistribusi: d.statusDistribusi, statusPekerjaan: d.statusPekerjaan, terlambat: d.terlambat }} />
              </button>
            </li>
          ))}
        </ol>
      </section>

      {peran === "rw" && (r.bantuan.length > 0 || r.masuk.length > 0) && (
        <section className="rounded-lg border bg-white p-3 space-y-2 text-sm">
          {r.bantuan.length > 0 && (
            <>
              <h3 className="font-semibold">Dukungan per tahap</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(r.bantuanPerTahap).map(([t, n]) => (
                  <div key={t} className="rounded border p-2"><p className="text-xs capitalize text-muted-foreground">{t}</p><p className="font-semibold">{n ? rupiah(n) : "-"}</p></div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Nominal ditampilkan per tahap; dimohonkan/dijanjikan bukan pemasukan.</p>
            </>
          )}
          {r.masuk.length > 0 && (
            <>
              <h3 className="font-semibold pt-2">Surat masuk</h3>
              <ul>{r.masuk.map((m) => <li key={m.id}>{m.tanggal} · {m.pengirim} · {m.perihal}</li>)}</ul>
            </>
          )}
        </section>
      )}

      <section className="rounded-lg border bg-white p-3 space-y-2 text-sm">
        <h3 className="font-semibold">Fakta & bukti dari RT ({r.fakta.length})</h3>
        <ul className="space-y-1">
          {r.fakta.map((f) => (
            <li key={f.id}>{tanggalId(f.created_at)} · {rt2(f.rt) || f.oleh}: {f.isi}{f.sumber ? ` (sumber: ${f.sumber})` : ""}
              {f.ada_bukti && <button type="button" className="underline ml-1 text-xs" onClick={() => bukaBerkas(`/api/wilayah/surat-fakta/${f.id}/bukti`, peran).catch(setErr)}>bukti</button>}</li>
          ))}
        </ul>
        {r.status === "aktif" && (
          <div className="space-y-2 rounded border p-2 bg-stone-50">
            <Textarea rows={2} placeholder="Tambahkan fakta yang diketahui/diamati (bukan tuduhan)" value={fakta.isi} onChange={(e) => setFakta({ ...fakta, isi: e.target.value })} />
            <div className="grid sm:grid-cols-2 gap-2">
              <Input placeholder="Sumber (mis. pengamatan langsung, laporan warga)" value={fakta.sumber} onChange={(e) => setFakta({ ...fakta, sumber: e.target.value })} />
              <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) bacaFile(f).then((b) => setFakta({ ...fakta, bukti: b, buktiNama: f.name })).catch(setErr); }} />
            </div>
            <Button size="sm" disabled={fakta.isi.trim().length < 5} onClick={async () => {
              try {
                await wil("/api/wilayah/surat-fakta", { peran, body: { rangkaianId: r.id, isi: fakta.isi, sumber: fakta.sumber || null, bukti: fakta.bukti || null, buktiNama: fakta.buktiNama || null } });
                setFakta({ isi: "", sumber: "", bukti: "", buktiNama: "" });
                await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-rangkaian", id] });
              } catch (e) { setErr(e); }
            }}>Tambah fakta</Button>
          </div>
        )}
      </section>

      {peran === "rw" && r.status === "aktif" && (
        <section className="rounded-lg border bg-white p-3 space-y-2">
          <h3 className="font-semibold">Tutup rangkaian</h3>
          <Textarea rows={2} placeholder="Evaluasi: apa hasilnya, apa yang perlu diperbaiki ke depan" value={evaluasi} onChange={(e) => setEvaluasi(e.target.value)} />
          <Button size="sm" variant="outline" disabled={evaluasi.trim().length < 5} onClick={async () => {
            try {
              await wil(`/api/wilayah/rw/surat-rangkaian/${r.id}/tutup`, { ...RW, body: { evaluasi } });
              await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-rangkaian"] });
              await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat-ringkasan"] });
            } catch (e) { setErr(e); }
          }}>Tutup dengan evaluasi</Button>
        </section>
      )}
    </div>
  );
}

export function DaftarRangkaian({ peran, buka }: { peran: "rt" | "rw"; buka: (id: number) => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState("aktif");
  const { data, error } = useQuery<any[]>({ queryKey: ["/api/wilayah/surat-rangkaian", peran, status], queryFn: () => wil(`/api/wilayah/surat-rangkaian?status=${status}`, { peran }) });
  const { data: ref } = useQuery<Referensi>({ queryKey: ["/api/wilayah/rw/surat-referensi"], queryFn: () => wil("/api/wilayah/rw/surat-referensi", RW), enabled: peran === "rw", staleTime: 60_000 });
  const [baru, setBaru] = useState<{ judul: string; jenis: string; paket: string; rtTerkait: number[]; kejadianId: number | null; kegiatanId: number | null; programId: number | null; fasilitasId: number | null } | null>(null);
  const [err, setErr] = useState<unknown>(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 items-center">
        {[["aktif", "Aktif"], ["ditutup", "Ditutup"], ["semua", "Semua"]].map(([v, l]) => <Button key={v} size="sm" variant={status === v ? "default" : "outline"} onClick={() => setStatus(v)}>{l}</Button>)}
        {peran === "rw" && <Button size="sm" className="ml-auto" onClick={() => setBaru({ judul: "", jenis: "kasus", paket: "", rtTerkait: [], kejadianId: null, kegiatanId: null, programId: null, fasilitasId: null })}><Plus className="w-4 h-4 mr-1" /> Rangkaian baru</Button>}
      </div>
      <Galat e={error || err} />
      {baru && (
        <div className="rounded-lg border bg-white p-3 space-y-3 max-w-2xl">
          <div className="space-y-1"><Label>Judul</Label><Input value={baru.judul} placeholder="mis. Genangan saluran Gg. Melati RT 02" onChange={(e) => setBaru({ ...baru, judul: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-2">
            <select className="h-10 border rounded-md px-2 bg-white" value={baru.jenis} onChange={(e) => setBaru({ ...baru, jenis: e.target.value })}>
              {JENIS_RANGKAIAN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className="h-10 border rounded-md px-2 bg-white" value={baru.paket} onChange={(e) => { const p = PAKET.find((x) => x.kode === e.target.value); setBaru({ ...baru, paket: e.target.value, jenis: p?.jenis ?? baru.jenis }); }}>
              <option value="">Tanpa paket langkah</option>
              {PAKET.map((p) => <option key={p.kode} value={p.kode}>{p.label}</option>)}
            </select>
          </div>
          {ref && (
            <>
              <Pilih label="Masalah/kejadian" items={ref.kejadian} nilai={baru.kejadianId} teks={(k) => k.judul} sub={(k) => `${rt2(k.rt)} · ${k.status}`}
                ubah={(id) => { const k = ref.kejadian.find((x) => x.id === id); setBaru({ ...baru, kejadianId: id, rtTerkait: k?.rt && !baru.rtTerkait.includes(k.rt) ? [...baru.rtTerkait, k.rt] : baru.rtTerkait, judul: baru.judul || k?.judul || "" }); }} />
              <Pilih label="Program RW" items={ref.program} nilai={baru.programId} teks={(p) => p.nama} sub={(p) => p.status} ubah={(id) => setBaru({ ...baru, programId: id })} />
              <Pilih label="Fasilitas" items={ref.fasilitas} nilai={baru.fasilitasId} teks={(f) => f.nama} sub={(f) => f.jenis} ubah={(id) => setBaru({ ...baru, fasilitasId: id })} />
              <Pilih label="Kegiatan" items={ref.kegiatan} nilai={baru.kegiatanId} teks={(k) => k.judul} sub={(k) => k.tanggal} ubah={(id) => setBaru({ ...baru, kegiatanId: id })} />
            </>
          )}
          <div className="space-y-1">
            <Label>RT terkait (dapat membaca rangkaian & menambah fakta)</Label>
            <div className="flex flex-wrap gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <Button key={n} type="button" size="sm" variant={baru.rtTerkait.includes(n) ? "default" : "outline"}
                  onClick={() => setBaru({ ...baru, rtTerkait: baru.rtTerkait.includes(n) ? baru.rtTerkait.filter((x) => x !== n) : [...baru.rtTerkait, n].sort() })}>{rt2(n)}</Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button disabled={baru.judul.trim().length < 3} onClick={async () => {
              try {
                const r = await wil<{ id: number }>("/api/wilayah/rw/surat-rangkaian", { ...RW, body: { ...baru, paket: baru.paket || null } });
                setBaru(null);
                await qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-rangkaian"] });
                await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat-referensi"] });
                buka(r.id);
              } catch (e) { setErr(e); }
            }}>Buat rangkaian</Button>
            <Button variant="ghost" onClick={() => setBaru(null)}>Batal</Button>
          </div>
        </div>
      )}
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada rangkaian.</p>}
      <ul className="divide-y border rounded-lg bg-white">
        {data?.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => buka(r.id)} className="w-full text-left p-3 hover:bg-muted/40">
              <p className="font-medium">{r.judul}</p>
              <p className="text-xs text-muted-foreground">
                {r.jenis}{r.paket ? ` · paket ${r.paket}` : ""} · {r.jumlah_terbit} terbit, {r.jumlah_draft} draft · {r.tindak_terbuka} tindak lanjut terbuka · {(r.rt_terkait ?? []).map(rt2).join(", ")}
                {r.status === "ditutup" ? " · ditutup" : ""}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
