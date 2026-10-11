import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Home, IdCard, MessageCircle, Pencil, QrCode, RefreshCw, Trash2, Truck, UserPlus, XCircle } from "lucide-react";
import { toWaMeUrl } from "@/lib/wa";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, HIJAU, IsianTeks, Judul, KartuMenu, Langkah, Memuat, Pesan, PilihTombol } from "@/components/wilayah/ui";
import { FormFakta, kunciAwal, type LangkahFakta } from "@/components/wilayah/form-fakta";
import { berlakuUntukWarga, kelompokkan, labelNilaiFakta, type DefinisiFakta } from "@shared/wilayah";
import { defStandar, useStandar } from "@/lib/standar";

interface Fakta { id: number; kunci: string; nilai: string; mulai: string; sumber: string; statusVerifikasi: string; dicatatOleh: string | null }
interface Anggota {
  id: number; nama: string; nik: string; jenisKelamin: string; tanggalLahir: string | null; umur: number | null;
  kedudukan: string; statusPerkawinan: string; status: string; nomorHp: string | null; nomorHpPerluCek: boolean; fakta: Fakta[];
}
interface Detail {
  kk: { id: number; rt: number; alamat: string; noUnit: string | null };
  anggota: Anggota[];
  rumah: { id: number; alamat: string; noUnit: string | null; jumlahKk: number } | null;
  usaha: { id: number; nama: string }[];
  fakta: Fakta[];
  jawabanInduk?: Record<string, string>;
  qr: { kodeKartu: string; berlakuSampai: string } | null;
  usulan: { id: number; status: string }[];
  ringkas: { kelengkapan: number; terjawab: number; pertanyaan: number; perhatian: { kunci: string; label: string; detail: string }[] };
}

const KEDUDUKAN = ["Kepala Keluarga", "Istri", "Suami", "Anak", "Menantu", "Cucu", "Orang Tua", "Mertua", "Famili Lain", "Lainnya"];
const KAWIN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"];

function langkahWarga(a: Anggota, standar: DefinisiFakta[]): LangkahFakta[] {
  const berlaku = standar.filter((x) => x.subjek === "warga" && berlakuUntukWarga(x, { jenisKelamin: a.jenisKelamin, umur: a.umur }));
  return kelompokkan(berlaku).map((g) => ({ judul: g.kelompok, subjek: "warga", subjekId: a.id, kunci: g.daftar.map((x) => x.kunci) }));
}

function langkahKeluarga(d: Detail, standar: DefinisiFakta[]): LangkahFakta[] {
  return kelompokkan(standar.filter((x) => x.subjek === "kk")).map((g) => ({ judul: g.kelompok, subjek: "kk", subjekId: d.kk.id, kunci: g.daftar.map((x) => x.kunci) }));
}

