import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { addTermInstanceActionMock } = vi.hoisted(() => ({
  addTermInstanceActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/secretary-school-year-actions", () => ({
  addTermInstanceAction: addTermInstanceActionMock,
  createSchoolYearAction: vi.fn(),
  setActiveTermInstanceAction: vi.fn(),
}));

import { TermInstanceForm } from "@/features/academic-calendar/components/term-instance-form";

const successResponse = { success: true as const, data: { id: "ti-1" } };
const errorResponse = { success: false as const, error: "Term already exists" };

describe("TermInstanceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders with the school year context", () => {
    render(
      <TermInstanceForm
        open
        onOpenChange={vi.fn()}
        schoolYearId="sy-1"
        schoolYearCode="2025-2026"
      />
    );

    expect(screen.getByText("Add Term Instance")).toBeInTheDocument();
    expect(
      screen.getByText(/add a semester\/term to school year 2025-2026/i)
    ).toBeInTheDocument();
  });

  it("submits semester and term for a regular semester", async () => {
    addTermInstanceActionMock.mockResolvedValue(successResponse);
    const onOpenChange = vi.fn();
    render(
      <TermInstanceForm
        open
        onOpenChange={onOpenChange}
        schoolYearId="sy-1"
        schoolYearCode="2025-2026"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Term" }));

    await waitFor(() => {
      expect(addTermInstanceActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = addTermInstanceActionMock.mock.calls[0][0];
    expect(formData.get("schoolYearId")).toBe("sy-1");
    expect(formData.get("semester")).toBe("FIRST");
    expect(formData.get("term")).toBe("FIRST_TERM");

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("submits no term for the Summer semester", async () => {
    addTermInstanceActionMock.mockResolvedValue(successResponse);
    render(
      <TermInstanceForm
        open
        onOpenChange={vi.fn()}
        schoolYearId="sy-1"
        schoolYearCode="2025-2026"
      />
    );

    fireEvent.click(screen.getByLabelText("Semester"));
    const summerOption = await screen.findByRole("option", { name: "Summer" });
    fireEvent.mouseMove(summerOption);
    fireEvent.click(summerOption);
    fireEvent.click(screen.getByRole("button", { name: "Add Term" }));

    await waitFor(() => {
      expect(addTermInstanceActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = addTermInstanceActionMock.mock.calls[0][0];
    expect(formData.get("semester")).toBe("SUMMER");
    expect(formData.has("term")).toBe(false);
  });

  it("surfaces a server error inline and keeps the dialog open", async () => {
    addTermInstanceActionMock.mockResolvedValue(errorResponse);
    const onOpenChange = vi.fn();
    render(
      <TermInstanceForm
        open
        onOpenChange={onOpenChange}
        schoolYearId="sy-1"
        schoolYearCode="2025-2026"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Term" }));

    await waitFor(() => {
      expect(screen.getByText("Term already exists")).toBeInTheDocument();
    });
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("disables the add button while pending", async () => {
    let resolveAction: (value: { success: false; error: string }) => void = () => {};
    addTermInstanceActionMock.mockImplementation(
      () => new Promise((resolve) => (resolveAction = resolve))
    );
    render(
      <TermInstanceForm
        open
        onOpenChange={vi.fn()}
        schoolYearId="sy-1"
        schoolYearCode="2025-2026"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Add Term" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    });

    resolveAction(errorResponse);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Add Term" })).toBeEnabled();
    });
  });
});
