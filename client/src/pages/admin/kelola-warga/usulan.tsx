import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { useKirimSekali, wil } from "@/lib/wilayah-api";
import { BilahAksiAdmin, IsianPanjang, IsianTeks, Judul, Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
import { KeluargaBaru } from "./warga";
import { labelNilaiFakta, type IsiUsulan } from "@shared/wilayah";
import { defStandar, useStandar } from "@/lib/standar";

interface Fakta { kunci: string; nilai: string; statusVerifikasi: string }
interface Resmi {
  kk: { id: number };
  anggota: { id: number; nama: string; tanggalLahir: string | null; kedudukan: string; fakta: Fakta[] }[];
  fakta: Fakta[];
}
interface Detail {
  usulan: {
    id: number; kkId: number | null; isi: IsiUsulan; status: string; dibuat: string;
    sumber: string; diinputOleh: string | null; keluargaBaru: { rt: number; alamat: string; noUnit?: string | null } | null;
  };
  resmi: Resmi | null;
}
interface KeluargaRingkas { id: number; kepala: string | null; alamat: string; noUnit: string | null }

const nilaiResmi = (fakta: Fakta[], kunci: string) => fakta.find((f) => f.kunci === kunci && f.statusVerifikasi === "terverifikasi")?.nilai ?? null;

function Centang({ aktif, onClick, children }: { aktif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={aktif}
      className={`w-full min-h-[60px] rounded-xl border-2 px-3 py-2 text-left text-lg flex gap-3 items-center mb-2 ${aktif ? "bg-green-50 border-green-600" : "bg-white border-gray-300"}`}>
      <span className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 ${aktif ? "bg-green-600 border-green-600 text-white" : "border-gray-400"}`}>{aktif ? "✓" : ""}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </button>
  );
}

function Periksa({ id }: { id: number }) {
  const [, go] = useLocation();
  const qc = useQueryClient();
  const { data, isLoading: memuatUsulan, error: galatMuat } = useQuery<Detail>({ queryKey: [`/api/wilayah/rt/usulan/${id}`], queryFn: () => wil(`/api/wilayah/rt/usulan/${id}`) });
  const { data: standar, isLoading: memuatStandar } = useStandar();
  const isLoading = memuatUsulan || memuatStandar;
  const [pilih, setPilih] = useState<Record<string, boolean>>({});
  const [cocok, setCocok] = useState<Record<number, string>>({});
  const [catatan, setCatatan] = useState("");
  const [aksi, setAksi] = useState<"terima" | "klarifikasi" | "tolak">("terima");
  const [kkPilih, setKkPilih] = useState<number | null>(null);
  const [modeKk, setModeKk] = useState<"pilih" | "baru" | "tolak">("pilih");
  const [cariKk, setCariKk] = useState("");
  const keluargaBaru = !!data && !data.resmi;
  const { data: resmiPilih } = useQuery<Resmi>({
    queryKey: [`/api/wilayah/keluarga/${kkPilih}`], queryFn: () => wil(`/api/wilayah/keluarga/${kkPilih}`), enabled: keluargaBaru && !!kkPilih,
  });
  const { data: daftarKk } = useQuery<KeluargaRingkas[]>({
    queryKey: ["/api/wilayah/keluarga"], queryFn: () => wil("/api/wilayah/keluarga?batas=1000"), enabled: keluargaBaru,
  });

  const usulan = data?.usulan;
  const resmi = data?.resmi ?? resmiPilih;
  const kkTujuan = usulan?.kkId ?? kkPilih;
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
      const def = defStandar(kunci);
      if (def?.subjek !== "kk") continue;
      const lama = nilaiResmi(resmi.fakta, kunci);
      if (lama === nilai) continue;
      out.push({ key: `kk:${kunci}`, label: def.label, dari: labelNilaiFakta(def, lama), ke: labelNilaiFakta(def, nilai),
        fakta: { subjek: "kk", subjekId: resmi.kk.id, kunci, nilai } });
    }
    usulan.isi.anggota.forEach((a, i) => {
      const wid = Number(cocokFinal[i]);
      const w = resmi.anggota.find((r) => r.id === wid);
      if (!w) return;
      if (a.tanggalLahir && a.tanggalLahir !== w.tanggalLahir) {
        out.push({ key: `tgl:${i}`, label: `${w.nama}: tanggal lahir`, dari: w.tanggalLahir ?? "Belum diketahui", ke: a.tanggalLahir, tgl: { wargaId: w.id, tanggalLahir: a.tanggalLahir } });
      }
      for (const [kunci, nilai] of Object.entries(a.jawaban)) {
        const def = defStandar(kunci);
        if (def?.subjek !== "warga") continue;
        const lama = nilaiResmi(w.fakta, kunci);
        if (lama === nilai) continue;
        out.push({ key: `w:${i}:${kunci}`, label: `${w.nama}: ${def.label}`, dari: labelNilaiFakta(def, lama), ke: labelNilaiFakta(def, nilai),
          fakta: { subjek: "warga", subjekId: w.id, kunci, nilai } });
      }
    });
    const kepala = resmi.anggota.find((a) => a.kedudukan === "Kepala Keluarga");
    if (usulan.isi.nomorHp && kepala) out.push({ key: "hp", label: `Nomor HP ${kepala.nama}`, dari: "—", ke: usulan.isi.nomorHp, hp: { wargaId: kepala.id, nomorHp: usulan.isi.nomorHp } });
    return out;
  }, [usulan, resmi, cocokFinal, standar]);

  const terpilih = (k: string) => pilih[k] ?? true;
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    const body = aksi === "terima"
      ? {
          aksi, catatan: catatan || undefined,
          kkId: usulan?.kkId ? undefined : kkPilih ?? undefined,
          fakta: item.filter((x) => x.fakta && terpilih(x.key)).map((x) => x.fakta),
          tanggalLahir: item.filter((x) => x.tgl && terpilih(x.key)).map((x) => x.tgl),
          nomorHp: item.find((x) => x.hp && terpilih(x.key))?.hp,
        }
      : { aksi, catatan };
    const r = await wil<{ diterapkan: number }>(`/api/wilayah/rt/usulan/${id}/putuskan`, { body });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/rt/usulan"] });
    await qc.invalidateQueries({ queryKey: [`/api/wilayah/keluarga/${kkTujuan}`] });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
    return r;
  });

  if (isLoading) return <Memuat />;
  if (galatMuat || !usulan) return <Pesan jenis="error">{(galatMuat as Error)?.message ?? "Gagal memuat"}</Pesan>;
  const terbuka = usulan.status === "menunggu" || usulan.status === "klarifikasi";
  const asal = usulan.sumber === "rw" ? `Diinput di RW${usulan.diinputOleh ? ` (${usulan.diinputOleh})` : ""} untuk ${usulan.isi.namaPengisi}` : `Dari ${usulan.isi.namaPengisi} (${usulan.isi.hubunganPengisi})`;

  if (!resmi) {
    if (!keluargaBaru || kkPilih) return <Memuat />;
    const kb = usulan.keluargaBaru;
    const q = cariKk.trim().toLowerCase();
    const cocokKk = (daftarKk ?? []).filter((k) => !q || (k.kepala ?? "").toLowerCase().includes(q) || k.alamat.toLowerCase().includes(q)).slice(0, 20);
    return (
      <div className="space-y-4">
        <Judul kembali={() => go("/usulan")} sub={`${asal} · ${new Date(usulan.dibuat).toLocaleDateString("id-ID")}`}>Keluarga belum terdaftar</Judul>
        <Pesan>
          Alamat: <b>{kb?.alamat}{kb?.noUnit ? ` No. ${kb.noUnit}` : ""}</b><br />
          Anggota: {usulan.isi.anggota.map((a) => `${a.nama} (${a.hubungan})`).join(", ")}
        </Pesan>
        {!terbuka ? <Pesan>Isian ini sudah diputus ({usulan.status}).</Pesan> : (
          <>
            <PilihTombol label="Apa langkahnya?" belumTahu={false} kolom={1} nilai={modeKk}
              onChange={(v) => { if (!v) return; setModeKk(v as typeof modeKk); setAksi(v === "tolak" ? "klarifikasi" : "terima"); }}
              pilihan={[{ nilai: "pilih", label: "Keluarga ini sudah ada di daftar RT" }, { nilai: "baru", label: "Daftarkan KK baru" }, { nilai: "tolak", label: "Tolak / minta perbaikan" }]} />
            {modeKk === "baru" && (
              <KeluargaBaru draftKey={`kk-baru:usulan:${usulan.id}`} awal={{ alamat: kb?.alamat, noUnit: kb?.noUnit }} selesai={(kid) => setKkPilih(kid)} />
            )}
            {modeKk === "pilih" && (
              <>
                <IsianTeks label="Cari nama kepala keluarga / alamat" nilai={cariKk} onChange={setCariKk} />
                <ul className="bg-white rounded-2xl border-2 border-gray-200 divide-y-2 divide-gray-100">
                  {cocokKk.map((k) => (
                    <li key={k.id}>
                      <button type="button" onClick={() => setKkPilih(k.id)} className="w-full min-h-[64px] px-3 py-3 flex items-center gap-3 text-left active:bg-gray-50 sm:px-4">
                        <span className="min-w-0 flex-1 break-words"><span className="block text-lg font-semibold">{k.kepala ?? "Tanpa kepala keluarga"}</span><span className="block text-base text-gray-600">{k.alamat}{k.noUnit ? ` No. ${k.noUnit}` : ""}</span></span>
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </button>
                    </li>
                  ))}
                  {cocokKk.length === 0 && <li className="p-4 text-base text-gray-600">Tidak ditemukan. Pilih “Daftarkan KK baru”.</li>}
                </ul>
              </>
            )}
            {modeKk === "tolak" && (
              <>
                <PilihTombol label="Keputusan" belumTahu={false} kolom={1} nilai={aksi} onChange={(v) => v && setAksi(v as typeof aksi)}
                  pilihan={[{ nilai: "klarifikasi", label: "Minta keluarga memperbaiki" }, { nilai: "tolak", label: "Tolak" }]} />
                <IsianPanjang label="Pesan untuk keluarga (wajib)" nilai={catatan} onChange={setCatatan} />
                {error && <Pesan jenis="error">{error}</Pesan>}
                <BilahAksiAdmin>
                  <TombolBesar memuat={mengirim} disabled={catatan.trim().length < 3} onClick={async () => { const r = await kirim(); if (r) go("/usulan"); }}>Simpan keputusan</TombolBesar>
                </BilahAksiAdmin>
              </>
            )}
          </>
        )}
      </div>
    );
  }
  const baru = usulan.isi.anggota.filter((a, i) => a.keterangan === "baru" || cocokFinal[i] === "baru");
  const keluar = usulan.isi.anggota.filter((a) => a.keterangan === "pindah" || a.keterangan === "meninggal");

  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/usulan")} sub={`${asal} · ${new Date(usulan.dibuat).toLocaleDateString("id-ID")}`}>Periksa isian warga</Judul>
      {keluargaBaru && (
        <Pesan jenis="peringatan">
          Isian dicocokkan ke KK yang dipilih/didaftarkan. Setelah diterima, tambahkan anggotanya (dengan NIK) di halaman keluarga.{" "}
          <button type="button" className="inline-flex min-h-10 items-center font-semibold underline" onClick={() => setKkPilih(null)}>Ganti KK</button>
        </Pesan>
      )}
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
      {usulan.isi.catatan && <Pesan>Catatan warga: {usulan.isi.catatan}</Pesan>}

      {terbuka ? (
        <>
          <PilihTombol label="Keputusan" belumTahu={false} kolom={1} nilai={aksi} onChange={(v) => v && setAksi(v as typeof aksi)}
            pilihan={[{ nilai: "terima", label: "Terima yang dicentang" }, { nilai: "klarifikasi", label: "Minta keluarga memperbaiki" }, { nilai: "tolak", label: "Tolak semua" }]} />
          <IsianPanjang label={aksi === "terima" ? "Catatan (boleh kosong)" : "Pesan untuk keluarga (wajib)"} nilai={catatan} onChange={setCatatan} />
          {error && <Pesan jenis="error">{error}</Pesan>}
          <BilahAksiAdmin>
            <TombolBesar memuat={mengirim} disabled={aksi !== "terima" && catatan.trim().length < 3}
              onClick={async () => { const r = await kirim(); if (r) go(aksi === "terima" ? `/keluarga/${kkTujuan}${keluargaBaru ? "?langkah=anggota" : ""}` : "/usulan"); }}>
              Simpan keputusan
            </TombolBesar>
          </BilahAksiAdmin>
        </>
      ) : <Pesan>Isian ini sudah diputus ({usulan.status}).</Pesan>}
    </div>
  );
}

export default function Usulan({ id }: { id?: number }) {
  const [, go] = useLocation();
  const [status, setStatus] = useState("menunggu");
  const { data, isLoading, error } = useQuery<{ id: number; kepala: string | null; alamat: string; pengisi: string; status: string; created_at: string; sumber: string; keluarga_baru: boolean }[]>({
    queryKey: ["/api/wilayah/rt/usulan", status], queryFn: () => wil(`/api/wilayah/rt/usulan?status=${status}`), enabled: !id,
  });
  if (id) return <Periksa id={id} />;
  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/warga")}>Isian warga</Judul>
      <PilihTombol label="Tampilkan" belumTahu={false} nilai={status} onChange={(v) => v && setStatus(v)}
        pilihan={[{ nilai: "menunggu", label: "Perlu diperiksa" }, { nilai: "semua", label: "Semua" }]} />
      {isLoading && <Memuat />}
      {error && <Pesan jenis="error">{(error as Error).message}</Pesan>}
      {data?.length === 0 && <Pesan jenis="sukses">Tidak ada isian yang menunggu.</Pesan>}
      <ul className="bg-white rounded-2xl border-2 border-gray-200 divide-y-2 divide-gray-100">
        {data?.map((u) => (
          <li key={u.id}>
            <button type="button" onClick={() => go(`/usulan/${u.id}`)} className="w-full min-h-[72px] px-3 py-3 flex items-center gap-3 text-left active:bg-gray-50 sm:px-4">
              <span className="min-w-0 flex-1 break-words">
                <span className="block text-lg font-semibold">
                  {u.keluarga_baru ? `Keluarga baru · ${u.alamat}` : u.kepala ?? "Keluarga"}
                  {u.sumber === "rw" && <span className="ml-2 text-sm font-semibold rounded-full px-2 py-0.5 bg-amber-100 text-amber-800 align-middle">dari RW</span>}
                </span>
                <span className="block text-base text-gray-600">Diisi {u.pengisi} · {new Date(u.created_at).toLocaleDateString("id-ID")} · {u.status}</span>
              </span>
              <ChevronRight className="w-6 h-6 shrink-0 text-gray-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
