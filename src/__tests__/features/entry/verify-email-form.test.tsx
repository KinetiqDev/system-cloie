import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { VerifyEmailForm } from "@/features/entry/components/verify-email-form";

const { verifyExternalCodeMock, resendVerificationCodeMock } = vi.hoisted(() => ({
  verifyExternalCodeMock: vi.fn(),
  resendVerificationCodeMock: vi.fn(),
}));

vi.mock("@/lib/actions/external-entry-actions", () => ({
  verifyExternalCode: verifyExternalCodeMock,
  resendVerificationCode: resendVerificationCodeMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

const TICKET_REQUIRED = {
  success: false as const,
  error: "Accept the current Privacy Notice and Terms of Use to continue.",
  code: "LEGAL_ACKNOWLEDGEMENT_REQUIRED" as const,
};

function typeCode(value: string) {
  fireEvent.change(screen.getByLabelText("6-digit verification code"), { target: { value } });
}

describe("VerifyEmailForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true }))
    );
  });

  it("shows the registered address read-only when it is pinned", () => {
    render(<VerifyEmailForm email="amara@example.com" emailLocked legalAcknowledged />);

    const field = screen.getByLabelText("Email address");
    expect(field).toHaveValue("amara@example.com");
    expect(field).toHaveAttribute("readonly");
    expect(screen.getByText(/The code goes to this address/)).toBeInTheDocument();
  });

  it("keeps the address editable when nothing is pinned", () => {
    render(<VerifyEmailForm />);

    const field = screen.getByLabelText("Email address");
    expect(field).not.toHaveAttribute("readonly");
    expect(field).toHaveValue("");
  });

  it("asks for the acknowledgement when the server has no valid ticket", () => {
    render(<VerifyEmailForm email="amara@example.com" emailLocked />);

    const submit = screen.getByRole("button", { name: "Verify email" });
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(submit).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resend code" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
  });

  it("omits the acknowledgement when the registration ticket is still valid", () => {
    render(<VerifyEmailForm email="amara@example.com" emailLocked legalAcknowledged />);

    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Verify email" })).toBeEnabled();
  });

  it("re-opens the acknowledgement when the ticket expired between render and submit", async () => {
    verifyExternalCodeMock.mockResolvedValue(TICKET_REQUIRED);
    render(<VerifyEmailForm email="amara@example.com" emailLocked legalAcknowledged />);

    typeCode("123456");
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));

    await waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });
    expect(screen.getByText(TICKET_REQUIRED.error)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify email" })).toBeDisabled();
  });

  it("submits the pinned address with the code", async () => {
    verifyExternalCodeMock.mockResolvedValue({
      success: true,
      message: "If the code matches, your email is now verified.",
    });
    render(<VerifyEmailForm email="amara@example.com" emailLocked legalAcknowledged />);

    typeCode("123456");
    fireEvent.click(screen.getByRole("button", { name: "Verify email" }));

    await waitFor(() => {
      expect(verifyExternalCodeMock).toHaveBeenCalledWith({
        email: "amara@example.com",
        token: "123456",
      });
    });
  });
});
