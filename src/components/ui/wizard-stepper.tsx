import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface WizardStep {
  key: string;
  label: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: string;
  className?: string;
}

export function WizardStepper({ steps, currentStep, className }: WizardStepperProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.key === currentStep)
  );
  const currentLabel = steps[currentIndex]?.label ?? "Current step";

  return (
    <div className={cn("min-w-0", className)} aria-label="Wizard progress" role="group">
      <div className="flex min-w-0 flex-col gap-2 md:hidden">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="text-muted-foreground text-xs font-medium tabular-nums">
            Step {currentIndex + 1} of {steps.length}
          </span>
          <span className="text-foreground truncate text-sm font-semibold" aria-current="step">
            {currentLabel}
          </span>
        </div>
        <div className="grid grid-flow-col gap-1.5" aria-hidden="true">
          {steps.map((step, index) => (
            <span
              key={step.key}
              className={cn(
                "h-1.5 rounded-full",
                index <= currentIndex ? "bg-primary" : "bg-border"
              )}
            />
          ))}
        </div>
      </div>

      <div className="hidden min-w-0 items-start md:flex">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.key} className={cn("flex min-w-0 items-start", !isLast && "flex-1")}>
              <div className="flex shrink-0 flex-col items-center gap-1 px-1">
                <div
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors motion-reduce:transition-none",
                    isCompleted && "bg-primary text-primary-foreground",
                    isActive &&
                      "bg-primary text-primary-foreground ring-primary ring-2 ring-offset-2",
                    !isCompleted && !isActive && "bg-muted text-muted-foreground"
                  )}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isCompleted ? <CheckIcon aria-hidden="true" /> : <span>{index + 1}</span>}
                </div>
                <span
                  className={cn(
                    "text-xs leading-none font-medium",
                    isActive && "text-link",
                    isCompleted && "text-foreground",
                    !isActive && !isCompleted && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 mt-3.5 h-px min-w-0 flex-1 transition-colors motion-reduce:transition-none",
                    index < currentIndex ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
