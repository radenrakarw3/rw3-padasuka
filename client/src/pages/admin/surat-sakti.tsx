import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, Gavel, Handshake, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { bukaBerkas, wil } from "@/lib/wilayah-api";
import { LABEL_TUJUAN, PETA_JENIS, jenisDariLabelLama, type TujuanUtama } from "@shared/surat-sakti";
import { Galat, RW, TigaStatus, rt2, tanggalId, type RingkasSurat } from "@/components/surat-sakti/dasar";
import { Wizard, bacaEditorLokal, editorBaru, hapusEditorLokal, type StateEditor } from "@/components/surat-sakti/wizard";
import { DetailSurat } from "@/components/surat-sakti/detail";
import { DaftarRangkaian, DaftarTindak, DetailRangkaianView } from "@/components/surat-sakti/rangkaian";

type Layar = { t: "beranda" } | { t: "wizard"; s: StateEditor } | { t: "detail"; id: number } | { t: "rangkaian"; id: number };

interface Ringkasan {
  permintaan_rt: number; draft: number; perlu_pemeriksaan: number; belum_distribusi: number; tindak_terlambat: number; tindak_jatuh_tempo: number;
  permohonan_tanpa_respons: number; pekerjaan_selesai_30h: number; rangkaian_aktif: number;
  permohonan: { id: number; nomor_surat: string; perihal: string; tujuan: string | null; umur_hari: number }[];
}

const TOMBOL: { t: TujuanUtama; ikon: typeof UserCheck }[] = [
  { t: "tugaskan", ikon: UserCheck }, { t: "masalah", ikon: AlertTriangle }, { t: "keputusan", ikon: Gavel }, { t: "dukungan", ikon: Handshake }, { t: "pantau", ikon: ClipboardCheck },
];

