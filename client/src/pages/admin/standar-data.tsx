import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { wil } from "@/lib/wilayah-api";
import { useStandar } from "@/lib/standar";
import { KELOMPOK_STANDAR, LABEL_TIPE, TIPE_FAKTA, kelompokkan, type DefinisiFakta, type TipeFakta } from "@shared/wilayah";

const RW = { peran: "rw" as const };
const HIJAU = "hsl(163,55%,22%)";
type Subjek = "kk" | "warga";

interface Isian {
  id?: number;
  subjek: Subjek;
  kelompok: string;
  label: string;
  pertanyaan: string;
  bantuan: string;
  tipe: TipeFakta;
  pilihan: { nilai?: string; label: string; perhatian: boolean }[];
  perhatianYaTidak: string[];
  diQr: boolean;
  khususPerempuan: boolean;
  usiaMin: string;
  usiaMax: string;
}

const isianBaru = (subjek: Subjek): Isian => ({
  subjek, kelompok: subjek === "kk" ? "Rumah & fasilitas" : "Kesehatan", label: "", pertanyaan: "", bantuan: "", tipe: "pilihan",
  pilihan: [{ label: "", perhatian: false }, { label: "", perhatian: false }], perhatianYaTidak: [], diQr: true, khususPerempuan: false, usiaMin: "", usiaMax: "",
});

const dariDefinisi = (d: DefinisiFakta): Isian => ({
  id: d.id, subjek: d.subjek as Subjek, kelompok: d.kelompok, label: d.label, pertanyaan: d.pertanyaan, bantuan: d.bantuan ?? "", tipe: d.tipe,
  pilihan: (d.pilihan ?? []).map((p) => ({ nilai: p.nilai, label: p.label, perhatian: !!d.perhatian?.includes(p.nilai) })),
  perhatianYaTidak: d.tipe === "yatidak" ? d.perhatian ?? [] : [],
  diQr: d.diQr !== false, khususPerempuan: !!d.khususPerempuan, usiaMin: d.usiaMin == null ? "" : String(d.usiaMin), usiaMax: d.usiaMax == null ? "" : String(d.usiaMax),
});

function slug(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "x";
}

