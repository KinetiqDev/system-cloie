import { z } from "zod";
import { YearLevel, StudentSection } from "@prisma/client";

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
});

/**
 * Schema for updating a course assignment.
 */
export const updateCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  programId: z.string().uuid().optional(),
  yearLevel: z.nativeEnum(YearLevel).optional(),
  section: z.nativeEnum(StudentSection).optional(),
  facultyId: z.string().uuid().optional(),
});

/**
 * Schema for deactivating a course assignment.
 */
export const deactivateCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
});

/**
 * Schema for activating a course assignment.
 */
export const activateCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
});

/**
 * Schema for deleting a course assignment (hard delete).
 */
export const deleteCourseAssignmentSchema = z.object({
  assignmentId: z.string().uuid(),
  confirmationLabel: z.string().min(1),
  revision: z.string().datetime(),
  membershipCount: z.number().int().nonnegative(),
  activeMembershipCount: z.number().int().nonnegative(),
  removedMembershipCount: z.number().int().nonnegative(),
});

export const preflightCourseAssignmentDeletionSchema = z.object({
  assignmentId: z.string().uuid(),
});

/**
 * Schema for bulk creating course assignments.
 */
export const bulkCreateCourseAssignmentsSchema = z.object({
  assignments: z.array(createCourseAssignmentSchema).min(1).max(100),
});

export const addRosterMembershipSchema = z.object({
  assignmentId: z.string().uuid(),
  studentEmail: z.string().trim().toLowerCase().email().max(254),
});

export const restoreRosterMembershipSchema = z.object({
  assignmentId: z.string().uuid(),
  membershipId: z.string().uuid(),
});

export const removeRosterMembershipSchema = restoreRosterMembershipSchema;

export const importCourseRosterTextSchema = z.object({
  assignmentId: z.string().uuid(),
  csvText: z.string(),
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
export type RestoreRosterMembershipInput = z.infer<typeof restoreRosterMembershipSchema>;
export type RemoveRosterMembershipInput = z.infer<typeof removeRosterMembershipSchema>;
export type ImportCourseRosterTextInput = z.infer<typeof importCourseRosterTextSchema>;
