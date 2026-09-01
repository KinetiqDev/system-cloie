import { beforeEach, describe, expect, it, vi } from "vitest";
import { getGeneralEducationDashboardEvidence } from "@/features/analytics/services/general-education-dashboard-evidence";

const { resolveAuthSessionMock, prismaMock } = vi.hoisted(() => ({
  resolveAuthSessionMock: vi.fn(),
  prismaMock: {
    response: { count: vi.fn() },
    evaluationAssignment: { count: vi.fn() },
    quantitativeResponseItem: { findMany: vi.fn() },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));

const fivePointSnapshot = [
  {
    key: "section-1",
    title: "Ratings",
    items: [{ key: "q1", kind: "quantitative", scale: [1, 2, 3, 4, 5] }],
  },
];
const fourPointSnapshot = [
  {
    key: "section-1",
    title: "Ratings",
    items: [{ key: "q1", kind: "quantitative", scale: [1, 2, 3, 4] }],
  },
];

function ratingRow(ratingValue: number, structureSnapshot: unknown) {
  return {
    rating_value: ratingValue,
    section_key: "section-1",
    item_key: "q1",
    response: {
      assignment: {
        course_bound: { instrument: { structure_snapshot: structureSnapshot } },
      },
    },
  };
}

describe("getGeneralEducationDashboardEvidence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resolveAuthSessionMock.mockResolvedValue({
      userId: "coord-1",
      activeRole: "GEN_ED_COORDINATOR",
      roles: ["GEN_ED_COORDINATOR"],
    });
    prismaMock.response.count.mockResolvedValue(2);
    prismaMock.evaluationAssignment.count.mockResolvedValue(4);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow(4, fivePointSnapshot),
      ratingRow(5, fivePointSnapshot),
    ]);
  });

  it("denies other roles before reading evidence", async () => {
    resolveAuthSessionMock.mockResolvedValue({
      userId: "ph-1",
      activeRole: "PROGRAM_HEAD",
      roles: ["PROGRAM_HEAD"],
    });

    await expect(getGeneralEducationDashboardEvidence("term-1")).resolves.toBeNull();
    expect(prismaMock.response.count).not.toHaveBeenCalled();
  });

  it("returns a mean only when every valid rating uses one compatible scale", async () => {
    const result = await getGeneralEducationDashboardEvidence("term-1");

    expect(result).toEqual({
      submittedResponseCount: 2,
      evaluationOpportunityCount: 4,
      responseRate: 0.5,
      ratingCount: 2,
      meanRating: 4.5,
    });
    expect(prismaMock.response.count).toHaveBeenCalledWith({
      where: {
        status: "SUBMITTED",
        deployment_type: "COURSE_BOUND",
        assignment: {
          course_bound: {
            course_assignment: {
              term_instance_id: "term-1",
              course: { course_scope: "GENERAL_EDUCATION" },
            },
          },
        },
      },
    });
  });

  it("withholds a pooled mean across incompatible scales", async () => {
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([
      ratingRow(4, fivePointSnapshot),
      ratingRow(4, fourPointSnapshot),
    ]);

    await expect(getGeneralEducationDashboardEvidence("term-1")).resolves.toMatchObject({
      ratingCount: 2,
      meanRating: null,
    });
  });

  it("reports response rate as unavailable when there are no opportunities", async () => {
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.evaluationAssignment.count.mockResolvedValue(0);
    prismaMock.quantitativeResponseItem.findMany.mockResolvedValue([]);

    await expect(getGeneralEducationDashboardEvidence("term-1")).resolves.toMatchObject({
      responseRate: null,
      meanRating: null,
    });
  });
});
