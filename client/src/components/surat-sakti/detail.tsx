import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, Eye, FilePlus2, FileText, Inbox, Paperclip, PencilLine, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { bukaBerkas, unduh, wil } from "@/lib/wilayah-api";
import { KATALOG, PETA_JENIS, BENTUK_BANTUAN, rupiah, isoHariIni, type Blok } from "@shared/surat-sakti";
import { Galat, LencanaTindak, PratinjauBloks, RW, TigaStatus, bacaFile, rt2, tanggalId, type RingkasSurat } from "./dasar";
import { editorDariSurat, type StateEditor } from "./wizard";

interface Tindak {
  id: number; tindakan: string; status: string; progres: number; pic_nama: string | null; pic_rt: number | null; tenggat: string | null;
  evaluasi: string | null; ada_bukti: boolean; update: { id: number; progres: number; status: string; catatan: string; sumber: string; oleh: string; created_at: string; ada_bukti: boolean }[];
}
interface Detail extends RingkasSurat {
  pratinjau?: Blok[] | null; peringatanTerbit: string[]; validasi: { galat: string[]; peringatan: string[] } | null;
  lampiran: { id: number; nama: string; mime: string; ukuran: number }[];
  kirim: { id: number; kanal: string; penerima: string; status: string; catatan: string | null; ada_bukti: boolean; bukti_teks: string | null; dikirim_pada: string; diterima_pada: string | null }[];
  tindak: Tindak[];
  terkait: { id: number; nomor_surat: string | null; jenis_surat: string; perihal: string; status: string; induk_id: number | null; mengganti_id: number | null }[];
  masuk: { id: number; pengirim: string; nomor: string | null; tanggal: string; perihal: string; ringkasan: string | null; berkas_nama: string | null }[];
  bantuan: { id: number; tahap: string; uraian: string; jumlah: number | null; satuan: string | null; nominal: number | null; pemberi: string | null; tanggal: string; ada_bukti: boolean }[];
}

const sekarangLokal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function Bagian({ judul, children, aksi }: { judul: string; children: React.ReactNode; aksi?: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white p-3 sm:p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-[hsl(163,55%,22%)]">{judul}</h3>
        {aksi}
      </div>
      {children}
    </section>
  );
}

function BuktiInput({ nilai, ubah, setErr, label = "Bukti" }: { nilai: string; ubah: (v: string) => void; setErr: (e: unknown) => void; label?: string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      <Input placeholder={`${label}: keterangan (mis. diterima Bu Ani, staf TU)`} value={nilai.startsWith("data:") ? "(berkas terpilih)" : nilai}
        onChange={(e) => ubah(e.target.value)} />
      <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
        onChange={async (e) => { const f = e.target.files?.[0]; if (f) bacaFile(f).then(ubah).catch(setErr); }} />
    </div>
  );
}

