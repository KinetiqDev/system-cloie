import { YearLevel } from "@prisma/client";

import { normalizeFriendlyInput } from "./academic-period";

/**
 * Display mapping for YearLevel enum values.
 * Maps FIRST_YEAR → "1st Year", etc.
 */
export const YEAR_LEVEL_DISPLAY: Record<YearLevel, string> = {
  [YearLevel.FIRST_YEAR]: "1st Year",
  [YearLevel.SECOND_YEAR]: "2nd Year",
  [YearLevel.THIRD_YEAR]: "3rd Year",
  [YearLevel.FOURTH_YEAR]: "4th Year",
};

/**
 * Options array for select dropdowns.
 * Usage: <Select options={YEAR_LEVEL_OPTIONS} />
 */
export const YEAR_LEVEL_OPTIONS: { value: YearLevel; label: string }[] = [
  { value: YearLevel.FIRST_YEAR, label: "1st Year" },
  { value: YearLevel.SECOND_YEAR, label: "2nd Year" },
  { value: YearLevel.THIRD_YEAR, label: "3rd Year" },
  { value: YearLevel.FOURTH_YEAR, label: "4th Year" },
];

/**
 * Helper to get display label for a YearLevel enum value.
 */
export function getYearLevelDisplay(yearLevel: YearLevel | null | undefined): string {
  if (!yearLevel) return "—";
  return YEAR_LEVEL_DISPLAY[yearLevel] ?? yearLevel;
}

/**
 * Accepted friendly spellings for each YearLevel, keyed by normalized input
 * (lowercase, non-alphanumerics stripped). Covers numbers ("1"), ordinals
 * ("1st", "1st Year"), words ("first year"), and the enum spellings
 * ("FIRST_YEAR"). Blank input parses to null (leave unset).
 */
const YEAR_LEVEL_ALIASES: Record<string, YearLevel> = {
  "1": YearLevel.FIRST_YEAR,
  "1st": YearLevel.FIRST_YEAR,
  "1styear": YearLevel.FIRST_YEAR,
  first: YearLevel.FIRST_YEAR,
  firstyear: YearLevel.FIRST_YEAR,
  year1: YearLevel.FIRST_YEAR,
  "2": YearLevel.SECOND_YEAR,
  "2nd": YearLevel.SECOND_YEAR,
  "2ndyear": YearLevel.SECOND_YEAR,
  second: YearLevel.SECOND_YEAR,
  secondyear: YearLevel.SECOND_YEAR,
  year2: YearLevel.SECOND_YEAR,
  "3": YearLevel.THIRD_YEAR,
  "3rd": YearLevel.THIRD_YEAR,
  "3rdyear": YearLevel.THIRD_YEAR,
  third: YearLevel.THIRD_YEAR,
  thirdyear: YearLevel.THIRD_YEAR,
  year3: YearLevel.THIRD_YEAR,
  "4": YearLevel.FOURTH_YEAR,
  "4th": YearLevel.FOURTH_YEAR,
  "4thyear": YearLevel.FOURTH_YEAR,
  fourth: YearLevel.FOURTH_YEAR,
  fourthyear: YearLevel.FOURTH_YEAR,
  year4: YearLevel.FOURTH_YEAR,
};

/**
 * Parse a CSV year_level cell into a YearLevel. Accepts friendly values such
 * as "1" or "1st Year" alongside the exact enum spelling "FIRST_YEAR".
 * Blank parses to null (defaults are optional). Returns a fix-step error for
 * unrecognized values so callers never surface raw enum names.
 */
export function parseYearLevelInput(
  value: string | null | undefined
): { ok: true; value: YearLevel | null } | { ok: false; error: string } {
  const key = normalizeFriendlyInput(value);
  if (key === "") return { ok: true, value: null };
  const parsed = YEAR_LEVEL_ALIASES[key];
  if (parsed) return { ok: true, value: parsed };
  return {
    ok: false,
    error: `Year level "${value}" is not recognized. Use 1, 2, 3, or 4 (for example "1st Year").`,
  };
}
