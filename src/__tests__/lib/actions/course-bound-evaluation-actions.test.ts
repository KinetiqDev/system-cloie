import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROLES } from "@/lib/constants/roles";

const {
  previewMock,
  publishMock,
  resolveAuthSessionMock,
  resolveProgramHeadContextMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  previewMock: vi.fn(),
  publishMock: vi.fn(),
  resolveAuthSessionMock: vi.fn(),
  resolveProgramHeadContextMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));

vi.mock("@/features/evaluations/services/preview-course-bound-respondents", () => ({
  previewCourseBoundRespondents: previewMock,
}));

vi.mock("@/features/evaluations/services/publish-course-bound-evaluation", () => ({
  publishCourseBoundEvaluation: publishMock,
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import {
  previewCourseBoundRespondentsAction,
  publishCourseBoundEvaluationAction,
} from "@/lib/actions/course-bound-evaluation-actions";

const programHeadSession = {
  activeRole: ROLES.PROGRAM_HEAD,
  profileGate: { status: "COMPLETE" },
  roles: [ROLES.PROGRAM_HEAD],
  userId: "program-head-1",
};

const validContext = {
  success: true as const,
  data: {
    authorizedPrograms: [
      { code: "BSED", id: "program-1", name: "Bachelor of Secondary Education" },
    ],
    selectedProgram: {
      code: "BSED",
      id: "program-1",
      name: "Bachelor of Secondary Education",
    },
    userId: "program-head-1",
  },
};

const basePublishPayload = {
  assignmentId: "00000000-0000-4000-8000-000000000001",
  deploymentName: "Course evaluation",
  templateId: "00000000-0000-4000-8000-000000000002",
};

describe("course-bound evaluation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue(programHeadSession);
    resolveProgramHeadContextMock.mockResolvedValue(validContext);
    previewMock.mockResolvedValue({ success: true, data: [] });
    publishMock.mockResolvedValue({
      success: true,
      data: { assignmentCount: 1, evaluationId: "evaluation-1", status: "ACTIVE", targetCount: 1 },
    });
  });

  it("requires selected Program context for Program Head preview", async () => {
    await expect(
      previewCourseBoundRespondentsAction({ assignmentId: basePublishPayload.assignmentId })
    ).resolves.toEqual({ error: "Selected Program is required.", success: false });
    expect(previewMock).not.toHaveBeenCalled();
  });

  it("rejects an unauthorized selected Program before publishing", async () => {
    resolveProgramHeadContextMock.mockResolvedValue({
      error: "Selected Program is not assigned.",
      success: false,
    });

    await expect(
      publishCourseBoundEvaluationAction({
        ...basePublishPayload,
        programId: "00000000-0000-4000-8000-000000000003",
      })
    ).resolves.toEqual({ error: "Selected Program is unavailable.", success: false });
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("passes selected Program context to an authorized publish", async () => {
    await expect(
      publishCourseBoundEvaluationAction({
        ...basePublishPayload,
        programId: "00000000-0000-4000-8000-000000000003",
      })
    ).resolves.toMatchObject({ success: true });
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ programId: "00000000-0000-4000-8000-000000000003" })
    );
  });

  it("revalidates the selected Program paths after a successful Program Head publish", async () => {
    const programId = "00000000-0000-4000-8000-000000000003";

    await expect(
      publishCourseBoundEvaluationAction({
        ...basePublishPayload,
        programId,
      })
    ).resolves.toMatchObject({ success: true });

    expect(revalidatePathMock).toHaveBeenCalledWith("/faculty/tools");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${programId}/tools`
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${programId}/cilo-evaluations/new`
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      `/program-head/programs/${programId}/cilo-reviews`
    );
  });
});
