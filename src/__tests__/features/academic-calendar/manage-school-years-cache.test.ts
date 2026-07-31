import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

const { invalidateAcademicPeriodReadModelTagsMock } = vi.hoisted(() => ({
  invalidateAcademicPeriodReadModelTagsMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  invalidateAcademicPeriodReadModelTags: invalidateAcademicPeriodReadModelTagsMock,
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    schoolYear: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    academicTermInstance: { findFirst: vi.fn() },
  },
}));

import * as authModule from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import {
  archiveSchoolYear,
  createSchoolYear,
  updateSchoolYear,
} from "@/features/academic-calendar/services/manage-school-years";

const secretary = createAuthSessionSnapshot({
  userId: "secretary-1",
  email: "secretary@test.com",
  roles: [ROLES.SECRETARY],
});

describe("Academic Calendar School Year writers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary);
  });

  it("invalidates shared period data after creating a School Year", async () => {
    vi.mocked(prisma.schoolYear.create).mockResolvedValue({ id: "sy-1", code: "2026-2027" } as never);

    await expect(createSchoolYear({ startYear: 2026 })).resolves.toEqual({
      success: true,
      data: { id: "sy-1", code: "2026-2027" },
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("invalidates shared period data after updating a School Year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_archived: false,
    } as never);
    vi.mocked(prisma.schoolYear.update).mockResolvedValue({ id: "sy-1" } as never);

    await expect(
      updateSchoolYear({
        id: "sy-1",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2027-05-31"),
      })
    ).resolves.toEqual({ success: true, data: { id: "sy-1" } });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("invalidates shared period data after archiving a School Year", async () => {
    vi.mocked(prisma.schoolYear.findUnique).mockResolvedValue({
      id: "sy-1",
      is_archived: false,
      term_instances: [],
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.schoolYear.update).mockResolvedValue({ id: "sy-1" } as never);

    await expect(archiveSchoolYear("sy-1")).resolves.toEqual({
      success: true,
      data: { id: "sy-1" },
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith();
  });

  it("does not invalidate after authorization failure", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null);

    await expect(createSchoolYear({ startYear: 2026 })).resolves.toEqual({
      success: false,
      error: "Admin access required",
    });
    expect(invalidateAcademicPeriodReadModelTagsMock).not.toHaveBeenCalled();
  });
});
