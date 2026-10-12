import type { POClassification } from "@prisma/client";

export const PO_CLASSIFICATION_LABELS: Record<POClassification, string> = {
  COMMON: "Common",
  CORE: "Core",
  PROFESSIONAL: "Professional",
  INSTITUTION_SPECIFIC: "Institution-specific",
  UNCLASSIFIED: "Needs classification",
};
export const PO_CLASSIFICATION_DESCRIPTIVE_LABELS: Record<POClassification, string> = {
  COMMON: "Common to all Schools",
  CORE: "Core",
  PROFESSIONAL: "Professional",
  INSTITUTION_SPECIFIC: "Institution-specific",
  UNCLASSIFIED: "Needs classification",
};
export const PROGRAM_HEAD_CLASSIFICATIONS = [
  { value: "CORE", label: PO_CLASSIFICATION_LABELS.CORE },
  { value: "PROFESSIONAL", label: PO_CLASSIFICATION_LABELS.PROFESSIONAL },
] as const;

export type POCategoryFilter = "ALL" | "COMMON" | "CORE" | "PROFESSIONAL" | "OTHER";

export function matchesPOCategory(
  classification: POClassification,
  category: POCategoryFilter
): boolean {
  return (
    category === "ALL" ||
    (category === "OTHER"
      ? classification === "INSTITUTION_SPECIFIC" || classification === "UNCLASSIFIED"
      : classification === category)
  );
}

export const PO_CATEGORY_TABS = [
  "ALL",
  "COMMON",
  "CORE",
  "PROFESSIONAL",
  "OTHER",
] as const satisfies readonly POCategoryFilter[];

export const PO_CATEGORY_TAB_LABELS: Record<POCategoryFilter, string> = {
  ALL: "All",
  COMMON: PO_CLASSIFICATION_LABELS.COMMON,
  CORE: PO_CLASSIFICATION_LABELS.CORE,
  PROFESSIONAL: PO_CLASSIFICATION_LABELS.PROFESSIONAL,
  OTHER: "Other",
};

/** One pass over the catalog, so tab counts never re-filter it per tab per render. */
export function countByCategory(
  pos: ReadonlyArray<{ classification: POClassification }>
): Record<POCategoryFilter, number> {
  const counts: Record<POCategoryFilter, number> = {
    ALL: pos.length,
    COMMON: 0,
    CORE: 0,
    PROFESSIONAL: 0,
    OTHER: 0,
  };
  for (const po of pos) {
    for (const category of PO_CATEGORY_TABS) {
      if (category !== "ALL" && matchesPOCategory(po.classification, category))
        counts[category] += 1;
    }
  }
  return counts;
}

export function isAdministrativeCategory(
  value: string
): value is "COMMON" | "INSTITUTION_SPECIFIC" {
  return value === "COMMON" || value === "INSTITUTION_SPECIFIC";
}

export function isProgramHeadCategory(value: string): value is "CORE" | "PROFESSIONAL" {
  return value === "CORE" || value === "PROFESSIONAL";
}
