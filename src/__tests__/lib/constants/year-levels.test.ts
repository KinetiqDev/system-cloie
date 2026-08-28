import { describe, it, expect } from "vitest";

import { parseYearLevelInput } from "@/lib/constants/year-levels";
import { YearLevel } from "@prisma/client";

describe("parseYearLevelInput", () => {
  it("accepts friendly numbers", () => {
    expect(parseYearLevelInput("1")).toEqual({ ok: true, value: YearLevel.FIRST_YEAR });
    expect(parseYearLevelInput("2")).toEqual({ ok: true, value: YearLevel.SECOND_YEAR });
    expect(parseYearLevelInput("3")).toEqual({ ok: true, value: YearLevel.THIRD_YEAR });
    expect(parseYearLevelInput("4")).toEqual({ ok: true, value: YearLevel.FOURTH_YEAR });
  });

  it("accepts ordinal and word forms", () => {
    expect(parseYearLevelInput("1st")).toEqual({ ok: true, value: YearLevel.FIRST_YEAR });
    expect(parseYearLevelInput("1st Year")).toEqual({ ok: true, value: YearLevel.FIRST_YEAR });
    expect(parseYearLevelInput("first year")).toEqual({ ok: true, value: YearLevel.FIRST_YEAR });
    expect(parseYearLevelInput("2nd year")).toEqual({ ok: true, value: YearLevel.SECOND_YEAR });
    expect(parseYearLevelInput("fourth")).toEqual({ ok: true, value: YearLevel.FOURTH_YEAR });
  });

  it("accepts exact enum values for backward compatibility", () => {
    expect(parseYearLevelInput("FIRST_YEAR")).toEqual({ ok: true, value: YearLevel.FIRST_YEAR });
    expect(parseYearLevelInput("SECOND_YEAR")).toEqual({ ok: true, value: YearLevel.SECOND_YEAR });
    expect(parseYearLevelInput("THIRD_YEAR")).toEqual({ ok: true, value: YearLevel.THIRD_YEAR });
    expect(parseYearLevelInput("FOURTH_YEAR")).toEqual({ ok: true, value: YearLevel.FOURTH_YEAR });
  });

  it("returns null for blank input", () => {
    expect(parseYearLevelInput("")).toEqual({ ok: true, value: null });
    expect(parseYearLevelInput(null)).toEqual({ ok: true, value: null });
    expect(parseYearLevelInput(undefined)).toEqual({ ok: true, value: null });
  });

  it("returns a friendly error for unrecognized values", () => {
    const result = parseYearLevelInput("9");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("1, 2, 3, or 4");
  });
});