function DataDasar({ a, kkId, selesai, batal }: { a: Anggota; kkId: number; selesai: () => void; batal: () => void }) {
  const { nilai: d, setNilai, hapus } = useDraft(`dasar:${a.id}`, {
    nama: a.nama, jenisKelamin: a.jenisKelamin,
    status: a.status, tanggalLahir: a.tanggalLahir ?? "", nomorHp: a.nomorHp ?? "", statusPerkawinan: a.statusPerkawinan, kedudukan: a.kedudukan,
  });
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    const body: Record<string, unknown> = {};
    const nama = (d.nama ?? a.nama).trim();
    if (nama && nama !== a.nama) body.nama = nama;
    if (d.jenisKelamin && d.jenisKelamin !== a.jenisKelamin) body.jenisKelamin = d.jenisKelamin;
    if (d.status !== a.status) body.status = d.status;
    if ((d.tanggalLahir || null) !== (a.tanggalLahir || null)) body.tanggalLahir = d.tanggalLahir || null;
    if ((d.nomorHp || null) !== (a.nomorHp || null)) body.nomorHp = d.nomorHp || null;
    if (d.statusPerkawinan !== a.statusPerkawinan) body.statusPerkawinan = d.statusPerkawinan;
    if (d.kedudukan !== a.kedudukan) body.kedudukan = d.kedudukan;
    if (Object.keys(body).length) await wil(`/api/wilayah/rt/warga/${a.id}`, { method: "PATCH", body });
    hapus();
    return true;
  });
  return (
    <Langkah lengket="admin" langkah={1} total={1} judul={`Data dasar: ${a.nama}`} onKembali={batal} labelLanjut="Simpan" memuat={mengirim}
      onLanjut={async () => { if (await kirim()) selesai(); }} bisaLanjut={(d.nama ?? a.nama).trim().length >= 2}>
      <IsianTeks label="Nama lengkap" nilai={d.nama ?? a.nama} onChange={(v) => set({ nama: v })} />
      <PilihTombol label="Jenis kelamin" belumTahu={false} nilai={d.jenisKelamin ?? a.jenisKelamin} onChange={(v) => v && set({ jenisKelamin: v })}
        pilihan={[{ nilai: "Laki-laki", label: "Laki-laki" }, { nilai: "Perempuan", label: "Perempuan" }]} />
      <PilihTombol label="Status" belumTahu={false} nilai={d.status} onChange={(v) => v && set({ status: v })}
        pilihan={[{ nilai: "Aktif", label: "Masih tinggal di sini" }, { nilai: "Pindah", label: "Sudah pindah" }, { nilai: "Meninggal", label: "Meninggal" }]} kolom={1} />
      {d.status === "Pindah" && <Pesan jenis="info">Bila pindah ke RT lain di RW 03, gunakan menu “Pindah RT” agar datanya ikut pindah.</Pesan>}
      <div className="mt-4" />
      <IsianTeks label="Tanggal lahir" tipe="date" nilai={d.tanggalLahir} onChange={(v) => set({ tanggalLahir: v })} bantuan="Umur dihitung otomatis dari tanggal lahir." />
      <IsianTeks label="Nomor HP / WhatsApp" inputMode="tel" nilai={d.nomorHp} onChange={(v) => set({ nomorHp: v })} placeholder="08…" bantuan="Jangan isi dengan NIK." />
      {a.nomorHpPerluCek && <Pesan jenis="peringatan">Nomor HP lama tidak valid (mungkin berisi NIK). Isi nomor yang benar.</Pesan>}
      <PilihTombol label="Hubungan dalam keluarga" belumTahu={false} nilai={d.kedudukan} onChange={(v) => v && set({ kedudukan: v })} pilihan={KEDUDUKAN.map((x) => ({ nilai: x, label: x }))} />
      <PilihTombol label="Status perkawinan" belumTahu={false} nilai={d.statusPerkawinan} onChange={(v) => v && set({ statusPerkawinan: v })} pilihan={KAWIN.map((x) => ({ nilai: x, label: x }))} />
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

function AnggotaBaru({ kkId, selesai, batal }: { kkId: number; selesai: () => void; batal: () => void }) {
  const { nilai: d, setNilai, hapus } = useDraft(`anggota-baru:${kkId}`, {
    i: 1, nama: "", nik: "", jenisKelamin: "", tanggalLahir: "", kedudukan: "Anak", statusPerkawinan: "Belum Kawin", nomorHp: "",
  });
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    await wil(`/api/wilayah/rt/keluarga/${kkId}/warga`, {
      body: { nama: d.nama, nik: d.nik, jenisKelamin: d.jenisKelamin, tanggalLahir: d.tanggalLahir || null, kedudukan: d.kedudukan, statusPerkawinan: d.statusPerkawinan, nomorHp: d.nomorHp || null },
    });
    hapus();
    return true;
  });
  if (d.i === 1) {
    return (
      <Langkah lengket="admin" langkah={1} total={3} judul="Nama & NIK" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={d.nama.trim().length >= 2 && /^\d{16}$/.test(d.nik)}>
        <IsianTeks label="Nama lengkap" nilai={d.nama} onChange={(v) => set({ nama: v })} />
        <IsianTeks label="NIK (16 angka)" inputMode="numeric" maks={16} nilai={d.nik} onChange={(v) => set({ nik: v.replace(/\D/g, "") })} />
      </Langkah>
    );
  }
  if (d.i === 2) {
    return (
      <Langkah lengket="admin" langkah={2} total={3} judul="Data diri" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })} bisaLanjut={!!d.jenisKelamin}>
        <PilihTombol label="Jenis kelamin" belumTahu={false} nilai={d.jenisKelamin || null} onChange={(v) => set({ jenisKelamin: v ?? "" })}
          pilihan={[{ nilai: "Laki-laki", label: "Laki-laki" }, { nilai: "Perempuan", label: "Perempuan" }]} />
        <IsianTeks label="Tanggal lahir" tipe="date" nilai={d.tanggalLahir} onChange={(v) => set({ tanggalLahir: v })} bantuan="Kosongkan bila belum tahu." />
        <PilihTombol label="Hubungan dalam keluarga" belumTahu={false} nilai={d.kedudukan} onChange={(v) => v && set({ kedudukan: v })} pilihan={KEDUDUKAN.map((x) => ({ nilai: x, label: x }))} />
        <PilihTombol label="Status perkawinan" belumTahu={false} nilai={d.statusPerkawinan} onChange={(v) => v && set({ statusPerkawinan: v })} pilihan={KAWIN.map((x) => ({ nilai: x, label: x }))} />
        <IsianTeks label="Nomor HP (bila ada)" inputMode="tel" nilai={d.nomorHp} onChange={(v) => set({ nomorHp: v })} />
      </Langkah>
    );
  }
  return (
    <Langkah lengket="admin" langkah={3} total={3} judul="Periksa sebelum menyimpan" onKembali={() => set({ i: 2 })} labelLanjut="Simpan" memuat={mengirim}
      onLanjut={async () => { if (await kirim()) selesai(); }}>
      <BarisRingkas label="Nama" nilai={d.nama} />
      <BarisRingkas label="NIK" nilai={d.nik} />
      <BarisRingkas label="Jenis kelamin" nilai={d.jenisKelamin} />
      <BarisRingkas label="Tanggal lahir" nilai={d.tanggalLahir || null} />
      <BarisRingkas label="Hubungan" nilai={d.kedudukan} />
      {error && <div className="mt-4"><Pesan jenis="error">{error}</Pesan></div>}
    </Langkah>
  );
}

