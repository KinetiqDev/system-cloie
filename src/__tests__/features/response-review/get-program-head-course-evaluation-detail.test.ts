// fallow-ignore-file code-duplication
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { getProgramHeadCourseEvaluationDetail } from "@/features/response-review/services/get-program-head-course-evaluation-detail";
import { matchesWhere } from "@/__tests__/helpers/where-clause";

const {
  courseBoundEvaluationFindFirstMock,
  evaluationAssignmentFindManyMock,
  responseFindManyMock,
  ciloMappingFindManyMock,
  studentEnrollmentFindManyMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
} = vi.hoisted(() => ({
  courseBoundEvaluationFindFirstMock: vi.fn(),
  evaluationAssignmentFindManyMock: vi.fn(),
  responseFindManyMock: vi.fn(),
  ciloMappingFindManyMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    courseBoundEvaluation: { findFirst: courseBoundEvaluationFindFirstMock },
    evaluationAssignment: { findMany: evaluationAssignmentFindManyMock },
    response: { findMany: responseFindManyMock },
    cILOMapping: { findMany: ciloMappingFindManyMock },
    studentEnrollment: { findMany: studentEnrollmentFindManyMock },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

const MOCK_EVALUATION = {
  id: "eval-1",
  deployment_name: "Post-Term CILO Evaluation Tool",
  activation_at: new Date("2026-01-01T00:00:00.000Z"),
  deadline_at: new Date("2026-01-15T00:00:00.000Z"),
  status: "ACTIVE",
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
    course: { code: "IT101", title: "Intro to Computing", major: null },
    faculty: { name: "Dr. Smith" },
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
      cilo_id: "cilo-1",
      cilo_description_snapshot: "CILO 1",
      section_key: "teaching",
      item_key: "clarity",
    },
  ],
};

describe("getProgramHeadCourseEvaluationDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.PROGRAM_HEAD,
      roles: [ROLES.PROGRAM_HEAD],
      userId: "head-1",
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "head-1",
        selectedProgram: { id: "prog-beed", code: "BEED", name: "BEED" },
        authorizedPrograms: [],
      },
    });
    ciloMappingFindManyMock.mockResolvedValue([
      {
        cilo_id: "cilo-1",
        po: { id: "po-1", code: "PO-1", description: "Communicate" },
        manifestation: "LEARNING",
      },
    ]);
  });

  it("returns null when the active role is not PROGRAM_HEAD", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });

    await expect(getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1")).resolves.toBeNull();
    expect(courseBoundEvaluationFindFirstMock).not.toHaveBeenCalled();
  });

  it("scopes the evaluation query to the selected Program and Program-specific courses", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(courseBoundEvaluationFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "eval-1",
          course_assignment: {
            program_id: "prog-beed",
            course: { course_scope: "PROGRAM_SPECIFIC" },
          },
        },
      })
    );
  });

  it("denies a General Education evaluation whose assignment is in the selected Program", async () => {
    // GEETHICS shape: a GENERAL_EDUCATION course whose CourseAssignment carries
    // the Program Head's own Program. Program equality alone would admit it, so
    // the gate must exclude the row on course scope. The captured clause is
    // evaluated against that row rather than only asserted structurally.
    courseBoundEvaluationFindFirstMock.mockImplementation((args) =>
      matchesWhere(args.where, {
        id: "eval-geethics",
        course_assignment: {
          program_id: "prog-beed",
          course: { course_scope: "GENERAL_EDUCATION" },
        },
      })
        ? Promise.resolve(MOCK_EVALUATION)
        : Promise.resolve(null)
    );
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    await expect(
      getProgramHeadCourseEvaluationDetail("prog-beed", "eval-geethics")
    ).resolves.toBeNull();
    // No evidence rows are read for a denied evaluation.
    expect(responseFindManyMock).not.toHaveBeenCalled();
  });

  it("still resolves a Program-specific evaluation in the selected Program", async () => {
    // Boundary: the GE gate must not exclude the Program Head's own evidence.
    courseBoundEvaluationFindFirstMock.mockImplementation((args) =>
      matchesWhere(args.where, {
        id: "eval-1",
        course_assignment: {
          program_id: "prog-beed",
          course: { course_scope: "PROGRAM_SPECIFIC" },
        },
      })
        ? Promise.resolve(MOCK_EVALUATION)
        : Promise.resolve(null)
    );
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    const result = await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(result).not.toBeNull();
  });

  it("returns null when the evaluation does not belong to the Program", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(null);

    await expect(
      getProgramHeadCourseEvaluationDetail("prog-beed", "eval-other")
    ).resolves.toBeNull();
  });

  it("keeps the participation invariant over raw assignment rows", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      { respondent_id: "user-s1", response: { status: "SUBMITTED" } },
      { respondent_id: "user-s2", response: { status: "SUBMITTED" } },
      { respondent_id: "user-s3", response: { status: "IN_PROGRESS" } },
      { respondent_id: "user-s4", response: null },
    ]);
    responseFindManyMock.mockResolvedValue([]);

    const result = await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(result).not.toBeNull();
    const p = result!.participation;
    expect(p.assigned).toBe(4);
    expect(p.submitted).toBe(2);
    expect(p.inProgress).toBe(1);
    expect(p.notStarted).toBe(1);
    expect(p.submitted + p.inProgress + p.notStarted).toBe(p.assigned);
    expect(result!.summary.eligibleCount).toBe(4);
    expect(result!.summary.submittedCount).toBe(2);
  });

  it("renders a zero-response evaluation with empty respondents and zero summary", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      { respondent_id: "user-s1", response: null },
    ]);
    responseFindManyMock.mockResolvedValue([]);

    const result = await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(result).not.toBeNull();
    expect(result!.summary.submittedCount).toBe(0);
    expect(result!.respondents).toEqual([]);
    expect(result!.ciloResults).toEqual([]);
    expect(result!.questionResults).toEqual([]);
    expect(result!.summary.evaluationMean).toBeNull();
  });

  it("builds CILO and question metrics with identified respondents", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([
      { respondent_id: "user-s1", response: { status: "SUBMITTED" } },
    ]);
    responseFindManyMock.mockResolvedValue([
      {
        id: "response-1",
        submitted_at: new Date("2026-01-04T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        quant_items: [
          {
            cilo_question_binding_id: "binding-clarity",
            section_key: "teaching",
            item_key: "clarity",
            rating_value: 4,
          },
        ],
        qual_items: [
          { section_key: "teaching", prompt_key: "remarks", text_content: "Very clear." },
        ],
      },
    ]);
    studentEnrollmentFindManyMock.mockResolvedValue([
      {
        student_user_id: "user-s1",
        program_id: "prog-beed",
        program: { name: "BEED" },
        major_id: null,
        major: null,
        year_level: "THIRD_YEAR",
        section: "MORNING",
      },
    ]);

    const result = await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(result).not.toBeNull();
    expect(result!.evaluation.periodLabel).toBe("2025-2026 — 2nd Semester — 1st Term");
    expect(result!.evaluation.yearLevel).toBe("THIRD_YEAR");
    expect(result!.evaluation.section).toBe("MORNING");
    expect(result!.ciloResults[0].quantitative?.mean).toBe(4);
    expect(result!.ciloResults[0].mappings[0].poCode).toBe("PO-1");
    // Question metric
    expect(result!.questionResults).toHaveLength(1);
    expect(result!.questionResults[0].binding.type).toBe("CILO");
    // Identified respondents
    expect(result!.respondents).toHaveLength(1);
    expect(result!.respondents[0].name).toBe("Juan dela Cruz");
    expect(result!.respondents[0].yearLevel).toBe("THIRD_YEAR");
    expect(result!.respondents[0].section).toBe("MORNING");
    // Summary
    expect(result!.summary.evaluationMean).toBe(4);
    expect(result!.summary.qualitativeAnswerCount).toBe(1);
    expect(result!.summary.qualitativeRespondentCount).toBe(1);
    expect(result!.summary.ciloCount).toBe(1);
    // Qualitative summary (§25.3)
    expect(result!.qualitative.answerCount).toBe(1);
    expect(result!.qualitative.respondentCount).toBe(1);
    expect(result!.qualitative.prompts).toEqual([{ prompt: "Remarks", answerCount: 1 }]);
    expect(result!.qualitative.topTerms.length).toBeGreaterThan(0);
  });

  it("prefers published snapshot labels when the live assignment changed", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue({
      ...MOCK_EVALUATION,
      course_info_snapshot: {
        snapshotSchemaVersion: 2,
        courseAssignmentId: "assignment-1",
        courseId: "course-1",
        courseCode: "IT101-PREV",
        courseTitle: "Intro to Computing (previous edition)",
        courseScope: "PROGRAM_SPECIFIC",
        programId: "prog-beed",
        programCode: "BEED",
        programName: "BEED",
        majorId: null,
        majorName: null,
        termInstanceId: "term-ti1",
        schoolYearCode: "2024-2025",
        semester: "SECOND",
        term: "SECOND_TERM",
        yearLevel: "SECOND_YEAR",
        section: "AFTERNOON",
        facultyId: "faculty-1",
        facultyName: "Dr. Previous",
        capturedAt: "2025-06-01T00:00:00.000Z",
        assignmentContextSource: "PUBLICATION",
      },
    });
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    const result = await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(result).not.toBeNull();
    expect(result!.evaluation).toMatchObject({
      courseCode: "IT101-PREV",
      courseTitle: "Intro to Computing (previous edition)",
      facultyName: "Dr. Previous",
      yearLevel: "SECOND_YEAR",
      section: "AFTERNOON",
      periodLabel: "2024-2025 — 2nd Semester — 2nd Term",
    });
  });

  it("keeps separator-bearing section and item keys on distinct questions", async () => {
    // Section/item keys are arbitrary nonempty strings, so ("a", "b|c") and
    // ("a|b", "c") are two questions. A separator-joined lookup merges them:
    // one question serves the other's prompt, binding, and PO evidence.
    const likertDescriptors = [
      { value: 1, label: "Not Achieved" },
      { value: 2, label: "Slightly Achieved" },
      { value: 3, label: "Moderately Achieved" },
      { value: 4, label: "Mostly Achieved" },
      { value: 5, label: "Fully Achieved" },
    ];
    courseBoundEvaluationFindFirstMock.mockResolvedValue({
      ...MOCK_EVALUATION,
      instrument: {
        structure_snapshot: [
          {
            key: "a",
            title: "Section A",
            items: [
              { key: "b|c", kind: "quantitative", prompt: "Prompt of a/b|c", likertDescriptors },
              { key: "e|f", kind: "qualitative", prompt: "Prompt of a/e|f" },
            ],
          },
          {
            key: "a|b",
            title: "Section A|B",
            items: [
              { key: "c", kind: "quantitative", prompt: "Prompt of a|b/c", likertDescriptors },
            ],
          },
          {
            key: "a|e",
            title: "Section A|E",
            items: [{ key: "f", kind: "qualitative", prompt: "Prompt of a|e/f" }],
          },
        ],
      },
      cilo_question_bindings: [
        {
          id: "binding-first",
          cilo_id: "cilo-1",
          cilo_description_snapshot: "CILO of a/b|c",
          section_key: "a",
          item_key: "b|c",
        },
      ],
    });
    evaluationAssignmentFindManyMock.mockResolvedValue([
      { respondent_id: "user-s1", response: { status: "SUBMITTED" } },
    ]);
    responseFindManyMock.mockResolvedValue([
      {
        id: "response-1",
        submitted_at: new Date("2026-01-04T08:00:00.000Z"),
        respondent_id: "user-s1",
        respondent: { name: "Juan dela Cruz" },
        quant_items: [
          {
            cilo_question_binding_id: "binding-first",
            section_key: "a",
            item_key: "b|c",
            rating_value: 5,
          },
          {
            cilo_question_binding_id: null,
            section_key: "a|b",
            item_key: "c",
            rating_value: 2,
          },
        ],
        qual_items: [
          { section_key: "a", prompt_key: "e|f", text_content: "Answer of a/e|f" },
          { section_key: "a|e", prompt_key: "f", text_content: "Answer of a|e/f" },
        ],
      },
    ]);
    studentEnrollmentFindManyMock.mockResolvedValue([]);

    const result = await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(result).not.toBeNull();

    // Ratings: two distinct questions, each keeping its own mean.
    expect(result!.questionResults).toHaveLength(2);
    const first = result!.questionResults.find((q) => q.sectionKey === "a")!;
    const second = result!.questionResults.find((q) => q.sectionKey === "a|b")!;
    expect(first.itemKey).toBe("b|c");
    expect(first.quantitative?.mean).toBe(5);
    expect(first.quantitative?.ratingCount).toBe(1);
    expect(second.itemKey).toBe("c");
    expect(second.quantitative?.mean).toBe(2);
    expect(second.quantitative?.ratingCount).toBe(1);

    // Prompts: each question reports its own snapshot prompt.
    expect(first.prompt).toBe("Prompt of a/b|c");
    expect(second.prompt).toBe("Prompt of a|b/c");

    // Bindings: only the bound question is CILO-bound; the unbound one is GENERAL.
    expect(first.binding.type).toBe("CILO");
    expect(second.binding.type).toBe("GENERAL");
    expect(result!.ciloResults).toHaveLength(1);
    expect(result!.ciloResults[0].quantitative?.mean).toBe(5);

    // Qualitative prompts: ("a","e|f") and ("a|e","f") are separate prompts.
    expect(result!.qualitative.prompts).toHaveLength(2);
    expect(result!.qualitative.prompts).toEqual(
      expect.arrayContaining([
        { prompt: "Prompt of a/e|f", answerCount: 1 },
        { prompt: "Prompt of a|e/f", answerCount: 1 },
      ])
    );
  });

  it("never fetches IN_PROGRESS response bodies", async () => {
    courseBoundEvaluationFindFirstMock.mockResolvedValue(MOCK_EVALUATION);
    evaluationAssignmentFindManyMock.mockResolvedValue([]);
    responseFindManyMock.mockResolvedValue([]);

    await getProgramHeadCourseEvaluationDetail("prog-beed", "eval-1");

    expect(responseFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "SUBMITTED",
          assignment: { course_bound_id: "eval-1" },
        }),
      })
    );
  });
});
