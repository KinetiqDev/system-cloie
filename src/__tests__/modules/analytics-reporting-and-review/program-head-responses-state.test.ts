import { describe, expect, it } from "vitest";
import { DeploymentStatus, StudentSection, TargetStakeholder, YearLevel } from "@prisma/client";
import {
  buildProgramHeadResponsesPageUrl,
  buildProgramHeadResponsesTabUrl,
  parseProgramHeadResponsesSearchParams,
  programHeadResponsesQuery,
} from "@/features/analytics/services/program-head-responses-state";

describe("Program Head Responses URL state", () => {
  it("bounds search and defaults invalid values without widening scope", () => {
    const state = parseProgramHeadResponsesSearchParams({
      tab: "invalid",
      page: "99999",
      q: `  ${"x".repeat(150)}  `,
      programId: "other-program",
      yearLevel: YearLevel.THIRD_YEAR,
      section: StudentSection.MORNING,
      stakeholder: TargetStakeholder.ALUMNI,
      status: DeploymentStatus.ACTIVE,
    });

    expect(state.tab).toBe("course");
    expect(state.page).toBe(1);
    expect(state.q).toHaveLength(100);
    expect(state.yearLevel).toBe(YearLevel.THIRD_YEAR);
    expect(state.section).toBe(StudentSection.MORNING);
    expect(state.stakeholder).toBe(TargetStakeholder.ALUMNI);
    expect(state.status).toBe(DeploymentStatus.ACTIVE);
    expect("programId" in state).toBe(false);
  });

  it("serializes only canonical non-default values", () => {
    const state = parseProgramHeadResponsesSearchParams({ tab: "program-wide", page: "2", q: " alumni " });
    expect(programHeadResponsesQuery(state)).toBe("tab=program-wide&page=2&q=alumni");
    expect(buildProgramHeadResponsesPageUrl("program-1", state, 3)).toBe(
      "/program-head/programs/program-1/responses?tab=program-wide&page=3&q=alumni"
    );
  });

  it("keeps shared filters and resets tab-specific filters", () => {
    const state = parseProgramHeadResponsesSearchParams({
      q: "course",
      termInstanceId: "00000000-0000-0000-0000-000000000001",
      courseId: "00000000-0000-0000-0000-000000000002",
      facultyId: "00000000-0000-0000-0000-000000000003",
    });
    expect(buildProgramHeadResponsesTabUrl("program-1", "program-wide", state)).toBe(
      "/program-head/programs/program-1/responses?tab=program-wide&q=course"
    );
    expect(buildProgramHeadResponsesTabUrl("program-1", "program-wide", state)).not.toContain("courseId");
    expect(buildProgramHeadResponsesTabUrl("program-1", "program-wide", state)).not.toContain("facultyId");
  });
});
