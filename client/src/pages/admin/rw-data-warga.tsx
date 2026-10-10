import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wil } from "@/lib/wilayah-api";
import { IsianTeks, Pesan, PilihTombol, TombolBesar, Langkah, rt2 } from "@/components/wilayah/ui";
import { FormIsiKeluarga } from "@/components/wilayah/form-isi-keluarga";
import { FAKTA_BY_KUNCI, WILAYAH_RT_NUMBERS, labelNilaiFakta } from "@shared/wilayah";

const RW = { peran: "rw" as const };

interface KeluargaRingkas { id: number; rt: number; kepala: string | null; alamat: string; noUnit: string | null; anggota: number; kelengkapan: number; usulanMenunggu: number }
interface FaktaView { kunci: string; nilai: string; statusVerifikasi: string }
interface DetailKeluarga {
  kk: { id: number; rt: number; alamat: string; noUnit: string | null; nomorKk: string };
  anggota: { id: number; nama: string; nik: string; jenisKelamin: string; umur: number | null; kedudukan: string; status: string; fakta: FaktaView[] }[];
  rumah: { alamat: string; jumlahKk: number; fakta: FaktaView[] } | null;
  fakta: FaktaView[];
  usulan: { id: number; status: string; dibuat: string; kodeTerima: string }[];
}
interface UsulanRw { id: number; rt: number; status: string; kode_terima: string; catatan_rt: string | null; created_at: string; pengisi: string; kepala: string | null; alamat: string; keluarga_baru: boolean }

const LABEL_STATUS_USULAN: Record<string, string> = {
  menunggu: "Menunggu diperiksa RT", diterima: "Diterima RT", ditolak: "Ditolak RT", klarifikasi: "RT minta perbaikan", digantikan: "Digantikan kiriman baru",
};

function Galat({ e }: { e: unknown }) {
  return e ? <p className="text-sm text-red-700">{(e as Error).message}</p> : null;
}

type Mode = { t: "daftar" } | { t: "isi"; kkId: number; label: string; rt: number } | { t: "baru" } | { t: "terkirim"; kode: string; rt: number };

/** Formulir untuk keluarga yang belum terdaftar: RT & alamat dulu, lalu formulir yang sama dengan warga. */
function FormKeluargaBaru({ selesai, batal }: { selesai: (kode: string, rt: number) => void; batal: () => void }) {
  const [rt, setRt] = useState<number | null>(null);
  const [alamat, setAlamat] = useState("");
  const [noUnit, setNoUnit] = useState("");
  const [lanjut, setLanjut] = useState(false);
  if (!lanjut || !rt) {
    return (
      <Langkah langkah={1} total={1} judul="Keluarga belum terdaftar" onKembali={batal} onLanjut={() => setLanjut(true)} bisaLanjut={!!rt && alamat.trim().length >= 3}>
        <Pesan>Isian dikirim ke Ketua RT yang dipilih. Ketua RT mendaftarkan KK-nya (dengan nomor KK & NIK) lalu menerapkan isian ini.</Pesan>
        <div className="mt-4" />
        <PilihTombol label="Tinggal di RT" belumTahu={false} nilai={rt ? String(rt) : null} onChange={(v) => v && setRt(Number(v))}
          pilihan={WILAYAH_RT_NUMBERS.map((n) => ({ nilai: String(n), label: rt2(n) }))} />
        <IsianTeks label="Alamat (jalan / gang)" nilai={alamat} onChange={setAlamat} />
        <IsianTeks label="Nomor rumah (bila ada)" nilai={noUnit} onChange={setNoUnit} />
      </Langkah>
    );
  }
  return (
    <FormIsiKeluarga
      draftKey={`rw-isi:baru:${rt}:${alamat.trim().toLowerCase()}`}
      labelPengisi="Nama warga yang datang"
      pembuka={<Pesan>Keluarga baru di {rt2(rt)}: {alamat}{noUnit ? ` No. ${noUnit}` : ""}. Isian diperiksa Ketua RT sebelum masuk data resmi.</Pesan>}
      batal={() => setLanjut(false)}
      kirimKe={(isi, kunci) => wil<{ kodeTerima: string }>("/api/wilayah/rw/usulan", { ...RW, body: { idempotencyKey: kunci, keluargaBaru: { rt, alamat: alamat.trim(), noUnit: noUnit.trim() || null }, isi } })}
      selesai={(k) => selesai(k, rt)}
    />
  );
}

