import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.hoisted(() => vi.fn());
const resolveAuthSessionMock = vi.hoisted(() => vi.fn());
const lateIncludeMock = vi.hoisted(() => vi.fn());
const resolveProgramHeadContextMock = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: resolveAuthSessionMock,
}));
vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: resolveProgramHeadContextMock,
}));
vi.mock("@/features/evaluations/services/late-include-course-bound-evaluation", () => ({
  lateIncludeCourseBoundEvaluationStudent: lateIncludeMock,
}));

import { lateIncludeCourseBoundEvaluationAction } from "@/lib/actions/course-bound-evaluation-actions";

const payload = {
  evaluationId: "11111111-1111-4111-8111-111111111111",
  membershipId: "22222222-2222-4222-8222-222222222222",
  reversalCategory: "EXCLUDED_IN_ERROR" as const,
};

describe("late inclusion action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuthSessionMock.mockResolvedValue({ activeRole: "FACULTY", userId: "faculty-1" });
    resolveProgramHeadContextMock.mockResolvedValue({ success: true, data: {} });
  });

  it("rejects invalid input before calling service", async () => {
    await expect(
      lateIncludeCourseBoundEvaluationAction({ ...payload, evaluationId: "bad" })
    ).resolves.toEqual({ success: false, error: "Invalid UUID" });
    expect(lateIncludeMock).not.toHaveBeenCalled();
  });

  it("returns safe service result and revalidates evaluation paths on success", async () => {
    lateIncludeMock.mockResolvedValue({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });

    await expect(lateIncludeCourseBoundEvaluationAction(payload)).resolves.toEqual({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });
    expect(lateIncludeMock).toHaveBeenCalledWith(payload);
    expect(revalidatePathMock).toHaveBeenCalledWith("/faculty/tools");
    expect(revalidatePathMock).toHaveBeenCalledWith("/student/evaluations");
  });

  it("does not leak service internals or revalidate failed requests", async () => {
    lateIncludeMock.mockResolvedValue({
      success: false,
      error: "Course assignment not found.",
    });

    await expect(lateIncludeCourseBoundEvaluationAction(payload)).resolves.toEqual({
      success: false,
      error: "Course assignment not found.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("requires selected Program context for Program Head late inclusion", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: "PROGRAM_HEAD", userId: "head-1" });

    await expect(lateIncludeCourseBoundEvaluationAction(payload)).resolves.toEqual({
      error: "Selected Program is required.",
      success: false,
    });
    expect(lateIncludeMock).not.toHaveBeenCalled();
  });

  it("revalidates the selected Program paths after a successful Program Head late inclusion", async () => {
    resolveAuthSessionMock.mockResolvedValue({ activeRole: "PROGRAM_HEAD", userId: "head-1" });
    resolveProgramHeadContextMock.mockResolvedValue({
      success: true,
      data: {
        authorizedPrograms: [
          { code: "BSED", id: "program-1", name: "Bachelor of Secondary Education" },
        ],
        selectedProgram: {
          code: "BSED",
          id: "program-1",
          name: "Bachelor of Secondary Education",
        },
        userId: "head-1",
      },
    });
    lateIncludeMock.mockResolvedValue({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });
    const programHeadPayload = {
      ...payload,
      programId: "33333333-3333-4333-8333-333333333333",
    };

    await expect(lateIncludeCourseBoundEvaluationAction(programHeadPayload)).resolves.toEqual({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });

    expect(lateIncludeMock).toHaveBeenCalledWith(programHeadPayload);
    expect(revalidatePathMock).toHaveBeenCalledWith("/faculty/tools");
    expect(revalidatePathMock).toHaveBeenCalledWith("/student/evaluations");
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/program-head/programs/33333333-3333-4333-8333-333333333333/cilo-reviews"
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/program-head/programs/33333333-3333-4333-8333-333333333333/tools"
    );
  });
});
