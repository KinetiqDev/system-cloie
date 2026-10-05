// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

import { selectRows } from "@/__tests__/helpers/where-clause";
import { listProgramHeadResponseDeployments } from "@/features/analytics/services/list-program-head-response-deployments";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    course: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    major: { findMany: vi.fn() },
    instrumentTemplate: { findMany: vi.fn() },
    courseBoundEvaluation: { count: vi.fn(), findMany: vi.fn() },
    centralDeployment: { count: vi.fn(), findMany: vi.fn() },
    evaluationAssignment: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const PROGRAM = "program-bsit";

const filters = (over: Partial<ProgramHeadResponsesFilterState> = {}) =>
  ({ tab: "course", page: 1, ...over }) as ProgramHeadResponsesFilterState;

const emptyStats = { course_bound_id: null, central_deployment_id: null, response: null };

/**
 * Program Head Responses lists course-bound and program-wide deployments.
 * Course-bound evidence is Program-specific only: a General Education course
 * can hold an assignment in this same Program, so Program equality alone would
 * list GE deployments, counts, and filter options the Coordinator owns. These
 * tests pin the course-scope gate on the list predicate and on every filter
 * option, and prove behaviorally that a GE row never matches.
 */
describe("listProgramHeadResponseDeployments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    prismaMock.course.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.major.findMany.mockResolvedValue([]);
    prismaMock.instrumentTemplate.findMany.mockResolvedValue([]);
    prismaMock.courseBoundEvaluation.count.mockResolvedValue(0);
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([]);
    prismaMock.centralDeployment.count.mockResolvedValue(0);
    prismaMock.centralDeployment.findMany.mockResolvedValue([]);
    prismaMock.evaluationAssignment.findMany.mockResolvedValue([]);
  });

  describe("course-bound list", () => {
    it("scopes the list to Program-specific courses", async () => {
      await listProgramHeadResponseDeployments(PROGRAM, filters());

      const where = prismaMock.courseBoundEvaluation.findMany.mock.calls[0][0].where;
      expect(where.course_assignment).toMatchObject({
        program_id: PROGRAM,
        course: { course_scope: "PROGRAM_SPECIFIC" },
      });
      // The count query must carry the same gate as the list, or the total and
      // the rows on the page would describe different scopes.
      expect(
        prismaMock.courseBoundEvaluation.count.mock.calls[0][0].where.course_assignment
      ).toEqual(where.course_assignment);
    });

    it("keeps the major filter inside the course-scope gate", async () => {
      // course_scope and major_id share one `course` filter object; a GE course
      // with a major must not reappear through the major facet.
      await listProgramHeadResponseDeployments(PROGRAM, filters({ majorId: "major-1" }));

      const where = prismaMock.courseBoundEvaluation.findMany.mock.calls[0][0].where;
      expect(where.course_assignment.course).toEqual({
        course_scope: "PROGRAM_SPECIFIC",
        major_id: "major-1",
      });
    });

    it("does not list a General Education evaluation bound to the same Program", async () => {
      // Behavioral boundary against the seeded GEETHICS shape: a
      // GENERAL_EDUCATION course whose CourseAssignment carries this same
      // Program, so Program equality alone would admit it.
      const geEvaluation = {
        id: "eval-geethics",
        deployment_name: "GEETHICS Post-Term CILO Evaluation",
        status: "ACTIVE",
        term_instance: {
          semester: "SECOND",
          term: "SECOND_TERM",
          school_year: { code: "2025-2026" },
        },
        course_assignment: {
          program_id: PROGRAM,
          course: { course_scope: "GENERAL_EDUCATION" },
        },
      };
      prismaMock.courseBoundEvaluation.findMany.mockImplementation(async ({ where }) =>
        selectRows(where, [geEvaluation])
      );
      prismaMock.courseBoundEvaluation.count.mockImplementation(
        async ({ where }) => selectRows(where, [geEvaluation]).length
      );

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });

    it("still lists a Program-specific evaluation in the same Program", async () => {
      // Boundary: the GE gate must exclude GE without also excluding the
      // Program Head's own evidence, which shares the same Program.
      const programEvaluation = {
        id: "eval-it201",
        deployment_name: "IT201 Post-Term",
        status: "ACTIVE",
        instrument: { structure_snapshot: [], template: { name: "CILO Tool" } },
        term_instance: {
          semester: "SECOND",
          term: "FIRST_TERM",
          school_year: { code: "2025-2026" },
        },
        course_assignment: {
          program_id: PROGRAM,
          course: { course_scope: "PROGRAM_SPECIFIC" },
          year_level: "SECOND_YEAR",
          section: "MORNING",
          faculty: { name: "Dr. Smith" },
        },
      };
      prismaMock.courseBoundEvaluation.count.mockImplementation(
        async ({ where }) => selectRows(where, [programEvaluation]).length
      );
      prismaMock.courseBoundEvaluation.findMany.mockImplementation(async ({ where }) =>
        selectRows(where, [programEvaluation]).map((row) => ({
          ...row,
          course_assignment: {
            ...row.course_assignment,
            course: {
              id: "c-it201",
              code: "IT201",
              title: "Data Structures",
              major: null,
            },
          },
        }))
      );

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(result.items[0]?.title).toBe("IT201 Post-Term");
      expect(result.items[0]?.course?.code).toBe("IT201");
    });
  });

  describe("filter options", () => {
    it("offers only Program-specific courses and faculty", async () => {
      await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(prismaMock.course.findMany.mock.calls[0][0].where.course_scope).toBe(
        "PROGRAM_SPECIFIC"
      );
      expect(
        prismaMock.user.findMany.mock.calls[0][0].where.course_assignments.some.course.course_scope
      ).toBe("PROGRAM_SPECIFIC");
    });

    it("does not offer a General Education course or its faculty", async () => {
      const courseFilter = { course_scope: "GENERAL_EDUCATION" };
      const courses = [{ id: "course-ge", code: "GEETHICS" }];
      const users = [{ id: "fac-ge" }];
      prismaMock.course.findMany.mockImplementation(async ({ where }) =>
        selectRows(where, courses)
      );
      prismaMock.user.findMany.mockImplementation(async ({ where }) =>
        selectRows(
          where,
          users.map((user) => ({ ...user, course_assignments: [{ course: courseFilter }] }))
        )
      );

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(result.options.courses).toEqual([]);
      expect(result.options.faculty).toEqual([]);
    });

    it("does not offer periods that exist only for General Education evidence", async () => {
      const periods = [{ id: "term-ge" }];
      const gePeriod = {
        central_deployments: [],
        course_bound_evaluations: [
          {
            course_assignment: {
              program_id: PROGRAM,
              course: { course_scope: "GENERAL_EDUCATION" },
            },
          },
        ],
      };
      prismaMock.academicTermInstance.findMany.mockImplementation(async ({ where }) =>
        selectRows(where, [gePeriod]).length > 0 ? periods : []
      );

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(result.options.periodOptions.termInstances).toEqual([]);
    });

    it("keeps program-owned majors and Central instrument templates", async () => {
      // Majors and instrument templates are Program catalog, not course-bound GE
      // evidence; neither is gated on course scope.
      await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(prismaMock.major.findMany.mock.calls[0][0].where).toEqual({
        program_id: PROGRAM,
        is_active: true,
      });
      expect(
        JSON.stringify(prismaMock.instrumentTemplate.findMany.mock.calls[0][0].where)
      ).not.toContain("course_scope");
    });
  });

  describe("response statistics", () => {
    it("derives assigned, submitted, and mean only from in-scope evaluation ids", async () => {
      prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
        {
          id: "eval-it201",
          deployment_name: "IT201 Post-Term",
          status: "ACTIVE",
          instrument: { structure_snapshot: [], template: { name: "CILO Tool" } },
          term_instance: {
            semester: "SECOND",
            term: "FIRST_TERM",
            school_year: { code: "2025-2026" },
          },
          course_assignment: {
            year_level: "SECOND_YEAR",
            section: "MORNING",
            course: { id: "c-it201", code: "IT201", title: "Data Structures", major: null },
            faculty: { name: "Dr. Smith" },
          },
        },
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        {
          ...emptyStats,
          course_bound_id: "eval-it201",
          response: { status: "SUBMITTED", quant_items: [{ rating_value: 4 }] },
        },
        {
          ...emptyStats,
          course_bound_id: "eval-it201",
          response: { status: "SUBMITTED", quant_items: [{ rating_value: 5 }] },
        },
        { ...emptyStats, course_bound_id: "eval-it201", response: null },
      ]);

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(prismaMock.evaluationAssignment.findMany.mock.calls[0][0].where).toEqual({
        course_bound_id: { in: ["eval-it201"] },
      });
      expect(result.items[0].assigned).toBe(3);
      expect(result.items[0].submitted).toBe(2);
      expect(result.items[0].mean).toBe(4.5);
    });

    it("never fetches IN_PROGRESS answer bodies while still counting every opportunity", async () => {
      // The submitted-response invariant: draft ratings must never be read, so
      // the status filter is pushed into the quant_items sub-select instead of
      // being applied in JS after the body has already been fetched. Assignment
      // rows themselves stay unfiltered, because every one is an opportunity.
      prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
        {
          id: "eval-it201",
          deployment_name: "IT201 Post-Term",
          status: "ACTIVE",
          instrument: { structure_snapshot: [], template: { name: "CILO Tool" } },
          term_instance: {
            semester: "SECOND",
            term: "FIRST_TERM",
            school_year: { code: "2025-2026" },
          },
          course_assignment: {
            year_level: "SECOND_YEAR",
            section: "MORNING",
            course: { id: "c-it201", code: "IT201", title: "Data Structures", major: null },
            faculty: { name: "Dr. Smith" },
          },
        },
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        {
          ...emptyStats,
          course_bound_id: "eval-it201",
          response: { status: "SUBMITTED", quant_items: [{ rating_value: 4 }] },
        },
        {
          ...emptyStats,
          course_bound_id: "eval-it201",
          response: { status: "IN_PROGRESS", quant_items: [] },
        },
        { ...emptyStats, course_bound_id: "eval-it201", response: null },
      ]);

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      const select = prismaMock.evaluationAssignment.findMany.mock.calls[0][0].select;
      expect(select.response.select.quant_items.where).toEqual({
        response: { status: "SUBMITTED" },
      });
      // Opportunities keep every assignment row; only rating bodies are gated.
      expect(prismaMock.evaluationAssignment.findMany.mock.calls[0][0].where).toEqual({
        course_bound_id: { in: ["eval-it201"] },
      });
      expect(result.items[0].assigned).toBe(3);
      expect(result.items[0].submitted).toBe(1);
      expect(result.items[0].mean).toBe(4);
    });

    it("applies the same submitted-only gate to program-wide statistics", async () => {
      prismaMock.centralDeployment.findMany.mockResolvedValue([
        {
          id: "central-1",
          deployment_name: "Exit Survey 2026",
          status: "ACTIVE",
          target_stakeholder: "STUDENT",
          major: null,
          year_level: null,
          instrument: { structure_snapshot: [], template: { name: "Exit Survey" } },
          term_instance: {
            semester: "SECOND",
            term: "SECOND_TERM",
            school_year: { code: "2025-2026" },
          },
        },
      ]);

      await listProgramHeadResponseDeployments(PROGRAM, filters({ tab: "program-wide" }));

      const select = prismaMock.evaluationAssignment.findMany.mock.calls[0][0].select;
      expect(select.response.select.quant_items.where).toEqual({
        response: { status: "SUBMITTED" },
      });
      expect(prismaMock.evaluationAssignment.findMany.mock.calls[0][0].where).toEqual({
        central_deployment_id: { in: ["central-1"] },
      });
    });

    it("reports no mean when no response is submitted", async () => {
      prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
        {
          id: "eval-it201",
          deployment_name: "IT201 Post-Term",
          status: "ACTIVE",
          instrument: { structure_snapshot: [], template: { name: "CILO Tool" } },
          term_instance: {
            semester: "SECOND",
            term: "FIRST_TERM",
            school_year: { code: "2025-2026" },
          },
          course_assignment: {
            year_level: "SECOND_YEAR",
            section: "MORNING",
            course: { id: "c-it201", code: "IT201", title: "Data Structures", major: null },
            faculty: { name: "Dr. Smith" },
          },
        },
      ]);
      prismaMock.evaluationAssignment.findMany.mockResolvedValue([
        { ...emptyStats, course_bound_id: "eval-it201", response: null },
      ]);

      const result = await listProgramHeadResponseDeployments(PROGRAM, filters());

      expect(result.items[0].assigned).toBe(1);
      expect(result.items[0].submitted).toBe(0);
      expect(result.items[0].mean).toBeNull();
    });
  });

  describe("program-wide list", () => {
    it("keeps Central deployments on the Program path without a course-scope gate", async () => {
      const result = await listProgramHeadResponseDeployments(
        PROGRAM,
        filters({ tab: "program-wide" })
      );

      const where = prismaMock.centralDeployment.findMany.mock.calls[0][0].where;
      expect(where.program_id).toBe(PROGRAM);
      expect(JSON.stringify(where)).not.toContain("course_scope");
      // No rows means no per-row statistics read at all.
      expect(prismaMock.evaluationAssignment.findMany).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });
  });
});
