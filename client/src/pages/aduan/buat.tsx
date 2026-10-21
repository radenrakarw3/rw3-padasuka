import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, Copy, Loader2, ShieldCheck } from "lucide-react";
import { PublicKioskLayout } from "@/components/public-kiosk-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FormStepper } from "@/components/gov/form-stepper";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { ADUAN_ROUTES, IKON_KATEGORI, KartuMode, PilihFotoBukti } from "@/components/aduan/aduan-ui";
import {
  DAMPAK_ADUAN, DAMPAK_ADUAN_LABEL, FREKUENSI_ADUAN, FREKUENSI_ADUAN_LABEL, JENIS_TERADU, JENIS_TERADU_LABEL, KATEGORI_ADUAN,
  KATEGORI_ADUAN_INFO, MODE_IDENTITAS, MODE_IDENTITAS_INFO,
  type DampakAduan, type FrekuensiAduan, type JenisTeradu, type KategoriAduan, type ModeIdentitas,
} from "@shared/aduan";

type UsahaPublik = { nomor: string; namaUsaha: string; rt: number };
type Hasil = { nomor: string; kodeLacak: string; pin: string; prioritas: string };

const LANGKAH = [
  { id: "masalah", label: "Masalah" },
  { id: "lokasi", label: "Lokasi" },
  { id: "cerita", label: "Cerita" },
  { id: "identitas", label: "Identitas" },
  { id: "kirim", label: "Kirim" },
];

const KUNCI_DRAF = "aduan-draf:v1";
const TIDAK_DI_DAFTAR = "— Tidak ada di daftar —";
const hariIni = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

type Draf = {
  langkah: number;
  kategori: KategoriAduan | "";
  rtLokasi: number | null;
  lokasi: string;
  tanggal: string;
  frekuensi: FrekuensiAduan;
  dampak: DampakAduan;
  teraduJenis: JenisTeradu;
  teraduNama: string;
  teraduAlamat: string;
  usaha: string;
  judul: string;
  uraian: string;
  foto: string[];
  mode: ModeIdentitas;
  nama: string;
  wa: string;
  pelaporRt: number | null;
};

const kosong = (): Draf => ({
  langkah: 0, kategori: "", rtLokasi: null, lokasi: "", tanggal: hariIni(), frekuensi: "sekali", dampak: "mengganggu",
  teraduJenis: "tidak_tahu", teraduNama: "", teraduAlamat: "", usaha: TIDAK_DI_DAFTAR, judul: "", uraian: "", foto: [],
  mode: "rahasia", nama: "", wa: "", pelaporRt: null,
});

function bacaDraf(): Draf | null {
  try {
    const d = JSON.parse(localStorage.getItem(KUNCI_DRAF) ?? "null");
    return d && typeof d === "object" ? { ...kosong(), ...d } : null;
  } catch {
    return null;
  }
}

function simpanDraf(d: Draf) {
  try {
    localStorage.setItem(KUNCI_DRAF, JSON.stringify(d));
  } catch {
    try { localStorage.setItem(KUNCI_DRAF, JSON.stringify({ ...d, foto: [] })); } catch { /* penyimpanan penuh */ }
  }
}

