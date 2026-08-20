"use client";

import { X } from "lucide-react";
import type { CILOMappingManifestation } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MANIFESTATION_OPTIONS: Array<{
  value: CILOMappingManifestation;
  letter: string;
  label: string;
}> = [
  { value: "LEARNING", letter: "L", label: "Learning" },
  { value: "PRACTICE", letter: "P", label: "Practice" },
  { value: "OPPORTUNITY", letter: "O", label: "Opportunity" },
];

export function manifestationLabel(value: CILOMappingManifestation | null | undefined): string {
  if (!value) return "Unanswered";
  const word = `${value.charAt(0)}${value.slice(1).toLowerCase()}`;
  return `${word} (${value.charAt(0)})`;
}

type ManifestationPickerProps = {
  /** 1-based CILO position, used in the accessible names. */
  ciloIndex: number;
  /** 1-based PLO position, used in the accessible names. */
  ploIndex: number;
  value: CILOMappingManifestation | null;
  disabled?: boolean;
  onChange: (value: CILOMappingManifestation | null) => void;
  /** "compact" renders letter-only buttons for the desktop matrix; "full" renders labeled buttons for mobile cards. */
  variant?: "compact" | "full";
};

/**
 * Per-pair Learning/Practice/Opportunity control.
 * Every option carries the full accessible name "CILO n, PLO m, manifestation: <label>";
 * letters and color are never the sole communication. Clearing is available through
 * the explicit clear button or by activating the already-selected option.
 */
export function ManifestationPicker({
  ciloIndex,
  ploIndex,
  value,
  disabled = false,
  onChange,
  variant = "compact",
}: ManifestationPickerProps) {
  const optionName = (label: string) =>
    `CILO ${ciloIndex}, PLO ${ploIndex}, manifestation: ${label}`;
  const clearName = `Clear CILO ${ciloIndex}, PLO ${ploIndex} manifestation`;

  return (
    <div
      role="group"
      aria-label={`CILO ${ciloIndex}, PLO ${ploIndex}, manifestation`}
      className={cn(
        "flex min-w-0 items-center gap-1",
        variant === "full" && "flex-wrap gap-1.5"
      )}
    >
      {MANIFESTATION_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            variant={selected ? "default" : "outline"}
            size={variant === "compact" ? "icon-sm" : "sm"}
            aria-pressed={selected}
            aria-label={optionName(option.label)}
            title={selected ? `${option.label}; activate again to clear` : option.label}
            disabled={disabled}
            onClick={() => onChange(selected ? null : option.value)}
            className={cn(
              "min-w-9",
              variant === "full" && "min-h-11 flex-1 min-w-0 px-2.5 text-label-lg text-primary-foreground",
              !selected && "text-muted-foreground"
            )}
          >
            {variant === "compact" ? option.letter : `${option.label} (${option.letter})`}
          </Button>
        );
      })}
      {value !== null && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={clearName}
          title={clearName}
          disabled={disabled}
          onClick={() => onChange(null)}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            variant === "full" && "min-h-11 min-w-11"
          )}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}