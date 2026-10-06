// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getGenEdCourseEvaluationDetail } from "@/features/response-review/services/get-gen-ed-course-evaluation-detail";

const {
  courseBoundEvaluationFindFirstMock,
  evaluationAssignmentFindManyMock,
  responseFindManyMock,
  iloMappingFindManyMock,
  goMappingFindManyMock,
  studentEnrollmentFindManyMock,
  resolveAuthSessionMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationFindFirstMock: vi.fn(),
  evaluationAssignmentFindManyMock: vi.fn(),
  responseFindManyMock: vi.fn(),
  iloMappingFindManyMock: vi.fn(),
  goMappingFindManyMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: { findFirst: courseBoundEvaluationFindFirstMock },
    evaluationAssignment: { findMany: evaluationAssignmentFindManyMock },
    response: { findMany: responseFindManyMock },
    cILOInstitutionalOutcomeMapping: { findMany: iloMappingFindManyMock },
    cILOMapping: { findMany: goMappingFindManyMock },
    studentEnrollment: { findMany: studentEnrollmentFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

const MOCK_EVALUATION = {
  id: "eval-ge",
  deployment_name: "GEETHICS Post-Term CILO Evaluation",
  course_info_snapshot: null,
  activation_at: new Date("2026-01-01T00:00:00.000Z"),
  deadline_at: new Date("2026-01-15T00:00:00.000Z"),
  status: "CLOSED",
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
            likertDescriptors: [
              { value: 1, label: "Not Achieved" },
              { value: 2, label: "Slightly Achieved" },
              { value: 3, label: "Moderately Achieved" },
              { value: 4, label: "Mostly Achieved" },
              { value: 5, label: "Fully Achieved" },
            ],
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
};

function seedSubmittedResponse(respondentId: string, respondentName: string) {
  return {
    id: `response-${respondentId}`,
    submitted_at: new Date("2026-01-04T08:00:00.000Z"),
    respondent_id: respondentId,
    respondent: { name: respondentName },
    quant_items: [{ section_key: "teaching", item_key: "clarity", rating_value: 4 }],
    qual_items: [{ section_key: "teaching", prompt_key: "remarks", text_content: "Clear." }],
  };
}

describe("getGenEdCourseEvaluationDetail (ADR 0034)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.GEN_ED_COORDINATOR,
      roles: [ROLES.GEN_ED_COORDINATOR],
      userId: "coordinator-1",
    });
    iloMappingFindManyMock.mockResolvedValue([]);
  });

  it("denies a Program Head even when the evaluation is General Education", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });

    await expect(getGenEdCourseEvaluationDetail("eval-ge")).resolves.toBeNull();
    expect(courseBoundEvaluationFindFirstMock).not.toHaveBeenCalled();
  });

  it("denies a Dean and an unauthenticated caller", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.DEAN,
      roles: [ROLES.DEAN],
      userId: "dean-1",
    });
    await expect(getGenEdCourseEvaluationDetail("eval-ge")).resolves.toBeNull();

    resolveAuthSessionMock.mockResolvedValue(null);
    await expect(getGenEdCourseEvaluationDetail("eval-ge")).resolves.toBeNull();
    expect(courseBoundEvaluationFindFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the query to a General Education course without any Program filter", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    await getGenEdCourseEvaluationDetail("eval-ge");

    expect(courseBoundEvaluationFindFirstMock).toHaveBeenCalledTimes(1);
    const where = courseBoundEvaluationFindFirstMock.mock.calls[0][0].where;
    expect(where).toEqual({
      id: "eval-ge",
      course_assignment: { course: { course_scope: "GENERAL_EDUCATION" } },
    });
    expect(where.course_assignment.program_id).toBeUndefined();
  });

  it("returns null when the evaluation is a Program-specific course", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(null);

    await expect(getGenEdCourseEvaluationDetail("eval-it201")).resolves.toBeNull();
  });

  it("returns identified respondents with their term-scoped academic context", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      { respondent_id: "student-p", response: { status: "SUBMITTED" } },
      { respondent_id: "student-l", response: { status: "SUBMITTED" } },
    ]);
    responseFindManyMock.mockResolvedValue([
      seedSubmittedResponse("student-p", "Patricia Luna"),
      seedSubmittedResponse("student-l", "Ana Reyes"),
    ]);
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

    const detail = await getGenEdCourseEvaluationDetail("eval-ge");

    expect(detail).not.toBeNull();
    expect(detail!.respondents).toHaveLength(2);
    expect(detail!.respondents[0].name).toBe("Patricia Luna");
    expect(detail!.respondents[0].yearLevel).toBe("THIRD_YEAR");
    expect(detail!.respondents[0].section).toBe("MORNING");
    expect(detail!.summary.submittedCount).toBe(2);
    expect(detail!.summary.eligibleCount).toBe(2);
    expect(detail!.evaluation.courseCode).toBe("GEETHICS");
    expect(detail!.evaluation.periodLabel).toBe("2025-2026 — 2nd Semester — 1st Term");
  });

  it("projects ILO alignments, never GO mappings, on a General Education evaluation", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([
      seedSubmittedResponse("student-p", "Patricia Luna"),
      seedSubmittedResponse("student-l", "Ana Reyes"),
    ]);
    iloMappingFindManyMock.mockResolvedValue([
      {
        cilo_id: "cilo-ge-1",
        manifestation: "LEARNING",
        institutional_outcome: { id: "ilo-1", code: "ILO1", description: "Think critically" },
      },
    ]);

    const detail = await getGenEdCourseEvaluationDetail("eval-ge");

    expect(detail!.alignmentLayer).toBe("INSTITUTIONAL_OUTCOME");
    expect(detail!.iloMappingsByCilo["cilo-ge-1"]).toEqual([
      {
        iloId: "ilo-1",
        iloCode: "ILO1",
        iloDescription: "Think critically",
        manifestation: "LEARNING",
      },
    ]);
    // A General Education evaluation must never read the Program-specific
    // CILO→GO mapping table, and its CILO metrics carry no GO rows.
    expect(goMappingFindManyMock).not.toHaveBeenCalled();
    expect(detail!.ciloResults[0].mappings).toEqual([]);
  });

  it("aggregates ILO evidence for this evaluation from the same valid ratings", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([
      seedSubmittedResponse("student-p", "Patricia Luna"),
      seedSubmittedResponse("student-l", "Ana Reyes"),
    ]);
    iloMappingFindManyMock.mockResolvedValue([
      {
        cilo_id: "cilo-ge-1",
        manifestation: "LEARNING",
        institutional_outcome: { id: "ilo-1", code: "ILO1", description: "Think critically" },
      },
    ]);

    const detail = await getGenEdCourseEvaluationDetail("eval-ge");

    // Two responses rated 4 on the bound question; the CILO path is the only
    // route to an ILO, so the row carries both contributions at mean 4.
    expect(detail!.iloResults).toHaveLength(1);
    expect(detail!.iloResults[0]).toMatchObject({
      outcomeId: "ilo-1",
      code: "ILO1",
      meanRating: 4,
      ratingCount: 2,
      submittedResponseCount: 2,
    });
    expect(detail!.iloResults[0].contributors[0]).toMatchObject({
      kind: "CILO",
      manifestation: "LEARNING",
    });
  });

  it("never fetches in-progress response bodies", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      { respondent_id: "student-p", response: { status: "SUBMITTED" } },
      { respondent_id: "student-d", response: { status: "IN_PROGRESS" } },
    ]);
    responseFindManyMock.mockResolvedValue([seedSubmittedResponse("student-p", "Patricia Luna")]);

    await getGenEdCourseEvaluationDetail("eval-ge");

    expect(responseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "SUBMITTED", assignment: { course_bound_id: "eval-ge" } },
      })
    );
  });
});