function DetailPanel({ id, isi }: { id: number; isi: (d: DetailKeluarga) => void }) {
  const { data: d, isLoading, error } = useQuery<DetailKeluarga>({ queryKey: [`/api/wilayah/keluarga/${id}`, "rw"], queryFn: () => wil(`/api/wilayah/keluarga/${id}`, RW) });
  if (isLoading) return <p className="text-sm">Memuat…</p>;
  if (error || !d) return <Galat e={error} />;
  const faktaRt = [...d.fakta, ...(d.rumah?.fakta ?? [])].filter((f) => f.statusVerifikasi === "terverifikasi");
  return (
    <div className="border-t pt-3 mt-2 space-y-3 text-sm">
      <p><b>{d.kk.alamat}{d.kk.noUnit ? ` No. ${d.kk.noUnit}` : ""}</b> · {rt2(d.kk.rt)} · No. KK {d.kk.nomorKk}{d.rumah && d.rumah.jumlahKk > 1 ? ` · satu rumah dengan ${d.rumah.jumlahKk - 1} KK lain` : ""}</p>
      <table className="w-full text-left">
        <thead className="text-xs text-muted-foreground"><tr><th>Nama</th><th>Kedudukan</th><th>Umur</th><th>NIK</th><th>Status</th></tr></thead>
        <tbody>
          {d.anggota.map((a) => (
            <tr key={a.id} className="border-t"><td className="py-1">{a.nama}</td><td>{a.kedudukan}</td><td>{a.umur ?? "?"}</td><td>{a.nik}</td><td>{a.status}</td></tr>
          ))}
        </tbody>
      </table>
      <div>
        <p className="font-medium">Kondisi rumah tangga (terverifikasi RT)</p>
        {faktaRt.length === 0 ? <p className="text-muted-foreground">Belum ada data terverifikasi.</p> : (
          <ul className="grid sm:grid-cols-2 gap-x-4">
            {faktaRt.map((f) => <li key={f.kunci}>{FAKTA_BY_KUNCI.get(f.kunci)?.label ?? f.kunci}: <b>{labelNilaiFakta(FAKTA_BY_KUNCI.get(f.kunci), f.nilai)}</b></li>)}
          </ul>
        )}
      </div>
      {d.usulan.length > 0 && (
        <div>
          <p className="font-medium">Isian/usulan terakhir</p>
          <ul>{d.usulan.slice(0, 5).map((u) => <li key={u.id}>{new Date(u.dibuat).toLocaleDateString("id-ID")} · {LABEL_STATUS_USULAN[u.status] ?? u.status} · kode {u.kodeTerima}</li>)}</ul>
        </div>
      )}
      <Button onClick={() => isi(d)}>Isi formulir untuk keluarga ini</Button>
    </div>
  );
}

