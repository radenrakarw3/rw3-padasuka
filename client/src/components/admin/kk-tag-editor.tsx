import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage } from "@/lib/queryClient";
import {
  KK_TAG_KATEGORI,
  parseKkLabelRw,
  serializeKkLabelRw,
} from "@shared/kk-label-rw";
import { KkTagBadge, KkTagList } from "@/components/admin/kk-tag-badges";
import { cn } from "@/lib/utils";

type Props = {
  kkId: number;
  labelRw: string | null | undefined;
  /** Compact: badges + tombol kelola (untuk kartu cari warga). */
  ringkas?: boolean;
  className?: string;
  /** Query keys tambahan yang di-invalidate setelah simpan. */
  invalidateKeys?: unknown[][];
};

export function KkTagEditor({ kkId, labelRw, ringkas = false, className, invalidateKeys = [] }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const awal = useMemo(() => parseKkLabelRw(labelRw), [labelRw]);
  const [tags, setTags] = useState<string[]>(awal);
  const [buka, setBuka] = useState(!ringkas);
  const [kustom, setKustom] = useState("");

  useEffect(() => {
    setTags(parseKkLabelRw(labelRw));
  }, [labelRw, kkId]);

  const dirty =
    JSON.stringify([...tags].sort()) !== JSON.stringify([...awal].sort());

  const simpan = useMutation({
    mutationFn: async (next: string[]) => {
      const res = await apiRequest("PATCH", `/api/kk/${kkId}`, {
        labelRw: serializeKkLabelRw(next),
      });
      return res.json();
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["/api/kk"] }),
        qc.invalidateQueries({ queryKey: ["/api/kk", kkId] }),
        qc.invalidateQueries({ queryKey: [`/api/wilayah/keluarga/${kkId}`] }),
        qc.invalidateQueries({ queryKey: ["/api/wilayah/keluarga", kkId] }),
        ...invalidateKeys.map((k) => qc.invalidateQueries({ queryKey: k })),
      ]);
      toast({ title: "Tag keluarga disimpan" });
      if (ringkas) setBuka(false);
    },
    onError: (e) => {
      toast({
        title: "Gagal menyimpan tag",
        description: getApiErrorMessage(e),
        variant: "destructive",
      });
    },
  });

  function toggle(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function tambahKustom() {
    const t = kustom.trim().slice(0, 80);
    if (!t) return;
    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setKustom("");
  }

  const panel = (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Tag terpasang</p>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada tag — pilih di bawah untuk menilai & menandai tindak lanjut.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <KkTagBadge key={t} tag={t} onRemove={() => toggle(t)} />
            ))}
          </div>
        )}
      </div>

      <Accordion type="multiple" defaultValue={["tindakan", "proses"]} className="space-y-1">
        {KK_TAG_KATEGORI.map((kat) => {
          const aktif = kat.tags.filter((t) => tags.includes(t)).length;
          return (
            <AccordionItem key={kat.id} value={kat.id} className="border rounded-lg px-2">
              <AccordionTrigger className="py-2 text-left text-sm hover:no-underline">
                <span className="min-w-0">
                  <span className="font-semibold">{kat.label}</span>
                  {aktif > 0 && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{aktif} dipilih</span>
                  )}
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{kat.deskripsi}</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {kat.tags.map((t) => {
                    const on = tags.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggle(t)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          on
                            ? "border-brand bg-brand/10 font-semibold text-brand"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {on ? "✓ " : ""}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="space-y-1.5">
        <Label htmlFor={`kk-tag-kustom-${kkId}`} className="text-xs">
          Tag kustom (opsional)
        </Label>
        <div className="flex gap-2">
          <Input
            id={`kk-tag-kustom-${kkId}`}
            value={kustom}
            onChange={(e) => setKustom(e.target.value)}
            placeholder="Mis. Pantau Ramadan 2026"
            maxLength={80}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tambahKustom();
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={tambahKustom} disabled={!kustom.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!dirty || simpan.isPending}
          onClick={() => simpan.mutate(tags)}
          className="gap-1"
        >
          {simpan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Simpan tag
        </Button>
        {dirty && (
          <Button type="button" size="sm" variant="ghost" disabled={simpan.isPending} onClick={() => setTags(awal)}>
            Batal
          </Button>
        )}
      </div>
    </div>
  );

  if (!ringkas) {
    return (
      <section className={cn("rounded-xl border bg-card p-3 sm:p-4 space-y-3", className)}>
        <div className="flex items-center gap-2">
          <Tags className="h-4 w-4 text-brand" />
          <div>
            <p className="text-sm font-semibold">Tag keluarga (internal RW)</p>
            <p className="text-xs text-muted-foreground">Menilai kondisi & menandai apa yang akan Anda lakukan — tidak tampil ke warga.</p>
          </div>
        </div>
        {panel}
      </section>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <KkTagList tags={awal} />
        {!awal.length && <span className="text-xs text-muted-foreground">Belum ada tag</span>}
        <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setBuka((v) => !v)}>
          <Tags className="h-3.5 w-3.5" />
          {buka ? "Tutup" : "Kelola tag"}
        </Button>
      </div>
      {buka && <div className="rounded-lg border bg-muted/20 p-3">{panel}</div>}
    </div>
  );
}
