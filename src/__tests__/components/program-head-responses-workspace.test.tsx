import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { render, screen } from "@testing-library/react";
import SelectedProgramResponsesLoading from "@/app/(app)/program-head/programs/[programId]/responses/loading";
import { ResponsesContentFallback } from "@/features/response-review/components/responses-content-fallback";
import { ResponsesWorkspace } from "@/features/response-review/components/responses-workspace";

describe("ResponsesWorkspace", () => {
  it("preserves filters while scoping the busy region to the evaluation evidence", () => {
    render(
      <ResponsesWorkspace sectionLabel="Program-wide evidence" filters={<div>Filters</div>}>
        <p>Evidence</p>
      </ResponsesWorkspace>
    );

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByText("Evidence")).toBeInTheDocument();
    const region = screen.getByRole("region", { name: "Program-wide evidence" });
    expect(region).not.toHaveAttribute("aria-busy");
  });

  it("models the evaluation evidence skeleton for scoped reloads", () => {
    render(<ResponsesContentFallback />);

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
