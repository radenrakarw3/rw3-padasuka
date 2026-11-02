import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { WARGA_DATA_ISSUE_DEFS, resolveWaVerifikasi } from "@shared/warga-data-issues";
import {
  buildVerifikasiReport,
  filterVerifikasiRows,
  ringkasKurang,
  type VerifikasiFilter,
  type VerifikasiKelengkapanSlice,
} from "@shared/verifikasi-kelengkapan";
import { WargaDataIssueEditDialog } from "@/components/admin/warga-data-issue-edit-dialog";
import {
  HubungiWargaButton,
  HubungiWargaDialog,
  type HubungiWargaTarget,
} from "@/components/admin/hubungi-warga-dialog";
import { VerifikasiTanpaWaCetak } from "@/components/admin/verifikasi-tanpa-wa-cetak";
import { BagianStat, StatBaris, StatKartu, formatNumber } from "@/components/admin/kependudukan-stats-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  warga: VerifikasiKelengkapanSlice[];
  polos?: boolean;
  /** Filter RT halaman (untuk cetak per RT). */
  rtFilter?: number;
};

const KELAS_CHIP =
  "shrink-0 rounded-full min-h-10 px-4 text-sm font-medium border transition-colors sm:min-h-0 sm:px-3 sm:py-1 sm:text-xs";
const PER_HALAMAN = 20;

function Meter({ label, persen }: { label: string; persen: number }) {
  const warna =
    persen >= 90
      ? "bg-[hsl(163,55%,32%)]"
      : persen >= 60
        ? "bg-amber-500"
        : "bg-rose-500";
  return (
    <div className="min-w-[6.5rem] space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span
          className={cn(
            "text-xs font-semibold tabular-nums",
            persen >= 90 && "text-[hsl(163,55%,28%)]",
          )}
        >
          {persen}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", warna)} style={{ width: `${Math.min(100, persen)}%` }} />
      </div>
    </div>
  );
}

