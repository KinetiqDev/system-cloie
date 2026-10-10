import { describe, expect, it, vi } from "vitest";
import { getGeneralEducationOutcomes } from "@/features/analytics/services/general-education-analytics";
const { resolveAuthSessionMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  prismaMock: { quantitativeResponseItem: { findMany: vi.fn() } },
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
describe("Explicit Dean institutional reader", () => {
  it.each([
    null,
    "PROGRAM_HEAD",
    "FACULTY",
    "GEN_ED_COORDINATOR",
    "SECRETARY",
    "STUDENT",
    "ALUMNI",
    "INDUSTRY_PARTNER",
  ])("denies %s without querying evidence", async (role) => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(role ? { activeRole: role } : null);
    expect(await getGeneralEducationOutcomes({ tab: "outcomes" }, "dean")).toBeNull();
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
  });
});
