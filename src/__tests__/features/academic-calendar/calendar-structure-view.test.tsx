// fallow-ignore-file code-duplication
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  activateSchoolYearActionMock,
  archiveSchoolYearActionMock,
  deactivateSchoolYearActionMock,
  setActiveSemesterActionMock,
  transitionPeriodStatusActionMock,
  showToastMock,
} = vi.hoisted(() => ({
  activateSchoolYearActionMock: vi.fn(),
  archiveSchoolYearActionMock: vi.fn(),
  deactivateSchoolYearActionMock: vi.fn(),
  setActiveSemesterActionMock: vi.fn(),
  transitionPeriodStatusActionMock: vi.fn(),
  showToastMock: vi.fn(),
}));

const { refreshMock } = vi.hoisted(() => ({ refreshMock: vi.fn() }));

vi.mock("@/lib/actions/secretary-school-year-actions", () => ({
  activateSchoolYearAction: activateSchoolYearActionMock,
  archiveSchoolYearAction: archiveSchoolYearActionMock,
  deactivateSchoolYearAction: deactivateSchoolYearActionMock,
  setActiveSemesterAction: setActiveSemesterActionMock,
  transitionPeriodStatusAction: transitionPeriodStatusActionMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));

vi.mock("@/components/ui/toast", () => ({
  showToast: showToastMock,
}));

import { CalendarStructureView } from "@/features/academic-calendar/components/calendar-structure-view";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

const term = (overrides: Partial<SchoolYearWithTerms["termInstances"][number]> = {}) =>
  ({
    id: `ti-${overrides.semester ?? "FIRST"}-${overrides.term ?? "FIRST_TERM"}`,
    schoolYearId: "sy-1",
    schoolYearCode: "2026-2027",
    semester: overrides.semester ?? "FIRST",
    term: overrides.term ?? "FIRST_TERM",
    startDate: null,
    endDate: null,
    status: overrides.status ?? "PLANNED",
    createdAt: new Date("2026-06-01"),
    updatedAt: new Date("2026-06-01"),
    ...overrides,
  }) as SchoolYearWithTerms["termInstances"][number];

const schoolYear = (overrides: Partial<SchoolYearWithTerms> = {}): SchoolYearWithTerms => ({
  id: "sy-1",
  code: "2026-2027",
  startDate: new Date("2026-06-01"),
  endDate: new Date("2027-05-31"),
  isArchived: false,
  isActive: true,
  activeSemester: "FIRST",
  archivedAt: null,
  archivedBy: null,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  termInstances: [
    term({ status: "PLANNED" }),
    term({ id: "ti-FIRST-SECOND_TERM", term: "SECOND_TERM", status: "ACTIVE" }),
    term({ id: "ti-SECOND-FIRST_TERM", semester: "SECOND" }),
    term({
      id: "ti-SECOND-SECOND_TERM",
      semester: "SECOND",
      term: "SECOND_TERM",
      status: "COMPLETED",
    }),
    term({ id: "ti-SUMMER", semester: "SUMMER", term: null }),
  ],
  ...overrides,
});

describe("CalendarStructureView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the School Year, semester, and term hierarchy with status badges", () => {
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    expect(screen.getByText("2026-2027")).toBeInTheDocument();
    expect(screen.getByText("1st Semester")).toBeInTheDocument();
    expect(screen.getByText("2nd Semester")).toBeInTheDocument();
    expect(screen.getAllByText("Summer").length).toBeGreaterThan(0);

    expect(screen.getAllByText("1st Term").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2nd Term").length).toBeGreaterThan(0);

    expect(screen.getAllByText("COMPLETED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ACTIVE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PLANNED").length).toBeGreaterThan(0);
  });

  it("shows the Active badge and Deactivate for an active School Year", () => {
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Deactivate/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Activate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive/ })).not.toBeInTheDocument();
  });

  it("shows Activate and Archive for an inactive School Year", () => {
    render(
      <CalendarStructureView
        schoolYears={[schoolYear({ isActive: false, activeSemester: null })]}
      />
    );

    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Activate/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Archive/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Deactivate/ })).not.toBeInTheDocument();
  });

  it("renders no lifecycle buttons for an archived School Year", () => {
    render(<CalendarStructureView schoolYears={[schoolYear({ isArchived: true })]} />);

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Activate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Deactivate/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Archive/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Make Active/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Complete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cancel/ })).not.toBeInTheDocument();
  });

  it("shows the archive metadata line on an archived School Year card", () => {
    render(
      <CalendarStructureView
        schoolYears={[
          schoolYear({
            isArchived: true,
            archivedAt: new Date("2025-03-18"),
            archivedBy: { id: "user-1", name: "Maria Santos" },
          }),
        ]}
      />
    );

    expect(
      screen.getByText(/Archived Mar 18, 2025 · by Maria Santos/)
    ).toBeInTheDocument();
  });

  it("omits the archive metadata line when no audit record exists", () => {
    render(<CalendarStructureView schoolYears={[schoolYear({ isArchived: true })]} />);

    expect(screen.queryByText(/Archived .* by/)).not.toBeInTheDocument();
  });

  it("shows a success toast when a School Year is archived", async () => {
    archiveSchoolYearActionMock.mockResolvedValue({ success: true });
    render(
      <CalendarStructureView
        schoolYears={[
          schoolYear({ code: "2024-2025", isActive: false, activeSemester: null }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Archive/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Archive School Year" }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith("2024-2025 archived", "success");
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("shows per-status term actions: Make Active only on hierarchy-eligible PLANNED, Complete/Cancel on ACTIVE, none on terminal", () => {
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    expect(screen.getAllByRole("button", { name: /Make Active/ }).length).toBe(1); // FIRST/FIRST_TERM only
    expect(screen.getAllByRole("button", { name: /Complete/ }).length).toBe(1);
    expect(screen.getAllByRole("button", { name: /Cancel/ }).length).toBe(1);
  });

  it("offers no Make Active for planned terms outside the active semester", () => {
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    const secondSemesterBlock = screen.getByText("2nd Semester").closest("div")?.parentElement;
    expect(secondSemesterBlock).not.toBeNull();
    expect(
      within(secondSemesterBlock as HTMLElement).queryByRole("button", { name: /Make Active/ })
    ).not.toBeInTheDocument();
  });

  it("offers no Make Active when the school year is inactive", () => {
    render(
      <CalendarStructureView
        schoolYears={[schoolYear({ isActive: false, activeSemester: null })]}
      />
    );

    expect(screen.queryByRole("button", { name: /Make Active/ })).not.toBeInTheDocument();
  });

  it("activates a PLANNED term through the transition action on confirm", async () => {
    transitionPeriodStatusActionMock.mockResolvedValue({ success: true });
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Make Active/ })[0]);
    expect(screen.getByText("Set Active Term")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Set as Active" }));

    await waitFor(() => {
      expect(transitionPeriodStatusActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = transitionPeriodStatusActionMock.mock.calls[0][0];
    expect(formData.get("periodId")).toBe("ti-FIRST-FIRST_TERM");
    expect(formData.get("target")).toBe("ACTIVE");
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("completes an ACTIVE term through the transition action", async () => {
    transitionPeriodStatusActionMock.mockResolvedValue({ success: true });
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getByRole("button", { name: /Complete/ }));

    await waitFor(() => {
      expect(transitionPeriodStatusActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = transitionPeriodStatusActionMock.mock.calls[0][0];
    expect(formData.get("periodId")).toBe("ti-FIRST-SECOND_TERM");
    expect(formData.get("target")).toBe("COMPLETED");
  });

  it("activates a School Year with a chosen semester and refreshes the view", async () => {
    activateSchoolYearActionMock.mockResolvedValue({ success: true });
    render(
      <CalendarStructureView
        schoolYears={[schoolYear({ isActive: false, activeSemester: null })]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Activate/ }));
    expect(screen.getByText("Activate School Year")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(activateSchoolYearActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = activateSchoolYearActionMock.mock.calls[0][0];
    expect(formData.get("id")).toBe("sy-1");
    expect(formData.get("semester")).toBe("FIRST");
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("sets the active semester on a semester row", async () => {
    setActiveSemesterActionMock.mockResolvedValue({ success: true });
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getAllByRole("button", { name: /Set Active Semester/ })[0]);

    await waitFor(() => {
      expect(setActiveSemesterActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = setActiveSemesterActionMock.mock.calls[0][0];
    expect(formData.get("schoolYearId")).toBe("sy-1");
    expect(formData.get("semester")).toBe("FIRST");
  });

  it("surfaces a server error from a transition", async () => {
    transitionPeriodStatusActionMock.mockResolvedValue({
      success: false,
      error: "Period semester does not match the school year's active semester",
    });
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getByRole("button", { name: /Complete/ }));

    await waitFor(() => {
      expect(
        screen.getByText("Period semester does not match the school year's active semester")
      ).toBeInTheDocument();
    });
  });

  it("recovers controls when a lifecycle action throws", async () => {
    transitionPeriodStatusActionMock.mockRejectedValue(new Error("network"));
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getByRole("button", { name: /Complete/ }));

    await waitFor(() => {
      expect(screen.getByText("Action failed; please try again")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Complete/ })).not.toBeDisabled();
  });

  it("confirms before archiving a School Year and fires the action once", async () => {
    archiveSchoolYearActionMock.mockResolvedValue({ success: true });
    render(
      <CalendarStructureView
        schoolYears={[schoolYear({ isActive: false, activeSemester: null })]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Archive/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Archive this School Year?")).toBeInTheDocument();
    expect(archiveSchoolYearActionMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Archive School Year" }));

    await waitFor(() => expect(archiveSchoolYearActionMock).toHaveBeenCalledTimes(1));
    const formData = archiveSchoolYearActionMock.mock.calls[0][0];
    expect(formData.get("id")).toBe("sy-1");
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("does not archive when the confirmation is dismissed", async () => {
    render(
      <CalendarStructureView
        schoolYears={[schoolYear({ isActive: false, activeSemester: null })]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Archive/ }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep Current State" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(archiveSchoolYearActionMock).not.toHaveBeenCalled();
  });

  it("confirms before cancelling an ACTIVE term and fires the transition once", async () => {
    transitionPeriodStatusActionMock.mockResolvedValue({ success: true });
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Cancel this term?")).toBeInTheDocument();
    expect(transitionPeriodStatusActionMock).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel Term" }));

    await waitFor(() => expect(transitionPeriodStatusActionMock).toHaveBeenCalledTimes(1));
    const formData = transitionPeriodStatusActionMock.mock.calls[0][0];
    expect(formData.get("periodId")).toBe("ti-FIRST-SECOND_TERM");
    expect(formData.get("target")).toBe("CANCELLED");
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("does not cancel the term when the confirmation is dismissed", async () => {
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Keep Current State" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(transitionPeriodStatusActionMock).not.toHaveBeenCalled();
  });

  it("uses destructive semantics on the confirmation action", async () => {
    render(<CalendarStructureView schoolYears={[schoolYear()]} />);

    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    const dialog = await screen.findByRole("alertdialog");

    expect(within(dialog).getByRole("button", { name: "Cancel Term" })).toHaveClass(
      "text-destructive"
    );
  });
});
