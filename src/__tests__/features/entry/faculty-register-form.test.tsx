import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FacultyRegisterForm } from "@/features/entry/components/faculty-register-form";
import { LEGAL_VERSIONS } from "@/features/legal/legal-versions";

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

const fetchMock = vi.fn();

async function fillProgram() {
  fireEvent.click(screen.getByRole("combobox", { name: /primary program affiliation/i }));
  fireEvent.click(screen.getByRole("option", { name: /BSIT — InfoTech/ }));
}

async function submitWithProgram() {
  render(<FacultyRegisterForm email="applicant@acd.edu.ph" programs={PROGRAMS} />);
  await fillProgram();
  fireEvent.click(
    screen.getByRole("checkbox", { name: /I acknowledge that I have read and understood/i })
  );
  fireEvent.click(screen.getByRole("button", { name: /submit faculty request/i }));
}

describe("FacultyRegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
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

  it("obtains the faculty acknowledgement ticket before the gated submit", async () => {
    // The OAuth callback clears the ticket, so an already signed-in applicant
    // holds none. The form must deliberately re-acknowledge to reach the
    // server-side gate, or every real request dead-ends.
    requestFacultyAccessMock.mockResolvedValue({ success: true });
    await submitWithProgram();

    await waitFor(() => {
      expect(requestFacultyAccessMock).toHaveBeenCalled();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/legal-acknowledgement",
      expect.objectContaining({ method: "POST" })
    );
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toEqual({
      intent: "faculty",
      privacyVersion: LEGAL_VERSIONS.privacy,
      termsVersion: LEGAL_VERSIONS.terms,
    });
  });

  it("keeps the submit disabled until the legal documents are acknowledged", async () => {
    render(<FacultyRegisterForm email="applicant@acd.edu.ph" programs={PROGRAMS} />);
    await fillProgram();

    expect(screen.getByRole("button", { name: /submit faculty request/i })).toBeDisabled();
    expect(requestFacultyAccessMock).not.toHaveBeenCalled();
  });

  it("does not submit when the ticket could not be issued", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    requestFacultyAccessMock.mockResolvedValue({ success: true });
    await submitWithProgram();

    await waitFor(() => {
      expect(screen.getByText(/legal documents could not be confirmed/i)).toBeInTheDocument();
    });
    expect(requestFacultyAccessMock).not.toHaveBeenCalled();
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
