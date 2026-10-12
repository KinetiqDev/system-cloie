import type { CILOMappingManifestation } from "@prisma/client";
import { CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MANIFESTATION_BADGE_CLASS: Record<CILOMappingManifestation, string> = {
  LEARNING:
    "border-manifestation-learning-border bg-manifestation-learning-bg text-manifestation-learning-fg",
  PRACTICE:
    "border-manifestation-practice-border bg-manifestation-practice-bg text-manifestation-practice-fg",
  OPPORTUNITY:
    "border-manifestation-opportunity-border bg-manifestation-opportunity-bg text-manifestation-opportunity-fg",
};

function manifestationText(value: CILOMappingManifestation): string {
  return `${value.charAt(0)}${value.slice(1).toLowerCase()} (${value.charAt(0)})`;
}

/**
 * A missing manifestation is a readiness gap, not a category, so it takes the
 * warning status role with a dashed outline and icon so color is never the only cue.
 */
export function ManifestationBadge({
  value,
  className,
}: {
  value: CILOMappingManifestation | null | undefined;
  className?: string;
}) {
  if (!value) {
    return (
      <Badge
        variant="warning"
        data-manifestation="UNMAPPED"
        className={cn("text-label-sm border-dashed", className)}
      >
        <CircleDashed aria-hidden="true" />
        Unmapped
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      data-manifestation={value}
      className={cn("text-label-sm", MANIFESTATION_BADGE_CLASS[value], className)}
    >
      {manifestationText(value)}
    </Badge>
  );
}
