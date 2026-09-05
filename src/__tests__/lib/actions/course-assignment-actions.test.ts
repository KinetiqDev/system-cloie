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
  createCourseAssignment: vi.fn(() =>
    Promise.resolve({ success: true, data: { id: ASSIGNMENT_ID, programIds: [PROGRAM_ID] } })
  ),
  updateCourseAssignment: vi.fn(() =>
    Promise.resolve({ success: true, data: { programIds: [PROGRAM_ID] } })
  ),
  deactivateCourseAssignment: vi.fn(() =>
    Promise.resolve({ success: true, data: { programIds: [PROGRAM_ID] } })
  ),
  activateCourseAssignment: vi.fn(() =>
    Promise.resolve({ success: true, data: { programIds: [PROGRAM_ID] } })
  ),
  deleteCourseAssignment: vi.fn(() =>
    Promise.resolve({ success: true, data: { programIds: [PROGRAM_ID] } })
  ),
  bulkCreateCourseAssignments: vi.fn(() =>
    Promise.resolve({ success: true, created: 1, errors: [] })
  ),
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
vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: vi.fn(),
}));

vi.mock("@/features/auth/services/resolve-program-head-context", () => ({
  resolveProgramHeadContext: vi.fn(),
}));

import {
  createCourseAssignmentAction,
  updateCourseAssignmentAction,
  deactivateCourseAssignmentAction,
  activateCourseAssignmentAction,
  deleteCourseAssignmentAction,
  bulkCreateCourseAssignmentsAction,
} from "@/lib/actions/course-assignment-actions";
import {
  createCourseAssignment,
  updateCourseAssignment,
  deactivateCourseAssignment,
  activateCourseAssignment,
  deleteCourseAssignment,
  bulkCreateCourseAssignments,
} from "@/features/course-assignments/services/manage-course-assignments";

describe("course-assignment actions revalidate all role routes on success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createCourseAssignmentAction revalidates /program-head and /dean course-assignment routes", async () => {
    await createCourseAssignmentAction({
      termInstanceId: TERM_ID,
      facultyId: FACULTY_ID,
      courseId: COURSE_ID,
      programId: PROGRAM_ID,
      selectedProgramId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
  });

  it("updateCourseAssignmentAction revalidates /program-head and /dean course-assignment routes", async () => {
    await updateCourseAssignmentAction({
      assignmentId: ASSIGNMENT_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
  });

  it("revalidates both Programs when an all-program General Education assignment moves", async () => {
    vi.mocked(updateCourseAssignment).mockResolvedValueOnce({
      success: true,
      data: { programIds: ["55555555-5555-4555-a555-555555555555", PROGRAM_ID] },
    });

    await updateCourseAssignmentAction({
      assignmentId: ASSIGNMENT_ID,
      programId: "55555555-5555-4555-a555-555555555555",
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      "/program-head/programs/55555555-5555-4555-a555-555555555555/course-assignments"
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
    expect(revalidatePathSpy).toHaveBeenCalledWith("/faculty/course-rosters");
  });

  it("deactivateCourseAssignmentAction revalidates /program-head and /dean course-assignment routes", async () => {
    await deactivateCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID, programId: PROGRAM_ID });

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
  });

  it("activateCourseAssignmentAction revalidates /program-head and /dean course-assignment routes", async () => {
    await activateCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID, programId: PROGRAM_ID });

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
  });

  it("deleteCourseAssignmentAction revalidates /program-head and /dean course-assignment routes", async () => {
    await deleteCourseAssignmentAction({
      assignmentId: ASSIGNMENT_ID,
      programId: PROGRAM_ID,
      confirmationLabel: "assignment label",
      revision: "2026-07-21T00:00:00.000Z",
      membershipCount: 0,
      activeMembershipCount: 0,
      removedMembershipCount: 0,
    });

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
  });

  it("bulkCreateCourseAssignmentsAction revalidates /program-head and /dean course-assignment routes", async () => {
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

    expect(revalidatePathSpy).toHaveBeenCalledWith(
      `/program-head/programs/${PROGRAM_ID}/course-assignments`
    );
    expect(revalidatePathSpy).toHaveBeenCalledWith("/dean/academic-structure/course-assignments");
  });
});

describe("course-assignment actions do not revalidate when the underlying operation fails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createCourseAssignmentAction does not revalidate on failure", async () => {
    vi.mocked(createCourseAssignment).mockResolvedValueOnce({
      success: false,
      error: "Course is outside your program scope.",
    });

    const result = await createCourseAssignmentAction({
      termInstanceId: TERM_ID,
      facultyId: FACULTY_ID,
      courseId: COURSE_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(result.success).toBe(false);
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });

  it("updateCourseAssignmentAction does not revalidate on failure", async () => {
    vi.mocked(updateCourseAssignment).mockResolvedValueOnce({
      success: false,
      error: "Assignment not found.",
    });

    const result = await updateCourseAssignmentAction({
      assignmentId: ASSIGNMENT_ID,
      programId: PROGRAM_ID,
      yearLevel: YearLevel.FIRST_YEAR,
      section: StudentSection.MORNING,
    });

    expect(result.success).toBe(false);
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });

  it("deactivateCourseAssignmentAction does not revalidate on failure", async () => {
    vi.mocked(deactivateCourseAssignment).mockResolvedValueOnce({
      success: false,
      error: "Insufficient permissions.",
    });

    const result = await deactivateCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID });

    expect(result.success).toBe(false);
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });

  it("activateCourseAssignmentAction does not revalidate on failure", async () => {
    vi.mocked(activateCourseAssignment).mockResolvedValueOnce({
      success: false,
      error: "Insufficient permissions.",
    });

    const result = await activateCourseAssignmentAction({ assignmentId: ASSIGNMENT_ID });

    expect(result.success).toBe(false);
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });

  it("deleteCourseAssignmentAction does not revalidate on failure", async () => {
    vi.mocked(deleteCourseAssignment).mockResolvedValueOnce({
      success: false,
      error: "Cannot delete assignment because it has published course-bound evaluations.",
    });

    const result = await deleteCourseAssignmentAction({
      assignmentId: ASSIGNMENT_ID,
      confirmationLabel: "assignment label",
      revision: "2026-07-21T00:00:00.000Z",
      membershipCount: 0,
      activeMembershipCount: 0,
      removedMembershipCount: 0,
    });

    expect(result.success).toBe(false);
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });

  it("bulkCreateCourseAssignmentsAction does not revalidate on total failure", async () => {
    vi.mocked(bulkCreateCourseAssignments).mockResolvedValueOnce({
      success: false,
      created: 0,
      errors: [{ index: 0, error: "Course not found." }],
    });

    const result = await bulkCreateCourseAssignmentsAction({
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

    expect(result.success).toBe(false);
    expect(revalidatePathSpy).not.toHaveBeenCalled();
  });
});