function DaftarSurat({ bagian, cari, buka }: { bagian: string; cari?: string; buka: (id: number) => void }) {
  const { data, isLoading, error } = useQuery<RingkasSurat[]>({
    queryKey: ["/api/wilayah/surat", "daftar", bagian, cari ?? ""],
    queryFn: () => wil(`/api/wilayah/surat?bagian=${bagian}&cari=${encodeURIComponent(cari ?? "")}`, RW),
  });
  return (
    <div className="space-y-2">
      {isLoading && <p className="text-sm">Memuat…</p>}
      <Galat e={error} />
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada dokumen.</p>}
      <ul className="divide-y border rounded-lg bg-white">
        {data?.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => buka(s.id)} className="w-full text-left p-3 hover:bg-muted/40 space-y-1">
              <p className="font-medium">{s.perihal}</p>
              <p className="text-xs text-muted-foreground">
                {s.nomorSurat ?? "Draft"} · {PETA_JENIS[s.kodeJenis ?? ""]?.label ?? s.jenisSurat}{s.tujuan ? ` · ${s.tujuan}` : ""} · {tanggalId(s.tanggalSurat)}
                {!s.kodeJenis && s.status === "draft" ? " · format lama" : ""}
              </p>
              <div className="flex flex-wrap items-center gap-1">
                <TigaStatus s={s} />
                {s.perluPemeriksaan && s.status === "draft" && <span className="text-[11px] rounded-full border border-amber-300 bg-amber-50 px-2">perlu pemeriksaan</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PermintaanRt({ buat }: { buat: (s: StateEditor) => void }) {
  const qc = useQueryClient();
  const { data, error } = useQuery<any[]>({ queryKey: ["/api/wilayah/permintaan-surat", "rw"], queryFn: () => wil("/api/wilayah/permintaan-surat", RW) });
  const [buka, setBuka] = useState<number | null>(null);
  const { data: fakta } = useQuery<any[]>({ queryKey: ["/api/wilayah/permintaan-surat", buka, "fakta"], queryFn: () => wil(`/api/wilayah/permintaan-surat/${buka}/fakta`, RW), enabled: buka != null });
  const [err, setErr] = useState<unknown>(null);
  return (
    <div className="space-y-2">
      <Galat e={error || err} />
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada permintaan dari RT.</p>}
      <ul className="divide-y border rounded-lg bg-white">
        {data?.map((p) => {
          const j = PETA_JENIS[p.kode_jenis ?? ""] ?? jenisDariLabelLama(p.jenis_surat);
          return (
            <li key={p.id} className="p-3 space-y-1">
              <p className="font-medium">{rt2(p.rt)} · {j?.label ?? p.jenis_surat}: {p.perihal}</p>
              <p className="text-sm whitespace-pre-line">{p.uraian}</p>
              <p className="text-xs text-muted-foreground">{p.status}{p.nomor_surat ? ` · ${p.nomor_surat}` : ""}{p.jawaban ? ` · ${p.jawaban}` : ""} · {tanggalId(p.created_at)}</p>
              {p.jumlah_fakta > 0 && <button type="button" className="text-xs underline" onClick={() => setBuka(buka === p.id ? null : p.id)}>{p.jumlah_fakta} fakta/bukti tambahan</button>}
              {buka === p.id && fakta && (
                <ul className="text-xs border-l-2 pl-2">
                  {fakta.map((f) => (
                    <li key={f.id}>{f.isi}{f.sumber ? ` (sumber: ${f.sumber})` : ""}
                      {f.ada_bukti && <button type="button" className="underline ml-1" onClick={() => bukaBerkas(`/api/wilayah/surat-fakta/${f.id}/bukti`, "rw").catch(setErr)}>bukti</button>}</li>
                  ))}
                </ul>
              )}
              {p.status === "baru" && (
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => buat(editorBaru({
                    kode: j?.kode ?? "", tujuan: j?.tujuan ?? null, perihal: p.perihal, permintaanId: p.id, kejadianId: p.kejadian_id, kegiatanId: p.kegiatan_id,
                    rtTerkait: [p.rt], data: { ...(j?.awal ?? {}), fakta: p.uraian, sumberFakta: `Permintaan ${rt2(p.rt)} tgl ${tanggalId(p.created_at)}` },
                  }))}>Buat dokumen</Button>
                  <Button size="sm" variant="outline" onClick={async () => {
                    const jw = prompt("Alasan untuk Ketua RT:");
                    if (!jw) return;
                    try {
                      await wil(`/api/wilayah/rw/permintaan-surat/${p.id}/tolak`, { ...RW, body: { jawaban: jw } });
                      await qc.invalidateQueries({ queryKey: ["/api/wilayah/permintaan-surat"] });
                      await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat-ringkasan"] });
                    } catch (e) { setErr(e); }
                  }}>Tolak</Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Kartu({ label, n, warna, klik }: { label: string; n: number | undefined; warna?: string; klik?: () => void }) {
  return (
    <button type="button" onClick={klik} className="rounded-lg border bg-white p-3 text-left hover:border-[hsl(163,55%,22%)]">
      <p className={`text-2xl font-bold ${warna ?? ""}`}>{n ?? "–"}</p>
      <p className="text-xs text-muted-foreground leading-tight">{label}</p>
    </button>
  );
}

export default function SuratSakti() {
  const params = new URLSearchParams(useSearch());
  const { toast } = useToast();
  const [layar, setLayar] = useState<Layar>({ t: "beranda" });
  const [tab, setTab] = useState("draft");
  const [cari, setCari] = useState("");
  const [lokal, setLokal] = useState<StateEditor | null>(() => bacaEditorLokal());
  const { data: r, error } = useQuery<Ringkasan>({ queryKey: ["/api/wilayah/rw/surat-ringkasan"], queryFn: () => wil("/api/wilayah/rw/surat-ringkasan", RW) });
  const { data: permintaan } = useQuery<any[]>({ queryKey: ["/api/wilayah/permintaan-surat", "rw"], queryFn: () => wil("/api/wilayah/permintaan-surat", RW) });

  useEffect(() => {
    const kej = Number(params.get("kejadian"));
    const per = Number(params.get("permintaan"));
    const surat = Number(params.get("surat"));
    if (surat) setLayar({ t: "detail", id: surat });
    else if (kej) setLayar({ t: "wizard", s: editorBaru({ kejadianId: kej, tujuan: "masalah" }) });
    else if (per && permintaan) {
      const p = permintaan.find((x) => x.id === per);
      const j = p && (PETA_JENIS[p.kode_jenis ?? ""] ?? jenisDariLabelLama(p.jenis_surat));
      if (p?.status === "baru") setLayar({ t: "wizard", s: editorBaru({ kode: j?.kode ?? "", tujuan: j?.tujuan ?? null, perihal: p.perihal, permintaanId: p.id, kejadianId: p.kejadian_id, rtTerkait: [p.rt], data: { ...(j?.awal ?? {}), fakta: p.uraian } }) });
      else setTab("permintaan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permintaan]);

  const bukaWizard = (s: StateEditor) => {
    const ada = bacaEditorLokal();
    if (ada && (ada.perihal || ada.kode) && (ada.id !== s.id || !s.id) && !confirm("Ada isian lain yang belum selesai di perangkat ini. Tinggalkan isian itu dan buka yang baru?")) return;
    hapusEditorLokal();
    setLokal(null);
    setLayar({ t: "wizard", s });
  };
  const buka = (id: number) => setLayar({ t: "detail", id });

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(163,55%,22%)]">Surat Sakti RW 03</h1>
        <p className="text-sm text-muted-foreground">Masalah/program/keputusan → dokumen → penugasan/permintaan → pelaksanaan → bukti → evaluasi. Tidak ada pengiriman otomatis.</p>
      </div>

      {layar.t === "wizard" && <Wizard awal={layar.s} tutup={(id) => { setLokal(bacaEditorLokal()); setLayar(id ? { t: "detail", id } : { t: "beranda" }); }} />}
      {layar.t === "detail" && <DetailSurat id={layar.id} tutup={() => setLayar({ t: "beranda" })} ubahDraft={bukaWizard} buka={buka} />}
      {layar.t === "rangkaian" && <DetailRangkaianView id={layar.id} peran="rw" tutup={() => { setLayar({ t: "beranda" }); setTab("rangkaian"); }} bukaSurat={buka} buat={bukaWizard} />}

      {layar.t === "beranda" && (
        <>
          {lokal && (lokal.perihal || lokal.kode) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm flex flex-wrap items-center gap-2">
              <span className="flex-1">Ada isian belum selesai: <b>{PETA_JENIS[lokal.kode]?.label ?? "dokumen"}{lokal.perihal ? ` — ${lokal.perihal}` : ""}</b></span>
              <Button size="sm" onClick={() => setLayar({ t: "wizard", s: lokal })}>Lanjutkan</Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Buang isian yang belum tersimpan di perangkat ini? Draft di server tidak terhapus.")) { hapusEditorLokal(); setLokal(null); } }}>Buang</Button>
            </div>
          )}

          <div className="grid gap-2 grid-cols-2 lg:grid-cols-5">
            {TOMBOL.map(({ t, ikon: Ikon }) => (
              <button key={t} type="button"
                onClick={() => (t === "pantau" ? setTab("tindak") : bukaWizard(editorBaru({ tujuan: t })))}
                className="rounded-xl border-2 border-[hsl(163,55%,22%)]/20 bg-white p-4 text-left hover:border-[hsl(163,55%,22%)] hover:bg-emerald-50/40 last:col-span-2 lg:last:col-span-1">
                <Ikon className="w-6 h-6 text-[hsl(163,55%,22%)] mb-2" />
                <p className="font-semibold leading-tight">{LABEL_TUJUAN[t].judul}</p>
                <p className="text-xs text-muted-foreground mt-1">{LABEL_TUJUAN[t].ket}</p>
              </button>
            ))}
          </div>

          <Galat e={error} />
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
            <Kartu label="Permintaan RT baru" n={r?.permintaan_rt} warna={r?.permintaan_rt ? "text-amber-700" : ""} klik={() => setTab("permintaan")} />
            <Kartu label="Draft" n={r?.draft} klik={() => setTab("draft")} />
            <Kartu label="Draft perlu pemeriksaan" n={r?.perlu_pemeriksaan} klik={() => setTab("draft")} />
            <Kartu label="Terbit belum diserahkan" n={r?.belum_distribusi} warna={r?.belum_distribusi ? "text-amber-700" : ""} klik={() => setTab("distribusi")} />
            <Kartu label="Tindak lanjut terlambat" n={r?.tindak_terlambat} warna={r?.tindak_terlambat ? "text-red-700" : ""} klik={() => setTab("tindak")} />
            <Kartu label="Jatuh tempo ≤3 hari" n={r?.tindak_jatuh_tempo} klik={() => setTab("tindak")} />
            <Kartu label="Permohonan belum dibalas" n={r?.permohonan_tanpa_respons} klik={() => setTab("permohonan")} />
            <Kartu label="Pekerjaan selesai 30 hari" n={r?.pekerjaan_selesai_30h} warna="text-emerald-700" klik={() => setTab("tindak")} />
          </div>

          <div className="relative max-w-lg">
            <Search className="absolute left-2 top-3 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Cari nomor, perihal, penerima, atau jenis…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>

          {cari.trim().length >= 2 ? (
            <DaftarSurat bagian="semua" cari={cari.trim()} buka={buka} />
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap h-auto">
                <TabsTrigger value="permintaan">Permintaan RT{r?.permintaan_rt ? ` (${r.permintaan_rt})` : ""}</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="arsip">Arsip</TabsTrigger>
                <TabsTrigger value="distribusi">Belum diserahkan</TabsTrigger>
                <TabsTrigger value="tindak">Tindak lanjut</TabsTrigger>
                <TabsTrigger value="rangkaian">Rangkaian{r?.rangkaian_aktif ? ` (${r.rangkaian_aktif})` : ""}</TabsTrigger>
                <TabsTrigger value="permohonan">Menunggu respons</TabsTrigger>
              </TabsList>
              <TabsContent value="permintaan"><PermintaanRt buat={bukaWizard} /></TabsContent>
              <TabsContent value="draft"><DaftarSurat bagian="draft" buka={buka} /></TabsContent>
              <TabsContent value="arsip"><DaftarSurat bagian="arsip" buka={buka} /></TabsContent>
              <TabsContent value="distribusi"><DaftarSurat bagian="belum_distribusi" buka={buka} /></TabsContent>
              <TabsContent value="tindak"><DaftarTindak peran="rw" bukaSurat={buka} /></TabsContent>
              <TabsContent value="rangkaian"><DaftarRangkaian peran="rw" buka={(id) => setLayar({ t: "rangkaian", id })} /></TabsContent>
              <TabsContent value="permohonan">
                {r?.permohonan.length === 0 && <p className="text-sm text-muted-foreground">Semua permohonan sudah tercatat ada balasan.</p>}
                <ul className="divide-y border rounded-lg bg-white">
                  {r?.permohonan.map((p) => (
                    <li key={p.id}>
                      <button type="button" className="w-full text-left p-3 hover:bg-muted/40" onClick={() => buka(p.id)}>
                        <p className="font-medium">{p.perihal}</p>
                        <p className="text-xs text-muted-foreground">{p.nomor_surat} · {p.tujuan ?? "-"} · {p.umur_hari} hari tanpa balasan tercatat</p>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">Catat balasan lewat detail dokumen → "Catat balasan". Buat pengingat lewat "Buat dokumen lanjutan".</p>
              </TabsContent>
            </Tabs>
          )}
          <button type="button" className="text-xs underline text-muted-foreground" onClick={() => toast({ title: "Arsip lama", description: "Surat sebelum Surat Sakti tetap ada di tab Arsip dengan nomor aslinya. PDF-nya dibentuk dari teks tersimpan." })}>
            Tentang arsip lama
          </button>
        </>
      )}
    </div>
  );
}
