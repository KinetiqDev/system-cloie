import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import {
  CourseRosterDetailPage,
  CourseRosterDiscoveryPage,
} from "@/features/course-assignments/components/course-roster-pages";
import {
  buildReviewGuards,
  effectiveCandidateByIndexFor,
  RosterManagementDialog,
} from "@/features/course-assignments/components/course-roster-management";
import * as rosterActions from "@/lib/actions/course-roster-actions";
import type {
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
  CourseRosterPreview,
  CourseRosterPreviewCandidate,
  CourseRosterPreviewDisposition,
  CourseRosterPreviewRow,
} from "@/features/course-assignments/types";

const { replaceMock, refreshMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMatchMedia(true);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const assignment = {
  assignmentId: "assignment-1",
  courseCode: "CS101",
  courseTitle: "Computing",
  courseScope: CourseScope.PROGRAM_SPECIFIC,
  programCode: "BSCS",
  programName: "Computer Science",
  facultyName: "Ada Lovelace",
  facultyEmail: "ada@example.com",
  yearLevel: YearLevel.SECOND_YEAR,
  section: StudentSection.MORNING,
  termLabel: "2026-2027 - 1st Semester - 1st Term",
  periodStatus: "ACTIVE" as const,
  isActive: true,
  hasPublishedEvaluation: false,
  rosterState: "ACTIVE" as const,
  activeRosterCount: 1,
  evaluationEligibleCount: 1,
};

const discovery: CourseRosterDiscoveryResult = {
  items: [assignment],
  total: 1,
  page: 0,
  pageSize: 20,
  includeHistory: false,
  search: "",
  activePeriodId: "term-1",
};

const detail: CourseRosterDetail = {
  assignment,
  canManage: true,
  canMutate: true,
  members: [
    {
      membershipId: "membership-1",
      studentName: "Grace Hopper",
      email: "grace@example.com",
      programCode: "BSCS",
      programName: "Computer Science",
      majorName: "Software",
      yearLevel: YearLevel.SECOND_YEAR,
      section: StudentSection.MORNING,
      membershipAddedAt: new Date("2026-07-01T00:00:00Z"),
      isActive: true,
      eligibility: { eligible: true, reason: null },
      removedAt: null,
      removedByName: null,
    },
  ],
  totalMembers: 1,
  activeRosterCount: 1,
  evaluationEligibleCount: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
  search: "",
  includeRemoved: false,
  sortDirection: "asc",
};

describe("course roster pages", () => {
  it("renders the complete default List presentation with one action and no Faculty identity", () => {
    render(<CourseRosterDiscoveryPage data={discovery} view="list" />);

    expect(screen.getByRole("heading", { name: "My Course Rosters" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search assignments" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /include inactive/i })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Course roster view" })).toBeInTheDocument();
    const selectedList = screen.getByRole("button", { name: "List view" });
    expect(selectedList).toHaveAttribute("aria-pressed", "true");
    expect(selectedList).toHaveClass("aria-pressed:font-semibold");
    expect(selectedList).toHaveClass("aria-pressed:shadow-sm");
    expect(screen.getByRole("table", { name: "Course assignments" })).toBeInTheDocument();
    for (const column of [
      "Course",
      "Program",
      "Class",
      "Academic Period",
      "Active roster",
      "Evaluation-eligible",
      "State",
      "Action",
    ]) {
      expect(screen.getByRole("columnheader", { name: column })).toBeInTheDocument();
    }
    expect(screen.getByText("CS101")).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("2nd Year | Morning")).toBeInTheDocument();
    expect(screen.getByText(discovery.items[0].termLabel)).toBeInTheDocument();
    expect(
      screen.getByText("Open roster", { selector: '[data-slot="badge"]' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open roster" })).toHaveLength(1);
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument();
  });

  it("renders complete Card facts, separate counts, one action, and no Faculty identity", () => {
    render(
      <CourseRosterDiscoveryPage
        data={{
          ...discovery,
          items: [{ ...assignment, activeRosterCount: 3, evaluationEligibleCount: 2 }],
        }}
        view="card"
      />
    );

    const selectedCard = screen.getByRole("button", { name: "Card view" });
    expect(selectedCard).toHaveAttribute("aria-pressed", "true");
    expect(selectedCard).toHaveClass("aria-pressed:font-semibold");
    expect(selectedCard).toHaveClass("aria-pressed:shadow-sm");
    expect(screen.queryByRole("table", { name: "Course assignments" })).not.toBeInTheDocument();
    expect(screen.getByText("CS101", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    for (const label of ["Program", "Year level", "Class section", "Academic Period"]) {
      expect(screen.getByText(label, { selector: "dt" })).toBeInTheDocument();
    }
    expect(screen.getByText("3", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Open roster" })).toHaveLength(1);
    expect(screen.queryByText(/Ada Lovelace|ada@example.com/)).not.toBeInTheDocument();
  });

  it("switches views with replace navigation, preserves scope, resets page, and ignores deselection", () => {
    const { rerender } = render(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, search: "CS", includeHistory: true, page: 4 }}
        view="list"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(replaceMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Card view" }));
    expect(replaceMock).toHaveBeenCalledWith(
      "/faculty/course-rosters?search=CS&history=1&view=card"
    );

    replaceMock.mockClear();
    rerender(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, search: "CS", includeHistory: true, page: 4 }}
        view="card"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "List view" }));
    expect(replaceMock).toHaveBeenCalledWith("/faculty/course-rosters?search=CS&history=1");
  });

  it("preserves Card in the GET form and paginated links", () => {
    render(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, total: 40, search: "CS", includeHistory: true }}
        view="card"
      />
    );

    expect(document.querySelector('input[type="hidden"][name="view"]')).toHaveValue("card");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/faculty/course-rosters?page=2&search=CS&history=1&view=card"
    );
  });

  it("distinguishes search-empty results and clears search while preserving history and Card", () => {
    render(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, items: [], total: 0, search: "missing", includeHistory: true }}
        view="card"
      />
    );

    expect(screen.getByText("No Course rosters match your search")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/faculty/course-rosters?history=1&view=card"
    );
  });

  it("offers history when no current assignments exist and preserves Card", () => {
    render(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, items: [], total: 0, activePeriodId: null }}
        view="card"
      />
    );

    expect(screen.getByText("No current Course rosters")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Include assignment history" })).toHaveAttribute(
      "href",
      "/faculty/course-rosters?history=1&view=card"
    );
  });

  it("distinguishes a history-inclusive zero state", () => {
    render(
      <CourseRosterDiscoveryPage
        data={{ ...discovery, items: [], total: 0, includeHistory: true }}
        view="list"
      />
    );

    expect(screen.getByText("No Course rosters available")).toBeInTheDocument();
    expect(
      screen.getByText("No current or historical Course assignments are assigned to you.")
    ).toBeInTheDocument();
  });

  it("keeps discovery errors opaque and provides an accessible current-URL retry", () => {
    render(
      <CourseRosterDiscoveryPage
        data={null}
        error="The roster request could not be completed. Support reference: safe-123."
        view="list"
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/support reference: safe-123/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/prisma|database|sql/i);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("states active-roster management and lifecycle read-only scope in discovery copy", () => {
    render(<CourseRosterDiscoveryPage data={discovery} view="list" />);

    expect(
      screen.getByText(/review and manage active Course assignments you own/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /historical, inactive, completed-period, and published-evaluation-locked rosters remain review-only/i
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/read-only Course roster/i)).not.toBeInTheDocument();
  });

  it("renders read-only lifecycle banners and default-off removed filter", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          assignment: {
            ...detail.assignment,
            rosterState: "PUBLISHED_EVALUATION_LOCK",
          },
        }}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/published evaluation lock/i);
    expect(screen.getByRole("searchbox", { name: "Search students" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /include removed students/i })).not.toBeChecked();
    expect(screen.getByText(/course roster members and current eligibility/i)).toBeInTheDocument();
  });

  it("renders safe error output without technical details", () => {
    render(
      <CourseRosterDetailPage data={null} error="The roster request could not be completed." />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/unable to load roster/i);
    expect(screen.getByRole("alert")).not.toHaveTextContent(/prisma|database|sql/i);
  });

  it("does not label removed history as evaluation-eligible", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          includeRemoved: true,
          members: [
            {
              ...detail.members[0],
              isActive: false,
              removedAt: new Date(),
              removedByName: "Registrar",
            },
          ],
        }}
      />
    );

    expect(screen.getByText("Removed from active roster")).toBeInTheDocument();
    expect(screen.queryByText("Evaluation-eligible")).not.toBeInTheDocument();
  });

  it("shows management controls only for mutable authorized rosters", () => {
    render(<CourseRosterDetailPage data={detail} />);

    expect(
      screen.getByText("Manage roster", { selector: '[data-slot="card-title"]' })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /manage roster/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("places management action at card end on desktop", () => {
    render(<CourseRosterDetailPage data={detail} />);

    const action = screen.getByRole("button", { name: /manage roster/i }).parentElement;
    expect(action).toHaveAttribute("data-slot", "card-action");
    expect(action).toHaveClass("sm:justify-self-end");
  });

  it("presents labelled assignment context and distinct prepared counts", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          activeRosterCount: 3,
          evaluationEligibleCount: 2,
        }}
      />
    );

    for (const label of [
      "Course code",
      "Course title",
      "Program",
      "Year level",
      "Class section",
      "Academic Period",
    ]) {
      expect(screen.getByText(label, { selector: "dt" })).toBeInTheDocument();
    }
    expect(screen.getByText("3", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
    expect(screen.getByText("2", { selector: '[data-slot="card-title"]' })).toBeInTheDocument();
  });

  it("provides a name sort control that preserves roster filters and route scope", () => {
    render(
      <CourseRosterDetailPage
        data={{ ...detail, search: "grace", includeRemoved: true, sortDirection: "desc" }}
        programId="program-1"
        rosterBasePath="/program-head/programs/program-1/course-rosters"
      />
    );

    expect(screen.getByRole("link", { name: "Sort by name ascending" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/course-rosters/assignment-1?search=grace&sort=asc&removed=1"
    );
    expect(document.querySelector('input[name="sort"]')).toHaveValue("desc");
  });

  it("preserves selected Program roster navigation and action scope", async () => {
    vi.spyOn(rosterActions, "addRosterMembershipAction").mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-1",
            name: "Maria Santos",
            email: "maria.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSCS",
            programName: "BS Computer Science",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(
      <CourseRosterDetailPage
        data={detail}
        programId="program-1"
        rosterBasePath="/program-head/programs/program-1/course-rosters"
        backHref="/program-head/programs/program-1/course-assignments"
      />
    );

    expect(screen.getByRole("link", { name: /back to my course rosters/i })).toHaveAttribute(
      "href",
      "/program-head/programs/program-1/course-assignments"
    );
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    fireEvent.click(screen.getByRole("tab", { name: /add one student/i }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Maria" } });
    expect(await screen.findByRole("button", { name: /maria santos/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /maria santos/i }));
    fireEvent.submit(screen.getByRole("button", { name: /add student/i }).closest("form")!);
    await waitFor(() =>
      expect(rosterActions.addRosterMembershipAction).toHaveBeenCalledWith({
        assignmentId: "assignment-1",
        programId: "program-1",
        studentUserId: "student-1",
      })
    );
  });

  it("shows ineligible removed members but disables restore", () => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          includeRemoved: true,
          members: [
            {
              ...detail.members[0],
              isActive: false,
              eligibility: { eligible: false, reason: "ACCOUNT_INACTIVE" },
            },
          ],
        }}
      />
    );

    expect(screen.getByRole("button", { name: /restore/i })).toBeDisabled();
    expect(screen.getByText(/cannot restore: account inactive/i)).toBeInTheDocument();
  });

  it("states limited removal effect in accessible confirmation", () => {
    render(<CourseRosterDetailPage data={detail} />);

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Grace Hopper");
    expect(screen.getByRole("alertdialog")).toHaveTextContent("CS101 - Computing");
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /does not affect the Student account or term placement/i
    );
    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      /future Course-bound evaluation eligibility/i
    );
  });

  it("hides write controls for read-only or unauthorized detail data", () => {
    render(<CourseRosterDetailPage data={{ ...detail, canManage: false, canMutate: false }} />);

    expect(screen.queryByRole("button", { name: /manage roster/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("describes the currently available name parsing step", () => {
    render(<CourseRosterDetailPage data={detail} />);

    expect(screen.getByText(/Review parsed rows before continuing roster reconciliation/i)).toBeInTheDocument();
  });

  it.each([
    "INACTIVE_ASSIGNMENT",
    "INACTIVE_ACADEMIC_PERIOD",
    "PUBLISHED_EVALUATION_LOCK",
  ] as const)("hides management entry for %s rosters", (rosterState) => {
    render(
      <CourseRosterDetailPage
        data={{
          ...detail,
          assignment: { ...detail.assignment, rosterState },
        }}
      />
    );

    expect(screen.queryByRole("button", { name: /manage roster/i })).not.toBeInTheDocument();
  });

  it("provides accessible CSV import, template download, and the review phase", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Invalid name",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: { readyToCreate: 1, willRestore: 0, alreadyActive: 0, needsReview: 1, ineligible: 0 },
      },
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<CourseRosterDetailPage data={detail} programId="program-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /download template/i }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

    const input = screen.getByLabelText("Roster CSV file");
    const file = new File(["name\nMaria Santos\nInvalid name\n"], "roster.csv", {
      type: "text/csv",
    });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    expect(
      await screen.findByRole("group", { name: "Wizard progress" })
    ).toHaveTextContent("Review and resolve");
    expect(screen.getAllByText(/maria santos/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Exact match")).toBeInTheDocument();
    expect(screen.getByText("No match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();
    expect(screen.getAllByText("Invalid name").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Resolve: 1" })).toBeInTheDocument();
    expect(rosterActions.previewCourseRosterAction).toHaveBeenCalledWith({
      assignmentId: "assignment-1",
      programId: "program-1",
      rows: [
        { sourceIndex: 2, submittedName: "Maria Santos", status: "VALID" },
        { sourceIndex: 3, submittedName: "Invalid name", status: "VALID" },
      ],
    });
  });

  it("keeps invalid CSV feedback in the member-input phase", () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["not-a-roster"], "roster.txt", { type: "text/plain" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Choose a CSV file.");
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
  });

  it("keeps parser and action failures adjacent to CSV input", async () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["name\n"], "roster.csv", { type: "text/csv" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/CSV must contain one name column/i)
    );
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");

    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: false,
      error: "The roster preview could not be completed.",
    });
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/The roster preview could not be completed/i)
    );
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");
  });

  it("uses a Drawer on mobile while keeping the CSV import method", () => {
    mockMatchMedia(false);
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
    expect(screen.getByLabelText("Roster CSV file")).toBeInTheDocument();
  });

  it("restores focus to the trigger after closing the mobile Drawer", async () => {
    mockMatchMedia(false);
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    const trigger = screen.getByRole("button", { name: /manage roster/i });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-popup"]')).not.toBeInTheDocument()
    );
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("renders the review and results steps inside the mobile Drawer", async () => {
    mockMatchMedia(false);
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 1,
          willRestore: 0,
          alreadyActive: 0,
          needsReview: 0,
          ineligible: 0,
        },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /review complete/i })).toBeEnabled()
    );

    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();
    expect(screen.getByText("Exact match")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /review complete/i }));
    expect(screen.getByText(/The preview session is ready\./)).toBeInTheDocument();
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
  });

  it("resets session state after results are closed and reopened", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: "FIRST_YEAR",
                section: "MORNING",
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Invalid name",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: { readyToCreate: 1, willRestore: 0, alreadyActive: 0, needsReview: 1, ineligible: 0 },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );
    // The unresolved no-match row must be explicitly skipped before review completion.
    expect(screen.getByRole("button", { name: /review complete/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Resolve or skip 1 row before continuing/i);
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[1]);
    expect(screen.getByRole("button", { name: /review complete/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /review complete/i }));
    expect(screen.getByText(/The preview session is ready\./)).toBeInTheDocument();

    // Closing a dirty preview asks before discarding the session state.
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    expect(screen.getByLabelText("Roster CSV file")).toBeInTheDocument();
    expect(screen.queryByText("Maria Santos")).not.toBeInTheDocument();
    expect(screen.queryByText("roster.csv")).not.toBeInTheDocument();
  });

  it("supports skip, unskip, change, and suggested-match search in the review phase", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: {
              status: "SUGGESTED_MATCH",
              reason: "MIDDLE_TOKEN",
              candidateIds: ["student-1"],
            },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Unknown Student",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
          {
            sourceIndex: 4,
            submittedName: "Active Student",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-3"] },
            disposition: "ALREADY_ACTIVE",
            candidates: [
              {
                userId: "student-3",
                name: "Active Student",
                email: "active.student@acd.edu.ph",
                programId: "program-1",
                programCode: null,
                programName: null,
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: {
          readyToCreate: 0,
          willRestore: 0,
          alreadyActive: 1,
          needsReview: 1,
          ineligible: 0,
        },
      },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-2",
            name: "Maria Ann Santos",
            email: "maria.ann.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSED",
            programName: "Education",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(
            ["name\nMaria Santos\nUnknown Student\nActive Student\n"],
            "roster.csv",
            { type: "text/csv" }
          ),
        ],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );
    // Suggested matches and unresolved rows gate review completion.
    expect(screen.getByRole("button", { name: /review complete/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Acknowledge 1 suggested match/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/Resolve or skip 1 row before continuing/i);

    expect(screen.getByText("Suggested match")).toBeInTheDocument();
    // Suggested rows need review even when the disposition is ready.
    expect(screen.getByRole("button", { name: "Review: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 0" })).toBeInTheDocument();
    // Already-active rows stay informational: exactly two rows offer Skip.
    expect(screen.getAllByRole("button", { name: "Skip" })).toHaveLength(2);

    // A suggested row can open scoped search to change the prepared account.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const searchbox = screen.getByRole("searchbox");
    fireEvent.change(searchbox, { target: { value: "Maria Ann" } });
    fireEvent.click(await screen.findByRole("button", { name: /maria ann santos/i }));
    expect(screen.getByText("Maria Ann Santos")).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    // A manually resolved row leaves Review and joins the Ready group, and the
    // prepared disposition no longer applies to the chosen account.
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review: 0" })).toBeInTheDocument();
    expect(screen.queryByText("Ready to add")).not.toBeInTheDocument();

    // Clearing the selection returns the row to its prepared suggestion.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.queryByText("Maria Ann Santos")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review: 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 0" })).toBeInTheDocument();

    // Skip and unskip a no-match row without blocking the rest of the preview.
    const noMatchSkip = screen.getAllByRole("button", { name: "Skip" })[1];
    fireEvent.click(noMatchSkip);
    expect(screen.getByRole("button", { name: "Unskip" })).toBeInTheDocument();
    expect(screen.getByText("Skipped", { selector: '[data-slot="badge"]' })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skipped: 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Unskip" }));
    expect(screen.getByRole("button", { name: "Skipped: 0" })).toBeInTheDocument();
    // Acknowledgement plus an explicit skip satisfy the review guards.
    const ack = screen.getByRole("checkbox", { name: /I acknowledge 1 suggested match/ });
    fireEvent.click(ack);
    expect(ack).toBeChecked();
    expect(screen.getByRole("button", { name: /review complete/i })).toBeDisabled();
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[1]);
    expect(screen.getByRole("button", { name: /review complete/i })).toBeEnabled();
  });

  it("blocks closing while a preview is pending", async () => {
    let finishPreview: () => void = () => undefined;
    const pendingPreview = new Promise<void>((resolve) => {
      finishPreview = resolve;
    });
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockImplementation(async () => {
      await pendingPreview;
      return {
        success: true,
        data: {
          assignmentId: "assignment-1",
          rows: [],
          summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 0, ineligible: 0 },
        },
      };
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload a CSV roster file" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    finishPreview();
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );
    // A dirty preview asks before discarding on Escape.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    // Escape again keeps editing; the workspace stays open.
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
      "Review and resolve"
    );
    // Confirming discard closes the workspace and restores trigger focus.
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });

  it("requires count-aware acknowledgement of suggested matches and resets on change", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: {
              status: "SUGGESTED_MATCH",
              reason: "MIDDLE_TOKEN",
              candidateIds: ["student-1"],
            },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 1, ineligible: 0 },
      },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-2",
            name: "Maria Ann Santos",
            email: "maria.ann.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSED",
            programName: "Education",
            yearLevel: null,
            section: null,
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() => expect(screen.getByText("Suggested match")).toBeInTheDocument());

    const reviewComplete = screen.getByRole("button", { name: /review complete/i });
    const ack = screen.getByRole("checkbox", { name: /I acknowledge 1 suggested match/ });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Acknowledge 1 suggested match before continuing/i);

    // A count-aware checkbox acknowledges the current suggestion set.
    fireEvent.click(ack);
    expect(ack).toBeChecked();
    expect(reviewComplete).toBeEnabled();

    // Changing the suggested account clears the acknowledgement.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    const searchbox = screen.getByRole("searchbox");
    fireEvent.change(searchbox, { target: { value: "Maria Ann" } });
    fireEvent.click(await screen.findByRole("button", { name: /maria ann santos/i }));
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();

    // Returning the row to its suggestion shows the acknowledgement reset.
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(screen.getByRole("button", { name: "Review: 1" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /I acknowledge 1 suggested match/ })).not.toBeChecked();
    expect(reviewComplete).toBeDisabled();
  });

  it("blocks review completion while a row is unresolved", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Invalid name",
            resolution: { status: "INVALID_NAME", reason: "INVALID", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: { readyToCreate: 1, willRestore: 0, alreadyActive: 0, needsReview: 1, ineligible: 0 },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    const reviewComplete = screen.getByRole("button", { name: /review complete/i });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/Resolve or skip 1 row before continuing/i);

    // An explicit skip resolves the invalid row.
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[1]);
    expect(screen.getByRole("button", { name: "Skipped: 1" })).toBeInTheDocument();
    expect(reviewComplete).toBeEnabled();
  });

  it("blocks review completion when one account is selected for two rows", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "John Paul Santos",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
          {
            sourceIndex: 3,
            submittedName: "John Paul Santos",
            resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
            disposition: null,
            candidates: [],
          },
        ],
        summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 2, ineligible: 0 },
      },
    });
    vi.spyOn(rosterActions, "searchScopedRosterStudentsAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        candidates: [
          {
            userId: "student-1",
            name: "John Paul Santos",
            email: "john.paul.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSCS",
            programName: "Computer Science",
            yearLevel: "SECOND_YEAR",
            section: "MORNING",
            majorName: null,
            selectable: true,
            reason: null,
          },
          {
            userId: "student-2",
            name: "John Paul Santos",
            email: "jp.santos@acd.edu.ph",
            programId: "program-1",
            programCode: "BSCS",
            programName: "Computer Science",
            yearLevel: "SECOND_YEAR",
            section: "AFTERNOON",
            majorName: null,
            selectable: true,
            reason: null,
          },
        ],
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nJohn Paul Santos\nJohn Paul Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    // Resolve both identical-name rows to the same account.
    const searchButtons = screen.getAllByRole("button", { name: "Search candidate" });
    fireEvent.click(searchButtons[0]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    fireEvent.click(await screen.findByRole("button", { name: /john.paul.santos@acd.edu.ph/i }));
    fireEvent.click(screen.getAllByRole("button", { name: "Search candidate" })[0]);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    fireEvent.click(await screen.findByRole("button", { name: /john.paul.santos@acd.edu.ph/i }));

    const reviewComplete = screen.getByRole("button", { name: /review complete/i });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /The same Student is selected for rows 2 and 3/
    );

    // Remapping one row to a different account satisfies the duplicate guard.
    fireEvent.click(screen.getAllByRole("button", { name: "Change" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Search candidate" }));
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "John" } });
    fireEvent.click(await screen.findByRole("button", { name: /jp.santos@acd.edu.ph/i }));
    expect(reviewComplete).toBeEnabled();
  });

  it("blocks review completion when exact matches repeat one account and unblocks on skip", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
          {
            sourceIndex: 3,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: { readyToCreate: 2, willRestore: 0, alreadyActive: 0, needsReview: 0, ineligible: 0 },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    // Two identical exact names prepare the same account; the duplicate blocks review.
    const reviewComplete = screen.getByRole("button", { name: /review complete/i });
    expect(reviewComplete).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /The same Student is selected for rows 2 and 3/
    );

    // Skipping one repeated row removes its prepared identity and unblocks.
    fireEvent.click(screen.getAllByRole("button", { name: "Skip" })[0]);
    expect(screen.getByRole("button", { name: "Skipped: 1" })).toBeInTheDocument();
    expect(reviewComplete).toBeEnabled();
  });

  it("confirms before discarding a dirty preview and keeps editing", async () => {
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: { readyToCreate: 1, willRestore: 0, alreadyActive: 0, needsReview: 0, ineligible: 0 },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    // Canceling a dirty preview asks first; Keep editing stays in the workspace.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ready: 1" })).toBeInTheDocument();

    // Confirming the discard closes the workspace and restores trigger focus.
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });

  it("confirms discard inside the mobile Drawer", async () => {
    mockMatchMedia(false);
    vi.spyOn(rosterActions, "previewCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        assignmentId: "assignment-1",
        rows: [
          {
            sourceIndex: 2,
            submittedName: "Maria Santos",
            resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: ["student-1"] },
            disposition: "READY_CREATE",
            candidates: [
              {
                userId: "student-1",
                name: "Maria Santos",
                email: "maria.santos@acd.edu.ph",
                programId: "program-1",
                programCode: "BSED",
                programName: "Education",
                yearLevel: null,
                section: null,
                majorName: null,
                selectable: true,
                reason: null,
              },
            ],
          },
        ],
        summary: { readyToCreate: 1, willRestore: 0, alreadyActive: 0, needsReview: 0, ineligible: 0 },
      },
    });
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));
    expect(document.querySelector('[data-slot="drawer-popup"]')).toBeInTheDocument();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /prepare preview/i }));
    await waitFor(() =>
      expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent(
        "Review and resolve"
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Discard preview?");
    fireEvent.click(screen.getByRole("button", { name: "Discard preview" }));
    await waitFor(() =>
      expect(document.querySelector('[data-slot="drawer-popup"]')).not.toBeInTheDocument()
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });
});

