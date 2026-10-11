import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Home, Pencil, QrCode, RefreshCw, Truck, UserPlus, XCircle } from "lucide-react";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, IsianTeks, Judul, KartuMenu, Langkah, Memuat, Pesan, PilihTombol, TombolBesar } from "@/components/wilayah/ui";
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
    status: a.status, tanggalLahir: a.tanggalLahir ?? "", nomorHp: a.nomorHp ?? "", statusPerkawinan: a.statusPerkawinan, kedudukan: a.kedudukan,
  });
  const set = (p: Partial<typeof d>) => setNilai({ ...d, ...p });
  const { kirim, mengirim, error } = useKirimSekali(async () => {
    const body: Record<string, unknown> = {};
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
    <Langkah langkah={1} total={1} judul={`Data dasar: ${a.nama}`} onKembali={batal} labelLanjut="Simpan" memuat={mengirim}
      onLanjut={async () => { if (await kirim()) selesai(); }}>
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
      <Langkah langkah={1} total={3} judul="Nama & NIK" onKembali={batal} onLanjut={() => set({ i: 2 })} bisaLanjut={d.nama.trim().length >= 2 && /^\d{16}$/.test(d.nik)}>
        <IsianTeks label="Nama lengkap" nilai={d.nama} onChange={(v) => set({ nama: v })} />
        <IsianTeks label="NIK (16 angka)" inputMode="numeric" maks={16} nilai={d.nik} onChange={(v) => set({ nik: v.replace(/\D/g, "") })} />
      </Langkah>
    );
  }
  if (d.i === 2) {
    return (
      <Langkah langkah={2} total={3} judul="Data diri" onKembali={() => set({ i: 1 })} onLanjut={() => set({ i: 3 })} bisaLanjut={!!d.jenisKelamin}>
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
    <Langkah langkah={3} total={3} judul="Periksa sebelum menyimpan" onKembali={() => set({ i: 2 })} labelLanjut="Simpan" memuat={mengirim}
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
    <Langkah langkah={1} total={1} judul="Keluarga ini tinggal di rumah mana?" onKembali={batal} labelLanjut="Simpan" bisaLanjut={pilih != null} memuat={mengirim}
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
    if (!confirm("Ganti QR? Kartu lama tidak akan bisa dipakai lagi.")) return;
    setAksiErr(null);
    try {
      await wil("/api/wilayah/rt/qr/cetak", { body: { kkIds: [d.kk.id], ganti: true } });
      go(`/cetak?kk=${d.kk.id}`);
    } catch (e) {
      setAksiErr((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <Judul kembali={() => go("/warga")} sub={`${d.kk.alamat}${d.kk.noUnit ? ` No. ${d.kk.noUnit}` : ""}`}>{kepala}</Judul>
      {info && <Pesan jenis="sukses">{info}</Pesan>}
      {aksiErr && <Pesan jenis="error">{aksiErr}</Pesan>}

      <section className="bg-white rounded-2xl border-2 border-gray-200 p-4">
        <div className="flex items-center justify-between text-base">
          <span className="font-semibold">Kelengkapan data</span>
          <span className="text-gray-600">{d.ringkas.terjawab}/{d.ringkas.pertanyaan} terjawab · {persen}%</span>
        </div>
        <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${persen}%`, backgroundColor: persen >= 80 ? "hsl(163,55%,32%)" : persen >= 40 ? "hsl(40,70%,50%)" : "hsl(0,65%,55%)" }} />
        </div>
        {d.ringkas.perhatian.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {d.ringkas.perhatian.map((p) => (
              <span key={p.kunci} className="rounded-full bg-rose-50 border border-rose-200 px-3 py-1 text-sm text-rose-800">{p.label}: {p.detail}</span>
            ))}
          </div>
        )}
      </section>

      {d.usulan.some((u) => u.status === "menunggu") && (
        <KartuMenu ikon={<CheckCircle2 className="w-7 h-7" />} judul="Ada isian baru dari keluarga" sub="Periksa dan putuskan" onClick={() => go(`/usulan/${d.usulan.find((u) => u.status === "menunggu")!.id}`)} />
      )}

      {perluCek.length > 0 && (
        <section className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-2">Data lama perlu dicek</h2>
          {perluCek.map((f) => {
            const def = defStandar(f.kunci);
            return (
              <div key={f.id} className="py-3 border-b border-amber-200 last:border-0">
                <p className="text-lg">{def?.label ?? f.kunci}: <b>{labelNilaiFakta(def, f.nilai)}</b></p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <TombolBesar ikon={<CheckCircle2 className="w-6 h-6" />} onClick={() => putuskan(f, true)}>Benar</TombolBesar>
                  <TombolBesar varian="bahaya" ikon={<XCircle className="w-6 h-6" />} onClick={() => putuskan(f, false)}>Salah</TombolBesar>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-2">Anggota keluarga</h2>
        <ul className="bg-white rounded-2xl border-2 border-gray-200 divide-y-2 divide-gray-100">
          {d.anggota.map((a) => (
            <li key={a.id} className="p-4">
              <p className="text-lg font-semibold">{a.nama} {a.status !== "Aktif" && <span className="text-base text-red-700">({a.status})</span>}</p>
              <p className="text-base text-gray-600">{a.kedudukan} · {a.jenisKelamin} · {a.umur != null ? `${a.umur} th` : "umur belum diketahui"}</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <TombolBesar varian="kedua" ikon={<Pencil className="w-5 h-5" />} onClick={() => setMode({ m: "orang", a })}>Kondisi</TombolBesar>
                <TombolBesar varian="kedua" onClick={() => setMode({ m: "dasar", a })}>Data dasar</TombolBesar>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3"><TombolBesar varian="kedua" ikon={<UserPlus className="w-6 h-6" />} onClick={() => setMode({ m: "anggota" })}>Tambah anggota</TombolBesar></div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Keluarga & rumah</h2>
        <KartuMenu ikon={<Pencil className="w-7 h-7" />} judul="Kondisi keluarga" sub="Tempat tinggal, rumah, ekonomi, kerentanan" onClick={() => setMode({ m: "keluarga" })} />
        <KartuMenu ikon={<Home className="w-7 h-7" />} judul={d.rumah ? `Rumah: ${d.rumah.alamat}${d.rumah.noUnit ? ` No. ${d.rumah.noUnit}` : ""}` : "Belum terhubung ke rumah"}
          sub={d.rumah ? `${d.rumah.jumlahKk} KK di rumah ini · ketuk untuk ganti` : "Ketuk untuk menghubungkan"} onClick={() => setMode({ m: "rumah" })} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">QR pemberitahuan</h2>
        <p className="text-lg">{d.qr ? `Kode kartu ${d.qr.kodeKartu} · berlaku sampai ${new Date(d.qr.berlakuSampai).toLocaleDateString("id-ID")}` : "Belum dibuat."}</p>
        <TombolBesar ikon={<QrCode className="w-6 h-6" />} onClick={() => go(`/cetak?kk=${d.kk.id}`)}>Cetak satu</TombolBesar>
        {d.qr && <TombolBesar varian="kedua" ikon={<RefreshCw className="w-6 h-6" />} onClick={gantiQr}>Ganti QR (kartu hilang)</TombolBesar>}
        <TombolBesar varian="kedua" ikon={<Truck className="w-6 h-6" />} onClick={() => go(`/pindah?kk=${d.kk.id}`)}>Pindah ke RT lain</TombolBesar>
      </section>
    </div>
  );
}
