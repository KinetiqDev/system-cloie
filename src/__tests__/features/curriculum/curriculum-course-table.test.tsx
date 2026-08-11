import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const addCourseMock = vi.hoisted(() => vi.fn());
const removeCourseMock = vi.hoisted(() => vi.fn());
const updateCourseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/curriculum-actions", () => ({
  addCurriculumCourseAction: addCourseMock,
  removeCurriculumCourseAction: removeCourseMock,
  updateCurriculumCourseAction: updateCourseMock,
}));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

import { CurriculumCourseTable } from "@/features/curriculum/components/curriculum-course-table";
import type {
  CurriculumCourseOption,
  CurriculumVersionDetail,
} from "@/features/curriculum/types";

const COURSE_OPTIONS: CurriculumCourseOption[] = [
  { id: "course-1", code: "CS-101", title: "Intro to Computing", programId: "prog-1" },
  { id: "course-2", code: "MATH-101", title: "College Algebra", programId: null },
  { id: "course-3", code: "BSBA-101", title: "Business Fundamentals", programId: "prog-2" },
];

function makeVersion(
  overrides: Partial<CurriculumVersionDetail> = {}
): CurriculumVersionDetail {
  return {
    id: "version-1",
    programId: "prog-1",
    majorId: null,
    code: "BSIT-2030",
    name: "2030 Curriculum",
    status: "DRAFT",
    effectiveFromSchoolYearId: null,
    publishedAt: null,
    publishedBy: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    program: { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
    major: null,
    courses: [
      {
        id: "cc-1",
        curriculumVersionId: "version-1",
        courseId: "course-1",
        yearLevel: "FIRST_YEAR",
        semester: "FIRST",
        term: "FIRST_TERM",
        courseCodeSnapshot: "CS-101",
        courseTitleSnapshot: "Intro to Computing",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "cc-2",
        curriculumVersionId: "version-1",
        courseId: "course-2",
        yearLevel: "SECOND_YEAR",
        semester: "SECOND",
        term: "SECOND_TERM",
        courseCodeSnapshot: "MATH-101",
        courseTitleSnapshot: "College Algebra",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ],
    ...overrides,
  };
}

describe("CurriculumCourseTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addCourseMock.mockResolvedValue({ success: true, data: { id: "cc-3" } });
    removeCourseMock.mockResolvedValue({ success: true, data: { id: "cc-1" } });
  });

  it("renders snapshot code and title with placement columns", () => {
    render(
      <CurriculumCourseTable version={makeVersion()} courses={COURSE_OPTIONS} onChanged={() => {}} />
    );

    expect(screen.getByText("CS-101")).toBeInTheDocument();
    expect(screen.getByText("Intro to Computing")).toBeInTheDocument();
    expect(screen.getByText("1st Year")).toBeInTheDocument();
    expect(screen.getByText("1st Semester")).toBeInTheDocument();
    expect(screen.getByText("1st Term")).toBeInTheDocument();
  });

  it("shows Add Course and remove buttons on DRAFT versions", () => {
    render(
      <CurriculumCourseTable version={makeVersion()} courses={COURSE_OPTIONS} onChanged={() => {}} />
    );

    expect(screen.getByRole("button", { name: "Add Course" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit CS-101 placement" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove CS-101" })).toBeInTheDocument();
  });

  it("hides add, edit, and remove buttons on PUBLISHED versions", () => {
    render(
      <CurriculumCourseTable
        version={makeVersion({ status: "PUBLISHED" })}
        courses={COURSE_OPTIONS}
        onChanged={() => {}}
      />
    );

    expect(screen.queryByRole("button", { name: "Add Course" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit .* placement/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument();
  });

  it("edits a DRAFT placement through the update action and preserves snapshots", async () => {
    updateCourseMock.mockResolvedValue({ success: true, data: { id: "cc-1" } });
    render(
      <CurriculumCourseTable version={makeVersion()} courses={COURSE_OPTIONS} onChanged={() => {}} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit CS-101 placement" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Course Placement")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/The approved course code and title snapshots stay unchanged/)
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Save Placement" }));

    await waitFor(() =>
      expect(updateCourseMock).toHaveBeenCalledWith("cc-1", {
        yearLevel: "FIRST_YEAR",
        semester: "FIRST",
        term: "FIRST_TERM",
      })
    );
  });

  it("surfaces a placement update failure inside the dialog", async () => {
    updateCourseMock.mockResolvedValue({ success: false, error: "Published curricula are immutable" });
    render(
      <CurriculumCourseTable version={makeVersion()} courses={COURSE_OPTIONS} onChanged={() => {}} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit CS-101 placement" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Placement" }));

    await waitFor(() =>
      expect(within(dialog).getByText("Published curricula are immutable")).toBeInTheDocument()
    );
  });

  it("renders an empty state when a DRAFT has no courses", () => {
    render(
      <CurriculumCourseTable
        version={makeVersion({ courses: [] })}
        courses={COURSE_OPTIONS}
        onChanged={() => {}}
      />
    );

    expect(screen.getByText("No courses yet")).toBeInTheDocument();
  });

  it("adds a selected course through the search dialog on DRAFT", async () => {
    const onChanged = vi.fn();
    render(
      <CurriculumCourseTable
        version={makeVersion({ courses: [] })}
        courses={COURSE_OPTIONS}
        onChanged={onChanged}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    const searchInput = await screen.findByLabelText("Search Courses");
    fireEvent.change(searchInput, { target: { value: "MATH" } });

    const option = await screen.findByRole("button", { name: /College Algebra/ });
    fireEvent.click(option);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Course" }));

    await waitFor(() => expect(addCourseMock).toHaveBeenCalledTimes(1));
    expect(addCourseMock).toHaveBeenCalledWith({
      curriculumVersionId: "version-1",
      courseId: "course-2",
      yearLevel: "FIRST_YEAR",
      semester: "FIRST",
      term: "FIRST_TERM",
    });
    expect(onChanged).toHaveBeenCalled();
  });

  it("removes a course after confirmation on DRAFT", async () => {
    const onChanged = vi.fn();
    render(
      <CurriculumCourseTable version={makeVersion()} courses={COURSE_OPTIONS} onChanged={onChanged} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove CS-101" }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove Course" }));

    await waitFor(() => expect(removeCourseMock).toHaveBeenCalledWith("cc-1"));
    expect(onChanged).toHaveBeenCalled();
  });

  it("clears a failed add error when the dialog is reopened", async () => {
    addCourseMock.mockResolvedValue({ success: false, error: "Published curricula are immutable" });
    render(
      <CurriculumCourseTable
        version={makeVersion({ courses: [] })}
        courses={COURSE_OPTIONS}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    fireEvent.click(await screen.findByRole("button", { name: /Intro to Computing/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Add Course" }));

    expect(await screen.findByText("Published curricula are immutable")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));

    expect(screen.queryByText("Published curricula are immutable")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Intro to Computing/ })).not.toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("offers only same-program and General Education courses in the add dialog", async () => {
    render(
      <CurriculumCourseTable
        version={makeVersion({ courses: [] })}
        courses={COURSE_OPTIONS}
        onChanged={() => {}}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Course" }));
    await screen.findByLabelText("Search Courses");

    expect(screen.getByRole("button", { name: /Intro to Computing/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /College Algebra/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Business Fundamentals/ })).not.toBeInTheDocument();
  });

  it("sorts courses when a column header is clicked", () => {
    render(
      <CurriculumCourseTable version={makeVersion()} courses={COURSE_OPTIONS} onChanged={() => {}} />
    );

    const rows = () =>
      screen.getAllByRole("row").map((row) => row.textContent?.replaceAll(/\s+/g, " "));

    const before = rows();
    fireEvent.click(screen.getByRole("button", { name: /Title/ }));
    const after = rows();

    expect(after).not.toEqual(before);
  });
});
