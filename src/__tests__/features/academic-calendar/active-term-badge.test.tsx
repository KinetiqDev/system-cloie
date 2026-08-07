import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ActiveTermBadge,
  ActiveTermBadgeSkeleton,
} from "@/features/academic-calendar/components/active-term-badge";
import type { ActiveTermContext } from "@/features/academic-calendar/types";

const activeTerm: ActiveTermContext = {
  schoolYear: {
    id: "sy-1",
    code: "2025-2026",
    startDate: null,
    endDate: null,
    isArchived: false,
    archivedAt: null,
    archivedBy: null,
    createdAt: new Date("2025-06-01"),
    updatedAt: new Date("2025-06-01"),
  },
  termInstance: {
    id: "ti-1",
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
};

describe("ActiveTermBadge", () => {
  it("renders the active term as a compact success badge", () => {
    render(<ActiveTermBadge activeTerm={activeTerm} />);
    const badge = screen.getByText("2025-2026 | 1st Sem — 1st Term");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-success-soft");
  });

  it("shows a no-active-term state when no active term exists", () => {
    render(<ActiveTermBadge activeTerm={null} />);
    expect(screen.getByText("No active term")).toBeInTheDocument();
  });

  it("renders a semantic loading skeleton with an accessible label", () => {
    render(<ActiveTermBadgeSkeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAccessibleName("Loading active term");
  });
});
