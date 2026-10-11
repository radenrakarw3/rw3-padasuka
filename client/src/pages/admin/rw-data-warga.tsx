import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Baby, CheckCircle2, Clock, Home, MapPin, Pencil, QrCode, Search, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { wil } from "@/lib/wilayah-api";
import { defStandar, useStandar } from "@/lib/standar";
import { rt2 } from "@/components/wilayah/ui";
import { WILAYAH_RT_NUMBERS, kelompokkan, kenaPerhatian, labelNilaiFakta, type DefinisiFakta } from "@shared/wilayah";
import { jalurKelolaRt } from "./kelola-warga/konteks";

const RW = { peran: "rw" as const };
const HIJAU = "hsl(163,55%,22%)";
const EMAS = "hsl(40,45%,55%)";

interface Perhatian { kunci: string; label: string; detail: string }
interface KeluargaRingkas {
  id: number; rt: number; kepala: string | null; alamat: string; noUnit: string | null;
  anggota: number; lakiLaki: number; perempuan: number; balita: number; anak: number; lansia: number;
  kelengkapan: number; terjawab: number; pertanyaan: number; perhatian: Perhatian[]; diperbarui: string | null;
  punyaRumah: boolean; punyaQr: boolean; usulanMenunggu: number;
}
interface FaktaView { kunci: string; nilai: string; statusVerifikasi: string; mulai: string }
interface DetailKeluarga {
  kk: { id: number; rt: number; alamat: string; noUnit: string | null; nomorKk: string };
  anggota: { id: number; nama: string; nik: string; jenisKelamin: string; umur: number | null; kedudukan: string; status: string; fakta: FaktaView[] }[];
  rumah: { alamat: string; jumlahKk: number } | null;
  fakta: FaktaView[];
  qr: { kodeKartu: string; berlakuSampai: string } | null;
  usulan: { id: number; status: string; dibuat: string; kodeTerima: string }[];
  ringkas: { kelengkapan: number; terjawab: number; pertanyaan: number; perhatian: Perhatian[] };
}

const LABEL_STATUS_USULAN: Record<string, string> = {
  menunggu: "Menunggu diperiksa", diterima: "Diterima", ditolak: "Ditolak", klarifikasi: "Diminta perbaikan", digantikan: "Digantikan kiriman baru",
};

type Saring = "semua" | "perhatian" | "kosong" | "qr";
type Urut = "rt" | "lengkap_rendah" | "perhatian" | "nama";

function inisial(nama: string | null) {
  if (!nama) return "?";
  const k = nama.replace(/[^A-Za-z\s]/g, "").trim().split(/\s+/);
  return ((k[0]?.[0] ?? "") + (k.length > 1 ? k[k.length - 1][0] : "")).toUpperCase() || "?";
}

function warnaLengkap(p: number) {
  return p >= 0.8 ? "hsl(163,55%,32%)" : p >= 0.4 ? "hsl(38,85%,50%)" : "hsl(0,70%,56%)";
}

function Cincin({ nilai, ukuran = 56 }: { nilai: number; ukuran?: number }) {
  const r = (ukuran - 8) / 2;
  const kel = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: ukuran, height: ukuran }} title={`Kelengkapan data ${Math.round(nilai * 100)}%`}>
      <svg width={ukuran} height={ukuran} className="-rotate-90">
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke="hsl(160,15%,92%)" strokeWidth={6} />
        <circle cx={ukuran / 2} cy={ukuran / 2} r={r} fill="none" stroke={warnaLengkap(nilai)} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={kel} strokeDashoffset={kel * (1 - nilai)} className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">{Math.round(nilai * 100)}%</span>
    </div>
  );
}

