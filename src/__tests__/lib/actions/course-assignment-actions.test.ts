import { describe, it, expect, vi, beforeEach } from "vitest";
import { StudentSection, YearLevel } from "@prisma/client";

const TERM_ID = "11111111-1111-4111-a111-111111111111";
const FACULTY_ID = "22222222-2222-4222-b222-222222222222";
const COURSE_ID = "33333333-3333-4333-a333-333333333333";
const PROGRAM_ID = "44444444-4444-4444-b444-444444444444";
const ASSIGNMENT_ID = "aaaaaaaa-1111-4111-a111-111111111111";

const revalidatePathSpy = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathSpy,
}));

vi.mock("@/features/course-assignments/services/manage-course-assignments", () => ({
  createCourseAssignment: vi.fn(() => Promise.resolve({ success: true, data: { id: ASSIGNMENT_ID } })),
  updateCourseAssignment: vi.fn(() => Promise.resolve({ success: true, data: undefined })),
  deactivateCourseAssignment: vi.fn(() => Promise.resolve({ success: true, data: undefined })),
  activateCourseAssignment: vi.fn(() => Promise.resolve({ success: true, data: undefined })),
  deleteCourseAssignment: vi.fn(() => Promise.resolve({ success: true, data: undefined })),
  bulkCreateCourseAssignments: vi.fn(() => Promise.resolve({ success: true, created: 1, errors: [] })),
}));

vi.mock("@/features/course-assignments/services/list-course-assignments", () => ({
  listCourseAssignments: vi.fn(),
}));

vi.mock("@/features/course-assignments/services/list-course-assignments-for-faculty", () => ({
  listCourseAssignmentsForFaculty: vi.fn(),
}));

vi.mock("@/features/course-assignments/services/search-faculty-pool", () => ({
  searchFacultyPool: vi.fn(),
}));

import {
  createCourseAssignmentAction,
  updateCourseAssignmentAction,
  deactivateCourseAssignmentAction,
  activateCourseAssignmentAction,
  deleteCourseAssignmentAction,
  bulkCreateCourseAssignmentsAction,
} from "@/lib/actions/course-assignment-actions";

describe("course-assignment actions revalidate both role routes on success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createCourseAssignmentAction revalidates /program-head/course-assignments and /secretary/course-assignments", async () => {
    await createCourseAssignmentAction({
      termInstanceId: TERM_ID,
      facultyId: FACULTY_ID,
      courseId: COURSE_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith("/program-head/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/course-assignments");
  });

  it("updateCourseAssignmentAction revalidates /program-head/course-assignments and /secretary/course-assignments", async () => {
    await updateCourseAssignmentAction({
      assignmentId: ASSIGNMENT_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith("/program-head/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/course-assignments");
  });

  it("deactivateCourseAssignmentAction revalidates /program-head/course-assignments and /secretary/course-assignments", async () => {
    await deactivateCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID });

    expect(revalidatePathSpy).toHaveBeenCalledWith("/program-head/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/course-assignments");
  });

  it("activateCourseAssignmentAction revalidates /program-head/course-assignments and /secretary/course-assignments", async () => {
    await activateCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID });

    expect(revalidatePathSpy).toHaveBeenCalledWith("/program-head/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/course-assignments");
  });

  it("deleteCourseAssignmentAction revalidates /program-head/course-assignments and /secretary/course-assignments", async () => {
    await deleteCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID });

    expect(revalidatePathSpy).toHaveBeenCalledWith("/program-head/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/course-assignments");
  });

  it("bulkCreateCourseAssignmentsAction revalidates /program-head/course-assignments and /secretary/course-assignments", async () => {
    await bulkCreateCourseAssignmentsAction({
      assignments: [
        {
          termInstanceId: TERM_ID,
          facultyId: FACULTY_ID,
          courseId: COURSE_ID,
          programId: PROGRAM_ID,
          yearLevel: YearLevel.FIRST_YEAR,
          section: StudentSection.MORNING,
        },
      ],
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith("/program-head/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/secretary/course-assignments");
  });
});
