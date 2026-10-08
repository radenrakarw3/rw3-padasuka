import { useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, Info, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RTJUARA_API } from "@shared/rtjuara-api";
import {
  RTJUARA_BACKDATE_HARI,
  RTJUARA_MAX_FILE_BYTES,
  RTJUARA_MAX_FOTO,
  RTJUARA_PERIODE_KETERANGAN,
  hariKey,
  tanggalTerawalLapor,
  type RtjuaraPeriode,
} from "@shared/rtjuara";
import { rtjuaraApi } from "@/lib/rtjuara-api";
import { compressImageToDataUrl, dataUrlBytes, formatBytes } from "@/lib/image-compress";
import { PeriodeBadge, PoinBadge } from "@/components/rtjuara/rtjuara-ui";

const HIJAU = "hsl(163,55%,22%)";

export default function RtjuaraKirim() {
  const [, params] = useRoute("/rtjuara/kirim/:questId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questId = Number(params?.questId);

  const { data: quests = [], isPending } = useQuery({
    queryKey: [RTJUARA_API.quest],
    queryFn: () => rtjuaraApi.rt.quest(),
  });
  const quest = useMemo(() => quests.find((q) => q.id === questId), [quests, questId]);

  const [judulKegiatan, setJudulKegiatan] = useState("");
  const [tanggalKegiatan, setTanggalKegiatan] = useState(() => hariKey());
  const [lokasi, setLokasi] = useState("");
  const [jumlahPeserta, setJumlahPeserta] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [dikirimOleh, setDikirimOleh] = useState("");
  const [foto, setFoto] = useState<string[]>([]);
  const [memproses, setMemproses] = useState(false);

  const minFoto = quest?.minFoto ?? 1;

  const kirimMutation = useMutation({
    mutationFn: () =>
      rtjuaraApi.rt.kirim({
        questId,
        judulKegiatan: judulKegiatan.trim(),
        tanggalKegiatan,
        lokasi: lokasi.trim(),
        jumlahPeserta: jumlahPeserta.trim() ? Number(jumlahPeserta) : null,
        deskripsi: deskripsi.trim(),
        dikirimOleh: dikirimOleh.trim() || null,
        foto,
      }),
    onSuccess: () => {
      toast({
        title: "Bukti terkirim!",
        description: "Poin akan masuk setelah admin RW memverifikasi bukti kamu.",
      });
      void queryClient.invalidateQueries({ queryKey: [RTJUARA_API.quest] });
      void queryClient.invalidateQueries({ queryKey: [RTJUARA_API.submission] });
      void queryClient.invalidateQueries({ queryKey: [RTJUARA_API.ringkasan] });
      setLocation("/rtjuara/riwayat");
    },
    onError: (e: unknown) =>
      toast({
        title: "Gagal mengirim bukti",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      }),
  });

  const handlePilihFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;

    const sisa = RTJUARA_MAX_FOTO - foto.length;
    if (sisa <= 0) {
      toast({ title: `Maksimal ${RTJUARA_MAX_FOTO} foto`, variant: "destructive" });
      return;
    }

    setMemproses(true);
    try {
      const hasil: string[] = [];
      for (const file of files.slice(0, sisa)) {
        if (!file.type.startsWith("image/")) {
          toast({ title: "Hanya file gambar yang bisa diunggah", variant: "destructive" });
          continue;
        }
        if (file.size > RTJUARA_MAX_FILE_BYTES) {
          toast({
            title: "Foto terlalu besar",
            description: `${file.name} lebih dari ${formatBytes(RTJUARA_MAX_FILE_BYTES)}.`,
            variant: "destructive",
          });
          continue;
        }
        hasil.push(await compressImageToDataUrl(file));
      }
      if (hasil.length) setFoto((prev) => [...prev, ...hasil]);
    } finally {
      setMemproses(false);
    }
  };

  const totalUkuran = foto.reduce((total, f) => total + dataUrlBytes(f), 0);

  const validasi = (): string | null => {
    if (!quest) return "Quest tidak ditemukan";
    if (judulKegiatan.trim().length < 3) return "Judul kegiatan minimal 3 karakter";
    if (!tanggalKegiatan) return "Tanggal kegiatan wajib diisi";
    if (tanggalKegiatan > hariKey()) return "Tanggal kegiatan tidak boleh di masa depan";
    if (tanggalKegiatan < tanggalTerawalLapor()) {
      return `Kegiatan hanya bisa dilaporkan maksimal ${RTJUARA_BACKDATE_HARI} hari setelah pelaksanaan`;
    }
    if (lokasi.trim().length < 3) return "Lokasi kegiatan wajib diisi";
    if (deskripsi.trim().length < 10) return "Ceritakan kegiatannya minimal 10 karakter";
    if (quest.wajibJumlahPeserta && (!jumlahPeserta.trim() || Number(jumlahPeserta) < 1)) {
      return "Quest ini wajib mencantumkan jumlah peserta";
    }
    if (foto.length < minFoto) return `Lampirkan minimal ${minFoto} foto dokumentasi`;
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pesan = validasi();
    if (pesan) {
      toast({ title: pesan, variant: "destructive" });
      return;
    }
    kirimMutation.mutate();
  };

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!quest) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center space-y-3">
        <p className="text-sm font-medium">Quest tidak ditemukan atau sudah tidak aktif</p>
        <Button variant="outline" onClick={() => setLocation("/rtjuara/quest")}>
          Kembali ke daftar quest
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setLocation("/rtjuara/quest")}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke quest
      </button>

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-sm leading-snug flex-1" style={{ color: HIJAU }}>
            {quest.judul}
          </h2>
          <PoinBadge poin={quest.poin} />
        </div>
        <div className="flex items-center gap-2">
          <PeriodeBadge periode={quest.periode} />
          <span className="text-[11px] text-muted-foreground">
            {RTJUARA_PERIODE_KETERANGAN[quest.periode as RtjuaraPeriode]}
          </span>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{quest.deskripsi}</p>
        {quest.instruksiBukti && (
          <div className="flex gap-2 rounded-lg bg-muted/60 p-2.5">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{quest.instruksiBukti}</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-1.5">
          <Label htmlFor="judul-kegiatan">Judul kegiatan</Label>
          <Input
            id="judul-kegiatan"
            value={judulKegiatan}
            onChange={(e) => setJudulKegiatan(e.target.value)}
            placeholder="Contoh: Kerja bakti bersih selokan"
            maxLength={150}
            data-testid="input-judul-kegiatan"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="tanggal-kegiatan">Tanggal kegiatan</Label>
            <Input
              id="tanggal-kegiatan"
              type="date"
              min={tanggalTerawalLapor()}
              max={hariKey()}
              value={tanggalKegiatan}
              onChange={(e) => setTanggalKegiatan(e.target.value)}
              data-testid="input-tanggal-kegiatan"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="jumlah-peserta">
              Jumlah peserta {quest.wajibJumlahPeserta ? "" : <span className="text-muted-foreground">(opsional)</span>}
            </Label>
            <Input
              id="jumlah-peserta"
              type="number"
              inputMode="numeric"
              min={0}
              value={jumlahPeserta}
              onChange={(e) => setJumlahPeserta(e.target.value)}
              placeholder="0"
              data-testid="input-jumlah-peserta"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lokasi">Lokasi</Label>
          <Input
            id="lokasi"
            value={lokasi}
            onChange={(e) => setLokasi(e.target.value)}
            placeholder="Contoh: Gang Mawar, depan pos ronda"
            data-testid="input-lokasi"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deskripsi">Cerita kegiatan</Label>
          <Textarea
            id="deskripsi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            rows={4}
            placeholder="Ceritakan apa yang dikerjakan, siapa saja yang terlibat, dan hasilnya."
            data-testid="input-deskripsi"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dikirim-oleh">
            Dikirim oleh <span className="text-muted-foreground">(opsional)</span>
          </Label>
          <Input
            id="dikirim-oleh"
            value={dikirimOleh}
            onChange={(e) => setDikirimOleh(e.target.value)}
            placeholder="Nama pengurus yang mengisi"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Dokumentasi foto — minimal {minFoto}, maksimal {RTJUARA_MAX_FOTO}
          </Label>

          {foto.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {foto.map((src, index) => (
                <div key={index} className="relative">
                  <img src={src} alt={`Dokumentasi ${index + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                  <button
                    type="button"
                    onClick={() => setFoto((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5"
                    aria-label={`Hapus foto ${index + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePilihFoto}
            data-testid="input-foto"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            disabled={memproses || foto.length >= RTJUARA_MAX_FOTO}
            onClick={() => fileInputRef.current?.click()}
          >
            {memproses ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses foto...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                {foto.length >= RTJUARA_MAX_FOTO ? "Batas foto tercapai" : "Ambil / pilih foto"}
              </>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {foto.length} dari {RTJUARA_MAX_FOTO} foto
            {foto.length > 0 && ` · total ${formatBytes(totalUkuran)} setelah dikompres`}
          </p>
        </div>

        <Button
          type="submit"
          disabled={kirimMutation.isPending || memproses}
          className="w-full h-12 text-white font-semibold"
          style={{ backgroundColor: HIJAU }}
          data-testid="button-kirim-bukti"
        >
          {kirimMutation.isPending ? "Mengirim..." : `Kirim Bukti (${quest.poin} poin)`}
        </Button>
      </form>
    </div>
  );
}