function Chip({ ikon, children, nada = "netral" }: { ikon?: React.ReactNode; children: React.ReactNode; nada?: "netral" | "biru" | "pink" | "emas" | "ungu" }) {
  const kelas = {
    netral: "bg-gray-100 text-gray-700",
    biru: "bg-sky-50 text-sky-800",
    pink: "bg-pink-50 text-pink-800",
    emas: "bg-amber-50 text-amber-800",
    ungu: "bg-violet-50 text-violet-800",
  }[nada];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${kelas}`}>{ikon}{children}</span>;
}

function KartuKeluarga({ k, buka, ubah }: { k: KeluargaRingkas; buka: () => void; ubah: () => void }) {
  const ada = k.perhatian.length > 0;
  const aksen = ada ? "hsl(350,75%,58%)" : k.kelengkapan >= 0.8 ? "hsl(163,55%,32%)" : EMAS;
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${aksen}, ${aksen}55)` }} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-white shadow-inner ring-2 ring-offset-2"
            style={{ background: `linear-gradient(135deg, ${HIJAU}, hsl(163,45%,36%))`, ["--tw-ring-color" as string]: EMAS }}>
            {inisial(k.kepala)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-gray-900">{k.kepala ?? "Tanpa kepala keluarga"}</h3>
              <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: EMAS }}>{rt2(k.rt)}</span>
            </div>
            <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />{k.alamat}{k.noUnit ? ` No. ${k.noUnit}` : ""}
            </p>
          </div>
          <Cincin nilai={k.kelengkapan} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip ikon={<Users className="h-3.5 w-3.5" />}>{k.anggota} jiwa</Chip>
          {k.lakiLaki > 0 && <Chip nada="biru">♂ {k.lakiLaki}</Chip>}
          {k.perempuan > 0 && <Chip nada="pink">♀ {k.perempuan}</Chip>}
          {k.balita > 0 && <Chip nada="emas" ikon={<Baby className="h-3.5 w-3.5" />}>{k.balita} balita</Chip>}
          {k.anak > 0 && <Chip nada="emas">{k.anak} anak</Chip>}
          {k.lansia > 0 && <Chip nada="ungu">{k.lansia} lansia</Chip>}
        </div>

        {ada ? (
          <div className="rounded-xl bg-rose-50/70 p-2.5">
            <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />Perlu perhatian</p>
            <div className="flex flex-wrap gap-1">
              {k.perhatian.slice(0, 3).map((p) => (
                <span key={p.kunci} className="rounded-md border border-rose-200 bg-white px-2 py-0.5 text-xs text-rose-800">{p.label}: {p.detail}</span>
              ))}
              {k.perhatian.length > 3 && <span className="px-1 text-xs text-rose-700">+{k.perhatian.length - 3} lainnya</span>}
            </div>
          </div>
        ) : k.terjawab === 0 ? (
          <p className="rounded-xl border border-dashed border-gray-300 p-2.5 text-xs text-gray-500">Belum ada jawaban standar. Isi lewat “Ubah data” atau bagikan kartu QR.</p>
        ) : (
          <p className="flex items-center gap-1 rounded-xl bg-emerald-50/70 p-2.5 text-xs text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />Tidak ada tanda perlu perhatian</p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><QrCode className="h-3 w-3" />{k.punyaQr ? "QR aktif" : "Belum ada QR"}</span>
          {!k.punyaRumah && <span className="flex items-center gap-1"><Home className="h-3 w-3" />Rumah belum terhubung</span>}
          {k.diperbarui && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(k.diperbarui).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
          {k.usulanMenunggu > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Isian QR menunggu</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 border-t border-gray-100">
        <button type="button" onClick={buka} className="py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Lihat detail</button>
        <button type="button" onClick={ubah} className="flex items-center justify-center gap-1.5 border-l border-gray-100 py-2.5 text-sm font-semibold transition-colors hover:bg-emerald-50" style={{ color: HIJAU }}>
          <Pencil className="h-3.5 w-3.5" />Ubah data
        </button>
      </div>
    </article>
  );
}

function DaftarJawaban({ fakta, defs }: { fakta: FaktaView[]; defs: DefinisiFakta[] }) {
  const nilai = new Map(fakta.filter((f) => f.statusVerifikasi === "terverifikasi").map((f) => [f.kunci, f.nilai]));
  return (
    <div className="space-y-3">
      {kelompokkan(defs).map((g) => (
        <div key={g.kelompok}>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">{g.kelompok}</p>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
            {g.daftar.map((d) => {
              const v = nilai.get(d.kunci);
              const flag = kenaPerhatian(d, v);
              return (
                <div key={d.kunci} className="flex justify-between gap-2 border-b border-dashed border-gray-100 py-1 text-sm">
                  <dt className="text-gray-500">{d.label}</dt>
                  <dd className={`text-right font-medium ${v == null ? "text-gray-300" : flag ? "text-rose-700" : "text-gray-900"}`}>{v == null ? "—" : labelNilaiFakta(d, v)}</dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

function PanelDetail({ id, tutup, ubah }: { id: number; tutup: () => void; ubah: (rt: number) => void }) {
  const { data: d, isLoading, error } = useQuery<DetailKeluarga>({ queryKey: [`/api/wilayah/keluarga/${id}`, "rw"], queryFn: async () => {
    const x = await wil<DetailKeluarga>(`/api/wilayah/keluarga/${id}`, RW);
    return { ...x, ringkas: x.ringkas ? { ...x.ringkas, perhatian: x.ringkas.perhatian ?? [] } : { kelengkapan: 0, terjawab: 0, pertanyaan: 0, perhatian: [] } };
  } });
  const { data: standar } = useStandar();
  const [orang, setOrang] = useState<number | null>(null);
  const kepala = d?.anggota.find((a) => a.kedudukan === "Kepala Keluarga")?.nama ?? null;
  return (
    <Sheet open onOpenChange={(o) => !o && tutup()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="text-left">{kepala ?? "Detail keluarga"}</SheetTitle>
        </SheetHeader>
        {isLoading && <p className="mt-4 text-sm">Memuat…</p>}
        {error && <p className="mt-4 text-sm text-red-700">{(error as Error).message}</p>}
        {d && standar && (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-4 rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${HIJAU}, hsl(163,45%,34%))` }}>
              <div className="min-w-0 flex-1">
                <p className="text-sm opacity-80">{rt2(d.kk.rt)} · No. KK {d.kk.nomorKk}</p>
                <p className="truncate font-semibold">{d.kk.alamat}{d.kk.noUnit ? ` No. ${d.kk.noUnit}` : ""}</p>
                <p className="mt-1 text-xs opacity-80">{d.ringkas.terjawab} dari {d.ringkas.pertanyaan} pertanyaan terjawab{d.rumah && d.rumah.jumlahKk > 1 ? ` · serumah dengan ${d.rumah.jumlahKk - 1} KK lain` : ""}</p>
              </div>
              <div className="rounded-full bg-white p-1"><Cincin nilai={d.ringkas.kelengkapan} ukuran={60} /></div>
            </div>

            {d.ringkas.perhatian.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.ringkas.perhatian.map((p) => <span key={p.kunci} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-800">{p.label}: {p.detail}</span>)}
              </div>
            )}

            <section>
              <h4 className="mb-2 text-sm font-semibold">Keluarga & rumah</h4>
              <DaftarJawaban fakta={d.fakta} defs={standar.filter((x) => x.subjek === "kk")} />
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold">Anggota ({d.anggota.length})</h4>
              <ul className="space-y-2">
                {d.anggota.map((a) => {
                  const defs = standar.filter((x) => x.subjek === "warga");
                  const flag = a.fakta.some((f) => kenaPerhatian(defStandar(f.kunci), f.nilai));
                  return (
                    <li key={a.id} className="rounded-xl border border-gray-200">
                      <button type="button" className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOrang(orang === a.id ? null : a.id)}>
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${a.jenisKelamin === "Perempuan" ? "bg-pink-100 text-pink-800" : "bg-sky-100 text-sky-800"}`}>{inisial(a.nama)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{a.nama} {a.status !== "Aktif" && <span className="text-xs text-red-700">({a.status})</span>}</span>
                          <span className="block text-xs text-gray-500">{a.kedudukan} · {a.umur != null ? `${a.umur} th` : "umur ?"} · NIK {a.nik}</span>
                        </span>
                        {flag && <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500" />}
                      </button>
                      {orang === a.id && <div className="border-t border-gray-100 p-3"><DaftarJawaban fakta={a.fakta} defs={defs} /></div>}
                    </li>
                  );
                })}
              </ul>
            </section>

            {d.usulan.length > 0 && (
              <section>
                <h4 className="mb-1 text-sm font-semibold">Isian QR terakhir</h4>
                <ul className="text-sm text-gray-600">{d.usulan.slice(0, 5).map((u) => <li key={u.id}>{new Date(u.dibuat).toLocaleDateString("id-ID")} · {LABEL_STATUS_USULAN[u.status] ?? u.status} · kode {u.kodeTerima}</li>)}</ul>
              </section>
            )}
            <p className="text-xs text-gray-400">Membuka detail tercatat di log akses; NIK disamarkan.</p>
            <Button className="w-full" style={{ backgroundColor: HIJAU }} onClick={() => ubah(d.kk.rt)}><Pencil className="mr-2 h-4 w-4" />Ubah data keluarga ini</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Data warga seluruh RW dalam bentuk kartu per KK. Perubahan dilakukan di Kependudukan → Data warga & KK. */
export default function DataWarga() {
  const [, go] = useLocation();
  const [rt, setRt] = useState<number | null>(null);
  const [ketik, setKetik] = useState("");
  const [cari, setCari] = useState("");
  const [saring, setSaring] = useState<Saring>("semua");
  const [urut, setUrut] = useState<Urut>("rt");
  const [buka, setBuka] = useState<number | null>(null);
  useStandar();
  const { data, isLoading, error } = useQuery<KeluargaRingkas[]>({
    queryKey: ["/api/wilayah/keluarga", "rw", rt, cari],
    queryFn: async () => {
      const list = await wil<Partial<KeluargaRingkas>[]>(`/api/wilayah/keluarga?batas=1000${rt ? `&rt=${rt}` : ""}${cari ? `&cari=${encodeURIComponent(cari)}` : ""}`, RW);
      return list.map((k) => ({
        lakiLaki: 0, perempuan: 0, balita: 0, anak: 0, lansia: 0, kelengkapan: 0, terjawab: 0, pertanyaan: 0, diperbarui: null, usulanMenunggu: 0,
        ...k,
        perhatian: Array.isArray(k.perhatian) ? k.perhatian : [],
      }) as KeluargaRingkas);
    },
  });

  const hitung = useMemo(() => ({
    semua: data?.length ?? 0,
    perhatian: data?.filter((k) => k.perhatian.length).length ?? 0,
    kosong: data?.filter((k) => k.terjawab === 0).length ?? 0,
    qr: data?.filter((k) => k.usulanMenunggu > 0).length ?? 0,
  }), [data]);

  const tampil = useMemo(() => {
    let list = [...(data ?? [])];
    if (saring === "perhatian") list = list.filter((k) => k.perhatian.length);
    if (saring === "kosong") list = list.filter((k) => k.terjawab === 0);
    if (saring === "qr") list = list.filter((k) => k.usulanMenunggu > 0);
    if (urut === "lengkap_rendah") list.sort((a, b) => a.kelengkapan - b.kelengkapan);
    if (urut === "perhatian") list.sort((a, b) => b.perhatian.length - a.perhatian.length);
    if (urut === "nama") list.sort((a, b) => (a.kepala ?? "").localeCompare(b.kepala ?? ""));
    return list;
  }, [data, saring, urut]);

  const pill = (aktif: boolean) => `rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${aktif ? "text-white shadow-sm" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={pill(rt == null)} style={rt == null ? { backgroundColor: HIJAU } : undefined} onClick={() => setRt(null)}>Semua RT</button>
        {WILAYAH_RT_NUMBERS.map((n) => (
          <button key={n} type="button" className={pill(rt === n)} style={rt === n ? { backgroundColor: HIJAU } : undefined} onClick={() => setRt(n)}>{rt2(n)}</button>
        ))}
        <Button className="ml-auto" style={{ backgroundColor: HIJAU }} onClick={() => go(jalurKelolaRt(rt ?? 1, "/warga"))}><UserPlus className="mr-2 h-4 w-4" />Tambah keluarga</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form className="relative min-w-[240px] flex-1" onSubmit={(e) => { e.preventDefault(); setCari(ketik.trim()); }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="rounded-full pl-9" placeholder="Cari nama anggota atau alamat, lalu Enter" value={ketik} onChange={(e) => setKetik(e.target.value)} />
        </form>
        <select className="h-9 rounded-full border border-gray-200 bg-white px-3 text-sm" value={urut} onChange={(e) => setUrut(e.target.value as Urut)}>
          <option value="rt">Urut: RT</option>
          <option value="lengkap_rendah">Urut: data paling kurang</option>
          <option value="perhatian">Urut: paling perlu perhatian</option>
          <option value="nama">Urut: nama kepala keluarga</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["semua", "Semua", hitung.semua],
          ["perhatian", "Perlu perhatian", hitung.perhatian],
          ["kosong", "Belum diisi", hitung.kosong],
          ["qr", "Isian QR menunggu", hitung.qr],
        ] as [Saring, string, number][]).map(([v, label, n]) => (
          <button key={v} type="button" onClick={() => setSaring(v)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors ${saring === v ? "border-transparent text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
            style={saring === v ? { backgroundColor: v === "perhatian" ? "hsl(350,70%,52%)" : HIJAU } : undefined}>
            {label}<span className={`rounded-md px-1.5 text-xs font-bold ${saring === v ? "bg-white/25" : "bg-gray-100"}`}>{n}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-2xl bg-gray-100" />)}
        </div>
      )}
      {error && <p className="text-sm text-red-700">{(error as Error).message}</p>}
      {data && tampil.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">Tidak ada keluarga yang cocok.</div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tampil.map((k) => (
          <KartuKeluarga key={k.id} k={k} buka={() => setBuka(k.id)} ubah={() => go(jalurKelolaRt(k.rt, `/keluarga/${k.id}`))} />
        ))}
      </div>
      {buka && <PanelDetail id={buka} tutup={() => setBuka(null)} ubah={(r) => go(jalurKelolaRt(r, `/keluarga/${buka}`))} />}
    </div>
  );
}
