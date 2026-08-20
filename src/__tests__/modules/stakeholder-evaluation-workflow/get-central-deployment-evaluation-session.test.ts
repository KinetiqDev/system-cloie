import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, resolveAuthSessionMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    evaluationAssignment: {
      findFirst: findFirstMock,
    },
  },
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const structureSnapshot = [
  {
    key: "section-a",
    title: "Section A",
    description: "Teaching effectiveness",
    items: [
      {
        kind: "quantitative",
        key: "q1",
        prompt: "Rate the instructor.",
        scale: [1, 2, 3, 4, 5],
      },
      {
        kind: "qualitative",
        key: "remarks",
        prompt: "Share your remarks.",
      },
    ],
  },
];

function makeAssignment(overrides?: {
  withResponse?: boolean;
  deploymentStatus?: string;
  activationAt?: Date;
  deadlineAt?: Date;
  responseStatus?: string;
  submittedAt?: Date | null;
}) {
  const defaults = {
    deploymentStatus: "ACTIVE",
    activationAt: new Date("2026-04-01T00:00:00.000Z"),
    deadlineAt: new Date("2026-06-01T00:00:00.000Z"),
    withResponse: false,
    responseStatus: "IN_PROGRESS",
    submittedAt: null,
  };
  const opts = { ...defaults, ...overrides };

  return {
    id: "assignment-1",
    central_deployment_id: "deploy-1",
    central_deployment: {
      id: "deploy-1",
      status: opts.deploymentStatus,
      activation_at: opts.activationAt,
      deadline_at: opts.deadlineAt,
      instrument: {
        structure_snapshot: structureSnapshot,
        template: {
          name: "Alumni Feedback Survey",
        },
      },
      major: null,
      program: { code: "BSIT", name: "BS Information Technology" },
    },
    response: opts.withResponse
      ? {
          id: "response-1",
          status: opts.responseStatus,
          submitted_at: opts.submittedAt,
          qual_items: [
            {
              prompt_key: "remarks",
              section_key: "section-a",
              text_content: "Good teaching.",
            },
          ],
          quant_items: [
            {
              item_key: "q1",
              section_key: "section-a",
              rating_value: 4,
            },
          ],
        }
      : null,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("getCentralDeploymentEvaluationSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("returns null for unauthenticated users", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).toBeNull();
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it("respondent can load their assigned evaluation session", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue(makeAssignment());

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).not.toBeNull();
    expect(result!.assignmentId).toBe("assignment-1");
    expect(result!.evaluationTitle).toBe("Alumni Feedback Survey");
    expect(result!.programLabel).toBe("BSIT");
    expect(result!.sections).toHaveLength(1);
    expect(result!.sections[0].id).toBe("section-a");
    expect(result!.sections[0].items).toHaveLength(2);
    expect(result!.savedAnswers).toEqual({});
    expect(result!.session).toEqual({
      responseId: null,
      answeredItems: 0,
      totalItems: 2,
      submittedAt: null,
    });
  });

  it("non-assigned respondent gets null", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-not-assigned" });
    findFirstMock.mockResolvedValue(null);

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).toBeNull();
  });

  it("returns null when deployment is unavailable (past deadline)", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue(
      makeAssignment({
        activationAt: new Date("2026-03-01T00:00:00.000Z"),
        deadlineAt: new Date("2026-03-15T00:00:00.000Z"),
      })
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).toBeNull();

    vi.useRealTimers();
  });

  it("returns null when deployment is not yet activated", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue(
      makeAssignment({
        activationAt: new Date("2026-07-01T00:00:00.000Z"),
        deadlineAt: new Date("2026-08-01T00:00:00.000Z"),
      })
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T00:00:00.000Z"));

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).toBeNull();

    vi.useRealTimers();
  });

  it("maps template structure to sections correctly", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue(makeAssignment());

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).not.toBeNull();
    expect(result!.sections[0]).toEqual({
      id: "section-a",
      name: "Section A",
      description: "Teaching effectiveness",
      items: [
        {
          kind: "quantitative",
          itemKey: "q1",
          prompt: "Rate the instructor.",
          scale: [1, 2, 3, 4, 5],
        },
        {
          kind: "qualitative",
          promptKey: "remarks",
          prompt: "Share your remarks.",
        },
      ],
    });
  });

  it("loads saved answers from existing draft response", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue(makeAssignment({ withResponse: true }));

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).not.toBeNull();
    expect(result!.savedAnswers).toEqual({
      "section-a:quantitative:q1": 4,
      "section-a:qualitative:remarks": "Good teaching.",
    });
    expect(result!.session.responseId).toBe("response-1");
    expect(result!.session.answeredItems).toBe(2);
    expect(result!.session.totalItems).toBe(2);
  });

  it("returns null when assignment has no central_deployment", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue({
      id: "assignment-1",
      central_deployment_id: null,
      central_deployment: null,
      response: null,
    });

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).toBeNull();
  });

  it("keeps submitted evaluations readable after the deployment window closes", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findFirstMock.mockResolvedValue(
      makeAssignment({
        withResponse: true,
        responseStatus: "SUBMITTED",
        submittedAt: new Date("2026-03-10T00:00:00.000Z"),
        activationAt: new Date("2026-03-01T00:00:00.000Z"),
        deadlineAt: new Date("2026-03-15T00:00:00.000Z"),
      })
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));

    const { getCentralDeploymentEvaluationSession } =
      await import("@/features/responses/services/get-central-deployment-evaluation-session");

    const result = await getCentralDeploymentEvaluationSession("deploy-1");

    expect(result).not.toBeNull();
    expect(result!.session.submittedAt).toEqual(new Date("2026-03-10T00:00:00.000Z"));
    expect(result!.session.responseId).toBe("response-1");

    vi.useRealTimers();
  });
});
