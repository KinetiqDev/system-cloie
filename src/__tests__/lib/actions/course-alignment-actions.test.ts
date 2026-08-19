import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prepareWriteMock,
  commitWriteMock,
  saveDraftMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  prepareWriteMock: vi.fn(),
  commitWriteMock: vi.fn(),
  saveDraftMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/features/outcomes/services/manage-course-alignment", () => ({
  prepareCourseAlignmentWrite: prepareWriteMock,
  commitCourseAlignmentWrite: commitWriteMock,
  saveDraftCourseAlignment: saveDraftMock,
}));

const COURSE_ID = "11111111-1111-4111-8111-111111111111";
const CILO_ID = "22222222-2222-4222-8222-222222222222";
const TARGET_ID = "33333333-3333-4333-8333-333333333333";

function validReview() {
  return {
    scope: "GENERAL_EDUCATION" as const,
    courseId: COURSE_ID,
    before: [{ ciloId: CILO_ID, targetIds: [] as string[] }],
    after: [{ ciloId: CILO_ID, targetIds: [TARGET_ID] }],
    additions: [{ ciloId: CILO_ID, targetId: TARGET_ID }],
    removals: [] as Array<{ ciloId: string; targetId: string }>,
    freshnessToken: "fresh",
    signature: "a".repeat(64),
  };
}

function validPspDraft() {
  return {
    courseId: COURSE_ID,
    cells: [{ ciloId: CILO_ID, mappings: [{ ploId: TARGET_ID, manifestation: "LEARNING" }] }],
    freshnessToken: "fresh",
  };
}

describe("Course alignment actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commitWriteMock.mockResolvedValue({
      success: true,
      data: { changed: 1, freshnessToken: "fresh" },
    });
    prepareWriteMock.mockResolvedValue({
      success: true,
      data: {
        scope: "GENERAL_EDUCATION",
        courseId: COURSE_ID,
        before: [],
        after: [],
        additions: [],
        removals: [],
        freshnessToken: "fresh",
        signature: "a".repeat(64),
      },
    });
    saveDraftMock.mockResolvedValue({
      success: true,
      data: { changed: 2, freshnessToken: "fresh" },
    });
  });

  it("revalidates the Faculty alignment surfaces after a commit", async () => {
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

  it("rejects a Program-specific review with an invalid manifestation", async () => {
    const { commitCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(
      commitCourseAlignmentAction(
        {
          scope: "PROGRAM_SPECIFIC",
          courseId: COURSE_ID,
          before: [{ ciloId: CILO_ID, mappings: [] }],
          after: [
            { ciloId: CILO_ID, mappings: [{ ploId: TARGET_ID, manifestation: "L" }] },
          ],
          additions: [],
          updates: [],
          removals: [],
          freshnessToken: "fresh",
          signature: "a".repeat(64),
        },
        true
      )
    ).resolves.toEqual({ success: false, error: "Invalid alignment review." });
    expect(commitWriteMock).not.toHaveBeenCalled();
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

  it("forwards manifestation-shaped desired items to the write service", async () => {
    const { prepareCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(
      prepareCourseAlignmentAction({
        courseId: COURSE_ID,
        desired: [
          {
            ciloId: CILO_ID,
            mappings: [{ ploId: TARGET_ID, manifestation: "OPPORTUNITY" }],
          },
        ],
        freshnessToken: "fresh",
      })
    ).resolves.toMatchObject({ success: true });
    expect(prepareWriteMock).toHaveBeenCalledWith({
      courseId: COURSE_ID,
      desired: [
        {
          ciloId: CILO_ID,
          mappings: [{ ploId: TARGET_ID, manifestation: "OPPORTUNITY" }],
        },
      ],
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

  it("rejects manifestations outside the enum for prepare and draft saves", async () => {
    const { prepareCourseAlignmentAction, saveDraftCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );
    const invalidManifestations = ["L", "learning", "NONE", null, 7, "INTERNSHIP"];

    for (const manifestation of invalidManifestations) {
      await expect(
        prepareCourseAlignmentAction({
          courseId: COURSE_ID,
          desired: [
            {
              ciloId: CILO_ID,
              mappings: [{ ploId: TARGET_ID, manifestation }],
            },
          ],
          freshnessToken: "fresh",
        })
      ).resolves.toMatchObject({ success: false });
      await expect(
        saveDraftCourseAlignmentAction({
          courseId: COURSE_ID,
          cells: [{ ciloId: CILO_ID, mappings: [{ ploId: TARGET_ID, manifestation }] }],
          freshnessToken: "fresh",
        })
      ).resolves.toMatchObject({ success: false });
    }
    expect(prepareWriteMock).not.toHaveBeenCalled();
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it("saves a draft and revalidates the Faculty alignment surfaces", async () => {
    const { saveDraftCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );
    const draft = validPspDraft();

    await expect(saveDraftCourseAlignmentAction(draft)).resolves.toEqual({
      success: true,
      changed: 2,
      freshnessToken: "fresh",
    });
    expect(saveDraftMock).toHaveBeenCalledWith(draft);
    expect(revalidatePathMock.mock.calls).toEqual([
      [`/faculty/cilos/${COURSE_ID}/alignment`],
      ["/faculty/cilos"],
    ]);
  });

  it("surfaces draft-save failures without revalidating", async () => {
    saveDraftMock.mockResolvedValue({
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    });
    const { saveDraftCourseAlignmentAction } = await import(
      "@/lib/actions/course-alignment-actions"
    );

    await expect(saveDraftCourseAlignmentAction(validPspDraft())).resolves.toEqual({
      success: false,
      error: "Course alignment changed. Reload and review the latest mappings.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});