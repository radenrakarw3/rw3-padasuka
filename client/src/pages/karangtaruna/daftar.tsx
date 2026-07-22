import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { KarangtarunaShell } from "@/components/karangtaruna-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { SuccessPanel } from "@/components/gov/success-panel";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Loader2, User, Sparkles, HeartHandshake } from "lucide-react";

import {
  KARANGTARUNA_BIDANG_KEAHLIAN,
  KARANGTARUNA_BIDANG_MINAT,
  KARANGTARUNA_PENDIDIKAN,
  KARANGTARUNA_RT_NUMBERS,
  KARANGTARUNA_STATUS_AKTIVITAS,
  KARANGTARUNA_KETERSEDIAAN,
  isKarangtarunaRt,
} from "@shared/karangtaruna";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

const selectClass =
  "flex h-11 w-full items-center rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring";

function SectionTitle({ icon: Icon, title, desc }: { icon: typeof User; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-2 pt-2">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-brand">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

function TagPicker({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "border-brand bg-brand text-brand-foreground shadow-sm"
                : "border-border bg-muted/40 text-muted-foreground hover:border-brand/40 hover:text-foreground",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function KarangtarunaDaftar() {
  const { toast } = useToast();

  const [namaLengkap, setNamaLengkap] = useState("");
  const [nik, setNik] = useState("");
  const [rt, setRt] = useState("");
  const [alamat, setAlamat] = useState("");
  const [nomorWhatsapp, setNomorWhatsapp] = useState("");
  const [jenisKelamin, setJenisKelamin] = useState("");
  const [tanggalLahir, setTanggalLahir] = useState("");
  const [pendidikanTerakhir, setPendidikanTerakhir] = useState("");
  const [statusAktivitas, setStatusAktivitas] = useState("");
  const [pekerjaan, setPekerjaan] = useState("");
  const [instagram, setInstagram] = useState("");

  const [bidangKeahlian, setBidangKeahlian] = useState<string[]>([]);
  const [ceritaSkill, setCeritaSkill] = useState("");
  const [pengalamanOrganisasi, setPengalamanOrganisasi] = useState("");
  const [prestasi, setPrestasi] = useState("");

  const [bidangMinat, setBidangMinat] = useState<string[]>([]);
  const [harapanFasilitasi, setHarapanFasilitasi] = useState("");
  const [ketersediaanWaktu, setKetersediaanWaktu] = useState("");
  const [bersediaAktif, setBersediaAktif] = useState(true);
  const [setuju, setSetuju] = useState(false);

  const [nomorHasil, setNomorHasil] = useState<string | null>(null);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (v: string) =>
    setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const mutation = useMutation({
    mutationFn: async () => {
      const rtNum = parseInt(rt, 10);
      if (!isKarangtarunaRt(rtNum)) {
        throw new Error("Pilih RT 01–07");
      }
      const res = await apiRequest("POST", "/api/public/karangtaruna/daftar", {
        namaLengkap: namaLengkap.trim(),
        nik: nik.trim() || null,
        rt: rtNum,
        alamat: alamat.trim(),
        nomorWhatsapp: nomorWhatsapp.trim(),
        jenisKelamin: jenisKelamin || null,
        tanggalLahir,
        pendidikanTerakhir: pendidikanTerakhir || null,
        statusAktivitas: statusAktivitas || null,
        pekerjaan: pekerjaan.trim() || null,
        instagram: instagram.trim() || null,
        bidangKeahlian,
        ceritaSkill: ceritaSkill.trim(),
        pengalamanOrganisasi: pengalamanOrganisasi.trim() || null,
        prestasi: prestasi.trim() || null,
        bidangMinat,
        harapanFasilitasi: harapanFasilitasi.trim(),
        ketersediaanWaktu: ketersediaanWaktu || null,
        bersediaAktif,
        setuju: true as const,
      });
      const data = await readJsonSafely<{ nomorAnggota?: string; status?: string }>(res);
      if (!data?.nomorAnggota?.trim()) {
        throw new Error("Server tidak mengembalikan nomor anggota");
      }
      return data;
    },
    onSuccess: (data) => setNomorHasil(data.nomorAnggota!),
    onError: (e: unknown) =>
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const missing: string[] = [];
  const rtNum = parseInt(rt, 10);
  if (namaLengkap.trim().length < 2) missing.push("nama lengkap");
  if (!isKarangtarunaRt(rtNum)) missing.push("RT (01–07)");
  if (alamat.trim().length < 5) missing.push("alamat");
  if (nomorWhatsapp.trim().length < 8) missing.push("nomor WhatsApp");
  if (!tanggalLahir) missing.push("tanggal lahir");
  if (bidangKeahlian.length === 0) missing.push("bidang keahlian");
  if (ceritaSkill.trim().length < 10) missing.push("cerita skill");
  if (bidangMinat.length === 0) missing.push("bidang minat");
  if (harapanFasilitasi.trim().length < 10) missing.push("harapan difasilitasi");
  const canSubmit = missing.length === 0 && setuju;

  if (nomorHasil) {
    return (
      <KarangtarunaShell title="Pendaftaran terkirim">
        <SuccessPanel
          title="Pendaftaran Karang Taruna berhasil!"
          referenceLabel="Nomor anggota kamu"
          referenceValue={nomorHasil}
          nextSteps={[
            "Simpan nomor anggota untuk cek status.",
            "Pengurus RW akan meninjau skill & potensimu.",
            "Info kegiatan akan dikirim lewat WhatsApp.",
          ]}
          primaryAction={{ label: "Cek status", href: KARANGTARUNA_ROUTES.status }}
          secondaryAction={{ label: "Kembali ke beranda", href: "/" }}
        />
      </KarangtarunaShell>
    );
  }

  return (
    <KarangtarunaShell title="Daftar Karang Taruna">
      <div className="space-y-5">
        <FeatureExplain title="Isi selengkap & sejujur mungkin">
          <p>
            Data ini membantu RW 03 mengenali <strong>potensi nyata</strong> setiap pemuda dan
            menyalurkannya ke kegiatan yang tepat. Tanda <span className="text-destructive">*</span>{" "}
            wajib diisi.
          </p>
        </FeatureExplain>

        {/* --- Identitas --- */}
        <SectionTitle icon={User} title="Data diri" desc="Identitas anggota" />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nama">Nama lengkap <span className="text-destructive">*</span></Label>
            <Input id="nama" value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} placeholder="Nama sesuai KTP/KK" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rt">RT <span className="text-destructive">*</span></Label>
              <select id="rt" value={rt} onChange={(e) => setRt(e.target.value)} className={selectClass}>
                <option value="">Pilih RT</option>
                {KARANGTARUNA_RT_NUMBERS.map((n) => (
                  <option key={n} value={n}>RT {String(n).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jk">Jenis kelamin</Label>
              <select id="jk" value={jenisKelamin} onChange={(e) => setJenisKelamin(e.target.value)} className={selectClass}>
                <option value="">Pilih</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alamat">Alamat lengkap <span className="text-destructive">*</span></Label>
            <Textarea id="alamat" value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={2} placeholder="Nama jalan, nomor rumah, patokan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wa">No. WhatsApp <span className="text-destructive">*</span></Label>
              <Input id="wa" value={nomorWhatsapp} onChange={(e) => setNomorWhatsapp(e.target.value)} placeholder="0812xxxx" inputMode="tel" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lahir">Tanggal lahir <span className="text-destructive">*</span></Label>
              <Input id="lahir" type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nik">NIK (opsional)</Label>
            <Input id="nik" value={nik} onChange={(e) => setNik(e.target.value)} placeholder="16 digit" inputMode="numeric" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pendidikan">Pendidikan</Label>
              <select id="pendidikan" value={pendidikanTerakhir} onChange={(e) => setPendidikanTerakhir(e.target.value)} className={selectClass}>
                <option value="">Pilih</option>
                {KARANGTARUNA_PENDIDIKAN.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status saat ini</Label>
              <select id="status" value={statusAktivitas} onChange={(e) => setStatusAktivitas(e.target.value)} className={selectClass}>
                <option value="">Pilih</option>
                {KARANGTARUNA_STATUS_AKTIVITAS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pekerjaan">Pekerjaan / sekolah / kampus (opsional)</Label>
            <Input id="pekerjaan" value={pekerjaan} onChange={(e) => setPekerjaan(e.target.value)} placeholder="Contoh: Mahasiswa Telkom / Barista" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ig">Instagram / medsos (opsional)</Label>
            <Input id="ig" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" />
          </div>
        </div>

        {/* --- Skill & potensi --- */}
        <SectionTitle icon={Sparkles} title="Skill & potensi" desc="Ceritakan kemampuanmu" />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Bidang keahlian <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground">Pilih satu atau lebih yang sesuai.</p>
            <TagPicker options={KARANGTARUNA_BIDANG_KEAHLIAN} selected={bidangKeahlian} onToggle={toggle(setBidangKeahlian)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cerita">Ceritakan skill / potensimu <span className="text-destructive">*</span></Label>
            <Textarea
              id="cerita"
              value={ceritaSkill}
              onChange={(e) => setCeritaSkill(e.target.value)}
              rows={4}
              placeholder="Contoh: Saya bisa desain poster & edit video, sering bantu bikin konten. Ingin belajar lebih dalam soal branding UMKM."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organisasi">Pengalaman organisasi (opsional)</Label>
            <Textarea id="organisasi" value={pengalamanOrganisasi} onChange={(e) => setPengalamanOrganisasi(e.target.value)} rows={2} placeholder="OSIS, komunitas, kepanitiaan, dll" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prestasi">Prestasi (opsional)</Label>
            <Textarea id="prestasi" value={prestasi} onChange={(e) => setPrestasi(e.target.value)} rows={2} placeholder="Juara lomba, sertifikat, karya, dll" />
          </div>
        </div>

        {/* --- Minat & fasilitasi --- */}
        <SectionTitle icon={HeartHandshake} title="Minat & harapan" desc="Ingin difasilitasi apa oleh RW 03?" />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Bidang kegiatan yang diminati <span className="text-destructive">*</span></Label>
            <TagPicker options={KARANGTARUNA_BIDANG_MINAT} selected={bidangMinat} onToggle={toggle(setBidangMinat)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="harapan">Harapan difasilitasi RW 03 <span className="text-destructive">*</span></Label>
            <Textarea
              id="harapan"
              value={harapanFasilitasi}
              onChange={(e) => setHarapanFasilitasi(e.target.value)}
              rows={3}
              placeholder="Contoh: Ingin ada pelatihan digital marketing, atau wadah untuk tim futsal pemuda RW."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ketersediaan">Ketersediaan waktu</Label>
            <select id="ketersediaan" value={ketersediaanWaktu} onChange={(e) => setKetersediaanWaktu(e.target.value)} className={selectClass}>
              <option value="">Pilih</option>
              {KARANGTARUNA_KETERSEDIAAN.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer">
            <Checkbox checked={bersediaAktif} onCheckedChange={(v) => setBersediaAktif(v === true)} className="mt-0.5" />
            <span className="text-sm">Saya bersedia aktif ikut kegiatan Karang Taruna RW 03.</span>
          </label>
        </div>

        {/* --- Persetujuan & submit --- */}
        <label className="flex items-start gap-2.5 rounded-lg border border-brand/25 bg-brand/5 p-3 cursor-pointer">
          <Checkbox checked={setuju} onCheckedChange={(v) => setSetuju(v === true)} className="mt-0.5" />
          <span className="text-sm">
            Data yang saya isi benar dan saya setuju digunakan RW 03 untuk pembinaan pemuda.{" "}
            <span className="text-destructive">*</span>
          </span>
        </label>

        {missing.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Masih perlu dilengkapi: <span className="text-destructive">{missing.join(", ")}</span>.
          </p>
        )}

        <Button
          className="w-full touch-target"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim pendaftaran"}
        </Button>
      </div>
    </KarangtarunaShell>
  );
}
