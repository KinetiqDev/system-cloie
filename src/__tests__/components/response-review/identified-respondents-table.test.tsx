import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IdentifiedRespondentsTable } from "@/features/response-review/components/identified-respondents-table";
import type { ProgramHeadAssignmentRespondentRow } from "@/features/response-review/types";

const respondents: ProgramHeadAssignmentRespondentRow[] = [
  {
    assignmentId: "assignment-1",
    responseId: "response-1",
    name: "Alice Reyes",
    stakeholder: "STUDENT",
    status: "SUBMITTED",
    majorLabel: "Software Development",
    yearLevel: "FOURTH_YEAR",
    section: "MORNING",
    assignedAt: new Date("2026-08-01T08:00:00.000Z"),
    submittedAt: new Date("2026-08-05T09:30:00.000Z"),
    quantitativeMean: 4.5,
  },
  {
    assignmentId: "assignment-2",
    responseId: null,
    name: "Bob Cruz",
    stakeholder: "STUDENT",
    status: "IN_PROGRESS",
    majorLabel: null,
    yearLevel: "THIRD_YEAR",
    section: "AFTERNOON",
    assignedAt: new Date("2026-08-01T08:00:00.000Z"),
    submittedAt: null,
    quantitativeMean: null,
  },
  {
    assignmentId: "assignment-3",
    responseId: null,
    name: "Cara Lim",
    stakeholder: "STUDENT",
    status: "NOT_STARTED",
    majorLabel: null,
    yearLevel: "SECOND_YEAR",
    section: "EVENING",
    assignedAt: new Date("2026-08-01T08:00:00.000Z"),
    submittedAt: null,
    quantitativeMean: null,
  },
];

describe("IdentifiedRespondentsTable", () => {
  it("shows every assignment and links only submitted responses", () => {
    render(
      <IdentifiedRespondentsTable
        respondents={respondents}
        responseHrefs={{ "response-1": "/responses/response-1" }}
      />
    );

    expect(screen.getAllByTestId("respondent-row")).toHaveLength(3);
    expect(screen.getAllByTestId("respondent-card")).toHaveLength(3);
    expect(screen.getAllByRole("link", { name: "View Response" })).toHaveLength(2);

    const bobRow = screen.getAllByTestId("respondent-row").find((row) =>
      within(row).queryByText("Bob Cruz")
    );
    expect(bobRow).toBeDefined();
    expect(within(bobRow!).queryByRole("link")).not.toBeInTheDocument();
    expect(within(bobRow!).getByText("In Progress")).toBeInTheDocument();
  });

  it("filters by respondent and assignment status", () => {
    render(
      <IdentifiedRespondentsTable
        respondents={respondents}
        responseHrefs={{ "response-1": "/responses/response-1" }}
      />
    );

    fireEvent.change(screen.getByRole("searchbox", { name: "Search respondents" }), {
      target: { value: "Cara" },
    });
    expect(screen.getAllByTestId("respondent-row")).toHaveLength(1);
    expect(screen.getAllByText("Cara Lim")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Clear Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "In Progress" }));
    expect(screen.getAllByTestId("respondent-row")).toHaveLength(1);
    expect(screen.getAllByText("Bob Cruz")).toHaveLength(2);
  });
});
