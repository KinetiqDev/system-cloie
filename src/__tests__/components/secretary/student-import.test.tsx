// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentImport } from "@/features/users/components/student-import";
import { studentImportAction } from "@/lib/actions/student-import-actions";
vi.mock("@/lib/actions/student-import-actions", () => ({ studentImportAction: vi.fn() }));
const row = {
  line: 2,
  input: {
    name: "Ana",
    email: "ana@acd.edu.ph",
    program_code: "BSIT",
    major_name: "",
    year_level: "1",
    section: "Morning",
  },
  status: "Ready" as const,
  message: "New Student account",
};
beforeEach(() => vi.resetAllMocks());
async function review() {
  render(<StudentImport programs={[]} />);
  fireEvent.change(screen.getByLabelText("Student CSV file"), {
    target: { files: [new File(["csv"], "students.csv", { type: "text/csv" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review file" }));
  await screen.findByRole("heading", { name: "Review every row" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Choose another file" })).toBeEnabled()
  );
}
describe("Student import step-by-step flow", () => {
  it("requires review then confirmation, reports results and resets", async () => {
    vi.mocked(studentImportAction)
      .mockResolvedValueOnce({
        success: true,
        rows: [row],
        token: "signed",
        termId: "term",
        termLabel: "2026-2027 — 2nd Semester — 2nd Term",
      })
      .mockResolvedValueOnce({ success: true, rows: [{ ...row, status: "Created" }] });
    await review();
    expect(studentImportAction).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Continue to confirmation" }));
    expect(screen.getByRole("heading", { name: "Confirm the import" })).toBeInTheDocument();
    expect(screen.getByText(/2026-2027 — 2nd Semester — 2nd Term/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create 1 Student accounts" }));
    await screen.findByRole("heading", { name: "Import results" });
    expect(vi.mocked(studentImportAction).mock.calls[1]![0].get("token")).toBe("signed");
    fireEvent.click(screen.getByRole("button", { name: "Import another file" }));
    expect(screen.getByRole("button", { name: "Review file" })).toBeDisabled();
  });
  it("requires a fresh review when the file is replaced", async () => {
    vi.mocked(studentImportAction).mockResolvedValue({
      success: true,
      rows: [row],
      token: "signed",
      termId: null,
      termLabel: null,
    });
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Choose another file" }));
    expect(screen.getByRole("button", { name: "Review file" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Student CSV file"), {
      target: { files: [new File(["replacement"], "replacement.csv", { type: "text/csv" })] },
    });
    expect(screen.getByRole("button", { name: "Review file" })).toBeEnabled();
    expect(studentImportAction).toHaveBeenCalledTimes(1);
  });
  it("allows retry after a failed review", async () => {
    vi.mocked(studentImportAction)
      .mockResolvedValueOnce({ success: false, error: "Review unavailable" })
      .mockResolvedValueOnce({
        success: true,
        rows: [row],
        token: "retry",
        termId: null,
        termLabel: null,
      });
    render(<StudentImport programs={[]} />);
    fireEvent.change(screen.getByLabelText("Student CSV file"), {
      target: { files: [new File(["csv"], "students.csv", { type: "text/csv" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review file" }));
    await screen.findByText("Review unavailable");
    await waitFor(() => expect(screen.getByRole("button", { name: "Review file" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Review file" }));
    await screen.findByRole("heading", { name: "Review every row" });
    expect(studentImportAction).toHaveBeenCalledTimes(2);
  });
  it("blocks correction rows and all-skipped files", async () => {
    vi.mocked(studentImportAction).mockResolvedValue({
      success: true,
      rows: [{ ...row, status: "Needs correction", message: "Invalid program" }],
      token: "signed",
      termId: null,
      termLabel: null,
    });
    await review();
    expect(screen.getByRole("button", { name: "Continue to confirmation" })).toBeDisabled();
  });
  it("explains deferred enrollment before confirmation", async () => {
    vi.mocked(studentImportAction).mockResolvedValue({
      success: true,
      rows: [row],
      token: "signed",
      termId: null,
      termLabel: null,
    });
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Continue to confirmation" }));
    expect(screen.getByText(/There is no active academic period/)).toBeInTheDocument();
  });
  it("handles stale confirmation by requiring another review", async () => {
    vi.mocked(studentImportAction)
      .mockResolvedValueOnce({
        success: true,
        rows: [row],
        token: "signed",
        termId: "term",
        termLabel: null,
      })
      .mockResolvedValueOnce({ success: false, error: "Review expired" });
    await review();
    fireEvent.click(screen.getByRole("button", { name: "Continue to confirmation" }));
    fireEvent.click(screen.getByRole("button", { name: "Create 1 Student accounts" }));
    await screen.findByText("Review expired");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue to confirmation" })).toBeDisabled()
    );
    expect(screen.getByRole("button", { name: "Review file again" })).toBeInTheDocument();
  });
});
