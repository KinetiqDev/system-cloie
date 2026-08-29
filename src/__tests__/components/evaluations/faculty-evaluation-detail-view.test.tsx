import { render, screen, within, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FacultyEvaluationDetailView } from "@/features/evaluations/components/faculty-evaluation-detail-view";
import type { FacultyEvaluationDetail } from "@/features/evaluations/types";

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));
vi.mock("@/lib/actions/course-bound-evaluation-actions", () => ({
  lateIncludeCourseBoundEvaluationAction: vi
    .fn()
    .mockResolvedValue({ success: true, data: { message: "ok" } }),
}));

// Ensure LateIncludeDialog client boundaries don't need portal root.

function makeDetail(overrides: Partial<FacultyEvaluationDetail> = {}): FacultyEvaluationDetail {
  const base: FacultyEvaluationDetail = {
    termInstanceLabel: "2025-2026 — 2nd Semester — 2nd Term",
    activationAt: new Date("2026-08-01T00:00:00.000Z"),
    cilos: [
      { id: "cilo-1", label: "CILO 1", description: "Demonstrate mastery" },
      { id: "cilo-2", label: "CILO 2", description: "Apply concepts" },
    ],
    courseInfo: {
      courseCode: "CS101",
      courseScope: "PROGRAM_SPECIFIC",
      courseTitle: "Intro to Computing",
      majorName: null,
      programCode: "BSIT",
      programName: "Information Technology",
    },
    deadlineAt: new Date("2026-08-31T00:00:00.000Z"),
    deploymentName: "Capstone CILO Evaluation",
    evaluationId: "11111111-1111-4111-8111-111111111111",
    publishedAt: new Date("2026-08-01T00:00:00.000Z"),
    responseCount: 2,
    status: "ACTIVE",
    targets: [{ programCode: "BSIT", programId: "program-1", yearLevel: "FOURTH_YEAR" }],
    templateBindings: [
      {
        ciloDescriptionSnapshot: "Demonstrate mastery",
        ciloId: "cilo-1",
        itemKey: "q1",
        questionPromptSnapshot: "Mastery was demonstrated",
        sectionKey: "sec-1",
      },
      {
        ciloDescriptionSnapshot: "Apply concepts",
        ciloId: "cilo-2",
        itemKey: "q2",
        questionPromptSnapshot: "Concepts were applied",
        sectionKey: "sec-1",
      },
    ],
    totalAssignments: 5,
    inProgressCount: 1,
    notStartedCount: 2,
    respondents: [
      {
        assignmentId: "a1",
        respondentId: "u1",
        name: "Alice Reyes",
        email: "alice@acad.example",
        status: "SUBMITTED",
        assignedAt: new Date("2026-08-01T00:00:00.000Z"),
        submittedAt: new Date("2026-08-05T00:00:00.000Z"),
      },
      {
        assignmentId: "a2",
        respondentId: "u2",
        name: "Bob Cruz",
        email: "bob@acad.example",
        status: "IN_PROGRESS",
        assignedAt: new Date("2026-08-01T00:00:00.000Z"),
        submittedAt: null,
      },
      {
        assignmentId: "a3",
        respondentId: "u3",
        name: "Cara Lim",
        email: "cara@acad.example",
        status: "NOT_STARTED",
        assignedAt: new Date("2026-08-01T00:00:00.000Z"),
        submittedAt: null,
      },
    ],
    instrument: {
      name: "CILO Evaluation Instrument",
      versionNumber: 2,
      sections: [
        {
          sectionKey: "sec-1",
          title: "Course Learning",
          description: "Perceived attainment",
          questions: [
            {
              itemKey: "q1",
              prompt: "Mastery was demonstrated",
              type: "likert",
              required: true,
              likertDescriptors: [
                { value: 1, label: "Strongly Disagree" },
                { value: 2, label: "Disagree" },
                { value: 3, label: "Neutral" },
                { value: 4, label: "Agree" },
                { value: 5, label: "Strongly Agree" },
              ],
              suggestedResponses: [],
            },
            {
              itemKey: "q2",
              prompt: "What improvements would you suggest?",
              type: "guided_open_ended",
              required: false,
              likertDescriptors: [],
              suggestedResponses: ["More labs", "Better feedback"],
            },
          ],
        },
      ],
    },
    exclusions: [
      {
        category: "APPROVED_ACCOMMODATION",
        membershipId: "m1",
        membershipActive: true,
        reversalCategory: null,
        reversedAt: null,
        studentName: "Excluded Student",
      },
    ],
    lateInclusionOpen: true,
    ...overrides,
  };
  // Allow overrides to null out instrument etc while preserving type.
  return { ...base, ...overrides } as FacultyEvaluationDetail;
}