function PilihRumah({ d, selesai, batal }: { d: Detail; selesai: () => void; batal: () => void }) {
  const { data: rumah, isLoading } = useQuery<{ id: number; alamat: string; no_unit: string | null; kk: { kkId: number }[] }[]>({
    queryKey: ["/api/wilayah/rumah"], queryFn: () => wil("/api/wilayah/rumah"),
  });
  const [pilih, setPilih] = useState<number | "baru" | null>(null);
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    let rumahId = pilih as number;
    if (pilih === "baru") rumahId = (await wil<{ id: number }>("/api/wilayah/rt/rumah", { body: { alamat: d.kk.alamat, noUnit: d.kk.noUnit } })).id;
    await wil(`/api/wilayah/rt/keluarga/${d.kk.id}/rumah`, { body: { rumahId } });
    return true;
  });
  return (
    <Langkah lengket="admin" langkah={1} total={1} judul="Keluarga ini tinggal di rumah mana?" onKembali={batal} labelLanjut="Simpan" bisaLanjut={pilih != null} memuat={mengirim}
      onLanjut={async () => { if (await kirim()) selesai(); }}>
      <p className="text-base text-gray-600 mb-3">Bila satu rumah dihuni beberapa KK, pilih rumah yang sama agar rumah dihitung satu.</p>
      {isLoading && <Memuat />}
      <PilihTombol label="Pilih rumah" belumTahu={false} kolom={1} nilai={pilih == null ? null : String(pilih)} onChange={(v) => setPilih(v === "baru" ? "baru" : Number(v))}
        pilihan={[
          { nilai: "baru", label: `Rumah baru: ${d.kk.alamat}${d.kk.noUnit ? ` No. ${d.kk.noUnit}` : ""}` },
          ...(rumah ?? []).map((r) => ({ nilai: String(r.id), label: `${r.alamat}${r.no_unit ? ` No. ${r.no_unit}` : ""} (${r.kk.length} KK)` })),
        ]} />
      {error && <Pesan jenis="error">{error}</Pesan>}
    </Langkah>
  );
}

type Mode = { m: "lihat" } | { m: "orang"; a: Anggota } | { m: "dasar"; a: Anggota } | { m: "keluarga" } | { m: "anggota" } | { m: "rumah" };

