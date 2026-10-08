import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useKirimSekali, wil } from "@/lib/wilayah-api";
import { useRtjuaraAuth } from "@/lib/rtjuara-auth";
import { BarisRingkas, IsianTeks, Judul, Langkah, Memuat, Pesan, PilihTombol, TombolBesar, rt2 } from "@/components/wilayah/ui";

interface Serah {
  id: number; jenis: string; kk_id: number; warga_id: number | null; rt_asal: number; rt_tujuan: number; alasan: string | null; status: string;
  nama_warga: string | null; kepala: string | null; anggota: number; arah: "masuk" | "keluar";
}

function Ajukan({ kkId, selesai, batal }: { kkId: number; selesai: () => void; batal: () => void }) {
  const { sesi } = useRtjuaraAuth();
  const { data } = useQuery<{ anggota: { id: number; nama: string }[] }>({ queryKey: [`/api/wilayah/keluarga/${kkId}`], queryFn: () => wil(`/api/wilayah/keluarga/${kkId}`) });
  const [i, setI] = useState(1);
  const [jenis, setJenis] = useState<"kk" | "warga">("kk");
  const [wargaId, setWargaId] = useState<number | null>(null);
  const [rtTujuan, setRtTujuan] = useState<number | null>(null);
  const [alasan, setAlasan] = useState("");
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    await wil("/api/wilayah/rt/serah-terima", { body: { jenis, kkId, wargaId: jenis === "warga" ? wargaId : undefined, rtTujuan, alasan: alasan || undefined } });
    return true;
  });
  if (i === 1) {
    return (
      <Langkah langkah={1} total={2} judul="Siapa yang pindah?" onKembali={batal} onLanjut={() => setI(2)} bisaLanjut={!!rtTujuan && (jenis === "kk" || !!wargaId)}>
        <PilihTombol label="Yang pindah" belumTahu={false} kolom={1} nilai={jenis} onChange={(v) => v && setJenis(v as "kk" | "warga")}
          pilihan={[{ nilai: "kk", label: "Seluruh keluarga (satu KK)" }, { nilai: "warga", label: "Satu orang saja" }]} />
        {jenis === "warga" && (
          <PilihTombol label="Pilih orang" belumTahu={false} kolom={1} nilai={wargaId ? String(wargaId) : null} onChange={(v) => setWargaId(v ? Number(v) : null)}
            pilihan={(data?.anggota ?? []).map((a) => ({ nilai: String(a.id), label: a.nama }))} />
        )}
        <PilihTombol label="Pindah ke RT" belumTahu={false} kolom={3} nilai={rtTujuan ? String(rtTujuan) : null} onChange={(v) => setRtTujuan(v ? Number(v) : null)}
          pilihan={[1, 2, 3, 4, 5, 6, 7].filter((n) => n !== sesi?.rt).map((n) => ({ nilai: String(n), label: rt2(n) }))} />
        <IsianTeks label="Keterangan (boleh kosong)" nilai={alasan} onChange={setAlasan} />
      </Langkah>
    );
  }
  return (
    <Langkah langkah={2} total={2} judul="Periksa sebelum mengajukan" onKembali={() => setI(1)} labelLanjut="Ajukan" memuat={mengirim} onLanjut={async () => { if (await kirim()) selesai(); }}>
      <BarisRingkas label="Yang pindah" nilai={jenis === "kk" ? "Seluruh keluarga" : data?.anggota.find((a) => a.id === wargaId)?.nama} />
      <BarisRingkas label="Ke" nilai={rt2(rtTujuan)} />
      <p className="text-base text-gray-600 mt-2">Data baru pindah setelah Ketua {rt2(rtTujuan)} menerima. Tidak ada data ganda.</p>
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

function Terima({ s, selesai }: { s: Serah; selesai: () => void }) {
  const [kkTujuan, setKkTujuan] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const { data: kk } = useQuery<{ id: number; kepala: string | null; alamat: string }[]>({ queryKey: ["/api/wilayah/keluarga"], queryFn: () => wil("/api/wilayah/keluarga?batas=1000"), enabled: s.jenis === "warga" });
  const putus = async (terima: boolean) => {
    if (proses) return;
    setProses(true);
    setErr(null);
    try {
      await wil(`/api/wilayah/rt/serah-terima/${s.id}/putuskan`, { body: { terima, kkTujuanId: kkTujuan ?? undefined } });
      selesai();
    } catch (e) { setErr((e as Error).message); } finally { setProses(false); }
  };
  return (
    <div className="mt-3 space-y-2">
      {s.jenis === "warga" && (
        <PilihTombol label="Masuk ke KK mana di RT Anda?" belumTahu={false} kolom={1} nilai={kkTujuan ? String(kkTujuan) : null} onChange={(v) => setKkTujuan(v ? Number(v) : null)}
          pilihan={(kk ?? []).map((k) => ({ nilai: String(k.id), label: `${k.kepala ?? "KK"} · ${k.alamat}` }))} />
      )}
      {err && <Pesan jenis="error">{err}</Pesan>}
      <div className="grid grid-cols-2 gap-2">
        <TombolBesar onClick={() => putus(true)} memuat={proses} disabled={s.jenis === "warga" && !kkTujuan}>Terima</TombolBesar>
        <TombolBesar varian="bahaya" onClick={() => putus(false)} disabled={proses}>Tolak</TombolBesar>
      </div>
    </div>
  );
}

export default function Pindah() {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const kk = params.get("kk");
  const qc = useQueryClient();
  const [ajukan, setAjukan] = useState(!!kk);
  const [info, setInfo] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery<Serah[]>({ queryKey: ["/api/wilayah/serah-terima"], queryFn: () => wil("/api/wilayah/serah-terima") });
  const segar = async (p: string) => {
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/serah-terima"] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rt/antrean"] });
    setAjukan(false);
    setInfo(p);
  };
  if (ajukan && kk) return <div><Judul kembali={() => go(`/rt/keluarga/${kk}`)}>Pindah RT</Judul><Ajukan kkId={Number(kk)} batal={() => go(`/rt/keluarga/${kk}`)} selesai={() => segar("Pengajuan pindah terkirim.")} /></div>;
  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/rt")}>Pindah RT</Judul>
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      <Pesan>Untuk mengajukan pindah, buka keluarga di menu Warga lalu pilih “Pindah ke RT lain”.</Pesan>
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data?.map((s) => (
        <div key={s.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4">
          <p className="text-lg font-semibold">{s.jenis === "kk" ? `Keluarga ${s.kepala ?? ""} (${s.anggota} orang)` : s.nama_warga}</p>
          <p className="text-base text-gray-600">{s.arah === "masuk" ? `Dari ${rt2(s.rt_asal)}` : `Ke ${rt2(s.rt_tujuan)}`} · {s.status}</p>
          {s.status === "diajukan" && s.arah === "masuk" && <Terima s={s} selesai={() => segar("Keputusan tersimpan.")} />}
          {s.status === "diajukan" && s.arah === "keluar" && (
            <div className="mt-2"><TombolBesar varian="bahaya" onClick={async () => {
              try { await wil(`/api/wilayah/rt/serah-terima/${s.id}/putuskan`, { body: { terima: false } }); await segar("Pengajuan dibatalkan."); }
              catch (e) { setInfo(null); alert((e as Error).message); }
            }}>Batalkan pengajuan</TombolBesar></div>
          )}
        </div>
      ))}
    </div>
  );
}
