import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RolloverExceptionsTable } from "@/features/academic-calendar/components/rollover-exceptions-table";
import type { RolloverException } from "@/features/academic-calendar/services/run-term-rollover";

const exception: RolloverException = {
  studentUserId: "student-1",
  studentName: "Jane Smith",
  studentEmail: "jane@test.com",
  exceptionType: "GRADUATING",
  currentYearLevel: "FOURTH_YEAR",
  message: "Student is in 4th year and marked for graduation.",
};

describe("RolloverExceptionsTable", () => {
  it("shows the successful empty state when there are no exceptions", () => {
    render(<RolloverExceptionsTable exceptions={[]} />);
    expect(
      screen.getByText("No exceptions — all students processed successfully.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders exception rows with student info and semantic status text", () => {
    render(
      <RolloverExceptionsTable
        exceptions={[
          exception,
          {
            ...exception,
            studentUserId: "s2",
            studentName: "John Doe",
            studentEmail: "john@test.com",
            exceptionType: "MISSING_DATA",
            currentYearLevel: "THIRD_YEAR",
            message: "Missing required student data.",
          },
          {
            ...exception,
            studentUserId: "s3",
            studentName: "Sam Lee",
            studentEmail: "sam@test.com",
            exceptionType: "DUPLICATE",
            currentYearLevel: "SECOND_YEAR",
            message: "Student already enrolled in target term.",
          },
        ]}
      />
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@test.com")).toBeInTheDocument();
    expect(screen.getByText("Graduating")).toBeInTheDocument();
    expect(screen.getByText("Missing Data")).toBeInTheDocument();
    expect(screen.getByText("Duplicate")).toBeInTheDocument();
    expect(screen.getByText("Student is in 4th year and marked for graduation.")).toBeInTheDocument();
  });

  it("renders the edit action only when onEditStudent is provided", () => {
    const onEditStudent = vi.fn();
    render(<RolloverExceptionsTable exceptions={[exception]} onEditStudent={onEditStudent} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEditStudent).toHaveBeenCalledWith("student-1");
  });

  it("omits the actions column when no edit callback is provided", () => {
    render(<RolloverExceptionsTable exceptions={[exception]} />);
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByText("Actions")).not.toBeInTheDocument();
  });
});
