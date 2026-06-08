import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn, getApiErrorMessage } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { Visitrw3AdminShell, Visitrw3Panel } from "@/components/admin/visitrw3-admin-ui";

type SettingRow = {
  id: number;
  key: string;
  value: string;
  label: string;
  keterangan?: string | null;
};

const FEE_GROUPS: { title: string; description?: string; keys: string[] }[] = [
  {
    title: "Batas ukuran properti (jumlah pintu)",
    description: "Kelompok kecil / sedang / besar untuk kost & kontrakan.",
    keys: ["tier_pintu_sedang_min", "tier_pintu_besar_min"],
  },
  {
    title: "Bisnis — tarif per hari",
    description: "Lapak, kiosk, usaha lain.",
    keys: ["fee_bisnis_lapak_per_hari", "fee_bisnis_kiosk_per_hari", "fee_bisnis_lain_per_hari"],
  },
  {
    title: "Penyewa tinggal — kost (per unit/bulan)",
    keys: ["fee_kost_kecil_per_unit_bulan", "fee_kost_sedang_per_unit_bulan", "fee_kost_besar_per_unit_bulan"],
  },
  {
    title: "Penyewa tinggal — kontrakan (per unit/bulan)",
    keys: [
      "fee_kontrakan_kecil_per_unit_bulan",
      "fee_kontrakan_sedang_per_unit_bulan",
      "fee_kontrakan_besar_per_unit_bulan",
    ],
  },
  {
    title: "Pemilik — lapak & kiosk (per bulan)",
    keys: ["fee_pemilik_lapak_per_bulan", "fee_pemilik_kiosk_per_bulan"],
  },
  {
    title: "Pemilik — kost (per bulan)",
    keys: ["fee_pemilik_kost_kecil_per_bulan", "fee_pemilik_kost_sedang_per_bulan", "fee_pemilik_kost_besar_per_bulan"],
  },
  {
    title: "Pemilik — kontrakan (per bulan)",
    keys: [
      "fee_pemilik_kontrakan_kecil_per_bulan",
      "fee_pemilik_kontrakan_sedang_per_bulan",
      "fee_pemilik_kontrakan_besar_per_bulan",
    ],
  },
];

const TEXT_KEYS = ["tata_tertib_masyarakat", "tata_tertib_penyewa", "tata_tertib_pemilik"] as const;

const ALL_FEE_KEYS = FEE_GROUPS.flatMap((g) => g.keys);

export default function AdminVisitrw3Pengaturan() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<SettingRow[]>({
    queryKey: ["/api/admin/visitrw3/settings"],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 0,
    retry: 1,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/visitrw3/settings/${encodeURIComponent(key)}`, {
        value,
      });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({ title: "Disimpan", description: vars.key });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visitrw3/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/visitrw3/settings"] });
    },
    onError: (e: unknown) => {
      toast({ title: "Gagal menyimpan", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  function valueFor(key: string) {
    if (draft[key] !== undefined) return draft[key];
    return rows.find((r) => r.key === key)?.value ?? "";
  }

  function save(key: string) {
    saveMutation.mutate({ key, value: valueFor(key) });
    setDraft((d) => {
      const next = { ...d };
      delete next[key];
      return next;
    });
  }

  const header = (
    <Visitrw3AdminNav
      title="Pengaturan"
      description="Tarif panduan survey dan tata tertib"
      actions={
        <Button variant="outline" size="sm" className="gap-1" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Muat ulang
        </Button>
      }
    />
  );

  if (isLoading && rows.length === 0 && !isError) {
    return (
      <Visitrw3AdminShell>
        {header}
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Visitrw3AdminShell>
    );
  }

  if (isError && !rows.length) {
    return (
      <Visitrw3AdminShell>
        {header}
        <div className="max-w-3xl space-y-5">
          <Visitrw3Panel>
            <div className="space-y-3">
              <p className="text-sm text-destructive">Gagal memuat pengaturan: {getApiErrorMessage(error)}</p>
              <p className="text-xs text-muted-foreground">
                Pastikan server berjalan dan Anda sudah login sebagai admin. Tabel pengaturan akan dibuat otomatis saat
                dimuat ulang.
              </p>
              <Button onClick={() => refetch()}>Coba lagi</Button>
            </div>
          </Visitrw3Panel>
        </div>
      </Visitrw3AdminShell>
    );
  }

  return (
    <Visitrw3AdminShell>
      {header}

      <div className="max-w-3xl space-y-5">
      <p className="text-sm text-muted-foreground">
        Tarif berjenjang sebagai panduan admin saat survey (lapak/kiosk/lain; kost/kontrakan menurut jumlah pintu).
        Kontribusi aktual diisi saat menyetujui pengajuan di antrian.
      </p>

      {FEE_GROUPS.map((group) => (
        <Visitrw3Panel key={group.title} title={group.title} description={group.description}>
          <div className="space-y-4">
            {group.keys.map((key) => {
              const meta = rows.find((r) => r.key === key);
              return (
                <div key={key} className="space-y-2">
                  <Label>{meta?.label ?? key.replace(/_/g, " ")}</Label>
                  {meta?.keterangan && (
                    <p className="text-xs text-muted-foreground">{meta.keterangan}</p>
                  )}
                  {!meta && (
                    <p className="text-xs text-amber-600">
                      Belum ada di database — isi nilai lalu Simpan untuk membuat entri.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={valueFor(key)}
                      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                    <Button type="button" onClick={() => save(key)} disabled={saveMutation.isPending}>
                      Simpan
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Visitrw3Panel>
      ))}

      <Visitrw3Panel title="Tata tertib">
        <div className="space-y-6">
          {TEXT_KEYS.map((key) => {
            const meta = rows.find((r) => r.key === key);
            const val = valueFor(key);
            return (
              <div key={key} className="space-y-2">
                <Label>{meta?.label ?? key}</Label>
                <Textarea
                  rows={8}
                  value={val}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                />
                <Button type="button" onClick={() => save(key)} disabled={saveMutation.isPending}>
                  Simpan
                </Button>
              </div>
            );
          })}
        </div>
      </Visitrw3Panel>

      {ALL_FEE_KEYS.some((k) => !rows.find((r) => r.key === k)) && (
        <p className="text-xs text-muted-foreground text-center">
          Beberapa tarif tier belum ter-seed. Klik Muat ulang setelah restart server, atau simpan tiap field di atas.
        </p>
      )}
      </div>
    </Visitrw3AdminShell>
  );
}
