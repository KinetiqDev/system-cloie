import { describe, expect, it } from "vitest";
import { AcademicSemester, CourseScope } from "@prisma/client";
import { courseDefinitions, majorDefinitions, programDefinitions } from "../../../prisma/seed/fixtures/academic-structure";

/**
 * Invariants over the demo seed course catalog (derived from
 * docs/acd_programs_demo_seed_recommended_expanded.csv). Pins the
 * normalization and placement rules so future catalog edits surface drift.
 */

describe("demo seed course catalog fixture", () => {
  it("contains all 102 ACD curriculum courses", () => {
    expect(courseDefinitions).toHaveLength(102);
    const geCount = courseDefinitions.filter((c) => c.scope === CourseScope.GENERAL_EDUCATION).length;
    expect(geCount).toBe(5);
  });

  it("uses globally unique, space-stripped codes", () => {
    const codes = courseDefinitions.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const c of courseDefinitions) {
      expect(c.code).not.toMatch(/\s/);
    }
  });

  it("resolves every program and major reference", () => {
    const programCodes = new Set<string>(programDefinitions.map((p) => p.code));
    const majorKeys = new Set(majorDefinitions.map((m) => `${m.pc}:${m.name}`));
    for (const c of courseDefinitions) {
      if (c.scope === CourseScope.GENERAL_EDUCATION) {
        expect(c.pc).toBeUndefined();
        expect(c.mk).toBeUndefined();
      } else {
        expect(programCodes.has(c.pc!)).toBe(true);
        if (c.mk) {
          expect(majorKeys.has(c.mk)).toBe(true);
          expect(c.mk.startsWith(`${c.pc}:`)).toBe(true);
        }
      }
    }
  });

  it("gives every course a complete placement default", () => {
    for (const c of courseDefinitions) {
      expect(c.yl, `${c.code} year level`).toBeDefined();
      expect(c.sem, `${c.code} semester`).toBeDefined();
      if (c.sem === AcademicSemester.SUMMER) {
        expect(c.trm).toBeUndefined();
      } else {
        expect(c.trm, `${c.code} term`).toBeDefined();
      }
    }
  });
});
