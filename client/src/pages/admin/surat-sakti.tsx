import { useEffect, useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ClipboardCheck, Gavel, Handshake, PenLine, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { wil } from "@/lib/wilayah-api";
import { LABEL_TUJUAN, PETA_JENIS, type TujuanUtama } from "@shared/surat-sakti";
import { Galat, RW, TigaStatus, tanggalId, type RingkasSurat } from "@/components/surat-sakti/dasar";
import { Wizard, bacaEditorLokal, editorBaru, hapusEditorLokal, type StateEditor } from "@/components/surat-sakti/wizard";
import { DetailSurat } from "@/components/surat-sakti/detail";
import { DaftarTindak } from "@/components/surat-sakti/tindak";

type Layar = { t: "beranda" } | { t: "wizard"; s: StateEditor } | { t: "detail"; id: number };

interface Ringkasan {
  draft: number; perlu_pemeriksaan: number; belum_distribusi: number; tindak_terlambat: number; tindak_jatuh_tempo: number; pekerjaan_selesai_30h: number;
}

const TOMBOL: { t: TujuanUtama; ikon: typeof UserCheck }[] = [
  { t: "kustom", ikon: PenLine }, { t: "tugaskan", ikon: UserCheck }, { t: "masalah", ikon: AlertTriangle }, { t: "keputusan", ikon: Gavel },
  { t: "dukungan", ikon: Handshake }, { t: "pantau", ikon: ClipboardCheck },
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
            <button type="button" onClick={() => buka(s.id)} className="w-full min-h-12 text-left p-3 hover:bg-muted/40 space-y-1">
              <p className="font-medium break-words">{s.perihal}</p>
              <p className="text-xs text-muted-foreground break-words">
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

function Kartu({ label, n, warna, klik }: { label: string; n: number | undefined; warna?: string; klik?: () => void }) {
  return (
    <button type="button" onClick={klik} className="min-w-0 rounded-lg border bg-white p-3 text-left hover:border-[hsl(163,55%,22%)]">
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

  useEffect(() => {
    const kej = Number(params.get("kejadian"));
    const surat = Number(params.get("surat"));
    if (surat) setLayar({ t: "detail", id: surat });
    else if (kej) setLayar({ t: "wizard", s: editorBaru({ kejadianId: kej, tujuan: "masalah" }) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bukaWizard = (s: StateEditor) => {
    const ada = bacaEditorLokal();
    if (ada && (ada.perihal || ada.kode) && (ada.id !== s.id || !s.id) && !confirm("Ada isian lain yang belum selesai di perangkat ini. Tinggalkan isian itu dan buka yang baru?")) return;
    hapusEditorLokal();
    setLokal(null);
    setLayar({ t: "wizard", s });
  };
  const buka = (id: number) => setLayar({ t: "detail", id });

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[hsl(163,55%,22%)]">Surat Sakti RW 03</h1>
        <p className="text-sm text-muted-foreground">Pilih jenis surat, isi, periksa pratinjau, lalu terbitkan. Tiap surat berdiri sendiri. Tidak ada pengiriman otomatis.</p>
      </div>

      {layar.t === "wizard" && <Wizard awal={layar.s} tutup={(id) => { setLokal(bacaEditorLokal()); setLayar(id ? { t: "detail", id } : { t: "beranda" }); }} />}
      {layar.t === "detail" && <DetailSurat id={layar.id} tutup={() => setLayar({ t: "beranda" })} ubahDraft={bukaWizard} />}

      {layar.t === "beranda" && (
        <>
          {lokal && (lokal.perihal || lokal.kode) && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm flex flex-wrap items-center gap-2">
              <span className="w-full min-w-0 break-words sm:w-auto sm:flex-1">Ada isian belum selesai: <b>{PETA_JENIS[lokal.kode]?.label ?? "dokumen"}{lokal.perihal ? ` — ${lokal.perihal}` : ""}</b></span>
              <Button size="sm" className="flex-1 sm:flex-none" onClick={() => setLayar({ t: "wizard", s: lokal })}>Lanjutkan</Button>
              <Button size="sm" variant="ghost" className="flex-1 sm:flex-none" onClick={() => { if (confirm("Buang isian yang belum tersimpan di perangkat ini? Draft di server tidak terhapus.")) { hapusEditorLokal(); setLokal(null); } }}>Buang</Button>
            </div>
          )}

          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {TOMBOL.map(({ t, ikon: Ikon }) => (
              <button key={t} type="button"
                onClick={() => bukaWizard(t === "kustom" ? editorBaru({ tujuan: t, kode: "f_kustom" }) : editorBaru({ tujuan: t }))}
                className={`min-w-0 rounded-xl border-2 bg-white p-3 sm:p-4 text-left hover:border-[hsl(163,55%,22%)] hover:bg-emerald-50/40 ${t === "kustom" ? "border-[hsl(40,45%,55%)]" : "border-[hsl(163,55%,22%)]/20"}`}>
                <Ikon className="w-6 h-6 text-[hsl(163,55%,22%)] mb-1.5 sm:mb-2" />
                <p className="font-semibold leading-tight">{LABEL_TUJUAN[t].judul}</p>
                <p className="text-xs text-muted-foreground mt-1">{LABEL_TUJUAN[t].ket}</p>
              </button>
            ))}
          </div>

          <Galat e={error} />
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Kartu label="Draft" n={r?.draft} klik={() => setTab("draft")} />
            <Kartu label="Draft perlu pemeriksaan" n={r?.perlu_pemeriksaan} klik={() => setTab("draft")} />
            <Kartu label="Terbit belum diserahkan" n={r?.belum_distribusi} warna={r?.belum_distribusi ? "text-amber-700" : ""} klik={() => setTab("distribusi")} />
            <Kartu label="Tindak lanjut terlambat" n={r?.tindak_terlambat} warna={r?.tindak_terlambat ? "text-red-700" : ""} klik={() => setTab("tindak")} />
            <Kartu label="Jatuh tempo ≤3 hari" n={r?.tindak_jatuh_tempo} klik={() => setTab("tindak")} />
            <Kartu label="Pekerjaan selesai 30 hari" n={r?.pekerjaan_selesai_30h} warna="text-emerald-700" klik={() => setTab("tindak")} />
          </div>

          <div className="relative max-w-lg">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" type="search" placeholder="Cari nomor, perihal, penerima, atau jenis…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </div>

          {cari.trim().length >= 2 ? (
            <DaftarSurat bagian="semua" cari={cari.trim()} buka={buka} />
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="sm:h-auto sm:flex-wrap">
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="arsip">Arsip</TabsTrigger>
                <TabsTrigger value="distribusi">Belum diserahkan</TabsTrigger>
                <TabsTrigger value="tindak">Tindak lanjut</TabsTrigger>
              </TabsList>
              <TabsContent value="draft"><DaftarSurat bagian="draft" buka={buka} /></TabsContent>
              <TabsContent value="arsip"><DaftarSurat bagian="arsip" buka={buka} /></TabsContent>
              <TabsContent value="distribusi"><DaftarSurat bagian="belum_distribusi" buka={buka} /></TabsContent>
              <TabsContent value="tindak"><DaftarTindak peran="rw" bukaSurat={buka} /></TabsContent>
            </Tabs>
          )}
          <button type="button" className="min-h-10 text-sm underline text-muted-foreground sm:min-h-0 sm:text-xs" onClick={() => toast({ title: "Arsip lama", description: "Surat sebelum Surat Sakti tetap ada di tab Arsip dengan nomor aslinya. PDF-nya dibentuk dari teks tersimpan." })}>
            Tentang arsip lama
          </button>
        </>
      )}
    </div>
  );
}
