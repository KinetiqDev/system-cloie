"use client";

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
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div
      className={cn("flex flex-wrap items-center gap-0", className)}
      aria-label="Wizard progress"
      role="group"
    >
      {steps.map((step, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;
        const isLast = i === steps.length - 1;

        return (
          <div
            key={step.key}
            className="flex min-w-0 items-center"
            style={{ flex: isLast ? "0 0 auto" : "1" }}
          >
            <div className="flex flex-col items-center gap-1 px-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  isCompleted && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2",
                  !isCompleted && !isActive && "bg-muted text-muted-foreground"
                )}
                aria-current={isActive ? "step" : undefined}
              >
                {isCompleted ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive && "text-primary",
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
                  "mx-1 mb-4 h-px flex-1 transition-colors",
                  i < currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
