import { describe, expect, it, vi, beforeEach } from "vitest";

const invalidateAcademicPeriodReadModelTagsMock = vi.hoisted(() => vi.fn());
import { transitionPeriodStatus } from "@/features/academic-calendar/services/manage-academic-period-lifecycle";
import * as authModule from "@/features/auth/services/resolve-auth-session";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";
import { persistPeriodReadinessSnapshot } from "@/features/academic-calendar/services/read-period-readiness";

vi.mock("@/features/auth/services/resolve-auth-session");
vi.mock("@/features/academic-calendar/services/read-period-readiness", () => ({
  persistPeriodReadinessSnapshot: vi.fn(),
}));
vi.mock("@/lib/cache/academic-periods", () => ({
  invalidateAcademicPeriodReadModelTags: invalidateAcademicPeriodReadModelTagsMock,
}));
vi.mock("@/lib/db/prisma", () => {
  const prisma = {
    academicTermInstance: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (t: unknown) => Promise<unknown>) => {
      const tx = (await import("@/lib/db/prisma")).prisma;
      return fn(tx);
    }),
  };
  return { prisma };
});

const secretary = () =>
  createAuthSessionSnapshot({
    userId: "sec-1",
    email: "secretary@test.com",
    roles: [ROLES.SECRETARY],
  });

const faculty = () =>
  createAuthSessionSnapshot({
    userId: "fac-1",
    email: "fac@test.com",
    roles: [ROLES.FACULTY],
  });