function Editor({ awal, kelompokAda, tutup }: { awal: Isian; kelompokAda: string[]; tutup: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Isian>(awal);
  const [kelompokBaru, setKelompokBaru] = useState(!kelompokAda.includes(awal.kelompok) && !!awal.kelompok && !awal.id);
  const [simpan, setSimpan] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<Isian>) => setF({ ...f, ...p });
  const berpilihan = f.tipe === "pilihan" || f.tipe === "banyak";
  const ubahPilihan = (i: number, p: Partial<Isian["pilihan"][number]>) => set({ pilihan: f.pilihan.map((x, n) => (n === i ? { ...x, ...p } : x)) });

  const kirim = async () => {
    setErr(null);
    const pilihan = berpilihan ? f.pilihan.filter((p) => p.label.trim()) : [];
    if (!f.label.trim() || !f.pertanyaan.trim() || !f.kelompok.trim()) return setErr("Kelompok, nama singkat, dan pertanyaan wajib diisi.");
    if (berpilihan && pilihan.length < 2) return setErr("Isi minimal dua pilihan jawaban.");
    const nilaiPilihan = pilihan.map((p) => p.nilai ?? slug(p.label));
    const body = {
      subjek: f.subjek, kelompok: f.kelompok.trim(), label: f.label.trim(), pertanyaan: f.pertanyaan.trim(), bantuan: f.bantuan.trim() || null, tipe: f.tipe,
      pilihan: pilihan.map((p, i) => ({ nilai: p.nilai ?? nilaiPilihan[i], label: p.label.trim() })),
      perhatian: f.tipe === "yatidak" ? f.perhatianYaTidak : berpilihan ? pilihan.map((p, i) => (p.perhatian ? nilaiPilihan[i] : null)).filter(Boolean) : [],
      diQr: f.diQr, khususPerempuan: f.subjek === "warga" && f.khususPerempuan,
      usiaMin: f.subjek === "warga" && f.usiaMin !== "" ? Number(f.usiaMin) : null,
      usiaMax: f.subjek === "warga" && f.usiaMax !== "" ? Number(f.usiaMax) : null,
    };
    setSimpan(true);
    try {
      await wil(f.id ? `/api/wilayah/rw/standar/${f.id}` : "/api/wilayah/rw/standar", { ...RW, method: f.id ? "PATCH" : "POST", body });
      await qc.invalidateQueries({ queryKey: ["/api/wilayah/standar"] });
      tutup();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSimpan(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && tutup()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{f.id ? "Ubah pertanyaan" : "Tambah pertanyaan"}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-medium">Ditanyakan untuk</span>
              <select className="h-9 w-full rounded-md border bg-background px-2 disabled:opacity-60" value={f.subjek} disabled={!!f.id} onChange={(e) => set({ subjek: e.target.value as Subjek })}>
                <option value="kk">Keluarga (sekali per KK)</option>
                <option value="warga">Setiap anggota keluarga</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-medium">Kelompok</span>
              {kelompokBaru ? (
                <div className="flex gap-2">
                  <Input value={f.kelompok} onChange={(e) => set({ kelompok: e.target.value })} placeholder="Nama kelompok baru" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setKelompokBaru(false); set({ kelompok: kelompokAda[0] }); }}>Batal</Button>
                </div>
              ) : (
                <select className="h-9 w-full rounded-md border bg-background px-2" value={f.kelompok}
                  onChange={(e) => (e.target.value === "__baru" ? (setKelompokBaru(true), set({ kelompok: "" })) : set({ kelompok: e.target.value }))}>
                  {kelompokAda.map((k) => <option key={k} value={k}>{k}</option>)}
                  <option value="__baru">+ Kelompok baru…</option>
                </select>
              )}
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block font-medium">Nama singkat</span>
            <Input value={f.label} maxLength={80} onChange={(e) => set({ label: e.target.value })} placeholder="mis. Kondisi atap" />
            <span className="text-xs text-muted-foreground">Dipakai di dashboard dan kartu KK.</span>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Pertanyaan untuk warga</span>
            <Textarea value={f.pertanyaan} maxLength={240} rows={2} onChange={(e) => set({ pertanyaan: e.target.value })} placeholder="Tulis dengan bahasa sehari-hari, mis. “Apakah atap rumah bocor saat hujan?”" />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Petunjuk (boleh kosong)</span>
            <Input value={f.bantuan} maxLength={240} onChange={(e) => set({ bantuan: e.target.value })} />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Jenis jawaban</span>
            <select className="h-9 w-full rounded-md border bg-background px-2" value={f.tipe} onChange={(e) => set({ tipe: e.target.value as TipeFakta })}>
              {TIPE_FAKTA.map((t) => <option key={t} value={t}>{LABEL_TIPE[t]}</option>)}
            </select>
            {f.id && <span className="text-xs text-muted-foreground">Jenis jawaban hanya bisa diganti bila belum ada jawaban tersimpan.</span>}
          </label>

          {berpilihan && (
            <div>
              <p className="mb-1 font-medium">Pilihan jawaban</p>
              <p className="mb-2 text-xs text-muted-foreground">Centang “Perlu perhatian” pada jawaban yang menandakan keluarga butuh bantuan/tindak lanjut. Pilihan yang sudah dipakai jawaban warga tidak bisa dihapus, hanya diganti namanya.</p>
              <div className="space-y-2">
                {f.pilihan.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={p.label} maxLength={100} onChange={(e) => ubahPilihan(i, { label: e.target.value })} placeholder={`Pilihan ${i + 1}`} />
                    <label className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs ${p.perhatian ? "border-rose-300 bg-rose-50 text-rose-800" : ""}`}>
                      <input type="checkbox" checked={p.perhatian} onChange={(e) => ubahPilihan(i, { perhatian: e.target.checked })} />Perlu perhatian
                    </label>
                    <Button type="button" variant="ghost" size="icon" disabled={f.pilihan.length <= 2} onClick={() => set({ pilihan: f.pilihan.filter((_, n) => n !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              {f.pilihan.length < 30 && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => set({ pilihan: [...f.pilihan, { label: "", perhatian: false }] })}><Plus className="mr-1 h-4 w-4" />Tambah pilihan</Button>}
            </div>
          )}
          {f.tipe === "yatidak" && (
            <div>
              <p className="mb-1 font-medium">Jawaban yang perlu perhatian</p>
              <div className="flex gap-2">
                {["ya", "tidak"].map((v) => (
                  <label key={v} className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 ${f.perhatianYaTidak.includes(v) ? "border-rose-300 bg-rose-50 text-rose-800" : ""}`}>
                    <input type="checkbox" checked={f.perhatianYaTidak.includes(v)}
                      onChange={(e) => set({ perhatianYaTidak: e.target.checked ? [...f.perhatianYaTidak, v] : f.perhatianYaTidak.filter((x) => x !== v) })} />
                    {v === "ya" ? "Ya" : "Tidak"}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-xl bg-muted/40 p-3">
            <label className="flex items-center justify-between gap-3">
              <span><span className="block font-medium">Tampil di formulir QR warga</span><span className="text-xs text-muted-foreground">Matikan bila hanya diisi pengurus.</span></span>
              <Switch checked={f.diQr} onCheckedChange={(v) => set({ diQr: v })} />
            </label>
            {f.subjek === "warga" && (
              <>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-medium">Hanya untuk perempuan</span>
                  <Switch checked={f.khususPerempuan} onCheckedChange={(v) => set({ khususPerempuan: v })} />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label><span className="mb-1 block font-medium">Usia mulai (tahun)</span><Input inputMode="numeric" value={f.usiaMin} onChange={(e) => set({ usiaMin: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="semua" /></label>
                  <label><span className="mb-1 block font-medium">Usia sampai (tahun)</span><Input inputMode="numeric" value={f.usiaMax} onChange={(e) => set({ usiaMax: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="semua" /></label>
                </div>
              </>
            )}
          </div>
          {err && <p className="rounded-md bg-red-50 p-2 text-red-700">{err}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={tutup}>Batal</Button>
          <Button onClick={kirim} disabled={simpan} style={{ backgroundColor: HIJAU }}>{simpan ? "Menyimpan…" : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BarisPertanyaan({ d, naik, turun, ubah, arsip, pulihkan }: {
  d: DefinisiFakta; naik?: () => void; turun?: () => void; ubah?: () => void; arsip?: () => void; pulihkan?: () => void;
}) {
  const pilihan = d.tipe === "yatidak" ? [{ nilai: "ya", label: "Ya" }, { nilai: "tidak", label: "Tidak" }] : d.pilihan ?? [];
  const syarat = [
    d.khususPerempuan ? "Perempuan" : null,
    d.usiaMin != null || d.usiaMax != null ? `Usia ${d.usiaMin ?? 0}–${d.usiaMax ?? "∞"}` : null,
    d.diQr === false ? "Hanya pengurus" : "Formulir QR",
  ].filter(Boolean);
  return (
    <li className="flex gap-3 rounded-xl border border-gray-200 bg-white p-3 transition-shadow hover:shadow-sm">
      {(naik || turun) && (
        <div className="flex flex-col gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!naik} onClick={naik} aria-label="Naikkan"><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={!turun} onClick={turun} aria-label="Turunkan"><ArrowDown className="h-4 w-4" /></Button>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold">{d.label}</p>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">{LABEL_TIPE[d.tipe]}</span>
          {syarat.map((s) => <span key={s} className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-800">{s}</span>)}
        </div>
        <p className="mt-0.5 text-sm text-gray-600">{d.pertanyaan}</p>
        {pilihan.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {pilihan.map((p) => (
              <span key={p.nilai} className={`rounded-md border px-1.5 py-0.5 text-xs ${d.perhatian?.includes(p.nilai) ? "border-rose-200 bg-rose-50 text-rose-800" : "border-gray-200 text-gray-600"}`}>{p.label}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-start">
        {ubah && <Button size="sm" variant="outline" onClick={ubah}><Pencil className="mr-1 h-3.5 w-3.5" />Ubah</Button>}
        {arsip && <Button size="sm" variant="ghost" className="text-rose-700 hover:bg-rose-50" onClick={arsip}><Archive className="mr-1 h-3.5 w-3.5" />Hapus</Button>}
        {pulihkan && <Button size="sm" variant="outline" onClick={pulihkan}><RotateCcw className="mr-1 h-3.5 w-3.5" />Pulihkan</Button>}
      </div>
    </li>
  );
}

export default function StandarData() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useStandar(true);
  const [edit, setEdit] = useState<Isian | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const segarkan = () => qc.invalidateQueries({ queryKey: ["/api/wilayah/standar"] });
  const aksi = async (fn: () => Promise<unknown>) => {
    setErr(null);
    try {
      await fn();
      await segarkan();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const aktif = (data ?? []).filter((d) => d.aktif);
  const arsip = (data ?? []).filter((d) => !d.aktif);
  const kelompokAda = Array.from(new Set([...KELOMPOK_STANDAR, ...(data ?? []).map((d) => d.kelompok)]));

  const pindah = (subjek: Subjek, id: number, arah: -1 | 1) => aksi(async () => {
    const urut = kelompokkan(aktif.filter((d) => d.subjek === subjek)).flatMap((g) => g.daftar);
    const i = urut.findIndex((d) => d.id === id);
    const j = i + arah;
    if (j < 0 || j >= urut.length || urut[i].kelompok !== urut[j].kelompok) return;
    [urut[i], urut[j]] = [urut[j], urut[i]];
    await wil("/api/wilayah/rw/standar-urutan", { ...RW, body: { ids: urut.map((d) => d.id) } });
  });

  const daftar = (subjek: Subjek) => {
    const grup = kelompokkan(aktif.filter((d) => d.subjek === subjek));
    if (!grup.length) return <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Belum ada pertanyaan.</p>;
    return (
      <div className="space-y-5">
        {grup.map((g) => (
          <section key={g.kelompok}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: HIJAU }}>{g.kelompok} <span className="font-normal text-muted-foreground">({g.daftar.length})</span></h3>
            <ul className="space-y-2">
              {g.daftar.map((d, i) => (
                <BarisPertanyaan key={d.kunci} d={d}
                  naik={i > 0 ? () => pindah(subjek, d.id!, -1) : undefined}
                  turun={i < g.daftar.length - 1 ? () => pindah(subjek, d.id!, 1) : undefined}
                  ubah={() => setEdit(dariDefinisi(d))}
                  arsip={() => {
                    if (!confirm(`Hapus pertanyaan “${d.label}”? Jawaban yang sudah ada tetap tersimpan dan pertanyaan bisa dipulihkan dari Arsip.`)) return;
                    aksi(() => wil(`/api/wilayah/rw/standar/${d.id}`, { ...RW, method: "DELETE" }));
                  }} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: HIJAU }}>Standar data warga</h1>
          <p className="text-sm text-muted-foreground">Pertanyaan yang dipakai di formulir QR, isian pengurus, kartu KK, dan dashboard. Perubahan langsung berlaku.</p>
        </div>
        <Button style={{ backgroundColor: HIJAU }} onClick={() => setEdit(isianBaru("kk"))}><Plus className="mr-2 h-4 w-4" />Tambah pertanyaan</Button>
      </div>
      {err && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700">{err}</p>}
      {isLoading && <p className="text-sm">Memuat…</p>}
      {error && <p className="text-sm text-red-700">{(error as Error).message}</p>}
      {data && (
        <Tabs defaultValue="kk">
          <TabsList>
            <TabsTrigger value="kk">Keluarga ({aktif.filter((d) => d.subjek === "kk").length})</TabsTrigger>
            <TabsTrigger value="warga">Anggota ({aktif.filter((d) => d.subjek === "warga").length})</TabsTrigger>
            <TabsTrigger value="arsip">Arsip ({arsip.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="kk" className="mt-4">{daftar("kk")}</TabsContent>
          <TabsContent value="warga" className="mt-4">{daftar("warga")}</TabsContent>
          <TabsContent value="arsip" className="mt-4">
            {arsip.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Arsip kosong.</p> : (
              <ul className="space-y-2">
                {arsip.map((d) => <BarisPertanyaan key={d.kunci} d={d} pulihkan={() => aksi(() => wil(`/api/wilayah/rw/standar/${d.id}/pulihkan`, { ...RW, method: "POST" }))} />)}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      )}
      {edit && <Editor awal={edit} kelompokAda={kelompokAda} tutup={() => setEdit(null)} />}
    </div>
  );
}
