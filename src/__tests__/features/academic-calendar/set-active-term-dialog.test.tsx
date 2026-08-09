import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { transitionPeriodStatusActionMock } = vi.hoisted(() => ({
  transitionPeriodStatusActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/secretary-school-year-actions", () => ({
  createSchoolYearAction: vi.fn(),
  transitionPeriodStatusAction: transitionPeriodStatusActionMock,
}));

import { SetActiveTermDialog } from "@/features/academic-calendar/components/set-active-term-dialog";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

const term = (overrides: Partial<TermInstanceItem> = {}): TermInstanceItem => ({
  id: "ti-1",
  schoolYearId: "sy-1",
  schoolYearCode: "2025-2026",
  semester: "SECOND",
  term: "FIRST_TERM",
  startDate: null,
  endDate: null,
  status: "PLANNED",
  createdAt: new Date("2025-06-01"),
  updatedAt: new Date("2025-06-01"),
  ...overrides,
});

describe("SetActiveTermDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the term instance id and closes on success", async () => {
    transitionPeriodStatusActionMock.mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();
    render(
      <SetActiveTermDialog termInstance={term()} open onOpenChange={onOpenChange} />
    );

    expect(screen.getByText("Set Active Term")).toBeInTheDocument();
    expect(screen.getByText("2025-2026 — 2nd Semester — 1st Term")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Set as Active" }));

    await waitFor(() => {
      expect(transitionPeriodStatusActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = transitionPeriodStatusActionMock.mock.calls[0][0];
    expect(formData.get("periodId")).toBe("ti-1");
    expect(formData.get("target")).toBe("ACTIVE");
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("surfaces a server error and keeps the dialog open", async () => {
    transitionPeriodStatusActionMock.mockResolvedValue({
      success: false,
      error: "Failed to update active term",
    });
    const onOpenChange = vi.fn();
    render(
      <SetActiveTermDialog termInstance={term()} open onOpenChange={onOpenChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Set as Active" }));

    await waitFor(() => {
      expect(screen.getByText("Failed to update active term")).toBeInTheDocument();
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("disables the submit button when the term is already active", () => {
    render(
      <SetActiveTermDialog
        termInstance={term({ status: "ACTIVE" })}
        open
        onOpenChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Set as Active" })).toBeDisabled();
  });
});
