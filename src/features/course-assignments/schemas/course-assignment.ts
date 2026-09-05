import { z } from "zod";
import { YearLevel, StudentSection } from "@prisma/client";
import { COURSE_ROSTER_MAX_ROWS } from "../services/course-roster-csv";

/**
 * Schema for creating a course assignment.
 */
export const createCourseAssignmentSchema = z.object({
  termInstanceId: z.string().uuid(),
  facultyId: z.string().uuid(),
  courseId: z.string().uuid(),
  programId: z.string().uuid(),
  yearLevel: z.nativeEnum(YearLevel),
  section: z.nativeEnum(StudentSection),
  selectedProgramId: z.string().uuid().optional(),
});

/**
 * Schema for updating a course assignment.
 */
export const updateCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  selectedProgramId: z.string().uuid().optional(),
  yearLevel: z.nativeEnum(YearLevel).optional(),
  section: z.nativeEnum(StudentSection).optional(),
  facultyId: z.string().uuid().optional(),
});

/**
 * Schema for deactivating a course assignment.
 */
export const deactivateCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
});

/**
 * Schema for activating a course assignment.
 */
export const activateCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
});

/**
 * Schema for deleting a course assignment (hard delete).
 */
export const deleteCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  confirmationLabel: z.string().min(1),
  revision: z.string().datetime(),
  membershipCount: z.number().int().nonnegative(),
  activeMembershipCount: z.number().int().nonnegative(),
  removedMembershipCount: z.number().int().nonnegative(),
});

export const preflightCourseAssignmentDeletionSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
});

/**
 * Schema for bulk creating course assignments.
 */
export const bulkCreateCourseAssignmentsSchema = z.object({
  assignments: z.array(createCourseAssignmentSchema).min(1).max(100),
  selectedProgramId: z.string().uuid().optional(),
});

export const addRosterMembershipSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  studentUserId: z.string().uuid(),
});

export const confirmRosterResolutionSchema = z
  .object({
    assignmentId: z.string().uuid(),
    programId: z.string().uuid().optional(),
    rows: z
      .array(
        z.object({
          sourceIndex: z.number().int().nonnegative(),
          studentUserId: z.string().uuid(),
        })
      )
      .min(1)
      .max(COURSE_ROSTER_MAX_ROWS),
    skippedIndexes: z.array(z.number().int().nonnegative()).max(COURSE_ROSTER_MAX_ROWS),
    suggestedAcknowledged: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const sourceIndexes = data.rows.map((row) => row.sourceIndex);
    if (new Set(sourceIndexes).size !== sourceIndexes.length) {
      ctx.addIssue({
        code: "custom",
        message: "Each source row may be confirmed only once.",
        path: ["rows"],
      });
    }
    const skipped = new Set(data.skippedIndexes);
    if (skipped.size !== data.skippedIndexes.length) {
      ctx.addIssue({
        code: "custom",
        message: "Skipped source indexes must be unique.",
        path: ["skippedIndexes"],
      });
    }
    if (sourceIndexes.some((index) => skipped.has(index))) {
      ctx.addIssue({
        code: "custom",
        message: "A source row cannot be both confirmed and skipped.",
        path: ["skippedIndexes"],
      });
    }
    const userIds = data.rows.map((row) => row.studentUserId);
    if (new Set(userIds).size !== userIds.length) {
      ctx.addIssue({
        code: "custom",
        message: "One account cannot be confirmed more than once in a request.",
        path: ["rows"],
      });
    }
  });

export const restoreRosterMembershipSchema = z.object({
  assignmentId: z.string().uuid(),
  membershipId: z.string().uuid(),
  programId: z.string().uuid().optional(),
});

export const removeRosterMembershipSchema = restoreRosterMembershipSchema;

export const previewCourseRosterSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  rows: z
    .array(
      z.object({
        sourceIndex: z.number().int().nonnegative(),
        submittedName: z.string().max(10_000),
        status: z.enum(["VALID", "INVALID_NAME"]),
      })
    )
    .min(1)
    .max(COURSE_ROSTER_MAX_ROWS),
});

export const searchScopedRosterStudentsSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  query: z.string().max(200),
});

/**
 * TypeScript types derived from schemas.
 */
export type CreateCourseAssignmentInput = z.infer<typeof createCourseAssignmentSchema>;
export type UpdateCourseAssignmentInput = z.infer<typeof updateCourseAssignmentSchema>;
export type DeactivateCourseAssignmentInput = z.infer<typeof deactivateCourseAssignmentSchema>;
export type ActivateCourseAssignmentInput = z.infer<typeof activateCourseAssignmentSchema>;
export type DeleteCourseAssignmentInput = z.infer<typeof deleteCourseAssignmentSchema>;
export type BulkCreateCourseAssignmentsInput = z.infer<typeof bulkCreateCourseAssignmentsSchema>;
export type AddRosterMembershipInput = z.infer<typeof addRosterMembershipSchema>;
// Confirmation preflight contract; the bulk confirmation write flow (#400)
// is the first consumer.
export type ConfirmRosterResolutionInput = z.infer<typeof confirmRosterResolutionSchema>;
export type RestoreRosterMembershipInput = z.infer<typeof restoreRosterMembershipSchema>;
export type RemoveRosterMembershipInput = z.infer<typeof removeRosterMembershipSchema>;
export type PreviewCourseRosterInput = z.infer<typeof previewCourseRosterSchema>;

// Public preview contract; consumers are the scoped candidate search
// (#395) and the reconciliation workspace (#396).
// fallow-ignore-next-line unused-type
export type PreviewCourseRosterRowInput = PreviewCourseRosterInput["rows"][number];
