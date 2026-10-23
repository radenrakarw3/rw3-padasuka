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
import { LABEL_JENIS_PIHAK, rupiah, keAngka, saranField, type DataDokumen, type Field, type JenisPihak, type KelompokField, type Pihak } from "@shared/surat-sakti";

const hariIniPlus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
};
const labelHari = (n: number) => (n === 0 ? "Hari ini" : n === -1 ? "Kemarin" : n === 1 ? "Besok" : n < 0 ? `${-n} hari lalu` : `+${n} hari`);

/** Pilihan cepat: diketuk untuk mengisi; yang sedang terpilih/sudah ada ditandai. */
function Chip({ teks, aktif, klik }: { teks: string; aktif?: boolean; klik: () => void }) {
  return (
    <button type="button" onClick={klik}
      className={`min-h-9 rounded-full border px-3 py-1 text-left text-xs leading-snug sm:min-h-0 ${aktif ? "border-[hsl(163,55%,22%)] bg-emerald-50 text-[hsl(163,55%,22%)]" : "bg-white hover:border-[hsl(163,55%,22%)] hover:bg-emerald-50/50"}`}>
      {aktif ? "✓ " : "+ "}{teks}
    </button>
  );
}

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
export function PihakPicker({ nilai, ubah, tunggal, peran = "rw", preset }: { nilai: Pihak[]; ubah: (p: Pihak[]) => void; tunggal?: boolean; peran?: "rt" | "rw"; preset?: readonly Pihak[] }) {
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
            <li key={i} className="flex items-start gap-2 rounded border bg-stone-50 p-2 text-sm sm:px-2 sm:py-1">
              <div className="flex-1 min-w-0">
                <Input className="mb-1 sm:h-8" value={p.nama} aria-label="Nama" onChange={(e) => ubah(nilai.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))} />
                <Input className="sm:h-8" value={p.peran ?? ""} placeholder="Jabatan/peran (mis. Ketua RT 02, Kepala Dinas PUPR)" aria-label="Peran"
                  onChange={(e) => ubah(nilai.map((x, j) => (j === i ? { ...x, peran: e.target.value } : x)))} />
                <p className="text-xs text-muted-foreground mt-0.5">{LABEL_JENIS_PIHAK[p.jenis] ?? p.jenis}{p.sumber ? " · dari data sistem" : " · ditulis manual"}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Hapus" className="shrink-0 text-stone-500 hover:text-red-600" onClick={() => ubah(nilai.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
            </li>
          ))}
        </ul>
      )}
      {preset && preset.length > 0 && (!tunggal || nilai.length === 0) && (
        <div className="flex flex-wrap gap-1.5">
          {preset.filter((p) => !nilai.some((x) => x.nama === p.nama)).map((p) => <Chip key={p.nama} teks={p.nama} klik={() => tambah(p)} />)}
        </div>
      )}
      {(!tunggal || nilai.length === 0) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Popover open={buka} onOpenChange={setBuka}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full min-w-0 justify-between sm:w-auto sm:min-w-[12rem]">
                <span className="truncate">Cari pengurus / RT / warga / usaha</span> <ChevronsUpDown className="w-4 h-4 ml-2 opacity-50" />
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
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setManual({ nama: "", peran: "", jenis: "instansi" })}><UserPlus className="w-4 h-4 mr-1" /> Tulis manual</Button>
        </div>
      )}
      {manual && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 rounded border p-2 bg-white">
          <Input placeholder="Nama / instansi" value={manual.nama} onChange={(e) => setManual({ ...manual, nama: e.target.value })} />
          <Input placeholder="Jabatan/peran" value={manual.peran ?? ""} onChange={(e) => setManual({ ...manual, peran: e.target.value })} />
          <select className="h-12 border rounded-md bg-white px-2 text-base sm:h-10 sm:text-sm" aria-label="Jenis pihak" value={manual.jenis} onChange={(e) => setManual({ ...manual, jenis: e.target.value as JenisPihak })}>
            {Object.entries(LABEL_JENIS_PIHAK).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="flex gap-1 [&>button]:flex-1 sm:[&>button]:flex-none">
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
          <span className="w-6 shrink-0 pt-3 text-right text-xs text-muted-foreground sm:pt-2">{i + 1}.</span>
          <Input className="min-w-0" value={s} aria-label={`${label} ${i + 1}`} onChange={(e) => ubah(baris.map((x, j) => (j === i ? e.target.value : x)))}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ubah([...baris.slice(0, i + 1), "", ...baris.slice(i + 1)]); } }} />
          <Button type="button" variant="ghost" size="icon" aria-label="Hapus butir" className="shrink-0 text-stone-400 hover:text-red-600" onClick={() => ubah(baris.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
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
            <Button type="button" variant="ghost" size="icon" aria-label="Hapus baris" className="text-stone-400 hover:text-red-600" onClick={() => ubah(baris.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {kolom.map((k) => (
              <label key={k.key} className="block text-sm space-y-0.5 sm:text-xs">
                <span>{k.label}</span>
                <Input className="sm:h-9" type={k.tipe === "tanggal" ? "date" : "text"} inputMode={k.tipe === "angka" || k.tipe === "rupiah" ? "numeric" : undefined}
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
        <select id={id} className="h-12 border rounded-md px-2 text-base w-full max-w-md bg-white sm:h-10 sm:text-sm" value={s} onChange={(e) => ubah(f.key, e.target.value)}>
          <option value="">— pilih —</option>
          {f.opsi?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case "centang":
      return (
        <label htmlFor={id} className="flex items-start gap-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm sm:gap-2 sm:p-2">
          <Checkbox id={id} checked={v === true} onCheckedChange={(c) => ubah(f.key, c === true)} className="mt-0.5" />
          <span>{f.label}{f.wajib && <span className="text-red-600"> *</span>}{f.bantuan && <span className="block text-xs text-muted-foreground">{f.bantuan}</span>}</span>
        </label>
      );
    case "pihak":
      isi = <PihakPicker nilai={Array.isArray(v) ? (v as Pihak[]) : []} ubah={(p) => ubah(f.key, p)} tunggal={f.tunggal} preset={f.preset} />;
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
  const saran = saranField(f, d);
  let cepat: JSX.Element | null = null;
  if (f.tipe === "tanggal" && f.cepat?.length) {
    cepat = (
      <div className="flex flex-wrap gap-1.5">
        {f.cepat.map((n) => {
          const t = hariIniPlus(n);
          return <Chip key={n} teks={labelHari(n)} aktif={s === t} klik={() => ubah(f.key, t)} />;
        })}
      </div>
    );
  } else if (saran.length && f.tipe === "daftar") {
    const ada = Array.isArray(v) ? (v as string[]).filter((x) => typeof x === "string" && x.trim()) : [];
    cepat = (
      <div className="flex flex-wrap gap-1.5">
        {saran.map((x) => {
          const aktif = ada.includes(x);
          return <Chip key={x} teks={x} aktif={aktif} klik={() => ubah(f.key, aktif ? ada.filter((y) => y !== x) : [...ada, x])} />;
        })}
      </div>
    );
  } else if (saran.length) {
    cepat = <div className="flex flex-wrap gap-1.5">{saran.map((x) => <Chip key={x} teks={x} aktif={s === x} klik={() => ubah(f.key, x)} />)}</div>;
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className={cls}>
        {f.label}{f.wajib && <span className="text-red-600"> *</span>}
        {f.internal && <span className="ml-1 text-[11px] font-normal text-muted-foreground">(tidak dicetak)</span>}
      </Label>
      {cepat && <p className="text-[11px] text-muted-foreground">Ketuk pilihan cepat atau tulis sendiri:</p>}
      {cepat}
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
