import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Rw3bizShell } from "@/components/rw3biz-shell";
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
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

const TERMIN_OPTIONS = [
  { value: "1", label: "Bulanan (1 bulan)" },
  { value: "3", label: "3 bulan" },
  { value: "6", label: "6 bulan" },
  { value: "12", label: "1 tahun" },
];

export default function Rw3bizPerpanjang() {
  const { toast } = useToast();
  const [nomorLama, setNomorLama] = useState("");
  const [tanggalBayar, setTanggalBayar] = useState("");
  const [terminBulan, setTerminBulan] = useState("3");
  const [previewSampai, setPreviewSampai] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [result, setResult] = useState<{ nomorBiz: string } | null>(null);

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/public/rw3biz/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/rw3biz/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string }[]>(res);
    },
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  useEffect(() => {
    if (!tanggalBayar || !terminBulan) return;
    apiRequest("POST", "/api/public/rw3biz/preview-berlaku", {
      tanggalBayar,
      terminBulan: parseInt(terminBulan, 10),
    })
      .then((r) => r.json())
      .then((d) => setPreviewSampai(d.tanggalBerlakuSampai))
      .catch(() => setPreviewSampai(""));
  }, [tanggalBayar, terminBulan]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/rw3biz/perpanjang", {
        nomorBiz: nomorLama.trim(),
        tanggalBayar,
        terminBulan: parseInt(terminBulan, 10),
        setujuTataTertib: true as const,
      });
      return readJsonSafely<{ nomorBiz: string }>(res);
    },
    onSuccess: (data) => {
      setResult({ nomorBiz: data.nomorBiz });
      toast({ title: "Pengajuan perpanjang terkirim" });
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  if (result) {
    return (
      <Rw3bizShell title="Perpanjang" backHref={RW3BIZ_ROUTES.hub}>
        <SuccessPanel
          title="Perpanjang terkirim"
          referenceLabel="Nomor RW3BIZ baru"
          referenceValue={result.nomorBiz}
          nextSteps={["Tunggu survey admin.", "PJ akan dihubungi lewat WhatsApp."]}
          primaryAction={{ label: "Cek status", href: RW3BIZ_ROUTES.status }}
          secondaryAction={{ label: "Kembali ke RW3BIZ", href: RW3BIZ_ROUTES.hub }}
        />
      </Rw3bizShell>
    );
  }

  return (
    <Rw3bizShell title="Perpanjang izin" backHref={RW3BIZ_ROUTES.hub}>
      <div className="space-y-4">
        <FeatureExplain title="Perpanjang izin usaha">
          <p>Masukkan nomor <strong>BIZ-…</strong> usaha yang sudah disetujui.</p>
        </FeatureExplain>
        <div className="space-y-2">
          <Label>Nomor RW3BIZ</Label>
          <Input
            className="font-mono h-12"
            value={nomorLama}
            onChange={(e) => setNomorLama(e.target.value.toUpperCase())}
            placeholder="BIZ-2026-0001"
          />
        </div>
        <div className="space-y-2">
          <Label>Tanggal bayar</Label>
          <Input type="date" className="h-12" value={tanggalBayar} onChange={(e) => setTanggalBayar(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Termin</Label>
          <Select value={terminBulan} onValueChange={setTerminBulan}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TERMIN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {previewSampai && (
          <p className="text-sm rounded-lg bg-muted p-3">
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
        <Button
          className="w-full touch-target"
          disabled={mutation.isPending || !setujuTataTertib || !nomorLama.trim() || !tanggalBayar}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim perpanjang"}
        </Button>
      </div>
    </Rw3bizShell>
  );
}
