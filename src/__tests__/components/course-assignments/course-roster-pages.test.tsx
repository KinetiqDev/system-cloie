import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import {
  CourseRosterDetailPage,
  CourseRosterDiscoveryPage,
} from "@/features/course-assignments/components/course-roster-pages";
import { RosterManagementDialog } from "@/features/course-assignments/components/course-roster-management";
import * as rosterActions from "@/lib/actions/course-roster-actions";
import type {
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
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

  it("provides accessible CSV import, template download, row results, and failed export", async () => {
    vi.spyOn(rosterActions, "importCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        total: 2,
        parsed: 1,
        invalid: 1,
        rows: [
          { sourceIndex: 2, name: "Maria Santos", status: "PARSED", error: "" },
          {
            sourceIndex: 3,
            name: "Invalid name",
            status: "INVALID_NAME",
            error: "Name must contain 1 to 200 characters.",
          },
        ],
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
    fireEvent.click(screen.getByRole("button", { name: /import roster/i }));

    expect(await screen.findByRole("heading", { name: "Import results" })).toBeInTheDocument();
    expect(screen.getByText(/1 ready for review, 1 invalid/i)).toBeInTheDocument();
    expect(screen.getByText("Name must contain 1 to 200 characters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download failed rows/i })).toBeInTheDocument();
    expect(screen.getByRole("table").parentElement).toHaveClass("overflow-x-auto");
    expect(rosterActions.importCourseRosterAction).toHaveBeenCalledWith(expect.any(FormData));
    const [formData] = vi.mocked(rosterActions.importCourseRosterAction).mock.calls[0] as [
      FormData,
    ];
    expect(formData.get("programId")).toBe("program-1");
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
    expect(screen.queryByRole("heading", { name: "Import results" })).not.toBeInTheDocument();
  });

  it("keeps parser and action failures adjacent to CSV input", async () => {
    render(<RosterManagementDialog assignmentId="assignment-1" />);
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["name\n"], "roster.csv", { type: "text/csv" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: /import roster/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/CSV must contain one name column/i)
    );
    expect(screen.getByRole("group", { name: "Wizard progress" })).toHaveTextContent("Add members");

    vi.spyOn(rosterActions, "importCourseRosterAction").mockResolvedValue({
      success: false,
      error: "The roster import could not be completed.",
    });
    fireEvent.change(input, {
      target: {
        files: [new File(["name\nMaria Santos\n"], "roster.csv", { type: "text/csv" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: /import roster/i }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/The roster import could not be completed/i)
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

  it("resets session state after results are closed and reopened", async () => {
    vi.spyOn(rosterActions, "importCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        total: 1,
        parsed: 1,
        invalid: 0,
        rows: [{ sourceIndex: 2, name: "Maria Santos", status: "PARSED", error: "" }],
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
    fireEvent.click(screen.getByRole("button", { name: /import roster/i }));
    expect(await screen.findByRole("heading", { name: "Import results" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
    fireEvent.click(screen.getByRole("button", { name: /manage roster/i }));

    expect(screen.getByLabelText("Roster CSV file")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Import results" })).not.toBeInTheDocument();
    expect(screen.queryByText("roster.csv")).not.toBeInTheDocument();
  });

  it("blocks closing while an import is pending", async () => {
    let finishImport: () => void = () => undefined;
    const pendingImport = new Promise<void>((resolve) => {
      finishImport = resolve;
    });
    vi.spyOn(rosterActions, "importCourseRosterAction").mockImplementation(async () => {
      await pendingImport;
      return {
        success: true,
        data: {
          total: 1,
          parsed: 1,
          invalid: 0,
          rows: [{ sourceIndex: 2, name: "Maria Santos", status: "PARSED", error: "" }],
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
    fireEvent.click(screen.getByRole("button", { name: /import roster/i }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Upload a CSV roster file" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    finishImport();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Import results" })).toBeInTheDocument()
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("button", { name: /manage roster/i }))
    );
  });
});