function Pilihan<T extends string | number>({ nilai, pilihan, onPilih, kolom = 2 }: {
  nilai: T | null; pilihan: { nilai: T; label: string }[]; onPilih: (v: T) => void; kolom?: 1 | 2 | 3 | 5;
}) {
  return (
    <div className={cn("grid gap-2", kolom === 1 ? "grid-cols-1" : kolom === 3 ? "grid-cols-3" : kolom === 5 ? "grid-cols-5" : "grid-cols-2")}>
      {pilihan.map((p) => (
        <button key={String(p.nilai)} type="button" aria-pressed={nilai === p.nilai} onClick={() => onPilih(p.nilai)}
          className={cn("min-h-12 rounded-xl border-2 px-3 py-2 text-base font-medium transition-colors", kolom >= 3 ? "text-center" : "text-left",
            nilai === p.nilai ? "border-brand bg-brand text-white" : "border-border bg-card hover:border-brand/40")}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function Bidang({ label, bantuan, children }: { label: string; bantuan?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">{label}</Label>
      {bantuan && <p className="-mt-1 text-sm text-muted-foreground">{bantuan}</p>}
      {children}
    </div>
  );
}

export default function AduanBuat() {
  const { toast } = useToast();
  const search = useSearch();
  const [d, setD] = useState<Draf>(() => {
    const awal = bacaDraf() ?? kosong();
    const k = new URLSearchParams(search).get("kategori");
    if (k && (KATEGORI_ADUAN as readonly string[]).includes(k) && !awal.kategori) {
      return { ...awal, kategori: k as KategoriAduan, teraduJenis: k === "usaha" ? "usaha" : awal.teraduJenis };
    }
    return awal;
  });
  const [setuju, setSetuju] = useState(false);
  const [website, setWebsite] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const ubah = (p: Partial<Draf>) => setD((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (hasil) return;
    const t = window.setTimeout(() => simpanDraf(d), 300);
    return () => window.clearTimeout(t);
  }, [d, hasil]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [d.langkah, hasil]);

  const { data: opsi } = useQuery<{ usaha: UsahaPublik[] }>({
    queryKey: ["/api/public/aduan/opsi"],
    queryFn: async () => readJsonSafely(await apiRequest("GET", "/api/public/aduan/opsi")),
    staleTime: 5 * 60_000,
  });
  const labelUsaha = (u: UsahaPublik) => `${u.namaUsaha} — RT ${String(u.rt).padStart(2, "0")}`;
  const opsiUsaha = useMemo(() => [TIDAK_DI_DAFTAR, ...(opsi?.usaha ?? []).map(labelUsaha)], [opsi]);
  const usahaDipilih = (opsi?.usaha ?? []).find((u) => labelUsaha(u) === d.usaha) ?? null;

  const kirim = useMutation({
    mutationFn: async () =>
      readJsonSafely<Hasil>(await apiRequest("POST", "/api/public/aduan", {
        kategori: d.kategori,
        judul: d.judul.trim(),
        uraian: d.uraian.trim(),
        lokasi: d.lokasi.trim() || null,
        rtLokasi: d.rtLokasi,
        tanggalKejadian: d.tanggal || null,
        frekuensi: d.frekuensi,
        dampak: d.dampak,
        teraduJenis: d.teraduJenis,
        teraduNama: d.teraduJenis === "usaha" && usahaDipilih ? null : d.teraduNama.trim() || null,
        teraduAlamat: d.teraduAlamat.trim() || null,
        nomorUsaha: d.teraduJenis === "usaha" ? usahaDipilih?.nomor ?? null : null,
        mode: d.mode,
        pelaporNama: d.mode === "anonim" ? null : d.nama.trim(),
        pelaporWa: d.mode === "anonim" ? null : d.wa.trim(),
        pelaporRt: d.mode === "anonim" ? null : d.pelaporRt,
        foto: d.foto,
        setuju: true,
        website,
      })),
    onSuccess: (h) => {
      setHasil(h);
      try { localStorage.removeItem(KUNCI_DRAF); } catch { /* abaikan */ }
    },
    onError: (e: unknown) => {
      const pesan = getApiErrorMessage(e);
      setGalat(pesan);
      toast({ title: "Aduan belum terkirim", description: pesan, variant: "destructive" });
    },
  });

  const cek = (): string | null => {
    switch (d.langkah) {
      case 0: return d.kategori ? null : "Pilih jenis masalahnya dulu";
      case 1:
        if (d.teraduJenis === "usaha" && !usahaDipilih && d.teraduNama.trim().length < 2) return "Pilih usaha dari daftar atau tulis nama usahanya";
        return null;
      case 2:
        if (d.judul.trim().length < 5) return "Tulis judul singkat minimal 5 huruf";
        if (d.uraian.trim().length < 15) return "Ceritakan kejadiannya minimal 15 huruf";
        return null;
      case 3:
        if (d.mode === "anonim") return null;
        if (d.nama.trim().length < 2) return "Isi nama Anda (tetap dirahasiakan)";
        if (d.wa.replace(/\D/g, "").length < 10) return "Isi nomor WhatsApp yang aktif";
        return null;
      default: return null;
    }
  };

  const lanjut = () => {
    const g = cek();
    setGalat(g);
    if (!g) ubah({ langkah: Math.min(LANGKAH.length - 1, d.langkah + 1) });
  };
  const kembali = () => { setGalat(null); ubah({ langkah: Math.max(0, d.langkah - 1) }); };

  if (hasil) return <LayarSukses hasil={hasil} mode={d.mode} />;

  const infoKat = d.kategori ? KATEGORI_ADUAN_INFO[d.kategori] : null;

  return (
    <PublicKioskLayout title="Buat aduan" backHref={ADUAN_ROUTES.beranda}>
      <div className="space-y-5 pb-4">
        <FormStepper steps={LANGKAH} currentStep={d.langkah} />

        {d.langkah === 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold">Apa masalahnya?</h2>
            <div className="grid grid-cols-2 gap-2">
              {KATEGORI_ADUAN.map((k) => {
                const Ikon = IKON_KATEGORI[k];
                const aktif = d.kategori === k;
                return (
                  <button key={k} type="button" aria-pressed={aktif}
                    onClick={() => ubah({ kategori: k, teraduJenis: k === "usaha" ? "usaha" : k === "kost" ? "warga_singgah" : d.teraduJenis === "usaha" ? "tidak_tahu" : d.teraduJenis })}
                    className={cn("flex min-h-[104px] flex-col items-start gap-2 rounded-2xl border-2 p-3 text-left transition-all",
                      aktif ? "border-brand bg-brand text-white shadow-lg" : "border-border bg-card hover:border-brand/40")}>
                    <Ikon className={cn("h-7 w-7", aktif ? "text-[hsl(40,58%,72%)]" : "text-brand")} aria-hidden />
                    <span className="text-base font-bold leading-tight">{KATEGORI_ADUAN_INFO[k].label}</span>
                  </button>
                );
              })}
            </div>
            {infoKat && <p className="rounded-xl bg-muted p-3 text-sm">Contoh: {infoKat.contoh}.</p>}
          </section>
        )}

        {d.langkah === 1 && (
          <section className="space-y-5">
            <h2 className="text-xl font-bold">Di mana dan siapa?</h2>
            <Bidang label="Di RT berapa kejadiannya?">
              <Pilihan kolom={5} nilai={d.rtLokasi ?? 0} onPilih={(v) => ubah({ rtLokasi: v === 0 ? null : v })}
                pilihan={[{ nilai: 1, label: "01" }, { nilai: 2, label: "02" }, { nilai: 3, label: "03" }, { nilai: 4, label: "04" }, { nilai: 0, label: "?" }]} />
            </Bidang>
            <Bidang label="Lokasi persisnya" bantuan="Nama jalan/gang, patokan. Boleh dikosongkan.">
              <Input className="h-12 text-base" value={d.lokasi} maxLength={300} onChange={(e) => ubah({ lokasi: e.target.value })} placeholder="Contoh: Gg. Melati depan masjid" />
            </Bidang>
            <Bidang label="Kapan terjadi?">
              <Input type="date" className="h-12 text-base" value={d.tanggal} max={hariIni()} onChange={(e) => ubah({ tanggal: e.target.value })} />
            </Bidang>
            <Bidang label="Seberapa sering?">
              <Pilihan kolom={1} nilai={d.frekuensi} onPilih={(v) => ubah({ frekuensi: v })}
                pilihan={FREKUENSI_ADUAN.map((f) => ({ nilai: f, label: FREKUENSI_ADUAN_LABEL[f] }))} />
            </Bidang>
            <Bidang label="Dampaknya?">
              <Pilihan kolom={1} nilai={d.dampak} onPilih={(v) => ubah({ dampak: v })}
                pilihan={DAMPAK_ADUAN.map((x) => ({ nilai: x, label: DAMPAK_ADUAN_LABEL[x] }))} />
            </Bidang>
            <Bidang label="Siapa yang diadukan?" bantuan="Boleh 'Belum tahu'. Pengurus RW yang akan memastikan.">
              <Pilihan kolom={1} nilai={d.teraduJenis} onPilih={(v) => ubah({ teraduJenis: v })}
                pilihan={JENIS_TERADU.map((j) => ({ nilai: j, label: JENIS_TERADU_LABEL[j] }))} />
            </Bidang>
            {d.teraduJenis === "usaha" && (
              <Bidang label="Usaha yang mana?">
                <SearchableSelect value={d.usaha} onValueChange={(v) => ubah({ usaha: v })} options={opsiUsaha}
                  placeholder="Pilih usaha" searchPlaceholder="Cari nama usaha…" triggerClassName="h-12" />
              </Bidang>
            )}
            {d.teraduJenis !== "tidak_tahu" && !(d.teraduJenis === "usaha" && usahaDipilih) && (
              <>
                <Bidang label={d.teraduJenis === "usaha" ? "Nama usaha" : "Nama / sebutan pihak yang diadukan"} bantuan="Bila tidak tahu nama, tulis ciri yang jelas.">
                  <Input className="h-12 text-base" value={d.teraduNama} maxLength={150} onChange={(e) => ubah({ teraduNama: e.target.value })}
                    placeholder={d.teraduJenis === "usaha" ? "Contoh: Warung Bakso Pak Dedi" : "Contoh: Penghuni rumah cat biru no. 12"} />
                </Bidang>
                <Bidang label="Alamat / rumah (opsional)">
                  <Input className="h-12 text-base" value={d.teraduAlamat} maxLength={300} onChange={(e) => ubah({ teraduAlamat: e.target.value })} />
                </Bidang>
              </>
            )}
          </section>
        )}

        {d.langkah === 2 && (
          <section className="space-y-5">
            <h2 className="text-xl font-bold">Ceritakan kejadiannya</h2>
            <Bidang label="Judul singkat">
              <Input className="h-12 text-base" value={d.judul} maxLength={120} onChange={(e) => ubah({ judul: e.target.value })} placeholder="Contoh: Musik keras setiap malam di atas jam 11" />
            </Bidang>
            <Bidang label="Ceritakan apa yang terjadi" bantuan="Tulis fakta yang Anda lihat/dengar: apa, kapan, berapa lama. Jangan tulis nama Anda bila memilih rahasia/anonim.">
              <Textarea rows={6} className="text-base" value={d.uraian} maxLength={3000} onChange={(e) => ubah({ uraian: e.target.value })} />
              <p className="text-right text-xs text-muted-foreground">{d.uraian.length}/3000</p>
            </Bidang>
            <Bidang label="Foto bukti (sangat membantu)">
              <PilihFotoBukti foto={d.foto} onChange={(foto) => ubah({ foto })} />
            </Bidang>
          </section>
        )}

        {d.langkah === 3 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Bagaimana identitas Anda dijaga?</h2>
            {MODE_IDENTITAS.map((m) => (
              <KartuMode key={m} mode={m} aktif={d.mode === m} rekomendasi={m === "rahasia"} onPilih={() => ubah({ mode: m })} />
            ))}
            {d.mode !== "anonim" && (
              <div className="space-y-4 rounded-2xl border-2 border-brand/20 bg-brand/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand">
                  <ShieldCheck className="h-4 w-4" />
                  {d.mode === "rahasia" ? "Disimpan terenkripsi — hanya Ketua RW yang dapat membuka" : "Anda bersedia diketahui pihak yang diadukan"}
                </p>
                <Bidang label="Nama Anda">
                  <Input className="h-12 bg-background text-base" value={d.nama} maxLength={120} autoComplete="name" onChange={(e) => ubah({ nama: e.target.value })} />
                </Bidang>
                <Bidang label="Nomor WhatsApp">
                  <Input className="h-12 bg-background text-base" type="tel" inputMode="tel" value={d.wa} maxLength={20} autoComplete="tel"
                    onChange={(e) => ubah({ wa: e.target.value.replace(/[^\d+\s-]/g, "") })} placeholder="08xxxxxxxxxx" />
                </Bidang>
                <Bidang label="Anda warga RT berapa? (opsional)">
                  <Pilihan kolom={5} nilai={d.pelaporRt ?? 0} onPilih={(v) => ubah({ pelaporRt: v === 0 ? null : v })}
                    pilihan={[{ nilai: 1, label: "01" }, { nilai: 2, label: "02" }, { nilai: 3, label: "03" }, { nilai: 4, label: "04" }, { nilai: 0, label: "Lain" }]} />
                </Bidang>
              </div>
            )}
          </section>
        )}

        {d.langkah === 4 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Periksa lalu kirim</h2>
            <div className="divide-y rounded-2xl border bg-card">
              {[
                ["Masalah", infoKat?.label ?? "-"],
                ["Judul", d.judul],
                ["Lokasi", [d.rtLokasi ? `RT ${String(d.rtLokasi).padStart(2, "0")}` : null, d.lokasi].filter(Boolean).join(" · ") || "-"],
                ["Yang diadukan", d.teraduJenis === "usaha" && usahaDipilih ? usahaDipilih.namaUsaha : d.teraduNama || JENIS_TERADU_LABEL[d.teraduJenis]],
                ["Seberapa sering", FREKUENSI_ADUAN_LABEL[d.frekuensi]],
                ["Dampak", DAMPAK_ADUAN_LABEL[d.dampak]],
                ["Foto bukti", `${d.foto.length} foto`],
                ["Identitas", MODE_IDENTITAS_INFO[d.mode].label],
              ].map(([a, b]) => (
                <div key={a} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{a}</span>
                  <span className="text-right font-semibold">{b}</span>
                </div>
              ))}
            </div>
            <p className="whitespace-pre-wrap rounded-2xl bg-muted p-4 text-sm">{d.uraian}</p>
            <label className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
              <Checkbox checked={setuju} onCheckedChange={(c) => setSetuju(Boolean(c))} className="mt-0.5" />
              <span>Saya menyatakan aduan ini <b>benar sesuai yang saya ketahui</b>, bukan fitnah. Saya paham aduan yang tidak benar akan ditolak.</span>
            </label>
            <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)}
              className="absolute -left-[9999px] h-0 w-0 opacity-0" aria-hidden />
          </section>
        )}

        {galat && <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{galat}</p>}

        <div className="sticky bottom-0 -mx-4 flex gap-2 border-t bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
          {d.langkah > 0 ? (
            <Button variant="outline" className="h-12 px-4" onClick={kembali}><ChevronLeft className="h-5 w-5" /></Button>
          ) : (
            <Link href={ADUAN_ROUTES.beranda}><Button variant="outline" className="h-12 px-4"><ChevronLeft className="h-5 w-5" /></Button></Link>
          )}
          {d.langkah < LANGKAH.length - 1 ? (
            <Button className="h-12 flex-1 text-base" onClick={lanjut}>Lanjut <ChevronRight className="ml-1 h-5 w-5" /></Button>
          ) : (
            <Button className="h-12 flex-1 text-base" disabled={!setuju || kirim.isPending} onClick={() => { setGalat(null); kirim.mutate(); }}>
              {kirim.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Kirim aduan"}
            </Button>
          )}
        </div>
      </div>
    </PublicKioskLayout>
  );
}

function LayarSukses({ hasil, mode }: { hasil: Hasil; mode: ModeIdentitas }) {
  const [tersalin, setTersalin] = useState(false);
  const teks = `Aduan RW 03 ${hasil.nomor}\nKode lacak: ${hasil.kodeLacak}\nPIN: ${hasil.pin}\n${window.location.origin}${ADUAN_ROUTES.lacak}?kode=${hasil.kodeLacak}`;
  return (
    <PublicKioskLayout title="Aduan terkirim" backHref={ADUAN_ROUTES.beranda}>
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600" />
          <h1 className="text-2xl font-bold">Aduan Anda sudah diterima</h1>
          <p className="text-muted-foreground">Nomor aduan <b className="text-foreground">{hasil.nomor}</b></p>
        </div>
        <div className="rounded-2xl border-2 border-brand bg-card p-5 text-center shadow-lg">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Kode lacak</p>
          <p className="font-mono text-4xl font-extrabold tracking-[0.2em] text-brand">{hasil.kodeLacak}</p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">PIN</p>
          <p className="font-mono text-4xl font-extrabold tracking-[0.3em]">{hasil.pin}</p>
        </div>
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <b>Foto layar (screenshot) halaman ini sekarang.</b> Kode dan PIN hanya ditampilkan sekali dan dibutuhkan untuk mengikuti perkembangan aduan.
          {mode === "anonim" && " Karena Anda memilih anonim, pengurus RW tidak bisa menghubungi Anda — kode ini satu-satunya jalan untuk memantau."}
        </div>
        <div className="grid gap-2">
          <Button variant="outline" className="h-12 gap-2 text-base" onClick={() => { void navigator.clipboard?.writeText(teks).then(() => setTersalin(true)); }}>
            <Copy className="h-5 w-5" /> {tersalin ? "Tersalin" : "Salin kode & PIN"}
          </Button>
          <Link href={`${ADUAN_ROUTES.lacak}?kode=${hasil.kodeLacak}`}>
            <Button className="h-12 w-full text-base">Lacak aduan ini</Button>
          </Link>
        </div>
      </div>
    </PublicKioskLayout>
  );
}
