import { describe, expect, it, vi } from "vitest";
import { getProgramHeadOutcomes } from "@/features/analytics/services/get-program-head-analytics";
const { resolveProgramHeadContextMock, authMock, prismaMock } = vi.hoisted(() => ({
  resolveProgramHeadContextMock: vi.fn(),
  authMock: vi.fn(),
  prismaMock: {
    program: { findUnique: vi.fn() },
    academicTermInstance: { findMany: vi.fn() },
    schoolYear: { findUnique: vi.fn() },
    response: { count: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    quantitativeResponseItem: { findMany: vi.fn() },
  },
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({ resolveAuthSession: authMock }));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
const defaultFilters = { tab: "outcomes" as const };
const bsedContext = {
  data: { selectedProgram: { id: "program-bsed", code: "BSED", name: "Education" } },
};
describe("Explicit Dean program evidence reader", () => {
  it.each([
    null,
    "PROGRAM_HEAD",
    "FACULTY",
    "GEN_ED_COORDINATOR",
    "SECRETARY",
    "STUDENT",
    "ALUMNI",
    "INDUSTRY_PARTNER",
  ])("denies %s", async (role) => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(role ? { activeRole: role } : null);
    expect(await getProgramHeadOutcomes("program-bsed", defaultFilters, "dean")).toBeNull();
    expect(prismaMock.program.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.quantitativeResponseItem.findMany).not.toHaveBeenCalled();
  });
  it("keeps both the owning program and evaluation predicates on direct reads", async () => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ activeRole: "DEAN" });
    prismaMock.program.findUnique.mockResolvedValue(bsedContext.data.selectedProgram);
    prismaMock.academicTermInstance.findMany.mockResolvedValue([]);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);
    const data = await getProgramHeadOutcomes(
      "program-bsed",
      { tab: "outcomes", evidenceSource: "COURSE" },
      "dean",
      "evaluation-1"
    );
    expect(data?.outcomes).toEqual([]);
    const scope = prismaMock.quantitativeResponseItem.findMany.mock.calls[0][0].where.response;
    expect(scope.status).toBe("SUBMITTED");
    expect(scope.deployment_id).toBe("evaluation-1");
    expect(JSON.stringify(scope)).toContain("program-bsed");
    expect(JSON.stringify(scope)).toContain("PROGRAM_SPECIFIC");
    expect(resolveProgramHeadContextMock).not.toHaveBeenCalled();
    expect(prismaMock.evaluationAssignment.count.mock.calls[0][0].where.course_bound.id).toBe(
      "evaluation-1"
    );
  });
});
