import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";
import { publishCentralDeployment } from "@/features/evaluations/services/publish-central-deployment";
import { createPrismaUniqueConstraintError } from "@/__tests__/helpers/prisma-test-helpers";

const {
  assignmentCreateManyMock,
  centralDeploymentCreateMock,
  centralDeploymentFindFirstMock,
  centralDeploymentPloSnapshotCreateManyMock,
  academicTermInstanceFindUniqueMock,
  externalStakeholderInviteFindManyMock,
  industryPartnerProfileFindManyMock,
  instrumentTemplateFindFirstMock,
  instrumentVersionFindFirstMock,
  listStudentsForClassMock,
  ploFindManyMock,
  programHeadAssignmentFindFirstMock,
  resolveAuthSessionMock,
  studentAcademicProfileFindManyMock,
  transactionMock,
  txUserFindManyMock,
  userRoleFindManyMock,
  resolveProgramHeadContextMock,
  revalidateProgramHeadAssignmentMock,
  studentEnrollmentFindManyMock,
  industryPartnerProgramAffiliationFindManyMock,
} = vi.hoisted(() => ({
  assignmentCreateManyMock: vi.fn(),
  centralDeploymentCreateMock: vi.fn(),
  centralDeploymentFindFirstMock: vi.fn(),
  centralDeploymentPloSnapshotCreateManyMock: vi.fn(),
  academicTermInstanceFindUniqueMock: vi.fn(),
  externalStakeholderInviteFindManyMock: vi.fn(),
  industryPartnerProfileFindManyMock: vi.fn(),
  instrumentTemplateFindFirstMock: vi.fn(),
  instrumentVersionFindFirstMock: vi.fn(),
  listStudentsForClassMock: vi.fn(),
  ploFindManyMock: vi.fn(),
  programHeadAssignmentFindFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  studentAcademicProfileFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  txUserFindManyMock: vi.fn(),
  userRoleFindManyMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  revalidateProgramHeadAssignmentMock: vi.fn(),
  studentEnrollmentFindManyMock: vi.fn(),
  industryPartnerProgramAffiliationFindManyMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    academicTermInstance: {
      findUnique: academicTermInstanceFindUniqueMock,
    },
    centralDeployment: {
      findFirst: centralDeploymentFindFirstMock,
    },
    instrumentTemplate: {
      findFirst: instrumentTemplateFindFirstMock,
    },
    instrumentVersion: {
      findFirst: instrumentVersionFindFirstMock,
    },
    pLO: {
      findMany: ploFindManyMock,
    },
    programHeadAssignment: {
      findFirst: programHeadAssignmentFindFirstMock,
    },
  },
}));

vi.mock("@/features/enrollments/services/list-students-for-class", () => ({
  listStudentsForClass: listStudentsForClassMock,
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
  revalidateProgramHeadAssignment: revalidateProgramHeadAssignmentMock,
}));

// ─── Test Helpers ────────────────────────────────────────────────────────────

function mockAuthenticatedPH() {
  resolveAuthSessionMock.mockResolvedValue({
    activeRole: ROLES.PROGRAM_HEAD,
    roles: [ROLES.PROGRAM_HEAD],
    userId: "ph-user-1",
  });
}

function mockPHAssignment(programId = "program-1") {
  programHeadAssignmentFindFirstMock.mockResolvedValue({
    program_id: programId,
  });
}

function mockTemplate(overrides: Record<string, unknown> = {}) {
  instrumentTemplateFindFirstMock.mockResolvedValue({
    id: "template-1",
    name: "Exit Survey Tool",
    program_id: "program-1",
    template_type: "PROGRAM_WIDE",
    structure: [],
    template_plo_question_bindings: [],
    ...overrides,
  });
}

function mockVersion(overrides: Record<string, unknown> = {}) {
  instrumentVersionFindFirstMock.mockResolvedValue({
    id: "version-1",
    ...overrides,
  });
}

function mockNoDuplicate() {
  centralDeploymentFindFirstMock.mockResolvedValue(null);
}

