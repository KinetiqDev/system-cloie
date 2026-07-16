import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeanDashboardPage from "@/app/(app)/dean/dashboard/page";
import DeanLearningOutcomesPage from "@/app/(app)/dean/college-oversight/learning-outcomes/page";
import DeanEnrollmentsPage from "@/app/(app)/dean/college-oversight/enrollments/page";
import DeanEnrollmentRosterPage from "@/app/(app)/dean/college-oversight/enrollments/roster/page";

const { fetchDeanReadMock } = vi.hoisted(() => ({
  fetchDeanReadMock: vi.fn(),
}));
const notFoundMock = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NOT_FOUND");
  })
);

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));

vi.mock("@/features/dean/services/fetch-dean-read", () => ({
  fetchDeanRead: fetchDeanReadMock,
  DeanPageReadNotFoundError: class DeanPageReadNotFoundError extends Error {},
}));

const PERIOD_ID = "11111111-1111-4111-8111-111111111111";
const PROGRAM_ID = "22222222-2222-4222-8222-222222222222";
const ASSIGNMENT_ID = "44444444-4444-4444-8444-444444444444";

const period = {
  id: PERIOD_ID,
  label: "2025-2026 — 1st Semester — 1st Term",
  status: "ACTIVE" as const,
};
const outcomeData = {
  period,
  risk: null,
  programs: [
    {
      id: PROGRAM_ID,
      name: "Computer Science",
      graduateOutcomeCount: 2,
      activeContexts: 3,
      readyContexts: 2,
      missingCiloContexts: 0,
      incompleteMappingContexts: 1,
      graduateOutcomes: [
        { id: "go-1", code: "GO1", statement: "Build systems", isArchived: false, displayOrder: 1 },
        { id: "go-2", code: "GO2", statement: "Lead change", isArchived: true, displayOrder: 2 },
      ],
      mappingGaps: [
        {
          courseId: "course-1",
          courseCode: "CS101",
          courseName: "Foundations",
          yearLevel: "FIRST_YEAR",
          section: "MORNING",
          ciloId: "cilo-1",
          ciloStatement: "Explain core ideas",
          ciloIsArchived: false,
          reason: "incomplete-mapping" as const,
          missingGraduateOutcomeIds: ["go-2"],
        },
      ],
    },
  ],
};
const enrollmentData = {
  period,
  programs: [
    {
      id: PROGRAM_ID,
      name: "Computer Science",
      enrolledStudentCount: 26,
      classes: [
        {
          assignmentId: ASSIGNMENT_ID,
          courseCode: "CS101",
          courseName: "Foundations",
          yearLevel: "FIRST_YEAR",
          section: "MORNING",
          enrolledStudentCount: 26,
        },
      ],
    },
  ],
};
const rosterData = {
  assignment: {
    id: ASSIGNMENT_ID,
    courseCode: "CS101",
    courseName: "Foundations",
    programName: "Computer Science",
    yearLevel: "FIRST_YEAR",
    section: "MORNING",
  },
  students: Array.from({ length: 25 }, (_, index) => ({ displayName: `Student ${index + 1}` })),
  page: 2,
  pageSize: 25 as const,
  totalCount: 26,
  totalPages: 2,
};

