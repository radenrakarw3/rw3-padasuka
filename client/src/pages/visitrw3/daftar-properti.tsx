import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visitrw3Shell } from "@/components/visitrw3-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import { rtOptions, jumlahPintuOptions, jenisPropertiOptions } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { SuccessPanel } from "@/components/gov/success-panel";
import { Visitrw3SyaratPanel } from "@/components/gov/visitrw3-syarat-panel";
import { settingsRowsToMap } from "@/lib/visitrw3-kontribusi";
import { readJsonSafely } from "@/lib/queryClient";

export default function Visitrw3DaftarProperti() {
  const { toast } = useToast();
  const [namaKost, setNamaKost] = useState("");
  const [namaPemilik, setNamaPemilik] = useState("");
  const [nomorWaPemilik, setNomorWaPemilik] = useState("");
  const [namaPenanggungJawab, setNamaPenanggungJawab] = useState("");
  const [nomorWaPenanggungJawab, setNomorWaPenanggungJawab] = useState("");
  const [rt, setRt] = useState("");
  const [alamatLengkap, setAlamatLengkap] = useState("");
  const [jumlahPintu, setJumlahPintu] = useState("1");
  const [jenisProperti, setJenisProperti] = useState("kost");
  const [izinTinggal, setIzinTinggal] = useState(true);
  const [izinBisnis, setIzinBisnis] = useState(false);
  const [catatan, setCatatan] = useState("");
  const [setujuTataTertib, setSetujuTataTertib] = useState(false);
  const [nomorHasil, setNomorHasil] = useState<string | null>(null);

  const { data: settingsRows = [], isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/public/visitrw3/settings"],
    queryFn: async () => {
      const res = await fetch("/api/public/visitrw3/settings");
      if (!res.ok) throw new Error("Gagal memuat pengaturan");
      return readJsonSafely<{ key: string; value: string; updatedAt?: string }[]>(res);
    },
  });

  const settingsMap = useMemo(() => settingsRowsToMap(settingsRows), [settingsRows]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/visitrw3/daftar-properti", {
        namaKost: namaKost.trim(),
        namaPemilik: namaPemilik.trim(),
        nomorWaPemilik: nomorWaPemilik.trim(),
        namaPenanggungJawab: namaPenanggungJawab.trim(),
        nomorWaPenanggungJawab: nomorWaPenanggungJawab.trim(),
        rt: parseInt(rt, 10),
        alamatLengkap: alamatLengkap.trim(),
        jumlahPintu: parseInt(jumlahPintu, 10),
        jenisProperti,
        izinTinggal,
        izinBisnis,
        catatanPemohon: catatan.trim() || null,
        setujuTataTertib: true as const,
      });
      return res.json();
    },
    onSuccess: (data) => setNomorHasil(data.nomorPendaftaran),
    onError: (e: unknown) => {
      toast({ title: "Gagal mengirim", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  function validate(): string | null {
    if (!namaKost.trim()) return "Nama kost/kontrakan wajib diisi";
    if (!namaPemilik.trim()) return "Nama pemilik wajib diisi";
    if (!nomorWaPemilik.trim()) return "Nomor WhatsApp pemilik wajib diisi";
    if (!namaPenanggungJawab.trim()) return "Nama penanggung jawab pengelola wajib diisi";
    if (!nomorWaPenanggungJawab.trim()) return "WhatsApp penanggung jawab wajib diisi";
    if (!rt) return "Pilih RT";
    if (!alamatLengkap.trim()) return "Alamat lengkap wajib diisi";
    if (!izinTinggal && !izinBisnis) return "Pilih minimal satu jenis izin (tinggal atau bisnis)";
    if (!setujuTataTertib) return "Anda harus menyetujui syarat dan tata tertib";
    return null;
  }

  if (nomorHasil) {
    return (
      <Visitrw3Shell title="Daftar properti" backHref="/visitrw3/pemilik">
        <SuccessPanel
          title="Pendaftaran terkirim"
          referenceLabel="Nomor pendaftaran properti"
          referenceValue={nomorHasil}
          nextSteps={[
            "Simpan nomor ini untuk mengecek status verifikasi.",
            "Admin RW akan memverifikasi data properti Anda.",
            "Setelah disetujui, properti muncul di formulir pengajuan Visit RW3.",
          ]}
          primaryAction={{ label: "Cek status properti", href: "/visitrw3/status-properti" }}
          secondaryAction={{ label: "Menu pemilik properti", href: "/visitrw3/pemilik" }}
        />
      </Visitrw3Shell>
    );
  }

  return (
    <Visitrw3Shell title="Daftar properti" backHref="/visitrw3/pemilik">
      <p className="prose-gov mb-4">
        Formulir untuk pemilik kost, kontrakan, atau properti sewa di wilayah RW 03. Setelah diverifikasi admin,
        properti Anda dapat dipilih pada pengajuan Visit RW3.
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const err = validate();
          if (err) {
            toast({ title: "Lengkapi data", description: err, variant: "destructive" });
            return;
          }
          mutation.mutate();
        }}
      >
        <div className="space-y-2">
          <Label>Nama kost / kontrakan *</Label>
          <Input
            value={namaKost}
            onChange={(e) => setNamaKost(e.target.value)}
            placeholder="Contoh: Kost Melati"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Nama pemilik *</Label>
          <Input value={namaPemilik} onChange={(e) => setNamaPemilik(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>WhatsApp pemilik *</Label>
          <Input
            value={nomorWaPemilik}
            onChange={(e) => setNomorWaPemilik(e.target.value)}
            placeholder="08xxxxxxxxxx"
            required
          />
        </div>
        <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Penanggung jawab pengelola *</p>
          <p className="text-xs text-muted-foreground">
            Orang yang dipercaya mengelola properti sehari-hari (boleh berbeda dari pemilik).
          </p>
          <div className="space-y-2">
            <Label className="text-xs">Nama</Label>
            <Input
              value={namaPenanggungJawab}
              onChange={(e) => setNamaPenanggungJawab(e.target.value)}
              placeholder="Nama penanggung jawab"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">WhatsApp</Label>
            <Input
              value={nomorWaPenanggungJawab}
              onChange={(e) => setNomorWaPenanggungJawab(e.target.value)}
              placeholder="08xxxxxxxxxx"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>RT *</Label>
            <Select value={rt} onValueChange={setRt}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih RT" />
              </SelectTrigger>
              <SelectContent>
                {rtOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    RT {String(n).padStart(2, "0")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jumlah pintu / unit *</Label>
            <Select value={jumlahPintu} onValueChange={setJumlahPintu}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {jumlahPintuOptions.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} pintu
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Jenis properti *</Label>
          <Select value={jenisProperti} onValueChange={setJenisProperti}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jenisPropertiOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Alamat lengkap *</Label>
          <Textarea
            value={alamatLengkap}
            onChange={(e) => setAlamatLengkap(e.target.value)}
            rows={2}
            placeholder="Jl., gang, nomor rumah, patokan"
            required
          />
        </div>
        <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
          <p className="text-sm font-medium">Izin pengajuan Visit RW3 *</p>
          <p className="text-xs text-muted-foreground">
            Centang jenis pengajuan yang boleh menggunakan properti ini.
          </p>
          <div className="flex items-center gap-2">
            <Checkbox id="izin-tinggal" checked={izinTinggal} onCheckedChange={(c) => setIzinTinggal(Boolean(c))} />
            <Label htmlFor="izin-tinggal" className="font-normal">
              Izinkan pengajuan tinggal
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="izin-bisnis" checked={izinBisnis} onCheckedChange={(c) => setIzinBisnis(Boolean(c))} />
            <Label htmlFor="izin-bisnis" className="font-normal">
              Izinkan pengajuan bisnis
            </Label>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Catatan (opsional)</Label>
          <Textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            rows={2}
            placeholder="Informasi tambahan untuk admin"
          />
        </div>
        <Visitrw3SyaratPanel
          tataMasyarakat={settingsMap.tata_tertib_masyarakat ?? ""}
          tataKhusus={settingsMap.tata_tertib_pemilik ?? ""}
          setuju={setujuTataTertib}
          onSetuju={setSetujuTataTertib}
          loading={settingsLoading}
        />
        <Button
          type="submit"
          className="w-full touch-target"
          disabled={mutation.isPending || !setujuTataTertib}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kirim pendaftaran"}
        </Button>
      </form>
    </Visitrw3Shell>
  );
}
