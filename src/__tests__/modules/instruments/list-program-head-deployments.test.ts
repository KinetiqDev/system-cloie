import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";

const {
  centralDeploymentFindManyMock,
  centralDeploymentFindUniqueMock,
  centralDeploymentUpdateMock,
  programFindUniqueMock,
  programHeadAssignmentFindManyMock,
  programHeadAssignmentFindFirstMock,
  resolveAuthSessionMock,
} = vi.hoisted(() => ({
  centralDeploymentFindManyMock: vi.fn(),
  centralDeploymentFindUniqueMock: vi.fn(),
  centralDeploymentUpdateMock: vi.fn(),
  programFindUniqueMock: vi.fn(),
  programHeadAssignmentFindManyMock: vi.fn(),
  programHeadAssignmentFindFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    centralDeployment: {
      findMany: centralDeploymentFindManyMock,
      findUnique: centralDeploymentFindUniqueMock,
      update: centralDeploymentUpdateMock,
    },
    program: {
      findUnique: programFindUniqueMock,
    },
    programHeadAssignment: {
      findMany: programHeadAssignmentFindManyMock,
      findFirst: programHeadAssignmentFindFirstMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

// ─── Test Fixtures ───────────────────────────────────────────────────────────

const PH_SESSION = {
  userId: "ph-user-1",
  email: "ph@acd.edu.ph",
  roles: [ROLES.PROGRAM_HEAD],
  activeRole: ROLES.PROGRAM_HEAD,
  studentProfileId: null,
  profileGate: null,
};

const PROGRAM_ID = "program-1";

const PROGRAM = {
  id: PROGRAM_ID,
  code: "BSIT",
  name: "BS Information Technology",
};

const MOCK_DEPLOYMENT_RAW = {
  id: "deploy-1",
  instrument_version_id: "version-1",
  program_id: PROGRAM_ID,
  major_id: null,
  year_level_id: null,
  target_stakeholder: "GRADUATING_STUDENT",
  term_instance: { semester: "FIRST", term: null, school_year: { code: "2025-2026" } },
  activation_at: new Date("2026-01-15"),
  deadline_at: new Date("2026-02-15"),
  status: "ACTIVE",
  created_at: new Date("2026-01-10"),
  updated_at: new Date("2026-01-10"),
  instrument: {
    template: {
      id: "template-1",
      name: "Exit Survey Tool",
    },
  },
  program: {
    code: "BSIT",
    name: "BS Information Technology",
  },
  major: null,
  year_level: null,
  assignments: [
    { id: "assign-1", response: { status: "SUBMITTED" } },
    { id: "assign-2", response: null },
    { id: "assign-3", response: { status: "IN_PROGRESS" } },
  ],
};

const MOCK_DEPLOYMENT_OTHER_PROGRAM = {
  ...MOCK_DEPLOYMENT_RAW,
  id: "deploy-other",
  program_id: "other-program",
  program: {
    code: "BSCS",
    name: "BS Computer Science",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockAuthenticatedPH() {
  resolveAuthSessionMock.mockResolvedValue(PH_SESSION);
}

function mockPHAssignments(programIds = [PROGRAM_ID]) {
  programHeadAssignmentFindManyMock.mockResolvedValue(
    programIds.map((pid) => ({ program_id: pid }))
  );
}

function mockPHFirstAssignment(programId = PROGRAM_ID) {
  programHeadAssignmentFindFirstMock.mockResolvedValue({
    program_id: programId,
  });
}

function mockProgram(program = PROGRAM) {
  programFindUniqueMock.mockResolvedValue(program);
}

// ─── Tests: listProgramHeadDeployments ───────────────────────────────────────

describe("listProgramHeadDeployments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns deployments for the PH's program with correct counts", async () => {
    mockAuthenticatedPH();
    mockPHAssignments();
    mockProgram();
    centralDeploymentFindManyMock.mockResolvedValue([MOCK_DEPLOYMENT_RAW]);

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    const result = await listProgramHeadDeployments();

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.deployments).toHaveLength(1);
    const d = result.data.deployments[0];
    expect(d.id).toBe("deploy-1");
    expect(d.templateName).toBe("Exit Survey Tool");
    expect(d.templateId).toBe("template-1");
    expect(d.programName).toBe("BS Information Technology");
    expect(d.programCode).toBe("BSIT");
    expect(d.target_stakeholder).toBe("GRADUATING_STUDENT");
    expect(d.status).toBe("ACTIVE");
    expect(d.assignmentCount).toBe(3);
    expect(d.responseCount).toBe(1); // Only 1 SUBMITTED
    expect(result.data.program).toEqual(PROGRAM);
  });

  it("filters deployments to PH's program IDs", async () => {
    mockAuthenticatedPH();
    mockPHAssignments([PROGRAM_ID]);
    mockProgram();
    centralDeploymentFindManyMock.mockResolvedValue([MOCK_DEPLOYMENT_RAW]);

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    await listProgramHeadDeployments();

    expect(centralDeploymentFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          program_id: { in: [PROGRAM_ID] },
        },
      })
    );
  });

  it("rejects unauthenticated users", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    const result = await listProgramHeadDeployments();

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Program Head authentication");
  });

  it("rejects users without PROGRAM_HEAD role", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      ...PH_SESSION,
      activeRole: ROLES.FACULTY,
      roles: [ROLES.FACULTY],
    });

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    const result = await listProgramHeadDeployments();

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Program Head authentication");
  });

  it("returns error when PH has no program assignment", async () => {
    mockAuthenticatedPH();
    programHeadAssignmentFindManyMock.mockResolvedValue([]);

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    const result = await listProgramHeadDeployments();

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("No active program assignment");
  });

  it("returns empty array when no deployments exist", async () => {
    mockAuthenticatedPH();
    mockPHAssignments();
    mockProgram();
    centralDeploymentFindManyMock.mockResolvedValue([]);

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    const result = await listProgramHeadDeployments();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.deployments).toHaveLength(0);
  });

  it("includes template info in deployment items", async () => {
    mockAuthenticatedPH();
    mockPHAssignments();
    mockProgram();

    const deploymentWithDetails = {
      ...MOCK_DEPLOYMENT_RAW,
      major: { name: "Web Development" },
      year_level: "FOURTH_YEAR",
    };
    centralDeploymentFindManyMock.mockResolvedValue([deploymentWithDetails]);

    const { listProgramHeadDeployments } =
      await import("@/features/evaluations/services/list-program-head-deployments");

    const result = await listProgramHeadDeployments();

    expect(result.success).toBe(true);
    if (!result.success) return;

    const d = result.data.deployments[0];
    expect(d.majorName).toBe("Web Development");
    expect(d.yearLevelName).toBe("4th Year");
  });
});

