import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type SuccessPanelProps = {
  title: string;
  referenceLabel?: string;
  referenceValue?: string;
  nextSteps: string[];
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

export function SuccessPanel({
  title,
  referenceLabel,
  referenceValue,
  nextSteps,
  primaryAction,
  secondaryAction,
}: SuccessPanelProps) {
  const { toast } = useToast();

  const copyRef = () => {
    if (!referenceValue) return;
    void navigator.clipboard.writeText(referenceValue);
    toast({ title: "Disalin", description: referenceValue });
  };

  return (
    <div className="space-y-6 py-4" role="status" aria-live="polite">
      <div className="text-center space-y-3">
        <CheckCircle2 className="w-16 h-16 mx-auto text-success" aria-hidden />
        <h2 className="text-title">{title}</h2>
      </div>

      {referenceValue && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          {referenceLabel && <p className="text-caption text-muted-foreground">{referenceLabel}</p>}
          <div className="flex items-center justify-between gap-2">
            <code className="text-sm font-mono font-semibold text-brand break-all">{referenceValue}</code>
            <Button type="button" variant="outline" size="icon" className="touch-target flex-shrink-0" onClick={copyRef} aria-label="Salin nomor">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-muted/50 p-4 space-y-2">
        <p className="text-sm font-medium">Langkah selanjutnya</p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          {nextSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2">
        {primaryAction && (
          <Link href={primaryAction.href}>
            <Button className="w-full touch-target">{primaryAction.label}</Button>
          </Link>
        )}
        {secondaryAction && (
          <Link href={secondaryAction.href}>
            <Button variant="outline" className="w-full touch-target">
              {secondaryAction.label}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
