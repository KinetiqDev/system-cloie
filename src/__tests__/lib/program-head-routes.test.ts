import { describe, expect, it } from "vitest";
import {
  buildProgramHeadCoursesPath,
  buildProgramHeadDashboardPath,
  buildProgramHeadProgramPath,
  buildProgramHeadCourseRosterPath,
  buildProgramHeadNewCiloEvaluationPath,
  buildProgramHeadCiloReviewsPath,
  buildProgramHeadCiloReviewDetailPath,
  buildProgramHeadCiloResponseReviewPath,
  buildProgramHeadAnalyticsPath,
  buildProgramHeadReportsPath,
} from "@/lib/constants/program-head-routes";

describe("Program Head routes", () => {
  it("builds the canonical selected Program dashboard path", () => {
    expect(buildProgramHeadDashboardPath("program-1")).toBe(
      "/program-head/programs/program-1/dashboard"
    );
  });

  it("builds child paths without duplicate separators", () => {
    expect(buildProgramHeadProgramPath("program-1", "/courses")).toBe(
      "/program-head/programs/program-1/courses"
    );
  });

  it("builds the canonical selected Program Courses path", () => {
    expect(buildProgramHeadCoursesPath("program-1")).toBe(
      "/program-head/programs/program-1/courses"
    );
  });

  it("builds the canonical selected Program roster path", () => {
    expect(buildProgramHeadCourseRosterPath("program-1", "assignment-1")).toBe(
      "/program-head/programs/program-1/course-rosters/assignment-1"
    );
  });

  it("builds the canonical selected Program Course-bound evaluation path", () => {
    expect(buildProgramHeadNewCiloEvaluationPath("program-1")).toBe(
      "/program-head/programs/program-1/cilo-evaluations/new"
    );
  });

  it("builds selected Program review and response paths", () => {
    expect(buildProgramHeadCiloReviewsPath("program-1")).toBe(
      "/program-head/programs/program-1/cilo-reviews"
    );
    expect(buildProgramHeadCiloReviewDetailPath("program-1", "evaluation-1")).toBe(
      "/program-head/programs/program-1/cilo-reviews/evaluation-1"
    );
    expect(buildProgramHeadCiloResponseReviewPath("program-1", "evaluation-1", "response-1")).toBe(
      "/program-head/programs/program-1/cilo-reviews/evaluation-1/responses/response-1"
    );
  });

  it("builds selected Program analytics and reports paths", () => {
    expect(buildProgramHeadAnalyticsPath("program-1")).toBe(
      "/program-head/programs/program-1/analytics"
    );
    expect(buildProgramHeadReportsPath("program-1")).toBe(
      "/program-head/programs/program-1/reports"
    );
  });

  it("encodes dynamic Program IDs in canonical paths", () => {
    expect(buildProgramHeadDashboardPath("program/1")).toBe(
      "/program-head/programs/program%2F1/dashboard"
    );
  });
});
