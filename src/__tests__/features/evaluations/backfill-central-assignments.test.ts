import { beforeEach, describe, expect, it, vi } from "vitest";
import { backfillCentralAssignmentsForUsers } from "@/features/evaluations/services/central-stakeholder-eligibility";

function buildStore(
  overrides: {
    deployments?: Array<{ id: string; major_id?: string | null }>;
    existing?: Array<{ central_deployment_id: string; respondent_id: string }>;
  } = {}
) {
  return {
    alumniProfile: { findMany: vi.fn() },
    centralDeployment: {
      findMany: vi.fn().mockResolvedValue(
        (overrides.deployments ?? []).map((deployment) => ({
          id: deployment.id,
          major_id: deployment.major_id ?? null,
        }))
      ),
    },
    evaluationAssignment: {
      findMany: vi.fn().mockResolvedValue(overrides.existing ?? []),
      createMany: vi.fn(),
    },
    industryPartnerProfile: { findMany: vi.fn() },
    industryPartnerProgramAffiliation: { findMany: vi.fn() },
  };
}

describe("backfillCentralAssignmentsForUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assigns a newly approved alumnus to open program deployments", async () => {
    const store = buildStore({
      deployments: [{ id: "dep-open" }, { id: "dep-major", major_id: "major-1" }],
    });

    const result = await backfillCentralAssignmentsForUsers(store, {
      programId: "program-1",
      majorId: "major-1",
      targetStakeholder: "ALUMNI",
      userIds: ["alumni-new"],
    });

    expect(result).toEqual({ assignmentCount: 2 });
    expect(store.evaluationAssignment.createMany).toHaveBeenCalledWith({
      data: [
        { central_deployment_id: "dep-open", respondent_id: "alumni-new" },
        { central_deployment_id: "dep-major", respondent_id: "alumni-new" },
      ],
    });
  });
  it("scopes alumni backfill to the alumnus major", async () => {
    const store = buildStore({ deployments: [{ id: "dep-open" }] });

    const result = await backfillCentralAssignmentsForUsers(store, {
      programId: "program-1",
      majorId: "major-1",
      targetStakeholder: "ALUMNI",
      userIds: ["alumni-new"],
    });

    expect(result).toEqual({ assignmentCount: 1 });
    expect(store.centralDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: "program-1",
          target_stakeholder: "ALUMNI",
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({ major_id: null }),
                expect.objectContaining({ major_id: "major-1" }),
              ]),
            }),
          ]),
        }),
      })
    );
  });
  it("does not duplicate assignments that already exist", async () => {
    const store = buildStore({
      deployments: [{ id: "dep-open" }],
      existing: [{ central_deployment_id: "dep-open", respondent_id: "alumni-new" }],
    });

    const result = await backfillCentralAssignmentsForUsers(store, {
      programId: "program-1",
      majorId: null,
      targetStakeholder: "ALUMNI",
      userIds: ["alumni-new"],
    });

    expect(result).toEqual({ assignmentCount: 0 });
    expect(store.evaluationAssignment.createMany).not.toHaveBeenCalled();
  });

  it("only targets open deployments in the stakeholder program", async () => {
    const store = buildStore({ deployments: [] });

    const result = await backfillCentralAssignmentsForUsers(store, {
      programId: "program-1",
      majorId: null,
      targetStakeholder: "INDUSTRY_PARTNER",
      userIds: ["partner-new"],
      now: new Date("2026-05-01T00:00:00Z"),
    });

    expect(result).toEqual({ assignmentCount: 0 });
    expect(store.centralDeployment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          program_id: "program-1",
          target_stakeholder: "INDUSTRY_PARTNER",
          status: { in: ["ACTIVE", "SCHEDULED"] },
        }),
      })
    );
    expect(store.evaluationAssignment.createMany).not.toHaveBeenCalled();
  });

  it("does nothing when no users became eligible", async () => {
    const store = buildStore({ deployments: [{ id: "dep-open" }] });

    const result = await backfillCentralAssignmentsForUsers(store, {
      programId: "program-1",
      targetStakeholder: "ALUMNI",
      userIds: [],
    });

    expect(result).toEqual({ assignmentCount: 0 });
    expect(store.centralDeployment.findMany).not.toHaveBeenCalled();
  });
});
