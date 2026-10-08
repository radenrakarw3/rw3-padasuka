import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, FileText, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useKirimSekali, wil } from "@/lib/wilayah-api";
import { generateSuratPDF } from "@/lib/pdf-surat";
import { generateIsiSurat, jenisSuratConfigs } from "./surat-rw";
import { isoTanggal } from "@shared/wilayah";

const RW = { peran: "rw" as const };
const rt2 = (rt: number) => `RT ${String(rt).padStart(2, "0")}`;

interface Surat {
  id: number; nomorSurat: string | null; jenisSurat: string; perihal: string; tujuan: string | null; isiSurat: string | null; tanggalSurat: string | null;
  status: string; dataForm: Record<string, string> | null; kejadianId: number | null; kegiatanId: number | null; permintaanId: number | null;
  menggantiId: number | null; alasanBatal: string | null; jumlahKirim?: number; tindakTerbuka?: number;
  lampiran?: { id: number; nama: string; mime: string }[]; kirim?: { id: number; kanal: string; penerima: string; bukti: string; dikirim_pada: string }[];
  tindak?: { id: number; catatan: string; status: string; tenggat: string | null }[]; pengganti?: { id: number; nomor_surat: string | null; status: string }[];
}

function Galat({ e }: { e: unknown }) {
  return e ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{e instanceof Error ? e.message : String(e)}</p> : null;
}

function bacaFile(f: File): Promise<string> {
  return new Promise((ok, gagal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => gagal(new Error("Gagal membaca berkas"));
    r.readAsDataURL(f);
  });
}

