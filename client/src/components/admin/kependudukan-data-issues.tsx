import { useMemo, useState } from "react";
import { MessageCircle, Pencil } from "lucide-react";
import {
  WARGA_DATA_ISSUE_DEFS,
  buildVerifikasiDataWaMessage,
  buildWargaDataIssueReport,
  resolveWaVerifikasi,
  summarizeWargaIssues,
  type WargaDataIssueId,
  type WargaIssueSlice,
} from "@shared/warga-data-issues";
import { WargaDataIssueEditDialog } from "@/components/admin/warga-data-issue-edit-dialog";
import { formatNumber } from "@/components/admin/kependudukan-stats-ui";
import { GovStatistic, GovStatisticRow, GovStatisticSection } from "@/components/gov/statistic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toWaMeUrl } from "@/lib/wa";

type Props = {
  warga: WargaIssueSlice[];
};

export function KependudukanDataIssues({ warga }: Props) {
  const [issueFilter, setIssueFilter] = useState<WargaDataIssueId | "semua">("semua");
  const [editRow, setEditRow] = useState<WargaIssueSlice | null>(null);

  const report = useMemo(() => buildWargaDataIssueReport(warga), [warga]);

  const filteredRows = useMemo(() => {
    if (issueFilter === "semua") return report.rows;
    return report.rows.filter((r) => r.issues.includes(issueFilter));
  }, [issueFilter, report.rows]);

  return (
    <GovStatisticSection
      title="Verifikasi Data"
      description="Data yang perlu dikonfirmasi — hubungi warga via WhatsApp atau perbaiki langsung"
    >
      <div className="space-y-4">
        <GovStatisticRow cols={3}>
          <GovStatistic
            label="Perlu verifikasi"
            value={formatNumber(report.totalBermasalah)}
            description="Warga dengan data belum lengkap/selaras"
          />
          <GovStatistic
            label="Bisa dihubungi WA"
            value={formatNumber(
              report.rows.filter((r) => resolveWaVerifikasi(r, warga) !== null).length,
            )}
            description="Punya nomor sendiri atau via kepala keluarga"
          />
          <GovStatistic
            label="Tanpa kontak WA"
            value={formatNumber(
              report.rows.filter((r) => resolveWaVerifikasi(r, warga) === null).length,
            )}
            description="Perlu kunjungan atau input manual"
            tone="warning"
          />
        </GovStatisticRow>

        {report.totalBermasalah > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIssueFilter("semua")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                issueFilter === "semua"
                  ? "bg-brand text-brand-foreground border-brand"
                  : "bg-muted/40 text-muted-foreground border-border hover:border-brand/40",
              )}
            >
              Semua ({formatNumber(report.totalBermasalah)})
            </button>
            {WARGA_DATA_ISSUE_DEFS.map((def) => {
              const n = report.counts[def.id];
              if (n === 0) return null;
              return (
                <button
                  key={def.id}
                  type="button"
                  onClick={() => setIssueFilter(issueFilter === def.id ? "semua" : def.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    issueFilter === def.id
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

        {report.totalBermasalah === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center rounded-xl border border-dashed">
            Semua data warga sudah selaras untuk filter RT ini.
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredRows.map((row) => {
              const wa = resolveWaVerifikasi(row, warga);
              const waUrl = wa
                ? toWaMeUrl(wa.phone, buildVerifikasiDataWaMessage(row, row.issues))
                : null;

              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        RT {String(row.rt).padStart(2, "0")}
                      </span>
                      <span className="font-semibold leading-tight">{row.namaLengkap}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{summarizeWargaIssues(row.issues)}</p>
                    {wa?.via === "kepala_keluarga" && (
                      <p className="text-[11px] text-muted-foreground">WA via kepala keluarga</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {waUrl ? (
                      <Button variant="outline" size="sm" className="touch-target" asChild>
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="w-4 h-4 mr-1.5" />
                          Hubungi WA
                        </a>
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="font-normal text-xs">
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
        )}
      </div>

      <WargaDataIssueEditDialog
        row={editRow}
        open={editRow != null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      />
    </GovStatisticSection>
  );
}
