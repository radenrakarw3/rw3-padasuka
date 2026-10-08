import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, IsianPanjang, IsianTeks, Judul, Langkah, Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import { JENIS_KEJADIAN, STATUS_KEJADIAN, isoTanggal } from "@shared/wilayah";

interface Kejadian {
  id: number; jenis: string; judul: string; uraian: string | null; tanggal: string; status: string; lokasi: string | null;
  jumlah_pelaku: number | null; bolehUbah: boolean; tindak_lanjut: { catatan: string; status: string | null; oleh: string; waktu: string }[];
}

const BAGIAN = [
  { nilai: "keamanan", label: "Keamanan" },
  { nilai: "kesehatan", label: "Kematian ibu / bayi" },
  { nilai: "lingkungan", label: "Lingkungan & fasilitas" },
  { nilai: "sosial", label: "Sosial / lainnya" },
];
const label = (jenis: string) => JENIS_KEJADIAN.find((j) => j.nilai === jenis)?.label ?? jenis;
const labelStatus = (s: string) => STATUS_KEJADIAN.find((x) => x.nilai === s)?.label ?? s;

function FormBaru({ selesai, batal }: { selesai: () => void; batal: () => void }) {
  const awal = { i: 1, bagian: "", jenis: "", judul: "", tanggal: isoTanggal(new Date()), lokasi: "", uraian: "", pelaku: "", korban: "" };
  const { nilai: d, setNilai, hapus } = useDraft("kejadian-baru", awal);
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const { kirim, mengirim, error } = useKirimSekali(async (kunci) => {
    await wil("/api/wilayah/rt/kejadian", {
      body: {
        jenis: d.jenis, judul: d.judul || label(d.jenis), tanggal: d.tanggal, lokasi: d.lokasi || null, uraian: d.uraian || null,
        jumlahPelaku: d.pelaku === "" ? null : Number(d.pelaku), jumlahKorban: d.korban === "" ? null : Number(d.korban), idempotencyKey: kunci,
      },
    });
    hapus();
    return true;
  });
  const total = 4;
  if (d.i === 1) {
    return (
      <Langkah langkah={1} total={total} judul="Masalah apa?" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={!!d.jenis}>
        <PilihTombol label="Jenis" belumTahu={false} nilai={d.bagian || null} onChange={(v) => set({ bagian: v ?? "", jenis: "" })} pilihan={BAGIAN} />
        {d.bagian && (
          <PilihTombol label="Pilih yang paling sesuai" belumTahu={false} kolom={1} nilai={d.jenis || null} onChange={(v) => set({ jenis: v ?? "" })}
            pilihan={JENIS_KEJADIAN.filter((j) => j.bagian === d.bagian).map((j) => ({ nilai: j.nilai, label: j.label }))} />
        )}
      </Langkah>
    );
  }
  if (d.i === 2) {
    return (
      <Langkah langkah={2} total={total} judul="Kapan dan di mana?" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })} bisaLanjut={!!d.tanggal}>
        <IsianTeks label="Tanggal kejadian" tipe="date" nilai={d.tanggal} onChange={(v) => set({ tanggal: v })} />
        <IsianTeks label="Lokasi (singkat)" nilai={d.lokasi} onChange={(v) => set({ lokasi: v })} placeholder="Contoh: depan pos ronda" />
        <IsianTeks label="Judul singkat" nilai={d.judul} onChange={(v) => set({ judul: v })} placeholder={label(d.jenis)} />
      </Langkah>
    );
  }
  if (d.i === 3) {
    const keamanan = JENIS_KEJADIAN.find((j) => j.nilai === d.jenis)?.bagian === "keamanan";
    return (
      <Langkah langkah={3} total={total} judul="Keterangan" onKembali={() => set({ i: 2 })} onLanjut={() => set({ i: 4 })}>
        <IsianPanjang label="Ceritakan singkat" nilai={d.uraian} onChange={(v) => set({ uraian: v })} placeholder="Tanpa nama korban anak / data pribadi sensitif." />
        {keamanan && (
          <>
            <IsianTeks label="Jumlah pelaku (warga RT ini)" inputMode="numeric" nilai={d.pelaku} onChange={(v) => set({ pelaku: v.replace(/\D/g, "") })} bantuan="Kosongkan bila belum tahu." />
            <IsianTeks label="Jumlah korban" inputMode="numeric" nilai={d.korban} onChange={(v) => set({ korban: v.replace(/\D/g, "") })} bantuan="Kosongkan bila belum tahu." />
          </>
        )}
      </Langkah>
    );
  }
  return (
    <Langkah langkah={4} total={total} judul="Periksa sebelum menyimpan" onKembali={() => set({ i: 3 })} labelLanjut="Simpan" memuat={mengirim}
      onLanjut={async () => { if (await kirim()) selesai(); }}>
      <BarisRingkas label="Jenis" nilai={label(d.jenis)} />
      <BarisRingkas label="Judul" nilai={d.judul || label(d.jenis)} />
      <BarisRingkas label="Tanggal" nilai={d.tanggal} />
      <BarisRingkas label="Lokasi" nilai={d.lokasi || null} />
      {d.pelaku !== "" && <BarisRingkas label="Pelaku" nilai={d.pelaku} />}
      {error && <div className="mt-4"><Pesan jenis="error">{error}</Pesan></div>}
    </Langkah>
  );
}

