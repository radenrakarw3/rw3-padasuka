import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

const jenisLaporanOptions = [
  { value: "keamanan", label: "Keamanan" },
  { value: "infrastruktur", label: "Infrastruktur" },
  { value: "kebersihan", label: "Kebersihan" },
  { value: "ketertiban", label: "Ketertiban" },
  { value: "lainnya", label: "Lainnya" },
];

export default function SinggahLaporan() {
  const { toast } = useToast();
  const [jenisLaporan, setJenisLaporan] = useState("");
  const [judul, setJudul] = useState("");
  const [isi, setIsi] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/singgah/laporan", { jenisLaporan, judul, isi });
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "Laporan berhasil dikirim" });
      setSubmitted(true);
    },
    onError: (error: any) => {
      const msg = error.message.includes(":")
        ? error.message.split(":").slice(1).join(":").trim()
        : error.message;
      let parsed = msg;
      try { parsed = JSON.parse(msg).message; } catch {}
      toast({ title: "Gagal mengirim", description: parsed, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jenisLaporan || !judul || !isi) {
      toast({ title: "Semua field harus diisi", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  const handleReset = () => {
    setJenisLaporan("");
    setJudul("");
    setIsi("");
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <Card data-testid="card-laporan-sukses">
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-[hsl(163,55%,22%)] mx-auto" />
          <div>
            <h2 className="text-lg font-bold">Laporan Terkirim!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Laporan Anda telah dikirim ke admin RW 03.
              Terima kasih atas partisipasi Anda.
            </p>
          </div>
          <Button onClick={handleReset} variant="outline" data-testid="button-laporan-baru">
            Buat Laporan Baru
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold" data-testid="text-page-title">Laporan Warga Singgah</h1>
        <p className="text-sm text-muted-foreground">Laporkan masalah atau kejadian di lingkungan sekitar</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jenis-laporan">Jenis Laporan</Label>
              <Select value={jenisLaporan} onValueChange={setJenisLaporan}>
                <SelectTrigger id="jenis-laporan" data-testid="select-jenis-laporan">
                  <SelectValue placeholder="Pilih jenis laporan" />
                </SelectTrigger>
                <SelectContent>
                  {jenisLaporanOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="judul">Judul Laporan</Label>
              <Input
                id="judul"
                placeholder="Ringkasan laporan"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                data-testid="input-judul-laporan"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="isi">Detail Laporan</Label>
              <Textarea
                id="isi"
                placeholder="Jelaskan detail kejadian atau masalah..."
                value={isi}
                onChange={(e) => setIsi(e.target.value)}
                rows={5}
                data-testid="input-isi-laporan"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !jenisLaporan || !judul || !isi}
              data-testid="button-kirim-laporan"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Kirim Laporan
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
