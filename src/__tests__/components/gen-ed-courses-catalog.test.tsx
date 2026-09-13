import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type {
  GenEdCourseItem,
  GenEdCoursesSummary,
} from "@/features/academic-structure/services/resolve-gen-ed-courses";
import { AcademicSemester, AcademicTerm, CourseScope, YearLevel } from "@prisma/client";

import { GenEdCoursesCatalog } from "@/features/academic-structure/components/gen-ed-courses-catalog";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/actions/gen-ed-course-actions", () => ({
  createGenEdCourseAction: vi.fn(),
  updateGenEdCourseAction: vi.fn(),
  setGenEdCourseActiveAction: vi.fn().mockResolvedValue({ success: true }),
  bulkSetGenEdCoursesActiveAction: vi.fn().mockResolvedValue({ succeeded: ["c-1"], failed: [] }),
}));

function course(overrides: Partial<GenEdCourseItem> = {}): GenEdCourseItem {
  return {
    id: "c-1",
    code: "GEMATH",
    title: "Mathematics in the Modern World",
    course_scope: CourseScope.GENERAL_EDUCATION,
    program_id: null,
    major_id: null,
    default_year_level: null,
    default_semester: null,
    default_term: null,
    is_active: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-05"),
    _count: { cilos: 0 },
    ...overrides,
  };
}

function sampleCourses(): GenEdCourseItem[] {
  return [
    course({ id: "c-1", code: "GEMATH", title: "Math", is_active: true }),
    course({ id: "c-2", code: "GEUS", title: "Understanding the Self", is_active: false }),
    course({ id: "c-3", code: "GENAT", title: "Science", is_active: true }),
  ];
}

function renderCatalog(courses: GenEdCourseItem[] = sampleCourses()) {
  render(<GenEdCoursesCatalog courses={courses} summary={summary} />);
}

const summary: GenEdCoursesSummary = { total: 3, active: 2, archived: 1 };

let matchMediaOrig: typeof window.matchMedia | undefined;

function stubMatchMedia() {
  matchMediaOrig = window.matchMedia;
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((q: string) => ({
      matches: false,
      media: q,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function restoreMatchMedia() {
  if (matchMediaOrig) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: matchMediaOrig,
    });
  } else {
    delete (window as unknown as Record<string, unknown>).matchMedia;
  }
}

describe("GenEdCoursesCatalog", () => {
  it("shows empty state when no courses match", () => {
    render(<GenEdCoursesCatalog courses={[]} summary={{ total: 0, active: 0, archived: 0 }} />);
    expect(screen.getByText("No courses found.")).toBeInTheDocument();
  });

  it("renders stats with Total/Active/Archived and table columns Course / Status / Last Updated", () => {
    render(
      <GenEdCoursesCatalog
        courses={[course(), course({ id: "c-2", code: "GEUS", title: "Understanding the Self" })]}
        summary={summary}
      />
    );

    expect(screen.getByText("Total Courses")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("College-Wide")).toBeInTheDocument();
    expect(screen.getAllByText("Active").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("GEMATH")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Course" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Course" })).toBeInTheDocument();
  });

  it("filters by search code/title", () => {
    renderCatalog();

    const search = screen.getByPlaceholderText("Search by code or title...");
    fireEvent.change(search, { target: { value: "GEUS" } });
    expect(screen.getByText("GEUS")).toBeInTheDocument();
    expect(screen.queryByText("GEMATH")).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getByText("GEMATH")).toBeInTheDocument();
  });

  it("filters by status via Select — Archived shows only archived", async () => {
    renderCatalog();

    const trigger = screen.getByRole("combobox", { name: /filter by course status/i });
    fireEvent.click(trigger);
    const archivedOption = await screen.findByRole("option", { name: "Archived" });
    fireEvent.mouseMove(archivedOption);
    fireEvent.click(archivedOption);
    expect(screen.getByText("GEUS")).toBeInTheDocument();
    expect(screen.queryByText("GEMATH")).not.toBeInTheDocument();
    expect(screen.queryByText("GENAT")).not.toBeInTheDocument();
  });
  it("filters by year level via Select", async () => {
    renderCatalog([
      course({
        id: "c-1",
        code: "GEMATH",
        title: "Math",
        default_year_level: YearLevel.FIRST_YEAR,
      }),
      course({
        id: "c-2",
        code: "GEUS",
        title: "Understanding the Self",
        default_year_level: YearLevel.SECOND_YEAR,
      }),
    ]);

    const trigger = screen.getByRole("combobox", { name: /filter by year level/i });
    fireEvent.click(trigger);
    const firstYear = await screen.findByRole("option", { name: "1st Year" });
    fireEvent.mouseMove(firstYear);
    fireEvent.click(firstYear);
    expect(screen.getByText("GEMATH")).toBeInTheDocument();
    expect(screen.queryByText("GEUS")).not.toBeInTheDocument();
  });

  it("selecting Summer clears the term filter because Summer has no terms", async () => {
    renderCatalog([
      course({
        id: "c-1",
        code: "GESUM",
        title: "Summer Course",
        default_semester: AcademicSemester.SUMMER,
        default_term: null,
      }),
      course({
        id: "c-2",
        code: "GEFIRST",
        title: "First Term Course",
        default_semester: AcademicSemester.FIRST,
        default_term: AcademicTerm.FIRST_TERM,
      }),
    ]);

    const termTrigger = screen.getByRole("combobox", { name: /filter by term/i });
    fireEvent.click(termTrigger);
    const firstTerm = await screen.findByRole("option", { name: "1st Term" });
    fireEvent.mouseMove(firstTerm);
    fireEvent.click(firstTerm);
    expect(screen.getByText("GEFIRST")).toBeInTheDocument();
    expect(screen.queryByText("GESUM")).not.toBeInTheDocument();

    const semesterTrigger = screen.getByRole("combobox", { name: /filter by semester/i });
    fireEvent.click(semesterTrigger);
    const summer = await screen.findByRole("option", { name: "Summer" });
    fireEvent.mouseMove(summer);
    fireEvent.click(summer);
    expect(screen.getByText("GESUM")).toBeInTheDocument();
    expect(screen.queryByText("GEFIRST")).not.toBeInTheDocument();
    expect(screen.getByText("Summer semester has no terms")).toBeInTheDocument();
  });

  it("paginates at PAGE_SIZE=15 and navigates to page 2", () => {
    stubMatchMedia();
    try {
      const many = Array.from({ length: 16 }, (_, i) =>
        course({ id: `c-${i}`, code: `GE${String(i).padStart(2, "0")}`, title: `Course ${i}` })
      );
      render(
        <GenEdCoursesCatalog courses={many} summary={{ total: 16, active: 16, archived: 0 }} />
      );

      expect(screen.getByText(/1–15 of 16/)).toBeInTheDocument();
      expect(screen.queryByText("GE15")).not.toBeInTheDocument();

      const nextBtn = screen.getByRole("button", { name: /next/i });
      fireEvent.click(nextBtn);
      expect(screen.getByText("GE15")).toBeInTheDocument();
      expect(screen.getByText(/16–16 of 16/)).toBeInTheDocument();
    } finally {
      restoreMatchMedia();
    }
  });

  it("offers fixed-scope CRUD and page-bound bulk actions", () => {
    render(<GenEdCoursesCatalog courses={[course()]} summary={summary} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select GEMATH" }));
    expect(screen.getByText("1 course selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit GEMATH" }));
    expect(screen.getByText("Edit General Education Course")).toBeInTheDocument();
    expect(screen.queryByLabelText("Course Scope")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Program")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Major")).not.toBeInTheDocument();
  });
});
