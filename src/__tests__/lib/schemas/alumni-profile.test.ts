import { describe, expect, it } from "vitest";
import { alumniProfileSchema } from "@/lib/schemas/alumni-profile";

const CURRENT_YEAR = new Date().getFullYear();

const baseProfile = {
  program_id: "11111111-1111-4111-8111-111111111111",
  major_id: "",
};

function acceptsGraduationYear(graduation_year: unknown): boolean {
  return alumniProfileSchema.safeParse({ ...baseProfile, graduation_year }).success;
}

describe("alumniProfileSchema graduation year", () => {
  it.each([
    ["an empty field", "", false],
    ["a missing year", null, false],
    ["a fractional year", 2020.5, false],
    ["a year before the college opened", 1962, false],
    ["the first historical graduation year", 1963, true],
    ["the last year before the hiatus", 1978, true],
    ["the first hiatus year", 1979, false],
    ["the last hiatus year", 1999, false],
    ["the first modern graduation year", 2000, true],
    ["a mid-era year", 2015, true],
    ["the current year", CURRENT_YEAR, true],
    ["next year", CURRENT_YEAR + 1, false],
    ["a string year from a non-JS client", "2018", true],
  ])("handles %s", (_label, graduation_year, expected) => {
    expect(acceptsGraduationYear(graduation_year)).toBe(expected);
  });

  it("rejects every year of the hiatus between the eras", () => {
    for (let year = 1979; year <= 1999; year += 1) {
      expect(acceptsGraduationYear(year), String(year)).toBe(false);
    }
  });
});
