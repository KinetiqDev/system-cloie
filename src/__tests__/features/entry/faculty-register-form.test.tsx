import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FacultyRegisterForm } from "@/features/entry/components/faculty-register-form";

const { requestFacultyAccessMock } = vi.hoisted(() => ({
  requestFacultyAccessMock: vi.fn(),
}));

vi.mock("@/lib/actions/faculty-actions", () => ({
  requestFacultyAccess: requestFacultyAccessMock,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
const PROGRAMS = [{ id: "11111111-1111-4111-8111-111111111111", name: "InfoTech", code: "BSIT" }];

async function submitWithProgram() {
  render(<FacultyRegisterForm email="applicant@acd.edu.ph" programs={PROGRAMS} />);
  fireEvent.click(screen.getByRole("combobox", { name: /primary program affiliation/i }));
  fireEvent.click(screen.getByRole("option", { name: /BSIT — InfoTech/ }));
  fireEvent.click(screen.getByRole("button", { name: /submit faculty request/i }));
}

describe("FacultyRegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits the chosen program affiliation and shows the pending explanation", async () => {
    requestFacultyAccessMock.mockResolvedValue({ success: true });
    await submitWithProgram();

    await waitFor(() => {
      expect(requestFacultyAccessMock).toHaveBeenCalledWith({
        program_id: "11111111-1111-4111-8111-111111111111",
      });
    });
    expect(screen.getByText("Request received")).toBeInTheDocument();
    expect(screen.getByText(/no faculty workspace access until/i)).toBeInTheDocument();
  });

  it("surfaces the action error without the pending state", async () => {
    requestFacultyAccessMock.mockResolvedValue({ success: false, error: "Not eligible." });
    await submitWithProgram();

    await waitFor(() => {
      expect(screen.getByText("Not eligible.")).toBeInTheDocument();
    });
    expect(screen.queryByText("Request received")).not.toBeInTheDocument();
  });
});
