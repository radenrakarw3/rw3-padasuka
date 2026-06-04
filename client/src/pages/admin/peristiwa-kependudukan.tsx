import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Baby,
  LogIn,
  LogOut,
  HeartPulse,
  Search,
  ChevronRight,
} from "lucide-react";
import { KependudukanAdminNav } from "@/components/admin/kependudukan-admin-nav";
import { StatusKependudukanBadge } from "@/components/kependudukan/status-kependudukan-badge";
import {
  WargaFormFields,
  defaultWargaForm,
  toWargaPayload,
  validateWargaFormData,
  type WargaFormValues,
  type WargaWithKk,
} from "@/components/kependudukan/warga-form";
import {
  PERISTIWA_KEPENDUDUKAN,
  STATUS_KEPENDUDUKAN_LAHIR,
  STATUS_KEPENDUDUKAN_MENINGGAL,
  STATUS_KEPENDUDUKAN_PINDAH_KELUAR,
  STATUS_KEPENDUDUKAN_PINDAH_MASUK,
  isWargaDomisiliAktif,
  labelStatusKependudukan,
  type PeristiwaKependudukanType,
} from "@shared/kependudukan-peristiwa";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import type { KartuKeluarga } from "@shared/schema";
import { jenisKelaminOptions, rtOptions } from "@/lib/constants";

const ICONS: Record<PeristiwaKependudukanType, typeof Baby> = {
  lahir: Baby,
  pindah_masuk: LogIn,
  pindah_keluar: LogOut,
  meninggal: HeartPulse,
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Terjadi kesalahan";
}