describe("buildReviewGuards", () => {
  const candidate = (userId: string): CourseRosterPreviewCandidate => ({
    userId,
    name: "Maria Santos",
    email: `${userId}@acd.edu.ph`,
    programId: "program-1",
    programCode: "BSED",
    programName: "Education",
    yearLevel: null,
    section: null,
    majorName: null,
    selectable: true,
    reason: null,
  });

  const exactRow = (sourceIndex: number, userId: string): CourseRosterPreviewRow => ({
    sourceIndex,
    submittedName: "Maria Santos",
    resolution: { status: "EXACT_MATCH", reason: "EXACT", candidateIds: [userId] },
    disposition: "READY_CREATE",
    candidates: [candidate(userId)],
  });

  const suggestedRow = (
    sourceIndex: number,
    userId: string,
    disposition: CourseRosterPreviewDisposition = "READY_CREATE"
  ): CourseRosterPreviewRow => ({
    sourceIndex,
    submittedName: "Maria Santos",
    resolution: { status: "SUGGESTED_MATCH", reason: "MIDDLE_TOKEN", candidateIds: [userId] },
    disposition,
    candidates: [candidate(userId)],
  });

  const noMatchRow = (sourceIndex: number): CourseRosterPreviewRow => ({
    sourceIndex,
    submittedName: "Unknown Student",
    resolution: { status: "NO_MATCH", reason: "NO_EVIDENCE", candidateIds: [] },
    disposition: null,
    candidates: [],
  });

  it("treats prepared exact matches as selected identities", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [exactRow(2, "student-1"), exactRow(3, "student-1")],
      summary: { readyToCreate: 2, willRestore: 0, alreadyActive: 0, needsReview: 0, ineligible: 0 },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(guards.reviewBlockers).toEqual([
      "The same Student is selected for rows 2 and 3. Change or skip one before continuing.",
    ]);

    const skipped = buildReviewGuards({
      preview,
      skippedIndexes: new Set([3]),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(skipped.reviewBlockers).toEqual([]);
  });

  it("counts manual selections toward duplicates and excludes skipped rows", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [noMatchRow(2), noMatchRow(3)],
      summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 2, ineligible: 0 },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: { 2: candidate("student-1"), 3: candidate("student-1") },
      suggestionsAcknowledged: false,
    });
    expect(guards.reviewBlockers).toEqual([
      "The same Student is selected for rows 2 and 3. Change or skip one before continuing.",
    ]);

    const skipped = buildReviewGuards({
      preview,
      skippedIndexes: new Set([3]),
      selectedCandidateByIndex: { 2: candidate("student-1"), 3: candidate("student-1") },
      suggestionsAcknowledged: false,
    });
    expect(skipped.reviewBlockers).toEqual([]);
  });

  it("counts acknowledged suggestions as selected identities", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [suggestedRow(2, "student-1"), noMatchRow(3)],
      summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 2, ineligible: 0 },
    };
    const beforeAck = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: { 3: candidate("student-1") },
      suggestionsAcknowledged: false,
    });
    expect(beforeAck.reviewBlockers).not.toEqual(
      expect.arrayContaining([expect.stringContaining("The same Student")])
    );

    const afterAck = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: { 3: candidate("student-1") },
      suggestionsAcknowledged: true,
    });
    expect(afterAck.reviewBlockers).toEqual([
      "The same Student is selected for rows 2 and 3. Change or skip one before continuing.",
    ]);
  });

  it("requires acknowledgement only for suggested rows awaiting a decision", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [suggestedRow(2, "student-1"), noMatchRow(3)],
      summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 2, ineligible: 0 },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(guards.suggestedCount).toBe(1);
    expect(guards.reviewBlockers).toEqual([
      "Resolve or skip 1 row before continuing.",
      "Acknowledge 1 suggested match before continuing.",
    ]);
  });

  it("treats ineligible suggestions and no-match rows as unresolved until skipped", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [suggestedRow(2, "student-1", "INELIGIBLE"), noMatchRow(3)],
      summary: { readyToCreate: 0, willRestore: 0, alreadyActive: 0, needsReview: 0, ineligible: 1 },
    };
    const guards = buildReviewGuards({
      preview,
      skippedIndexes: new Set(),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(guards.reviewBlockers).toEqual([
      "Resolve or skip 2 rows before continuing.",
    ]);

    const skipped = buildReviewGuards({
      preview,
      skippedIndexes: new Set([2, 3]),
      selectedCandidateByIndex: {},
      suggestionsAcknowledged: false,
    });
    expect(skipped.reviewBlockers).toEqual([]);
  });

  it("builds the effective identity set a confirmation would submit", () => {
    const preview: CourseRosterPreview = {
      assignmentId: "assignment-1",
      rows: [
        exactRow(2, "student-1"),
        suggestedRow(3, "student-2"),
        noMatchRow(4),
        noMatchRow(5),
        exactRow(6, "student-3"),
      ],
      summary: { readyToCreate: 2, willRestore: 0, alreadyActive: 0, needsReview: 3, ineligible: 0 },
    };

    // Manual selection wins over prepared exact; skipped rows are excluded;
    // suggestions count only after acknowledgement.
    expect(
      effectiveCandidateByIndexFor({
        preview,
        skippedIndexes: new Set([6]),
        selectedCandidateByIndex: { 2: candidate("student-9"), 4: candidate("student-1") },
        suggestionsAcknowledged: false,
      })
    ).toEqual({
      2: candidate("student-9"),
      3: undefined,
      4: candidate("student-1"),
      5: undefined,
    });

    expect(
      effectiveCandidateByIndexFor({
        preview,
        skippedIndexes: new Set(),
        selectedCandidateByIndex: { 4: candidate("student-1") },
        suggestionsAcknowledged: true,
      })
    ).toEqual({
      2: candidate("student-1"),
      3: candidate("student-2"),
      4: candidate("student-1"),
      5: undefined,
      6: candidate("student-3"),
    });
  });
});
