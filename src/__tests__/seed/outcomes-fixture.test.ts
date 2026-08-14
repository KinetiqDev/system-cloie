import { describe, expect, it } from "vitest";
import { courseDefinitions } from "../../../prisma/seed/fixtures/academic-structure";
import {
  ciloDefsGeneralEducation,
  ciloDefsNewCourses,
  iloDefs,
} from "../../../prisma/seed/fixtures/outcomes";

/**
 * Pins CILO descriptions for courses whose codes were remapped to new catalog
 * courses during the demo catalog migration (FM200/ENG2/HTC401/SW312). These
 * texts surface in course-bound evaluation snapshots and analytics, so they
 * must match the course's current catalog title, not the former course's.
 */

const expectedDescriptions: Record<string, string[]> = {
  // FM200 — Financial Management (formerly FIN101 Financial Accounting)
  FM200: [
    "Apply financial management concepts to evaluate organizational financial decisions.",
    "Analyze financial statements and ratios to support management planning and control.",
  ],
  // ENG2 — Principles and Theories of Language Acquisition and Learning (formerly EDUC301)
  ENG2: [
    "Explain major theories of language acquisition and learning and their classroom implications.",
    "Compare first- and second-language acquisition processes and the factors that affect language learning.",
    "Apply principles and theories of language learning to instructional practices.",
  ],
  // HTC401 — Entrepreneurship in Tourism and Hospitality (formerly HM401)
  HTC401: [
    "Identify entrepreneurial opportunities and develop a business plan for tourism and hospitality ventures.",
    "Evaluate the feasibility, marketing, and financial viability of tourism and hospitality enterprises.",
  ],
  // SW312 — Social Work Research 1 (formerly SW301)
  SW312: [
    "Formulate a research design that addresses a social work practice problem.",
    "Critique research methods and ethical considerations applicable to social work research.",
  ],
};

describe("remapped course CILO fixture", () => {
  for (const [courseCode, expected] of Object.entries(expectedDescriptions)) {
    it(`${courseCode} CILOs match its catalog title`, () => {
      const actual = ciloDefsNewCourses
        .filter((c) => c.courseCode === courseCode)
        .sort((a, b) => a.order - b.order)
        .map((c) => c.desc);
      expect(actual).toEqual(expected);
    });
  }

  it("only references courses present in the demo catalog", () => {
    const catalogCodes = new Set(courseDefinitions.map((c) => c.code));
    for (const c of ciloDefsNewCourses) {
      expect(catalogCodes.has(c.courseCode), `${c.courseCode}`).toBe(true);
    }
  });

  it("seeds General Education CILOs on a General Education Course", () => {
    const catalogByCode = new Map(courseDefinitions.map((c) => [c.code, c]));

    expect(ciloDefsGeneralEducation.length).toBeGreaterThan(0);
    for (const c of ciloDefsGeneralEducation) {
      expect(catalogByCode.get(c.courseCode)?.scope, c.courseCode).toBe("GENERAL_EDUCATION");
      expect(c.order).toBeGreaterThan(0);
    }
  });

  it("maps General Education seed CILOs only to existing shared Institutional Outcomes", () => {
    const iloCodes = new Set<string>(iloDefs.map((ilo) => ilo.code));
    for (const cilo of ciloDefsGeneralEducation) {
      expect(iloCodes.has(`ILO${Math.min(cilo.order, 5)}`)).toBe(true);
    }
  });
});