// ---------------------------------------------------------------- Buat / ubah draft
function Editor({ awal, selesai }: { awal: Partial<Surat> & { prefill?: Record<string, string> }; selesai: (s: Surat | null) => void }) {
  const qc = useQueryClient();
  const [langkah, setLangkah] = useState<"tujuan" | "form" | "pratinjau">(awal.jenisSurat ? "form" : "tujuan");
  const [jenis, setJenis] = useState(awal.jenisSurat ?? "");
  const [perihal, setPerihal] = useState(awal.perihal ?? "");
  const [f, setF] = useState<Record<string, string>>({ tanggalSurat: isoTanggal(new Date()), ...(awal.dataForm ?? {}), ...(awal.prefill ?? {}) });
  const [id, setId] = useState<number | null>(awal.id ?? null);
  const [err, setErr] = useState<unknown>(null);
  const cfg = jenisSuratConfigs.find((c) => c.value === jenis);
  const isi = useMemo(() => (jenis && perihal ? generateIsiSurat(jenis, perihal, f) : ""), [jenis, perihal, f]);
  const valid = !!cfg && perihal.trim().length >= 3 && cfg.fields.filter((x) => x.required).every((x) => (f[x.key] ?? "").trim());

  const simpan = useKirimSekali(async () => {
    const body = {
      jenisSurat: jenis, perihal, tujuan: f.tujuan || null, tanggalSurat: f.tanggalSurat || isoTanggal(new Date()), isiSurat: isi, dataForm: f,
      kejadianId: awal.kejadianId ?? null, kegiatanId: awal.kegiatanId ?? null, permintaanId: awal.permintaanId ?? null,
    };
    const s = await wil<Surat>(id ? `/api/wilayah/rw/surat/${id}` : "/api/wilayah/rw/surat", { ...RW, method: id ? "PATCH" : "POST", body });
    setId(s.id);
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat"] });
    return s;
  });
  const terbit = useKirimSekali(async () => {
    const s = id ? { id } : await simpan.kirim();
    if (!s) throw new Error(simpan.error ?? "Draft belum tersimpan");
    if (id) await wil(`/api/wilayah/rw/surat/${id}`, { ...RW, method: "PATCH", body: { jenisSurat: jenis, perihal, tujuan: f.tujuan || null, tanggalSurat: f.tanggalSurat, isiSurat: isi, dataForm: f, kejadianId: awal.kejadianId ?? null, kegiatanId: awal.kegiatanId ?? null, permintaanId: awal.permintaanId ?? null } });
    const r = await wil<{ id: number; nomorSurat: string }>(`/api/wilayah/rw/surat/${s.id}/terbit`, { ...RW, body: {} });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat"] });
    return r;
  });

  if (langkah === "tujuan") {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold">1. Pilih tujuan surat</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {jenisSuratConfigs.map((c) => (
            <button key={c.value} type="button" onClick={() => { setJenis(c.value); setLangkah("form"); }} className={`border rounded-lg p-3 text-left hover:bg-muted ${jenis === c.value ? "border-primary" : ""}`}>
              <p className="font-medium">{c.label}</p><p className="text-xs text-muted-foreground">{c.perihalPlaceholder}</p>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={() => selesai(null)}>Batal</Button>
      </div>
    );
  }
  if (langkah === "form" && cfg) {
    return (
      <div className="space-y-3 max-w-2xl">
        <h3 className="font-semibold">2. Isi {cfg.label}</h3>
        {awal.kejadianId && <p className="text-xs text-muted-foreground">Terkait masalah #{awal.kejadianId}</p>}
        {awal.permintaanId && <p className="text-xs text-muted-foreground">Menjawab permintaan RT #{awal.permintaanId}</p>}
        <div><Label>{cfg.perihalLabel}</Label><Input value={perihal} placeholder={cfg.perihalPlaceholder} onChange={(e) => setPerihal(e.target.value)} /></div>
        {cfg.fields.map((x) => (
          <div key={x.key}>
            <Label>{x.label}{x.required ? " *" : ""}</Label>
            {x.type === "textarea"
              ? <Textarea value={f[x.key] ?? ""} placeholder={x.placeholder} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />
              : <Input type={x.type ?? "text"} value={f[x.key] ?? ""} placeholder={x.placeholder} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />}
          </div>
        ))}
        <Galat e={simpan.error} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => (id ? selesai(null) : setLangkah("tujuan"))}>Kembali</Button>
          <Button variant="outline" disabled={!valid || simpan.mengirim} onClick={async () => { if (await simpan.kirim()) setErr(null); }}>{id ? "Simpan draft" : "Simpan sebagai draft"}</Button>
          <Button disabled={!valid} onClick={() => setLangkah("pratinjau")}>3. Pratinjau</Button>
        </div>
        {id && <LampiranDraft suratId={id} />}
      </div>
    );
  }
  return (
    <div className="space-y-3 max-w-3xl">
      <h3 className="font-semibold">3. Pratinjau</h3>
      <p className="text-xs text-muted-foreground">Nomor surat diberikan otomatis saat terbit. Setelah terbit, isi surat tidak dapat diubah; koreksi dilakukan dengan surat pengganti.</p>
      <pre className="whitespace-pre-wrap text-sm border rounded-lg p-4 bg-white font-serif">{isi}</pre>
      <Galat e={terbit.error || err} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setLangkah("form")}>Ubah</Button>
        <Button variant="outline" disabled={simpan.mengirim} onClick={() => simpan.kirim()}>Simpan draft</Button>
        <Button disabled={terbit.mengirim} onClick={async () => {
          if (!confirm("Terbitkan surat? Nomor akan dialokasikan dan isi tidak dapat diubah.")) return;
          const r = await terbit.kirim();
          if (r) selesai(await wil<Surat>(`/api/wilayah/rw/surat/${r.id}`, RW));
        }}><FileText className="w-4 h-4 mr-1" /> Terbitkan</Button>
      </div>
    </div>
  );
}

function LampiranDraft({ suratId }: { suratId: number }) {
  const qc = useQueryClient();
  const key = [`/api/wilayah/rw/surat/${suratId}`];
  const { data } = useQuery<Surat>({ queryKey: key, queryFn: () => wil(`/api/wilayah/rw/surat/${suratId}`, RW) });
  const [err, setErr] = useState<unknown>(null);
  return (
    <div className="border rounded-lg p-3 space-y-2">
      <p className="font-medium text-sm flex items-center gap-1"><Paperclip className="w-4 h-4" /> Lampiran (foto/PDF, maks ±3 MB)</p>
      <ul className="text-sm">{data?.lampiran?.map((l) => (
        <li key={l.id} className="flex justify-between">{l.nama}
          <button type="button" className="text-red-700 text-xs" onClick={async () => { try { await wil(`/api/wilayah/rw/surat-lampiran/${l.id}`, { ...RW, method: "DELETE" }); await qc.invalidateQueries({ queryKey: key }); } catch (e) { setErr(e); } }}>hapus</button>
        </li>))}
      </ul>
      <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setErr(null);
        try {
          if (file.size > 3_000_000) throw new Error("Berkas terlalu besar (maks 3 MB)");
          await wil(`/api/wilayah/rw/surat/${suratId}/lampiran`, { ...RW, body: { nama: file.name, data: await bacaFile(file) } });
          await qc.invalidateQueries({ queryKey: key });
        } catch (er) { setErr(er); }
      }} />
      <Galat e={err} />
    </div>
  );
}

