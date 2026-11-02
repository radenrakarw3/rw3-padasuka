import { useMemo, useState } from "react";
import type {
  FieldDistribution,
  SectionDistribution,
} from "@shared/kependudukan-analytics";
import {
  buildKkMetadataFields,
  buildWargaMetadataSections,
} from "@shared/kependudukan-analytics";
import { BarBlock, BagianStat, formatNumber } from "@/components/admin/kependudukan-stats-ui";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  warga: Record<string, unknown>[];
  kk?: Record<string, unknown>[];
  polos?: boolean;
};

function FillMeter({ field }: { field: FieldDistribution }) {
  const nada =
    field.fillPercent >= 90 ? "bg-emerald-500" : field.fillPercent >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="space-y-1.5 rounded-xl border border-border/60 bg-card/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{field.label}</p>
        <Badge variant="secondary" className="shrink-0 tabular-nums">
          {field.fillPercent}%
        </Badge>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width]", nada)} style={{ width: `${field.fillPercent}%` }} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        {formatNumber(field.filled)} dari {formatNumber(field.eligible)} warga relevan terisi
      </p>
    </div>
  );
}

function FieldChart({ field }: { field: FieldDistribution }) {
  if (field.eligible === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
        {field.label}: tidak ada warga yang relevan untuk indikator ini.
      </div>
    );
  }

  if (field.type === "fillRate") {
    return <FillMeter field={field} />;
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/60 bg-card/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{field.label}</p>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          n={formatNumber(field.eligible)} · {field.fillPercent}% terisi
        </span>
      </div>
      <BarBlock
        data={field.buckets}
        empty="Belum ada sebaran"
        labelWidth={120}
        height={Math.max(140, Math.min(320, field.buckets.length * 32))}
      />
    </div>
  );
}

function SectionBlock({ section }: { section: SectionDistribution }) {
  const [buka, setBuka] = useState(section.key === "pokok");
  const rata =
    section.fields.length === 0
      ? 0
      : Math.round(section.fields.reduce((s, f) => s + f.fillPercent, 0) / section.fields.length);

  return (
    <div className="rounded-2xl border bg-background/60">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left sm:px-4"
        aria-expanded={buka}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{section.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{section.description}</span>
        </span>
        <Badge variant="outline" className="shrink-0 tabular-nums">
          {rata}%
        </Badge>
      </button>
      {buka && (
        <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-2 sm:px-4">
          {section.fields.map((f) => (
            <FieldChart key={f.key} field={f} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MetadataWargaPanel({ warga, kk = [], polos }: Props) {
  const sections = useMemo(() => buildWargaMetadataSections(warga as never), [warga]);
  const kkFields = useMemo(() => buildKkMetadataFields(kk as never), [kk]);
  const rataWarga =
    sections.length === 0
      ? 0
      : Math.round(
          sections.flatMap((s) => s.fields).reduce((s, f) => s + f.fillPercent, 0) /
            Math.max(1, sections.flatMap((s) => s.fields).length),
        );
  const rataKk =
    kkFields.length === 0
      ? 0
      : Math.round(kkFields.reduce((s, f) => s + f.fillPercent, 0) / kkFields.length);

  return (
    <BagianStat
      title="Metadata & indikator form"
      description={`Sebaran semua field yang diisi di formulir warga/KK · rata warga ${rataWarga}% · rata KK ${rataKk}%`}
      polos={polos}
    >
      <div className="space-y-3">
        {sections.map((section) => (
          <SectionBlock key={section.key} section={section} />
        ))}

        {kkFields.length > 0 && (
          <div className="rounded-2xl border bg-background/60">
            <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Data keluarga (KK)</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Status rumah, fasilitas, ekonomi, dan bansos dari kartu keluarga.
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {rataKk}%
              </Badge>
            </div>
            <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-2 sm:px-4">
              {kkFields.map((f) => (
                <FieldChart key={f.key} field={f} />
              ))}
            </div>
          </div>
        )}
      </div>
    </BagianStat>
  );
}
