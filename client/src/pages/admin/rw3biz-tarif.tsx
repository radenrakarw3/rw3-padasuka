import { useEffect, useId, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, Plus, Save, Trash2 } from "lucide-react";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import { Visitrw3AdminShell } from "@/components/admin/visitrw3-admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getApiErrorMessage, queryClient, readJsonSafely } from "@/lib/queryClient";
import { useTarifAdmin } from "@/components/rw3biz/koreksi-kontribusi";
import {
  JENIS_PELANGGARAN_INFO,
  TINGKAT_PELANGGARAN,
  TINGKAT_PELANGGARAN_LABEL,
  formatRp,
  hitungDendaPelanggaran,
  type TarifKontribusi,
} from "@shared/rw3biz-kontribusi";

function Angka({
  label,
  value,
  onChange,
  hint,
  desimal,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  desimal?: boolean;
}) {
  const id = useId();
  const [teks, setTeks] = useState(String(value));
  useEffect(() => setTeks(String(value)), [value]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] items-center gap-x-3 gap-y-1 sm:block sm:space-y-1">
      <Label htmlFor={id} className="text-sm leading-snug sm:text-xs">
        {label}
      </Label>
      <Input
        id={id}
        className="text-right tabular-nums sm:h-9 sm:text-left sm:text-sm"
        inputMode={desimal ? "decimal" : "numeric"}
        value={teks}
        onChange={(e) => {
          const v = desimal ? e.target.value.replace(",", ".").replace(/[^\d.]/g, "") : e.target.value.replace(/\D/g, "");
          setTeks(v);
          const n = Number(v);
          if (v !== "" && Number.isFinite(n)) onChange(n);
        }}
      />
      {hint && <p className="col-span-2 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Di HP tiap bagian bisa dilipat (default tertutup) agar halaman tidak ribuan piksel; di ≥ sm selalu terbuka. */
function Bagian({
  judul,
  keterangan,
  defaultOpen = false,
  children,
}: {
  judul: string;
  keterangan?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible asChild open={open} onOpenChange={setOpen}>
      <section className="rounded-2xl border bg-card p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold">
            <CollapsibleTrigger className="-my-2 flex min-h-11 w-full items-center justify-between gap-2 text-left sm:pointer-events-none sm:my-0 sm:min-h-0">
              <span className="min-w-0">{judul}</span>
              <ChevronDown
                className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform sm:hidden", open && "rotate-180")}
                aria-hidden
              />
            </CollapsibleTrigger>
          </h2>
          {keterangan && <p className={cn("text-xs text-muted-foreground", !open && "hidden sm:block")}>{keterangan}</p>}
        </div>
        <CollapsibleContent forceMount className="space-y-3 data-[state=closed]:hidden sm:data-[state=closed]:block">
          {children}
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}

export default function AdminRw3bizTarif() {
  const { toast } = useToast();
  const { data: tersimpan, isLoading } = useTarifAdmin();
  const [t, setT] = useState<TarifKontribusi | null>(null);
  const [pengulanganTeks, setPengulanganTeks] = useState("");

  useEffect(() => {
    if (!tersimpan) return;
    setT(tersimpan);
    setPengulanganTeks(tersimpan.dendaPengulangan.join(", "));
  }, [tersimpan]);

  const ubah = (patch: Partial<TarifKontribusi>) => setT((prev) => (prev ? { ...prev, ...patch } : prev));

  const totalPos = useMemo(() => (t ? t.posAnggaran.reduce((s, p) => s + p.nominal, 0) : 0), [t]);
  const draft = () => {
    if (!t) return null;
    const dendaPengulangan = pengulanganTeks
      .split(/[,\s]+/)
      .filter(Boolean)
      .map((s) => Number(s.replace(",", ".")))
      .filter((n) => Number.isFinite(n) && n >= 0 && n <= 10);
    return { ...t, dendaPengulangan: dendaPengulangan.length ? dendaPengulangan : t.dendaPengulangan };
  };
  const berubah = JSON.stringify(draft()) !== JSON.stringify(tersimpan);

  const simpanMutation = useMutation({
    mutationFn: async () => readJsonSafely<TarifKontribusi>(await apiRequest("PUT", "/api/admin/rw3biz/settings", draft())),
    onSuccess: (baru) => {
      queryClient.setQueryData(["/api/admin/rw3biz/settings"], baru);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rw3biz/rab"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/rw3biz/tarif"] });
      toast({
        title: "Pengaturan tersimpan",
        description: "Daftar program langsung tampil di form online & formulir kertas. Tagihan yang sudah dibuat tidak berubah.",
      });
    },
    onError: (e: unknown) => toast({ title: "Gagal menyimpan", description: getApiErrorMessage(e), variant: "destructive" }),
  });

  if (isLoading || !t) {
    return (
      <Visitrw3AdminShell>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </Visitrw3AdminShell>
    );
  }

  const ubahPos = (i: number, patch: Partial<TarifKontribusi["posAnggaran"][number]>) =>
    ubah({ posAnggaran: t.posAnggaran.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="Program & denda"
        description="Daftar program RW 03 yang bisa didukung lewat sumbangsih, serta aturan denda razia & pelanggaran."
        actions={
          <div className="hidden gap-2 sm:flex">
            <Button className="h-9 gap-1" disabled={!berubah || simpanMutation.isPending} onClick={() => simpanMutation.mutate()}>
              <Save className="w-4 h-4" /> Simpan
            </Button>
          </div>
        }
      />

      <p className="text-xs text-muted-foreground sm:hidden">Ketuk judul bagian untuk membuka dan mengubah angka.</p>

      <div className="space-y-4">
        <Bagian
          defaultOpen
          judul="Target & tenggang"
          keterangan="Sumbangsih tidak dihitung rumus: pengusaha menentukan sendiri nominal per program. Target hanya pembanding di laporan RAB."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Angka label="Kebutuhan RAB / bulan" value={t.targetBulanan} onChange={(n) => ubah({ targetBulanan: n })} />
            <Angka label="Tenggang setor (hari)" value={t.tenggangHari} onChange={(n) => ubah({ tenggangHari: n })} />
          </div>
        </Bagian>

        <Bagian
          judul="Denda razia"
          keterangan="Kendaraan tidak terdaftar saat razia: denda = pengali × dasar denda jenis kendaraan. Bisa diubah per temuan."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Angka label="Dasar motor" value={t.kendaraanMotor} onChange={(n) => ubah({ kendaraanMotor: n })} />
            <Angka label="Dasar mobil / minibus" value={t.kendaraanMobil} onChange={(n) => ubah({ kendaraanMobil: n })} />
            <Angka label="Dasar kolbak / pick-up" value={t.kendaraanKolbak} onChange={(n) => ubah({ kendaraanKolbak: n })} />
            <Angka label="Dasar truk engkel / sedang" value={t.kendaraanTruk} onChange={(n) => ubah({ kendaraanTruk: n })} />
            <Angka label="Dasar truk besar" value={t.kendaraanTrukBesar} onChange={(n) => ubah({ kendaraanTrukBesar: n })} />
            <Angka
              label="Pengali denda"
              value={t.dendaRaziaKali}
              onChange={(n) => ubah({ dendaRaziaKali: n })}
              desimal
              hint={`Truk besar: ${formatRp(Math.round(t.kendaraanTrukBesar * t.dendaRaziaKali))}`}
            />
          </div>
        </Bagian>

        <Bagian
          judul="Denda pelanggaran (aduan warga & temuan petugas)"
          keterangan="Denda = dasar jenis × tingkat × pengulangan dalam 12 bulan, dibulatkan, paling banyak batas maksimal. Pengali pengulangan juga berlaku untuk razia (minimal 1×)."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {(Object.keys(t.dendaPelanggaran) as (keyof TarifKontribusi["dendaPelanggaran"])[]).map((j) => (
              <Angka
                key={j}
                label={JENIS_PELANGGARAN_INFO[j].label}
                value={t.dendaPelanggaran[j]}
                onChange={(n) => ubah({ dendaPelanggaran: { ...t.dendaPelanggaran, [j]: n } })}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            {TINGKAT_PELANGGARAN.map((k) => (
              <Angka
                key={k}
                label={`Pengali ${TINGKAT_PELANGGARAN_LABEL[k].toLowerCase()}`}
                value={t.dendaTingkat[k]}
                desimal
                onChange={(n) => ubah({ dendaTingkat: { ...t.dendaTingkat, [k]: n } })}
              />
            ))}
            <Angka label="Denda maksimal" value={t.dendaMaks} onChange={(n) => ubah({ dendaMaks: n })} />
          </div>
          <div className="space-y-1">
            <Label className="text-sm sm:text-xs">Pengali pelanggaran ke-1, ke-2, … (0 = teguran tertulis)</Label>
            <Input
              className="sm:h-9 sm:text-sm sm:w-64"
              value={pengulanganTeks}
              onChange={(e) => setPengulanganTeks(e.target.value)}
              placeholder="0, 1, 2, 3"
            />
            <p className="text-xs text-muted-foreground">
              Angka terakhir berlaku untuk pelanggaran seterusnya. Contoh sampah tercecer sedang ke-3:{" "}
              {formatRp(hitungDendaPelanggaran({ jenis: "sampah_tercecer", tingkat: "sedang", keBerapa: 3 }, draft() ?? t).denda)}.
            </p>
          </div>
        </Bagian>

        <Bagian
          defaultOpen
          judul="Program RW 03 (pilihan sumbangsih)"
          keterangan="Daftar ini tampil di form online & formulir kertas sebagai program yang bisa didukung pengusaha. Nominal = kebutuhan per bulan. Nama program juga dipakai sebagai kategori pengeluaran Kas RW."
        >
          <div className="space-y-2">
            {t.posAnggaran.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_1fr_8rem_auto] sm:rounded-none sm:border-0 sm:p-0"
              >
                <Input
                  className="order-1 font-medium sm:h-9 sm:text-sm sm:font-normal"
                  aria-label="Nama pos"
                  value={p.label}
                  onChange={(e) => ubahPos(i, { label: e.target.value })}
                  placeholder="Nama pos"
                />
                <Input
                  className="order-3 col-span-2 sm:order-2 sm:col-span-1 sm:h-9 sm:text-sm"
                  aria-label="Keterangan pos"
                  value={p.keterangan ?? ""}
                  onChange={(e) => ubahPos(i, { keterangan: e.target.value })}
                  placeholder="Keterangan"
                />
                <div className="order-4 col-span-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:order-3 sm:col-span-1 sm:block">
                  <span className="text-sm text-muted-foreground sm:hidden">Nominal (Rp)</span>
                  <Input
                    className="text-right tabular-nums sm:h-9 sm:text-left sm:text-sm"
                    aria-label="Nominal pos (Rp)"
                    inputMode="numeric"
                    value={String(p.nominal)}
                    onChange={(e) => ubahPos(i, { nominal: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="order-2 text-destructive sm:order-4 sm:h-9 sm:w-9 sm:text-foreground"
                  onClick={() => ubah({ posAnggaran: t.posAnggaran.filter((_, j) => j !== i) })}
                  aria-label="Hapus pos"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 sm:w-auto"
              onClick={() =>
                ubah({ posAnggaran: [...t.posAnggaran, { id: `pos_${Date.now()}`, label: "", nominal: 0 }] })
              }
            >
              <Plus className="w-4 h-4" /> Tambah pos
            </Button>
            <p className={`text-sm ${totalPos === t.targetBulanan ? "text-success" : "text-warning"}`}>
              Total kebutuhan program {formatRp(totalPos)} {totalPos === t.targetBulanan ? "= target" : `≠ target ${formatRp(t.targetBulanan)}`}
            </p>
          </div>
        </Bagian>
      </div>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-1 space-y-1 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur sm:hidden">
        {berubah && <p className="px-1 text-xs font-medium text-warning">Ada perubahan yang belum disimpan.</p>}
        <Button className="w-full gap-1" disabled={!berubah || simpanMutation.isPending} onClick={() => simpanMutation.mutate()}>
          <Save className="w-4 h-4" /> Simpan
        </Button>
      </div>
    </Visitrw3AdminShell>
  );
}
