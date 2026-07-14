import { describe, expect, it, vi, beforeEach } from "vitest";

const { findManyCilosMock, updateManyCilosMock, findUniqueCourseMock, resolveAuthSessionMock } =
  vi.hoisted(() => ({
    findManyCilosMock: vi.fn(),
    updateManyCilosMock: vi.fn(),
    findUniqueCourseMock: vi.fn(),
    resolveAuthSessionMock: vi.fn(),
  }));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    cILO: { findMany: findManyCilosMock, updateMany: updateManyCilosMock },
    course: { findUnique: findUniqueCourseMock },
    $transaction: vi.fn((fn) => fn({ cILO: { findMany: findManyCilosMock } })),
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("CILO archive/restore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "faculty-1",
      roles: ["FACULTY"],
    });
  });

  it("active reads exclude archived CILOs", async () => {
    findManyCilosMock.mockResolvedValue([
      { id: "cilo-1", description: "Active CILO 1" },
      { id: "cilo-2", description: "Active CILO 2" },
    ]);
    findUniqueCourseMock.mockResolvedValue({ id: "course-1" });

    const { loadCilosForCourseAction } = await import(
      "@/lib/actions/faculty-cilo-actions"
    );
    const result = await loadCilosForCourseAction("course-1");

    expect(result.success).toBe(true);
    expect(result.cilos).toHaveLength(2);
    expect(findManyCilosMock).toHaveBeenCalledWith({
      where: { course_id: "course-1", is_active: true },
      select: { id: true, description: true },
      orderBy: { created_at: "asc" },
    });
  });

  it("returns empty when all CILOs are archived", async () => {
    findManyCilosMock.mockResolvedValue([]);
    findUniqueCourseMock.mockResolvedValue({ id: "course-2" });

    const { loadCilosForCourseAction } = await import(
      "@/lib/actions/faculty-cilo-actions"
    );
    const result = await loadCilosForCourseAction("course-2");

    expect(result.success).toBe(true);
    expect(result.cilos).toHaveLength(0);
    expect(findManyCilosMock).toHaveBeenCalledWith({
      where: { course_id: "course-2", is_active: true },
      select: { id: true, description: true },
      orderBy: { created_at: "asc" },
    });
  });

  it("archives and restores without deleting CILO mappings", async () => {
    updateManyCilosMock.mockResolvedValue({ count: 1 });
    const { archiveCiloForCourseAction, restoreCiloForCourseAction } = await import(
      "@/lib/actions/faculty-cilo-actions"
    );

    await expect(archiveCiloForCourseAction("course-1", "cilo-1")).resolves.toEqual({
      success: true,
    });
    expect(updateManyCilosMock).toHaveBeenLastCalledWith({
      where: { id: "cilo-1", course_id: "course-1" },
      data: { is_active: false },
    });

    await expect(restoreCiloForCourseAction("course-1", "cilo-1")).resolves.toEqual({
      success: true,
    });
    expect(updateManyCilosMock).toHaveBeenLastCalledWith({
      where: { id: "cilo-1", course_id: "course-1" },
      data: { is_active: true },
    });
  });
});
