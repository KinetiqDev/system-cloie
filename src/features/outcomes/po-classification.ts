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

export function isAdministrativeCategory(
  value: string
): value is "COMMON" | "INSTITUTION_SPECIFIC" {
  return value === "COMMON" || value === "INSTITUTION_SPECIFIC";
}

export function isProgramHeadCategory(value: string): value is "CORE" | "PROFESSIONAL" {
  return value === "CORE" || value === "PROFESSIONAL";
}
