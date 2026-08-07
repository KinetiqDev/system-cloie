import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RolloverRunner } from "@/features/academic-calendar/components/rollover-runner";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

describe("RolloverRunner", () => {
  const mockSourceTerm: TermInstanceItem = {
    id: "term-1",
    schoolYearId: "sy-1",
    schoolYearCode: "2025-2026",
    semester: "FIRST",
    term: null,
    startDate: null,
    endDate: null,
    status: "ACTIVE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTargetTerm: TermInstanceItem = {
    id: "term-2",
    schoolYearId: "sy-1",
    schoolYearCode: "2025-2026",
    semester: "SECOND",
    term: null,
    startDate: null,
    endDate: null,
    status: "PLANNED",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("shows confirm step initially", () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        wouldProcessCount: 10,
        wouldCreateCount: 8,
        wouldSkipCount: 2,
        exceptions: [],
      },
    });

    const runAction = vi.fn();

    render(
      <RolloverRunner
        sourceTerm={mockSourceTerm}
        targetTerm={mockTargetTerm}
        previewAction={previewAction}
        runAction={runAction}
      />
    );

    expect(screen.getByText("Confirm Term Rollover")).toBeInTheDocument();
    expect(screen.getByText("Preview Rollover")).toBeInTheDocument();
  });

  it("loads and displays preview data", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        wouldProcessCount: 10,
        wouldCreateCount: 8,
        wouldSkipCount: 2,
        exceptions: [
          {
            studentUserId: "student-1",
            studentName: "John Doe",
            studentEmail: "john@test.com",
            exceptionType: "GRADUATING" as const,
            currentYearLevel: "FOURTH_YEAR",
            message: "Student is in 4th year and marked for graduation.",
          },
        ],
      },
    });

    const runAction = vi.fn();

    render(
      <RolloverRunner
        sourceTerm={mockSourceTerm}
        targetTerm={mockTargetTerm}
        previewAction={previewAction}
        runAction={runAction}
      />
    );

    const previewButton = screen.getByText("Preview Rollover");
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  it("shows running state during rollover", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        wouldProcessCount: 10,
        wouldCreateCount: 8,
        wouldSkipCount: 2,
        exceptions: [],
      },
    });

    const runAction = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              success: true,
              data: {
                processedCount: 10,
                createdCount: 8,
                skippedCount: 2,
                exceptions: [],
              },
            });
          }, 100);
        })
    );

    render(
      <RolloverRunner
        sourceTerm={mockSourceTerm}
        targetTerm={mockTargetTerm}
        previewAction={previewAction}
        runAction={runAction}
      />
    );

    // First, load preview
    fireEvent.click(screen.getByText("Preview Rollover"));
    await waitFor(() => {
      expect(screen.getByText("Run Rollover")).toBeInTheDocument();
    });

    // Then run the rollover
    fireEvent.click(screen.getByText("Run Rollover"));

    await waitFor(() => {
      expect(screen.getByText("Running Rollover...")).toBeInTheDocument();
    });
  });

  it("shows results after successful rollover", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        wouldProcessCount: 10,
        wouldCreateCount: 8,
        wouldSkipCount: 2,
        exceptions: [],
      },
    });

    const runAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        processedCount: 10,
        createdCount: 8,
        skippedCount: 2,
        exceptions: [],
      },
    });

    render(
      <RolloverRunner
        sourceTerm={mockSourceTerm}
        targetTerm={mockTargetTerm}
        previewAction={previewAction}
        runAction={runAction}
      />
    );

    // Load preview
    fireEvent.click(screen.getByText("Preview Rollover"));
    await waitFor(() => {
      expect(screen.getByText("Run Rollover")).toBeInTheDocument();
    });

    // Run rollover
    fireEvent.click(screen.getByText("Run Rollover"));

    await waitFor(() => {
      expect(screen.getByText("Rollover Complete")).toBeInTheDocument();
      expect(screen.getByText("Students Processed")).toBeInTheDocument();
    });
  });

  it("displays exceptions in results", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        wouldProcessCount: 5,
        wouldCreateCount: 4,
        wouldSkipCount: 0,
        exceptions: [
          {
            studentUserId: "student-1",
            studentName: "Jane Smith",
            studentEmail: "jane@test.com",
            exceptionType: "GRADUATING" as const,
            currentYearLevel: "FOURTH_YEAR",
            message: "Student is in 4th year and marked for graduation.",
          },
        ],
      },
    });

    const runAction = vi.fn().mockResolvedValue({
      success: true,
      data: {
        processedCount: 5,
        createdCount: 4,
        skippedCount: 0,
        exceptions: [
          {
            studentUserId: "student-1",
            studentName: "Jane Smith",
            studentEmail: "jane@test.com",
            exceptionType: "GRADUATING" as const,
            currentYearLevel: "FOURTH_YEAR",
            message: "Student is in 4th year and marked for graduation.",
          },
        ],
      },
    });

    render(
      <RolloverRunner
        sourceTerm={mockSourceTerm}
        targetTerm={mockTargetTerm}
        previewAction={previewAction}
        runAction={runAction}
      />
    );

    // Load preview and run
    fireEvent.click(screen.getByText("Preview Rollover"));
    await waitFor(() => {
      expect(screen.getByText("Run Rollover")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Run Rollover"));

    await waitFor(() => {
      expect(screen.getByText("Rollover Complete")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Graduating")).toBeInTheDocument();
    });
  });

  it("handles preview errors gracefully", async () => {
    const previewAction = vi.fn().mockResolvedValue({
      success: false,
      error: "Failed to load preview",
    });

    const runAction = vi.fn();

    render(
      <RolloverRunner
        sourceTerm={mockSourceTerm}
        targetTerm={mockTargetTerm}
        previewAction={previewAction}
        runAction={runAction}
      />
    );

    fireEvent.click(screen.getByText("Preview Rollover"));

    await waitFor(() => {
      expect(screen.getByText("Confirm Term Rollover")).toBeInTheDocument();
    });
  });
});
