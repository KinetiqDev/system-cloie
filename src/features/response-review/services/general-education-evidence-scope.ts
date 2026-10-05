import type { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// General Education evidence scope (ADR 0034)
//
// Course scope, not respondent Program membership, decides evidence ownership.
// A General Education Course-bound evaluation belongs to the active General
// Education Coordinator college-wide even when every respondent is a Student
// of a Program the Program Heads oversee. Program-specific courses and Central
// deployments are never in this scope, and no selected-Program context exists
// for the Coordinator, so every predicate below must stay Program-agnostic.
//
// These builders take no caller-supplied predicates. An authorization boundary
// that accepts an `extra` fragment risks a spread silently replacing the scope
// clause it is meant to extend, so callers compose their own filters alongside
// the returned clause instead.
// ---------------------------------------------------------------------------

/** CourseAssignment predicate: GE course, no Program filter. */
export function generalEducationCourseAssignmentWhere(): Prisma.CourseAssignmentWhereInput {
  return { course: { course_scope: "GENERAL_EDUCATION" } };
}

/** CourseBoundEvaluation predicate: GE course, no Program filter. */
export function generalEducationCourseEvaluationWhere(): Prisma.CourseBoundEvaluationWhereInput {
  return { course_assignment: generalEducationCourseAssignmentWhere() };
}
