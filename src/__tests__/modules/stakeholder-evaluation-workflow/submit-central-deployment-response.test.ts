import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, findAssignmentMock, findResponseMock, resolveAuthSessionMock, updateMock } =
  vi.hoisted(() => ({
    createMock: vi.fn(),
    findAssignmentMock: vi.fn(),
    findResponseMock: vi.fn(),
    resolveAuthSessionMock: vi.fn(),
    updateMock: vi.fn(),
  }));

vi.mock("@/lib/db/prisma", () => {
  const mockTx = {
    $executeRaw: vi.fn(),
    qualitativeResponseItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    quantitativeResponseItem: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    response: {
      create: createMock,
      findUnique: findResponseMock,
      update: updateMock,
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((fn) => fn(mockTx)),
      evaluationAssignment: {
        findFirst: findAssignmentMock,
      },
      ...mockTx,
    },
  };
});

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

// ─── Fixtures ───────────────────────────────────────────────────────────────

const structureSnapshot = [
  {
    key: "section-a",
    title: "Section A",
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

const validAnswers = {
  "section-a:quantitative:q1": 5,
  "section-a:qualitative:remarks": "Clear and helpful explanations.",
};

function makeAssignment(overrides?: {
  deploymentStatus?: string;
  activationAt?: Date;
  deadlineAt?: Date;
}) {
  return {
    id: "assignment-1",
    central_deployment_id: "deploy-1",
    central_deployment: {
      id: "deploy-1",
      status: overrides?.deploymentStatus ?? "ACTIVE",
      activation_at: overrides?.activationAt ?? new Date("2026-04-01T00:00:00.000Z"),
      deadline_at: overrides?.deadlineAt ?? new Date("2026-06-01T00:00:00.000Z"),
      instrument: {
        structure_snapshot: structureSnapshot,
      },
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("submitCentralDeploymentResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("rejects unauthenticated requests", async () => {
    resolveAuthSessionMock.mockResolvedValue(null);

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(result).toEqual({
      error: "Authentication is required.",
      success: false,
    });
  });

  it("rejects when assignment doesn't belong to respondent", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue(null);

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "nonexistent-assignment",
      answers: validAnswers,
    });

    expect(result).toEqual({
      error: "Evaluation assignment not found.",
      success: false,
    });
  });

  it("validates deployment availability (closed → error)", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue(
      makeAssignment({
        activationAt: new Date("2026-03-01T00:00:00.000Z"),
        deadlineAt: new Date("2026-03-15T00:00:00.000Z"),
      })
    );

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T00:00:00.000Z"));

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(result).toEqual({
      error: "This evaluation is not currently available.",
      success: false,
    });

    vi.useRealTimers();
  });

  it("enforces one-response rule (already submitted → error)", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue(makeAssignment());
    findResponseMock.mockResolvedValue({
      id: "response-1",
      status: "SUBMITTED",
    });

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(result).toEqual({
      error: "This evaluation has already been submitted.",
      success: false,
    });
  });

  it("successfully submits a response with all items", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue(makeAssignment());
    findResponseMock.mockResolvedValue({ id: "response-1", status: "IN_PROGRESS" });
    updateMock.mockResolvedValue({ id: "response-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(result).toEqual({
      responseId: "response-1",
      status: "SUBMITTED",
      submittedAt: "2026-04-20T12:00:00.000Z",
      success: true,
    });

    // The returned timestamp is the exact value frozen inside the transaction,
    // not a second client-side time.
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
          submitted_at: new Date("2026-04-20T12:00:00.000Z"),
        }),
        where: { id: "response-1" },
      })
    );

    vi.useRealTimers();
  });

  it("sets status to SUBMITTED and submitted_at", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue(makeAssignment());
    findResponseMock.mockResolvedValue({ id: "response-1", status: "IN_PROGRESS" });
    updateMock.mockResolvedValue({ id: "response-1" });

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUBMITTED",
          submitted_at: expect.any(Date),
        }),
      })
    );
  });

  it("creates a new response when none exists", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue(makeAssignment());
    findResponseMock.mockResolvedValue(null);
    createMock.mockResolvedValue({ id: "new-response-1", status: "IN_PROGRESS" });
    updateMock.mockResolvedValue({ id: "new-response-1" });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(result).toEqual({
      responseId: "new-response-1",
      status: "SUBMITTED",
      submittedAt: "2026-04-20T12:00:00.000Z",
      success: true,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignment_id: "assignment-1",
          deployment_id: "deploy-1",
          deployment_type: "CENTRAL",
          respondent_id: "user-1",
          status: "IN_PROGRESS",
        }),
      })
    );

    vi.useRealTimers();
  });

  it("rejects when assignment has no central deployment", async () => {
    resolveAuthSessionMock.mockResolvedValue({ userId: "user-1" });
    findAssignmentMock.mockResolvedValue({
      id: "assignment-1",
      central_deployment_id: null,
      central_deployment: null,
    });

    const { submitCentralDeploymentResponse } =
      await import("@/features/responses/services/submit-central-deployment-response");

    const result = await submitCentralDeploymentResponse({
      assignmentId: "assignment-1",
      answers: validAnswers,
    });

    expect(result).toEqual({
      error: "Evaluation assignment not found.",
      success: false,
    });
  });
});
