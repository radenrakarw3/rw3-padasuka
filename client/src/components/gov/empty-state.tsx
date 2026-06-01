import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed bg-muted/30 p-6 text-center space-y-3",
        className,
      )}
      role="status"
    >
      {Icon && <Icon className="w-10 h-10 mx-auto text-muted-foreground" aria-hidden />}
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 prose-gov mx-auto">{description}</p>
      </div>
      {action}
    </div>
  );
}
