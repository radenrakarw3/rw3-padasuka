import { ExternalLink } from "lucide-react";
import { Visitrw3WorkflowSteps } from "@/components/admin/visitrw3-workflow-steps";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";
import type { PengajuanProduct } from "@/lib/visitrw3-produk-ui";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  product?: PengajuanProduct;
};

/** Judul halaman admin Visit RW3 / RW3 Biz. Navigasi antarhalaman ada di sidebar. */
export function Visitrw3AdminNav({ title, description, actions, product = "visit" }: Props) {
  const publicHref = product === "rw3biz" ? RW3BIZ_ROUTES.hub : VISITRW3_ROUTES.hub;
  const publicLabel = product === "rw3biz" ? "Halaman publik /rw3biz" : "Halaman warga /visitrw3";

  return (
    <div className="space-y-4">
      {product === "visit" ? <Visitrw3WorkflowSteps /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[hsl(163,55%,22%)]">
            {product === "rw3biz" ? "RW3 Biz" : "Visit RW3"}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground mt-0.5">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {publicLabel}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
