import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addTermInstance,
  deleteTermInstance,
  updateTermInstance,
  verifySecretaryAccess,
} from "@/features/academic-calendar/services/manage-term-instances";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

const invalidateAcademicPeriodReadModelTagsMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    academicTermInstance: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    schoolYear: { findUnique: vi.fn() },
    studentEnrollment: { count: vi.fn() },
    courseAssignment: { count: vi.fn() },
    courseBoundEvaluation: { count: vi.fn() },
    centralDeployment: { count: vi.fn() },
    academicPeriodReadinessSnapshot: { count: vi.fn() },
  },
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  invalidateAcademicPeriodReadModelTags: invalidateAcademicPeriodReadModelTagsMock,
}));

describe("manage-term-instances / verifySecretaryAccess", () => {
  const mockSecretarySession = createAuthSessionSnapshot({
    userId: "sec-1",
    email: "secretary@test.com",
    roles: [ROLES.SECRETARY],
  });

  const mockFacultySession = createAuthSessionSnapshot({
    userId: "faculty-1",
    email: "faculty@test.com",
    roles: [ROLES.FACULTY],
  });

  it("should allow secretary access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockSecretarySession);

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("sec-1");
    }
  });

  it("should deny non-secretary access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });

  it("should deny Secretary role when it is not active", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.FACULTY, ROLES.SECRETARY] })
    );

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });

  it("should deny unauthenticated access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null as never);

    const result = await verifySecretaryAccess();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });
});

describe("manage-term-instances / deleteTermInstance", () => {
  const mockAdminSession = createAuthSessionSnapshot({
    userId: "admin-1",
    email: "secretary@test.com",
    roles: [ROLES.SECRETARY],
  });

  const mockFacultySession = createAuthSessionSnapshot({
    userId: "faculty-1",
    email: "faculty@test.com",
    roles: [ROLES.FACULTY],
  });

  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  it("should deny non-secretary access", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Secretary access required");
    }
  });

  it("should return error when term not found", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue(null);

    const result = await deleteTermInstance("ti-nonexistent");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not found");
    }
  });

  it("should reject updates to completed periods", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-done",
      status: "COMPLETED",
      school_year: { is_archived: false },
    } as never);

    const result = await updateTermInstance({
      id: "ti-done",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-05-31"),
    });

    expect(result).toEqual({ success: false, error: "Completed and cancelled periods are immutable" });
    expect(prisma.academicTermInstance.update).not.toHaveBeenCalled();
  });

  it("should block deletion when term has student enrollments", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);

    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(3 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(0 as never);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("enrollments or deployments");
    }
  });

  it("should block deletion when term has course assignments", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);

    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(5 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(0 as never);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("enrollments or deployments");
    }
  });

  it("should block deletion when term has evaluations", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);

    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(2 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(0 as never);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("enrollments or deployments");
    }
  });

  it("should block deletion when term has central deployments", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);

    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(1 as never);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("enrollments or deployments");
    }
  });

  it("should allow deletion when no dependent records", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);

    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.academicTermInstance.delete).mockResolvedValue({} as never);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(true);
    expect(prisma.academicTermInstance.delete).toHaveBeenCalledWith({
      where: { id: "ti-1" },
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("invalidates the shared period projection after adding a term", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "school-year-1",
      is_archived: false,
    } as never);
    vi.mocked(prisma.academicTermInstance.create).mockResolvedValue({ id: "new-period" } as never);

    const result = await addTermInstance({
      schoolYearId: "school-year-1",
      semester: "SUMMER",
    });

    expect(result).toEqual({ success: true, data: { id: "new-period" } });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("invalidates the shared period projection after updating a term", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      status: "PLANNED",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.update).mockResolvedValue({ id: "ti-1" } as never);

    const result = await updateTermInstance({
      id: "ti-1",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-12-31"),
    });

    expect(result).toEqual({ success: true, data: { id: "ti-1" } });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("should check every dependent table", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "ti-1",
      school_year: { is_archived: false },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);

    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.academicTermInstance.delete).mockResolvedValue({} as never);

    await deleteTermInstance("ti-1");

    expect(prisma.studentEnrollment.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { term_instance_id: "ti-1" } })
    );
    expect(prisma.courseAssignment.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { term_instance_id: "ti-1" } })
    );
    expect(prisma.courseBoundEvaluation.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { term_instance_id: "ti-1" } })
    );
    expect(prisma.centralDeployment.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { term_instance_id: "ti-1" } })
    );
    expect(prisma.academicPeriodReadinessSnapshot.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { period_id: "ti-1" } })
    );
  });

  it("should block deletion when term has a readiness snapshot", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({ id: "ti-1", school_year: { is_archived: false } } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({ id: "ti-other" } as never);
    vi.mocked(prisma.studentEnrollment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.courseBoundEvaluation.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.centralDeployment.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.academicPeriodReadinessSnapshot.count).mockResolvedValue(1 as never);

    const result = await deleteTermInstance("ti-1");

    expect(result.success).toBe(false);
    expect(prisma.academicTermInstance.delete).not.toHaveBeenCalled();
  });
});
