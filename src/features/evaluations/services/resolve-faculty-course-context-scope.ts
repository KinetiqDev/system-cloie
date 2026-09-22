import { listFacultyCourseContexts } from "./list-faculty-course-contexts";

/**
 * Resolves a Faculty-managed Course context against the caller's active
 * Faculty Course contexts. Returns null when the Course, Program, and major
 * triple is not one this Faculty member may act on, so every caller keeps its
 * own error message while sharing one authoritative scope check.
 */
export async function resolveFacultyCourseContextScope(input: {
  courseId: string;
  majorId: string | null;
  programId: string;
}): Promise<{ courseId: string; majorId: string | null; programId: string } | null> {
  const availableContexts = await listFacultyCourseContexts();

  if (!availableContexts.success) {
    return null;
  }

  const matchingContext = availableContexts.data.find(
    (candidate) =>
      candidate.courseId === input.courseId &&
      candidate.programId === input.programId &&
      candidate.majorId === input.majorId
  );

  if (!matchingContext) {
    return null;
  }

  return {
    courseId: matchingContext.courseId,
    majorId: matchingContext.majorId,
    programId: matchingContext.programId,
  };
}
