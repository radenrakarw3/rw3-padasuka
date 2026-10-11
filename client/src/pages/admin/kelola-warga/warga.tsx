import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Home, Inbox, Plus, QrCode } from "lucide-react";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, HIJAU, IsianTeks, Judul, Langkah, Memuat, Pesan, TombolBesar } from "@/components/wilayah/ui";

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
      <Langkah langkah={1} total={3} judul="Alamat rumah" onLanjut={() => set({ langkah: 2 })} bisaLanjut={nilai.alamat.trim().length >= 3}>
        <IsianTeks label="Alamat (jalan / gang)" nilai={nilai.alamat} onChange={(v) => set({ alamat: v })} placeholder="Contoh: Jl. Padasuka Gg. Melati" />
        <IsianTeks label="Nomor rumah (bila ada)" nilai={nilai.noUnit} onChange={(v) => set({ noUnit: v })} />
      </Langkah>
    );
  }
  if (nilai.langkah === 2) {
    return (
      <Langkah langkah={2} total={3} judul="Nomor Kartu Keluarga" onKembali={() => set({ langkah: 1 })} onLanjut={() => set({ langkah: 3 })} bisaLanjut={/^\d{16}$/.test(nilai.nomorKk)}>
        <IsianTeks label="Nomor KK (16 angka)" inputMode="numeric" maks={16} nilai={nilai.nomorKk} onChange={(v) => set({ nomorKk: v.replace(/\D/g, "") })} bantuan="Lihat di bagian atas Kartu Keluarga." />
      </Langkah>
    );
  }
  return (
    <Langkah langkah={3} total={3} judul="Periksa sebelum menyimpan" onKembali={() => set({ langkah: 2 })} labelLanjut="Simpan" memuat={mengirim}
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
      <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari nama kepala keluarga atau alamat…"
        className="w-full min-h-[56px] rounded-2xl border-2 border-gray-300 px-4 text-lg bg-white mb-3" aria-label="Cari" />
      <div className="mb-4"><TombolBesar varian="kedua" ikon={<Plus className="w-6 h-6" />} onClick={() => setTambah(true)}>Tambah keluarga baru</TombolBesar></div>
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data && <p className="text-base text-gray-600 mb-2">{daftar.length} keluarga</p>}
      <ul className="bg-white rounded-2xl border-2 border-gray-200 divide-y-2 divide-gray-100">
        {daftar.map((k) => (
          <li key={k.id}>
            <button type="button" onClick={() => go(`/keluarga/${k.id}`)} className="w-full min-h-[76px] px-4 py-3 flex items-center gap-3 text-left active:bg-gray-50">
              <span className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0" style={{ backgroundColor: HIJAU }}>{inisial(k.kepala)}</span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold truncate">{k.kepala ?? "Kepala keluarga belum dicatat"}</span>
                <span className="block text-base text-gray-600 truncate">{k.alamat}{k.noUnit ? ` No. ${k.noUnit}` : ""} · {k.anggota} orang</span>
                <span className="flex gap-3 mt-1 text-base">
                  <span className={k.kelengkapan >= 1 ? "text-green-700" : "text-amber-700"}>Data {Math.round(k.kelengkapan * 100)}%</span>
                  {!k.punyaRumah && <span className="text-amber-700 flex items-center gap-1"><Home className="w-4 h-4" /> rumah</span>}
                  {k.punyaQr && <span className="text-gray-600 flex items-center gap-1"><QrCode className="w-4 h-4" /> QR</span>}
                  {k.usulanMenunggu > 0 && <span className="text-red-700 flex items-center gap-1"><Inbox className="w-4 h-4" /> isian baru</span>}
                </span>
              </span>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
      {data && daftar.length === 0 && <Pesan>Tidak ada keluarga yang cocok.</Pesan>}
    </div>
  );
}