// ---------------------------------------------------------------- Detail surat terbit
function Detail({ id, ubahDraft, tutup }: { id: number; ubahDraft: (s: Surat) => void; tutup: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const key = [`/api/wilayah/rw/surat/${id}`];
  const { data: s, error } = useQuery<Surat>({ queryKey: key, queryFn: () => wil(`/api/wilayah/rw/surat/${id}`, RW) });
  const [kirim, setKirim] = useState({ kanal: "Diantar langsung", penerima: "", bukti: "", dikirimPada: new Date().toISOString().slice(0, 16) });
  const [tindak, setTindak] = useState({ catatan: "", tenggat: "" });
  const [err, setErr] = useState<unknown>(null);
  const segar = () => Promise.all([qc.invalidateQueries({ queryKey: key }), qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat"] })]);
  const jalankan = async (fn: () => Promise<unknown>) => { setErr(null); try { await fn(); await segar(); return true; } catch (e) { setErr(e); return false; } };
  if (error) return <Galat e={error} />;
  if (!s) return <p>Memuat…</p>;
  const terbit = s.status === "terbit";
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h3 className="font-semibold">{s.jenisSurat}: {s.perihal}</h3>
          <p className="text-sm text-muted-foreground">{s.nomorSurat ?? "Draft (belum bernomor)"} · {s.status}{s.alasanBatal ? ` · ${s.alasanBatal}` : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={tutup}>Tutup</Button>
      </div>
      <Galat e={err} />
      <div className="flex flex-wrap gap-2">
        {s.status === "draft" && <Button onClick={() => ubahDraft(s)}>Lanjutkan draft</Button>}
        {s.status === "draft" && <Button variant="outline" onClick={() => jalankan(async () => { if (confirm("Hapus draft?")) { await wil(`/api/wilayah/rw/surat/${s.id}`, { ...RW, method: "DELETE" }); tutup(); } })}>Hapus draft</Button>}
        {s.isiSurat && s.status !== "draft" && (
          <Button variant="outline" onClick={() => generateSuratPDF({ id: s.id, nomorSurat: s.nomorSurat, isiSurat: s.isiSurat!, jenisSurat: s.jenisSurat, tanggalSurat: s.tanggalSurat, fileName: `${s.jenisSurat.replace(/\s/g, "_")}_${s.nomorSurat?.replace(/\//g, "-") ?? s.id}` }).catch(() => toast({ title: "Gagal membuat PDF", variant: "destructive" }))}>
            <Download className="w-4 h-4 mr-1" /> PDF
          </Button>
        )}
        {terbit && <Button variant="outline" onClick={() => jalankan(async () => { const r = await wil<{ teks: string }>(`/api/wilayah/rw/surat/${s.id}/wa`, RW); await navigator.clipboard.writeText(r.teks); toast({ title: "Ringkasan WA disalin", description: "Tempel di WhatsApp. Pengiriman belum tercatat sampai Anda mencatat bukti." }); })}><Copy className="w-4 h-4 mr-1" /> Salin ringkasan WA</Button>}
        {terbit && <Button variant="outline" onClick={() => jalankan(async () => { const p = await wil<Surat>(`/api/wilayah/rw/surat/${s.id}/pengganti`, { ...RW, body: {} }); ubahDraft(p); })}>Koreksi (buat pengganti)</Button>}
        {terbit && <Button variant="outline" onClick={() => { const a = prompt("Alasan pembatalan:"); if (a) jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/batal`, { ...RW, body: { alasan: a } })); }}>Batalkan</Button>}
      </div>
      {s.lampiran && s.lampiran.length > 0 && (
        <p className="text-sm">Lampiran: {s.lampiran.map((l) => <a key={l.id} className="underline mr-2" href={`/api/wilayah/rw/surat-lampiran/${l.id}`} target="_blank" rel="noreferrer">{l.nama}</a>)}</p>
      )}
      {s.pengganti && s.pengganti.length > 0 && <p className="text-sm">Pengganti: {s.pengganti.map((p) => `${p.nomor_surat ?? "draft"} (${p.status})`).join(", ")}</p>}

      {terbit && (
        <section className="border rounded-lg p-3 space-y-2">
          <h4 className="font-medium">Pengiriman tercatat ({s.kirim?.length ?? 0})</h4>
          <ul className="text-sm">{s.kirim?.map((k) => <li key={k.id}>• {new Date(k.dikirim_pada).toLocaleString("id-ID")} · {k.kanal} · {k.penerima} · bukti: {k.bukti.startsWith("data:") ? "berkas" : k.bukti}</li>)}</ul>
          <p className="text-xs text-muted-foreground">Status “terkirim” hanya tercatat bila ada bukti (tanda terima, foto, tangkapan layar, atau keterangan penerima).</p>
          <div className="grid sm:grid-cols-2 gap-2">
            <select className="h-10 border rounded-md px-2" value={kirim.kanal} onChange={(e) => setKirim({ ...kirim, kanal: e.target.value })}>
              {["Diantar langsung", "WhatsApp", "Email", "Pos", "Lainnya"].map((k) => <option key={k}>{k}</option>)}
            </select>
            <Input placeholder="Penerima" value={kirim.penerima} onChange={(e) => setKirim({ ...kirim, penerima: e.target.value })} />
            <Input type="datetime-local" value={kirim.dikirimPada} onChange={(e) => setKirim({ ...kirim, dikirimPada: e.target.value })} />
            <Input placeholder="Bukti (keterangan) atau pilih berkas →" value={kirim.bukti.startsWith("data:") ? "(berkas terpilih)" : kirim.bukti} onChange={(e) => setKirim({ ...kirim, bukti: e.target.value })} />
            <Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { if (file.size > 2_000_000) return setErr(new Error("Bukti maks 2 MB")); setKirim({ ...kirim, bukti: await bacaFile(file) }); } }} />
          </div>
          <Button disabled={kirim.penerima.trim().length < 2 || kirim.bukti.trim().length < 3} onClick={async () => {
            if (await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/kirim`, { ...RW, body: { ...kirim, dikirimPada: new Date(kirim.dikirimPada).toISOString() } }))) setKirim({ ...kirim, penerima: "", bukti: "" });
          }}><Send className="w-4 h-4 mr-1" /> Catat pengiriman</Button>
        </section>
      )}

      {terbit && (
        <section className="border rounded-lg p-3 space-y-2">
          <h4 className="font-medium">Tindak lanjut</h4>
          <ul className="text-sm">{s.tindak?.map((t) => (
            <li key={t.id} className="flex justify-between gap-2">• {t.catatan}{t.tenggat ? ` (tenggat ${t.tenggat})` : ""} · {t.status}
              {t.status === "menunggu" && <button type="button" className="text-xs underline" onClick={() => jalankan(() => wil(`/api/wilayah/rw/surat-tindak/${t.id}/selesai`, { ...RW, body: {} }))}>selesai</button>}
            </li>))}
          </ul>
          <div className="grid sm:grid-cols-3 gap-2">
            <Input className="sm:col-span-2" placeholder="Catatan tindak lanjut" value={tindak.catatan} onChange={(e) => setTindak({ ...tindak, catatan: e.target.value })} />
            <Input type="date" value={tindak.tenggat} onChange={(e) => setTindak({ ...tindak, tenggat: e.target.value })} />
          </div>
          <Button variant="outline" disabled={tindak.catatan.trim().length < 3} onClick={async () => {
            if (await jalankan(() => wil(`/api/wilayah/rw/surat/${s.id}/tindak`, { ...RW, body: { catatan: tindak.catatan, tenggat: tindak.tenggat || null } }))) setTindak({ catatan: "", tenggat: "" });
          }}>Tambah tindak lanjut</Button>
        </section>
      )}
      {s.isiSurat && <pre className="whitespace-pre-wrap text-sm border rounded-lg p-4 bg-white font-serif">{s.isiSurat}</pre>}
    </div>
  );
}

