import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useKirimSekali, wil } from "@/lib/wilayah-api";
import { IsianPanjang, Judul, Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import { FAKTA_BY_KUNCI, labelNilaiFakta, type IsiUsulan } from "@shared/wilayah";

interface Fakta { kunci: string; nilai: string; statusVerifikasi: string }
interface Resmi {
  kk: { id: number };
  anggota: { id: number; nama: string; tanggalLahir: string | null; kedudukan: string; fakta: Fakta[] }[];
  rumah: { id: number; fakta: Fakta[] } | null;
  fakta: Fakta[];
}
interface Detail { usulan: { id: number; kkId: number; isi: IsiUsulan; status: string; dibuat: string }; resmi: Resmi }

const nilaiResmi = (fakta: Fakta[], kunci: string) => fakta.find((f) => f.kunci === kunci && f.statusVerifikasi === "terverifikasi")?.nilai ?? null;

function Centang({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={aktif}
      className={`w-full min-h-[60px] rounded-xl border-2 px-3 py-2 text-left text-lg flex gap-3 items-center mb-2 ${aktif ? "bg-green-50 border-green-600" : "bg-white border-gray-300"}`}>
      <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 ${aktif ? "bg-green-600 border-green-600 text-white" : "border-gray-400"}`}>{aktif ? "✓" : ""}</span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

function Periksa({ id }: { id: number }) {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data, isLoading, error: galatMuat } = useQuery<Detail>({ queryKey: [`/api/wilayah/rt/usulan/${id}`], queryFn: () => wil(`/api/wilayah/rt/usulan/${id}`) });
  const [pilih, setPilih] = useState<Record<string, boolean>>({});
  const [cocok, setCocok] = useState<Record<number, string>>({});
  const [catatan, setCatatan] = useState("");
  const [aksi, setAksi] = useState<"terima" | "klarifikasi" | "tolak">("terima");

  const usulan = data?.usulan;
  const resmi = data?.resmi;
  const cocokAwal = useMemo(() => {
    const out: Record<number, string> = {};
    usulan?.isi.anggota.forEach((a, i) => {
      const m = resmi?.anggota.find((r) => r.nama.trim().toLowerCase() === a.nama.trim().toLowerCase());
      out[i] = m ? String(m.id) : "lewati";
    });
    return out;
  }, [usulan, resmi]);
  const cocokFinal = { ...cocokAwal, ...cocok };

  const item = useMemo(() => {
    if (!usulan || !resmi) return [];
    const out: { key: string; label: string; dari: string; ke: string; fakta?: { subjek: string; subjekId: number; kunci: string; nilai: string }; tgl?: { wargaId: number; tanggalLahir: string }; hp?: { wargaId: number; nomorHp: string } }[] = [];
    for (const [kunci, nilai] of Object.entries(usulan.isi.rumahTangga)) {
      const def = FAKTA_BY_KUNCI.get(kunci);
      const rumah = def?.subjek === "rumah";
      if (rumah && !resmi.rumah) continue;
      const lama = rumah ? nilaiResmi(resmi.rumah!.fakta, kunci) : nilaiResmi(resmi.fakta, kunci);
      if (lama === nilai) continue;
      out.push({ key: `kk:${kunci}`, label: def?.label ?? kunci, dari: labelNilaiFakta(def, lama), ke: labelNilaiFakta(def, nilai),
        fakta: { subjek: rumah ? "rumah" : "kk", subjekId: rumah ? resmi.rumah!.id : resmi.kk.id, kunci, nilai } });
    }
    usulan.isi.anggota.forEach((a, i) => {
      const wid = Number(cocokFinal[i]);
      const w = resmi.anggota.find((r) => r.id === wid);
      if (!w) return;
      if (a.tanggalLahir && a.tanggalLahir !== w.tanggalLahir) {
        out.push({ key: `tgl:${i}`, label: `${w.nama}: tanggal lahir`, dari: w.tanggalLahir ?? "Belum diketahui", ke: a.tanggalLahir, tgl: { wargaId: w.id, tanggalLahir: a.tanggalLahir } });
      }
      for (const [kunci, nilai] of Object.entries(a.jawaban)) {
        const def = FAKTA_BY_KUNCI.get(kunci);
        const lama = nilaiResmi(w.fakta, kunci);
        if (lama === nilai) continue;
        out.push({ key: `w:${i}:${kunci}`, label: `${w.nama}: ${def?.label ?? kunci}`, dari: labelNilaiFakta(def, lama), ke: labelNilaiFakta(def, nilai),
          fakta: { subjek: "warga", subjekId: w.id, kunci, nilai } });
      }
    });
    const kepala = resmi.anggota.find((a) => a.kedudukan === "Kepala Keluarga");
    if (usulan.isi.nomorHp && kepala) out.push({ key: "hp", label: `Nomor HP ${kepala.nama}`, dari: "—", ke: usulan.isi.nomorHp, hp: { wargaId: kepala.id, nomorHp: usulan.isi.nomorHp } });
    return out;
  }, [usulan, resmi, cocokFinal]);

  const terpilih = (k: string) => pilih[k] ?? true;
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    const body = aksi === "terima"
      ? {
          aksi, catatan: catatan || undefined,
          fakta: item.filter((x) => x.fakta && terpilih(x.key)).map((x) => x.fakta),
          tanggalLahir: item.filter((x) => x.tgl && terpilih(x.key)).map((x) => x.tgl),
          nomorHp: item.find((x) => x.hp && terpilih(x.key))?.hp,
        }
      : { aksi, catatan };
    const r = await wil<{ diterapkan: number }>(`/api/wilayah/rt/usulan/${id}/putuskan`, { body });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rt/usulan"] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rt/antrean"] });
    await qc.invalidateQueries({ queryKey: [`/api/wilayah/keluarga/${usulan?.kkId}`] });
    return r;
  });

  if (isLoading) return <Memuat />;
  if (galatMuat || !usulan || !resmi) return <Pesan jenis="error">{(galatMuat as Error)?.message ?? "Gagal memuat"}</Pesan>;
  const terbuka = usulan.status === "menunggu" || usulan.status === "klarifikasi";
  const baru = usulan.isi.anggota.filter((a, i) => a.keterangan === "baru" || cocokFinal[i] === "baru");
  const keluar = usulan.isi.anggota.filter((a) => a.keterangan === "pindah" || a.keterangan === "meninggal");

  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/rt/usulan")} sub={`Dari ${usulan.isi.namaPengisi} (${usulan.isi.hubunganPengisi}) · ${new Date(usulan.dibuat).toLocaleDateString("id-ID")}`}>Periksa isian warga</Judul>
      <Pesan>Data resmi belum berubah. Centang jawaban yang benar, lalu tekan “Terima yang dicentang”.</Pesan>

      <section>
        <h2 className="text-xl font-bold mb-2">Cocokkan anggota</h2>
        {usulan.isi.anggota.map((a, i) => (
          <PilihTombol key={i} label={`${a.nama} (${a.hubungan}, ${a.jenisKelamin})${a.keterangan && a.keterangan !== "tetap" ? ` — ${a.keterangan}` : ""}`}
            belumTahu={false} kolom={1} nilai={cocokFinal[i]} onChange={(v) => v && setCocok({ ...cocok, [i]: v })}
            pilihan={[...resmi.anggota.map((r) => ({ nilai: String(r.id), label: `Sama dengan: ${r.nama}` })), { nilai: "baru", label: "Anggota baru" }, { nilai: "lewati", label: "Lewati" }]} />
        ))}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-2">Perubahan yang diusulkan ({item.length})</h2>
        {item.length === 0 && <Pesan>Tidak ada perbedaan dengan data resmi.</Pesan>}
        {item.map((x) => (
          <Centang key={x.key} aktif={terpilih(x.key)} onClick={() => setPilih({ ...pilih, [x.key]: !terpilih(x.key) })}>
            <b>{x.label}</b><br /><span className="text-gray-600">{x.dari}</span> → <b>{x.ke}</b>
          </Centang>
        ))}
      </section>

      {baru.length > 0 && <Pesan jenis="peringatan">Anggota baru ({baru.map((a) => a.nama).join(", ")}) ditambahkan lewat “Tambah anggota” di halaman keluarga karena perlu NIK.</Pesan>}
      {keluar.length > 0 && <Pesan jenis="peringatan">Dilaporkan pindah/meninggal: {keluar.map((a) => `${a.nama} (${a.keterangan})`).join(", ")}. Ubah lewat “Data dasar” setelah dipastikan.</Pesan>}
      {usulan.isi.usaha.length > 0 && <Pesan>Usaha dilaporkan: {usulan.isi.usaha.map((u) => u.nama).join(", ")}. Tambahkan di menu Usaha bila benar.</Pesan>}
      {usulan.isi.catatan && <Pesan>Catatan warga: {usulan.isi.catatan}</Pesan>}

      {terbuka ? (
        <>
          <PilihTombol label="Keputusan" belumTahu={false} kolom={1} nilai={aksi} onChange={(v) => v && setAksi(v as typeof aksi)}
            pilihan={[{ nilai: "terima", label: "Terima yang dicentang" }, { nilai: "klarifikasi", label: "Minta keluarga memperbaiki" }, { nilai: "tolak", label: "Tolak semua" }]} />
          <IsianPanjang label={aksi === "terima" ? "Catatan (boleh kosong)" : "Pesan untuk keluarga (wajib)"} nilai={catatan} onChange={setCatatan} />
          {error && <Pesan jenis="error">{error}</Pesan>}
          <TombolBesar memuat={mengirim} disabled={aksi !== "terima" && catatan.trim().length < 3}
            onClick={async () => { const r = await kirim(); if (r) go(`/rt/keluarga/${usulan.kkId}`); }}>
            Simpan keputusan
          </TombolBesar>
        </>
      ) : <Pesan>Isian ini sudah diputus ({usulan.status}).</Pesan>}
    </div>
  );
}

export default function Usulan({ id }: { id?: number }) {
  const [, go] = useLocation();
  const [status, setStatus] = useState("menunggu");
  const { data, isLoading, error } = useQuery<{ id: number; kepala: string | null; alamat: string; pengisi: string; status: string; created_at: string }[]>({
    queryKey: ["/api/wilayah/rt/usulan", status], queryFn: () => wil(`/api/wilayah/rt/usulan?status=${status}`), enabled: !id,
  });
  if (id) return <Periksa id={id} />;
  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/rt")}>Isian warga</Judul>
      <PilihTombol label="Tampilkan" belumTahu={false} nilai={status} onChange={(v) => v && setStatus(v)}
        pilihan={[{ nilai: "menunggu", label: "Perlu diperiksa" }, { nilai: "semua", label: "Semua" }]} />
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data?.length === 0 && <Pesan jenis="sukses">Tidak ada isian yang menunggu.</Pesan>}
      <ul className="bg-white rounded-2xl border-2 border-gray-200 divide-y-2 divide-gray-100">
        {data?.map((u) => (
          <li key={u.id}>
            <button type="button" onClick={() => go(`/rt/usulan/${u.id}`)} className="w-full min-h-[72px] px-4 py-3 flex items-center gap-3 text-left">
              <span className="flex-1">
                <span className="block text-lg font-semibold">{u.kepala ?? "Keluarga"}</span>
                <span className="block text-base text-gray-600">Diisi {u.pengisi} · {new Date(u.created_at).toLocaleDateString("id-ID")} · {u.status}</span>
              </span>
              <ChevronRight className="w-6 h-6 text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
