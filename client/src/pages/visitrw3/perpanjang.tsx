import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { FeatureExplain } from "@/components/gov/feature-explain";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";

const TERMIN_OPTIONS = [
  { value: "1", label: "Bulanan (1 bulan)" },
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "1 tahun" },
];

export default function Visitrw3Perpanjang() {
  const { toast } = useToast();
  const [nomorLama, setNomorLama] = useState("");
  const [tanggalBayar, setTanggalBayar] = useState("");
  const [terminBulan, setTerminBulan] = useState("3");
  const [previewSampai, setPreviewSampai] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [keperluan, setKeperluan] = useState<"tinggal" | "bisnis" | "">("");
  const [result, setResult] = useState<{ nomorVisitrw3: string; nomorLama: string } | null>(null);

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/public/visitrw3/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/visitrw3/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string; updatedAt?: string }[]>(res);
    },
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  useEffect(() => {
    const nomor = nomorLama.trim().toUpperCase();
    if (nomor.length < 8) {
      setKeperluan("");
      return;
    }
    let cancelled = false;
    fetch(`/api/public/visitrw3/status/${encodeURIComponent(nomor)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.pengajuan) return;
        setKeperluan(data.pengajuan.keperluanPengajuan);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [nomorLama]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/visitrw3/perpanjang", {
        nomorVisitrw3: nomorLama.trim(),
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
        setujuTataTertib: true as const,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult({ nomorVisitrw3: data.nomorVisitrw3, nomorLama: data.nomorLama });
      toast({ title: "Pengajuan perpanjang terkirim" });
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  async function updatePreview() {
    if (!tanggalBayar || !terminBulan) return;
    try {
      const res = await apiRequest("POST", "/api/public/visitrw3/preview-berlaku", {
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
      });
      const data = await res.json();
      setPreviewSampai(data.tanggalBerlakuSampai);
    } catch {
      setPreviewSampai("");
    }
  }

  useEffect(() => {
    void updatePreview();
  }, [tanggalBayar, terminBulan]);

  if (result) {
    return (
      <Visitrw3Shell title="Perpanjang" backHref="/visitrw3/penyewa">
        <SuccessPanel
          title="Perpanjang terkirim"
          referenceLabel="Nomor antrian baru"
          referenceValue={result.nomorVisitrw3}
          nextSteps={[
            `Nomor sebelumnya: ${result.nomorLama}`,
            "Pengajuan masuk antrian survey admin.",
            "Gunakan nomor antrian baru untuk cek status.",
          ]}
          primaryAction={{ label: "Cek status", href: "/visitrw3/status" }}
          secondaryAction={{ label: "Menu penyewa", href: "/visitrw3/penyewa" }}
        />
      </Visitrw3Shell>
    );
  }

  return (
    <Visitrw3Shell title="Perpanjang izin" backHref="/visitrw3/penyewa">
      <FeatureExplain title="Kapan pakai perpanjang?" className="mb-4">
        <p>
          Hanya untuk izin Visit RW3 yang <strong>sudah pernah disetujui</strong> dan ingin
          diperpanjang masa berlakunya. Masukkan nomor <strong>VRW3-…</strong> lama, lalu isi tanggal
          bayar & termin baru.
        </p>
        <p>
          <strong>Bukan untuk pengajuan pertama.</strong> Kalau belum punya nomor VRW3, gunakan menu
          Pengajuan baru. Perpanjang tetap diverifikasi admin setelah survey.
        </p>
      </FeatureExplain>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nomorLama.trim()) {
            toast({ title: "Lengkapi data", description: "Nomor Visit RW3 wajib diisi", variant: "destructive" });
            return;
          }
          if (!tanggalBayar || !terminBulan) {
            toast({ title: "Lengkapi data", description: "Tanggal bayar dan termin wajib diisi", variant: "destructive" });
            return;
          }
          if (!setujuTataTertib) {
            toast({
              title: "Lengkapi data",
              description: "Anda harus menyetujui syarat dan tata tertib",
              variant: "destructive",
            });
            return;
          }
          if (!keperluan) {
            toast({
              title: "Nomor tidak valid",
              description: "Pastikan nomor sudah disetujui dan dapat ditemukan",
              variant: "destructive",
            });
            return;
          }
          mutation.mutate();
        }}
      >
        <fieldset className="space-y-4 border-0 p-0 m-0">
          <legend className="sr-only">Data perpanjang</legend>
          <div className="space-y-2">
            <Label htmlFor="nomor-lama">Nomor Visit RW3</Label>
            <Input
              id="nomor-lama"
              value={nomorLama}
              onChange={(e) => setNomorLama(e.target.value.toUpperCase())}
              placeholder="VRW3-..."
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tanggal-bayar">Tanggal bayar</Label>
            <Input
              id="tanggal-bayar"
              type="date"
              value={tanggalBayar}
              onChange={(e) => setTanggalBayar(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Termin pembayaran</Label>
            <Select value={terminBulan} onValueChange={setTerminBulan}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMIN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previewSampai && (
            <p className="text-sm rounded-lg bg-muted p-3" role="status">
              Berlaku sampai: <span className="font-semibold">{previewSampai}</span>
            </p>
          )}
          <Visitrw3SyaratPanel
            tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
            tataKhusus={settingsMap.tata_tertib_penyewa ?? ""}
            setuju={setujuTataTertib}
            onSetuju={setSetujuTataTertib}
            loading={settingsLoading}
          />
        </fieldset>
        <Button
          type="submit"
          className="w-full touch-target"
          disabled={mutation.isPending || !setujuTataTertib}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim pengajuan perpanjang"}
        </Button>
      </form>
    </Visitrw3Shell>
  );
}