export function KependudukanDataIssues({ warga, polos, rtFilter }: Props) {
  const [filter, setFilter] = useState<VerifikasiFilter>("semua");
  const [editRow, setEditRow] = useState<VerifikasiKelengkapanSlice | null>(null);
  const [hubungiTarget, setHubungiTarget] = useState<HubungiWargaTarget | null>(null);
  const [batasTampil, setBatasTampil] = useState(PER_HALAMAN);

  const pilihFilter = (f: VerifikasiFilter) => {
    setFilter(f);
    setBatasTampil(PER_HALAMAN);
  };

  const report = useMemo(() => buildVerifikasiReport(warga), [warga]);
  const tanpaWaRows = useMemo(
    () => filterVerifikasiRows(report.rows, "tanpa_wa", warga),
    [report.rows, warga],
  );
  const filteredRows = useMemo(
    () => filterVerifikasiRows(report.rows, filter, warga),
    [filter, report.rows, warga],
  );

  return (
    <BagianStat
      polos={polos}
      title="Daftar perlu perbaikan"
      description="Warga dengan data belum lengkap atau belum selaras. Yang sudah lengkap tidak ditampilkan."
    >
      <div className="space-y-4">
        <StatBaris cols={3}>
          <StatKartu
            label="Perlu verifikasi"
            value={formatNumber(report.totalPerlu)}
            description={`dari ${formatNumber(report.totalAktif)} warga aktif`}
          />
          <StatKartu
            label="Kelengkapan rata-rata"
            value={`${report.rataPribadi}%`}
            description="Field wajib warga yang sudah terisi"
          />
          <StatKartu
            label="Tanpa kontak WA"
            value={formatNumber(tanpaWaRows.length)}
            description={`${formatNumber(report.rows.length - tanpaWaRows.length)} bisa dihubungi WA`}
            tone={tanpaWaRows.length > 0 ? "warning" : undefined}
          />
        </StatBaris>

        {tanpaWaRows.length > 0 && (
          <VerifikasiTanpaWaCetak rows={tanpaWaRows} rtFilter={rtFilter} />
        )}

        {report.totalPerlu > 0 && (
          <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
            <button
              type="button"
              onClick={() => pilihFilter("semua")}
              className={cn(
                KELAS_CHIP,
                filter === "semua"
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-brand/40",
              )}
            >
              Semua ({formatNumber(report.totalPerlu)})
            </button>
            {tanpaWaRows.length > 0 && (
              <button
                type="button"
                onClick={() => pilihFilter(filter === "tanpa_wa" ? "semua" : "tanpa_wa")}
                className={cn(
                  KELAS_CHIP,
                  filter === "tanpa_wa"
                    ? "bg-brand text-brand-foreground border-brand"
                    : "bg-amber-50 text-amber-900 border-amber-300 hover:border-amber-400",
                )}
              >
                Tanpa WA ({formatNumber(tanpaWaRows.length)})
              </button>
            )}
            <button
              type="button"
              onClick={() => pilihFilter(filter === "pribadi" ? "semua" : "pribadi")}
              className={cn(
                KELAS_CHIP,
                filter === "pribadi"
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-brand/40",
              )}
            >
              Data pribadi ({formatNumber(report.kurangPribadiCount)})
            </button>
            <button
              type="button"
              onClick={() => pilihFilter(filter === "keluarga" ? "semua" : "keluarga")}
              className={cn(
                KELAS_CHIP,
                filter === "keluarga"
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-brand/40",
              )}
            >
              Data keluarga ({formatNumber(report.kurangKeluargaCount)})
            </button>
            <button
              type="button"
              onClick={() => pilihFilter(filter === "isu" ? "semua" : "isu")}
              className={cn(
                KELAS_CHIP,
                filter === "isu"
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-brand/40",
              )}
            >
              Isu statistik ({formatNumber(report.isuCount)})
            </button>
            {WARGA_DATA_ISSUE_DEFS.map((def) => {
              const n = report.counts[def.id];
              if (n === 0) return null;
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => pilihFilter(filter === def.id ? "semua" : def.id)}
                  className={cn(
                    KELAS_CHIP,
                    filter === def.id
                      ? "bg-brand text-brand-foreground border-brand"
                      : "bg-muted/40 text-muted-foreground border-border hover:border-brand/40",
                  )}
                >
                  {def.label} ({formatNumber(n)})
                </button>
              );
            })}
          </div>
        )}

        {report.totalPerlu === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed">
            Tidak ada data yang perlu diperbaiki untuk filter ini. Warga dengan data sudah lengkap tidak ditampilkan.
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed">
            Tidak ada baris untuk filter ini.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {filteredRows.slice(0, batasTampil).map((row) => {
                const wa = resolveWaVerifikasi(row, warga);

                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 p-3 sm:flex-row sm:items-center sm:p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          RT {String(row.rt).padStart(2, "0")}
                        </span>
                        <span className="font-semibold leading-tight break-words">{row.namaLengkap}</span>
                        {row.kedudukanKeluarga === "Kepala Keluarga" && (
                          <Badge variant="outline" className="text-[10px] font-normal">
                            KK
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground sm:text-xs">{ringkasKurang(row)}</p>
                      <Meter label="Kelengkapan" persen={row.persenPribadi} />
                      {wa?.via === "kepala_keluarga" && (
                        <p className="text-xs text-muted-foreground">WA via kepala keluarga</p>
                      )}
                    </div>

                    <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex sm:items-center">
                      {wa ? (
                        <HubungiWargaButton
                          onClick={() =>
                            setHubungiTarget({
                              wargaId: row.id,
                              namaLengkap: row.namaLengkap,
                              issueIds: row.issues,
                              jenisAwal: "minta_bantuan",
                            })
                          }
                        />
                      ) : (
                        <Badge variant="secondary" className="justify-center font-normal text-xs">
                          Tanpa WA
                        </Badge>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setEditRow(row)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Perbaiki
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {filteredRows.length > batasTampil && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setBatasTampil((n) => n + PER_HALAMAN)}
              >
                Tampilkan {formatNumber(Math.min(PER_HALAMAN, filteredRows.length - batasTampil))} lagi
                <span className="ml-1 text-muted-foreground">
                  ({formatNumber(batasTampil)} dari {formatNumber(filteredRows.length)})
                </span>
              </Button>
            )}
          </>
        )}
      </div>

      <WargaDataIssueEditDialog
        row={editRow}
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      />

      <HubungiWargaDialog
        target={hubungiTarget}
        open={hubungiTarget != null}
        onOpenChange={(open) => {
          if (!open) setHubungiTarget(null);
        }}
      />
    </BagianStat>
  );
}
