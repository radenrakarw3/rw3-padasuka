import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/** Hindari zoom otomatis iOS (< 16px) + target sentuh 48px. */
export const blusukanInputClass =
  "h-12 text-base rounded-lg px-3 scroll-mt-28";

export const blusukanSelectClass =
  "flex h-12 w-full appearance-none rounded-lg border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring scroll-mt-28";

export const blusukanTextareaClass =
  "min-h-[5rem] text-base rounded-lg px-3 py-3 scroll-mt-28 resize-y";

export function BlusukanField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2 scroll-mt-28">
      <Label className="text-sm font-medium leading-snug">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function BlusukanSearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = "Cari…",
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  return (
    <SearchableSelect
      value={value}
      onValueChange={onChange}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      triggerClassName={blusukanSelectClass}
    />
  );
}

export function BlusukanNativeSelect({
  value,
  onChange,
  options,
  placeholder,
  formatOption,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  formatOption?: (value: string) => string;
}) {
  const fmt = formatOption ?? ((v: string) => v);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={blusukanSelectClass}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {fmt(o)}
        </option>
      ))}
    </select>
  );
}

export function BlusukanCheckRow({
  id,
  checked,
  onCheckedChange,
  label,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 min-h-12 py-2.5 px-2 -mx-2 rounded-lg cursor-pointer active:bg-muted/60 touch-manipulation"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-input accent-[hsl(163,55%,22%)]"
      />
      <span className="text-base leading-snug select-none">{label}</span>
    </label>
  );
}

export function BlusukanFormSection({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border bg-card shadow-sm">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-start justify-between gap-3 p-4 text-left touch-manipulation min-h-12"
        >
          <div className="min-w-0">
            <p className="font-semibold text-base">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform mt-0.5", open && "rotate-180")} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 pt-0 space-y-4 border-t">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Layar penuh untuk form tambah/edit — lebih nyaman di HP daripada dialog. */
export function BlusukanFullScreenForm({
  open,
  onClose,
  title,
  subtitle,
  children,
  saveLabel,
  onSave,
  saving,
  saveDisabled,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  saveLabel: string;
  onSave: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background max-w-lg mx-auto left-0 right-0"
      role="dialog"
      aria-modal="true"
    >
      <header
        className="shrink-0 flex items-center gap-2 border-b bg-background px-3 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0"
          onClick={onClose}
          aria-label="Tutup"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 pr-2">
          <h2 className="font-semibold text-base leading-tight truncate">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {children}
      </div>

      <footer
        className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Button
          type="button"
          className="w-full h-12 text-base font-semibold"
          style={{ backgroundColor: "hsl(163,55%,22%)" }}
          disabled={saveDisabled || saving}
          onClick={onSave}
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {saveLabel}
        </Button>
      </footer>
    </div>
  );
}
