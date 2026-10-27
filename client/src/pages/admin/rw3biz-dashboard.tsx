import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, ClipboardList, Users, Wallet, AlertTriangle, Receipt, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Visitrw3AdminNav } from "@/components/admin/visitrw3-admin-nav";
import {
  Visitrw3AdminShell,
  Visitrw3EmptyState,
  Visitrw3StatCard,
} from "@/components/admin/visitrw3-admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { useVisitrw3AdminCounts } from "@/hooks/use-visitrw3-admin-counts";
import { JENIS_TEMPAT_BIZ_LABEL, bulanIni, formatRp, type JenisTempatBiz } from "@shared/rw3biz-kontribusi";

type UsahaRow = {
  id: number;
  nomorBiz: string;
  nomorInduk?: string | null;
  namaUsaha: string;
  pjNama: string;
  pjNomorWhatsapp: string;
  status: string;
  kontribusiBulanan: number | null;
  persenPekerjaRw3: number | null;
};

export type RabData = {
  periode: string;
  target: number;
  totalPos: number;
  usahaAktif: number;
  usahaBelumDihitung: number;
  proyeksiPenuh: number;
  ditagih: number;
  terbayarTagihan: number;
  realisasiKontribusi: number;
  pemasukanLain: number;
  kekurangan: number;
  voucher: { kontribusi: number; denda: number; terkumpul: number; surplus: number; tersalur: number };
  pos: { id: string; label: string; nominal: number; keterangan?: string; realisasi: number }[];
  pengeluaranLain: number;
  pekerja: { total: number; rw3: number; luar: number; persenRw3: number };
  sebaran: {
    jenis: string;
    jumlah: number;
    rataRata: number;
    terendah: number;
    tertinggi: number;
    bebanPersenOmzet: number;
    terlaluBerat: boolean;
  }[];
  faktor: { sekarang: number; faktor: number; proyeksi: number; tercapai: boolean };
  proyeksiBertahap: { periode: string; total: number }[];
  tunggakan: { jumlahTagihan: number; nominal: number };
  tagihanStatus: { belum: number; sebagian: number; lunas: number; dibebaskan: number };
};

