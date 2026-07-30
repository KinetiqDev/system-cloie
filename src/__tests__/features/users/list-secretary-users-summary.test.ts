import { beforeEach, describe, expect, it, vi } from "vitest";
import { SystemRole } from "@prisma/client";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { listSecretaryUsersSummary } from "@/features/users/services/list-secretary-users-summary";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn() },
    program: { findMany: vi.fn() },
  },
}));

describe("listSecretaryUsersSummary", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ userId: "secretary-1", roles: [ROLES.SECRETARY] })
    );
    vi.mocked(prisma.user.count).mockResolvedValue(2);
    vi.mocked(prisma.program.findMany).mockResolvedValue([
      {
        id: "program-1",
        code: "BSCE",
        name: "Civil Engineering",
        is_active: true,
        majors: [{ id: "major-1", name: "Structural", is_active: true }],
      },
    ] as never);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user-2",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@example.com",
        is_active: true,
        roles: [{ role: SystemRole.STUDENT }],
        student_profile: { program: { code: "BSCE" }, major: { name: "Structural" } },
        faculty_program_affiliations: [],
        program_head_assignments: [],
        industry_partner_profile: null,
      },
    ] as never);
  });

  it("denies non-Secretary access before any user read", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.DEAN] })
    );

    const result = await listSecretaryUsersSummary({ page: 1, sort: "lastName", direction: "asc" });
    const { prisma } = await import("@/lib/db/prisma");

    expect(result).toEqual({ success: false, error: "Secretary access required." });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it("queries only one page with the approved projection and preserves aggregate counts", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(31)
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8);

    const result = await listSecretaryUsersSummary({
      page: 3,
      role: SystemRole.STUDENT,
      program: "BSCE",
      major: "Structural",
      q: "Jane",
      sort: "email",
      direction: "desc",
    });

    expect(result).toMatchObject({
      success: true,
      data: {
        total: 31,
        page: 3,
        pageSize: 15,
        kpi: { totalUsers: 100, totalStudents: 60, totalAlumni: 12, totalIndustryPartners: 8 },
        users: [{ id: "user-2", programLabel: "BSCE", majorLabel: "Structural" }],
      },
    });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 30,
        take: 15,
        orderBy: [{ email: "desc" }, { last_name: "asc" }, { first_name: "asc" }, { id: "asc" }],
        select: expect.not.objectContaining({ created_at: true }),
      })
    );
    expect(prisma.user.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ AND: expect.any(Array) }) })
    );
  });

  it("canonicalizes an out-of-range page to the last available page", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.user.count).mockReset();
    vi.mocked(prisma.user.count).mockResolvedValueOnce(16).mockResolvedValue(2);

    const result = await listSecretaryUsersSummary({
      page: 99,
      sort: "lastName",
      direction: "asc",
    });

    expect(result).toMatchObject({ success: true, data: { total: 16, page: 2 } });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 15, take: 15 })
    );
  });

  it("canonicalizes unknown programs and majors before counting users", async () => {
    const { prisma } = await import("@/lib/db/prisma");

    const unknownProgram = await listSecretaryUsersSummary({
      page: 1,
      program: "NOT_A_PROGRAM",
      sort: "lastName",
      direction: "asc",
    });
    const unknownMajor = await listSecretaryUsersSummary({
      page: 1,
      program: "BSCE",
      major: "NOT_A_MAJOR",
      sort: "lastName",
      direction: "asc",
    });

    expect(unknownProgram).toEqual({
      success: false,
      error: "Invalid Secretary Users filters.",
      canonicalQuery: "",
    });
    expect(unknownMajor).toEqual({
      success: false,
      error: "Invalid Secretary Users filters.",
      canonicalQuery: "program=BSCE",
    });
    expect(prisma.user.count).not.toHaveBeenCalled();
  });
});
