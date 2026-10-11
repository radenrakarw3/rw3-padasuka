import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronsUpDown, FileText, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { bukaBerkas, kunciIdempoten, wil } from "@/lib/wilayah-api";
import { cn } from "@/lib/utils";
import {
  KATALOG, KELOMPOK, LABEL_KATEGORI, LABEL_TUJUAN, PETA_JENIS, kelompokJenis, renderDokumen, validasiDokumen, isoHariIni, daftarStr,
  type Akses, type DataDokumen, type JenisDokumen, type TujuanUtama,
} from "@shared/surat-sakti";
import { KelompokForm } from "./isian";
import { Galat, PratinjauBloks, RW, rt2 } from "./dasar";

export interface StateEditor {
  id: number | null;
  kunci: string;
  kode: string;
  tujuan: TujuanUtama | null;
  perihal: string;
  tanggal: string;
  data: DataDokumen;
  akses: Akses;
  rtTerkait: number[];
  kejadianId: number | null;
  kegiatanId: number | null;
  langkah: number;
}

const KUNCI_LOKAL = "wil-draft:surat-sakti-editor";

export function editorBaru(awal: Partial<StateEditor> = {}): StateEditor {
  return {
    id: null, kunci: kunciIdempoten(), kode: "", tujuan: null, perihal: "", tanggal: isoHariIni(), data: {}, akses: "rt_terkait", rtTerkait: [],
    kejadianId: null, kegiatanId: null, langkah: awal.kode ? 1 : 0, ...awal,
  };
}

export function bacaEditorLokal(): StateEditor | null {
  try {
    const s = localStorage.getItem(KUNCI_LOKAL);
    return s ? (JSON.parse(s) as StateEditor) : null;
  } catch {
    return null;
  }
}

export function hapusEditorLokal() {
  try {
    localStorage.removeItem(KUNCI_LOKAL);
  } catch {
    /* abaikan */
  }
}

/** Dari respons server (detail surat) ke state editor. */
export function editorDariSurat(s: any): StateEditor {
  return editorBaru({
    id: s.id, kode: s.kodeJenis ?? "", tujuan: PETA_JENIS[s.kodeJenis]?.tujuan ?? null, perihal: s.perihal, tanggal: s.tanggalSurat ?? isoHariIni(),
    data: s.dataForm ?? {}, akses: s.akses ?? "rt_terkait", rtTerkait: s.rtTerkait ?? [], kejadianId: s.kejadianId,
    kegiatanId: s.kegiatanId, langkah: s.kodeJenis && PETA_JENIS[s.kodeJenis] ? 2 : 0,
  });
}

const LANGKAH = ["Jenis dokumen", "Konteks", "Isi", "Penanda tangan & tindak lanjut", "Periksa & terbit"];
const AKSES: { v: Akses; label: string; ket: string }[] = [
  { v: "rt_terkait", label: "RT terkait", ket: "Ketua RT yang dipilih dapat membaca dan mengunduh setelah terbit." },
  { v: "internal", label: "Internal", ket: "Hanya RT yang ditugaskan (PIC) di tindak lanjut." },
  { v: "terbatas", label: "Terbatas", ket: "Hanya Ketua RW. Untuk perkara sensitif." },
];

export interface Referensi {
  kejadian: { id: number; judul: string; jenis: string; rt: number | null; status: string; tanggal: string; lokasi: string | null }[];
  kegiatan: { id: number; judul: string; jenis: string; tanggal: string; lokasi: string | null }[];
  fasilitas: { id: number; nama: string; jenis: string; lokasi: string | null }[];
  program: { id: number; nama: string; status: string }[];
  rw3law: { id: number; judul: string; kategori: string; nomor_peraturan: string | null; tahun_nomor: number | null }[];
}