export function useRab(bulan: string) {
  return useQuery<RabData>({
    queryKey: ["/api/admin/rw3biz/rab", bulan],
    queryFn: async () => {
      const res = await fetch(`/api/admin/rw3biz/rab?bulan=${bulan}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat RAB");
      return res.json();
    },
  });
}

function Bar({ nilai, target, tone = "brand" }: { nilai: number; target: number; tone?: "brand" | "gold" }) {
  const persen = target > 0 ? Math.min(100, Math.round((nilai / target) * 100)) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${persen}%`, background: tone === "brand" ? "hsl(163,55%,22%)" : "hsl(40,45%,55%)" }}
      />
    </div>
  );
}

export const labelJenis = (j: string) => JENIS_TEMPAT_BIZ_LABEL[j as JenisTempatBiz] ?? j;

/** Di HP bagian bisa dilipat agar halaman tidak memanjang; di ≥ sm selalu terbuka. */
export function BagianLipat({
  judul,
  judulClassName,
  defaultOpen = false,
  className,
  children,
}: {
  judul: React.ReactNode;
  judulClassName?: string;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className={className}>
      <h2 className={cn("text-sm font-semibold", judulClassName)}>
        <CollapsibleTrigger className="-my-2 flex min-h-11 w-full items-center justify-between gap-2 text-left sm:pointer-events-none sm:my-0 sm:min-h-0">
          <span className="flex min-w-0 items-center gap-1.5">{judul}</span>
          <ChevronDown
            className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform sm:hidden", open && "rotate-180")}
            aria-hidden
          />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent forceMount className="mt-2 data-[state=closed]:hidden sm:data-[state=closed]:block">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function RabKartu({ rab }: { rab: RabData }) {
  const persenRealisasi = rab.target ? Math.round((rab.realisasiKontribusi / rab.target) * 100) : 0;
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Wallet className="w-4 h-4" />
          RAB operasional {rab.periode}
        </h2>
        <p className="text-xs text-muted-foreground">Target {formatRp(rab.target)} / bulan</p>
      </div>

      <div className="space-y-3 text-sm">
        <div className="space-y-1">
          <div className="flex justify-between gap-2">
            <span>Kontribusi masuk kas</span>
            <span className="font-semibold tabular-nums">
              {formatRp(rab.realisasiKontribusi)} <span className="text-xs text-muted-foreground">({persenRealisasi}%)</span>
            </span>
          </div>
          <Bar nilai={rab.realisasiKontribusi} target={rab.target} />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between gap-2">
            <span>Ditagih bulan ini</span>
            <span className="tabular-nums">{formatRp(rab.ditagih)}</span>
          </div>
          <Bar nilai={rab.ditagih} target={rab.target} tone="gold" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Sumbangsih disanggupkan</p>
            <p className="font-semibold tabular-nums">{formatRp(rab.proyeksiPenuh)}</p>
            <p className="text-muted-foreground">{rab.usahaAktif} usaha aktif</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Kekurangan dari target</p>
            <p className="font-semibold tabular-nums">{formatRp(rab.kekurangan)}</p>
            <p className="text-muted-foreground">Pemasukan lain {formatRp(rab.pemasukanLain)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Rata-rata per usaha</p>
            <p className="font-semibold tabular-nums">
              {formatRp(rab.usahaAktif - rab.usahaBelumDihitung > 0 ? rab.proyeksiPenuh / (rab.usahaAktif - rab.usahaBelumDihitung) : 0)}
            </p>
            <p className="text-muted-foreground">sumbangsih / bulan</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-muted-foreground">Tunggakan bulan lalu</p>
            <p className="font-semibold tabular-nums">{formatRp(rab.tunggakan.nominal)}</p>
            <p className="text-muted-foreground">{rab.tunggakan.jumlahTagihan} tagihan</p>
          </div>
        </div>
        <div className="rounded-lg border border-[hsl(40,45%,55%)]/50 bg-[hsl(40,45%,55%)]/10 p-3 text-xs space-y-1">
          <p className="font-medium">Dana voucher belanja warga</p>
          <p>
            Sumbangsih {formatRp(rab.voucher.kontribusi)} + denda {formatRp(rab.voucher.denda)} = {formatRp(rab.voucher.terkumpul)} dari
            kebutuhan {formatRp(rab.target)}.{" "}
            {rab.voucher.surplus > 0 ? (
              <strong>Kelebihan {formatRp(rab.voucher.surplus)} siap dijadikan voucher.</strong>
            ) : (
              "Belum ada kelebihan."
            )}
          </p>
          <p className="text-muted-foreground">
            Voucher dibelanjakan warga di usaha RW3BIZ yang tidak menunggak; saat usaha menukarkan voucher, catat pengeluaran Kas RW
            kategori "Voucher belanja warga"{rab.voucher.tersalur > 0 ? ` (sudah ${formatRp(rab.voucher.tersalur)} bulan ini)` : ""}.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Tagihan {rab.periode}: {rab.tagihanStatus.lunas} lunas · {rab.tagihanStatus.sebagian} cicil ·{" "}
          {rab.tagihanStatus.belum} belum · {rab.tagihanStatus.dibebaskan} dibebaskan
        </p>
        {rab.usahaBelumDihitung > 0 && (
          <p className="flex items-start gap-1 text-xs text-warning">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {rab.usahaBelumDihitung} usaha aktif belum punya sumbangsih (data lama) — lengkapi lewat Tagihan → Ubah sumbangsih.
          </p>
        )}
        {rab.proyeksiPenuh < rab.target && rab.usahaAktif > 0 && (
          <p className="flex items-start gap-1 text-xs text-warning">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Sumbangsih yang disanggupkan belum mencukupi kebutuhan RAB. Ajak usaha yang belum terdaftar untuk mendaftar.
          </p>
        )}
      </div>

      <BagianLipat judul="Realisasi pos anggaran" judulClassName="text-sm sm:text-xs">
        <div className="space-y-2 sm:space-y-1.5">
          {rab.pos.map((p) => (
            <div key={p.id} className="space-y-0.5">
              <div className="flex flex-wrap justify-between gap-x-2 text-xs">
                <span className="min-w-0 break-words sm:truncate">{p.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatRp(p.realisasi)} / {formatRp(p.nominal)}
                </span>
              </div>
              <Bar nilai={p.realisasi} target={p.nominal} tone={p.realisasi > p.nominal ? "gold" : "brand"} />
            </div>
          ))}
          {rab.pengeluaranLain > 0 && (
            <p className="text-xs text-muted-foreground">Pengeluaran di luar pos RAB: {formatRp(rab.pengeluaranLain)}</p>
          )}
        </div>
      </BagianLipat>
    </div>
  );
}

export default function AdminRw3bizDashboard() {
  const { surveyMenunggu, keberatanMenunggu, isLoading: countsLoading } = useVisitrw3AdminCounts("rw3biz");
  const [bulan, setBulan] = useState(bulanIni());

  const { data: usaha = [], isLoading: usahaLoading } = useQuery<UsahaRow[]>({
    queryKey: ["/api/admin/rw3biz/usaha"],
    queryFn: async () => {
      const res = await fetch("/api/admin/rw3biz/usaha", { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat usaha");
      return res.json();
    },
  });
  const { data: rab, isLoading: rabLoading } = useRab(bulan);

  const loading = countsLoading || usahaLoading;

  return (
    <Visitrw3AdminShell>
      <Visitrw3AdminNav
        product="rw3biz"
        title="RAB & statistik RW3BIZ"
        description="Sumbangsih usaha untuk program RW 03 — Linmas, kebersihan, dana sosial, dan pemeliharaan."
        actions={
          <Input
            type="month"
            aria-label="Bulan RAB"
            value={bulan}
            onChange={(e) => e.target.value && setBulan(e.target.value)}
            className="w-full sm:h-9 sm:w-40"
          />
        }
      />

      {loading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Visitrw3StatCard
              title="Menunggu survey"
              value={String(surveyMenunggu)}
              description="Pengajuan belum diproses"
              icon={ClipboardList}
              tone="warning"
              href={RW3BIZ_ROUTES.admin.antrianSurvey}
            />
            <Visitrw3StatCard
              title="Usaha aktif"
              value={String(usaha.length)}
              description="Sudah disetujui"
              icon={Store}
              tone="success"
            />
            <div className="col-span-2 sm:col-span-1">
              <Visitrw3StatCard
                title="Keberatan tarif"
                value={String(keberatanMenunggu ?? 0)}
                description="Menunggu tanggapan"
                icon={Receipt}
                tone="warning"
                href={RW3BIZ_ROUTES.admin.tagihan}
              />
            </div>
          </div>

          {rabLoading || !rab ? <Skeleton className="h-64 w-full rounded-2xl" /> : <RabKartu rab={rab} />}

          {rab && rab.sebaran.length > 0 && (
            <BagianLipat judul="Sebaran sumbangsih per jenis usaha" className="rounded-2xl border bg-card p-4">
              <ul className="space-y-2 sm:hidden">
                {rab.sebaran.map((s) => (
                  <li key={s.jenis} className="rounded-lg border p-3 text-xs space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-medium">{labelJenis(s.jenis)}</p>
                      <span className="shrink-0 tabular-nums">{s.jumlah} usaha</span>
                    </div>
                    <p>
                      <span className="text-muted-foreground">Rata-rata </span>
                      <span className="tabular-nums font-semibold">{formatRp(s.rataRata)}</span>
                    </p>
                    <p className="tabular-nums">
                      <span className="text-muted-foreground">Rentang </span>
                      {formatRp(s.terendah)}–{formatRp(s.tertinggi)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="text-left">
                      <th className="py-1 pr-2 font-medium">Jenis</th>
                      <th className="py-1 pr-2 font-medium text-right">Usaha</th>
                      <th className="py-1 pr-2 font-medium text-right">Rata-rata</th>
                      <th className="py-1 font-medium text-right">Rentang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rab.sebaran.map((s) => (
                      <tr key={s.jenis} className="border-t">
                        <td className="py-1 pr-2">{labelJenis(s.jenis)}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{s.jumlah}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{formatRp(s.rataRata)}</td>
                        <td className="py-1 text-right tabular-nums">
                          {formatRp(s.terendah)}–{formatRp(s.tertinggi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </BagianLipat>
          )}

          {rab && (
            <BagianLipat judul="Proyeksi 6 bulan (termasuk keringanan)" className="rounded-2xl border bg-card p-4">
              <div className="space-y-2 sm:space-y-1">
                {rab.proyeksiBertahap.map((b) => (
                  <div key={b.periode} className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{b.periode}</span>
                    <Bar nilai={b.total} target={rab.target} />
                    <span className="text-right tabular-nums">{formatRp(b.total)}</span>
                  </div>
                ))}
              </div>
            </BagianLipat>
          )}

          <div className="rounded-2xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Usaha aktif terbaru
              </h2>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                <Button size="sm" variant="outline" className="sm:h-8 sm:text-xs" asChild>
                  <Link href={RW3BIZ_ROUTES.admin.tagihan}>Tagihan</Link>
                </Button>
                <Button size="sm" variant="outline" className="sm:h-8 sm:text-xs" asChild>
                  <Link href={RW3BIZ_ROUTES.admin.antrianSudah}>Riwayat</Link>
                </Button>
              </div>
            </div>
            {usaha.length === 0 ? (
              <Visitrw3EmptyState
                icon={Store}
                title="Belum ada usaha aktif"
                description="Usaha muncul di sini setelah pengajuan RW3BIZ disetujui."
              />
            ) : (
              <ul className="space-y-2">
                {usaha.slice(0, 8).map((u) => (
                  <li
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium break-words sm:truncate">{u.namaUsaha}</p>
                      <p className="text-xs text-muted-foreground font-mono sm:text-[11px]">
                        {u.nomorInduk ? `${u.nomorInduk} · ` : ""}
                        {u.nomorBiz}
                      </p>
                    </div>
                    <div className="min-w-0 text-xs sm:text-right">
                      <p className="font-semibold tabular-nums">
                        {u.kontribusiBulanan != null ? `${formatRp(u.kontribusiBulanan)}/bln` : "Belum ada"}
                      </p>
                      <p className="text-muted-foreground">PJ: {u.pjNama}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Visitrw3AdminShell>
  );
}