describe("Dean oversight pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchDeanReadMock.mockImplementation((_route: unknown, path: string) => {
      if (path === "/api/dean/eligible-periods") {
        return Promise.resolve({
          periods: [
            period,
            {
              ...period,
              id: "33333333-3333-4333-8333-333333333333",
              status: "COMPLETED",
              label: "2024-2025 — 2nd Semester — 2nd Term",
            },
          ],
        });
      }
      return Promise.resolve({ state: "ready", data: outcomeData });
    });
  });

  it("renders Dashboard KPIs, count-only risks, coverage matrix, and same-period links", async () => {
    fetchDeanReadMock.mockResolvedValue({
      state: "ready",
      data: {
        activePeriod: { id: PERIOD_ID, label: period.label },
        kpis: {
          activeContexts: 3,
          readyContexts: 2,
          missingCiloContexts: 0,
          incompleteMappingContexts: 1,
        },
        risks: { missingCilos: 0, incompleteMappings: 1, notReady: 1 },
        programs: [
          {
            id: PROGRAM_ID,
            name: "Computer Science",
            activeContexts: 3,
            readyContexts: 2,
            missingCiloContexts: 0,
            incompleteMappingContexts: 1,
          },
        ],
      },
    });

    render(await DeanDashboardPage());

    expect(screen.getAllByText("Active contexts").length).toBeGreaterThan(0);
    expect(screen.getByText("Incomplete mappings")).toBeInTheDocument();
    expect(
      screen.getByText("Contexts with CILOs that have no active Graduate Outcome mapping.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/do not reach every active Graduate Outcome/i)
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Incomplete CILO-to-GO mappings/ })).toHaveAttribute(
      "href",
      `/dean/college-oversight/learning-outcomes?period=${PERIOD_ID}&risk=incomplete-mappings`
    );
    expect(screen.getByRole("link", { name: "Computer Science" })).toHaveAttribute(
      "href",
      `/dean/college-oversight/learning-outcomes?period=${PERIOD_ID}&program=${PROGRAM_ID}`
    );
    expect(screen.getAllByText("67% coverage").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Needs attention").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/student|evaluation|export|analytics|reports/i)
    ).not.toBeInTheDocument();
  });

  it("renders explicit no-active-period state without misleading zeros", async () => {
    fetchDeanReadMock.mockResolvedValue({ state: "no-eligible-period" });
    render(await DeanDashboardPage());

    expect(screen.getByRole("heading", { name: "No active Academic Period" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.queryByText("Active contexts")).not.toBeInTheDocument();
  });

  it("renders selected period, risk state, GO-first detail, mapping reason, and archived label", async () => {
    fetchDeanReadMock.mockImplementation((_route: unknown, path: string) => {
      if (path === "/api/dean/eligible-periods") return Promise.resolve({ periods: [period] });
      return Promise.resolve({
        state: "ready",
        data: { ...outcomeData, risk: "incomplete-mappings" },
      });
    });
    render(
      await DeanLearningOutcomesPage({
        searchParams: Promise.resolve({
          period: PERIOD_ID,
          risk: "incomplete-mappings",
          program: PROGRAM_ID,
        }),
      })
    );

    expect(screen.getByRole("heading", { name: "Learning Outcomes" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Academic Period" })).toHaveValue(PERIOD_ID);
    expect(screen.getByText("Risk: Incomplete mappings")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Graduate Outcomes" })).toBeInTheDocument();
    expect(screen.getByText("GO1")).toBeInTheDocument();
    expect(screen.getByText("GO2")).toBeInTheDocument();
    expect(
      screen.getByText("GO1").compareDocumentPosition(screen.getByText("GO2")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText(/Incomplete mapping:/)).toBeInTheDocument();
    expect(
      screen.getByText(/3 active · 2 ready · 0 missing CILOs · 1 incomplete mappings/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit|add|create|archive/i })
    ).not.toBeInTheDocument();
  });

  it("uses active period when URL omits period", async () => {
    render(await DeanLearningOutcomesPage({ searchParams: Promise.resolve({}) }));
    expect(fetchDeanReadMock).toHaveBeenLastCalledWith(
      expect.any(Function),
      `/api/dean/learning-outcomes?period=${PERIOD_ID}`
    );
    expect(screen.getByRole("combobox", { name: "Academic Period" })).toHaveValue(PERIOD_ID);
  });

  it("renders explicit no-eligible-period state", async () => {
    fetchDeanReadMock.mockResolvedValue({ periods: [] });
    render(await DeanLearningOutcomesPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "No active Academic Period" })).toBeInTheDocument();
    expect(fetchDeanReadMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid risk URL state", async () => {
    await expect(
      DeanLearningOutcomesPage({ searchParams: Promise.resolve({ risk: "scores" }) })
    ).rejects.toThrow("NOT_FOUND");
    expect(fetchDeanReadMock).not.toHaveBeenCalled();
  });

  it("expands Academic Program totals into class rows with explicit roster links", async () => {
    fetchDeanReadMock.mockImplementation((_route: unknown, path: string) => {
      if (path === "/api/dean/eligible-periods") return Promise.resolve({ periods: [period] });
      return Promise.resolve({ state: "ready", data: enrollmentData });
    });

    render(await DeanEnrollmentsPage({ searchParams: Promise.resolve({ period: PERIOD_ID }) }));

    expect(screen.getByRole("heading", { name: "Academic Program totals" })).toBeInTheDocument();
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("26", { selector: "summary span" })).toBeInTheDocument();
    expect(screen.getAllByText("Foundations").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Open roster/ })[0]).toHaveAttribute(
      "href",
      `/dean/college-oversight/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}`
    );
    expect(
      screen.queryByText(
        /Student|email|account|profile|enrollment source|evaluation|export|analytics|reports/i
      )
    ).not.toBeInTheDocument();
  });

  it("defaults enrollment oversight to latest eligible period when no active period exists", async () => {
    const completed = {
      ...period,
      status: "COMPLETED" as const,
      id: "33333333-3333-4333-8333-333333333333",
    };
    fetchDeanReadMock.mockImplementation((_route: unknown, path: string) => {
      if (path === "/api/dean/eligible-periods") return Promise.resolve({ periods: [completed] });
      return Promise.resolve({ state: "ready", data: { ...enrollmentData, period: completed } });
    });

    render(await DeanEnrollmentsPage({ searchParams: Promise.resolve({}) }));

    expect(fetchDeanReadMock).toHaveBeenLastCalledWith(
      expect.any(Function),
      `/api/dean/enrollments?period=${completed.id}`
    );
    expect(screen.getByText("Archived view")).toBeInTheDocument();
  });

  it("uses active enrollment period when URL omits period", async () => {
    fetchDeanReadMock.mockImplementation((_route: unknown, path: string) => {
      if (path === "/api/dean/eligible-periods") return Promise.resolve({ periods: [period] });
      return Promise.resolve({ state: "ready", data: enrollmentData });
    });

    render(await DeanEnrollmentsPage({ searchParams: Promise.resolve({}) }));

    expect(fetchDeanReadMock).toHaveBeenLastCalledWith(
      expect.any(Function),
      `/api/dean/enrollments?period=${PERIOD_ID}`
    );
  });

  it("renders explicit no-eligible-period enrollment state", async () => {
    fetchDeanReadMock.mockResolvedValue({ periods: [] });

    render(await DeanEnrollmentsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("No eligible Academic Period")).toBeInTheDocument();
    expect(screen.queryByText("Academic Program totals")).not.toBeInTheDocument();
  });

  it("preserves roster period, assignment, query, and page URL state", async () => {
    fetchDeanReadMock.mockImplementation((_route: unknown, path: string) => {
      if (path === "/api/dean/eligible-periods") return Promise.resolve({ periods: [period] });
      return Promise.resolve({ state: "ready", data: rosterData });
    });

    render(
      await DeanEnrollmentRosterPage({
        searchParams: Promise.resolve({
          period: PERIOD_ID,
          assignment: ASSIGNMENT_ID,
          query: "Student",
          page: "2",
        }),
      })
    );

    expect(screen.getByRole("heading", { name: "Class Roster" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search names" })).toHaveValue("Student");
    expect(screen.getAllByRole("listitem")).toHaveLength(25);
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      `/dean/college-oversight/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}&page=1&query=Student`
    );
    expect(
      screen.queryByText(
        /email|account|profile|student id|enrollment source|evaluation|export|analytics|reports/i
      )
    ).not.toBeInTheDocument();
    expect(fetchDeanReadMock).toHaveBeenLastCalledWith(
      expect.any(Function),
      `/api/dean/enrollments/roster?period=${PERIOD_ID}&assignment=${ASSIGNMENT_ID}&page=2&query=Student`
    );
  });

  it("does not request or render roster names before explicit class selection", async () => {
    fetchDeanReadMock.mockResolvedValue({ periods: [period] });

    render(
      await DeanEnrollmentRosterPage({ searchParams: Promise.resolve({ period: PERIOD_ID }) })
    );

    expect(screen.getByText("Select a class roster")).toBeInTheDocument();
    expect(fetchDeanReadMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("list", { name: "Class display names" })).not.toBeInTheDocument();
  });

  it("does not request roster data when period is missing", async () => {
    fetchDeanReadMock.mockResolvedValue({ periods: [period] });

    render(
      await DeanEnrollmentRosterPage({
        searchParams: Promise.resolve({ assignment: ASSIGNMENT_ID }),
      })
    );

    expect(screen.getByText("Select a class roster")).toBeInTheDocument();
    expect(fetchDeanReadMock).toHaveBeenCalledTimes(1);
  });
});
