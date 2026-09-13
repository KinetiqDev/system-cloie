export function countCourseEvaluations(course: {
  course_assignments: Array<{ _count: { course_bound_evaluations: number } }>;
}): number {
  return course.course_assignments.reduce(
    (sum, assignment) => sum + assignment._count.course_bound_evaluations,
    0
  );
}
