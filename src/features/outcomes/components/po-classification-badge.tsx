import type { POClassification } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PO_CLASSIFICATION_LABELS,
  PO_CLASSIFICATION_DESCRIPTIVE_LABELS,
} from "../po-classification";

export interface POClassificationConfig {
  badgeClass: string;
  dotClass: string;
  label: string;
  descriptiveLabel: string;
}

export const PO_CLASSIFICATION_CONFIG: Record<POClassification, POClassificationConfig> = {
  COMMON: {
    badgeClass:
      "border-[var(--classification-common-border)] bg-[var(--classification-common-bg)] text-[var(--classification-common-fg)]",
    dotClass: "bg-[var(--classification-common-fg)]",
    label: PO_CLASSIFICATION_LABELS.COMMON,
    descriptiveLabel: PO_CLASSIFICATION_DESCRIPTIVE_LABELS.COMMON,
  },
  CORE: {
    badgeClass:
      "border-[var(--classification-core-border)] bg-[var(--classification-core-bg)] text-[var(--classification-core-fg)]",
    dotClass: "bg-[var(--classification-core-fg)]",
    label: PO_CLASSIFICATION_LABELS.CORE,
    descriptiveLabel: PO_CLASSIFICATION_DESCRIPTIVE_LABELS.CORE,
  },
  PROFESSIONAL: {
    badgeClass:
      "border-[var(--classification-professional-border)] bg-[var(--classification-professional-bg)] text-[var(--classification-professional-fg)]",
    dotClass: "bg-[var(--classification-professional-fg)]",
    label: PO_CLASSIFICATION_LABELS.PROFESSIONAL,
    descriptiveLabel: PO_CLASSIFICATION_DESCRIPTIVE_LABELS.PROFESSIONAL,
  },
  INSTITUTION_SPECIFIC: {
    badgeClass:
      "border-[var(--classification-institution-border)] bg-[var(--classification-institution-bg)] text-[var(--classification-institution-fg)]",
    dotClass: "bg-[var(--classification-institution-fg)]",
    label: PO_CLASSIFICATION_LABELS.INSTITUTION_SPECIFIC,
    descriptiveLabel: PO_CLASSIFICATION_DESCRIPTIVE_LABELS.INSTITUTION_SPECIFIC,
  },
  UNCLASSIFIED: {
    badgeClass: "border-border border-dashed bg-muted/60 text-muted-foreground",
    dotClass: "bg-muted-foreground",
    label: PO_CLASSIFICATION_LABELS.UNCLASSIFIED,
    descriptiveLabel: PO_CLASSIFICATION_DESCRIPTIVE_LABELS.UNCLASSIFIED,
  },
};

export interface POClassificationBadgeProps {
  classification: POClassification;
  format?: "short" | "descriptive";
  className?: string;
  showDot?: boolean;
}

/**
 * POClassificationBadge
 *
 * Renders a color-coded, accessible categorical badge for Program Outcome classifications:
 * - COMMON: Cyan / Institutional breadth ("Common to all Schools" or "Common")
 * - CORE: Indigo / Discipline foundation ("Core")
 * - PROFESSIONAL: Purple / Applied professional practice ("Professional")
 * - INSTITUTION_SPECIFIC: Rose / ACD institutional mission ("Institution-specific")
 * - UNCLASSIFIED: Muted dashed ("Needs classification")
 *
 * Designed with semantic tokens for both Light and Dark themes, WCAG AAA compliant contrast,
 * and zero confusion with CQI pass/fail attainment status colors.
 */
export function POClassificationBadge({
  classification,
  format = "descriptive",
  className,
  showDot = false,
}: POClassificationBadgeProps) {
  const config = PO_CLASSIFICATION_CONFIG[classification] ?? PO_CLASSIFICATION_CONFIG.UNCLASSIFIED;
  const displayText = format === "descriptive" ? config.descriptiveLabel : config.label;

  return (
    <Badge
      variant="outline"
      data-slot="po-classification-badge"
      data-classification={classification}
      title={`Classification: ${config.descriptiveLabel}`}
      className={cn(
        "font-medium tracking-tight shadow-2xs transition-colors",
        config.badgeClass,
        className
      )}
    >
      {showDot && (
        <span
          className={cn("size-1.5 shrink-0 rounded-full opacity-80", config.dotClass)}
          aria-hidden="true"
        />
      )}
      <span>{displayText}</span>
      <span className="sr-only">({config.descriptiveLabel} Program Outcome)</span>
    </Badge>
  );
}