export function DetailSurat({ id, tutup, ubahDraft, buka }: { id: number; tutup: () => void; ubahDraft: (s: StateEditor) => void; buka: (id: number) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const kunci = ["/api/wilayah/surat", id];
  const { data: s, error, isLoading } = useQuery<Detail>({ queryKey: kunci, queryFn: () => wil(`/api/wilayah/surat/${id}`, RW) });
  const [err, setErr] = useState<unknown>(null);
  const [sibuk, setSibuk] = useState(false);
  const [form, setForm] = useState<string | null>(null);
  const [kirim, setKirim] = useState({ kanal: "Diantar langsung", penerima: "", status: "diserahkan", bukti: "", catatan: "", dikirimPada: sekarangLokal() });
  const [terima, setTerima] = useState<{ id: number; bukti: string; waktu: string } | null>(null);
  const [tindak, setTindak] = useState({ tindakan: "", picNama: "", picRt: "", tenggat: "" });
  const [upd, setUpd] = useState<{ id: number; catatan: string; progres: string; status: string; bukti: string; dariPihakLuar: boolean } | null>(null);
  const [bantuan, setBantuan] = useState({ tahap: "dijanjikan", uraian: "", jumlah: "", satuan: "", nominal: "", pemberi: "", tanggal: isoHariIni(), bukti: "" });
  const [masuk, setMasuk] = useState({ pengirim: "", nomor: "", tanggal: isoHariIni(), perihal: "", ringkasan: "", berkas: "", berkasNama: "" });
  const [alasan, setAlasan] = useState("");
  const [lanjut, setLanjut] = useState("");

  const segarkan = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["/api/wilayah/surat"] }),
    qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat-ringkasan"] }),
    qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-tindak"] }),
    qc.invalidateQueries({ queryKey: ["/api/wilayah/surat-rangkaian"] }),
  ]);
  const jalankan = async (fn: () => Promise<unknown>, sukses?: string) => {
    setSibuk(true);
    setErr(null);
    try {
      await fn();
      await segarkan();
      if (sukses) toast({ title: sukses });
      return true;
    } catch (e) {
      setErr(e);
      return false;
    } finally {
      setSibuk(false);
    }
  };

  if (isLoading) return <p>Memuat…</p>;
  if (!s) return <div className="space-y-2"><Button variant="ghost" onClick={tutup}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button><Galat e={error} /></div>;

  const j = PETA_JENIS[s.kodeJenis ?? ""];
  const draft = s.status === "draft";
  const terbit = s.status === "terbit";
  const final = s.status !== "draft";
  const opsiLanjut = [...(j?.lanjutan ?? []).map((k) => PETA_JENIS[k]).filter(Boolean), ...KATALOG.filter((x) => !j?.lanjutan.includes(x.kode))];

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="sm" onClick={tutup}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold leading-tight">{s.perihal}</h2>
          <p className="text-sm text-muted-foreground">{s.nomorSurat ?? "Draft — belum bernomor"} · {j?.label ?? s.jenisSurat} · {tanggalId(s.tanggalSurat)}</p>
          <div className="mt-1"><TigaStatus s={s} /></div>
        </div>
      </div>
      <Galat e={err} />
      {s.alasanBatal && <p className="text-sm rounded border border-amber-300 bg-amber-50 p-2">{s.status === "digantikan" ? "Digantikan." : "Dibatalkan."} {s.alasanBatal}</p>}
      {!j && draft && <p className="text-sm rounded border border-amber-300 bg-amber-50 p-2">Draft format lama. Pilih jenis dokumen di formulir baru sebelum terbit.</p>}

      <div className="flex flex-wrap gap-2">
        {draft && <Button onClick={() => ubahDraft(editorDariSurat(s))}><PencilLine className="w-4 h-4 mr-1" /> Lanjutkan isi & terbitkan</Button>}
        {draft && <Button variant="outline" onClick={() => bukaBerkas(`/api/wilayah/rw/surat/${s.id}/pratinjau.pdf`, "rw").catch(setErr)}><Eye className="w-4 h-4 mr-1" /> PDF draf</Button>}
        {final && <Button onClick={() => bukaBerkas(`/api/wilayah/surat/${s.id}/pdf`, "rw").catch(setErr)}><Eye className="w-4 h-4 mr-1" /> Lihat PDF</Button>}
        {final && <Button variant="outline" onClick={() => unduh(`/api/wilayah/surat/${s.id}/pdf`, `${s.nomorSurat ?? s.id}.pdf`, "rw").catch(setErr)}><Download className="w-4 h-4 mr-1" /> Unduh PDF</Button>}
        {terbit && (
          <Button variant="outline" onClick={async () => {
            try {
              const { teks } = await wil<{ teks: string }>(`/api/wilayah/rw/surat/${s.id}/wa`, RW);
              await navigator.clipboard.writeText(teks);
              toast({ title: "Teks pengantar disalin", description: "Tempel di WhatsApp bersama PDF. Tidak ada pesan yang dikirim otomatis." });
            } catch (e) { setErr(e); }
          }}><Copy className="w-4 h-4 mr-1" /> Salin teks WA</Button>
        )}
        {draft && (
          <Button variant="ghost" className="text-red-700" disabled={sibuk} onClick={async () => {
            if (!confirm("Hapus draft ini? Permintaan RT terkait kembali ke antrean.")) return;
            if (await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}`, { ...RW, method: "DELETE" }), "Draft dihapus")) tutup();
          }}><Trash2 className="w-4 h-4 mr-1" /> Hapus draft</Button>
        )}
      </div>

      {terbit && (
        <Bagian judul={`Distribusi (${s.kirim.length})`} aksi={<Button size="sm" variant="outline" onClick={() => setForm(form === "kirim" ? null : "kirim")}><Send className="w-4 h-4 mr-1" /> Catat penyerahan</Button>}>
          {s.kirim.length === 0 && <p className="text-sm text-muted-foreground">Belum tercatat diserahkan. Terbit ≠ terkirim.</p>}
          <ul className="text-sm space-y-1">
            {s.kirim.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-2">
                <span>{tanggalId(k.dikirim_pada, true)} · {k.kanal} · {k.penerima}</span>
                <TigaStatus s={{ statusDokumen: "terbit", statusDistribusi: k.status as any, statusPekerjaan: "tidak_diperlukan", terlambat: 0 }} />
                {k.bukti_teks && <span className="text-muted-foreground">bukti: {k.bukti_teks}</span>}
                {k.ada_bukti && !k.bukti_teks && <button type="button" className="underline text-xs" onClick={() => bukaBerkas(`/api/wilayah/rw/surat-kirim/${k.id}/bukti`, "rw").catch(setErr)}>lihat bukti</button>}
                {k.catatan && <span className="text-muted-foreground">({k.catatan})</span>}
                {k.status === "diserahkan" && <button type="button" className="underline text-xs" onClick={() => setTerima({ id: k.id, bukti: "", waktu: sekarangLokal() })}>konfirmasi diterima</button>}
              </li>
            ))}
          </ul>
          {terima && (
            <div className="rounded border p-2 space-y-2 bg-stone-50">
              <Label>Konfirmasi penerimaan</Label>
              <Input type="datetime-local" value={terima.waktu} onChange={(e) => setTerima({ ...terima, waktu: e.target.value })} />
              <BuktiInput nilai={terima.bukti} ubah={(b) => setTerima({ ...terima, bukti: b })} setErr={setErr} label="Bukti terima" />
              <div className="flex gap-2">
                <Button size="sm" disabled={sibuk || terima.bukti.trim().length < 3} onClick={async () => {
                  if (await jalankan(() => wil(`/api/wilayah/rw/surat-kirim/${terima.id}/terima`, { ...RW, body: { diterimaPada: new Date(terima.waktu).toISOString(), bukti: terima.bukti } }), "Penerimaan dicatat")) setTerima(null);
                }}>Simpan</Button>
                <Button size="sm" variant="ghost" onClick={() => setTerima(null)}>Batal</Button>
              </div>
            </div>
          )}
          {form === "kirim" && (
            <div className="rounded border p-2 space-y-2 bg-stone-50">
              <div className="grid sm:grid-cols-3 gap-2">
                <select className="h-10 border rounded-md px-2 bg-white" value={kirim.kanal} onChange={(e) => setKirim({ ...kirim, kanal: e.target.value })}>
                  {["Diantar langsung", "WhatsApp", "Email", "Pos", "Lainnya"].map((k) => <option key={k}>{k}</option>)}
                </select>
                <select className="h-10 border rounded-md px-2 bg-white" value={kirim.status} onChange={(e) => setKirim({ ...kirim, status: e.target.value })}>
                  <option value="diserahkan">Sudah diserahkan/dikirim</option>
                  <option value="diterima">Diterima (ada konfirmasi)</option>
                  <option value="gagal">Gagal dikirim</option>
                </select>
                <Input type="datetime-local" value={kirim.dikirimPada} onChange={(e) => setKirim({ ...kirim, dikirimPada: e.target.value })} />
              </div>
              <Input placeholder="Penerima (nama / instansi)" value={kirim.penerima} onChange={(e) => setKirim({ ...kirim, penerima: e.target.value })} />
              {kirim.status !== "gagal" && <BuktiInput nilai={kirim.bukti} ubah={(b) => setKirim({ ...kirim, bukti: b })} setErr={setErr} />}
              {kirim.status === "gagal" && <Input placeholder="Penyebab gagal (wajib)" value={kirim.catatan} onChange={(e) => setKirim({ ...kirim, catatan: e.target.value })} />}
              <p className="text-xs text-muted-foreground">Penyerahan hanya tercatat bila ada bukti: tanda terima, foto, tangkapan layar, atau keterangan penerima.</p>
              <Button size="sm" disabled={sibuk || kirim.penerima.trim().length < 2 || (kirim.status === "gagal" ? kirim.catatan.trim().length < 3 : kirim.bukti.trim().length < 3)} onClick={async () => {
                const ok = await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/kirim`, {
                  ...RW, body: { kanal: kirim.kanal, penerima: kirim.penerima, status: kirim.status, bukti: kirim.status === "gagal" ? null : kirim.bukti, catatan: kirim.catatan || null, dikirimPada: new Date(kirim.dikirimPada).toISOString() },
                }), "Distribusi dicatat");
                if (ok) { setForm(null); setKirim({ ...kirim, penerima: "", bukti: "", catatan: "" }); }
              }}>Simpan catatan distribusi</Button>
            </div>
          )}
        </Bagian>
      )}

      {final && (
        <Bagian judul={`Tindak lanjut (${s.tindak.length})`} aksi={terbit && <Button size="sm" variant="outline" onClick={() => setForm(form === "tindak" ? null : "tindak")}>+ Tindak lanjut</Button>}>
          {s.tindak.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada pekerjaan yang dicatat untuk dokumen ini.</p>}
          <ul className="space-y-2">
            {s.tindak.map((t) => (
              <li key={t.id} className="rounded border p-2 text-sm space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.tindakan}</span>
                  <LencanaTindak status={t.status} terlambat={!!t.tenggat && t.tenggat < isoHariIni() && (t.status === "menunggu" || t.status === "berjalan")} />
                </div>
                <p className="text-xs text-muted-foreground">PIC: {t.pic_nama ?? "-"}{t.pic_rt ? ` (${rt2(t.pic_rt)} dapat melapor)` : ""} · tenggat {t.tenggat ?? "-"} · progres {t.progres ?? 0}%</p>
                {t.update.length > 0 && (
                  <ul className="text-xs border-l-2 pl-2 space-y-0.5">
                    {t.update.map((u) => (
                      <li key={u.id}>{tanggalId(u.created_at, true)} · {u.sumber === "rt" ? "laporan RT" : u.sumber === "pihak_luar_dicatat" ? "dicatat dari pihak luar" : "RW"} · {u.progres}% · {u.catatan}
                        {u.ada_bukti && <button type="button" className="underline ml-1" onClick={() => bukaBerkas(`/api/wilayah/surat-tindak-update/${u.id}/bukti`, "rw").catch(setErr)}>bukti</button>}</li>
                    ))}
                  </ul>
                )}
                {t.evaluasi && <p className="text-xs"><b>Evaluasi:</b> {t.evaluasi}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="underline text-xs" onClick={() => setUpd({ id: t.id, catatan: "", progres: String(t.progres ?? 0), status: t.status, bukti: "", dariPihakLuar: false })}>perbarui</button>
                  {t.status === "selesai" && !t.evaluasi && <button type="button" className="underline text-xs" onClick={async () => {
                    const e = prompt("Evaluasi singkat hasil pekerjaan:");
                    if (e) await jalankan(() => wil(`/api/wilayah/rw/surat-tindak/${t.id}/evaluasi`, { ...RW, body: { evaluasi: e } }), "Evaluasi dicatat");
                  }}>evaluasi</button>}
                </div>
                {upd?.id === t.id && (
                  <div className="rounded border p-2 space-y-2 bg-stone-50">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <select className="h-10 border rounded-md px-2 bg-white" value={upd.status} onChange={(e) => setUpd({ ...upd, status: e.target.value })}>
                        <option value="menunggu">Menunggu</option><option value="berjalan">Berjalan</option><option value="selesai">Selesai</option><option value="tidak_diperlukan">Tidak diperlukan</option>
                      </select>
                      <Input inputMode="numeric" placeholder="Progres %" value={upd.progres} onChange={(e) => setUpd({ ...upd, progres: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                    </div>
                    <Textarea rows={2} placeholder="Catatan progres (apa yang sudah dikerjakan)" value={upd.catatan} onChange={(e) => setUpd({ ...upd, catatan: e.target.value })} />
                    <BuktiInput nilai={upd.bukti} ubah={(b) => setUpd({ ...upd, bukti: b })} setErr={setErr} />
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={upd.dariPihakLuar} onChange={(e) => setUpd({ ...upd, dariPihakLuar: e.target.checked })} /> Laporan ini dari pihak luar/pengurus tanpa akun (dicatat RW)</label>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={sibuk || upd.catatan.trim().length < 3} onClick={async () => {
                        const ok = await jalankan(() => wil(`/api/wilayah/surat-tindak/${upd.id}/update`, {
                          ...RW, body: { catatan: upd.catatan, status: upd.status, progres: Math.min(100, Number(upd.progres) || 0), bukti: upd.bukti || null, dariPihakLuar: upd.dariPihakLuar },
                        }), "Progres dicatat");
                        if (ok) setUpd(null);
                      }}>Simpan</Button>
                      <Button size="sm" variant="ghost" onClick={() => setUpd(null)}>Batal</Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {form === "tindak" && (
            <div className="rounded border p-2 space-y-2 bg-stone-50">
              <Input placeholder="Tindakan (mis. Tanyakan jadwal survei ke Dinas PUPR)" value={tindak.tindakan} onChange={(e) => setTindak({ ...tindak, tindakan: e.target.value })} />
              <div className="grid sm:grid-cols-3 gap-2">
                <Input placeholder="PIC (nama/jabatan)" value={tindak.picNama} onChange={(e) => setTindak({ ...tindak, picNama: e.target.value })} />
                <select className="h-10 border rounded-md px-2 bg-white" value={tindak.picRt} onChange={(e) => setTindak({ ...tindak, picRt: e.target.value })}>
                  <option value="">PIC bukan Ketua RT</option>
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>Ketua {rt2(n)} (melapor dari akun RT)</option>)}
                </select>
                <Input type="date" value={tindak.tenggat} onChange={(e) => setTindak({ ...tindak, tenggat: e.target.value })} />
              </div>
              <Button size="sm" disabled={sibuk || tindak.tindakan.trim().length < 3 || tindak.picNama.trim().length < 2} onClick={async () => {
                const ok = await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/tindak`, {
                  ...RW, body: { tindakan: tindak.tindakan, picNama: tindak.picNama, picRt: tindak.picRt ? Number(tindak.picRt) : null, picJenis: tindak.picRt ? "rt" : null, tenggat: tindak.tenggat || null },
                }), "Tindak lanjut ditambahkan");
                if (ok) { setForm(null); setTindak({ tindakan: "", picNama: "", picRt: "", tenggat: "" }); }
              }}>Simpan tindak lanjut</Button>
            </div>
          )}
        </Bagian>
      )}

      {final && (j?.kategori === "D" || s.bantuan.length > 0) && (
        <Bagian judul="Dukungan / bantuan (per tahap)" aksi={<Button size="sm" variant="outline" onClick={() => setForm(form === "bantuan" ? null : "bantuan")}>+ Catat tahap</Button>}>
          <p className="text-xs text-muted-foreground">Tahap dimohonkan, dijanjikan, diterima, dan digunakan dicatat terpisah. Yang dimohonkan atau dijanjikan bukan pemasukan.</p>
          <ul className="text-sm space-y-1">
            {s.bantuan.map((b) => (
              <li key={b.id}><b className="capitalize">{b.tahap}</b> · {b.tanggal} · {b.uraian}{b.jumlah != null ? ` · ${b.jumlah} ${b.satuan ?? ""}` : ""}{b.nominal != null ? ` · ${rupiah(Number(b.nominal))}` : ""}{b.pemberi ? ` · dari ${b.pemberi}` : ""}{b.ada_bukti ? " · ada bukti" : ""}</li>
            ))}
          </ul>
          {form === "bantuan" && (
            <div className="rounded border p-2 space-y-2 bg-stone-50">
              <div className="grid sm:grid-cols-3 gap-2">
                <select className="h-10 border rounded-md px-2 bg-white" value={bantuan.tahap} onChange={(e) => setBantuan({ ...bantuan, tahap: e.target.value })}>
                  <option value="dimohonkan">Dimohonkan</option><option value="dijanjikan">Dijanjikan</option><option value="diterima">Diterima</option><option value="digunakan">Digunakan</option>
                </select>
                <Input type="date" value={bantuan.tanggal} onChange={(e) => setBantuan({ ...bantuan, tanggal: e.target.value })} />
                <Input placeholder="Pemberi" value={bantuan.pemberi} onChange={(e) => setBantuan({ ...bantuan, pemberi: e.target.value })} />
              </div>
              <Input list="bentuk-bantuan" placeholder="Uraian (mis. Paving bekas 200 buah)" value={bantuan.uraian} onChange={(e) => setBantuan({ ...bantuan, uraian: e.target.value })} />
              <datalist id="bentuk-bantuan">{BENTUK_BANTUAN.map((b) => <option key={b} value={b} />)}</datalist>
              <div className="grid grid-cols-3 gap-2">
                <Input inputMode="decimal" placeholder="Jumlah" value={bantuan.jumlah} onChange={(e) => setBantuan({ ...bantuan, jumlah: e.target.value.replace(/[^\d.]/g, "") })} />
                <Input placeholder="Satuan" value={bantuan.satuan} onChange={(e) => setBantuan({ ...bantuan, satuan: e.target.value })} />
                <Input inputMode="numeric" placeholder="Nominal Rp (bila pasti)" value={bantuan.nominal} onChange={(e) => setBantuan({ ...bantuan, nominal: e.target.value.replace(/\D/g, "") })} />
              </div>
              {(bantuan.tahap === "diterima" || bantuan.tahap === "digunakan") && <BuktiInput nilai={bantuan.bukti} ubah={(b) => setBantuan({ ...bantuan, bukti: b })} setErr={setErr} label="Bukti (BA/tanda terima/nota)" />}
              <Button size="sm" disabled={sibuk || bantuan.uraian.trim().length < 3} onClick={async () => {
                const ok = await jalankan(() => wil("/api/wilayah/rw/surat-bantuan", {
                  ...RW, body: {
                    suratId: s.id, rangkaianId: s.rangkaianId, tahap: bantuan.tahap, uraian: bantuan.uraian, tanggal: bantuan.tanggal, pemberi: bantuan.pemberi || null,
                    jumlah: bantuan.jumlah ? Number(bantuan.jumlah) : null, satuan: bantuan.satuan || null, nominal: bantuan.nominal ? Number(bantuan.nominal) : null, bukti: bantuan.bukti || null,
                  },
                }), "Tahap bantuan dicatat");
                if (ok) { setForm(null); setBantuan({ ...bantuan, uraian: "", jumlah: "", nominal: "", bukti: "" }); }
              }}>Simpan</Button>
            </div>
          )}
        </Bagian>
      )}

      {final && (
        <Bagian judul={`Surat masuk / balasan (${s.masuk.length})`} aksi={<Button size="sm" variant="outline" onClick={() => setForm(form === "masuk" ? null : "masuk")}><Inbox className="w-4 h-4 mr-1" /> Catat balasan</Button>}>
          <ul className="text-sm space-y-1">
            {s.masuk.map((m) => (
              <li key={m.id}>{m.tanggal} · <b>{m.pengirim}</b>{m.nomor ? ` (${m.nomor})` : ""} · {m.perihal}{m.ringkasan ? ` — ${m.ringkasan}` : ""}
                {m.berkas_nama && <button type="button" className="underline ml-1 text-xs" onClick={() => bukaBerkas(`/api/wilayah/rw/surat-masuk/${m.id}/berkas`, "rw").catch(setErr)}>berkas</button>}</li>
            ))}
          </ul>
          {form === "masuk" && (
            <div className="rounded border p-2 space-y-2 bg-stone-50">
              <div className="grid sm:grid-cols-3 gap-2">
                <Input placeholder="Pengirim" value={masuk.pengirim} onChange={(e) => setMasuk({ ...masuk, pengirim: e.target.value })} />
                <Input placeholder="Nomor surat (bila ada)" value={masuk.nomor} onChange={(e) => setMasuk({ ...masuk, nomor: e.target.value })} />
                <Input type="date" value={masuk.tanggal} onChange={(e) => setMasuk({ ...masuk, tanggal: e.target.value })} />
              </div>
              <Input placeholder="Perihal" value={masuk.perihal} onChange={(e) => setMasuk({ ...masuk, perihal: e.target.value })} />
              <Textarea rows={2} placeholder="Ringkasan isi balasan" value={masuk.ringkasan} onChange={(e) => setMasuk({ ...masuk, ringkasan: e.target.value })} />
              <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) bacaFile(f).then((b) => setMasuk({ ...masuk, berkas: b, berkasNama: f.name })).catch(setErr);
              }} />
              <Button size="sm" disabled={sibuk || masuk.pengirim.trim().length < 2 || masuk.perihal.trim().length < 3} onClick={async () => {
                const ok = await jalankan(() => wil("/api/wilayah/rw/surat-masuk", {
                  ...RW, body: { membalasId: s.id, pengirim: masuk.pengirim, nomor: masuk.nomor || null, tanggal: masuk.tanggal, perihal: masuk.perihal, ringkasan: masuk.ringkasan || null, berkas: masuk.berkas || null, berkasNama: masuk.berkasNama || null },
                }), "Surat masuk dicatat");
                if (ok) { setForm(null); setMasuk({ pengirim: "", nomor: "", tanggal: isoHariIni(), perihal: "", ringkasan: "", berkas: "", berkasNama: "" }); }
              }}>Simpan</Button>
            </div>
          )}
        </Bagian>
      )}

      <Bagian judul={`Lampiran (${s.lampiran.length})`}>
        <ul className="text-sm space-y-1">
          {s.lampiran.map((l) => (
            <li key={l.id} className="flex items-center gap-2">
              <Paperclip className="w-4 h-4" />
              <button type="button" className="underline" onClick={() => bukaBerkas(`/api/wilayah/surat-lampiran/${l.id}`, "rw").catch(setErr)}>{l.nama}</button>
              {draft && <button type="button" aria-label="Hapus lampiran" className="text-red-600" onClick={() => jalankan(() => wil(`/api/wilayah/rw/surat-lampiran/${l.id}`, { ...RW, method: "DELETE" }))}><Trash2 className="w-4 h-4" /></button>}
            </li>
          ))}
        </ul>
        {draft ? (
          <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const data = await bacaFile(f);
              await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/lampiran`, { ...RW, body: { nama: f.name, data } }), "Lampiran ditambahkan");
            } catch (x) { setErr(x); }
            e.target.value = "";
          }} />
        ) : <p className="text-xs text-muted-foreground">Lampiran dokumen final tidak dapat diubah.</p>}
      </Bagian>

      {final && (
        <Bagian judul="Langkah berikutnya">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[14rem] space-y-1">
              <Label>Buat dokumen lanjutan (dalam rangkaian yang sama)</Label>
              <select className="h-10 w-full border rounded-md px-2 bg-white" value={lanjut} onChange={(e) => setLanjut(e.target.value)}>
                <option value="">— pilih jenis —</option>
                {opsiLanjut.map((x, i) => <option key={x.kode} value={x.kode}>{i < (j?.lanjutan.length ?? 0) ? "★ " : ""}{x.label}</option>)}
              </select>
            </div>
            <Button disabled={!lanjut || sibuk} onClick={async () => {
              setSibuk(true);
              try {
                const r = await wil<any>(`/api/wilayah/rw/surat/${s.id}/lanjutan`, { ...RW, body: { kode: lanjut } });
                await segarkan();
                if (r.sudahAda) toast({ title: "Draft lanjutan jenis ini sudah ada", description: "Membuka draft yang sama, tidak membuat ganda." });
                ubahDraft(editorDariSurat(r));
              } catch (e) { setErr(e); } finally { setSibuk(false); }
            }}><FilePlus2 className="w-4 h-4 mr-1" /> Buat lanjutan</Button>
          </div>
          {terbit && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <Button variant="outline" disabled={sibuk} onClick={async () => {
                setSibuk(true);
                try {
                  const r = await wil<any>(`/api/wilayah/rw/surat/${s.id}/pengganti`, { ...RW, body: {} });
                  await segarkan();
                  ubahDraft(editorDariSurat(r));
                } catch (e) { setErr(e); } finally { setSibuk(false); }
              }}><FileText className="w-4 h-4 mr-1" /> Koreksi (buat pengganti)</Button>
              <div className="flex flex-1 min-w-[16rem] gap-2">
                <Input placeholder="Alasan pembatalan" value={alasan} onChange={(e) => setAlasan(e.target.value)} />
                <Button variant="outline" className="text-red-700" disabled={sibuk || alasan.trim().length < 5} onClick={async () => {
                  if (!confirm("Batalkan dokumen ini? Nomor dan arsip tetap tersimpan.")) return;
                  if (await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/batal`, { ...RW, body: { alasan } }), "Dokumen dibatalkan")) setAlasan("");
                }}><XCircle className="w-4 h-4 mr-1" /> Batalkan</Button>
              </div>
            </div>
          )}
          {s.terkait.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium">Dokumen terkait</p>
              <ul className="text-sm">
                {s.terkait.map((t) => (
                  <li key={t.id}><button type="button" className="underline text-left" onClick={() => buka(t.id)}>
                    {t.id === s.indukId ? "Induk: " : t.id === s.menggantiId ? "Menggantikan: " : t.mengganti_id === s.id ? "Pengganti: " : "Lanjutan: "}
                    {t.nomor_surat ?? "draft"} · {t.jenis_surat} · {t.perihal} ({t.status})
                  </button></li>
                ))}
              </ul>
            </div>
          )}
        </Bagian>
      )}

      {s.peringatanTerbit.length > 0 && <p className="text-xs text-amber-800">Peringatan saat terbit: {s.peringatanTerbit.join("; ")}</p>}
      {s.pratinjau && (
        <details className="rounded-lg border bg-white">
          <summary className="cursor-pointer p-3 text-sm font-medium">Isi dokumen{final ? " (snapshot final)" : " (pratinjau draf)"}</summary>
          <div className="p-2"><PratinjauBloks bloks={s.pratinjau} draft={draft} /></div>
        </details>
      )}
    </div>
  );
}
