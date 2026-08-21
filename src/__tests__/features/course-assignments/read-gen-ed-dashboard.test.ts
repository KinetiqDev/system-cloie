import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGenEdDashboard } from "@/features/course-assignments/services/read-gen-ed-dashboard";

const { resolveAuthSessionMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  prismaMock: {
    course: { count: vi.fn() },
    courseAssignment: { count: vi.fn(), groupBy: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

describe("getGenEdDashboard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "coord-1",
      activeRole: "GEN_ED_COORDINATOR",
      roles: ["GEN_ED_COORDINATOR"],
    });
    prismaMock.course.count.mockResolvedValue(0);
    prismaMock.courseAssignment.count.mockResolvedValue(0);
    prismaMock.courseAssignment.groupBy.mockResolvedValue([]);
  });

  it("rejects unauthenticated without querying", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    await expect(getGenEdDashboard()).rejects.toThrow("Authentication required");
    expect(prismaMock.course.count).not.toHaveBeenCalled();
    expect(prismaMock.courseAssignment.count).not.toHaveBeenCalled();
  });

  it("rejects non-coordinator without querying", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "u", activeRole: "PROGRAM_HEAD", roles: ["PROGRAM_HEAD"] });
    await expect(getGenEdDashboard()).rejects.toThrow("General Education Coordinator access required");
    expect(prismaMock.course.count).not.toHaveBeenCalled();
  });

  it("scopes all reads to GENERAL_EDUCATION", async () => {
    prismaMock.courseAssignment.count.mockResolvedValue(5);
    prismaMock.course.count.mockResolvedValue(3);
    prismaMock.courseAssignment.groupBy.mockResolvedValue([{ program_id: "p1", _count: 2 } as unknown as Awaited<ReturnType<typeof prismaMock.courseAssignment.groupBy>>[number]]);
    const r = await getGenEdDashboard();
    expect(prismaMock.courseAssignment.count).toHaveBeenCalledWith({
      where: { is_active: true, course: { course_scope: "GENERAL_EDUCATION", is_active: true } },
    });
    expect(prismaMock.course.count).toHaveBeenCalledWith({ where: { course_scope: "GENERAL_EDUCATION", is_active: true } });
    expect(prismaMock.courseAssignment.groupBy).toHaveBeenCalledWith({
      by: ["program_id"],
      where: { is_active: true, course: { course_scope: "GENERAL_EDUCATION", is_active: true } },
      _count: true,
    });
    expect(r.activeAssignments).toBe(5);
    expect(r.geCourses).toBe(3);
    expect(r.programsWithAssignments).toBe(1);
  });

  it("reports no-courses when catalog empty", async () => {
    prismaMock.course.count.mockResolvedValue(0);
    const r = await getGenEdDashboard();
    expect(r.emptyReason).toBe("no-courses");
  });

  it("reports no-assignments when courses exist but no active assignments", async () => {
    prismaMock.course.count.mockResolvedValue(2);
    prismaMock.courseAssignment.count.mockResolvedValue(0);
    const r = await getGenEdDashboard();
    expect(r.emptyReason).toBe("no-assignments");
  });

  it("reports null emptyReason when data exists", async () => {
    prismaMock.course.count.mockResolvedValue(2);
    prismaMock.courseAssignment.count.mockResolvedValue(1);
    const r = await getGenEdDashboard();
    expect(r.emptyReason).toBeNull();
  });
});
