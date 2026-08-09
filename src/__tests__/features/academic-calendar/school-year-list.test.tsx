import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSchoolYearActionMock, setActiveTermInstanceActionMock } = vi.hoisted(() => ({
  createSchoolYearActionMock: vi.fn(),
  setActiveTermInstanceActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/secretary-school-year-actions", () => ({
  createSchoolYearAction: createSchoolYearActionMock,
  setActiveTermInstanceAction: setActiveTermInstanceActionMock,
}));

import { SchoolYearList } from "@/features/academic-calendar/components/school-year-list";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

const schoolYear = (overrides: Partial<SchoolYearWithTerms> = {}): SchoolYearWithTerms => ({
  id: "sy-1",
  code: "2025-2026",
  startDate: new Date("2025-06-01"),
  endDate: new Date("2026-03-31"),
  isArchived: false,
  archivedAt: null,
  archivedBy: null,
  createdAt: new Date("2025-06-01"),
  updatedAt: new Date("2025-06-01"),
  termInstances: [
    {
      id: "ti-active",
      schoolYearId: "sy-1",
      schoolYearCode: "2025-2026",
      semester: "FIRST",
      term: "FIRST_TERM",
      startDate: null,
      endDate: null,
      status: "ACTIVE",
      createdAt: new Date("2025-06-01"),
      updatedAt: new Date("2025-06-01"),
    },
    {
      id: "ti-planned",
      schoolYearId: "sy-1",
      schoolYearCode: "2025-2026",
      semester: "SECOND",
      term: "SECOND_TERM",
      startDate: null,
      endDate: null,
      status: "PLANNED",
      createdAt: new Date("2025-06-01"),
      updatedAt: new Date("2025-06-01"),
    },
  ],
  ...overrides,
});

describe("SchoolYearList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the semantic empty state when no school years exist", () => {
    render(<SchoolYearList schoolYears={[]} onRefresh={vi.fn()} />);
    expect(screen.getByText("No school years found")).toBeInTheDocument();
    expect(screen.getByText("Create a school year to get started")).toBeInTheDocument();
  });

  it("expands a school year to reveal its term instances", async () => {
    render(<SchoolYearList schoolYears={[schoolYear()]} onRefresh={vi.fn()} />);

    expect(screen.getByText("2025-2026")).toBeInTheDocument();
    expect(screen.queryByText("1st Term")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("2025-2026"));

    await waitFor(() => {
      expect(screen.getByText("1st Term")).toBeInTheDocument();
    });
    expect(screen.getByText("2 terms")).toBeInTheDocument();
  });

  it("marks the active term instance with an Active badge", async () => {
    render(<SchoolYearList schoolYears={[schoolYear()]} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText("2025-2026"));

    await waitFor(() => {
      expect(screen.getByText("1st Term")).toBeInTheDocument();
    });

    const rows = screen.getAllByRole("row");
    const activeRow = rows.find((row) => row.textContent?.includes("1st Semester"));
    const plannedRow = rows.find((row) => row.textContent?.includes("2nd Semester"));
    expect(activeRow).toBeDefined();
    expect(within(activeRow!).getByText("Active")).toHaveClass("bg-success-soft");
    expect(within(plannedRow!).queryByText("Active")).not.toBeInTheDocument();
  });

  it("offers Set Active only for non-active terms of an unarchived year", async () => {
    render(<SchoolYearList schoolYears={[schoolYear()]} onRefresh={vi.fn()} />);
    fireEvent.click(screen.getByText("2025-2026"));

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Set Active" })).toHaveLength(1);
    });
  });

  it("offers no Add Term action and no Set Active for an archived year", async () => {
    const archived = schoolYear({ isArchived: true });
    render(<SchoolYearList schoolYears={[archived]} onRefresh={vi.fn()} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add Term" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set Active" })).not.toBeInTheDocument();
  });

  it("shows the empty term table state inside an expanded year", async () => {
    render(
      <SchoolYearList schoolYears={[schoolYear({ termInstances: [] })]} onRefresh={vi.fn()} />
    );
    fireEvent.click(screen.getByText("2025-2026"));

    await waitFor(() => {
      expect(screen.getByText(/no term instances yet/i)).toBeInTheDocument();
    });
  });
});
