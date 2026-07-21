import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { CourseScope } from "@prisma/client";
import { canDeployCourseBoundEvaluation } from "@/features/evaluations/policies";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

describe("canDeployCourseBoundEvaluation policy", () => {
  const makeSession = (roles: (typeof ROLES)[keyof typeof ROLES][], userId = "user-1") =>
    createAuthSessionSnapshot({ userId, roles });

  const baseAssignment = {
    faculty_id: "faculty-1",
    program_id: "prog-1",
    course_scope: CourseScope.PROGRAM_SPECIFIC,
  };

  describe("Faculty self-deploy", () => {
    it("allows faculty to deploy when they are the assigned teacher", () => {
      const session = makeSession([ROLES.FACULTY], "faculty-1");
      const result = canDeployCourseBoundEvaluation(session, baseAssignment);

      expect(result.allowed).toBe(true);
    });

    it("denies faculty when they are not the assigned teacher", () => {
      const session = makeSession([ROLES.FACULTY], "other-faculty");
      const result = canDeployCourseBoundEvaluation(session, baseAssignment);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("Only the assigned faculty member");
      }
    });
  });

  describe("Program Head on-behalf deployment", () => {
    const phSession = makeSession([ROLES.PROGRAM_HEAD], "ph-user");

    it("allows PH to deploy on-behalf for program-specific course in their scope", () => {
      const assignment = {
        faculty_id: "faculty-1",
        program_id: "prog-1",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
      };

      const result = canDeployCourseBoundEvaluation(phSession, assignment, ["prog-1"]);

      expect(result.allowed).toBe(true);
    });

    it("denies PH from deploying General Education courses", () => {
      const assignment = {
        faculty_id: "faculty-1",
        program_id: null,
        course_scope: CourseScope.GENERAL_EDUCATION,
      };

      const result = canDeployCourseBoundEvaluation(phSession, assignment, ["prog-1"]);

      expect(result).toEqual({
        allowed: false,
        reason: "Program Heads cannot publish General Education evaluations.",
      });
    });

    it("denies PH when course is outside their program scope", () => {
      const assignment = {
        faculty_id: "faculty-1",
        program_id: "prog-2",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
      };

      const result = canDeployCourseBoundEvaluation(phSession, assignment, ["prog-1"]);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.reason).toContain("program scope");
      }
    });
  });

  describe("Dean and Secretary on-behalf deployment", () => {
    it("allows Dean to deploy on-behalf for any assignment", () => {
      const session = makeSession([ROLES.DEAN], "dean-user");
      const assignment = {
        faculty_id: "faculty-1",
        program_id: "prog-1",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
      };

      const result = canDeployCourseBoundEvaluation(session, assignment, []);

      expect(result.allowed).toBe(true);
    });

    it("allows Secretary to deploy on-behalf for any assignment", () => {
      const session = makeSession([ROLES.SECRETARY], "secretary-user");
      const assignment = {
        faculty_id: "faculty-1",
        program_id: "prog-1",
        course_scope: CourseScope.PROGRAM_SPECIFIC,
      };

      const result = canDeployCourseBoundEvaluation(session, assignment, []);

      expect(result.allowed).toBe(true);
    });
  });
});
