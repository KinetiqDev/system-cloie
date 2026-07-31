import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LegalAcknowledgementDialog } from "@/features/legal/components/legal-acknowledgement-dialog";

const signInWithOAuthMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: signInWithOAuthMock } }),
}));

describe("LegalAcknowledgementDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires acknowledgement, starts the ticket request, and preserves intent", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
    signInWithOAuthMock.mockResolvedValue({ error: null });
    const onOpenChange = vi.fn();
    render(<LegalAcknowledgementDialog open onOpenChange={onOpenChange} roleTitle="Industry Partner" intent="industry-partner" />);

    expect(screen.getByRole("dialog")).toHaveClass(
      "h-[min(760px,calc(100vh-2rem))]",
      "grid-rows-[auto_minmax(0,1fr)_auto]"
    );
    const footer = screen.getByRole("checkbox").closest('[data-slot="dialog-footer"]');
    expect(footer).toContainElement(screen.getByRole("button", { name: "Agree and Continue with Google" }));
    expect(footer).toHaveClass("flex-col", "sm:flex-col", "items-stretch");
    expect(screen.getByRole("checkbox").closest("div.flex")).toHaveClass("w-full");

    const continueButton = screen.getByRole("button", { name: "Agree and Continue with Google" });
    expect(continueButton).toBeDisabled();
    fireEvent.click(continueButton);
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(continueButton).toBeEnabled();
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/auth/legal-acknowledgement",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ intent: "industry-partner", privacyVersion: "1.0", termsVersion: "1.0" }),
        })
      );
      expect(signInWithOAuthMock).toHaveBeenCalledWith(
        expect.objectContaining({
          options: { redirectTo: expect.stringContaining("intent=industry-partner") },
        })
      );
    });
    fetchMock.mockRestore();
  });

  it("shows a recoverable error and does not start OAuth when the ticket request fails", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Try again." }), { status: 400 })
    );
    render(<LegalAcknowledgementDialog open onOpenChange={vi.fn()} roleTitle="Student" intent="student" />);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Agree and Continue with Google" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Try again.");
    expect(signInWithOAuthMock).not.toHaveBeenCalled();
  });
});
