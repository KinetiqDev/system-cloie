"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  commitCourseAlignmentWrite,
  prepareCourseAlignmentWrite,
  type CourseAlignmentReview,
} from "@/features/outcomes/services/manage-faculty-course-alignment";

const desiredAlignmentSchema = z.object({
  courseId: z.string().uuid("Invalid Course ID."),
  desired: z.array(
    z.object({
      ciloId: z.string().uuid("Invalid CILO ID."),
      targetIds: z.array(z.string().uuid("Invalid Graduate Outcome ID.")),
    })
  ),
});

const pairSchema = z.object({
  ciloId: z.string().uuid(),
  targetId: z.string().uuid(),
});

const snapshotSchema = z.array(
  z.object({
    ciloId: z.string().uuid(),
    targetIds: z.array(z.string().uuid()),
  })
);

const reviewSchema = z.object({
  courseId: z.string().uuid(),
  before: snapshotSchema,
  after: snapshotSchema,
  additions: z.array(pairSchema),
  removals: z.array(pairSchema),
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
): Promise<{ success: true; changed: number } | { success: false; error: string }> {
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
  return { success: true, changed: result.data.changed };
}
