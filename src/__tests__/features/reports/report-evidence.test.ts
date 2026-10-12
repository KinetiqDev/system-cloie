import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResponseStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Authorized evidence read
//
// The read is what every export trusts, so these tests pin its predicates: the
// Program scope, the Professional Course boundary, the submitted gate, the
// year-level target rule, and respondent-name resolution.
// ---------------------------------------------------------------------------

const { resolveProgramHeadContextMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  prismaMock: {
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    courseBoundEvaluation: { findMany: vi.fn() },
    centralDeployment: { findMany: vi.fn() },
    response: { findMany: vi.fn() },
    pO: { findMany: vi.fn() },
    cILOMapping: { findMany: vi.fn() },
    courseAssignment: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import {
  listProgramHeadReportYearLevels,
  readProgramHeadReportEvidence,
  resolveReportPeriod,
} from "@/features/reports/services/report-evidence";

const BSIT = {
  id: "prog-bsit",
  code: "BSIT",
  name: "Bachelor of Science in Information Technology",
};

const termInstance = {
  id: "term-1",
  semester: "FIRST",
  term: "FIRST_TERM",
  school_year: { id: "sy-1", code: "2026-2027" },
};

function evaluationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "eval-1",
    deployment_name: "IT101 CILO Evaluation",
    status: "CLOSED",
    course_info_snapshot: null,
    cilos_snapshot: [{ id: "cilo-1", label: "CILO 1" }],
    term_instance: termInstance,
    instrument: {
      id: "iv-1",
      version_number: 2,
      structure_snapshot: [{ key: "s", title: "S", items: [] }],
      template: { name: "CILO Evaluation" },
    },
    course_assignment: {
      id: "ca-1",
      year_level: "FIRST_YEAR",
      section: "MORNING",
      course: { id: "course-1", code: "IT101", title: "Introduction to Computing" },
      faculty: { id: "user-faculty", name: "Dela Cruz, Ana" },
    },
    cilo_question_bindings: [
      {
        section_key: "s",
        item_key: "q1",
        cilo_id: "cilo-1",
        cilo_description_snapshot: "CILO 1",
        question_prompt_snapshot: "I explained technical ideas clearly.",
      },
    ],
    po_question_bindings: [],
    assignments: [
      { respondent_id: "user-1", response: { status: ResponseStatus.SUBMITTED } },
      { respondent_id: "user-2", response: null },
    ],
    ...overrides,
  };
}

function responseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "resp-1",
    deployment_id: "eval-1",
    submitted_at: new Date("2026-01-12T09:15:00.000Z"),
    respondent_id: "user-1",
    respondent: { name: "Alpha, Ann" },
    quant_items: [{ section_key: "s", item_key: "q1", rating_value: 4 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveProgramHeadContextMock.mockResolvedValue({
    success: true,
    data: {
      userId: "user-head",
      authorizedPrograms: [BSIT],
      selectedProgram: BSIT,
    },
  });
  prismaMock.academicTermInstance.findMany.mockResolvedValue([termInstance]);
  prismaMock.schoolYear.findUnique.mockResolvedValue({ code: "2026-2027" });
  prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([evaluationRow()]);
  prismaMock.centralDeployment.findMany.mockResolvedValue([]);
  prismaMock.response.findMany.mockResolvedValue([responseRow()]);
  prismaMock.pO.findMany.mockResolvedValue([]);
  prismaMock.cILOMapping.findMany.mockResolvedValue([]);
  prismaMock.courseAssignment.findMany.mockResolvedValue([]);
});