function Daftar({ bagian, buka }: { bagian: string; buka: (id: number) => void }) {
  const [cari, setCari] = useState("");
  const { data, isLoading, error } = useQuery<Surat[]>({ queryKey: ["/api/wilayah/rw/surat", bagian, cari], queryFn: () => wil(`/api/wilayah/rw/surat?bagian=${bagian}&cari=${encodeURIComponent(cari)}`, RW) });
  return (
    <div className="space-y-2">
      {bagian === "arsip" && <Input placeholder="Cari nomor, perihal, tujuan…" value={cari} onChange={(e) => setCari(e.target.value)} className="max-w-md" />}
      {isLoading && <p>Memuat…</p>}
      <Galat e={error} />
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada.</p>}
      <ul className="divide-y border rounded-lg">
        {data?.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => buka(s.id)} className="w-full text-left p-3 hover:bg-muted/40">
              <p className="font-medium">{s.perihal}</p>
              <p className="text-xs text-muted-foreground">{s.nomorSurat ?? "Draft"} · {s.jenisSurat} · {s.status}{s.tujuan ? ` · ${s.tujuan}` : ""}
                {s.status === "terbit" ? ` · ${s.jumlahKirim ? `${s.jumlahKirim}× tercatat dikirim` : "belum tercatat dikirim"}${s.tindakTerbuka ? ` · ${s.tindakTerbuka} tindak lanjut terbuka` : ""}` : ""}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PermintaanRt({ buat }: { buat: (p: any) => void }) {
  const qc = useQueryClient();
  const { data, error } = useQuery<any[]>({ queryKey: ["/api/wilayah/permintaan-surat", "rw"], queryFn: () => wil("/api/wilayah/permintaan-surat", RW) });
  const [err, setErr] = useState<unknown>(null);
  return (
    <div className="space-y-2">
      <Galat e={error || err} />
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada permintaan.</p>}
      <ul className="divide-y border rounded-lg">
        {data?.map((p) => (
          <li key={p.id} className="p-3 space-y-1">
            <p className="font-medium">{rt2(p.rt)} · {p.jenis_surat}: {p.perihal}</p>
            <p className="text-sm">{p.uraian}</p>
            <p className="text-xs text-muted-foreground">{p.status}{p.nomor_surat ? ` · ${p.nomor_surat}` : ""}{p.jawaban ? ` · ${p.jawaban}` : ""}</p>
            {p.status === "baru" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => buat(p)}>Buat surat</Button>
                <Button size="sm" variant="outline" onClick={async () => { const j = prompt("Alasan untuk RT:"); if (!j) return; try { await wil(`/api/wilayah/rw/permintaan-surat/${p.id}/tolak`, { ...RW, body: { jawaban: j } }); await qc.invalidateQueries({ queryKey: ["/api/wilayah/permintaan-surat"] }); } catch (e) { setErr(e); } }}>Tolak</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SuratSakti() {
  const params = new URLSearchParams(useSearch());
  const [tab, setTab] = useState("buat");
  const [editor, setEditor] = useState<(Partial<Surat> & { prefill?: Record<string, string> }) | null>(null);
  const [detail, setDetail] = useState<number | null>(null);
  const { data: permintaan } = useQuery<any[]>({ queryKey: ["/api/wilayah/permintaan-surat", "rw"], queryFn: () => wil("/api/wilayah/permintaan-surat", RW) });

  useEffect(() => {
    const kej = params.get("kejadian");
    const per = params.get("permintaan");
    if (kej) setEditor({ kejadianId: Number(kej) });
    if (per && permintaan) {
      const p = permintaan.find((x) => x.id === Number(per));
      if (p) setEditor({ jenisSurat: p.jenis_surat, perihal: p.perihal, permintaanId: p.id, kejadianId: p.kejadian_id, prefill: { masalah: p.uraian } });
    }
  }, [permintaan]);

  const baru = permintaan?.filter((p) => p.status === "baru").length ?? 0;
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(163,55%,22%)]">Surat RW</h1>
        <p className="text-sm text-muted-foreground">Tujuan → isi → draft → pratinjau → terbit → catat pengiriman → tindak lanjut. Tidak ada pengiriman otomatis.</p>
      </div>
      {editor ? (
        <Editor awal={editor} selesai={(s) => { setEditor(null); if (s) { setDetail(s.id); setTab("arsip"); } }} />
      ) : detail ? (
        <Detail id={detail} tutup={() => setDetail(null)} ubahDraft={(s) => { setDetail(null); setEditor(s); }} />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="buat">Buat Surat</TabsTrigger>
            <TabsTrigger value="permintaan">Permintaan RT{baru ? ` (${baru})` : ""}</TabsTrigger>
            <TabsTrigger value="tindak">Perlu Tindak Lanjut</TabsTrigger>
            <TabsTrigger value="arsip">Arsip</TabsTrigger>
          </TabsList>
          <TabsContent value="buat" className="space-y-4">
            <Button onClick={() => setEditor({})}>+ Surat baru</Button>
            <h3 className="font-semibold">Draft</h3>
            <Daftar bagian="draft" buka={setDetail} />
          </TabsContent>
          <TabsContent value="permintaan"><PermintaanRt buat={(p) => setEditor({ jenisSurat: p.jenis_surat, perihal: p.perihal, permintaanId: p.id, kejadianId: p.kejadian_id, prefill: { masalah: p.uraian } })} /></TabsContent>
          <TabsContent value="tindak"><Daftar bagian="tindak" buka={setDetail} /></TabsContent>
          <TabsContent value="arsip"><Daftar bagian="arsip" buka={setDetail} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}