function setupTransaction() {
  transactionMock.mockImplementation(async (callback) =>
    callback({
      centralDeployment: { create: centralDeploymentCreateMock },
      evaluationAssignment: { createMany: assignmentCreateManyMock },
      externalStakeholderInvite: { findMany: externalStakeholderInviteFindManyMock },
      industryPartnerProfile: { findMany: industryPartnerProfileFindManyMock },
      industryPartnerProgramAffiliation: { findMany: industryPartnerProgramAffiliationFindManyMock },
      studentAcademicProfile: { findMany: studentAcademicProfileFindManyMock },
      user: { findMany: txUserFindManyMock },
      userRole: { findMany: userRoleFindManyMock },
      studentEnrollment: {
        findMany: studentEnrollmentFindManyMock,
      },
      instrumentTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          program_id: "program-1",
          is_active: true,
          template_type: "PROGRAM_WIDE",
        }),
      },
      centralDeploymentPloSnapshot: {
        createMany: centralDeploymentPloSnapshotCreateManyMock,
      },
      major: {
        findUnique: vi.fn().mockResolvedValue({ program_id: "program-1", is_active: true }),
      },
    })
  );
}

const baseInput = {
  programId: "program-1",
  template_id: "template-1",
  deployment_name: "Graduate Exit Evaluation",
  target_stakeholder: "STUDENT" as const,
  term_instance_id: "term-instance-1",
  year_level: "FOURTH_YEAR" as const,
};

