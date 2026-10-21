import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, readJsonSafely } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { SuccessPanel } from "@/components/gov/success-panel";
import { KontribusiTinggalInfo, Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { PilihTermin } from "@/components/gov/pilih-termin";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";

export default function Visitrw3Perpanjang() {
  const { toast } = useToast();
  const [nomorLama, setNomorLama] = useState(
    () => (new URLSearchParams(window.location.search).get("nomor") ?? "").trim().toUpperCase(),
  );
  const [terminBulan, setTerminBulan] = useState("3");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [keperluan, setKeperluan] = useState<"tinggal" | "bisnis" | "">("");
  const [jenisWarga, setJenisWarga] = useState("");
  const [ukuranTinggal, setUkuranTinggal] = useState("");
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
      setJenisWarga("");
      setUkuranTinggal("");
      return;
    }
    let cancelled = false;
    fetch(`/api/public/visitrw3/status/${encodeURIComponent(nomor)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.pengajuan) return;
        setKeperluan(data.pengajuan.keperluanPengajuan);
        setJenisWarga(data.pengajuan.jenisWarga ?? "");
        setUkuranTinggal(data.pengajuan.ukuranTinggal ?? "");
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

  useEffect(() => {
    setSetujuTataTertib(false);
  }, [terminBulan, jenisWarga]);

  if (result) {
    return (
      <Visitrw3Shell title="Perpanjang" backHref="/visitrw3">
        <SuccessPanel
          title="Perpanjang terkirim"
          referenceLabel="Nomor antrian baru"
          referenceValue={result.nomorVisitrw3}
          nextSteps={[
            `Nomor sebelumnya: ${result.nomorLama}`,
            "Pengajuan masuk antrian survey admin.",
            "Setelah disetujui, surat izin tinggal baru terbit dengan nomor ini — surat lama tidak berlaku lagi.",
          ]}
          primaryAction={{
            label: "Cek status",
            href: `/visitrw3/status?nomor=${encodeURIComponent(result.nomorVisitrw3)}`,
          }}
          secondaryAction={{ label: "Kembali ke Visit RW3", href: "/visitrw3" }}
        />
      </Visitrw3Shell>
    );
  }

  return (
    <Visitrw3Shell title="Perpanjang izin" backHref="/visitrw3">
      <p className="mb-4 text-base">
        Untuk izin Visit RW3 yang <strong>sudah pernah disetujui</strong>. Belum punya nomor VRW3? Daftar baru dari
        halaman Visit RW3.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!nomorLama.trim()) {
            toast({ title: "Lengkapi data", description: "Nomor Visit RW3 wajib diisi", variant: "destructive" });
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
              className="h-12 font-mono"
            />
          </div>
          <PilihTermin value={terminBulan} onChange={setTerminBulan} />
          <Visitrw3SyaratPanel
            tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
            tataKhusus={settingsMap.tata_tertib_penyewa ?? ""}
            kontribusi={
              jenisWarga === "kost" || jenisWarga === "kontrak" ? (
                <KontribusiTinggalInfo
                  jenis={jenisWarga}
                  settingsRows={settingsRows}
                  terminBulan={parseInt(terminBulan, 10)}
                  ukuran={ukuranTinggal}
                />
              ) : null
            }
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
