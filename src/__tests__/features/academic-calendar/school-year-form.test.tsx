import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSchoolYearActionMock } = vi.hoisted(() => ({
  createSchoolYearActionMock: vi.fn(),
}));

vi.mock("@/lib/actions/secretary-school-year-actions", () => ({
  createSchoolYearAction: createSchoolYearActionMock,
  setActiveTermInstanceAction: vi.fn(),
}));

import { SchoolYearForm } from "@/features/academic-calendar/components/school-year-form";

const successResponse = { success: true as const, data: { id: "sy-1", code: "2025-2026" } };
const errorResponse = { success: false as const, error: "Start year already exists" };

describe("SchoolYearForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an out-of-range start year without calling the action", async () => {
    createSchoolYearActionMock.mockResolvedValue(successResponse);
    render(<SchoolYearForm open onOpenChange={vi.fn()} />);

    const input = screen.getByLabelText("Start Year");
    expect(input).toHaveAttribute("aria-describedby", "start-year-help");

    fireEvent.change(input, { target: { value: "1999" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid start year/i)
      ).toBeInTheDocument();
    });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "start-year-error");
    expect(createSchoolYearActionMock).not.toHaveBeenCalled();
  });

  it("previews the school year range and submits on success", async () => {
    createSchoolYearActionMock.mockResolvedValue(successResponse);
    const onOpenChange = vi.fn();
    render(<SchoolYearForm open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("Start Year"), { target: { value: "2025" } });
    expect(screen.getByText("2025-2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(createSchoolYearActionMock).toHaveBeenCalledTimes(1);
    });
    const formData = createSchoolYearActionMock.mock.calls[0][0];
    expect(formData.get("startYear")).toBe("2025");

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("surfaces a server error and keeps the dialog open", async () => {
    createSchoolYearActionMock.mockResolvedValue(errorResponse);
    const onOpenChange = vi.fn();
    render(<SchoolYearForm open onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText("Start Year"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByText("Start year already exists")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Start Year")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Start Year")).toHaveAttribute("aria-describedby", "start-year-error");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("disables the create button while pending", async () => {
    let resolveAction: (value: { success: false; error: string }) => void = () => {};
    createSchoolYearActionMock.mockImplementation(
      () => new Promise((resolve) => (resolveAction = resolve))
    );
    render(<SchoolYearForm open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Start Year"), { target: { value: "2025" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    });

    resolveAction(errorResponse);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
    });
  });
});