describe("manage-academic-period-lifecycle / transitionPeriodStatus", () => {
  let prisma: Awaited<typeof import("@/lib/db/prisma")>["prisma"];

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma = (await import("@/lib/db/prisma")).prisma;
  });

  it("rejects unauthenticated callers", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(null as never);
    const r = await transitionPeriodStatus("p-1", "ACTIVE");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/secretary/i);
  });

  it("rejects non-secretary callers", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(faculty());
    const r = await transitionPeriodStatus("p-1", "ACTIVE");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/secretary/i);
  });

  it("rejects a Secretary role that is not active", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(
      createAuthSessionSnapshot({ roles: [ROLES.FACULTY, ROLES.SECRETARY] })
    );

    const r = await transitionPeriodStatus("p-1", "ACTIVE");

    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/secretary/i);
  });

  it("returns error when period not found", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue(null);
    const r = await transitionPeriodStatus("p-missing", "ACTIVE");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/not found/i);
  });

  it("rejects transition out of a terminal status", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-done",
      end_date: new Date("2026-05-31"),
      status: "COMPLETED",
    } as never);
    const r = await transitionPeriodStatus("p-done", "ACTIVE");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/immutable/i);
  });

  it("activates a PLANNED period with no prior active", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-new",
      end_date: null,
      status: "PLANNED",
      semester: "FIRST",
      school_year: { is_archived: false, is_active: true, active_semester: "FIRST" },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);

    const r = await transitionPeriodStatus("p-new", "ACTIVE");
    expect(r.success).toBe(true);
    expect(prisma.academicTermInstance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-new", status: "PLANNED" },
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
    });
  });

  it("activates a period and atomically completes prior active when end_date present", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-new",
      end_date: null,
      status: "PLANNED",
      semester: "FIRST",
      school_year: { is_archived: false, is_active: true, active_semester: "FIRST" },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
      id: "p-prior",
      end_date: new Date("2026-05-31"),
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);

    const r = await transitionPeriodStatus("p-new", "ACTIVE");
    expect(r.success).toBe(true);

    const updateCalls = vi.mocked(prisma.academicTermInstance.updateMany).mock.calls;
    const completedCall = updateCalls.find(
      (c) => c[0]?.where?.id === "p-prior"
    );
    expect(completedCall?.[0]?.data).toMatchObject({ status: "COMPLETED" });

    const activatedCall = updateCalls.find(
      (c) => c[0]?.where?.id === "p-new"
    );
    expect(activatedCall?.[0]?.data).toMatchObject({ status: "ACTIVE" });
  });

  it("rejects activating when prior active lacks end_date and leaves state unchanged", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-new",
      end_date: null,
      status: "PLANNED",
      semester: "FIRST",
      school_year: { is_archived: false, is_active: true, active_semester: "FIRST" },
    } as never);
    vi.mocked(prisma.academicTermInstance.findFirst).mockResolvedValue({
      id: "p-prior",
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);

    const r = await transitionPeriodStatus("p-new", "ACTIVE");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error).toMatch(/end_date/i);
    expect(prisma.academicTermInstance.updateMany).not.toHaveBeenCalled();
  });

  it("completes the active period without changing its end_date", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-active",
      end_date: new Date("2026-05-31"),
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);

    const r = await transitionPeriodStatus("p-active", "COMPLETED");
    expect(r.success).toBe(true);
    expect(prisma.academicTermInstance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-active", status: "ACTIVE" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
    expect(persistPeriodReadinessSnapshot).toHaveBeenCalledWith("p-active", prisma);
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
    });
  });

  it("completes an ACTIVE period with null end_date and persists the readiness snapshot", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-active",
      end_date: null,
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);

    const r = await transitionPeriodStatus("p-active", "COMPLETED");
    expect(r.success).toBe(true);
    expect(prisma.academicTermInstance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-active", status: "ACTIVE" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
    expect(persistPeriodReadinessSnapshot).toHaveBeenCalledWith("p-active", prisma);
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
    });
  });

  it("cancels a PLANNED period", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-plan",
      end_date: null,
      status: "PLANNED",
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);
    const r = await transitionPeriodStatus("p-plan", "CANCELLED");
    expect(r.success).toBe(true);
    expect(prisma.academicTermInstance.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p-plan", status: "PLANNED" },
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: false,
    });
  });

  it("invalidates the active-period projection when an ACTIVE period is cancelled", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-active",
      end_date: new Date("2026-05-31"),
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 1 } as never);

    const r = await transitionPeriodStatus("p-active", "CANCELLED");

    expect(r.success).toBe(true);
    expect(invalidateAcademicPeriodReadModelTagsMock).toHaveBeenCalledWith({
      activePeriodChanged: true,
    });
  });

  it("rejects activating a period in a school year that is not active", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-new",
      end_date: null,
      status: "PLANNED",
      semester: "FIRST",
      school_year: { is_archived: false, is_active: false, active_semester: "FIRST" },
    } as never);

    const r = await transitionPeriodStatus("p-new", "ACTIVE");
    expect(r).toEqual({
      success: false,
      error: "Cannot activate a term in a school year that is not active",
    });
    expect(prisma.academicTermInstance.updateMany).not.toHaveBeenCalled();
  });

  it("rejects activating a period whose semester does not match the active semester", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-new",
      end_date: null,
      status: "PLANNED",
      semester: "SECOND",
      school_year: { is_archived: false, is_active: true, active_semester: "FIRST" },
    } as never);

    const r = await transitionPeriodStatus("p-new", "ACTIVE");
    expect(r).toEqual({
      success: false,
      error: "Period semester does not match the school year's active semester",
    });
    expect(prisma.academicTermInstance.updateMany).not.toHaveBeenCalled();
  });

  it("rejects stale transitions without overwriting the current status", async () => {
    vi.mocked(authModule.resolveAuthSession).mockResolvedValue(secretary());
    vi.mocked(prisma.academicTermInstance.findUnique).mockResolvedValue({
      id: "p-active",
      end_date: new Date("2026-05-31"),
      status: "ACTIVE",
    } as never);
    vi.mocked(prisma.academicTermInstance.updateMany).mockResolvedValue({ count: 0 } as never);

    const r = await transitionPeriodStatus("p-active", "COMPLETED");

    expect(r).toEqual({
      success: false,
      error: "Academic period changed; retry the transition",
    });
  });
});