describe("FacultyEvaluationDetailView – DTO contract", () => {
  it("renders back navigation to Evaluation Tools and lifecycle badge", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    const backLink = screen.getByRole("link", { name: /back to evaluation tools/i });
    expect(backLink).toHaveAttribute("href", "/faculty/tools?tab=published");

    const breadcrumbsLink = screen.getByRole("link", { name: /^evaluation tools$/i });
    expect(breadcrumbsLink).toHaveAttribute("href", "/faculty/tools?tab=published");

    const badge = screen.getByText("Active");
    expect(badge).toHaveClass("bg-success-soft");
  });

  it("shows deployment and timeline summary", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Capstone CILO Evaluation" })
    ).toBeInTheDocument();
    expect(screen.getByText("2025-2026 — 2nd Semester — 2nd Term")).toBeInTheDocument();
    expect(screen.queryByText(/SECOND_TERM| — SECOND — /)).not.toBeInTheDocument();
    expect(screen.getByText("Academic Period")).toBeInTheDocument();
    expect(screen.getByText("Publication window and academic period.")).toBeInTheDocument();
    expect(screen.getByText(/CS101 — Intro to Computing/)).toBeInTheDocument();
    expect(screen.getByText(/Information Technology/)).toBeInTheDocument();
  });

  it("exposes accessible progress with semantic counts", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-label", expect.stringContaining("2 of 5 submitted"));
    expect(progress).toHaveAttribute("aria-valuenow", "40");

    expect(screen.getByText(/2.*submitted/i)).toBeInTheDocument();
    expect(screen.getByText(/1.*in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/2.*not started/i)).toBeInTheDocument();
    // Mobile and desktop share same counts; check percent appears.
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("renders responsive respondent status table and mobile cards with equivalent status", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    // Filter controls
    expect(screen.getByLabelText(/search respondents/i)).toBeInTheDocument();

    // Table rows (desktop) hidden on mobile via CSS but present in DOM
    const rows = screen.getAllByTestId("respondent-row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("Submitted")).toBeInTheDocument();
    expect(within(rows[1]).getByText("In progress")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Not started")).toBeInTheDocument();

    // Mobile cards
    const cards = screen.getAllByTestId("respondent-card");
    expect(cards).toHaveLength(3);
    expect(within(cards[0]).getByText("Submitted")).toBeInTheDocument();
    expect(within(cards[1]).getByText("In progress")).toBeInTheDocument();
    expect(within(cards[2]).getByText("Not started")).toBeInTheDocument();

    // Ensure same statuses appear in both surfaces
    const tableStatuses = rows.map(
      (row) => within(row).getByText(/submitted|in progress|not started/i).textContent
    );
    const cardStatuses = cards.map(
      (card) =>
        within(card).getByText(/submitted|in progress|not started/i, {
          selector: "[data-slot=badge]",
        }).textContent
    );
    expect(tableStatuses).toEqual(cardStatuses);
  });

  it("does not expose answer links from respondent rows or cards", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    const rows = screen.getAllByTestId("respondent-row");
    rows.forEach((row) => {
      const links = within(row).queryAllByRole("link");
      expect(links).toHaveLength(0);
      expect(row.innerHTML).not.toMatch(/response|answers/i);
    });

    const cards = screen.getAllByTestId("respondent-card");
    cards.forEach((card) => {
      const links = within(card).queryAllByRole("link");
      expect(links).toHaveLength(0);
    });
  });

  it("renders frozen instrument questions with type, required, descriptors, suggested responses and CILO links", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    expect(screen.getAllByText(/CILO Evaluation Instrument/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Version 2/)).toBeInTheDocument();

    // Section
    expect(screen.getByText("Course Learning")).toBeInTheDocument();

    // Likert question
    expect(screen.getByText("Mastery was demonstrated")).toBeInTheDocument();
    expect(screen.getByText("Likert")).toBeInTheDocument();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Strongly Disagree")).toBeInTheDocument();
    expect(screen.getByText("Strongly Agree")).toBeInTheDocument();

    // Guided open-ended with suggested responses
    expect(screen.getByText("What improvements would you suggest?")).toBeInTheDocument();
    expect(screen.getByText("Open-ended")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByText("More labs")).toBeInTheDocument();
    expect(screen.getByText("Better feedback")).toBeInTheDocument();

    // CILO link
    expect(screen.getByText("CILO 1")).toBeInTheDocument();
    expect(screen.getByText("Demonstrate mastery")).toBeInTheDocument();
    expect(screen.getByText("CILO 2")).toBeInTheDocument();
  });

  it("shows exclusions and late inclusion UI while window is open", () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    expect(screen.getByText(/exclusions & late inclusion/i)).toBeInTheDocument();
    expect(screen.getAllByText("Excluded Student").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved accommodation").length).toBeGreaterThan(0);
    // LateIncludeDialog renders a Late include button for eligible exclusions
    expect(screen.getByRole("button", { name: /late include/i })).toBeInTheDocument();
  });

  it("handles empty and malformed states safely", () => {
    const malformed = makeDetail({
      totalAssignments: 0,
      responseCount: 0,
      inProgressCount: 0,
      notStartedCount: 0,
      respondents: [],
      instrument: {
        name: "Broken",
        versionNumber: 1,
        sections: [],
      } as FacultyEvaluationDetail["instrument"],
      exclusions: [],
      lateInclusionOpen: false,
    });

    const { container } = render(<FacultyEvaluationDetailView detail={malformed} />);

    expect(screen.getByText(/no respondents assigned/i)).toBeInTheDocument();
    expect(screen.getByText(/no instrument questions/i)).toBeInTheDocument();
    expect(screen.getByText(/no roster exclusions/i)).toBeInTheDocument();
    // Progress should not be NaN
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(container).toBeInTheDocument();
  });

  it("supports local search filtering of respondents", async () => {
    render(<FacultyEvaluationDetailView detail={makeDetail()} />);

    const search = screen.getByLabelText(/search respondents/i);
    fireEvent.change(search, { target: { value: "alice" } });

    // Filtered to 1 result; both table and cards filtered equally
    expect(screen.getAllByTestId("respondent-row")).toHaveLength(1);
    expect(screen.getAllByTestId("respondent-card")).toHaveLength(1);
    expect(screen.getAllByText("Alice Reyes")).toHaveLength(2);
    expect(screen.queryByText("Bob Cruz")).not.toBeInTheDocument();
  });
});