function Tindak({ k, selesai }: { k: Kejadian; selesai: () => void }) {
  const [catatan, setCatatan] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    await wil(`/api/wilayah/kejadian/${k.id}/tindak`, { body: { catatan, status: status ?? undefined } });
    return true;
  });
  return (
    <div className="mt-3 border-t-2 border-gray-100 pt-3">
      <IsianPanjang label="Catat tindak lanjut" nilai={catatan} onChange={setCatatan} />
      <PilihTombol label="Ubah status" belumTahu={false} nilai={status} onChange={setStatus}
        pilihan={STATUS_KEJADIAN.filter((s) => s.nilai !== "baru").map((s) => ({ nilai: s.nilai, label: s.label }))} />
      {error && <Pesan jenis="error">{error}</Pesan>}
      <TombolBesar onClick={async () => { if (await kirim()) { setCatatan(""); setStatus(null); selesai(); } }} disabled={catatan.trim().length < 3} memuat={mengirim}>Simpan tindak lanjut</TombolBesar>
    </div>
  );
}

export default function Masalah({ baru }: { baru?: boolean }) {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const [buka, setBuka] = useState<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery<Kejadian[]>({ queryKey: ["/api/wilayah/kejadian"], queryFn: () => wil("/api/wilayah/kejadian") });
  const segar = async (pesan: string) => {
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/kejadian"] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rt/antrean"] });
    setInfo(pesan);
  };
  if (baru) {
    return (
      <div>
        <Judul kembali={() => go("/rt/masalah")}>Catat masalah</Judul>
        <FormBaru batal={() => go("/rt")} selesai={async () => { await segar("Masalah tersimpan."); go("/rt/masalah"); }} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/rt")}>Masalah wilayah</Judul>
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      <TombolBesar ikon={<Plus className="w-6 h-6" />} onClick={() => go("/rt/masalah/baru")}>Catat masalah baru</TombolBesar>
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data?.length === 0 && <Pesan>Belum ada masalah yang dicatat.</Pesan>}
      {data?.map((k) => (
        <div key={k.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <button type="button" className="w-full text-left" onClick={() => setBuka(buka === k.id ? null : k.id)}>
            <p className="text-lg font-semibold">{k.judul}</p>
            <p className="text-base text-gray-600">{label(k.jenis)} · {new Date(k.tanggal).toLocaleDateString("id-ID")}</p>
            <p className={`text-base font-semibold ${k.status === "selesai" ? "text-green-700" : k.status === "perlu_rw" ? "text-red-700" : "text-amber-700"}`}>{labelStatus(k.status)}</p>
          </button>
          {buka === k.id && (
            <div className="mt-2">
              {k.uraian && <p className="text-lg mb-2">{k.uraian}</p>}
              {k.tindak_lanjut.map((t, i) => (
                <p key={i} className="text-base border-l-4 border-gray-300 pl-3 my-2">{t.catatan} <span className="text-gray-500">— {t.oleh}</span></p>
              ))}
              {k.bolehUbah && k.status !== "selesai" && <Tindak k={k} selesai={() => segar("Tindak lanjut tersimpan.")} />}
              {k.bolehUbah && <div className="mt-3"><TombolBesar varian="kedua" onClick={() => go(`/rt/objek?tab=surat&kejadian=${k.id}`)}>Minta surat ke RW</TombolBesar></div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
