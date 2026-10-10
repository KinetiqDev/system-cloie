import { beforeEach, expect, it, vi } from "vitest";
import { getDeanEvidence } from "@/features/analytics/services/dean-evidence";
const { college, outcomes, readiness, catalog } = vi.hoisted(() => ({
  college: vi.fn(),
  outcomes: vi.fn(),
  readiness: vi.fn(),
  catalog: vi.fn(),
}));
vi.mock("@/features/analytics/services/dean-analytics", () => ({
  getDeanCollegeAnalytics: college,
}));
vi.mock("@/features/analytics/services/get-program-head-analytics", () => ({
  getProgramHeadOutcomes: outcomes,
  getProgramHeadBreakdowns: vi.fn(),
  getProgramHeadStakeholders: vi.fn(),
  getProgramHeadTrends: vi.fn(),
  getProgramHeadFeedback: vi.fn(),
}));
vi.mock("@/features/analytics/services/general-education-analytics", () => ({
  getGeneralEducationOutcomes: vi.fn(),
  getGeneralEducationCourses: vi.fn(),
  getGeneralEducationTrends: vi.fn(),
  getGeneralEducationFeedback: vi.fn(),
}));
vi.mock("@/features/dean/services/read-dean-learning-outcomes", () => ({
  getDeanLearningOutcomes: readiness,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: { pO: { findMany: catalog } } }));
beforeEach(() => {
  vi.resetAllMocks();
  college.mockResolvedValue({
    programs: [{ id: "p", code: "P", name: "Program", is_active: true }],
    periods: [{ id: "term", status: "COMPLETED" }],
    evidence: [],
  });
  outcomes.mockResolvedValue({ outcomes: [] });
  catalog.mockResolvedValue([]);
});
it("preserves rating evidence if a completed readiness snapshot is unavailable", async () => {
  readiness.mockRejectedValue(new Error("snapshot not found"));
  const result = await getDeanEvidence({
    view: "outcomes",
    programId: "p",
    termInstanceId: "term",
  });
  expect(result?.kind).toBe("outcomes");
  if (result?.kind !== "outcomes") throw new Error("Wrong view");
  expect(result.alignmentUnavailable).toBe(true);
  expect(result.data).toEqual({ outcomes: [] });
  expect(result.alignmentBasis).toBe("Completed-period immutable snapshot");
});
it("does not use live readiness to invent an all-period snapshot", async () => {
  const result = await getDeanEvidence({ view: "outcomes", programId: "p" });
  expect(result?.kind).toBe("outcomes");
  expect(readiness).not.toHaveBeenCalled();
});
it("rejects another program's or General Education evaluation before detail reads", async () => {
  college.mockResolvedValue({
    programs: [{ id: "p", code: "P", name: "Program", is_active: true }],
    periods: [],
    evidence: [{ id: "e", programId: "other", source: "COURSE" }],
  });
  const result = await getDeanEvidence({ view: "outcomes", programId: "p", evaluationId: "e" });
  expect(result?.kind).toBe("college");
  expect(outcomes).not.toHaveBeenCalled();
  expect(catalog).not.toHaveBeenCalled();
});
