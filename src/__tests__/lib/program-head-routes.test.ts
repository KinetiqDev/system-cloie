import { describe, expect, it } from "vitest";
import { buildProgramHeadDashboardPath, buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";

describe("Program Head routes", () => {
  it("builds the canonical selected Program dashboard path", () => {
    expect(buildProgramHeadDashboardPath("program-1")).toBe("/program-head/programs/program-1/dashboard");
  });

  it("builds child paths without duplicate separators", () => {
    expect(buildProgramHeadProgramPath("program-1", "/courses")).toBe("/program-head/programs/program-1/courses");
  });
});