export function Pilih<T extends { id: number }>({ label, items, nilai, teks, sub, ubah, kosong = "Tidak ada" }: {
  label: string; items: T[]; nilai: number | null; teks: (x: T) => string; sub?: (x: T) => string; ubah: (id: number | null) => void; kosong?: string;
}) {
  const [buka, setBuka] = useState(false);
  const pilih = items.find((x) => x.id === nilai);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Popover open={buka} onOpenChange={setBuka}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="flex-1 justify-between font-normal min-w-0">
              <span className="truncate">{pilih ? teks(pilih) : "— pilih —"}</span>
              <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[min(92vw,28rem)]" align="start">
            <Command>
              <CommandInput placeholder="Cari…" />
              <CommandList>
                <CommandEmpty>{kosong}</CommandEmpty>
                <CommandGroup>
                  {items.map((x) => (
                    <CommandItem key={x.id} value={`${teks(x)} ${sub?.(x) ?? ""} #${x.id}`} onSelect={() => { ubah(x.id); setBuka(false); }}>
                      <Check className={cn("w-4 h-4 mr-2", x.id === nilai ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1">{teks(x)}</span>
                      {sub && <span className="text-xs text-muted-foreground ml-2">{sub(x)}</span>}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {nilai != null && <Button type="button" variant="ghost" onClick={() => ubah(null)}>Lepas</Button>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- langkah 1: jenis
function PilihJenis({ tujuan, setTujuan, kode, pilih }: { tujuan: TujuanUtama | null; setTujuan: (t: TujuanUtama) => void; kode: string; pilih: (j: JenisDokumen) => void }) {
  const [cari, setCari] = useState("");
  const q = cari.trim().toLowerCase();
  const daftar = KATALOG.filter((j) => (q ? `${j.label} ${j.ringkas} ${j.labelLama ?? ""}`.toLowerCase().includes(q) : !tujuan || j.tujuan === tujuan));
  const perKategori = Object.entries(LABEL_KATEGORI)
    .map(([k, label]) => ({ k, label, item: daftar.filter((j) => j.kategori === k) }))
    .filter((g) => g.item.length);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {(Object.keys(LABEL_TUJUAN) as TujuanUtama[]).map((t) => (
          <Button key={t} type="button" size="sm" variant={tujuan === t && !q ? "default" : "outline"} onClick={() => { setTujuan(t); setCari(""); }}>
            {LABEL_TUJUAN[t].judul}
          </Button>
        ))}
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-2 top-3 w-4 h-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Cari jenis dokumen (mis. berita acara, undangan, material)…" value={cari} onChange={(e) => setCari(e.target.value)} />
      </div>
      {perKategori.map((g) => (
        <section key={g.k}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{g.k}. {g.label}</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.item.map((j) => (
              <button key={j.kode} type="button" onClick={() => pilih(j)}
                className={cn("text-left rounded-lg border p-3 hover:border-[hsl(163,55%,22%)] hover:bg-emerald-50/40", kode === j.kode && "border-[hsl(163,55%,22%)] bg-emerald-50")}>
                <p className="font-medium">{j.label}</p>
                <p className="text-xs text-muted-foreground">{j.ringkas}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
      {!perKategori.length && <p className="text-sm text-muted-foreground">Tidak ada jenis yang cocok.</p>}
    </div>
  );
}

// ---------------------------------------------------------------- wizard
export function Wizard({ awal, tutup }: { awal: StateEditor; tutup: (id: number | null) => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [s, setS] = useState<StateEditor>(awal);
  const [err, setErr] = useState<unknown>(null);
  const [menyimpan, setMenyimpan] = useState(false);
  const [tersimpan, setTersimpan] = useState<string | null>(awal.id ? "tersimpan di server" : null);
  const [konfirmasi, setKonfirmasi] = useState(false);
  const [menerbitkan, setMenerbitkan] = useState(false);
  const berubah = useRef(false);
  const sedangSimpan = useRef(false);
  const { data: ref } = useQuery<Referensi>({ queryKey: ["/api/wilayah/rw/surat-referensi"], queryFn: () => wil("/api/wilayah/rw/surat-referensi", RW), staleTime: 60_000 });
  const j = PETA_JENIS[s.kode];

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI_LOKAL, JSON.stringify(s));
    } catch {
      /* penyimpanan penuh */
    }
  }, [s]);

  const ubah = (p: Partial<StateEditor>) => {
    berubah.current = true;
    setTersimpan(null);
    setS((x) => ({ ...x, ...p }));
  };
  const ubahData = (key: string, v: unknown) => {
    berubah.current = true;
    setTersimpan(null);
    setS((x) => ({ ...x, data: { ...x.data, [key]: v } }));
  };

  const kelompokIsi = useMemo(() => (j ? kelompokJenis(j).filter((k) => k !== "ttd" && k !== "tindak").map((k) => KELOMPOK[k]).filter(Boolean) : []), [j]);
  const kelompokAkhir = useMemo(() => (j ? kelompokJenis(j).filter((k) => k === "ttd" || k === "tindak").map((k) => KELOMPOK[k]).filter(Boolean) : []), [j]);
  const validasi = useMemo(() => (j ? validasiDokumen(j, s.data, { perihal: s.perihal, tanggal: s.tanggal }) : null), [j, s.data, s.perihal, s.tanggal]);
  const bloks = useMemo(
    () => (j && s.langkah === 4 ? renderDokumen(j, s.data, { nomor: null, tanggal: s.tanggal, perihal: s.perihal || "(perihal)", draft: true }, s.akses) : []),
    [j, s.langkah, s.data, s.tanggal, s.perihal, s.akses],
  );

  const bisaSimpan = !!j && s.perihal.trim().length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(s.tanggal);
  const sRef = useRef(s);
  sRef.current = s;

  async function simpan(diam = false): Promise<number | null> {
    const x = sRef.current;
    if (!bisaSimpan) {
      if (!diam) setErr(new Error("Pilih jenis dokumen dan isi perihal (min. 3 huruf) sebelum menyimpan."));
      return x.id;
    }
    if (sedangSimpan.current) return x.id;
    sedangSimpan.current = true;
    setMenyimpan(true);
    if (!diam) setErr(null);
    try {
      const body = {
        kodeJenis: x.kode, perihal: x.perihal.trim(), tanggalSurat: x.tanggal, dataForm: x.data, akses: x.akses, rtTerkait: x.rtTerkait,
        kejadianId: x.kejadianId, kegiatanId: x.kegiatanId,
        ...(x.id ? {} : { idempotencyKey: x.kunci }),
      };
      berubah.current = false;
      const r = await wil<{ id: number }>(x.id ? `/api/wilayah/rw/surat/${x.id}` : "/api/wilayah/rw/surat", { ...RW, method: x.id ? "PATCH" : "POST", body });
      setS((y) => ({ ...y, id: r.id }));
      sRef.current = { ...sRef.current, id: r.id };
      setTersimpan(`tersimpan ${new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`);
      qc.invalidateQueries({ queryKey: ["/api/wilayah/surat"] });
      qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat-ringkasan"] });
      return r.id;
    } catch (e) {
      berubah.current = true;
      setErr(e);
      return null;
    } finally {
      sedangSimpan.current = false;
      setMenyimpan(false);
    }
  }

  // Simpan otomatis ke server tiap 20 detik bila ada perubahan (salinan lokal di perangkat selalu ada).
  useEffect(() => {
    const t = setInterval(() => { if (berubah.current) simpan(true); }, 20_000);
    return () => clearInterval(t);
  });

  const ke = async (n: number) => {
    if (n > s.langkah && s.langkah >= 1 && berubah.current) await simpan(true);
    setS((x) => ({ ...x, langkah: n }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const terbit = async () => {
    setMenerbitkan(true);
    setErr(null);
    try {
      const id = await simpan();
      if (!id) return;
      const r = await wil<{ nomorSurat: string; peringatan: string[] }>(`/api/wilayah/rw/surat/${id}/terbit`, { ...RW, body: {} });
      hapusEditorLokal();
      qc.invalidateQueries({ queryKey: ["/api/wilayah/surat"] });
      qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/surat-ringkasan"] });
      toast({ title: "Dokumen terbit", description: `Nomor ${r.nomorSurat}. PDF final tersimpan. Dokumen belum tercatat dikirim.` });
      tutup(id);
    } catch (e) {
      setErr(e);
    } finally {
      setMenerbitkan(false);
      setKonfirmasi(false);
    }
  };

  const tambahDasar = (teks: string) => {
    const ada = daftarStr(s.data.dasar);
    if (!ada.includes(teks)) ubahData("dasar", [...ada, teks]);
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={async () => {
          if (berubah.current && bisaSimpan) { const id = await simpan(); if (!id) return; }
          if (!berubah.current) hapusEditorLokal();
          tutup(sRef.current.id);
        }}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Tutup
        </Button>
        <div className="min-w-0">
          <p className="font-semibold truncate">{j ? j.label : "Dokumen baru"}{s.perihal ? ` — ${s.perihal}` : ""}</p>
          <p className="text-xs text-muted-foreground">{menyimpan ? "Menyimpan…" : tersimpan ?? "Perubahan tersimpan di perangkat ini; tersimpan ke server saat Lanjut/Simpan"}</p>
        </div>
      </div>

      <ol className="flex flex-wrap gap-1 text-xs">
        {LANGKAH.map((l, i) => (
          <li key={l}>
            <button type="button" disabled={(i > 0 && !j) || (i > 1 && !bisaSimpan)} onClick={() => ke(i)}
              className={cn("rounded-full border px-2 py-1", i === s.langkah ? "bg-[hsl(163,55%,22%)] text-white border-transparent" : "bg-white", ((i > 0 && !j) || (i > 1 && !bisaSimpan)) && "opacity-40")}>
              {i + 1}. {l}
            </button>
          </li>
        ))}
      </ol>

      <Galat e={err} />

      {s.langkah === 0 && (
        <PilihJenis tujuan={s.tujuan} setTujuan={(t) => ubah({ tujuan: t })} kode={s.kode}
          pilih={(jn) => ubah({ kode: jn.kode, tujuan: jn.tujuan, data: { ...(jn.awal ?? {}), ...s.data }, akses: !s.id && jn.kategori === "B" ? "internal" : s.akses, langkah: 1 })} />
      )}

      {s.langkah === 1 && j && (
        <div className="space-y-4 max-w-2xl">
          <div className="rounded-lg border bg-emerald-50/50 p-3 text-sm">
            <p className="font-medium">{j.label}</p>
            <p className="text-muted-foreground">{j.ringkas}</p>
            {j.perluDasar && <p className="mt-1 text-amber-800">Jenis ini wajib menyebut dasar yang benar-benar ada (Peraturan RW, notulen musyawarah) dan dicentang sudah diperiksa.</p>}
            {j.perluPersetujuanPihak && <p className="mt-1 text-amber-800">Kesepakatan hanya terbit bila para pihak sudah menyetujui isinya.</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="perihal">Perihal / judul singkat <span className="text-red-600">*</span></Label>
            <Input id="perihal" value={s.perihal} onChange={(e) => ubah({ perihal: e.target.value })} placeholder="mis. Penanganan genangan saluran Gg. Melati" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tgl">Tanggal dokumen <span className="text-red-600">*</span></Label>
            <Input id="tgl" type="date" className="max-w-[12rem]" value={s.tanggal} onChange={(e) => ubah({ tanggal: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Siapa yang boleh membaca setelah terbit</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {AKSES.map((a) => (
                <button key={a.v} type="button" onClick={() => ubah({ akses: a.v })}
                  className={cn("text-left rounded-lg border p-2 text-sm", s.akses === a.v && "border-[hsl(163,55%,22%)] bg-emerald-50")}>
                  <p className="font-medium">{a.label}</p>
                  <p className="text-xs text-muted-foreground">{a.ket}</p>
                </button>
              ))}
            </div>
            {s.akses === "rt_terkait" && (
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <Button key={n} type="button" size="sm" variant={s.rtTerkait.includes(n) ? "default" : "outline"}
                    onClick={() => ubah({ rtTerkait: s.rtTerkait.includes(n) ? s.rtTerkait.filter((x) => x !== n) : [...s.rtTerkait, n].sort() })}>
                    {rt2(n)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {s.langkah === 2 && j && (
        <div className="space-y-4 max-w-3xl">
          {kelompokIsi.map((k) => (
            <div key={k.id} className="space-y-2">
              <KelompokForm k={k} d={s.data} ubah={ubahData} />
              {k.id === "dasarCek" && ref && ref.rw3law.length > 0 && (
                <Pilih label="Tambah dasar dari Peraturan RW (RW3LAW) yang sudah disetujui" items={ref.rw3law} nilai={null}
                  teks={(r) => `${r.nomor_peraturan ? `No. ${r.nomor_peraturan}` : ""}${r.tahun_nomor ? ` Tahun ${r.tahun_nomor}` : ""} ${r.judul}`.trim()}
                  sub={(r) => r.kategori}
                  ubah={(id) => {
                    const r = ref.rw3law.find((x) => x.id === id);
                    if (r) tambahDasar(`Peraturan RW 03${r.nomor_peraturan ? ` Nomor ${r.nomor_peraturan}` : ""}${r.tahun_nomor ? ` Tahun ${r.tahun_nomor}` : ""} tentang ${r.judul}`);
                  }} />
              )}
            </div>
          ))}
        </div>
      )}

      {s.langkah === 3 && j && (
        <div className="space-y-4 max-w-3xl">
          {kelompokAkhir.map((k) => <KelompokForm key={k.id} k={k} d={s.data} ubah={ubahData} />)}
          <p className="text-xs text-muted-foreground">
            Rencana tindak lanjut dicatat sebagai pekerjaan saat dokumen terbit. Tulis "RT 02" pada kolom PIC agar Ketua RT 02 dapat melaporkan progres dari akunnya.
            {j.butuhTindak ? " Jenis ini lazim membutuhkan tindak lanjut." : ""}
          </p>
        </div>
      )}

      {s.langkah === 4 && j && validasi && (
        <div className="space-y-4">
          {validasi.galat.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
              <p className="font-semibold text-red-800">Belum dapat terbit:</p>
              <ul className="list-disc pl-5 text-red-800">{validasi.galat.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
          {validasi.peringatan.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-semibold text-amber-900">Periksa sebelum terbit:</p>
              <ul className="list-disc pl-5 text-amber-900">{validasi.peringatan.map((g) => <li key={g}>{g}</li>)}</ul>
            </div>
          )}
          <Button type="button" variant="outline" disabled={!bisaSimpan || menyimpan} onClick={async () => {
            const id = await simpan();
            if (id) bukaBerkas(`/api/wilayah/rw/surat/${id}/pratinjau.pdf`, "rw").catch(setErr);
          }}><FileText className="w-4 h-4 mr-1" /> Lihat PDF draf</Button>
          <p className="text-xs text-muted-foreground">Pratinjau di bawah memakai isi yang sama dengan PDF. PDF resmi dibentuk server saat terbit dan diberi nomor saat itu juga.</p>
          <PratinjauBloks bloks={bloks} draft />
        </div>
      )}

      <div className="fixed bottom-0 inset-x-0 z-20 border-t bg-white/95 backdrop-blur px-4 py-2 flex flex-wrap items-center justify-end gap-2">
        {s.langkah > 0 && <Button type="button" variant="ghost" onClick={() => ke(s.langkah - 1)}><ArrowLeft className="w-4 h-4 mr-1" /> Kembali</Button>}
        {s.langkah >= 1 && <Button type="button" variant="outline" disabled={!bisaSimpan || menyimpan} onClick={() => simpan()}><Save className="w-4 h-4 mr-1" /> Simpan draft</Button>}
        {s.langkah >= 1 && s.langkah < 4 && <Button type="button" disabled={!j || !bisaSimpan} onClick={() => ke(s.langkah + 1)}>Lanjut <ArrowRight className="w-4 h-4 ml-1" /></Button>}
        {s.langkah === 4 && (
          <Button type="button" className="bg-[hsl(163,55%,22%)] hover:bg-[hsl(163,55%,18%)]" disabled={!validasi || validasi.galat.length > 0 || !bisaSimpan || menerbitkan}
            onClick={() => setKonfirmasi(true)}>
            <BookOpen className="w-4 h-4 mr-1" /> Terbitkan
          </Button>
        )}
      </div>

      <AlertDialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan dokumen?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Nomor resmi dibuat sekarang. Setelah terbit, isi dan PDF tidak dapat diubah. Bila ada kesalahan, batalkan lalu buat dokumen baru (bisa disalin dari dokumen ini).</p>
                <p>Terbit bukan berarti terkirim. Catat penyerahan setelah dokumen benar-benar diberikan, dan bubuhkan tanda tangan basah pada cetakan.</p>
                {validasi && validasi.peringatan.length > 0 && <p className="text-amber-800">Ada {validasi.peringatan.length} peringatan — pastikan sudah diperiksa.</p>}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={menerbitkan}>Periksa lagi</AlertDialogCancel>
            <AlertDialogAction disabled={menerbitkan} onClick={(e) => { e.preventDefault(); terbit(); }}>{menerbitkan ? "Menerbitkan…" : "Ya, terbitkan"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