function RiwayatRw() {
  const { data, isLoading, error } = useQuery<UsulanRw[]>({ queryKey: ["/api/wilayah/rw/usulan"], queryFn: () => wil("/api/wilayah/rw/usulan", RW) });
  return (
    <section className="border rounded-lg p-3">
      <h3 className="font-semibold mb-2">Formulir yang diinput di RW</h3>
      {isLoading && <p className="text-sm">Memuat…</p>}
      <Galat e={error} />
      {data?.length === 0 && <p className="text-sm text-muted-foreground">Belum ada.</p>}
      <ul className="text-sm divide-y">
        {data?.map((u) => (
          <li key={u.id} className="py-2 flex flex-wrap gap-x-3 gap-y-1 justify-between">
            <span>{new Date(u.created_at).toLocaleDateString("id-ID")} · {rt2(u.rt)} · {u.keluarga_baru ? `Keluarga baru (${u.alamat})` : u.kepala ?? u.alamat} · diisi {u.pengisi}</span>
            <span>
              <b>{LABEL_STATUS_USULAN[u.status] ?? u.status}</b> · kode <span className="font-mono">{u.kode_terima}</span>
              {u.catatan_rt && (u.status === "klarifikasi" || u.status === "ditolak") ? <span className="block text-xs text-muted-foreground">Pesan RT: {u.catatan_rt}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Data warga seluruh RW (hanya baca) + formulir untuk warga yang datang langsung ke RW.
 * Formulir RW masuk antrean Ketua RT yang bersangkutan sehingga data RT dan RW tetap satu sumber.
 */
export default function DataWarga() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>({ t: "daftar" });
  const [rt, setRt] = useState<string>("");
  const [ketik, setKetik] = useState("");
  const [cari, setCari] = useState("");
  const [buka, setBuka] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery<KeluargaRingkas[]>({
    queryKey: ["/api/wilayah/keluarga", "rw", rt, cari],
    queryFn: () => wil(`/api/wilayah/keluarga?batas=300${rt ? `&rt=${rt}` : ""}${cari ? `&cari=${encodeURIComponent(cari)}` : ""}`, RW),
  });

  const selesai = async (kode: string, rtTujuan: number) => {
    setMode({ t: "terkirim", kode, rt: rtTujuan });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rw/usulan"] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
  };

  if (mode.t === "isi") {
    return (
      <div className="max-w-xl text-lg">
        <FormIsiKeluarga
          draftKey={`rw-isi:kk:${mode.kkId}`}
          labelPengisi="Nama warga yang datang"
          pembuka={<Pesan>Formulir untuk keluarga <b>{mode.label}</b> ({rt2(mode.rt)}). Isian dikirim ke Ketua RT untuk diperiksa; data resmi baru berubah setelah RT menerima.</Pesan>}
          batal={() => setMode({ t: "daftar" })}
          kirimKe={(isi, kunci) => wil<{ kodeTerima: string }>("/api/wilayah/rw/usulan", { ...RW, body: { idempotencyKey: kunci, kkId: mode.kkId, isi } })}
          selesai={(k) => selesai(k, mode.rt)}
        />
      </div>
    );
  }
  if (mode.t === "baru") {
    return <div className="max-w-xl text-lg"><FormKeluargaBaru batal={() => setMode({ t: "daftar" })} selesai={selesai} /></div>;
  }
  if (mode.t === "terkirim") {
    return (
      <div className="max-w-xl text-lg space-y-4">
        <Pesan jenis="sukses">Formulir terkirim ke Ketua {rt2(mode.rt)}. Data resmi berubah setelah Ketua RT memeriksa dan menerima.</Pesan>
        <p>Kode tanda terima untuk warga (bisa dicek di rw3padasukacimahi.org/isi/status):</p>
        <p className="text-3xl font-bold tracking-widest text-center bg-white rounded-2xl border-2 p-4 font-mono">{mode.kode}</p>
        <TombolBesar onClick={() => setMode({ t: "daftar" })}>Selesai</TombolBesar>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-muted-foreground block">RT</label>
          <select className="border rounded-md h-9 px-2 bg-background" value={rt} onChange={(e) => setRt(e.target.value)}>
            <option value="">Semua RT</option>
            {WILAYAH_RT_NUMBERS.map((n) => <option key={n} value={n}>{rt2(n)}</option>)}
          </select>
        </div>
        <form className="flex gap-2 flex-1 min-w-[240px]" onSubmit={(e) => { e.preventDefault(); setCari(ketik.trim()); }}>
          <Input placeholder="Cari nama warga / alamat" value={ketik} onChange={(e) => setKetik(e.target.value)} />
          <Button type="submit" variant="outline">Cari</Button>
        </form>
        <Button onClick={() => setMode({ t: "baru" })}>Formulir keluarga belum terdaftar</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Data ini sama dengan yang dipakai Ketua RT (satu sumber). Warga yang datang ke RW: pilih keluarganya lalu “Isi formulir”, atau pakai
        “Formulir keluarga belum terdaftar”. Isian masuk antrean Ketua RT. Membuka detail tercatat di log akses; NIK disamarkan.
      </p>
      {isLoading && <p className="text-sm">Memuat…</p>}
      <Galat e={error} />
      {data && <p className="text-sm text-muted-foreground">{data.length >= 300 ? "300+ keluarga — persempit dengan RT atau pencarian" : `${data.length} keluarga`}</p>}
      <ul className="divide-y border rounded-lg">
        {data?.map((k) => (
          <li key={k.id} className="p-3">
            <div className="flex flex-wrap justify-between gap-2 items-center">
              <span className="text-sm">
                <b>{k.kepala ?? "Tanpa kepala keluarga"}</b> · {rt2(k.rt)} · {k.alamat}{k.noUnit ? ` No. ${k.noUnit}` : ""} · {k.anggota} org · data {Math.round(k.kelengkapan * 100)}%
                {k.usulanMenunggu > 0 && <span className="ml-2 text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">isian menunggu RT</span>}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setBuka(buka === k.id ? null : k.id)}>{buka === k.id ? "Tutup" : "Detail"}</Button>
                <Button size="sm" variant="outline" onClick={() => setMode({ t: "isi", kkId: k.id, label: k.kepala ?? k.alamat, rt: k.rt })}>Isi formulir</Button>
              </span>
            </div>
            {buka === k.id && <DetailPanel id={k.id} isi={(d) => setMode({ t: "isi", kkId: d.kk.id, label: k.kepala ?? d.kk.alamat, rt: d.kk.rt })} />}
          </li>
        ))}
      </ul>
      <RiwayatRw />
    </div>
  );
}
