import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publishMock = vi.hoisted(() => vi.fn());
const retireMock = vi.hoisted(() => vi.fn());
const cloneMock = vi.hoisted(() => vi.fn());
const createVersionMock = vi.hoisted(() => vi.fn());
const updateVersionMock = vi.hoisted(() => vi.fn());
const detailMock = vi.hoisted(() => vi.fn());
const curriculaSummaryMock = vi.hoisted(() => vi.fn());
const courseOptionsMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/actions/curriculum-actions", () => ({
  publishCurriculumVersionAction: publishMock,
  retireCurriculumVersionAction: retireMock,
  cloneCurriculumVersionAction: cloneMock,
  createCurriculumVersionAction: createVersionMock,
  updateCurriculumVersionAction: updateVersionMock,
  getCurriculumVersionDetailAction: detailMock,
  listProgramCurriculaSummaryAction: curriculaSummaryMock,
  listProgramCourseOptionsAction: courseOptionsMock,
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
    createVersionMock.mockResolvedValue({ success: true, data: { id: "version-5" } });
    detailMock.mockResolvedValue({ success: true, data: null });
    curriculaSummaryMock.mockResolvedValue({ success: true, data: [] });
    courseOptionsMock.mockResolvedValue({ success: true, data: COURSES });
  });

  function renderList(curricula: CurriculumVersionSummaryItem[], defaultProgramId?: string) {
    curriculaSummaryMock.mockResolvedValue({ success: true, data: curricula });
    return render(
      <CurriculumVersionList
        programs={PROGRAMS}
        schoolYears={SCHOOL_YEARS}
        defaultProgramId={defaultProgramId}
      />
    );
  }

  async function renderLoaded(
    curricula: CurriculumVersionSummaryItem[],
    defaultProgramId?: string
  ) {
    renderList(curricula, defaultProgramId);
    if (curricula.length > 0) {
      await screen.findByRole("tablist");
    } else {
      await screen.findByText("No curricula yet");
    }
  }

  it("shows the DRAFT tab by default with DRAFT versions", async () => {
    await renderLoaded([DRAFT, PUBLISHED]);

    expect(screen.getByText("BSIT-2030")).toBeInTheDocument();
    expect(screen.queryByText("BSIT-2025")).not.toBeInTheDocument();
  });

  it("switches tabs to show PUBLISHED versions", async () => {
    await renderLoaded([DRAFT, PUBLISHED]);

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    expect(screen.getByText("BSIT-2025")).toBeInTheDocument();
    expect(screen.queryByText("BSIT-2030")).not.toBeInTheDocument();
  });

  it.each(["PUBLISHED", "RETIRED"] as const)(
    "clears the selected DRAFT detail when switching to the %s tab",
    async (targetTab) => {
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

      await renderLoaded([DRAFT, PUBLISHED, RETIRED]);

      fireEvent.click(screen.getByText("BSIT-2030"));
      await screen.findByText("CS-101");
      expect(screen.getByRole("button", { name: "Add Course" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: new RegExp(targetTab) }));

      expect(screen.queryByRole("button", { name: "Add Course" })).not.toBeInTheDocument();
      expect(screen.queryByText("BSIT-2030 — Courses")).not.toBeInTheDocument();
    }
  );

  it("shows a Publish button on DRAFT versions and no Retire/Clone", async () => {
    await renderLoaded([DRAFT]);

    expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clone" })).not.toBeInTheDocument();
  });

  it("shows an Edit button on DRAFT versions only", async () => {
    await renderLoaded([DRAFT, PUBLISHED, RETIRED]);

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /RETIRED/ }));
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("edits a DRAFT version's metadata through the update action", async () => {
    updateVersionMock.mockResolvedValue({ success: true, data: { id: "version-1" } });
    await renderLoaded([DRAFT]);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Edit Curriculum Version")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Code")).toHaveValue("BSIT-2030");

    fireEvent.change(within(dialog).getByLabelText("Code"), {
      target: { value: "BSIT-2031" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(updateVersionMock).toHaveBeenCalledWith("version-1", {
        code: "BSIT-2031",
        name: "2030 Curriculum",
        effectiveFromSchoolYearId: null,
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("surfaces an edit failure inside the dialog", async () => {
    updateVersionMock.mockResolvedValue({
      success: false,
      error: 'A curriculum with code "BSIT-2026" already exists for this program',
    });
    await renderLoaded([DRAFT]);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Code"), {
      target: { value: "BSIT-2026" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

    await waitFor(() =>
      expect(
        within(dialog).getByText('A curriculum with code "BSIT-2026" already exists for this program')
      ).toBeInTheDocument()
    );
  });

  it("shows Retire and Clone on PUBLISHED versions, no Publish", async () => {
    await renderLoaded([PUBLISHED]);

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));

    expect(screen.getByRole("button", { name: "Retire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("shows only Clone on RETIRED versions", async () => {
    await renderLoaded([RETIRED]);

    fireEvent.click(screen.getByRole("tab", { name: /RETIRED/ }));

    expect(screen.getByRole("button", { name: "Clone" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  });

  it("publishes a DRAFT version after confirmation", async () => {
    await renderLoaded([DRAFT]);

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(publishMock).toHaveBeenCalledWith("version-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("retires a PUBLISHED version after confirmation", async () => {
    await renderLoaded([PUBLISHED]);

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    fireEvent.click(screen.getByRole("button", { name: "Retire" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Retire" }));

    await waitFor(() => expect(retireMock).toHaveBeenCalledWith("version-2"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("clones a PUBLISHED version into a new DRAFT", async () => {
    await renderLoaded([PUBLISHED]);

    fireEvent.click(screen.getByRole("tab", { name: /PUBLISHED/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clone" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Clone" }));

    await waitFor(() => expect(cloneMock).toHaveBeenCalledWith("version-2"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("renders the empty state when a program has no curricula", async () => {
    await renderLoaded([]);

    expect(screen.getByText("No curricula yet")).toBeInTheDocument();
  });

  it("renders the empty state when no programs exist", () => {
    render(<CurriculumVersionList programs={[]} schoolYears={SCHOOL_YEARS} />);

    expect(screen.getByText("No curricula yet")).toBeInTheDocument();
    expect(curriculaSummaryMock).not.toHaveBeenCalled();
  });

  it("ignores a stale curricula response when the program changes", async () => {
    const PROGRAMS_TWO = [
      { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
      { id: "prog-2", code: "BSED", name: "BS Education" },
    ];
    let resolveProgOne: ((value: unknown) => void) | undefined;
    const progOnePromise = new Promise((resolve) => {
      resolveProgOne = resolve;
    });
    curriculaSummaryMock
      .mockImplementationOnce(() => progOnePromise)
      .mockResolvedValueOnce({ success: true, data: [] });

    render(<CurriculumVersionList programs={PROGRAMS_TWO} schoolYears={SCHOOL_YEARS} />);
    await screen.findByRole("combobox");

    fireEvent.click(screen.getByRole("combobox"));
    const bsOption = await screen.findByRole("option", { name: /BSED/ });
    fireEvent.focus(bsOption);
    fireEvent.keyDown(bsOption, { key: "Enter" });
    fireEvent.keyUp(bsOption, { key: "Enter" });

    await waitFor(() => expect(curriculaSummaryMock.mock.calls.length).toBeGreaterThan(1));
    resolveProgOne?.({ success: true, data: [DRAFT] });

    await waitFor(() => expect(screen.queryByText("BSIT-2030")).not.toBeInTheDocument());
    expect(screen.getByText("No curricula yet")).toBeInTheDocument();
  });

  it("loads fresh course options for the newly selected program", async () => {
    const PROGRAMS_TWO = [
      { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
      { id: "prog-2", code: "BSED", name: "BS Education" },
    ];
    const PROG2_DRAFT = makeVersion({
      id: "version-9",
      programId: "prog-2",
      code: "BSED-2030",
    });
    curriculaSummaryMock
      .mockResolvedValueOnce({ success: true, data: [DRAFT] })
      .mockResolvedValue({ success: true, data: [PROG2_DRAFT] });
    courseOptionsMock.mockResolvedValue({ success: true, data: COURSES });
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
        courses: [],
      },
    });

    render(<CurriculumVersionList programs={PROGRAMS_TWO} schoolYears={SCHOOL_YEARS} />);

    fireEvent.click(await screen.findByText("BSIT-2030"));
    await waitFor(() => expect(courseOptionsMock).toHaveBeenCalledWith("prog-1"));

    fireEvent.click(screen.getByRole("combobox"));
    const bsOption = await screen.findByRole("option", { name: /BSED/ });
    fireEvent.focus(bsOption);
    fireEvent.keyDown(bsOption, { key: "Enter" });
    fireEvent.keyUp(bsOption, { key: "Enter" });

    fireEvent.click(await screen.findByText("BSED-2030"));
    await waitFor(() => expect(courseOptionsMock).toHaveBeenCalledWith("prog-2"));
  });

  it("recovers from a rejected curricula load with an inline retry", async () => {
    curriculaSummaryMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ success: true, data: [DRAFT] });

    render(<CurriculumVersionList programs={PROGRAMS} schoolYears={SCHOOL_YEARS} />);

    const errorText = await screen.findByText("Unable to load curricula. Please try again.");
    expect(errorText).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("BSIT-2030")).toBeInTheDocument();
    expect(screen.queryByText("Unable to load curricula. Please try again.")).not.toBeInTheDocument();
  });

  it("recovers from a rejected version detail load", async () => {
    detailMock.mockRejectedValueOnce(new Error("network"));
    await renderLoaded([DRAFT]);

    fireEvent.click(screen.getByText("BSIT-2030"));

    expect(
      await screen.findByText("Unable to load the curriculum. Please try again.")
    ).toBeInTheDocument();

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
        courses: [],
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(screen.queryByText("Unable to load the curriculum. Please try again.")).not.toBeInTheDocument()
    );
    expect(detailMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("surfaces a safe failure when course options fail to load", async () => {
    courseOptionsMock.mockRejectedValueOnce(new Error("network"));
    await renderLoaded([DRAFT]);

    fireEvent.click(screen.getByText("BSIT-2030"));

    expect(await screen.findByText("Unable to load courses. Please try again.")).toBeInTheDocument();
  });

  it("fetches curricula for the selected program on demand", async () => {
    await renderLoaded([DRAFT]);

    expect(curriculaSummaryMock).toHaveBeenCalledWith("prog-1");
    expect(screen.getByText("BSIT-2030")).toBeInTheDocument();
  });

  it("refetches curricula after a lifecycle mutation", async () => {
    publishMock.mockResolvedValue({
      success: true,
      data: { id: "version-1", status: "PUBLISHED" },
    });

    curriculaSummaryMock.mockResolvedValue({ success: true, data: [DRAFT] });
    render(
      <CurriculumVersionList programs={PROGRAMS} schoolYears={SCHOOL_YEARS} />
    );
    await screen.findByRole("button", { name: "Publish" });
    const callsBefore = curriculaSummaryMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }));

    await waitFor(() => expect(curriculaSummaryMock.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(curriculaSummaryMock).toHaveBeenCalledWith("prog-1");
  });

  it("refetches curricula after creating a version", async () => {
    createVersionMock.mockResolvedValue({ success: true, data: { id: "version-5" } });

    curriculaSummaryMock.mockResolvedValue({ success: true, data: [] });
    render(
      <CurriculumVersionList programs={PROGRAMS} schoolYears={SCHOOL_YEARS} />
    );
    await screen.findByText("No curricula yet");
    const callsBefore = curriculaSummaryMock.mock.calls.length;

    fireEvent.click(screen.getAllByRole("button", { name: "Create Curriculum Version" })[0]);
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Code"), {
      target: { value: "BSIT-2040" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Draft" }));

    await waitFor(() => expect(curriculaSummaryMock.mock.calls.length).toBeGreaterThan(callsBefore));
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

    await renderLoaded([DRAFT, PUBLISHED]);

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

    await renderLoaded([DRAFT]);

    fireEvent.click(screen.getByText("BSIT-2030"));

    await waitFor(() => expect(detailMock).toHaveBeenCalledWith("version-1"));
    expect(await screen.findByText("CS-101")).toBeInTheDocument();
  });

  it("does not let a delayed curricula refresh clobber the newly selected program", async () => {
    const PROGRAMS_TWO = [
      { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
      { id: "prog-2", code: "BSED", name: "BS Education" },
    ];
    const PROG2_DRAFT = makeVersion({
      id: "version-9",
      programId: "prog-2",
      code: "BSED-2030",
    });
    let resolveRefresh: ((value: unknown) => void) | undefined;
    const refreshPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    // Initial mount load resolves with prog-1 data; the post-create refresh
    // (for prog-1) stays deferred; prog-2 loads immediately.
    curriculaSummaryMock
      .mockResolvedValueOnce({ success: true, data: [DRAFT] })
      .mockImplementationOnce(() => refreshPromise)
      .mockResolvedValue({ success: true, data: [PROG2_DRAFT] });

    render(<CurriculumVersionList programs={PROGRAMS_TWO} schoolYears={SCHOOL_YEARS} />);
    await screen.findByRole("tablist");

    fireEvent.click(screen.getByRole("button", { name: "Create Curriculum Version" }));
    const createDialog = await screen.findByRole("dialog");
    fireEvent.change(within(createDialog).getByLabelText("Code"), {
      target: { value: "BSIT-2040" },
    });
    fireEvent.click(within(createDialog).getByRole("button", { name: "Create Draft" }));

    await waitFor(() => expect(curriculaSummaryMock.mock.calls.length).toBeGreaterThan(1));

    fireEvent.click(screen.getByRole("combobox"));
    const bsOption = await screen.findByRole("option", { name: /BSED/ });
    fireEvent.focus(bsOption);
    fireEvent.keyDown(bsOption, { key: "Enter" });
    fireEvent.keyUp(bsOption, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("BSED-2030")).toBeInTheDocument());

    resolveRefresh?.({ success: true, data: [DRAFT] });

    await waitFor(() => expect(screen.queryByText("BSIT-2030")).not.toBeInTheDocument());
    expect(screen.getByText("BSED-2030")).toBeInTheDocument();
  });

  it("does not let a delayed detail refresh clobber a newly selected version", async () => {
    const PROGRAMS_TWO = [
      { id: "prog-1", code: "BSIT", name: "BS Information Technology" },
      { id: "prog-2", code: "BSED", name: "BS Education" },
    ];
    const PROG2_DRAFT = makeVersion({
      id: "version-9",
      programId: "prog-2",
      code: "BSED-2030",
    });
    let resolveDetail: ((value: unknown) => void) | undefined;
    const detailPromise = new Promise((resolve) => {
      resolveDetail = resolve;
    });
    const prog1Detail = {
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
    };
    const prog2Detail = {
      id: "version-9",
      programId: "prog-2",
      majorId: null,
      code: "BSED-2030",
      name: null,
      status: "DRAFT",
      effectiveFromSchoolYearId: null,
      publishedAt: null,
      publishedBy: null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      program: { id: "prog-2", code: "BSED", name: "BS Education" },
      major: null,
      courses: [],
    };
    publishMock.mockResolvedValue({ success: true, data: { id: "version-1", status: "PUBLISHED" } });
    detailMock.mockImplementationOnce(() => detailPromise).mockResolvedValue({
      success: true,
      data: prog2Detail,
    });
    curriculaSummaryMock
      .mockResolvedValueOnce({ success: true, data: [DRAFT] })
      .mockResolvedValue({ success: true, data: [PROG2_DRAFT] });

    render(<CurriculumVersionList programs={PROGRAMS_TWO} schoolYears={SCHOOL_YEARS} />);
    await screen.findByRole("tablist");

    fireEvent.click(screen.getByText("BSIT-2030"));

    fireEvent.click(screen.getByRole("combobox"));
    const bsOption = await screen.findByRole("option", { name: /BSED/ });
    fireEvent.focus(bsOption);
    fireEvent.keyDown(bsOption, { key: "Enter" });
    fireEvent.keyUp(bsOption, { key: "Enter" });

    await waitFor(() => expect(screen.getByText("BSED-2030")).toBeInTheDocument());
    fireEvent.click(screen.getByText("BSED-2030"));
    await waitFor(() => expect(detailMock).toHaveBeenCalledWith("version-9"));

    resolveDetail?.({ success: true, data: prog1Detail });

    await waitFor(() => expect(screen.queryByText("Intro to Computing")).not.toBeInTheDocument());
    expect(screen.getByText("BSED-2030 — Courses")).toBeInTheDocument();
  });
});
