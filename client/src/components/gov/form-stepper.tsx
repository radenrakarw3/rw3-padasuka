import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type FormStep = { id: string; label: string };

type FormStepperProps = {
  steps: FormStep[];
  currentStep: number;
  className?: string;
};

export function FormStepper({ steps, currentStep, className }: FormStepperProps) {
  return (
    <nav aria-label="Langkah formulir" className={cn("mb-6", className)}>
      <ol className="flex items-center gap-1">
        {steps.map((step, index) => {
          const done = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={step.id} className="flex items-center flex-1 min-w-0">
              <div
                className="flex flex-col items-center flex-1 min-w-0"
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                    done && "bg-brand border-brand text-brand-foreground",
                    active && !done && "border-brand text-brand bg-brand/10",
                    !done && !active && "border-muted-foreground/30 text-muted-foreground",
                  )}
                >
                  {done ? <Check className="w-4 h-4" aria-hidden /> : index + 1}
                </span>
                <span
                  className={cn(
                    "text-[10px] mt-1 text-center truncate w-full px-0.5",
                    active ? "text-brand font-medium" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn("h-0.5 flex-1 mx-0.5 mb-4", done ? "bg-brand" : "bg-border")}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
