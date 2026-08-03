import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ProgramHeadNoAssignmentState,
  ProgramHeadSelector,
} from "@/features/auth/components/program-head-selector";
import { ProgramHeadContextHeader } from "@/features/auth/components/program-head-context-header";

const programs = [
  { id: "program-1", code: "BEED", name: "Elementary Education" },
  { id: "program-2", code: "BSED", name: "Secondary Education" },
];

describe("Program Head context UI", () => {
  it("renders named selector links that can receive keyboard focus", () => {
    render(<ProgramHeadSelector programs={programs} />);

    const beedLink = screen.getByRole("link", { name: "Open BEED" });
    const bsedLink = screen.getByRole("link", { name: "Open BSED" });
    expect(beedLink).toHaveAttribute("href", "/program-head/programs/program-1/dashboard");
    expect(bsedLink).toHaveAttribute("href", "/program-head/programs/program-2/dashboard");

    beedLink.focus();
    expect(document.activeElement).toBe(beedLink);
  });

  it("renders an actionable no-assignment state with a named support link", () => {
    render(<ProgramHeadNoAssignmentState />);

    expect(screen.getByRole("heading", { name: "No Program assigned" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review account profile" })).toHaveAttribute(
      "href",
      "/program-head/profile"
    );
  });

  it("provides a named keyboard-focusable switch link in the selected context header", () => {
    render(<ProgramHeadContextHeader program={programs[1]} />);

    const switchLink = screen.getByRole("link", { name: "Switch selected Program" });
    expect(switchLink).toHaveAttribute("href", "/program-head");
    switchLink.focus();
    expect(document.activeElement).toBe(switchLink);
  });
});
