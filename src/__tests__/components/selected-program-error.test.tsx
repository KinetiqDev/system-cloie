import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SelectedProgramError from "@/app/(app)/program-head/programs/[programId]/error";

const pathnameParamsMock = vi.hoisted(() => vi.fn(() => ({ programId: "program-2" })));

vi.mock("next/navigation", () => ({ useParams: pathnameParamsMock }));
vi.mock("@/components/layout/operational-route-error", () => ({
  OperationalRouteError: ({ returnHref }: { returnHref: string }) => (
    <a href={returnHref}>Return to Dashboard</a>
  ),
}));

describe("selected Program error recovery", () => {
  it("returns to the same selected Program dashboard", () => {
    render(<SelectedProgramError error={new Error("private error")} reset={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Return to Dashboard" })).toHaveAttribute(
      "href",
      "/program-head/programs/program-2/dashboard"
    );
  });
});
