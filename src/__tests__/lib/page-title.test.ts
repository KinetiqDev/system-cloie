import { describe, expect, it } from "vitest";
import { SITE_NAME, buildPageTitle } from "@/lib/page-title";

describe("buildPageTitle", () => {
  it("joins page and scope with a pipe", () => {
    expect(buildPageTitle("Dashboard", "Program Head")).toBe("Dashboard | Program Head");
  });

  it("passes a single segment through unchanged", () => {
    expect(buildPageTitle("Respondent Portal")).toBe("Respondent Portal");
  });

  it("omits a blank scope instead of leaving a dangling separator", () => {
    expect(buildPageTitle("Privacy Notice", "  ")).toBe("Privacy Notice");
  });

  it("joins three segments for entity detail pages", () => {
    expect(buildPageTitle("2024–2025", "School Years", "Secretary")).toBe(
      "2024–2025 | School Years | Secretary"
    );
  });

  it("skips an undefined scope", () => {
    expect(buildPageTitle("Design System", undefined)).toBe("Design System");
  });
  it("trims surrounding whitespace on each segment", () => {
    expect(buildPageTitle("  Courses  ", "  Dean  ")).toBe("Courses | Dean");
  });

  it("uses the full product name as the site name", () => {
    expect(SITE_NAME).toBe("System CLOIE");
  });
});
