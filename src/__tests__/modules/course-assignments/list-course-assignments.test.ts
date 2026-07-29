import { describe, expect, it, vi, beforeEach } from "vitest";
import { CourseScope } from "@prisma/client";
import { listCourseAssignments } from "@/features/course-assignments/services/list-course-assignments";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    programHeadAssignment: {
      findMany: vi.fn(),
    },
    courseAssignment: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("listCourseAssignments – role-aware scope enforcement", () => {
  const mockPHSession = createAuthSessionSnapshot({
    userId: "ph-1",
    email: "ph@test.com",
    roles: [ROLES.PROGRAM_HEAD],
  });

  const mockAdminSession = createAuthSessionSnapshot({
    userId: "admin-1",
    email: "secretary@test.com",
    roles: [ROLES.SECRETARY],
  });

  const mockDeanSession = createAuthSessionSnapshot({
    userId: "dean-1",
    email: "dean@test.com",
    roles: [ROLES.DEAN],
  });

  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
    // Default: return empty results so mapping doesn't fail
    vi.mocked(prisma.courseAssignment.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.courseAssignment.count).mockResolvedValue(0 as never);
  });

  it("PH without filter.programId → scoped to phProgramIds", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockPHSession);
    vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
      { program_id: "prog-A" },
      { program_id: "prog-B" },
    ] as never);

    await listCourseAssignments({});

    // The findMany where should constrain to PH's programs
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: { in: ["prog-A", "prog-B"] },
        }),
      })
    );
  });

  it("PH with in-scope filter.programId → narrows to that single program", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockPHSession);
    vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
      { program_id: "prog-A" },
      { program_id: "prog-B" },
    ] as never);

    await listCourseAssignments({ programId: "prog-A" });

    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: "prog-A",
        }),
      })
    );
  });

  it("PH with out-of-scope filter.programId → returns empty (match nothing)", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockPHSession);
    vi.mocked(prisma.programHeadAssignment.findMany).mockResolvedValue([
      { program_id: "prog-A" },
      { program_id: "prog-B" },
    ] as never);

    await listCourseAssignments({ programId: "prog-C" });

    // Should use { in: [] } which matches nothing
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: { in: [] },
        }),
      })
    );
  });

  it("Admin with filter.programId → passes through freely", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

    await listCourseAssignments({ programId: "prog-C" });

    // Admin doesn't resolve PH assignments, so no programHeadAssignment query
    expect(prisma.programHeadAssignment.findMany).not.toHaveBeenCalled();

    // Should pass through freely
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: "prog-C",
        }),
      })
    );
  });

  it("Admin without filter.programId → no program_id constraint", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

    await listCourseAssignments({});

    const callArgs = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0][0];
    expect((callArgs as { where: Record<string, unknown> }).where).not.toHaveProperty("program_id");
  });

  it("Secretary without filter.programId → no program_id constraint", async () => {
    const mockSecretarySession = createAuthSessionSnapshot({
      userId: "secretary-1",
      email: "secretary@test.com",
      roles: [ROLES.SECRETARY],
    });

    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockSecretarySession);

    await listCourseAssignments({});

    expect(prisma.programHeadAssignment.findMany).not.toHaveBeenCalled();
    const callArgs = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0][0];
    expect((callArgs as { where: Record<string, unknown> }).where).not.toHaveProperty("program_id");
  });

  it("Secretary with Program Head role keeps all-program Secretary scope", async () => {
    const mockSecretaryProgramHeadSession = createAuthSessionSnapshot({
      userId: "secretary-ph-1",
      email: "secretary-ph@test.com",
      roles: [ROLES.SECRETARY, ROLES.PROGRAM_HEAD],
    });

    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockSecretaryProgramHeadSession);

    await listCourseAssignments({});

    expect(prisma.programHeadAssignment.findMany).not.toHaveBeenCalled();
    const callArgs = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0][0];
    expect((callArgs as { where: Record<string, unknown> }).where).not.toHaveProperty("program_id");
  });

  it("Dean without filter.programId → no program_id constraint", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

    await listCourseAssignments({});

    expect(prisma.programHeadAssignment.findMany).not.toHaveBeenCalled();
    const callArgs = vi.mocked(prisma.courseAssignment.findMany).mock.calls[0][0];
    expect((callArgs as { where: Record<string, unknown> }).where).not.toHaveProperty("program_id");
  });

  it("Dean with filter.programId → passes through freely", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockDeanSession);

    await listCourseAssignments({ programId: "prog-C" });

    expect(prisma.programHeadAssignment.findMany).not.toHaveBeenCalled();
    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: "prog-C",
        }),
      })
    );
  });

  it("Applies courseScope filter by course.course_scope", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

    await listCourseAssignments({ courseScope: CourseScope.GENERAL_EDUCATION });

    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          course: { course_scope: CourseScope.GENERAL_EDUCATION },
        }),
      })
    );
  });

  it("searches only approved assignment display fields", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockAdminSession);

    await listCourseAssignments({ q: "faculty" });

    expect(prisma.courseAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { faculty: { email: { contains: "faculty", mode: "insensitive" } } },
            { course: { code: { contains: "faculty", mode: "insensitive" } } },
          ]),
        }),
      })
    );
  });
});
