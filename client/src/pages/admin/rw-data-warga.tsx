import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { wil } from "@/lib/wilayah-api";
import { rt2 } from "@/components/wilayah/ui";
import { FAKTA_BY_KUNCI, WILAYAH_RT_NUMBERS, labelNilaiFakta } from "@shared/wilayah";
import { jalurKelolaRt } from "./kelola-warga/konteks";

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

const LABEL_STATUS_USULAN: Record<string, string> = {
  menunggu: "Menunggu diperiksa", diterima: "Diterima", ditolak: "Ditolak", klarifikasi: "Diminta perbaikan", digantikan: "Digantikan kiriman baru",
};

function Galat({ e }: { e: unknown }) {
  return e ? <p className="text-sm text-red-700">{(e as Error).message}</p> : null;
}

function DetailPanel({ id }: { id: number }) {
  const { data: d, isLoading, error } = useQuery<DetailKeluarga>({ queryKey: [`/api/wilayah/keluarga/${id}`, "rw"], queryFn: () => wil(`/api/wilayah/keluarga/${id}`, RW) });
  if (isLoading) return <p className="text-sm">Memuat…</p>;
  if (error || !d) return <Galat e={error} />;
  const faktaTerverifikasi = [...d.fakta, ...(d.rumah?.fakta ?? [])].filter((f) => f.statusVerifikasi === "terverifikasi");
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
        <p className="font-medium">Kondisi rumah tangga (terverifikasi)</p>
        {faktaTerverifikasi.length === 0 ? <p className="text-muted-foreground">Belum ada data terverifikasi.</p> : (
          <ul className="grid sm:grid-cols-2 gap-x-4">
            {faktaTerverifikasi.map((f) => <li key={f.kunci}>{FAKTA_BY_KUNCI.get(f.kunci)?.label ?? f.kunci}: <b>{labelNilaiFakta(FAKTA_BY_KUNCI.get(f.kunci), f.nilai)}</b></li>)}
          </ul>
        )}
      </div>
      {d.usulan.length > 0 && (
        <div>
          <p className="font-medium">Isian QR terakhir</p>
          <ul>{d.usulan.slice(0, 5).map((u) => <li key={u.id}>{new Date(u.dibuat).toLocaleDateString("id-ID")} · {LABEL_STATUS_USULAN[u.status] ?? u.status} · kode {u.kodeTerima}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/** Data warga seluruh RW (baca). Perubahan dilakukan di Kependudukan → Data warga & KK. */
export default function DataWarga() {
  const [, go] = useLocation();
  const [rt, setRt] = useState<string>("");
  const [ketik, setKetik] = useState("");
  const [cari, setCari] = useState("");
  const [buka, setBuka] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery<KeluargaRingkas[]>({
    queryKey: ["/api/wilayah/keluarga", "rw", rt, cari],
    queryFn: () => wil(`/api/wilayah/keluarga?batas=300${rt ? `&rt=${rt}` : ""}${cari ? `&cari=${encodeURIComponent(cari)}` : ""}`, RW),
  });

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
        <Button onClick={() => go(jalurKelolaRt(rt ? Number(rt) : 1, "/warga"))}>Tambah / ubah data warga</Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Membuka detail tercatat di log akses; NIK disamarkan. Untuk mengubah data, tekan “Ubah data” pada keluarga yang bersangkutan.
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
                {k.usulanMenunggu > 0 && <span className="ml-2 text-xs rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">isian QR menunggu</span>}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setBuka(buka === k.id ? null : k.id)}>{buka === k.id ? "Tutup" : "Detail"}</Button>
                <Button size="sm" variant="outline" onClick={() => go(jalurKelolaRt(k.rt, `/keluarga/${k.id}`))}>Ubah data</Button>
              </span>
            </div>
            {buka === k.id && <DetailPanel id={k.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
