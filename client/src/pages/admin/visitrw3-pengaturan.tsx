import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn, getApiErrorMessage } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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

const TEXT_KEYS = ["tata_tertib_masyarakat", "tata_tertib_penyewa"] as const;

const LABEL_OVERRIDE: Partial<Record<(typeof TEXT_KEYS)[number], string>> = {
  tata_tertib_penyewa: "Tata tertib warga singgah",
};

export default function AdminVisitrw3Pengaturan() {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading, refetch, isFetching } = useQuery<SettingRow[]>({
    queryKey: ["/api/admin/visitrw3/settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));

  const mutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("PATCH", `/api/admin/visitrw3/settings/${encodeURIComponent(key)}`, { value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/visitrw3/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/visitrw3/settings"] });
      toast({ title: "Pengaturan disimpan" });
    },
    onError: (e: Error) => {
      toast({ title: "Gagal menyimpan", description: getApiErrorMessage(e), variant: "destructive" });
    },
  });

  function valueOf(key: string) {
    return drafts[key] ?? byKey[key]?.value ?? "";
  }

  function displayLabel(key: (typeof TEXT_KEYS)[number]) {
    return LABEL_OVERRIDE[key] ?? byKey[key]?.label ?? key;
  }

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        title="Pengaturan"
        description="Tata tertib yang ditampilkan di formulir publik Visit RW3"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-1.5">Muat ulang</span>
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <Visitrw3Panel title="Tata tertib">
          <div className="space-y-6">
            {TEXT_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Label>{displayLabel(key)}</Label>
                {byKey[key]?.keterangan ? (
                  <p className="text-xs text-muted-foreground">{byKey[key].keterangan}</p>
                ) : null}
                <Textarea
                  rows={6}
                  value={valueOf(key)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={mutation.isPending || valueOf(key) === (byKey[key]?.value ?? "")}
                  onClick={() => mutation.mutate({ key, value: valueOf(key) })}
                >
                  Simpan
                </Button>
              </div>
            ))}
          </div>
        </Visitrw3Panel>
      )}
    </Visitrw3AdminShell>
  );
}
