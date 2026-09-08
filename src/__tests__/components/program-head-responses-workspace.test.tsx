import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { render, screen } from "@testing-library/react";
import SelectedProgramResponsesLoading from "@/app/(app)/program-head/programs/[programId]/responses/loading";
import { ProgramHeadResponsesContentFallback } from "@/features/analytics/components/program-head-responses-content-fallback";
import { ProgramHeadResponsesWorkspace } from "@/features/analytics/components/program-head-responses-workspace";

describe("ProgramHeadResponsesWorkspace", () => {
  it("preserves filters while scoping the busy region to the evaluation evidence", () => {
    render(
      <ProgramHeadResponsesWorkspace tab="program-wide" filters={<div>Filters</div>}>
        <p>Evidence</p>
      </ProgramHeadResponsesWorkspace>
    );

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    const region = screen.getByRole("region", { name: "Program-wide evidence" });
    expect(region).not.toHaveAttribute("aria-busy");
  });

  it("models the evaluation evidence skeleton for scoped reloads", () => {
    render(<ProgramHeadResponsesContentFallback />);

    expect(screen.getByRole("status", { name: "Loading evaluation evidence" })).toBeInTheDocument();
    expect(screen.getByTestId("responses-evidence-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("responses-table-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("responses-cards-skeleton")).toBeInTheDocument();
  });

  it("uses responses-aligned geometry for cold route loading", () => {
    render(<SelectedProgramResponsesLoading />);

    expect(screen.getByRole("status", { name: "Loading responses" })).toBeInTheDocument();
    expect(screen.getByTestId("responses-filter-skeleton")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading evaluation evidence" })).toBeInTheDocument();
  });
});
