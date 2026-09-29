import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ExternalRegisterForm } from "@/features/entry/components/external-register-form";

const { registerExternalAccountMock } = vi.hoisted(() => ({
  registerExternalAccountMock: vi.fn(),
}));

vi.mock("@/lib/actions/external-entry-actions", () => ({
  registerExternalAccount: registerExternalAccountMock,
}));

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a>,
}));

function fillForm() {
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Amara Reyes" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "amara@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct-horse-9" },
  });
}

describe("ExternalRegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true }))
    );
  });

  it("will not create the account until the legal acknowledgement is ticked", () => {
    render(<ExternalRegisterForm />);

    fillForm();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Create account" })).toBeEnabled();
    expect(registerExternalAccountMock).not.toHaveBeenCalled();
  });

  it("offers a reveal control on the password field", () => {
    render(<ExternalRegisterForm />);

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
  });

  it("submits the collected values and leaves success to the server hand-off", async () => {
    registerExternalAccountMock.mockResolvedValue({ success: true, message: "" });
    render(<ExternalRegisterForm />);

    fillForm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(registerExternalAccountMock).toHaveBeenCalledWith({
        name: "Amara Reyes",
        email: "amara@example.com",
        password: "correct-horse-9",
        role: "ALUMNI",
      });
    });
    // The success copy now lives on the code step, so nothing is claimed here.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the person on the form with the reason when registration is rejected", async () => {
    registerExternalAccountMock.mockResolvedValue({
      success: false,
      error: "Enter your full name as it should appear on your account.",
    });
    render(<ExternalRegisterForm />);

    fillForm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(
        screen.getByText("Enter your full name as it should appear on your account.")
      ).toBeInTheDocument();
    });
  });
});
