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
        name: "Jane Doe",
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

    const result = await listSecretaryUsersSummary({ page: 1, sort: "name", direction: "asc" });
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
        orderBy: [{ email: "desc" }, { name: "asc" }, { id: "asc" }],
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
      sort: "name",
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
      sort: "name",
      direction: "asc",
    });
    const unknownMajor = await listSecretaryUsersSummary({
      page: 1,
      program: "BSCE",
      major: "NOT_A_MAJOR",
      sort: "name",
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

  it("searches complete name and email without first/last aliases", async () => {
    const { prisma } = await import("@/lib/db/prisma");

    const result = await listSecretaryUsersSummary({
      page: 1,
      q: "Dela Cruz",
      sort: "name",
      direction: "asc",
    });

    expect(result).toMatchObject({ success: true });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: "Dela Cruz", mode: "insensitive" } },
                { email: { contains: "Dela Cruz", mode: "insensitive" } },
              ],
            },
          ],
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      })
    );
    if (result.success) {
      expect(result.data.users[0]).toMatchObject({ name: "Jane Doe" });
      expect(result.data.users[0]).not.toHaveProperty("firstName");
      expect(result.data.users[0]).not.toHaveProperty("lastName");
    }
  });

  it("sorts by complete name with a stable id tie-breaker", async () => {
    const { prisma } = await import("@/lib/db/prisma");

    await listSecretaryUsersSummary({
      page: 1,
      sort: "name",
      direction: "desc",
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ name: "desc" }, { id: "asc" }],
        select: expect.objectContaining({ name: true }),
      })
    );
  });

  it("prefers multi-program affiliations over the legacy industry partner profile program", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user-3",
        name: "Acme Corp",
        email: "hr@acme.example",
        is_active: true,
        roles: [{ role: SystemRole.INDUSTRY_PARTNER }],
        student_profile: null,
        faculty_program_affiliations: [],
        program_head_assignments: [],
        industry_partner_profile: { program: { code: "BSCE" } },
        industry_partner_program_affiliations: [
          { program: { code: "BSCE" } },
          { program: { code: "BSIT" } },
        ],
      },
    ] as never);

    const result = await listSecretaryUsersSummary({
      page: 1,
      sort: "name",
      direction: "asc",
    });

    expect(result).toMatchObject({
      success: true,
      data: { users: [{ id: "user-3", programLabel: "BSCE, BSIT" }] },
    });
  });

  it("falls back to the legacy industry partner profile program when no affiliations exist", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      {
        id: "user-4",
        name: "Legacy Corp",
        email: "legacy@example.com",
        is_active: true,
        roles: [{ role: SystemRole.INDUSTRY_PARTNER }],
        student_profile: null,
        faculty_program_affiliations: [],
        program_head_assignments: [],
        industry_partner_profile: { program: { code: "BSCE" } },
        industry_partner_program_affiliations: [],
      },
    ] as never);

    const result = await listSecretaryUsersSummary({
      page: 1,
      sort: "name",
      direction: "asc",
    });

    expect(result).toMatchObject({
      success: true,
      data: { users: [{ id: "user-4", programLabel: "BSCE" }] },
    });
  });
});