export default function Keluarga({ id }: { id: number }) {
  const [, go] = useLocation();
  const params = new URLSearchParams(useSearch());
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>(params.get("langkah") === "anggota" ? { m: "anggota" } : { m: "lihat" });
  const [info, setInfo] = useState<string | null>(null);
  const [aksiErr, setAksiErr] = useState<string | null>(null);
  const [tanyaQr, setTanyaQr] = useState(false);
  const [hapusOrang, setHapusOrang] = useState<Anggota | null>(null);
  const [hapusKk, setHapusKk] = useState(false);
  const [menghapus, setMenghapus] = useState(false);
  const key = [`/api/wilayah/keluarga/${id}`];
  const { data: d, isLoading, error } = useQuery<Detail>({ queryKey: key, queryFn: async () => {
    const x = await wil<Detail>(`/api/wilayah/keluarga/${id}`);
    return { ...x, ringkas: x.ringkas ? { ...x.ringkas, perhatian: x.ringkas.perhatian ?? [] } : { kelengkapan: 0, terjawab: 0, pertanyaan: 0, perhatian: [] } };
  } });
  const { data: standar, isLoading: memuatStandar } = useStandar();
  const segarkan = async (pesan?: string) => {
    await qc.invalidateQueries({ queryKey: key });
    await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
    setMode({ m: "lihat" });
    if (pesan) setInfo(pesan);
    window.scrollTo(0, 0);
  };

  if (isLoading || memuatStandar) return <Memuat />;
  if (error || !d || !standar) return <Pesan jenis="error">{(error as Error)?.message ?? "Gagal memuat"}</Pesan>;
  const kepala = d.anggota.find((a) => a.kedudukan === "Kepala Keluarga")?.nama ?? "Keluarga";
  const batal = () => setMode({ m: "lihat" });
  const awalDari = (subjek: "kk" | "warga", subjekId: number, fakta: Fakta[]) => {
    const awalan = `${subjek}:${subjekId}:`;
    const induk = Object.fromEntries(Object.entries(d.jawabanInduk ?? {}).filter(([k]) => k.startsWith(awalan)));
    return { ...induk, ...kunciAwal(subjek, subjekId, fakta) };
  };

  if (mode.m === "orang") {
    return (
      <div>
        <Judul kembali={batal} sub={mode.a.umur != null ? `${mode.a.umur} tahun` : "Umur belum diketahui"}>{mode.a.nama}</Judul>
        <FormFakta draftKey={`warga:${mode.a.id}`} langkah={langkahWarga(mode.a, standar)} awal={awalDari("warga", mode.a.id, mode.a.fakta)}
          batal={batal} selesai={(n) => segarkan(n ? `${n} perubahan tersimpan.` : undefined)} />
      </div>
    );
  }
  if (mode.m === "dasar") return <div><Judul kembali={batal}>Ubah data dasar</Judul><DataDasar a={mode.a} kkId={d.kk.id} batal={batal} selesai={() => segarkan("Data dasar tersimpan.")} /></div>;
  if (mode.m === "anggota") return <div><Judul kembali={batal}>Tambah anggota</Judul><AnggotaBaru kkId={d.kk.id} batal={batal} selesai={() => segarkan("Anggota baru tersimpan.")} /></div>;
  if (mode.m === "rumah") return <div><Judul kembali={batal}>Hubungkan ke rumah</Judul><PilihRumah d={d} batal={batal} selesai={() => segarkan("Rumah terhubung.")} /></div>;
  if (mode.m === "keluarga") {
    const awal = awalDari("kk", d.kk.id, d.fakta);
    return (
      <div>
        <Judul kembali={batal}>Kondisi keluarga</Judul>
        <FormFakta draftKey={`kk:${d.kk.id}`} langkah={langkahKeluarga(d, standar)} awal={awal} batal={batal} selesai={(n) => segarkan(n ? `${n} perubahan tersimpan.` : undefined)} />
      </div>
    );
  }

  const perluCek = [...d.fakta, ...d.anggota.flatMap((a) => a.fakta)].filter((f) => f.statusVerifikasi === "perlu_cek");
  const persen = Math.round(d.ringkas.kelengkapan * 100);
  const putuskan = async (f: Fakta, terima: boolean) => {
    setAksiErr(null);
    try {
      await wil(`/api/wilayah/rt/fakta/${f.id}/putuskan`, { body: { terima } });
      await segarkan(terima ? "Data dibenarkan." : "Data ditolak.");
    } catch (e) {
      setAksiErr((e as Error).message);
    }
  };
  const gantiQr = async () => {
    setTanyaQr(false);
    setAksiErr(null);
    try {
      await wil("/api/wilayah/rt/qr/cetak", { body: { kkIds: [d.kk.id], ganti: true } });
      go(`/cetak?kk=${d.kk.id}`);
    } catch (e) {
      setAksiErr((e as Error).message);
    }
  };

  const lakukanHapusOrang = async () => {
    if (!hapusOrang) return;
    setMenghapus(true);
    setAksiErr(null);
    try {
      await wil(`/api/warga/${hapusOrang.id}`, { method: "DELETE" });
      setHapusOrang(null);
      await segarkan(`${hapusOrang.nama} dihapus dari data warga.`);
    } catch (e) {
      setAksiErr((e as Error).message);
      setHapusOrang(null);
    } finally {
      setMenghapus(false);
    }
  };
  const lakukanHapusKk = async () => {
    setMenghapus(true);
    setAksiErr(null);
    try {
      await wil(`/api/kk/${d.kk.id}`, { method: "DELETE" });
      qc.removeQueries({ queryKey: key });
      await qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga"] });
      go("/warga");
    } catch (e) {
      setAksiErr((e as Error).message);
      setHapusKk(false);
    } finally {
      setMenghapus(false);
    }
  };

  const tombolKecil = "inline-flex h-8 items-center gap-1 rounded-lg border px-2 text-xs font-medium";
  const judulBagian = "text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="space-y-3">
      <Judul kembali={() => go("/warga")} sub={`${d.kk.alamat}${d.kk.noUnit ? ` No. ${d.kk.noUnit}` : ""}`}>{kepala}</Judul>
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      {aksiErr && <Pesan jenis="error">{aksiErr}</Pesan>}

      <section className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-gray-700">Kelengkapan data</span>
          <span className="text-gray-500">{d.ringkas.terjawab}/{d.ringkas.pertanyaan} · <b className="text-gray-800">{persen}%</b></span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${persen}%`, backgroundColor: persen >= 80 ? "hsl(163,55%,32%)" : persen >= 40 ? "hsl(40,70%,50%)" : "hsl(0,65%,55%)" }} />
        </div>
        {d.ringkas.perhatian.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {d.ringkas.perhatian.map((p) => (
              <span key={p.kunci} className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] text-rose-800">{p.label}: {p.detail}</span>
            ))}
          </div>
        )}
      </section>

      {d.usulan.some((u) => u.status === "menunggu") && (
        <KartuMenu ikon={<CheckCircle2 />} judul="Ada isian baru dari keluarga" sub="Periksa dan putuskan" onClick={() => go(`/usulan/${d.usulan.find((u) => u.status === "menunggu")!.id}`)} />
      )}

      {perluCek.length > 0 && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
          <h2 className="mb-1 text-sm font-semibold text-amber-900">Data lama perlu dicek</h2>
          {perluCek.map((f) => {
            const def = defStandar(f.kunci);
            return (
              <div key={f.id} className="flex items-center gap-2 border-b border-amber-200 py-1.5 last:border-0">
                <p className="min-w-0 flex-1 text-sm">{def?.label ?? f.kunci}: <b>{labelNilaiFakta(def, f.nilai)}</b></p>
                <button type="button" onClick={() => putuskan(f, true)} className={`${tombolKecil} border-emerald-600 bg-emerald-600 text-white`}><CheckCircle2 className="h-3.5 w-3.5" />Benar</button>
                <button type="button" onClick={() => putuskan(f, false)} className={`${tombolKecil} border-red-300 bg-white text-red-700`}><XCircle className="h-3.5 w-3.5" />Salah</button>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className={judulBagian}>Anggota keluarga · {d.anggota.length}</h2>
          <button type="button" onClick={() => setMode({ m: "anggota" })} className={`${tombolKecil} border-transparent text-white`} style={{ backgroundColor: HIJAU }}>
            <UserPlus className="h-3.5 w-3.5" />Tambah
          </button>
        </div>
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {d.anggota.map((a) => (
            <li key={a.id} className="px-3 py-2">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">
                    {a.nama} {a.status !== "Aktif" && <span className="text-xs font-normal text-red-700">({a.status})</span>}
                  </p>
                  <p className="text-xs text-gray-500">{a.kedudukan} · {a.jenisKelamin === "Laki-laki" ? "L" : a.jenisKelamin === "Perempuan" ? "P" : "-"} · {a.umur != null ? `${a.umur} th` : "umur ?"}{a.nomorHp ? ` · ${a.nomorHp}` : ""}</p>
                </div>
                {a.nomorHp && !a.nomorHpPerluCek && (
                  <a href={toWaMeUrl(a.nomorHp, `Assalamu'alaikum, ${a.nama}. Kami dari pengurus RW 03 Padasuka.`)} target="_blank" rel="noopener noreferrer"
                    aria-label={`WhatsApp ${a.nama}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white">
                    <MessageCircle className="h-4 w-4" />
                  </a>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setMode({ m: "dasar", a })} className={`${tombolKecil} border-gray-300 bg-white text-gray-800 hover:border-emerald-400`}><IdCard className="h-3.5 w-3.5" />Ubah data</button>
                <button type="button" onClick={() => setMode({ m: "orang", a })} className={`${tombolKecil} border-gray-300 bg-white text-gray-800 hover:border-emerald-400`}><Pencil className="h-3.5 w-3.5" />Kondisi</button>
                <button type="button" onClick={() => setHapusOrang(a)} className={`${tombolKecil} ml-auto border-red-200 bg-white text-red-700 hover:bg-red-50`}><Trash2 className="h-3.5 w-3.5" />Hapus</button>
              </div>
            </li>
          ))}
          {d.anggota.length === 0 && <li className="px-3 py-3 text-sm text-gray-500">Belum ada anggota.</li>}
        </ul>
      </section>

      <section className="space-y-1.5">
        <h2 className={judulBagian}>Keluarga & rumah</h2>
        <KartuMenu ikon={<Pencil />} judul="Kondisi keluarga" sub="Tempat tinggal, rumah, ekonomi, kerentanan" onClick={() => setMode({ m: "keluarga" })} />
        <KartuMenu ikon={<Home />} judul={d.rumah ? `Rumah: ${d.rumah.alamat}${d.rumah.noUnit ? ` No. ${d.rumah.noUnit}` : ""}` : "Belum terhubung ke rumah"}
          sub={d.rumah ? `${d.rumah.jumlahKk} KK di rumah ini · ketuk untuk ganti` : "Ketuk untuk menghubungkan"} onClick={() => setMode({ m: "rumah" })} />
      </section>

      <section className="space-y-1.5">
        <h2 className={judulBagian}>QR & lainnya</h2>
        <p className="text-xs text-gray-600">{d.qr ? `Kode kartu ${d.qr.kodeKartu} · berlaku sampai ${new Date(d.qr.berlakuSampai).toLocaleDateString("id-ID")}` : "QR belum dibuat."}</p>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => go(`/cetak?kk=${d.kk.id}`)} className={`${tombolKecil} border-transparent text-white`} style={{ backgroundColor: HIJAU }}><QrCode className="h-3.5 w-3.5" />Cetak QR</button>
          {d.qr && <button type="button" onClick={() => setTanyaQr(true)} className={`${tombolKecil} border-gray-300 bg-white text-gray-800`}><RefreshCw className="h-3.5 w-3.5" />Ganti QR</button>}
          <button type="button" onClick={() => go(`/pindah?kk=${d.kk.id}`)} className={`${tombolKecil} border-gray-300 bg-white text-gray-800`}><Truck className="h-3.5 w-3.5" />Pindah RT</button>
          <button type="button" onClick={() => setHapusKk(true)} className={`${tombolKecil} ml-auto border-red-200 bg-white text-red-700 hover:bg-red-50`}><Trash2 className="h-3.5 w-3.5" />Hapus KK</button>
        </div>
      </section>

      <AlertDialog open={hapusOrang != null} onOpenChange={(o) => { if (!o && !menghapus) setHapusOrang(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {hapusOrang?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              Data warga ini dihapus permanen dan tidak bisa dikembalikan. Bila warga pindah atau meninggal, lebih baik ubah statusnya lewat “Ubah data” agar riwayat tetap tercatat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={menghapus}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={menghapus} onClick={(e) => { e.preventDefault(); lakukanHapusOrang(); }} className="bg-red-600 hover:bg-red-700">
              {menghapus ? "Menghapus…" : "Hapus permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={hapusKk} onOpenChange={(o) => { if (!menghapus) setHapusKk(o); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus KK {kepala}?</AlertDialogTitle>
            <AlertDialogDescription>
              Kartu keluarga beserta {d.anggota.length} anggotanya dan semua data terkait dihapus permanen. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={menghapus}>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={menghapus} onClick={(e) => { e.preventDefault(); lakukanHapusKk(); }} className="bg-red-600 hover:bg-red-700">
              {menghapus ? "Menghapus…" : "Hapus KK"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={tanyaQr} onOpenChange={setTanyaQr}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti QR?</AlertDialogTitle>
            <AlertDialogDescription>Kartu lama tidak akan bisa dipakai lagi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={gantiQr}>Ganti QR</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