function mockTermInstance() {
  academicTermInstanceFindUniqueMock.mockResolvedValue({
    id: "term-instance-1",
    semester: "FIRST",
    term: null,
    school_year: { code: "2025-2026" },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("publishCentralDeployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    industryPartnerProgramAffiliationFindManyMock.mockResolvedValue([]);
    setupTransaction();
    studentEnrollmentFindManyMock.mockImplementation(async () => {
      const latest = listStudentsForClassMock.mock.results.at(-1)?.value;
      if (latest && typeof latest.then === "function") {
        const result = await latest;
        return result.success
          ? result.data.map((student: { userId: string }) => ({ student_user_id: student.userId }))
          : [];
      }
      return [];
    });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        userId: "ph-user-1",
        authorizedPrograms: [{ id: baseInput.programId, code: "BSIT", name: "BS Information Technology" }],
        selectedProgram: { id: baseInput.programId, code: "BSIT", name: "BS Information Technology" },
      },
    });
    revalidateProgramHeadAssignmentMock.mockResolvedValue({
      id: baseInput.programId,
      code: "BSIT",
      name: "BS Information Technology",
    });
  });

  // ─── Auth Tests ──────────────────────────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });

  it("rejects non-PROGRAM_HEAD role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
      userId: "faculty-1",
    });

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "Program Head authentication is required.",
    });
  });

  it("rejects PH without active program assignment", async () => {
    mockAuthenticatedPH();
    programHeadAssignmentFindFirstMock.mockResolvedValue(null);
    resolveProgramHeadContextMock.mockResolvedValue({ success: false, error: "No active program assignment found for this Program Head." });

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "No active program assignment found for this Program Head.",
    });
  });

  // ─── Template Validation ─────────────────────────────────────────────────

  it("validates template belongs to PH's program or is institutional baseline", async () => {
    mockAuthenticatedPH();
    mockPHAssignment("program-1");
    // Template not found (e.g., belongs to another program)
    instrumentTemplateFindFirstMock.mockResolvedValue(null);

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "Template not found, inactive, or not accessible to your program.",
    });

    // Verify the query uses the correct OR condition
    expect(instrumentTemplateFindFirstMock).toHaveBeenCalledWith({
      where: {
        id: "template-1",
        is_active: true,
        OR: [{ program_id: "program-1" }, { program_id: null }],
        template_type: "PROGRAM_WIDE",
      },
      select: {
        id: true,
        name: true,
        program_id: true,
        template_type: true,
        structure: true,
        template_plo_question_bindings: true,
      },
    });
  });

  it("rejects when no active version exists for the template", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    instrumentVersionFindFirstMock.mockResolvedValue(null);
    mockNoDuplicate();

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "No active instrument version found for this template.",
    });
  });

  // ─── Date Validation ─────────────────────────────────────────────────────

  it("validates deadline > activation when both set", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();

    const result = await publishCentralDeployment({
      ...baseInput,
      activation_at: new Date("2026-06-01T00:00:00Z"),
      deadline_at: new Date("2026-05-01T00:00:00Z"), // Before activation
    });

    expect(result).toEqual({
      success: false,
      error: "Deadline must be after the activation date.",
    });
  });

  // ─── Duplicate Prevention ────────────────────────────────────────────────

  it("prevents duplicate deployment (same version + program + stakeholder + academic period)", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    centralDeploymentFindFirstMock.mockResolvedValue({
      id: "existing-deployment-1",
    });

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error:
        "A deployment already exists for this template version, program, stakeholder, and academic period.",
    });
  });

  // ─── Graduating Student Deployment ───────────────────────────────────────

  it("PH can create a central deployment for graduating students", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();

    centralDeploymentCreateMock.mockResolvedValue({
      id: "deployment-1",
    });
    listStudentsForClassMock.mockResolvedValue({
      success: true,
      data: [
        { userId: "student-1" },
        { userId: "student-2" },
        { userId: "student-3" },
      ],
    });

    const result = await publishCentralDeployment({
      ...baseInput,
      target_stakeholder: "STUDENT",
      year_level: "FOURTH_YEAR",
    });

    expect(result).toEqual({
      success: true,
      data: {
        deploymentId: "deployment-1",
        assignmentCount: 3,
        status: "ACTIVE",
      },
    });

    // Verify deployment was created with correct data
    expect(centralDeploymentCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        instrument_version_id: "version-1",
        deployment_name: "Graduate Exit Evaluation",
        program_id: "program-1",
        target_stakeholder: "STUDENT",
        term_instance_id: "term-instance-1",
        year_level: "FOURTH_YEAR",
        status: "ACTIVE",
      }),
    });

    // Verify enrollment-based student lookup
    expect(listStudentsForClassMock).toHaveBeenCalledWith({
      termInstanceId: "term-instance-1",
      programId: "program-1",
      yearLevel: "FOURTH_YEAR",
      majorId: undefined,
    });

    // Verify assignments were created
    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        { central_deployment_id: "deployment-1", respondent_id: "student-1" },
        { central_deployment_id: "deployment-1", respondent_id: "student-2" },
        { central_deployment_id: "deployment-1", respondent_id: "student-3" },
      ],
    });
  });

  it("creates assignments for matching graduating students with major filter", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();

    centralDeploymentCreateMock.mockResolvedValue({
      id: "deployment-2",
    });
    listStudentsForClassMock.mockResolvedValue({
      success: true,
      data: [{ userId: "student-5" }],
    });

    const result = await publishCentralDeployment({
      ...baseInput,
      target_stakeholder: "STUDENT",
      major_id: "major-1",
      year_level: "FOURTH_YEAR",
    });

    expect(result).toEqual({
      success: true,
      data: {
        deploymentId: "deployment-2",
        assignmentCount: 1,
        status: "ACTIVE",
      },
    });

    expect(listStudentsForClassMock).toHaveBeenCalledWith({
      termInstanceId: "term-instance-1",
      programId: "program-1",
      yearLevel: "FOURTH_YEAR",
      majorId: "major-1",
    });
  });

  // ─── Alumni Deployment ───────────────────────────────────────────────────

  it("PH can create a central deployment for alumni", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();

    externalStakeholderInviteFindManyMock.mockResolvedValue([
      { email: "alumni1@example.com" },
      { email: "alumni2@example.com" },
    ]);
    txUserFindManyMock.mockResolvedValue([
      { id: "alumni-1" },
      { id: "alumni-2" },
    ]);

    centralDeploymentCreateMock.mockResolvedValue({
      id: "deployment-3",
    });

    const result = await publishCentralDeployment({
      ...baseInput,
      target_stakeholder: "ALUMNI",
      year_level: undefined,
    });

    expect(result).toEqual({
      success: true,
      data: {
        deploymentId: "deployment-3",
        assignmentCount: 2,
        status: "ACTIVE",
      },
    });

    // Verify alumni invite query
    expect(externalStakeholderInviteFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ role: ROLES.ALUMNI }),
      })
    );

    // Verify assignments were created for alumni
    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        { central_deployment_id: "deployment-3", respondent_id: "alumni-1" },
        { central_deployment_id: "deployment-3", respondent_id: "alumni-2" },
      ],
    });
  });

  // ─── Industry Partner Deployment ─────────────────────────────────────────

  it("PH can create a central deployment for industry partners", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();

    centralDeploymentCreateMock.mockResolvedValue({
      id: "deployment-4",
    });
    industryPartnerProfileFindManyMock.mockResolvedValue([
      { user_id: "ip-1" },
      { user_id: "ip-2" },
    ]);

    const result = await publishCentralDeployment({
      ...baseInput,
      target_stakeholder: "INDUSTRY_PARTNER",
      year_level: undefined,
    });

    expect(result).toEqual({
      success: true,
      data: {
        deploymentId: "deployment-4",
        assignmentCount: 2,
        status: "ACTIVE",
      },
    });

    // Verify industry partner profile query with program filter
    expect(industryPartnerProfileFindManyMock).toHaveBeenCalledWith({
      where: { program_id: "program-1" },
      select: { user_id: true },
    });

    // Verify assignments were created for industry partners
    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        { central_deployment_id: "deployment-4", respondent_id: "ip-1" },
        { central_deployment_id: "deployment-4", respondent_id: "ip-2" },
      ],
    });
  });

  // ─── Scope Validation ────────────────────────────────────────────────────

  it("validates PH scope — cannot deploy outside assigned program", async () => {
    mockAuthenticatedPH();
    mockPHAssignment("program-1");
    // Template belongs to program-2 (not accessible)
    instrumentTemplateFindFirstMock.mockResolvedValue(null);

    const result = await publishCentralDeployment({
      ...baseInput,
      template_id: "template-from-other-program",
    });

    expect(result).toEqual({
      success: false,
      error: "Template not found, inactive, or not accessible to your program.",
    });
  });

  // ─── Question–PLO Binding Validation ────────────────────────────────────

  const LIKERT_STRUCTURE = [
    {
      key: "sec-1",
      title: "Outcomes",
      order: 0,
      questions: [
        {
          key: "q-1",
          prompt: "The program prepared me for employment",
          type: "likert" as const,
          order: 0,
          required: true,
          likertDescriptors: [
            { value: 1, label: "Strongly Disagree" },
            { value: 2, label: "Disagree" },
            { value: 3, label: "Neutral" },
            { value: 4, label: "Agree" },
            { value: 5, label: "Strongly Agree" },
          ],
        },
      ],
    },
  ];

  it("rejects publication when a Likert question has no PLO binding", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate({ structure: LIKERT_STRUCTURE, template_plo_question_bindings: [] });
    mockVersion();

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "Every Likert question must be assigned to at least one PLO before publishing.",
    });
    expect(centralDeploymentCreateMock).not.toHaveBeenCalled();
  });

  it("rejects publication when a bound PLO is archived or not program-owned", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate({
      structure: LIKERT_STRUCTURE,
      template_plo_question_bindings: [
        {
          plo_id: "plo-archived",
          section_key: "sec-1",
          item_key: "q-1",
        },
      ],
    });
    ploFindManyMock.mockResolvedValue([]);
    mockVersion();

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error:
        "One or more bound PLOs are archived or no longer available. Update the template before publishing.",
    });
    expect(ploFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ program_id: "program-1", is_active: true }),
      })
    );
  });

  it("creates immutable PLO snapshot rows when publishing bound Likert questions", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate({
      structure: LIKERT_STRUCTURE,
      template_plo_question_bindings: [
        { plo_id: "plo-1", section_key: "sec-1", item_key: "q-1" },
        { plo_id: "plo-2", section_key: "sec-1", item_key: "q-1" },
      ],
    });
    ploFindManyMock.mockResolvedValue([
      { id: "plo-1", code: "BSIT-GO1", description: "Communicate effectively" },
      { id: "plo-2", code: "BSIT-GO2", description: "Apply technical skills" },
    ]);
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();
    centralDeploymentCreateMock.mockResolvedValue({ id: "deployment-bound" });
    listStudentsForClassMock.mockResolvedValue({ success: true, data: [] });

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: true,
      data: { deploymentId: "deployment-bound", assignmentCount: 0, status: "ACTIVE" },
    });
    expect(centralDeploymentPloSnapshotCreateManyMock).toHaveBeenCalledWith({
      data: [
        {
          central_deployment_id: "deployment-bound",
          plo_id: "plo-1",
          plo_code_snapshot: "BSIT-GO1",
          plo_description_snapshot: "Communicate effectively",
          section_key: "sec-1",
          item_key: "q-1",
          question_prompt_snapshot: "The program prepared me for employment",
        },
        {
          central_deployment_id: "deployment-bound",
          plo_id: "plo-2",
          plo_code_snapshot: "BSIT-GO2",
          plo_description_snapshot: "Apply technical skills",
          section_key: "sec-1",
          item_key: "q-1",
          question_prompt_snapshot: "The program prepared me for employment",
        },
      ],
    });
  });

  // ─── Scheduled Status ────────────────────────────────────────────────────

  it("sets SCHEDULED status when activation_at is in the future", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    centralDeploymentCreateMock.mockResolvedValue({
      id: "deployment-5",
    });
    listStudentsForClassMock.mockResolvedValue({ success: true, data: [] });

    const result = await publishCentralDeployment({
      ...baseInput,
      activation_at: futureDate,
      deadline_at: new Date(futureDate.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    expect(result).toEqual({
      success: true,
      data: {
        deploymentId: "deployment-5",
        assignmentCount: 0,
        status: "SCHEDULED",
      },
    });

    expect(centralDeploymentCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: "SCHEDULED",
      }),
    });
  });

  // ─── Unique Constraint Error Handling ────────────────────────────────────

  it("handles unique constraint error from database gracefully", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();

    transactionMock.mockRejectedValue(createPrismaUniqueConstraintError());

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error:
        "A deployment already exists for this template version, program, stakeholder, and academic period.",
    });
  });

  // ─── Deduplication of Respondent IDs ─────────────────────────────────────

  it("deduplicates respondent IDs when using the respondent_ids path", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();
    listStudentsForClassMock.mockResolvedValue({ success: true, data: [{ userId: "student-1" }, { userId: "student-2" }] });

    centralDeploymentCreateMock.mockResolvedValue({
      id: "deployment-6",
    });

    // Pass duplicate respondent IDs explicitly (respondent_ids path applies dedup)
    const result = await publishCentralDeployment({
      ...baseInput,
      target_stakeholder: "STUDENT",
      respondent_ids: ["student-1", "student-1", "student-2"],
    });

    expect(result).toEqual({
      success: true,
      data: {
        deploymentId: "deployment-6",
        assignmentCount: 2,
        status: "ACTIVE",
      },
    });

    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [
        { central_deployment_id: "deployment-6", respondent_id: "student-1" },
        { central_deployment_id: "deployment-6", respondent_id: "student-2" },
      ],
    });
  });

  it("preserves an explicitly empty curated respondent set", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();
    listStudentsForClassMock.mockResolvedValue({
      success: true,
      data: [{ userId: "student-1" }, { userId: "student-2" }],
    });
    centralDeploymentCreateMock.mockResolvedValue({ id: "deployment-empty" });

    const result = await publishCentralDeployment({
      ...baseInput,
      respondent_ids: [],
    });

    expect(result).toEqual({
      success: true,
      data: { deploymentId: "deployment-empty", assignmentCount: 0, status: "ACTIVE" },
    });
    expect(assignmentCreateManyMock).not.toHaveBeenCalled();
  });

  it("filters curated IDs to selected-Program transaction eligibility", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();
    listStudentsForClassMock.mockResolvedValue({ success: true, data: [{ userId: "student-bsed" }] });
    studentEnrollmentFindManyMock.mockResolvedValue([{ student_user_id: "student-bsed" }]);
    centralDeploymentCreateMock.mockResolvedValue({ id: "deployment-scoped" });

    const result = await publishCentralDeployment({
      ...baseInput,
      respondent_ids: ["student-bsed", "student-beed"],
    });

    expect(result.success).toBe(true);
    expect(assignmentCreateManyMock).toHaveBeenCalledWith({
      data: [{ central_deployment_id: "deployment-scoped", respondent_id: "student-bsed" }],
    });
  });

  it("drops a stale preview student removed from transaction eligibility", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();
    listStudentsForClassMock.mockResolvedValue({ success: true, data: [{ userId: "student-stale" }] });
    studentEnrollmentFindManyMock.mockResolvedValue([]);
    centralDeploymentCreateMock.mockResolvedValue({ id: "deployment-stale" });

    const result = await publishCentralDeployment({ ...baseInput });

    expect(result).toEqual({
      success: true,
      data: { deploymentId: "deployment-stale", assignmentCount: 0, status: "ACTIVE" },
    });
    expect(assignmentCreateManyMock).not.toHaveBeenCalled();
  });

  it("rejects publish when the selected assignment is revoked before the transaction write", async () => {
    mockAuthenticatedPH();
    mockPHAssignment();
    mockTemplate();
    mockVersion();
    mockNoDuplicate();
    mockTermInstance();
    revalidateProgramHeadAssignmentMock.mockResolvedValueOnce(null);

    const result = await publishCentralDeployment(baseInput);

    expect(result).toEqual({
      success: false,
      error: "Selected Program is no longer assigned.",
    });
    expect(centralDeploymentCreateMock).not.toHaveBeenCalled();
    expect(assignmentCreateManyMock).not.toHaveBeenCalled();
  });
});
