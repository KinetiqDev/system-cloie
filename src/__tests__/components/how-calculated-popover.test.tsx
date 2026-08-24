import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HowCalculatedPopover } from "@/features/analytics/components/how-calculated-popover";

describe("HowCalculatedPopover", () => {
  it("opens a disclosure with explanation, counts, and scale label", () => {
    render(
      <HowCalculatedPopover
        label="PLO 1"
        metric={{
          ratingCount: 614,
          responseCount: 163,
          evaluationCount: 8,
          questionCount: 11,
          scaleLabel: "1–5 (5-point)",
          explanation: "Raw mean of 614 valid ratings from 11 contributing CILO(s).",
        }}
      />
    );

    const trigger = screen.getByRole("button", { name: "How calculated: PLO 1" });
    fireEvent.click(trigger);

    expect(screen.getByText("How plo 1 is calculated")).toBeInTheDocument();
    expect(screen.getByText("Raw mean of 614 valid ratings from 11 contributing CILO(s).")).toBeInTheDocument();
    expect(screen.getByText("Scale:")).toBeInTheDocument();
    expect(screen.getByText("1–5 (5-point)")).toBeInTheDocument();
    expect(screen.getByText("614")).toBeInTheDocument();
    expect(screen.getByText("163")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
  });

  it("renders an evidence link only when the summary carries one", () => {
    render(
      <HowCalculatedPopover
        label="Response completion"
        metric={{
          assignmentCount: 400,
          explanation: "Submitted eligible assignments over all in-scope rows.",
          evidenceHref: "/program-head/programs/p1/responses",
        }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "How calculated: Response completion" }));
    expect(screen.getByRole("link", { name: "View underlying evidence" })).toHaveAttribute(
      "href",
      "/program-head/programs/p1/responses"
    );
    expect(screen.getByText("400")).toBeInTheDocument();
  });

  it("renders no counts when the summary has none", () => {
    render(
      <HowCalculatedPopover
        label="Active evaluations"
        metric={{ explanation: "ACTIVE deployments for the selected period." }}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "How calculated: Active evaluations" }));
    expect(screen.getByText("ACTIVE deployments for the selected period.")).toBeInTheDocument();
    expect(screen.queryByText("Scale:")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View underlying evidence" })).not.toBeInTheDocument();
  });
});