describe("report evidence read", () => {
  it("scopes course evidence to the selected Program's Professional Courses", async () => {
    await readProgramHeadReportEvidence("prog-bsit", {});
    const where = prismaMock.courseBoundEvaluation.findMany.mock.calls[0][0].where;
    expect(where.course_assignment).toMatchObject({
      program_id: "prog-bsit",
      course: { course_scope: "PROFESSIONAL" },
    });
    // No year-level filter means no target narrowing.
    expect(where.targets).toBeUndefined();
  });

  it("narrows course evidence by the Program's own year-level targets", async () => {
    await readProgramHeadReportEvidence("prog-bsit", { yearLevel: "SECOND_YEAR" });
    const where = prismaMock.courseBoundEvaluation.findMany.mock.calls[0][0].where;
    expect(where.targets).toEqual({
      some: { program_id: "prog-bsit", year_level: "SECOND_YEAR" },
    });
  });

  it("scopes Central deployments to the selected Program", async () => {
    await readProgramHeadReportEvidence("prog-bsit", {});
    expect(prismaMock.centralDeployment.findMany.mock.calls[0][0].where).toMatchObject({
      program_id: "prog-bsit",
    });
  });

  it("reads submitted responses only and resolves respondent names", async () => {
    const evidence = await readProgramHeadReportEvidence("prog-bsit", {});
    const responseWhere = prismaMock.response.findMany.mock.calls[0][0].where;
    expect(responseWhere.status).toBe(ResponseStatus.SUBMITTED);

    const group = evidence!.courseGroups[0];
    expect(group.responses).toHaveLength(1);
    expect(group.responses[0]).toMatchObject({
      responseId: "resp-1",
      respondentId: "user-1",
      respondentName: "Alpha, Ann",
      answers: [{ sectionKey: "s", itemKey: "q1", ratingValue: 4 }],
    });
    // Publication-time context is absent, so the live assignment is used.
    expect(group.facultyName).toBe("Dela Cruz, Ana");
    expect(group.section).toBe("MORNING");
    expect(group.instrumentLabel).toBe("CILO Evaluation v2");
    expect(group.assignedRespondentCount).toBe(2);
    expect(group.submissions).toHaveLength(2);
  });

  it("attributes faculty from the live assignment when a legacy snapshot never recorded one", async () => {
    // The seeded publication snapshots predate the facultyName field and carry
    // only course and Program context, so they make no faculty claim at all.
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      evaluationRow({
        course_info_snapshot: {
          courseCode: "IT201",
          courseTitle: "Data Structures",
          programCode: "BSIT",
          programName: "Bachelor of Science in Information Technology",
        },
      }),
    ]);
    const evidence = await readProgramHeadReportEvidence("prog-bsit", {});
    expect(evidence!.courseGroups[0].facultyName).toBe("Dela Cruz, Ana");
  });

  it("keeps a snapshot that recorded no faculty instead of naming today's teacher", async () => {
    prismaMock.courseBoundEvaluation.findMany.mockResolvedValue([
      evaluationRow({ course_info_snapshot: { courseCode: "IT201", facultyName: null } }),
    ]);
    const evidence = await readProgramHeadReportEvidence("prog-bsit", {});
    expect(evidence!.courseGroups[0].facultyName).toBe("No faculty recorded at publication");
  });

  it("reports a blank account name explicitly instead of inventing one", async () => {
    prismaMock.response.findMany.mockResolvedValue([responseRow({ respondent: { name: "   " } })]);
    const evidence = await readProgramHeadReportEvidence("prog-bsit", {});
    expect(evidence!.courseGroups[0].responses[0].respondentName).toBe("Name unavailable");
  });

  it("loads current CILO-to-PO mappings of the selected Program only", async () => {
    prismaMock.cILOMapping.findMany.mockResolvedValue([
      {
        cilo_id: "cilo-1",
        manifestation: "LEARNING",
        po: { id: "po-1", code: "BSIT-GO1", description: "Explain", classification: "CORE" },
      },
      {
        cilo_id: "cilo-1",
        manifestation: null,
        po: { id: "po-2", code: "BSIT-GO2", description: "Apply", classification: "PROFESSIONAL" },
      },
    ]);
    const evidence = await readProgramHeadReportEvidence("prog-bsit", {});
    expect(prismaMock.cILOMapping.findMany.mock.calls[0][0].where).toEqual({
      cilo_id: { in: ["cilo-1"] },
      po: { program_id: "prog-bsit" },
    });
    const mappings = evidence!.ciloMappings.get("cilo-1")!;
    expect(mappings.map((mapping) => mapping.poCode)).toEqual(["BSIT-GO1", "BSIT-GO2"]);
    // A mapping without a manifestation still carries PO evidence, so it is kept.
    expect(mappings[1].manifestation).toBeNull();
    expect(mappings[0].classificationLabel).toBe("Core");
  });

  it("loads the Program Outcome catalog with its recorded classification", async () => {
    prismaMock.pO.findMany.mockResolvedValue([
      {
        id: "po-1",
        code: "BSIT-GO1",
        description: "Explain",
        classification: "CORE",
        is_active: true,
        order: 1,
      },
    ]);
    const evidence = await readProgramHeadReportEvidence("prog-bsit", {});
    expect(evidence!.outcomes).toEqual([
      {
        id: "po-1",
        code: "BSIT-GO1",
        description: "Explain",
        classification: "CORE",
        classificationLabel: "Core",
        isActive: true,
        order: 1,
      },
    ]);
  });

  it("refuses an unauthorized Program and reads no evidence at all", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({ success: false, error: "not assigned" });
    const evidence = await readProgramHeadReportEvidence("prog-other", {});
    expect(evidence).toBeNull();
    expect(prismaMock.courseBoundEvaluation.findMany).not.toHaveBeenCalled();
    expect(prismaMock.response.findMany).not.toHaveBeenCalled();
  });
});

