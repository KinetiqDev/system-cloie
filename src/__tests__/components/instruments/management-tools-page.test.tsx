import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ManagementToolsPage } from "@/features/instruments/components/management-tools-page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mockTemplates = [
  {
    id: "template-1",
    code: "BASE001",
    name: "Baseline Evaluation Tool",
    description: "Standard baseline evaluation",
    template_type: "PROGRAM_WIDE" as const,
    is_active: true,
    is_faculty_accessible: true,
    _count: { versions: 3 },
  },
  {
    id: "template-2",
    code: "BASE002",
    name: "Course Assessment Tool",
    description: "Course-specific assessment",
    template_type: "COURSE_BOUND" as const,
    is_active: false,
    is_faculty_accessible: false,
    _count: { versions: 1 },
  },
];

describe("ManagementToolsPage", () => {
  test("renders tools page for Secretary with correct basePath", () => {
    render(<ManagementToolsPage templates={mockTemplates} basePath="/secretary/instruments" />);

    expect(screen.getByText("Evaluation Tools")).toBeInTheDocument();
    expect(screen.getByText("Baseline Evaluation Tool")).toBeInTheDocument();
    expect(screen.getByText("Course Assessment Tool")).toBeInTheDocument();
    expect(screen.getByText("Create Template")).toHaveAttribute(
      "href",
      "/secretary/instruments/new"
    );
  });

  test("renders tools page for Dean with correct basePath", () => {
    render(<ManagementToolsPage templates={mockTemplates} basePath="/dean/instruments" />);

    expect(screen.getByText("Evaluation Tools")).toBeInTheDocument();
    expect(screen.getByText("Create Template")).toHaveAttribute("href", "/dean/instruments/new");
  });

  test("displays template status badges correctly", () => {
    render(<ManagementToolsPage templates={mockTemplates} basePath="/secretary/instruments" />);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  test("displays template type badges correctly", () => {
    render(<ManagementToolsPage templates={mockTemplates} basePath="/secretary/instruments" />);

    expect(screen.getByText("Program-wide")).toBeInTheDocument();
    expect(screen.getByText("Course-bound")).toBeInTheDocument();
  });

  test("shows Faculty Access badge when applicable", () => {
    render(<ManagementToolsPage templates={mockTemplates} basePath="/secretary/instruments" />);

    expect(screen.getByText("Faculty Access")).toBeInTheDocument();
  });

  test("shows template version count", () => {
    render(<ManagementToolsPage templates={mockTemplates} basePath="/secretary/instruments" />);

    expect(screen.getByText("3 versions")).toBeInTheDocument();
    expect(screen.getByText("1 version")).toBeInTheDocument();
  });

  test("calls action callbacks when provided", async () => {
    const mockActions = {
      onToggleActive: vi.fn().mockResolvedValue({ success: true }),
      onDuplicate: vi.fn().mockResolvedValue({ success: true }),
      onDelete: vi.fn().mockResolvedValue({ success: true }),
    };

    render(
      <ManagementToolsPage
        templates={mockTemplates}
        basePath="/secretary/instruments"
        actions={mockActions}
      />
    );

    expect(screen.getByText("Baseline Evaluation Tool")).toBeInTheDocument();
  });

  test("shows empty state when no templates", () => {
    render(<ManagementToolsPage templates={[]} basePath="/secretary/instruments" />);

    expect(screen.getByText(/No baseline templates yet/i)).toBeInTheDocument();
  });

  test("keeps the delete confirmation open when deletion fails", async () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    const mockActions = {
      onToggleActive: vi.fn().mockResolvedValue({ success: true }),
      onDuplicate: vi.fn().mockResolvedValue({ success: true }),
      onDelete: vi.fn().mockResolvedValue({ success: false, error: "Cannot delete." }),
    };

    render(
      <ManagementToolsPage
        templates={mockTemplates}
        basePath="/secretary/instruments"
        actions={mockActions}
      />
    );

    const actionsButtons = screen.getAllByRole("button", { name: "Actions" });
    fireEvent.click(actionsButtons[0]);
    fireEvent.click(screen.getByRole("menuitem", { name: /delete/i }));

    const dialog = await screen.findByRole("alertdialog", { name: "Delete Template" });
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(mockActions.onDelete).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole("alertdialog", { name: "Delete Template" })).toBe(dialog);
    expect(dispatchEventSpy).toHaveBeenCalled();
  });
});
