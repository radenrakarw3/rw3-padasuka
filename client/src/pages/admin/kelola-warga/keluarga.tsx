import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Home,
  IdCard,
  MessageCircle,
  Pencil,
  QrCode,
  RefreshCw,
  Trash2,
  Truck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { toWaMeUrl } from "@/lib/wa";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDraft, useKirimSekali, wil } from "@/lib/wilayah-api";
import { BarisRingkas, HIJAU, IsianTeks, Judul, Langkah, Memuat, Pesan, PilihTombol, rt2 } from "@/components/wilayah/ui";
import { FormFakta, kunciAwal, type LangkahFakta } from "@/components/wilayah/form-fakta";
import { KkTagEditor } from "@/components/admin/kk-tag-editor";
import { berlakuUntukWarga, kelompokkan, labelNilaiFakta, type DefinisiFakta } from "@shared/wilayah";
import { defStandar, useStandar } from "@/lib/standar";
import { cn } from "@/lib/utils";

interface Fakta {
  id: number;
  kunci: string;
  nilai: string;
  mulai: string;
  sumber: string;
  statusVerifikasi: string;
  dicatatOleh: string | null;
}
interface Anggota {
  id: number;
  nama: string;
  nik: string;
  jenisKelamin: string;
  tanggalLahir: string | null;
  umur: number | null;
  kedudukan: string;
  statusPerkawinan: string;
  status: string;
  nomorHp: string | null;
  nomorHpPerluCek: boolean;
  fakta: Fakta[];
}
interface Detail {
  kk: {
    id: number;
    rt: number;
    alamat: string;
    noUnit: string | null;
    nomorKk?: string | null;
    labelRw?: string | null;
  };
  anggota: Anggota[];
  rumah: { id: number; alamat: string; noUnit: string | null; jumlahKk: number } | null;
  usaha: { id: number; nama: string }[];
  fakta: Fakta[];
  jawabanInduk?: Record<string, string>;
  qr: { kodeKartu: string; berlakuSampai: string } | null;
  usulan: { id: number; status: string }[];
  ringkas: {
    kelengkapan: number;
    terjawab: number;
    pertanyaan: number;
    perhatian: { kunci: string; label: string; detail: string }[];
  };
}

