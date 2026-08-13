import { describe, expect, it, vi } from "vitest";
import { searchFacultyPool } from "@/features/course-assignments/services/search-faculty-pool";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe("search-faculty-pool", () => {
  const mockProgramHeadSession = createAuthSessionSnapshot({
    userId: "ph-1",
    email: "ph@test.com",
    roles: [ROLES.PROGRAM_HEAD],
  });

  const mockFacultySession = createAuthSessionSnapshot({
    userId: "faculty-1",
    email: "faculty@test.com",
    roles: [ROLES.FACULTY],
  });

  it("should allow program head to search faculty", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "faculty-1",
        email: "john.doe@test.com",
        name: "John Doe",
        faculty_program_affiliations: [
          { program: { id: "prog-1", code: "CS", name: "Computer Science" }, is_primary: true },
        ],
      },
    ] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1 as never);

    const result = await searchFacultyPool("john");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].name).toBe("John Doe");
      expect(result.data.items[0].primaryAffiliation).toBe("Computer Science");
    }
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { name: { contains: "john", mode: "insensitive" } },
            { email: { contains: "john", mode: "insensitive" } },
          ]),
        }),
        orderBy: [{ name: "asc" }, { id: "asc" }],
      })
    );
  });

  it("should deny access for faculty", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockFacultySession);

    const result = await searchFacultyPool("john");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Access denied");
    }
  });

  it("should return multiple affiliations", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(mockProgramHeadSession);

    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "faculty-2",
        email: "jane.smith@test.com",
        name: "Jane-Marie Smith",
        faculty_program_affiliations: [
          { program: { id: "prog-1", code: "CS", name: "Computer Science" }, is_primary: true },
          { program: { id: "prog-2", code: "IT", name: "Information Technology" }, is_primary: false },
        ],
      },
    ] as never);
    vi.mocked(prisma.user.count).mockResolvedValue(1 as never);

    const result = await searchFacultyPool("jane");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0].affiliations).toHaveLength(2);
      expect(result.data.items[0].affiliations).toContain("Computer Science");
      expect(result.data.items[0].affiliations).toContain("Information Technology");
    }
  });
});
