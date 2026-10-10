import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, IsianPanjang, IsianTeks, Judul, Langkah, Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import { FormFakta, kunciAwal } from "@/components/wilayah/form-fakta";
import { JENIS_FASILITAS, JENIS_KEGIATAN, JENIS_KELOMPOK, KATEGORI_USAHA, isoTanggal } from "@shared/wilayah";
import { SuratRt } from "@/components/surat-sakti/rt-surat";

type Tab = "usaha" | "fasilitas" | "kelompok" | "kegiatan" | "surat";
const opsi = (l: readonly { nilai: string; label: string }[]) => l.map((x) => ({ nilai: x.nilai, label: x.label }));
const labelDari = (l: readonly { nilai: string; label: string }[], v: string) => l.find((x) => x.nilai === v)?.label ?? v;

function FormUsaha({ selesai, batal }: { selesai: () => void; batal: () => void }) {
  const { nilai: d, setNilai, hapus } = useDraft("usaha-baru", { i: 1, nama: "", kategori: "", pemilik: [] as number[], cari: "" });
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const { data: hasil } = useQuery<{ id: number; nama: string; alamat: string }[]>({
    queryKey: ["/api/wilayah/cari-warga", d.cari], queryFn: () => wil(`/api/wilayah/cari-warga?q=${encodeURIComponent(d.cari)}`), enabled: d.cari.trim().length >= 2,
  });
  const [namaPemilik, setNamaPemilik] = useState<Record<number, string>>({});
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    await wil("/api/wilayah/rt/usaha", { body: { nama: d.nama, kategori: d.kategori || null, pemilikWargaIds: d.pemilik } });
    hapus();
    return true;
  });
  if (d.i === 1) {
    return (
      <Langkah langkah={1} total={3} judul="Nama & jenis usaha" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={d.nama.trim().length >= 2}>
        <IsianTeks label="Nama usaha" nilai={d.nama} onChange={(v) => set({ nama: v })} />
        <PilihTombol label="Jenis usaha" kolom={1} nilai={d.kategori || null} onChange={(v) => set({ kategori: v ?? "" })} pilihan={opsi(KATEGORI_USAHA)} />
      </Langkah>
    );
  }
  if (d.i === 2) {
    return (
      <Langkah langkah={2} total={3} judul="Pemilik usaha" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })} bisaLanjut={d.pemilik.length > 0}>
        <IsianTeks label="Cari nama pemilik (warga RT ini)" nilai={d.cari} onChange={(v) => set({ cari: v })} />
        {(hasil ?? []).map((w) => {
          const aktif = d.pemilik.includes(w.id);
          return (
            <button key={w.id} type="button" onClick={() => { setNamaPemilik({ ...namaPemilik, [w.id]: w.nama }); set({ pemilik: aktif ? d.pemilik.filter((x) => x !== w.id) : [...d.pemilik, w.id] }); }}
              className={`w-full min-h-[56px] rounded-xl border-2 px-3 mb-2 text-left text-lg ${aktif ? "bg-green-50 border-green-600" : "bg-white border-gray-300"}`}>
              {aktif ? "✓ " : ""}{w.nama} <span className="text-base text-gray-600">· {w.alamat}</span>
            </button>
          );
        })}
        <p className="text-base text-gray-600">{d.pemilik.length} pemilik dipilih.</p>
      </Langkah>
    );
  }
  return (
    <Langkah langkah={3} total={3} judul="Periksa sebelum menyimpan" onKembali={() => set({ i: 2 })} labelLanjut="Simpan" memuat={mengirim} onLanjut={async () => { if (await kirim()) selesai(); }}>
      <BarisRingkas label="Nama usaha" nilai={d.nama} />
      <BarisRingkas label="Jenis" nilai={d.kategori ? labelDari(KATEGORI_USAHA, d.kategori) : null} />
      <BarisRingkas label="Pemilik" nilai={d.pemilik.map((id) => namaPemilik[id] ?? `#${id}`).join(", ")} />
      <p className="text-base text-gray-600 mt-2">Izin (NIB, PIRT, halal, dll.) diisi setelah disimpan.</p>
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

function FormObjek({ tab, selesai, batal }: { tab: "fasilitas" | "kelompok" | "kegiatan"; selesai: () => void; batal: () => void }) {
  const daftar = tab === "fasilitas" ? JENIS_FASILITAS : tab === "kelompok" ? JENIS_KELOMPOK : JENIS_KEGIATAN.filter((j) => j.nilai !== "rembug_rw");
  const { nilai: d, setNilai, hapus } = useDraft(`${tab}-baru`, { i: 1, jenis: "", nama: "", lokasi: "", tanggal: isoTanggal(new Date()), uraian: "" });
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    if (tab === "kegiatan") await wil("/api/wilayah/kegiatan", { body: { jenis: d.jenis, judul: d.nama, tanggal: d.tanggal, lokasi: d.lokasi || null, uraian: d.uraian || null, idempotencyKey: kunci } });
    else await wil(`/api/wilayah/${tab}`, { body: { jenis: d.jenis, nama: d.nama, lokasi: d.lokasi || null } });
    hapus();
    return true;
  });
  if (d.i === 1) {
    return (
      <Langkah langkah={1} total={2} judul={tab === "kegiatan" ? "Kegiatan apa?" : tab === "fasilitas" ? "Fasilitas apa?" : "Kelompok apa?"} onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={!!d.jenis && d.nama.trim().length >= 2}>
        <PilihTombol label="Jenis" belumTahu={false} kolom={1} nilai={d.jenis || null} onChange={(v) => set({ jenis: v ?? "" })} pilihan={opsi(daftar)} />
        <IsianTeks label={tab === "kegiatan" ? "Nama kegiatan" : "Nama"} nilai={d.nama} onChange={(v) => set({ nama: v })} />
        {tab === "kegiatan" && <IsianTeks label="Tanggal pelaksanaan" tipe="date" nilai={d.tanggal} onChange={(v) => set({ tanggal: v })} bantuan="Catat setelah kegiatan terlaksana." />}
        <IsianTeks label="Lokasi" nilai={d.lokasi} onChange={(v) => set({ lokasi: v })} />
        {tab === "kegiatan" && <IsianPanjang label="Keterangan singkat" nilai={d.uraian} onChange={(v) => set({ uraian: v })} />}
      </Langkah>
    );
  }
  return (
    <Langkah langkah={2} total={2} judul="Periksa sebelum menyimpan" onKembali={() => set({ i: 1 })} labelLanjut="Simpan" memuat={mengirim} onLanjut={async () => { if (await kirim()) selesai(); }}>
      <BarisRingkas label="Jenis" nilai={labelDari(daftar, d.jenis)} />
      <BarisRingkas label="Nama" nilai={d.nama} />
      {tab === "kegiatan" && <BarisRingkas label="Tanggal" nilai={d.tanggal} />}
      <BarisRingkas label="Lokasi" nilai={d.lokasi || null} />
      {tab === "kegiatan" && <p className="text-base text-gray-600 mt-2">Setelah disimpan, isi jumlah warga yang hadir.</p>}
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

export default function Objek() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "usaha");
  const kejadian = params.get("kejadian");
  const [form, setForm] = useState<boolean>(!!kejadian);
  const [izin, setIzin] = useState<{ id: number; nama: string } | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const url = `/api/wilayah/${tab}`;
  const { data, isLoading, error } = useQuery<any[]>({ queryKey: [url], queryFn: () => wil(url), enabled: tab !== "surat" });
  const selesai = async (pesan: string) => {
    await qc.invalidateQueries({ queryKey: [url] });
    setForm(false);
    setIzin(null);
    setInfo(pesan);
  };

  if (izin) {
    const u = (data ?? []).find((x) => x.id === izin.id);
    return (
      <div>
        <Judul kembali={() => setIzin(null)}>{izin.nama}</Judul>
        <FormFakta draftKey={`usaha:${izin.id}`} langkah={[{ judul: "Izin & pemasaran", subjek: "usaha", subjekId: izin.id, kunci: ["nib", "pirt", "haki", "halal", "sni", "pemasaran_digital", "kredit"] }]}
          awal={kunciAwal("usaha", izin.id, u?.fakta ?? [])} batal={() => setIzin(null)} selesai={() => selesai("Data usaha tersimpan.")} />
      </div>
    );
  }
  if (tab === "surat") {
    return (
      <div className="space-y-4">
        <Judul kembali={() => go("/rt")}>Surat dari / ke Ketua RW</Judul>
        <PilihTombol label="Pilih" belumTahu={false} kolom={3} nilai={tab} onChange={(v) => { if (v) { setTab(v as Tab); setInfo(null); } }}
          pilihan={[{ nilai: "usaha", label: "Usaha" }, { nilai: "fasilitas", label: "Fasilitas" }, { nilai: "kelompok", label: "Kelompok" }, { nilai: "kegiatan", label: "Kegiatan" }, { nilai: "surat", label: "Surat" }]} />
        <SuratRt kejadianAwal={kejadian ? Number(kejadian) : null} />
      </div>
    );
  }
  if (form) {
    return (
      <div>
        <Judul kembali={() => setForm(false)}>Tambah {tab}</Judul>
        {tab === "usaha" && <FormUsaha batal={() => setForm(false)} selesai={() => selesai("Usaha tersimpan.")} />}
        {(tab === "fasilitas" || tab === "kelompok" || tab === "kegiatan") && <FormObjek tab={tab} batal={() => setForm(false)} selesai={() => selesai("Tersimpan.")} />}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/rt")}>Data wilayah RT</Judul>
      <PilihTombol label="Pilih" belumTahu={false} kolom={3} nilai={tab} onChange={(v) => { if (v) { setTab(v as Tab); setInfo(null); } }}
        pilihan={[{ nilai: "usaha", label: "Usaha" }, { nilai: "fasilitas", label: "Fasilitas" }, { nilai: "kelompok", label: "Kelompok" }, { nilai: "kegiatan", label: "Kegiatan" }, { nilai: "surat", label: "Surat" }]} />
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      <TombolBesar ikon={<Plus className="w-6 h-6" />} onClick={() => setForm(true)}>Tambah</TombolBesar>
      {(tab === "fasilitas" || tab === "kelompok" || tab === "kegiatan") && <Pesan>Objek milik RW tampil di sini tetapi hanya bisa diubah RW. Bila ada yang salah, sampaikan ke Ketua RW.</Pesan>}
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data?.length === 0 && <Pesan>Belum ada data.</Pesan>}
      <ul className="space-y-2">
        {data?.map((x) => (
          <li key={x.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
            <p className="text-lg font-semibold">{x.nama ?? x.judul ?? x.perihal}</p>
            <p className="text-base text-gray-600">
              {tab === "kegiatan" ? `${new Date(x.tanggal).toLocaleDateString("id-ID")} · ${x.pengelola === "rw" ? "Kegiatan RW" : "Kegiatan RT"}`
                : x.pengelola === "rw" ? "Dikelola RW" : "Dikelola RT"}
            </p>
            {tab === "usaha" && <div className="mt-2"><TombolBesar varian="kedua" onClick={() => setIzin({ id: x.id, nama: x.nama })}>Izin & pemasaran</TombolBesar></div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