function Kartu({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl border border-border bg-white p-4 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? (
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
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

type Mode = { m: "lihat" } | { m: "orang"; a: Anggota } | { m: "dasar"; a: Anggota } | { m: "keluarga" } | { m: "anggota" };

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

  const tombolKecil =
    "inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors";
  const usulanMenunggu = d.usulan.find((u) => u.status === "menunggu");
  const warnaBar =
    persen >= 80 ? "hsl(163,55%,32%)" : persen >= 40 ? "hsl(40,70%,50%)" : "hsl(0,65%,55%)";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() => go("/warga")}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Daftar KK
        </button>
      </div>

      {info && <Pesan jenis="sukses">{info}</Pesan>}
      {aksiErr && <Pesan jenis="error">{aksiErr}</Pesan>}

      {/* Identitas */}
      <Kartu className="overflow-hidden !p-0">
        <div
          className="border-b border-border/60 px-4 py-4 sm:px-5"
          style={{
            background:
              "linear-gradient(135deg, hsl(163,55%,22%,0.08) 0%, hsl(40,45%,55%,0.06) 50%, transparent 100%)",
          }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(163,55%,22%)]">
                Kartu keluarga · {rt2(d.kk.rt)}
              </p>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{kepala}</h1>
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <Home className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {d.kk.alamat}
                  {d.kk.noUnit ? ` No. ${d.kk.noUnit}` : ""}
                </span>
              </p>
              {d.kk.nomorKk && (
                <p className="font-mono text-xs tabular-nums text-muted-foreground">KK {d.kk.nomorKk}</p>
              )}
            </div>
            <div className="shrink-0 rounded-xl border border-border/80 bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Kelengkapan</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums" style={{ color: warnaBar }}>
                {persen}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                {d.ringkas.terjawab}/{d.ringkas.pertanyaan} isian
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5">
            <div className="h-full rounded-full transition-all" style={{ width: `${persen}%`, backgroundColor: warnaBar }} />
          </div>
          {d.ringkas.perhatian.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {d.ringkas.perhatian.map((p) => (
                <span
                  key={p.kunci}
                  className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-800"
                >
                  {p.label}: {p.detail}
                </span>
              ))}
            </div>
          )}
        </div>
      </Kartu>

      {/* Tag */}
      <KkTagEditor
        kkId={d.kk.id}
        labelRw={d.kk.labelRw}
        invalidateKeys={[[`/api/wilayah/keluarga/${id}`], ["/api/kk"], ["/api/warga-with-kk"]]}
      />

      {/* Perlu tindakan */}
      {(usulanMenunggu || perluCek.length > 0) && (
        <Kartu title="Perlu tindakan">
          <div className="space-y-3">
            {usulanMenunggu && (
              <button
                type="button"
                onClick={() => go(`/usulan/${usulanMenunggu.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-3 text-left hover:bg-emerald-50"
              >
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-emerald-950">Isian baru dari keluarga</span>
                  <span className="text-xs text-emerald-800/80">Periksa lalu terima atau tolak</span>
                </span>
              </button>
            )}
            {perluCek.length > 0 && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
                <h3 className="mb-2 text-sm font-semibold text-amber-950">Data lama perlu dicek</h3>
                <ul className="divide-y divide-amber-200/80">
                  {perluCek.map((f) => {
                    const def = defStandar(f.kunci);
                    return (
                      <li key={f.id} className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0">
                        <p className="min-w-0 flex-1 text-sm text-amber-950">
                          {def?.label ?? f.kunci}: <b>{labelNilaiFakta(def, f.nilai)}</b>
                        </p>
                        <button
                          type="button"
                          onClick={() => putuskan(f, true)}
                          className={`${tombolKecil} border-emerald-600 bg-emerald-600 text-white`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Benar
                        </button>
                        <button
                          type="button"
                          onClick={() => putuskan(f, false)}
                          className={`${tombolKecil} border-red-300 bg-white text-red-700`}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Salah
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </Kartu>
      )}

      {/* Anggota */}
      <Kartu
        title={`Anggota · ${d.anggota.length}`}
        action={
          <button
            type="button"
            onClick={() => setMode({ m: "anggota" })}
            className={`${tombolKecil} border-transparent text-white`}
            style={{ backgroundColor: HIJAU }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Tambah
          </button>
        }
      >
        {d.anggota.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada anggota. Tambahkan kepala keluarga terlebih dahulu.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {d.anggota.map((a) => (
              <div key={a.id} className="flex flex-col rounded-xl border border-border/80 bg-muted/20 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-foreground">
                      {a.nama}
                      {a.status !== "Aktif" && (
                        <span className="ml-1 text-xs font-normal text-red-700">({a.status})</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.kedudukan} · {a.jenisKelamin === "Laki-laki" ? "L" : a.jenisKelamin === "Perempuan" ? "P" : "—"} ·{" "}
                      {a.umur != null ? `${a.umur} th` : "umur ?"}
                      {a.nomorHp ? ` · ${a.nomorHp}` : ""}
                    </p>
                  </div>
                  {a.nomorHp && !a.nomorHpPerluCek && (
                    <a
                      href={toWaMeUrl(
                        a.nomorHp,
                        `Assalamu'alaikum, ${a.nama}. Kami dari pengurus RW 03 Padasuka.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`WhatsApp ${a.nama}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
                  <button
                    type="button"
                    onClick={() => setMode({ m: "dasar", a })}
                    className={`${tombolKecil} border-border bg-white text-foreground hover:border-emerald-400`}
                  >
                    <IdCard className="h-3.5 w-3.5" />
                    Ubah data
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode({ m: "orang", a })}
                    className={`${tombolKecil} border-border bg-white text-foreground hover:border-emerald-400`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Kondisi
                  </button>
                  <button
                    type="button"
                    onClick={() => setHapusOrang(a)}
                    className={`${tombolKecil} ml-auto border-red-200 bg-white text-red-700 hover:bg-red-50`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Kartu>

      {/* Kondisi rumah tangga */}
      <Kartu title="Kondisi rumah tangga">
        <button
          type="button"
          onClick={() => setMode({ m: "keluarga" })}
          className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 px-3 py-3 text-left transition-colors hover:bg-muted/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(163,55%,22%)]/10 text-[hsl(163,55%,22%)]">
            <Pencil className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Isi / perbarui kondisi keluarga</span>
            <span className="text-xs text-muted-foreground">Tempat tinggal, ekonomi, kerentanan, dan fakta standar</span>
          </span>
        </button>
        {d.rumah && (
          <p className="mt-2 text-xs text-muted-foreground">
            Terhubung rumah: {d.rumah.alamat}
            {d.rumah.noUnit ? ` No. ${d.rumah.noUnit}` : ""} · {d.rumah.jumlahKk} KK
          </p>
        )}
        {d.usaha.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Usaha terkait: {d.usaha.map((u) => u.nama).join(", ")}
          </p>
        )}
      </Kartu>

      {/* Administrasi */}
      <Kartu title="Administrasi">
        <p className="mb-3 text-xs text-muted-foreground">
          {d.qr
            ? `QR aktif · kode ${d.qr.kodeKartu} · berlaku sampai ${new Date(d.qr.berlakuSampai).toLocaleDateString("id-ID")}`
            : "QR kartu keluarga belum dibuat."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => go(`/cetak?kk=${d.kk.id}`)}
            className={`${tombolKecil} border-transparent text-white`}
            style={{ backgroundColor: HIJAU }}
          >
            <QrCode className="h-3.5 w-3.5" />
            Cetak QR
          </button>
          {d.qr && (
            <button
              type="button"
              onClick={() => setTanyaQr(true)}
              className={`${tombolKecil} border-border bg-white text-foreground`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Ganti QR
            </button>
          )}
          <button
            type="button"
            onClick={() => go(`/pindah?kk=${d.kk.id}`)}
            className={`${tombolKecil} border-border bg-white text-foreground`}
          >
            <Truck className="h-3.5 w-3.5" />
            Pindah RT
          </button>
        </div>
        <div className="mt-4 border-t border-border/60 pt-3">
          <button
            type="button"
            onClick={() => setHapusKk(true)}
            className={`${tombolKecil} border-red-200 bg-white text-red-700 hover:bg-red-50`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus kartu keluarga
          </button>
        </div>
      </Kartu>

      <AlertDialog open={hapusOrang != null} onOpenChange={(o) => { if (!o && !menghapus) setHapusOrang(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {hapusOrang?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              Data warga ini dihapus permanen dan tidak bisa dikembalikan. Bila warga pindah atau meninggal, lebih baik
              ubah statusnya lewat “Ubah data” agar riwayat tetap tercatat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={menghapus}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={menghapus}
              onClick={(e) => {
                e.preventDefault();
                lakukanHapusOrang();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
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
              Kartu keluarga beserta {d.anggota.length} anggotanya dan semua data terkait dihapus permanen. Tindakan ini
              tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={menghapus}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={menghapus}
              onClick={(e) => {
                e.preventDefault();
                lakukanHapusKk();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
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
