import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Send, History, BookOpen, RefreshCw, Pause, Play, XCircle } from "lucide-react";
import { PROPAGANDA_API, PROPAGANDA_PROFIL_LABEL, type PropagandaCampaignSummary } from "@shared/propaganda-api";
import type { PropagandaProfil } from "@shared/schema";
import type { PropagandaFilterInput, PropagandaPreviewResult } from "@shared/propaganda-filters";
import { ACTIVE_RT_NUMBERS } from "@shared/rt";
import { KATEGORI_UMUR_IDS } from "@shared/kategori-umur";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import { usePropagandaAuth } from "@/lib/propaganda-auth";
import { useToast } from "@/hooks/use-toast";

const DEFAULT_FILTER: PropagandaFilterInput = {
  mode: "per_warga",
  lewatiAnak: true,
  statusKependudukan: "Aktif",
};

function formatWaktu(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPropaganda() {
  const { toast } = useToast();
  const { logout } = usePropagandaAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("baru");

  const [judul, setJudul] = useState("");
  const [pesan, setPesan] = useState(
    "Assalamu'alaikum Wr. Wb.\n{sapaan} {nama} Wargi {rt} yang terhormat,\n\n[Pesan informasi di sini]\n\nInfo lengkap: rw3padasukacimahi.org\nHatur nuhun!\nRaden Raka - Ketua RW 03 Padasuka",
  );
  const [profil, setProfil] = useState<PropagandaProfil>("standar");
  const [filter, setFilter] = useState<PropagandaFilterInput>(DEFAULT_FILTER);
  const [abaikanCooldown, setAbaikanCooldown] = useState(false);
  const [preview, setPreview] = useState<PropagandaPreviewResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [konfirmasiBesar, setKonfirmasiBesar] = useState(false);
  const [konfirmasiTeks, setKonfirmasiTeks] = useState("");

  const { data: filterOptions } = useQuery<{ pekerjaan: string[] }>({
    queryKey: [PROPAGANDA_API.filterOptions],
  });

  const { data: campaigns, refetch: refetchCampaigns } = useQuery<PropagandaCampaignSummary[]>({
    queryKey: [PROPAGANDA_API.campaign],
    refetchInterval: tab === "monitor" ? 5000 : false,
  });

  const activeCampaign = campaigns?.find((c) => c.status === "berjalan" || c.status === "jeda");

  const previewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", PROPAGANDA_API.preview, {
        filter,
        profilDistribusi: profil,
        abaikanCooldown,
      });
      return res.json() as Promise<PropagandaPreviewResult>;
    },
    onSuccess: (data) => {
      setPreview(data);
      toast({ title: "Preview siap", description: `${data.jumlahTarget} penerima target` });
    },
    onError: (err) => toast({ title: "Preview gagal", description: getApiErrorMessage(err), variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", PROPAGANDA_API.campaign, {
        judul,
        pesanTemplate: pesan,
        filter,
        profilDistribusi: profil,
        abaikanCooldown,
        konfirmasiBesar,
      });
      return res.json();
    },
    onSuccess: () => {
      setConfirmOpen(false);
      setKonfirmasiTeks("");
      setKonfirmasiBesar(false);
      queryClient.invalidateQueries({ queryKey: [PROPAGANDA_API.campaign] });
      setTab("monitor");
      toast({ title: "Kampanye dimulai", description: "Distribusi gelombang sedang berjalan" });
    },
    onError: (err) => toast({ title: "Gagal membuat kampanye", description: getApiErrorMessage(err), variant: "destructive" }),
  });

  const generateMutation = useMutation({
    mutationFn: async (topik: string) => {
      const res = await apiRequest("POST", PROPAGANDA_API.generate, { topik });
      return res.json() as Promise<{ pesan: string }>;
    },
    onSuccess: (data) => {
      setPesan(data.pesan);
      toast({ title: "Draft pesan siap" });
    },
    onError: (err) => toast({ title: "Generate gagal", description: getApiErrorMessage(err), variant: "destructive" }),
  });

  const campaignAction = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "jeda" | "lanjut" | "batalkan" }) => {
      const path =
        action === "jeda"
          ? PROPAGANDA_API.campaignJeda(id)
          : action === "lanjut"
            ? PROPAGANDA_API.campaignLanjut(id)
            : PROPAGANDA_API.campaignBatalkan(id);
      await apiRequest("POST", path, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROPAGANDA_API.campaign] });
    },
  });

  const needsBigConfirm = (preview?.jumlahTarget ?? 0) > 150;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(163,55%,22%)]">Propaganda RW</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Distribusi informasi warga — pengiriman merata & terjadwal (bukan blast cepat).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          Kunci PIN
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="baru" className="gap-1.5 text-xs sm:text-sm">
            <Send className="w-3.5 h-3.5" /> Baru
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-1.5 text-xs sm:text-sm">
            <Radio className="w-3.5 h-3.5" /> Monitor
          </TabsTrigger>
          <TabsTrigger value="riwayat" className="gap-1.5 text-xs sm:text-sm">
            <History className="w-3.5 h-3.5" /> Riwayat
          </TabsTrigger>
          <TabsTrigger value="panduan" className="gap-1.5 text-xs sm:text-sm">
            <BookOpen className="w-3.5 h-3.5" /> Panduan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="baru" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kampanye baru</CardTitle>
              <CardDescription>Placeholder: {"{sapaan}"}, {"{nama}"}, {"{rt}"}, {"{alamat}"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Judul internal</Label>
                <Input value={judul} onChange={(e) => setJudul(e.target.value)} placeholder="Mis. Info Posyandu Maret" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Pesan</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    disabled={generateMutation.isPending}
                    onClick={() => {
                      const topik = prompt("Topik pesan untuk AI:");
                      if (topik?.trim()) generateMutation.mutate(topik.trim());
                    }}
                  >
                    Draft AI
                  </Button>
                </div>
                <Textarea value={pesan} onChange={(e) => setPesan(e.target.value)} rows={10} className="font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Profil distribusi</Label>
                <Select value={profil} onValueChange={(v) => setProfil(v as PropagandaProfil)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PROPAGANDA_PROFIL_LABEL) as PropagandaProfil[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PROPAGANDA_PROFIL_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filter penerima</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mode</Label>
                  <Select
                    value={filter.mode}
                    onValueChange={(v) => setFilter((f) => ({ ...f, mode: v as "per_warga" | "per_kk" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_warga">Per warga (dewasa + WA)</SelectItem>
                      <SelectItem value="per_kk">Per KK (1 nomor per keluarga)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>RT (kosong = semua)</Label>
                  <div className="flex flex-wrap gap-2">
                    {ACTIVE_RT_NUMBERS.map((rt) => {
                      const selected = filter.rt?.includes(rt);
                      return (
                        <Button
                          key={rt}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          className={selected ? "bg-[hsl(163,55%,22%)]" : ""}
                          onClick={() =>
                            setFilter((f) => {
                              const cur = f.rt ?? [];
                              const next = cur.includes(rt) ? cur.filter((x) => x !== rt) : [...cur, rt];
                              return { ...f, rt: next.length ? next : undefined };
                            })
                          }
                        >
                          RT {String(rt).padStart(2, "0")}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={filter.lewatiAnak} onCheckedChange={(c) => setFilter((f) => ({ ...f, lewatiAnak: !!c }))} />
                  Lewati anak/remaja
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!filter.penerimaBansos}
                    onCheckedChange={(c) => setFilter((f) => ({ ...f, penerimaBansos: c ? true : undefined }))}
                  />
                  Penerima bansos saja
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!filter.kepalaKeluargaOnly}
                    onCheckedChange={(c) => setFilter((f) => ({ ...f, kepalaKeluargaOnly: c ? true : undefined }))}
                  />
                  Kepala keluarga saja
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={abaikanCooldown} onCheckedChange={(c) => setAbaikanCooldown(!!c)} />
                  Abaikan cooldown 7 hari
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jenis kelamin</Label>
                  <Select
                    value={filter.jenisKelamin ?? "semua"}
                    onValueChange={(v) =>
                      setFilter((f) => ({
                        ...f,
                        jenisKelamin: v === "semua" ? undefined : (v as "Laki-laki" | "Perempuan"),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua</SelectItem>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pekerjaan (opsional)</Label>
                  <Select
                    value={filter.pekerjaan?.[0] ?? "semua"}
                    onValueChange={(v) =>
                      setFilter((f) => ({ ...f, pekerjaan: v === "semua" ? undefined : [v] }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua pekerjaan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua</SelectItem>
                      {(filterOptions?.pekerjaan ?? []).map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kategori umur (opsional, pilih satu)</Label>
                <Select
                  value={filter.kategoriUmur?.[0] ?? "semua"}
                  onValueChange={(v) =>
                    setFilter((f) => ({
                      ...f,
                      kategoriUmur: v === "semua" ? undefined : [v as (typeof KATEGORI_UMUR_IDS)[number]],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua umur</SelectItem>
                    {KATEGORI_UMUR_IDS.filter((k) => k !== "belum_diisi").map((k) => (
                      <SelectItem key={k} value={k}>
                        {k} tahun
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending || pesan.length < 20}
              >
                {previewMutation.isPending ? "Menghitung..." : "Preview distribusi"}
              </Button>

              {preview && (
                <Alert>
                  <AlertTitle>
                    {preview.jumlahTarget} penerima — {PROPAGANDA_PROFIL_LABEL[preview.timeline.profilDistribusi]}
                  </AlertTitle>
                  <AlertDescription className="space-y-2 mt-2 text-sm">
                    <p>
                      <strong>Formula {preview.helix.formulaVersi}</strong> · {preview.helix.jumlahGelombang} gelombang ·
                      skor kemerataan RT <strong>{preview.helix.fairnessScore}/100</strong> · jeda rata-rata{" "}
                      {Math.round(preview.helix.gapRataMs / 1000)} detik
                    </p>
                    <p>
                      Estimasi: {formatWaktu(preview.timeline.mulaiEstimasi)} →{" "}
                      {formatWaktu(preview.timeline.selesaiEstimasi)} (~{preview.timeline.durasiJam} jam)
                    </p>
                    {preview.jumlahDilewatiCooldown > 0 && (
                      <p>{preview.jumlahDilewatiCooldown} dilewati (cooldown 7 hari)</p>
                    )}
                    <p>
                      Per RT:{" "}
                      {Object.entries(preview.perRt)
                        .map(([rt, n]) => `RT ${rt}: ${n}`)
                        .join(" · ") || "—"}
                    </p>
                    {preview.helix.gelombang.length > 0 && (
                      <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1 max-h-32 overflow-y-auto">
                        {preview.helix.gelombang.map((g) => (
                          <p key={g.nomor}>
                            Gelombang {g.nomor}: {g.jumlahSlot} pesan · {formatWaktu(g.mulai)} – {formatWaktu(g.selesai)}
                            {g.istirahatMenit > 0 ? ` · istirahat ${g.istirahatMenit} menit` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full sm:w-auto bg-[hsl(163,55%,22%)]"
                disabled={!preview || preview.jumlahTarget === 0 || !judul.trim() || createMutation.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Mulai kampanye distribusi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => void refetchCampaigns()}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>
          {!activeCampaign ? (
            <Alert>
              <AlertTitle>Tidak ada kampanye aktif</AlertTitle>
              <AlertDescription>Buat kampanye baru di tab Baru.</AlertDescription>
            </Alert>
          ) : (
            <CampaignProgressCard
              campaign={activeCampaign}
              onJeda={() => campaignAction.mutate({ id: activeCampaign.id, action: "jeda" })}
              onLanjut={() => campaignAction.mutate({ id: activeCampaign.id, action: "lanjut" })}
              onBatalkan={() => campaignAction.mutate({ id: activeCampaign.id, action: "batalkan" })}
            />
          )}
          {activeCampaign && <GelombangMonitor campaignId={activeCampaign.id} />}
        </TabsContent>

        <TabsContent value="riwayat" className="mt-4 space-y-3">
          {(campaigns ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kampanye.</p>
          ) : (
            (campaigns ?? []).map((c) => (
              <Card key={c.id}>
                <CardHeader className="py-3">
                  <div className="flex justify-between gap-2">
                    <CardTitle className="text-sm font-medium">{c.judul}</CardTitle>
                    <span className="text-xs text-muted-foreground capitalize">{c.status}</span>
                  </div>
                  <CardDescription className="text-xs">
                    {c.jumlahTerkirim}/{c.jumlahTarget} terkirim · {PROPAGANDA_PROFIL_LABEL[c.profilDistribusi as PropagandaProfil] ?? c.profilDistribusi}
                    {c.createdAt && ` · ${formatWaktu(c.createdAt)}`}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="panduan" className="mt-4">
          <Card>
            <CardContent className="pt-6 prose prose-sm max-w-none text-sm space-y-3">
              <p>
                <strong>Formula HELIX v2</strong> — engine penjadwalan beneran di server, bukan gimmick UI. Setiap kampanye
                disimpan lengkap di database: rencana gelombang, antrian per slot, log setiap percobaan kirim.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Helix interleave</strong> — round-robin antar RT, tidak habiskan satu RT dulu.</li>
                <li><strong>Gelombang mikro</strong> 15–30 pesan + istirahat wajib antar gelombang.</li>
                <li><strong>Skor kemerataan RT</strong> (0–100) dihitung dari urutan pengiriman aktual.</li>
                <li><strong>Preview = eksekusi</strong> — seed deterministik, jadwal preview sama dengan yang disimpan.</li>
                <li>Dispatcher: klaim atomik DB, cap global & per RT/jam, audit log tiap kirim.</li>
                <li>Untuk seluruh RW: profil <strong>Hati-hati (24 jam)</strong> atau lebih.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi kampanye</DialogTitle>
            <DialogDescription>
              {preview?.jumlahTarget} pesan akan dijadwalkan secara bertahap. Pastikan isi pesan sudah benar.
            </DialogDescription>
          </DialogHeader>
          {needsBigConfirm && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={konfirmasiBesar} onCheckedChange={(c) => setKonfirmasiBesar(!!c)} />
              Saya paham risiko kampanye besar (&gt;150 penerima) dan memilih profil distribusi yang sesuai.
            </label>
          )}
          <div className="space-y-2">
            <Label>Ketik DISTRIBUSI untuk melanjutkan</Label>
            <Input value={konfirmasiTeks} onChange={(e) => setKonfirmasiTeks(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-[hsl(163,55%,22%)]"
              disabled={
                konfirmasiTeks !== "DISTRIBUSI" ||
                (needsBigConfirm && !konfirmasiBesar) ||
                createMutation.isPending
              }
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Memproses..." : "Mulai distribusi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type GelombangRow = {
  id: number;
  nomor: number;
  jumlahSlot: number;
  jumlahTerkirim: number;
  status: string;
  jadwalMulai: string;
  jadwalSelesai: string;
};

function GelombangMonitor({ campaignId }: { campaignId: number }) {
  const { data } = useQuery<GelombangRow[]>({
    queryKey: [PROPAGANDA_API.campaignGelombang(campaignId)],
    refetchInterval: 5000,
  });
  if (!data?.length) return null;
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Gelombang HELIX ({data.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((g) => {
          const pct = g.jumlahSlot > 0 ? Math.round((g.jumlahTerkirim / g.jumlahSlot) * 100) : 0;
          return (
            <div key={g.id} className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>
                  Gelombang {g.nomor} · {g.status}
                </span>
                <span>
                  {g.jumlahTerkirim}/{g.jumlahSlot}
                </span>
              </div>
              <Progress value={pct} className="h-1" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function CampaignProgressCard({
  campaign,
  onJeda,
  onLanjut,
  onBatalkan,
}: {
  campaign: PropagandaCampaignSummary;
  onJeda: () => void;
  onLanjut: () => void;
  onBatalkan: () => void;
}) {
  const pct = campaign.jumlahTarget > 0 ? Math.round((campaign.jumlahTerkirim / campaign.jumlahTarget) * 100) : 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{campaign.judul}</CardTitle>
        <CardDescription className="capitalize">
          {campaign.formulaVersi ?? "helix-v2"} · Status: {campaign.status}
          {campaign.fairnessScore != null && ` · Kemerataan RT ${campaign.fairnessScore}/100`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={pct} className="h-2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-sm">
          <div>
            <p className="font-semibold text-[hsl(163,55%,22%)]">{campaign.jumlahTerkirim}</p>
            <p className="text-xs text-muted-foreground">Terkirim</p>
          </div>
          <div>
            <p className="font-semibold">{campaign.jumlahMenunggu}</p>
            <p className="text-xs text-muted-foreground">Menunggu</p>
          </div>
          <div>
            <p className="font-semibold text-destructive">{campaign.jumlahGagal}</p>
            <p className="text-xs text-muted-foreground">Gagal</p>
          </div>
          <div>
            <p className="font-semibold">{campaign.jumlahTarget}</p>
            <p className="text-xs text-muted-foreground">Target</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaign.status === "berjalan" ? (
            <Button size="sm" variant="outline" onClick={onJeda}>
              <Pause className="w-3.5 h-3.5 mr-1" /> Jeda
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={onLanjut}>
              <Play className="w-3.5 h-3.5 mr-1" /> Lanjutkan
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={onBatalkan}>
            <XCircle className="w-3.5 h-3.5 mr-1" /> Batalkan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
