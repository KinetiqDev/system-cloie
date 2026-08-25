import { beforeEach, describe, expect, it, vi } from "vitest";
import { readSecretaryDashboard } from "@/features/secretary/services/read-secretary-dashboard";

const { resolveAuthSessionMock, resolveActiveAcademicContextMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  resolveActiveAcademicContextMock: vi.fn(),
  prismaMock: {
    user: { count: vi.fn() },
    program: { count: vi.fn() },
    course: { count: vi.fn() },
    instrumentTemplate: { count: vi.fn() },
    alumniProfile: { count: vi.fn() },
    industryPartnerProfile: { count: vi.fn() },
    courseAssignment: { count: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/academic-calendar/services/resolve-active-academic-context", () => ({
  resolveActiveAcademicContext: resolveActiveAcademicContextMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("readSecretaryDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "secretary-1",
      activeRole: "SECRETARY",
      roles: ["SECRETARY"],
    });
    resolveActiveAcademicContextMock.mockResolvedValue({
      schoolYear: { id: "sy-1", code: "2026-2027" },
      semester: "FIRST",
      assignmentPeriod: { id: "period-1", semester: "FIRST", term: "SECOND_TERM" },
    });
    prismaMock.user.count.mockResolvedValueOnce(27).mockResolvedValueOnce(3);
    prismaMock.program.count.mockResolvedValue(6);
    prismaMock.course.count.mockResolvedValue(102);
    prismaMock.instrumentTemplate.count.mockResolvedValue(4);
    prismaMock.alumniProfile.count.mockResolvedValue(1);
    prismaMock.industryPartnerProfile.count.mockResolvedValue(2);
    prismaMock.courseAssignment.count.mockResolvedValue(5);
  });

  it("rejects a non-Secretary before reading dashboard data", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: "DEAN" });

    await expect(readSecretaryDashboard()).rejects.toThrow("Secretary access required");
    expect(resolveActiveAcademicContextMock).not.toHaveBeenCalled();
    expect(prismaMock.user.count).not.toHaveBeenCalled();
  });

  it("returns active-period operations, inventory, and attention counts", async () => {
    await expect(readSecretaryDashboard()).resolves.toEqual({
      activePeriod: {
        id: "period-1",
        label: "2026-2027 — 1st Semester — 2nd Term",
      },
      inventory: {
        users: 27,
        activePrograms: 6,
        activeCourses: 102,
        activeBaselineInstruments: 4,
      },
      attention: {
        studentsAwaitingTermPlacement: 3,
        pendingExternalVerification: 3,
        activeAssignmentsWithoutRoster: 5,
      },
    });

    expect(prismaMock.instrumentTemplate.count).toHaveBeenCalledWith({
      where: { is_active: true, program_id: null, faculty_owner_id: null },
    });
    expect(prismaMock.user.count).toHaveBeenLastCalledWith({
      where: {
        is_active: true,
        roles: { some: { role: "STUDENT" } },
        student_profile: { isNot: null },
        enrollments: { none: { term_instance_id: "period-1", is_active: true } },
      },
    });
    expect(prismaMock.courseAssignment.count).toHaveBeenCalledWith({
      where: {
        term_instance_id: "period-1",
        is_active: true,
        memberships: { none: { is_active: true } },
      },
    });
  });

  it("skips active-period attention reads when no Academic Period is active", async () => {
    resolveActiveAcademicContextMock.mockResolvedValue({
      schoolYear: null,
      semester: null,
      assignmentPeriod: null,
    });
    prismaMock.user.count.mockReset().mockResolvedValue(27);

    const result = await readSecretaryDashboard();

    expect(result.activePeriod).toBeNull();
    expect(result.attention.studentsAwaitingTermPlacement).toBe(0);
    expect(result.attention.activeAssignmentsWithoutRoster).toBe(0);
    expect(prismaMock.courseAssignment.count).not.toHaveBeenCalled();
  });

  it("does not report active-period tasks when the School Year is inactive", async () => {
    resolveActiveAcademicContextMock.mockResolvedValue({
      schoolYear: null,
      semester: "FIRST",
      assignmentPeriod: { id: "period-1", semester: "FIRST", term: "FIRST_TERM" },
    });
    prismaMock.user.count.mockReset().mockResolvedValue(27);

    const result = await readSecretaryDashboard();

    expect(result.activePeriod).toBeNull();
    expect(result.attention.studentsAwaitingTermPlacement).toBe(0);
    expect(result.attention.activeAssignmentsWithoutRoster).toBe(0);
    expect(prismaMock.courseAssignment.count).not.toHaveBeenCalled();
  });
});