describe("report period resolution", () => {
  it("resolves a selected term instance into labelled period columns", async () => {
    const { context } = await resolveReportPeriod("prog-bsit", {
      termInstanceId: "term-1",
      schoolYearId: "sy-1",
    });
    expect(context).toMatchObject({
      schoolYearCode: "2026-2027",
      semesterLabel: "1st Semester",
      termLabel: "1st Term",
      label: "2026-2027 · 1st Semester · 1st Term",
    });
    expect(prismaMock.academicTermInstance.findMany.mock.calls[0][0].where).toMatchObject({
      id: "term-1",
      school_year_id: "sy-1",
    });
  });

  it("labels an unfiltered export as all academic periods", async () => {
    const { context, termInstanceWhere } = await resolveReportPeriod("prog-bsit", {});
    expect(context.label).toBe("All academic periods");
    expect(termInstanceWhere).toEqual({});
  });

  it("never matches rows when a selected period resolves to nothing", async () => {
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    const { termInstanceWhere } = await resolveReportPeriod("prog-bsit", {
      termInstanceId: "term-missing",
    });
    expect(termInstanceWhere).toEqual({
      term_instance_id: "00000000-0000-0000-0000-000000000000",
    });
  });
});

describe("report year-level options", () => {
  it("lists the Program's Professional Course year levels", async () => {
    prismaMock.courseAssignment.findMany.mockResolvedValue([
      { year_level: "SECOND_YEAR" },
      { year_level: "FIRST_YEAR" },
      { year_level: "SECOND_YEAR" },
    ]);
    const levels = await listProgramHeadReportYearLevels("prog-bsit");
    expect(prismaMock.courseAssignment.findMany.mock.calls[0][0].where).toEqual({
      program_id: "prog-bsit",
      course: { course_scope: "PROFESSIONAL" },
    });
    expect(levels).toEqual([
      { value: "FIRST_YEAR", label: "1st Year" },
      { value: "SECOND_YEAR", label: "2nd Year" },
    ]);
  });

  it("returns nothing for an unauthorized Program", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({ success: false, error: "not assigned" });
    expect(await listProgramHeadReportYearLevels("prog-other")).toEqual([]);
    expect(prismaMock.courseAssignment.findMany).not.toHaveBeenCalled();
  });
});
