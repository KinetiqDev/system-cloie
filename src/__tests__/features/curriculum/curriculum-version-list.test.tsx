import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publishMock = vi.hoisted(() => vi.fn());
const retireMock = vi.hoisted(() => vi.fn());
const cloneMock = vi.hoisted(() => vi.fn());
const detailMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/actions/curriculum-actions", () => ({
  publishCurriculumVersionAction: publishMock,
  retireCurriculumVersionAction: retireMock,
  cloneCurriculumVersionAction: cloneMock,
  getCurriculumVersionDetailAction: detailMock,
}));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

import { CurriculumVersionList } from "@/features/curriculum/components/curriculum-version-list";
import type {
  CurriculumCourseOption,
  CurriculumPageProgram,
  CurriculumVersionSummaryItem,
  SchoolYearOption,
} from "@/features/curriculum/types";

const PROGRAMS: CurriculumPageProgram[] = [
  { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
];

const COURSES: CurriculumCourseOption[] = [
  { id: "course-1", code: "CS-101", title: "Intro to Computing", programId: "prog-1" },
];

const SCHOOL_YEARS: SchoolYearOption[] = [{ id: "year-1", code: "2025-2026" }];

function makeVersion(
  overrides: Partial<CurriculumVersionSummaryItem> = {}
): CurriculumVersionSummaryItem {
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
    courseCount: 2,
    ...overrides,
  };
}

const DRAFT = makeVersion();
const PUBLISHED = makeVersion({ id: "version-2", code: "BSIT-2025", status: "PUBLISHED" });
const RETIRED = makeVersion({ id: "version-3", code: "BSIT-2020", status: "RETIRED" });

describe("CurriculumVersionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publishMock.mockResolvedValue({ success: true, data: { id: "version-1", status: "PUBLISHED" } });
    retireMock.mockResolvedValue({ success: true, data: { id: "version-2", status: "RETIRED" } });
    cloneMock.mockResolvedValue({ success: true, data: { id: "version-4", code: "BSIT-2030-COPY" } });
    detailMock.mockResolvedValue({ success: true, data: null });
  });

  it("shows the DRAFT tab by default with DRAFT versions", () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[DRAFT, PUBLISHED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    expect(screen.getByText("BSIT-2030")).toBeInTheDocument();
    expect(screen.queryByText("BSIT-2025")).not.toBeInTheDocument();
  });

  it("switches tabs to show PUBLISHED versions", () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[DRAFT, PUBLISHED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    expect(screen.getByText("BSIT-2025")).toBeInTheDocument();
    expect(screen.queryByText("BSIT-2030")).not.toBeInTheDocument();
  });

  it("shows a Publish button on DRAFT versions and no Retire/Clone", () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[DRAFT]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clone" })).not.toBeInTheDocument();
  });

  it("shows Retire and Clone on PUBLISHED versions, no Publish", () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[PUBLISHED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));

    expect(screen.getByRole("button", { name: "Retire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("shows only Clone on RETIRED versions", () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[RETIRED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /RETIRED/ }));

    expect(screen.getByRole("button", { name: "Clone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("publishes a DRAFT version after confirmation", async () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[DRAFT]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(publishMock).toHaveBeenCalledWith("version-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("retires a PUBLISHED version after confirmation", async () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[PUBLISHED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    fireEvent.click(screen.getByRole("button", { name: "Retire" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retire" }));

    await waitFor(() => expect(retireMock).toHaveBeenCalledWith("version-2"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("clones a PUBLISHED version into a new DRAFT", async () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[PUBLISHED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clone" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Clone" }));

    await waitFor(() => expect(cloneMock).toHaveBeenCalledWith("version-2"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("renders the empty state when a program has no curricula", () => {
    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    expect(screen.getByText("No curricula yet")).toBeInTheDocument();
  });

  it("ignores out-of-order detail responses when a version is reselected", async () => {
    let resolveFirst: ((value: unknown) => void) | undefined;
    const firstPromise = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    const publishedDetail = {
      id: "version-2",
      programId: "prog-1",
      majorId: null,
      code: "BSIT-2025",
      name: null,
      status: "PUBLISHED",
      effectiveFromSchoolYearId: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      program: { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
      major: null,
      courses: [
        {
          id: "cc-2",
          curriculumVersionId: "version-2",
          courseId: "course-2",
          yearLevel: "FIRST_YEAR",
          semester: "FIRST",
          term: "FIRST_TERM",
          courseCodeSnapshot: "MATH-101",
          courseTitleSnapshot: "College Algebra",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ],
    };
    detailMock
      .mockImplementationOnce(() => firstPromise)
      .mockResolvedValueOnce({ success: true, data: publishedDetail });

    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[DRAFT, PUBLISHED]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByText("BSIT-2030"));
    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    fireEvent.click(screen.getByText("BSIT-2025"));

    resolveFirst?.({ success: true, data: publishedDetail });

    await waitFor(() => expect(screen.getByText("BSIT-2025 — Courses")).toBeInTheDocument());
    expect(screen.getByText("MATH-101")).toBeInTheDocument();
    expect(screen.queryByText("Intro to Computing")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Course" })).not.toBeInTheDocument();
  });

  it("loads course detail when a version is selected", async () => {
    detailMock.mockResolvedValue({
      success: true,
      data: {
        id: "version-1",
        programId: "prog-1",
        majorId: null,
        code: "BSIT-2030",
        name: null,
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
        ],
      },
    });

    render(
      <CurriculumVersionList
        programs={PROGRAMS}
        curricula={[DRAFT]}
        courses={COURSES}
        schoolYears={SCHOOL_YEARS}
      />
    );

    fireEvent.click(screen.getByText("BSIT-2030"));

    await waitFor(() => expect(detailMock).toHaveBeenCalledWith("version-1"));
    expect(await screen.findByText("CS-101")).toBeInTheDocument();
  });
});
