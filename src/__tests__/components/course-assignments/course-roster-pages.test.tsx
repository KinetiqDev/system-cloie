import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CourseScope, StudentSection, YearLevel } from "@prisma/client";

import {
  CourseRosterDetailPage,
  CourseRosterDiscoveryPage,
} from "@/features/course-assignments/components/course-roster-pages";
import { ImportRosterCsv } from "@/features/course-assignments/components/course-roster-management";
import * as rosterActions from "@/lib/actions/course-roster-actions";
import type {
  CourseRosterDetail,
  CourseRosterDiscoveryResult,
} from "@/features/course-assignments/types";

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
  it("renders labelled discovery filters, counts, state, and open action", () => {
    render(<CourseRosterDiscoveryPage data={discovery} />);

    expect(screen.getByRole("heading", { name: "My Course Rosters" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search assignments" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /include inactive/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open roster/i })).toBeInTheDocument();
    expect(screen.getByText("Evaluation-eligible")).toBeInTheDocument();
  });

  it("states active-roster management and lifecycle read-only scope in discovery copy", () => {
    render(<CourseRosterDiscoveryPage data={discovery} />);

    expect(
      screen.getByText(/review and manage active Course assignments you own/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/historical, inactive, completed-period, and published-evaluation-locked rosters remain review-only/i)
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

    expect(screen.getByRole("heading", { name: "Add Student to roster" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
  });

  it("preserves selected Program roster navigation and action scope", async () => {
    vi.spyOn(rosterActions, "addRosterMembershipAction").mockResolvedValue({
      success: true,
      data: { outcome: "CREATED", message: "Student added to Course roster." },
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
    fireEvent.change(screen.getByRole("textbox", { name: "Student email" }), {
      target: { value: "student@example.com" },
    });
    fireEvent.submit(screen.getByRole("textbox", { name: "Student email" }).closest("form")!);
    await waitFor(() => expect(rosterActions.addRosterMembershipAction).toHaveBeenCalledWith(
      expect.objectContaining({ programId: "program-1" })
    ));
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

    expect(
      screen.queryByRole("heading", { name: "Add Student to roster" })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("provides accessible CSV import, template download, row results, and failed export", async () => {
    vi.spyOn(rosterActions, "importCourseRosterAction").mockResolvedValue({
      success: true,
      data: {
        total: 2,
        created: 1,
        restored: 0,
        failed: 1,
        unprocessed: 0,
        rows: [
          { sourceIndex: 2, email: "ok@example.com", status: "CREATED", error: "Created." },
          { sourceIndex: 3, email: "bad@example.com", status: "UNKNOWN_ACCOUNT", error: "No matching account was found." },
        ],
      },
    });
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<ImportRosterCsv assignmentId="assignment-1" />);
    expect(screen.getByLabelText("Roster CSV file")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /download template/i }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");

    const input = screen.getByLabelText("Roster CSV file");
    const file = new File(["email\nok@example.com\nbad@example.com\n"], "roster.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.submit(input.closest("form")!);

    expect(await screen.findByRole("heading", { name: "Import results" })).toBeInTheDocument();
    expect(screen.getByText(/1 created, 0 restored, 1 failed, 0 unprocessed/i)).toBeInTheDocument();
    expect(screen.getByText("No matching account was found.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download failed rows/i })).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
