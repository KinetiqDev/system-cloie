"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  commitCourseAlignmentWrite,
  prepareCourseAlignmentWrite,
  saveDraftCourseAlignment,
  type CourseAlignmentReview,
} from "@/features/outcomes/services/manage-course-alignment";

const manifestationSchema = z.enum(["LEARNING", "PRACTICE", "OPPORTUNITY"]);

const mappingSchema = z.object({
  targetId: z.string().uuid("Invalid outcome target ID."),
  manifestation: manifestationSchema,
});

const desiredAlignmentSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID."),
  desired: z.array(
    z
      .object({
        ciloId: z.string().uuid("Invalid CILO ID."),
        mappings: z.array(mappingSchema),
      })
      .strict()
  ),
  freshnessToken: z.string().min(1, "Alignment is stale. Reload and review the latest mappings."),
});

const draftSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID."),
  cells: z.array(
    z.object({
      ciloId: z.string().uuid("Invalid CILO ID."),
      mappings: z.array(mappingSchema),
    })
  ),
  freshnessToken: z.string().min(1, "Alignment is stale. Reload and review the latest mappings."),
});

const manifestationSnapshotSchema = z.array(
  z.object({
    ciloId: z.string().uuid(),
    mappings: z.array(
      z.object({
        targetId: z.string().uuid(),
        manifestation: manifestationSchema.nullable(),
      })
    ),
  })
);

const manifestationPairSchema = z.object({
  ciloId: z.string().uuid(),
  targetId: z.string().uuid(),
});

const manifestationUpdateSchema = manifestationPairSchema.extend({
  from: manifestationSchema.nullable(),
  to: manifestationSchema,
});

const reviewSchema = z.object({
  scope: z.enum(["GENERAL_EDUCATION", "PROGRAM_SPECIFIC"]),
  courseId: z.string().uuid(),
  before: manifestationSnapshotSchema,
  after: manifestationSnapshotSchema,
  additions: z.array(manifestationPairSchema.extend({ manifestation: manifestationSchema })),
  updates: z.array(manifestationUpdateSchema),
  removals: z.array(manifestationPairSchema),
  freshnessToken: z.string().min(1),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
});

type PrepareCourseAlignmentActionResult =
  | { success: true; review: CourseAlignmentReview }
  | { success: false; error: string };
// fallow-ignore-next-line complexity
export async function prepareCourseAlignmentAction(
  input: unknown
): Promise<PrepareCourseAlignmentActionResult> {
  const parsed = desiredAlignmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid alignment draft." };
  }
  const result = await prepareCourseAlignmentWrite(parsed.data);
  return result.success
    ? { success: true, review: result.data }
    : { success: false, error: result.error };
}
// fallow-ignore-next-line complexity
export async function commitCourseAlignmentAction(
  review: unknown,
  confirmed: unknown
): Promise<
  { success: true; changed: number; freshnessToken: string } | { success: false; error: string }
> {
  const parsed = reviewSchema.safeParse(review);
  if (!parsed.success) return { success: false, error: "Invalid alignment review." };
  const confirmedResult = z.boolean().safeParse(confirmed);
  if (!confirmedResult.success || !confirmedResult.data) {
    return { success: false, error: "Explicit confirmation is required." };
  }

  const result = await commitCourseAlignmentWrite(parsed.data, confirmedResult.data);
  if (!result.success) return result;

  revalidatePath(`/faculty/cilos/${parsed.data.courseId}/alignment`);
  revalidatePath("/faculty/cilos");
  return {
    success: true,
    changed: result.data.changed,
    freshnessToken: result.data.freshnessToken,
  };
}

export async function saveDraftCourseAlignmentAction(
  input: unknown
): Promise<
  { success: true; changed: number; freshnessToken: string } | { success: false; error: string }
> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid alignment draft." };
  }
  const result = await saveDraftCourseAlignment(parsed.data);
  if (!result.success) return result;

  revalidatePath(`/faculty/cilos/${parsed.data.courseId}/alignment`);
  revalidatePath("/faculty/cilos");
  return {
    success: true,
    changed: result.data.changed,
    freshnessToken: result.data.freshnessToken,
  };
}
