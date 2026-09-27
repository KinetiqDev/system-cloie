/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacultyApprovalStatus } from "@prisma/client";
import { listFacultyAccessRequests } from "@/features/users/services/list-faculty-access-requests";
import { ROLES } from "@/lib/constants/roles";
import { prisma } from "@/lib/db/prisma";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

const { findManyRequestMock } = vi.hoisted(() => ({
  findManyRequestMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

vi.mock("@/features/legal/services/require-legal-acknowledgement", () => ({
  requireLegalAcknowledgement: vi.fn(async () => ({ acknowledged: true })),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { facultyAccessRequest: { findMany: findManyRequestMock } },
}));

function secretarySession(overrides: Record<string, unknown> = {}) {
  return {
    userId: "secretary-1",
    activeRole: ROLES.SECRETARY,
    roles: [ROLES.SECRETARY],
    profileGate: { status: "COMPLETE" },
    ...overrides,
  };
}

function requestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "request-1",
    status: FacultyApprovalStatus.PENDING,
    created_at: new Date("2026-09-20T10:00:00.000Z"),
    decided_at: null,
    decision_note: null,
    program: { id: "program-1", code: "BSIT", name: "Bachelor of Science in Information Technology" },
    user: { id: "faculty-1", name: "Jane Smith", email: "jane@acd.edu.ph", is_active: true },
    ...overrides,
  };
}

describe("listFacultyAccessRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns requests with the requested program and pending count", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(secretarySession());
    findManyRequestMock.mockResolvedValue([
      requestRow(),
      requestRow({
        id: "request-2",
        status: FacultyApprovalStatus.APPROVED,
        decided_at: new Date("2026-09-21T09:00:00.000Z"),
        user: { id: "faculty-2", name: "Ann Reyes", email: "ann@acd.edu.ph", is_active: true },
      }),
    ]);

    const result = await listFacultyAccessRequests();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.pendingCount).toBe(1);
    expect(result.data.requests).toHaveLength(2);
    expect(result.data.requests[0]).toMatchObject({
      userId: "faculty-1",
      name: "Jane Smith",
      programCode: "BSIT",
      status: "PENDING",
      decidedAt: null,
    });
    expect(result.data.requests[0].submittedAt).toBe("2026-09-20T10:00:00.000Z");
  });

  it("surfaces a deactivated applicant so the Secretary can see why", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(secretarySession());
    findManyRequestMock.mockResolvedValue([
      requestRow({
        user: { id: "faculty-3", name: "Deactivated", email: "d@acd.edu.ph", is_active: false },
      }),
    ]);

    const result = await listFacultyAccessRequests();

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.requests[0].isActive).toBe(false);
  });

  it("refuses a caller whose active role is not Secretary", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      secretarySession({ activeRole: ROLES.FACULTY, roles: [ROLES.SECRETARY, ROLES.FACULTY] })
    );

    const result = await listFacultyAccessRequests();

    // Holding Secretary among the assigned roles is not review authority.
    expect(result.success).toBe(false);
    expect(findManyRequestMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated caller", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await listFacultyAccessRequests();

    expect(result.success).toBe(false);
    expect(findManyRequestMock).not.toHaveBeenCalled();
  });

  it("refuses a Secretary session that is not ready", async () => {
    (resolveAuthSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      secretarySession({ profileGate: { status: "INACTIVE" } })
    );

    const result = await listFacultyAccessRequests();

    expect(result.success).toBe(false);
    expect(findManyRequestMock).not.toHaveBeenCalled();
  });
});
