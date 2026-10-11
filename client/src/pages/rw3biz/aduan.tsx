import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { Rw3bizShell } from "@/components/rw3biz-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { JENIS_PELANGGARAN, JENIS_PELANGGARAN_INFO, type JenisPelanggaran } from "@shared/rw3biz-kontribusi";

type UsahaPublik = { nomor: string; namaUsaha: string; rt: number };

const TIDAK_ADA = "— Tidak ada di daftar / belum tahu namanya —";

const hariIni = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Kesesuaian data usaha hanya bisa dinilai petugas dari survey. */
const JENIS_ADUAN = JENIS_PELANGGARAN.filter((j) => j !== "data_tidak_sesuai");

export default function Rw3bizAduan() {
  const { toast } = useToast();
  const [usahaLabel, setUsahaLabel] = useState(TIDAK_ADA);
  const [namaUsahaLain, setNamaUsahaLain] = useState("");
  const [jenis, setJenis] = useState<JenisPelanggaran>("sampah_tercecer");
  const [tanggal, setTanggal] = useState(hariIni());
  const [lokasi, setLokasi] = useState("");
  const [uraian, setUraian] = useState("");
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [rt, setRt] = useState("");
  const [foto, setFoto] = useState("");
  const [hasil, setHasil] = useState<{ nomorAduan: string; namaUsaha: string | null } | null>(null);

  const { data: usahaList = [] } = useQuery<UsahaPublik[]>({
    queryKey: ["/api/public/rw3biz/usaha"],
    queryFn: async () => {
      const res = await fetch("/api/public/rw3biz/usaha");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  const label = (u: UsahaPublik) => `${u.namaUsaha} — RT 0${u.rt} (${u.nomor})`;
  const opsi = useMemo(() => [TIDAK_ADA, ...usahaList.map(label)], [usahaList]);
  const dipilih = usahaList.find((u) => label(u) === usahaLabel) ?? null;

  const kirim = useMutation({
    mutationFn: async () =>
      readJsonSafely<{ nomorAduan: string; namaUsaha: string | null }>(
        await apiRequest("POST", "/api/public/rw3biz/aduan", {
          nomorUsaha: dipilih?.nomor ?? null,
          namaUsahaLain: dipilih ? null : namaUsahaLain || null,
          jenis,
          tanggalKejadian: tanggal,
          lokasi: lokasi || null,
          uraian,
          pelaporNama: nama,
          pelaporWa: wa,
          pelaporRt: rt ? Number(rt) : null,
          foto: foto || null,
        }),
      ),
    onSuccess: setHasil,
    onError: (e: unknown) => toast({ title: "Gagal mengirim", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  const pilihFoto = async (file?: File) => {
    if (!file) return;
    try {
      setFoto(await compressImageToDataUrl(file, { maxSide: 1280, quality: 0.7 }));
    } catch {
      toast({ title: "Foto gagal dibaca", variant: "destructive" });
    }
  };

  const siap =
    (dipilih || namaUsahaLain.trim().length >= 2) &&
    uraian.trim().length >= 15 &&
    nama.trim().length >= 2 &&
    wa.replace(/\D/g, "").length >= 9;

  if (hasil) {
    return (
      <Rw3bizShell title="Aduan terkirim" backHref={RW3BIZ_ROUTES.hub}>
        <div className="space-y-4 rounded-xl border bg-card p-5 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
          <p className="font-mono text-lg font-bold">{hasil.nomorAduan}</p>
          <p className="text-sm text-muted-foreground">
            Terima kasih. Aduan {hasil.namaUsaha ? `tentang ${hasil.namaUsaha} ` : ""}akan dicek pengurus RW 03 ke lokasi. Bila terbukti,
            usaha diberi teguran / denda sesuai aturan. Identitas Anda dirahasiakan — tidak diberitahukan ke pemilik usaha.
          </p>
          <Button variant="outline" className="w-full" onClick={() => window.location.assign(RW3BIZ_ROUTES.hub)}>
            Kembali
          </Button>
        </div>
      </Rw3bizShell>
    );
  }

  return (
    <Rw3bizShell title="Adukan usaha" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-4">
        <FeatureExplain title="Kapan mengadu?">
          <p>
            Bila usaha di RW 03 mengganggu warga: sampah tercecer, bising, parkir menutup jalan, limbah/bau, buka di luar jam, merusak
            jalan/fasilitas umum, dan sejenisnya.
          </p>
          <p>
            Pengurus memverifikasi dulu ke lokasi. Pelanggaran pertama yang ringan/sedang biasanya teguran tertulis; berulang atau berat
            dikenai denda yang masuk Kas RW 03. <strong>Identitas pelapor dirahasiakan.</strong>
          </p>
        </FeatureExplain>

        <div className="space-y-1">
          <Label>Usaha yang diadukan</Label>
          <SearchableSelect value={usahaLabel} onValueChange={setUsahaLabel} options={opsi} searchPlaceholder="Cari nama usaha" />
        </div>
        {!dipilih && (
          <div className="space-y-1">
            <Label>Nama / ciri usaha *</Label>
            <Input value={namaUsahaLain} onChange={(e) => setNamaUsahaLain(e.target.value)} placeholder="Contoh: bengkel las sebelah masjid" />
          </div>
        )}

        <div className="space-y-1">
          <Label>Jenis masalah</Label>
          <Select value={jenis} onValueChange={(v) => setJenis(v as JenisPelanggaran)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {JENIS_ADUAN.map((j) => (
                <SelectItem key={j} value={j}>{JENIS_PELANGGARAN_INFO[j].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">{JENIS_PELANGGARAN_INFO[jenis].contoh}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Tanggal kejadian</Label>
            <Input type="date" value={tanggal} max={hariIni()} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Lokasi</Label>
            <Input value={lokasi} onChange={(e) => setLokasi(e.target.value)} placeholder="Gang / patokan" />
          </div>
        </div>

        <div className="space-y-1">
          <Label>Ceritakan kejadiannya *</Label>
          <Textarea rows={4} value={uraian} onChange={(e) => setUraian(e.target.value)} maxLength={2000} placeholder="Apa yang terjadi, sejak kapan, dampaknya ke warga" />
        </div>

        <div className="space-y-1">
          <Label>Foto (opsional, sangat membantu)</Label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" capture="environment" onChange={(e) => pilihFoto(e.target.files?.[0])} />
            {foto && (
              <>
                <img src={foto} alt="Foto aduan" className="h-10 w-10 rounded object-cover" />
                <Button size="icon" variant="ghost" onClick={() => setFoto("")} aria-label="Hapus foto">
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <p className="text-sm font-semibold">Data pelapor (dirahasiakan)</p>
          <div className="space-y-1">
            <Label>Nama *</Label>
            <Input value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>WhatsApp *</Label>
              <Input type="tel" inputMode="tel" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="space-y-1">
              <Label>RT</Label>
              <Select value={rt} onValueChange={setRt}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={String(n)}>RT 0{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Dipakai pengurus untuk konfirmasi bila perlu. Tidak ditampilkan ke usaha maupun publik.</p>
        </div>

        <Button className="w-full touch-target" disabled={!siap || kirim.isPending} onClick={() => kirim.mutate()}>
          {kirim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim aduan"}
        </Button>
      </div>
    </Rw3bizShell>
  );
}
