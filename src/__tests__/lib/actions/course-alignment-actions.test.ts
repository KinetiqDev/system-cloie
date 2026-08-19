import { beforeEach, describe, expect, it, vi } from "vitest";

const { prepareWriteMock, commitWriteMock, revalidatePathMock } = vi.hoisted(() => ({
  prepareWriteMock: vi.fn(),
  commitWriteMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/outcomes/services/manage-course-alignment", () => ({
  prepareCourseAlignmentWrite: prepareWriteMock,
  commitCourseAlignmentWrite: commitWriteMock,
}));

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const TARGET_ID = "33333333-3333-4333-8333-333333333333";

function validReview() {
  return {
    courseId: COURSE_ID,
    before: [{ ciloId: CILO_ID, targetIds: [] as string[] }],
    after: [{ ciloId: CILO_ID, targetIds: [TARGET_ID] }],
    additions: [{ ciloId: CILO_ID, targetId: TARGET_ID }],
    removals: [] as Array<{ ciloId: string; targetId: string }>,
    freshnessToken: "fresh",
    signature: "a".repeat(64),
  };
}

describe("Course alignment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commitWriteMock.mockResolvedValue({ success: true, data: { changed: 1, freshnessToken: "fresh" } });
    prepareWriteMock.mockResolvedValue({
      success: true,
      data: {
        courseId: COURSE_ID,
        before: [],
        after: [],
        additions: [],
        removals: [],
        freshnessToken: "fresh",
        signature: "a".repeat(64),
      },
    });
  });

  it("revalidates the Faculty and Secretary alignment surfaces after a commit", async () => {
    const { commitCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );
    const review = validReview();

    await expect(commitCourseAlignmentAction(review, true)).resolves.toEqual({
      success: true,
      changed: 1,
      freshnessToken: "fresh",
    });
    expect(commitWriteMock).toHaveBeenCalledWith(review, true);
    expect(revalidatePathMock.mock.calls).toEqual([
      [`/faculty/cilos/${COURSE_ID}/alignment`],
      ["/faculty/cilos"],
      [`/secretary/learning-outcomes/alignment/${COURSE_ID}`],
      ["/secretary/learning-outcomes"],
    ]);
  });

  it("requires explicit confirmation before opening a write", async () => {
    const { commitCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(commitCourseAlignmentAction(validReview(), false)).resolves.toEqual({
      success: false,
      error: "Explicit confirmation is required.",
    });
    expect(commitWriteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed review without opening a write", async () => {
    const { commitCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(commitCourseAlignmentAction({}, true)).resolves.toEqual({
      success: false,
      error: "Invalid alignment review.",
    });
    expect(commitWriteMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("surfaces write failures without revalidating", async () => {
    commitWriteMock.mockResolvedValue({
      success: false,
      error: "Course alignment changed after review. Reload and review the latest mappings.",
    });
    const { commitCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(commitCourseAlignmentAction(validReview(), true)).resolves.toEqual({
      success: false,
      error: "Course alignment changed after review. Reload and review the latest mappings.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("prepares a valid alignment draft through the shared write service", async () => {
    const { prepareCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(
      prepareCourseAlignmentAction({
        courseId: COURSE_ID,
        desired: [{ ciloId: CILO_ID, targetIds: [TARGET_ID] }],
        freshnessToken: "fresh",
      })
    ).resolves.toMatchObject({ success: true });
    expect(prepareWriteMock).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      desired: [{ ciloId: CILO_ID, targetIds: [TARGET_ID] }],
      freshnessToken: "fresh",
    });
  });

  it("rejects a malformed alignment draft before calling the write service", async () => {
    const { prepareCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(prepareCourseAlignmentAction({ courseId: "not-a-uuid" })).resolves.toMatchObject(
      { success: false }
    );
    expect(prepareWriteMock).not.toHaveBeenCalled();
  });
});