// ─── Tests: closeCentralDeployment ───────────────────────────────────────────

describe("closeCentralDeployment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("closes an ACTIVE deployment owned by PH", async () => {
    mockAuthenticatedPH();
    mockPHFirstAssignment();
    centralDeploymentFindUniqueMock.mockResolvedValue({
      id: "deploy-1",
      program_id: PROGRAM_ID,
      status: "ACTIVE",
    });
    centralDeploymentUpdateMock.mockResolvedValue({});

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-1");

    expect(result.success).toBe(true);
    expect(centralDeploymentUpdateMock).toHaveBeenCalledWith({
      where: { id: "deploy-1" },
      data: { status: "CLOSED" },
    });
  });

  it("closes a SCHEDULED deployment", async () => {
    mockAuthenticatedPH();
    mockPHFirstAssignment();
    centralDeploymentFindUniqueMock.mockResolvedValue({
      id: "deploy-1",
      program_id: PROGRAM_ID,
      status: "SCHEDULED",
    });
    centralDeploymentUpdateMock.mockResolvedValue({});

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-1");

    expect(result.success).toBe(true);
  });

  it("rejects closing an already CLOSED deployment", async () => {
    mockAuthenticatedPH();
    mockPHFirstAssignment();
    centralDeploymentFindUniqueMock.mockResolvedValue({
      id: "deploy-1",
      program_id: PROGRAM_ID,
      status: "CLOSED",
    });

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-1");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Cannot close");
  });

  it("rejects closing an ARCHIVED deployment", async () => {
    mockAuthenticatedPH();
    mockPHFirstAssignment();
    centralDeploymentFindUniqueMock.mockResolvedValue({
      id: "deploy-1",
      program_id: PROGRAM_ID,
      status: "ARCHIVED",
    });

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-1");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Cannot close");
  });

  it("rejects if deployment belongs to a different program", async () => {
    mockAuthenticatedPH();
    mockPHFirstAssignment(PROGRAM_ID);
    centralDeploymentFindUniqueMock.mockResolvedValue({
      id: "deploy-other",
      program_id: "other-program",
      status: "ACTIVE",
    });

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-other");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("permission");
  });

  it("rejects unauthenticated users", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-1");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Program Head authentication");
  });

  it("rejects non-PH role users", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      ...PH_SESSION,
      activeRole: ROLES.STUDENT,
      roles: [ROLES.STUDENT],
    });

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("deploy-1");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Program Head authentication");
  });

  it("returns error when deployment is not found", async () => {
    mockAuthenticatedPH();
    mockPHFirstAssignment();
    centralDeploymentFindUniqueMock.mockResolvedValue(null);

    const { closeCentralDeployment } =
      await import("@/features/evaluations/services/publish-central-deployment");

    const result = await closeCentralDeployment("nonexistent");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("not found");
  });
});
