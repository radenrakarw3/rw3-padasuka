import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Users, CheckCircle, Clock } from "lucide-react";
import type { WaBlast } from "@shared/schema";

export default function AdminWaBlast() {
  const { toast } = useToast();
  const [pesan, setPesan] = useState("");
  const [kategori, setKategori] = useState("semua");
  const [filterRt, setFilterRt] = useState("1");

  const { data: blastList, isLoading } = useQuery<WaBlast[]>({ queryKey: ["/api/wa-blast"] });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wa-blast", {
        pesan,
        kategoriFilter: kategori,
        filterRt: kategori === "per_rt" ? parseInt(filterRt) : undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "WA Blast Terkirim!",
        description: `Berhasil terkirim ke ${data.sent}/${data.total} nomor`,
      });
      setPesan("");
      queryClient.invalidateQueries({ queryKey: ["/api/wa-blast"] });
    },
    onError: (err: any) => toast({ title: "Gagal", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold" data-testid="text-wa-blast-title">WA Blast Warga</h2>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-[hsl(163,55%,22%)]">
            <MessageSquare className="w-5 h-5" />
            <h3 className="text-sm font-semibold">Kirim Pesan Massal</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Kategori Penerima</Label>
            <Select value={kategori} onValueChange={setKategori}>
              <SelectTrigger className="h-11" data-testid="select-kategori-blast">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Warga (Semua nomor unik)</SelectItem>
                <SelectItem value="kepala_keluarga">Kepala Keluarga Saja</SelectItem>
                <SelectItem value="per_rt">Per RT</SelectItem>
                <SelectItem value="penerima_bansos">Penerima Bansos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kategori === "per_rt" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih RT</Label>
              <Select value={filterRt} onValueChange={setFilterRt}>
                <SelectTrigger className="h-11" data-testid="select-rt-blast">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1,2,3,4,5,6,7].map(i => (
                    <SelectItem key={i} value={i.toString()}>RT {i.toString().padStart(2,"0")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Isi Pesan</Label>
            <Textarea
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              placeholder="Ketik pesan yang akan dikirim ke warga..."
              rows={6}
              data-testid="input-pesan-blast"
            />
            <p className="text-xs text-muted-foreground">{pesan.length} karakter</p>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={() => sendMutation.mutate()}
            disabled={!pesan.trim() || sendMutation.isPending}
            data-testid="button-kirim-blast"
          >
            {sendMutation.isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Mengirim pesan...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="w-4 h-4" />
                Kirim WA Blast
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      <h3 className="text-sm font-semibold text-muted-foreground">Riwayat Pengiriman</h3>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : blastList?.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Send className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Belum ada riwayat pengiriman</p>
          </CardContent>
        </Card>
      ) : (
        blastList?.map(b => {
          const kategoriLabel: Record<string, string> = {
            semua: "Semua Warga",
            kepala_keluarga: "Kepala Keluarga",
            per_rt: `RT ${b.filterRt?.toString().padStart(2,"0") || ""}`,
            penerima_bansos: "Penerima Bansos",
          };
          return (
            <Card key={b.id} data-testid={`card-blast-${b.id}`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">{b.pesan}</p>
                  </div>
                  <Badge className={`text-[10px] flex-shrink-0 gap-0.5 ${
                    b.status === "terkirim" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}>
                    {b.status === "terkirim" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {b.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{b.jumlahPenerima} penerima</span>
                  <span>|</span>
                  <span>{kategoriLabel[b.kategoriFilter] || b.kategoriFilter}</span>
                  <span>|</span>
                  <span>{b.createdAt ? new Date(b.createdAt).toLocaleDateString("id-ID") : ""}</span>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
