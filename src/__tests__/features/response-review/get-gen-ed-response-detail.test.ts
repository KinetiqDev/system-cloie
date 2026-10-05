// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getGenEdResponseDetail } from "@/features/response-review/services/get-gen-ed-response-detail";

const {
  responseFindFirstMock,
  ciloMappingFindManyMock,
  studentEnrollmentFindManyMock,
  resolveAuthSessionMock,
} = vi.hoisted(() => ({
  responseFindFirstMock: vi.fn(),
  ciloMappingFindManyMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    response: { findFirst: responseFindFirstMock },
    cILOMapping: { findMany: ciloMappingFindManyMock },
    studentEnrollment: { findMany: studentEnrollmentFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const MOCK_RESPONSE = {
  id: "response-1",
  submitted_at: new Date("2026-01-04T08:00:00.000Z"),
  respondent: { id: "student-p", name: "Patricia Luna" },
  assignment: {
    course_bound: {
      id: "eval-ge",
      deployment_name: "GEETHICS Post-Term CILO Evaluation",
      instrument: {
        structure_snapshot: [
          {
            key: "teaching",
            title: "Teaching",
            items: [
              {
                key: "clarity",
                kind: "quantitative",
                prompt: "Clarity",
                scale: [1, 2, 3, 4, 5],
              },
              { key: "remarks", kind: "qualitative", prompt: "Remarks" },
            ],
          },
        ],
      },
      course_assignment: {
        course: { code: "GEETHICS", title: "Ethics", major: null },
        faculty: { name: "Dr. Santos" },
        program: { name: "BSIT" },
        year_level: "THIRD_YEAR",
        section: "MORNING",
        term_instance: {
          id: "term-ti1",
          school_year: { code: "2025-2026" },
          semester: "SECOND",
          term: "FIRST_TERM",
        },
      },
      cilo_question_bindings: [
        {
          id: "binding-clarity",
          cilo_id: "cilo-ge-1",
          cilo_description_snapshot: "CILO 1",
          section_key: "teaching",
          item_key: "clarity",
        },
      ],
      go_question_bindings: [],
    },
    central_deployment: null,
  },
  quant_items: [
    {
      cilo_question_binding_id: "binding-clarity",
      section_key: "teaching",
      item_key: "clarity",
      rating_value: 5,
    },
  ],
  qual_items: [{ section_key: "teaching", prompt_key: "remarks", text_content: "Very clear." }],
};

describe("getGenEdResponseDetail (ADR 0034)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.GEN_ED_COORDINATOR,
      roles: [ROLES.GEN_ED_COORDINATOR],
      userId: "coordinator-1",
    });
    ciloMappingFindManyMock.mockResolvedValue([]);
    studentEnrollmentFindManyMock.mockResolvedValue([
      {
        student_user_id: "student-p",
        program_id: "prog-bsit",
        program: { name: "BSIT" },
        major_id: null,
        major: null,
        year_level: "THIRD_YEAR",
        section: "MORNING",
      },
    ]);
  });

  it("denies a Program Head even for a General Education response", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });

    await expect(getGenEdResponseDetail("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });

  it("denies an unauthenticated caller", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    await expect(getGenEdResponseDetail("response-1")).resolves.toBeNull();
    expect(responseFindFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the query to a submitted General Education course-bound response", async () => {
    responseFindFirstMock.mockResolvedValue(MOCK_RESPONSE);

    await getGenEdResponseDetail("response-1");

    expect(responseFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "response-1",
          status: "SUBMITTED",
          deployment_type: "COURSE_BOUND",
          assignment: {
            course_bound: {
              course_assignment: { course: { course_scope: "GENERAL_EDUCATION" } },
            },
          },
        },
      })
    );
    const where = responseFindFirstMock.mock.calls[0][0].where;
    expect(where.assignment.course_bound.course_assignment.program_id).toBeUndefined();
    expect(where.assignment.central_deployment).toBeUndefined();
  });

  it("returns identified detail with answers for a submitted General Education response", async () => {
    responseFindFirstMock.mockResolvedValue(MOCK_RESPONSE);

    const detail = await getGenEdResponseDetail("response-1");

    expect(detail).not.toBeNull();
    expect(detail!.respondent.name).toBe("Patricia Luna");
    expect(detail!.respondent.stakeholder).toBe("STUDENT");
    expect(detail!.evaluation.type).toBe("COURSE_BOUND");
    if (detail!.evaluation.type !== "COURSE_BOUND") throw new Error("expected course-bound");
    expect(detail!.evaluation.context.courseCode).toBe("GEETHICS");
    const items = detail!.sections[0].items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      kind: "quantitative",
      rating: 5,
      binding: { type: "CILO", ciloLabel: "CILO 1" },
    });
    expect(items[1]).toMatchObject({ kind: "qualitative", text: "Very clear." });
  });

  it("returns null for a non-submitted or out-of-scope response", async () => {
    responseFindFirstMock.mockResolvedValue({ ...MOCK_RESPONSE, submitted_at: null });
    await expect(getGenEdResponseDetail("response-draft")).resolves.toBeNull();

    responseFindFirstMock.mockResolvedValue({
      ...MOCK_RESPONSE,
      assignment: {
        ...MOCK_RESPONSE.assignment,
        course_bound: null,
        central_deployment: { id: "d-1" },
      },
    });
    await expect(getGenEdResponseDetail("response-central")).resolves.toBeNull();
  });
});
