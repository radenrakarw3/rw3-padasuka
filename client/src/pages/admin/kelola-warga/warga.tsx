import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Home, Inbox, Plus, QrCode, Search } from "lucide-react";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, HIJAU, IsianTeks, Judul, Langkah, Memuat, Pesan } from "@/components/wilayah/ui";

interface Keluarga {
  id: number; kepala: string | null; alamat: string; noUnit: string | null; anggota: number;
  kelengkapan: number; punyaRumah: boolean; punyaQr: boolean; usulanMenunggu: number;
}

function inisial(nama: string | null) {
  return (nama ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
}

export function KeluargaBaru({ selesai, awal, draftKey = "kk-baru" }: { selesai: (id: number) => void; awal?: { alamat?: string; noUnit?: string | null }; draftKey?: string }) {
  const { nilai, setNilai, hapus } = useDraft(draftKey, { langkah: 1, alamat: awal?.alamat ?? "", noUnit: awal?.noUnit ?? "", nomorKk: "" });
  const qc = useQueryClient();
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    const r = await wil<{ id: number }>("/api/wilayah/rt/keluarga", { body: { alamat: nilai.alamat, noUnit: nilai.noUnit || null, nomorKk: nilai.nomorKk } });
    hapus();
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
    return r;
  });
  const set = (p: Partial<typeof nilai>) => setNilai({ ...nilai, ...p });
  if (nilai.langkah === 1) {
    return (
      <Langkah lengket="admin" langkah={1} total={3} judul="Alamat rumah" onLanjut={() => set({ langkah: 2 })} bisaLanjut={nilai.alamat.trim().length >= 3}>
        <IsianTeks label="Alamat (jalan / gang)" nilai={nilai.alamat} onChange={(v) => set({ alamat: v })} placeholder="Contoh: Jl. Padasuka Gg. Melati" />
        <IsianTeks label="Nomor rumah (bila ada)" nilai={nilai.noUnit} onChange={(v) => set({ noUnit: v })} />
      </Langkah>
    );
  }
  if (nilai.langkah === 2) {
    return (
      <Langkah lengket="admin" langkah={2} total={3} judul="Nomor Kartu Keluarga" onKembali={() => set({ langkah: 1 })} onLanjut={() => set({ langkah: 3 })} bisaLanjut={/^\d{16}$/.test(nilai.nomorKk)}>
        <IsianTeks label="Nomor KK (16 angka)" inputMode="numeric" maks={16} nilai={nilai.nomorKk} onChange={(v) => set({ nomorKk: v.replace(/\D/g, "") })} bantuan="Lihat di bagian atas Kartu Keluarga." />
      </Langkah>
    );
  }
  return (
    <Langkah lengket="admin" langkah={3} total={3} judul="Periksa sebelum menyimpan" onKembali={() => set({ langkah: 2 })} labelLanjut="Simpan" memuat={mengirim}
      onLanjut={async () => { const r = await kirim(); if (r) selesai(r.id); }}>
      <BarisRingkas label="Alamat" nilai={`${nilai.alamat}${nilai.noUnit ? ` No. ${nilai.noUnit}` : ""}`} />
      <BarisRingkas label="Nomor KK" nilai={nilai.nomorKk} />
      <p className="text-base text-gray-600 mt-3">Setelah disimpan, tambahkan anggota keluarga dan hubungkan ke rumah.</p>
      {error && <div className="mt-4"><Pesan jenis="error">{error}</Pesan></div>}
    </Langkah>
  );
}

export default function Warga() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const [cari, setCari] = useState(params.get("cari") ?? "");
  const [tambah, setTambah] = useState(false);
  const perlu = params.get("perlu");
  const aksi = params.get("aksi");
  const { data, isLoading, error } = useQuery<Keluarga[]>({
    queryKey: ["/api/wilayah/keluarga"],
    queryFn: () => wil("/api/wilayah/keluarga?batas=1000"),
  });
  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return (data ?? []).filter((k) => {
      if (perlu === "rumah" && k.punyaRumah) return false;
      if (!q) return true;
      return (k.kepala ?? "").toLowerCase().includes(q) || k.alamat.toLowerCase().includes(q);
    });
  }, [data, cari, perlu]);

  if (tambah) {
    return (
      <div>
        <Judul kembali={() => setTambah(false)}>Keluarga baru</Judul>
        <KeluargaBaru selesai={(id) => go(`/keluarga/${id}?langkah=anggota`)} />
      </div>
    );
  }

  return (
    <div>
      <Judul sub={aksi === "catat" ? "Pilih keluarga yang berubah" : perlu === "rumah" ? "Keluarga yang belum dihubungkan ke rumah" : perlu === "cek" ? "Buka keluarga untuk mengecek data lama" : undefined}>
        Data warga & KK
      </Judul>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
          <input type="search" enterKeyHint="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kepala keluarga / alamat…"
            className="h-10 w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 text-base focus:border-[hsl(163,55%,22%)] focus:outline-none" aria-label="Cari" />
        </div>
        <button type="button" onClick={() => setTambah(true)} aria-label="Tambah keluarga baru"
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white" style={{ backgroundColor: HIJAU }}>
          <Plus className="h-4 w-4" /><span className="hidden sm:inline">Keluarga baru</span><span className="sm:hidden">KK</span>
        </button>
      </div>
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data && <p className="mb-1.5 text-xs text-gray-500">{daftar.length} keluarga</p>}
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {daftar.map((k) => (
          <li key={k.id}>
            <button type="button" onClick={() => go(`/keluarga/${k.id}`)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 active:bg-gray-100">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: HIJAU }}>{inisial(k.kepala)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{k.kepala ?? "Kepala keluarga belum dicatat"}</span>
                <span className="block truncate text-xs text-gray-500">{k.alamat}{k.noUnit ? ` No. ${k.noUnit}` : ""} · {k.anggota} orang</span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[11px]">
                {k.usulanMenunggu > 0 && <Inbox className="h-3.5 w-3.5 text-red-600" aria-label="Ada isian baru" />}
                {!k.punyaRumah && <Home className="h-3.5 w-3.5 text-amber-600" aria-label="Belum terhubung ke rumah" />}
                {k.punyaQr && <QrCode className="h-3.5 w-3.5 text-gray-400" aria-label="Punya QR" />}
                <span className={`rounded-full px-1.5 py-0.5 font-semibold ${k.kelengkapan >= 1 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{Math.round(k.kelengkapan * 100)}%</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
            </button>
          </li>
        ))}
      </ul>
      {data && daftar.length === 0 && <Pesan>Tidak ada keluarga yang cocok.</Pesan>}
    </div>
  );
}