export default function AdminPeristiwaKependudukan() {
  const { toast } = useToast();
  const [tab, setTab] = useState<PeristiwaKependudukanType>("lahir");
  const [lahirForm, setLahirForm] = useState<WargaFormValues>(() => ({
    ...defaultWargaForm,
    statusKependudukan: STATUS_KEPENDUDUKAN_LAHIR,
    kedudukanKeluarga: "Anak",
    punyaAktaLahir: false,
    punyaKia: false,
  }));
  const [masukForm, setMasukForm] = useState<WargaFormValues>(() => ({
    ...defaultWargaForm,
    statusKependudukan: STATUS_KEPENDUDUKAN_PINDAH_MASUK,
  }));
  const [kkSearch, setKkSearch] = useState("");
  const [kkDropdownOpen, setKkDropdownOpen] = useState(false);
  const kkPickerRef = useRef<HTMLDivElement>(null);
  const [masukKkSearch, setMasukKkSearch] = useState("");
  const [masukKkDropdownOpen, setMasukKkDropdownOpen] = useState(false);
  const masukKkPickerRef = useRef<HTMLDivElement>(null);

  const [wargaSearch, setWargaSearch] = useState("");
  const [selectedWarga, setSelectedWarga] = useState<WargaWithKk | null>(null);
  const [confirmKeluar, setConfirmKeluar] = useState(false);
  const [confirmMeninggal, setConfirmMeninggal] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (kkPickerRef.current && !kkPickerRef.current.contains(e.target as Node)) {
        setKkDropdownOpen(false);
      }
      if (masukKkPickerRef.current && !masukKkPickerRef.current.contains(e.target as Node)) {
        setMasukKkDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: kkList } = useQuery<KartuKeluarga[]>({ queryKey: ["/api/kk"] });
  const { data: wargaList } = useQuery<WargaWithKk[]>({ queryKey: ["/api/warga-with-kk"] });

  const lahirErrors = useMemo(() => validateWargaFormData(lahirForm), [lahirForm]);
  const masukErrors = useMemo(() => validateWargaFormData(masukForm), [masukForm]);

  const filteredWargaPick = useMemo(() => {
    const q = wargaSearch.toLowerCase().trim();
    if (!q) return [];
    return (
      wargaList?.filter((w) => {
        if (w.rt != null && !rtOptions.includes(w.rt as (typeof rtOptions)[number])) return false;
        if (!isWargaDomisiliAktif(w.statusKependudukan)) return false;
        return (
          (w.namaLengkap || "").toLowerCase().includes(q) ||
          (w.nik || "").includes(wargaSearch) ||
          (w.nomorKk || "").includes(wargaSearch)
        );
      }) ?? []
    ).slice(0, 12);
  }, [wargaSearch, wargaList]);

  const arsipPeristiwa = useMemo(() => {
    return (
      wargaList?.filter((w) => {
        if (w.rt != null && !rtOptions.includes(w.rt as (typeof rtOptions)[number])) return false;
        return !isWargaDomisiliAktif(w.statusKependudukan);
      }) ?? []
    ).sort((a, b) => (a.namaLengkap || "").localeCompare(b.namaLengkap || ""));
  }, [wargaList]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/warga-with-kk"] });
    queryClient.invalidateQueries({ queryKey: ["/api/warga"] });
    queryClient.invalidateQueries({ queryKey: ["/api/kk"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats/kependudukan"] });
  };

  const createMutation = useMutation({
    mutationFn: async (form: WargaFormValues) => {
      await apiRequest("POST", "/api/warga", toWargaPayload(form));
    },
    onSuccess: (_, form) => {
      toast({
        title: "Peristiwa tercatat",
        description: `${form.namaLengkap} — ${labelStatusKependudukan(form.statusKependudukan)}`,
      });
      if (form.statusKependudukan === STATUS_KEPENDUDUKAN_LAHIR) {
        setLahirForm({
          ...defaultWargaForm,
          statusKependudukan: STATUS_KEPENDUDUKAN_LAHIR,
          kedudukanKeluarga: "Anak",
        });
        setKkSearch("");
      } else {
        setMasukForm({
          ...defaultWargaForm,
          statusKependudukan: STATUS_KEPENDUDUKAN_PINDAH_MASUK,
        });
        setMasukKkSearch("");
      }
      invalidateAll();
    },
    onError: (e) => toast({ title: "Gagal", description: getErrorMessage(e), variant: "destructive" }),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      statusKependudukan,
    }: {
      id: number;
      statusKependudukan: string;
    }) => {
      await apiRequest("PATCH", `/api/warga/${id}`, { statusKependudukan });
    },
    onSuccess: (_, { statusKependudukan }) => {
      toast({ title: "Status diperbarui", description: labelStatusKependudukan(statusKependudukan) });
      setSelectedWarga(null);
      setWargaSearch("");
      setConfirmKeluar(false);
      setConfirmMeninggal(false);
      invalidateAll();
    },
    onError: (e) => toast({ title: "Gagal", description: getErrorMessage(e), variant: "destructive" }),
  });

  const aktifkanMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/warga/${id}`, { statusKependudukan: "Aktif" });
    },
    onSuccess: () => {
      toast({ title: "Status diubah menjadi Aktif" });
      invalidateAll();
    },
    onError: (e) => toast({ title: "Gagal", description: getErrorMessage(e), variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <KependudukanAdminNav
        title="Peristiwa Kependudukan"
        description="Catat kelahiran, pindah masuk/keluar, dan kematian — selaras data Disdukcapil/RT"
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as PeristiwaKependudukanType)}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {PERISTIWA_KEPENDUDUKAN.map((p) => {
            const Icon = ICONS[p.type];
            return (
              <TabsTrigger key={p.type} value={p.type} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="w-3.5 h-3.5" />
                {p.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="lahir" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Catat kelahiran</CardTitle>
              <CardDescription>
                Tambah bayi baru ke KK. Status awal <strong>Lahir</strong> — setelah lengkap, ubah ke Aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WargaFormFields
                formData={lahirForm}
                setFormData={setLahirForm}
                errors={lahirErrors}
                testIdPrefix="lahir"
                searchVal={kkSearch}
                setSearchVal={setKkSearch}
                dropdownOpen={kkDropdownOpen}
                setDropdownOpen={setKkDropdownOpen}
                pickerRef={kkPickerRef}
                kkList={kkList}
              />
              <Button
                className="w-full"
                disabled={createMutation.isPending || Object.keys(lahirErrors).length > 0}
                onClick={() => createMutation.mutate(lahirForm)}
              >
                {createMutation.isPending ? "Menyimpan..." : "Simpan catatan kelahiran"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pindah_masuk" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pindah masuk</CardTitle>
              <CardDescription>
                Warga baru datang ke RW/KK ini. Status <strong>Pindah Masuk</strong> sampai data diverifikasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WargaFormFields
                formData={masukForm}
                setFormData={setMasukForm}
                errors={masukErrors}
                testIdPrefix="masuk"
                searchVal={masukKkSearch}
                setSearchVal={setMasukKkSearch}
                dropdownOpen={masukKkDropdownOpen}
                setDropdownOpen={setMasukKkDropdownOpen}
                pickerRef={masukKkPickerRef}
                kkList={kkList}
              />
              <Button
                className="w-full"
                disabled={createMutation.isPending || Object.keys(masukErrors).length > 0}
                onClick={() => createMutation.mutate(masukForm)}
              >
                {createMutation.isPending ? "Menyimpan..." : "Simpan pindah masuk"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pindah_keluar" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pindah keluar</CardTitle>
              <CardDescription>
                Pilih warga yang pindah domisili. Data tetap tersimpan dengan status Pindah Keluar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <WargaPicker
                search={wargaSearch}
                onSearchChange={setWargaSearch}
                rows={filteredWargaPick}
                selected={selectedWarga}
                onSelect={setSelectedWarga}
              />
              <Button
                className="w-full"
                variant="secondary"
                disabled={!selectedWarga}
                onClick={() => setConfirmKeluar(true)}
              >
                Tandai pindah keluar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meninggal" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Meninggal</CardTitle>
              <CardDescription>
                Arsipkan warga yang meninggal dunia. Tidak dihapus dari database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <WargaPicker
                search={wargaSearch}
                onSearchChange={setWargaSearch}
                rows={filteredWargaPick}
                selected={selectedWarga}
                onSelect={setSelectedWarga}
              />
              <Button
                className="w-full"
                variant="destructive"
                disabled={!selectedWarga}
                onClick={() => setConfirmMeninggal(true)}
              >
                Tandai meninggal
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arsip peristiwa</CardTitle>
          <CardDescription>
            Warga non-domisili aktif (pindah keluar, meninggal, dll.) — {arsipPeristiwa.length} orang
          </CardDescription>
        </CardHeader>
        <CardContent>
          {arsipPeristiwa.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada arsip.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {arsipPeristiwa.map((w) => (
                <li
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{w.namaLengkap}</p>
                    <p className="text-xs text-muted-foreground">
                      KK {w.nomorKk ?? "—"} · RT {w.rt != null ? String(w.rt).padStart(2, "0") : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusKependudukanBadge status={w.statusKependudukan} />
                    {(w.statusKependudukan === STATUS_KEPENDUDUKAN_LAHIR ||
                      w.statusKependudukan === STATUS_KEPENDUDUKAN_PINDAH_MASUK) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => aktifkanMutation.mutate(w.id)}
                        disabled={aktifkanMutation.isPending}
                      >
                        Jadikan Aktif
                      </Button>
                    )}
                    <Link href={`/admin/kependudukan/warga`}>
                      <Button size="sm" variant="ghost" className="text-xs h-7 gap-0.5">
                        Detail <ChevronRight className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmKeluar} onOpenChange={setConfirmKeluar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pindah keluar?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedWarga?.namaLengkap}</strong> akan ditandai pindah keluar. Data tidak dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                selectedWarga &&
                statusMutation.mutate({
                  id: selectedWarga.id,
                  statusKependudukan: STATUS_KEPENDUDUKAN_PINDAH_KELUAR,
                })
              }
            >
              Ya, pindah keluar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmMeninggal} onOpenChange={setConfirmMeninggal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Meninggal?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{selectedWarga?.namaLengkap}</strong> akan diarsipkan dengan status Meninggal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                selectedWarga &&
                statusMutation.mutate({
                  id: selectedWarga.id,
                  statusKependudukan: STATUS_KEPENDUDUKAN_MENINGGAL,
                })
              }
            >
              Ya, arsipkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WargaPicker({
  search,
  onSearchChange,
  rows,
  selected,
  onSelect,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  rows: WargaWithKk[];
  selected: WargaWithKk | null;
  onSelect: (w: WargaWithKk | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Cari warga (nama / NIK / KK)</Label>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            onSelect(null);
          }}
          placeholder="Ketik untuk mencari..."
          className="pl-9"
        />
      </div>
      {selected && (
        <div className="rounded-md border bg-muted/40 p-3 flex justify-between items-center gap-2">
          <div>
            <p className="font-medium text-sm">{selected.namaLengkap}</p>
            <p className="text-xs text-muted-foreground">
              NIK {selected.nik} · {selected.kedudukanKeluarga}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onSelect(null)}>
            Ganti
          </Button>
        </div>
      )}
      {!selected && search.trim() && (
        <ul className="border rounded-md max-h-48 overflow-y-auto divide-y">
          {rows.length === 0 ? (
            <li className="p-3 text-sm text-muted-foreground">Tidak ditemukan</li>
          ) : (
            rows.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  onClick={() => onSelect(w)}
                >
                  <span className="font-medium">{w.namaLengkap}</span>
                  <span className="text-muted-foreground text-xs block">
                    KK {w.nomorKk} · {w.jenisKelamin || jenisKelaminOptions[0]}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
