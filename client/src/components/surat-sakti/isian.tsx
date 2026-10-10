import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, Trash2, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { wil } from "@/lib/wilayah-api";
import { LABEL_JENIS_PIHAK, rupiah, keAngka, type DataDokumen, type Field, type JenisPihak, type KelompokField, type Pihak } from "@shared/surat-sakti";

const cls = "w-full";

function useTunda<T>(v: T, ms = 300) {
  const [t, setT] = useState(v);
  useEffect(() => {
    const h = setTimeout(() => setT(v), ms);
    return () => clearTimeout(h);
  }, [v, ms]);
  return t;
}

// ---------------------------------------------------------------- pihak
/** Pilih pihak dari data yang sudah ada (akun RT, pengurus kelompok, warga, usaha, mitra) atau tulis pihak luar. */
export function PihakPicker({ nilai, ubah, tunggal, peran = "rw" }: { nilai: Pihak[]; ubah: (p: Pihak[]) => void; tunggal?: boolean; peran?: "rt" | "rw" }) {
  const [buka, setBuka] = useState(false);
  const [q, setQ] = useState("");
  const qt = useTunda(q);
  const [manual, setManual] = useState<Pihak | null>(null);
  const { data = [], isFetching } = useQuery<(Pihak & { sumber: string })[]>({
    queryKey: ["/api/wilayah/cari-pihak", qt],
    queryFn: () => wil(`/api/wilayah/cari-pihak?q=${encodeURIComponent(qt)}`, { peran }),
    enabled: buka,
    staleTime: 60_000,
  });
  const tambah = (p: Pihak) => {
    const ada = nilai.some((x) => x.nama === p.nama && (x.peran ?? "") === (p.peran ?? ""));
    if (!ada) ubah(tunggal ? [p] : [...nilai, p]);
    setBuka(false);
    setQ("");
  };
  return (
    <div className="space-y-2">
      {nilai.length > 0 && (
        <ul className="space-y-1">
          {nilai.map((p, i) => (
            <li key={i} className="flex items-start gap-2 rounded border bg-stone-50 px-2 py-1 text-sm">
              <div className="flex-1 min-w-0">
                <Input className="h-8 mb-1" value={p.nama} aria-label="Nama" onChange={(e) => ubah(nilai.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} />
                <Input className="h-8" value={p.peran ?? ""} placeholder="Jabatan/peran (mis. Ketua RT 02, Kepala Dinas PUPR)" aria-label="Peran"
                  onChange={(e) => ubah(nilai.map((x, j) => (j === i ? { ...x, peran: e.target.value } : x)))} />
                <p className="text-[11px] text-muted-foreground mt-0.5">{LABEL_JENIS_PIHAK[p.jenis] ?? p.jenis}{p.sumber ? " · dari data sistem" : " · ditulis manual"}</p>
              </div>
              <button type="button" aria-label="Hapus" className="p-1 text-stone-500 hover:text-red-600" onClick={() => ubah(nilai.filter((_, j) => j !== i))}><X className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
      {(!tunggal || nilai.length === 0) && (
        <div className="flex flex-wrap gap-2">
          <Popover open={buka} onOpenChange={setBuka}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="justify-between min-w-[12rem]">
                Cari pengurus / RT / warga / usaha <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[min(90vw,24rem)]" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Ketik nama, RT, atau usaha…" value={q} onValueChange={setQ} />
                <CommandList>
                  <CommandEmpty>{isFetching ? "Mencari…" : "Tidak ditemukan. Tulis manual."}</CommandEmpty>
                  <CommandGroup>
                    {data.map((p, i) => (
                      <CommandItem key={`${p.sumber}-${p.sumberId ?? i}-${p.nama}`} value={`${i}`} onSelect={() => tambah({ nama: p.nama, peran: p.peran, jenis: p.jenis as JenisPihak, rt: p.rt ?? null, sumber: p.sumber, sumberId: p.sumberId })}>
                        <Check className="w-4 h-4 mr-2 opacity-0" />
                        <span className="flex-1">{p.nama}</span>
                        <span className="text-xs text-muted-foreground ml-2">{p.peran ?? LABEL_JENIS_PIHAK[p.jenis as JenisPihak]}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="ghost" size="sm" onClick={() => setManual({ nama: "", peran: "", jenis: "instansi" })}><UserPlus className="w-4 h-4 mr-1" /> Tulis manual</Button>
        </div>
      )}
      {manual && (
        <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 rounded border p-2 bg-white">
          <Input placeholder="Nama / instansi" value={manual.nama} onChange={(e) => setManual({ ...manual, nama: e.target.value })} />
          <Input placeholder="Jabatan/peran" value={manual.peran ?? ""} onChange={(e) => setManual({ ...manual, peran: e.target.value })} />
          <select className="h-10 border rounded-md px-2 text-sm" value={manual.jenis} onChange={(e) => setManual({ ...manual, jenis: e.target.value as JenisPihak })}>
            {Object.entries(LABEL_JENIS_PIHAK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-1">
            <Button type="button" size="sm" disabled={manual.nama.trim().length < 2} onClick={() => { tambah({ ...manual, nama: manual.nama.trim(), peran: manual.peran?.trim() || undefined }); setManual(null); }}>Tambah</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setManual(null)}>Batal</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- daftar & tabel
function DaftarEditor({ nilai, ubah, label }: { nilai: string[]; ubah: (v: string[]) => void; label: string }) {
  const baris = nilai.length ? nilai : [""];
  return (
    <div className="space-y-1">
      {baris.map((s, i) => (
        <div key={i} className="flex gap-1">
          <span className="w-6 pt-2 text-right text-xs text-muted-foreground">{i + 1}.</span>
          <Input value={s} aria-label={`${label} ${i + 1}`} onChange={(e) => ubah(baris.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ubah([...baris.slice(0, i + 1), "", ...baris.slice(i + 1)]); } }} />
          <button type="button" aria-label="Hapus butir" className="p-2 text-stone-400 hover:text-red-600" onClick={() => ubah(baris.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={() => ubah([...baris, ""])}><Plus className="w-4 h-4 mr-1" /> Tambah butir</Button>
    </div>
  );
}

function TabelEditor({ f, nilai, ubah }: { f: Field; nilai: Record<string, string>[]; ubah: (v: Record<string, string>[]) => void }) {
  const kolom = f.kolom ?? [];
  const kosong = () => Object.fromEntries(kolom.map((k) => [k.key, ""]));
  const baris = nilai.length ? nilai : [kosong()];
  return (
    <div className="space-y-2">
      {baris.map((r, i) => (
        <div key={i} className="rounded border p-2 bg-white">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Baris {i + 1}</span>
            <button type="button" aria-label="Hapus baris" className="p-1 text-stone-400 hover:text-red-600" onClick={() => ubah(baris.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kolom.map((k) => (
              <label key={k.key} className="text-xs space-y-0.5">
                <span>{k.label}</span>
                <Input className="h-9" type={k.tipe === "tanggal" ? "date" : "text"} inputMode={k.tipe === "angka" || k.tipe === "rupiah" ? "numeric" : undefined}
                  value={r[k.key] ?? ""} onChange={(e) => ubah(baris.map((x, j) => (j === i ? { ...x, [k.key]: e.target.value } : x)))} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => ubah([...baris, kosong()])}><Plus className="w-4 h-4 mr-1" /> Tambah baris</Button>
    </div>
  );
}

// ---------------------------------------------------------------- satu field
export function FieldInput({ f, d, ubah }: { f: Field; d: DataDokumen; ubah: (key: string, v: unknown) => void }) {
  const v = d[f.key];
  const id = `f-${f.key}`;
  const s = typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
  let isi: JSX.Element;
  switch (f.tipe) {
    case "uraian":
      isi = <Textarea id={id} rows={4} value={s} onChange={(e) => ubah(f.key, e.target.value)} />;
      break;
    case "tanggal":
      isi = <Input id={id} type="date" className="max-w-[12rem]" value={s} onChange={(e) => ubah(f.key, e.target.value)} />;
      break;
    case "waktu":
      isi = <Input id={id} type="time" className="max-w-[9rem]" value={s} onChange={(e) => ubah(f.key, e.target.value)} />;
      break;
    case "angka":
      isi = <Input id={id} inputMode="numeric" className="max-w-[12rem]" value={s} onChange={(e) => ubah(f.key, e.target.value.replace(/[^\d.,]/g, ""))} />;
      break;
    case "rupiah": {
      const n = keAngka(s);
      isi = (
        <div className="space-y-0.5">
          <Input id={id} inputMode="numeric" className="max-w-[14rem]" value={s} placeholder="mis. 1500000" onChange={(e) => ubah(f.key, e.target.value.replace(/[^\d]/g, ""))} />
          {n != null && <p className="text-xs text-muted-foreground">{rupiah(n)} — tulis hanya angka yang sudah pasti, jangan menaksir.</p>}
        </div>
      );
      break;
    }
    case "pilihan":
      isi = (
        <select id={id} className="h-10 border rounded-md px-2 text-sm w-full max-w-md bg-white" value={s} onChange={(e) => ubah(f.key, e.target.value)}>
          <option value="">— pilih —</option>
          {f.opsi?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case "centang":
      return (
        <label htmlFor={id} className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 p-2 text-sm">
          <Checkbox id={id} checked={v === true} onCheckedChange={(c) => ubah(f.key, c === true)} className="mt-0.5" />
          <span>{f.label}{f.wajib && <span className="text-red-600"> *</span>}{f.bantuan && <span className="block text-xs text-muted-foreground">{f.bantuan}</span>}</span>
        </label>
      );
    case "pihak":
      isi = <PihakPicker nilai={Array.isArray(v) ? (v as Pihak[]) : []} ubah={(p) => ubah(f.key, p)} tunggal={f.tunggal} />;
      break;
    case "daftar":
      isi = <DaftarEditor label={f.label} nilai={Array.isArray(v) ? (v as string[]) : []} ubah={(x) => ubah(f.key, x)} />;
      break;
    case "tabel":
      isi = <TabelEditor f={f} nilai={Array.isArray(v) ? (v as Record<string, string>[]) : []} ubah={(x) => ubah(f.key, x)} />;
      break;
    default:
      isi = <Input id={id} value={s} onChange={(e) => ubah(f.key, e.target.value)} />;
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={cls}>
        {f.label}{f.wajib && <span className="text-red-600"> *</span>}
        {f.internal && <span className="ml-1 text-[11px] font-normal text-muted-foreground">(tidak dicetak)</span>}
      </Label>
      {isi}
      {f.bantuan && <p className="text-xs text-muted-foreground">{f.bantuan}</p>}
    </div>
  );
}

export function KelompokForm({ k, d, ubah }: { k: KelompokField; d: DataDokumen; ubah: (key: string, v: unknown) => void }) {
  return (
    <fieldset className="rounded-lg border bg-white p-3 sm:p-4 space-y-4">
      <legend className="px-1 text-sm font-semibold text-[hsl(163,55%,22%)]">{k.judul}</legend>
      {k.fields.map((f) => <FieldInput key={f.key} f={f} d={d} ubah={ubah} />)}
    </fieldset>
  );
}
