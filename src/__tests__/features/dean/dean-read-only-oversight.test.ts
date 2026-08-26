import { describe, expect, it, vi, beforeEach } from "vitest";
import { ROLES } from "@/lib/constants/roles";
import { createAuthSessionSnapshot } from "@/__tests__/helpers/auth-session";

const resolveAuthSessionMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  program: { findUnique: vi.fn() },
  academicTermInstance: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/academic-calendar/services/read-period-readiness", () => ({
  persistPeriodReadinessSnapshot: vi.fn(),
}));
vi.mock("@/lib/cache/academic-periods", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    invalidateAcademicPeriodReadModelTags: vi.fn(),
  };
});
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

import { transitionPeriodStatus } from "@/features/academic-calendar/services/manage-academic-period-lifecycle";
import { createUserBySecretaryAction } from "@/lib/actions/secretary-user-crud-actions";
import { requireDean, DEAN_CACHE_CONTROL } from "@/app/api/dean/route-helpers";
import * as deanServices from "@/features/dean/services/read-dean-oversight";

function deanSession() {
  return createAuthSessionSnapshot({
    userId: "dean-1",
    email: "demo-dean@cloie.test",
    roles: [ROLES.DEAN],
  });
}

function secretarySession() {
  return createAuthSessionSnapshot({
    userId: "sec-1",
    email: "demo-secretary@cloie.test",
    roles: [ROLES.SECRETARY],
  });
}

function facultySession() {
  return createAuthSessionSnapshot({
    userId: "fac-1",
    email: "faculty@acdeducation.com",
    roles: [ROLES.FACULTY],
  });
}

describe("Dean read-only oversight (issue #549)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a Dean caller at the Academic Period lifecycle server boundary with an actionable message", async () => {
    resolveAuthSessionMock.mockResolvedValue(deanSession());
    const result = await transitionPeriodStatus("period-id", "ACTIVE");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/secretary/i);
      expect(result.error.length).toBeGreaterThan(10);
    }
    // No mutation was attempted.
    expect(prismaMock.academicTermInstance.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a Faculty caller at the Academic Period lifecycle server boundary", async () => {
    resolveAuthSessionMock.mockResolvedValue(facultySession());
    const result = await transitionPeriodStatus("period-id", "COMPLETED");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/secretary/i);
  });

  it("rejects a Dean creating a user through the Secretary Server Action", async () => {
    resolveAuthSessionMock.mockResolvedValue(deanSession());
    const formData = new FormData();
    formData.set("name", "E2E Dean Attempt");
    formData.set("email", "dean-attempt@acdeducation.com");
    formData.set("role", "FACULTY");

    const result = await createUserBySecretaryAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/secretary/i);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("Secretary can pass the Server Action gate (service validation, not auth, decides the result)", async () => {
    resolveAuthSessionMock.mockResolvedValue(secretarySession());
    // Use a non-institutional email so the service layer rejects with an
    // actionable message, proving the Dean gate passed and the service took over.
    const formData = new FormData();
    formData.set("name", "Secretary Check");
    formData.set("email", "bad-email@gmail.com");
    formData.set("role", "SECRETARY");
    const result = await createUserBySecretaryAction(formData);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/acd institutional email/i);
  });

  it("requireDean returns private no-store and denies a Secretary with 403", async () => {
    resolveAuthSessionMock.mockResolvedValue(secretarySession());
    const response = await requireDean();
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    expect(response?.headers.get("Cache-Control")).toBe(DEAN_CACHE_CONTROL);
    const body = await response?.json();
    expect(body.error).toMatch(/dean/i);
  });

  it("requireDean denies an unauthenticated caller with 401", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);
    const response = await requireDean();
    expect(response?.status).toBe(401);
  });

  it("requireDean allows a Dean caller (no denial response)", async () => {
    resolveAuthSessionMock.mockResolvedValue(deanSession());
    const response = await requireDean();
    expect(response).toBeNull();
  });

  it("Dean read model services remain read-only: no mutation export is reachable from the dean feature", () => {
    const exported = Object.keys(deanServices);
    const mutationNames = exported.filter((name) =>
      /create|update|delete|mutate|write|activate|transition/i.test(name)
    );
    expect(mutationNames).toEqual([]);
    expect(exported).toEqual(
      expect.arrayContaining([
        "listDeanEligiblePeriods",
        "getDeanDashboard",
        "getDeanLearningOutcomes",
        "getDeanEnrollments",
        "getDeanRoster",
        "getDeanRosterPage",
      ])
    );
  });

  it("Secretary mismatched-semester activation fails with an actionable hierarchy message and performs no mutation", async () => {
    resolveAuthSessionMock.mockResolvedValue(secretarySession());
    prismaMock.academicTermInstance.findUnique.mockResolvedValue({
      id: "p-mismatch",
      status: "PLANNED",
      semester: "FIRST",
      school_year: { is_archived: false, is_active: true, active_semester: "SECOND" },
    } as never);
    const result = await transitionPeriodStatus("p-mismatch", "ACTIVE");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.toLowerCase()).toMatch(/semester|active semester/);
      expect(result.error.length).toBeGreaterThan(10);
    }
    expect(prismaMock.academicTermInstance.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.academicTermInstance.updateMany).not.toHaveBeenCalled();
  });
});
