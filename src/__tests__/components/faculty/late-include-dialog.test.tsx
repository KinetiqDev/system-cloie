import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LateIncludeDialog } from "@/features/evaluations/components/late-include-dialog";

vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

const exclusion = {
  category: "ADMINISTRATIVE_EXCEPTION" as const,
  membershipActive: true,
  membershipId: "membership-1",
  reversalCategory: null,
  reversedAt: null,
  studentName: "Alice Adams",
};

describe("LateIncludeDialog", () => {
  it("offers accessible late inclusion reason flow and sends no notification input", async () => {
    const action = vi.fn().mockResolvedValue({
      success: true,
      data: { message: "Student was included in this evaluation." },
    });

    render(
      <LateIncludeDialog
        action={action}
        evaluationId="evaluation-1"
        exclusions={[exclusion]}
        status="ACTIVE"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /late include/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/reversal reason/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm late inclusion/i }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith({
        evaluationId: "evaluation-1",
        membershipId: "membership-1",
        reversalCategory: "EXCLUDED_IN_ERROR",
      });
    });
  });

  it("hides late inclusion for closed evaluations", () => {
    render(
      <LateIncludeDialog
        action={vi.fn()}
        evaluationId="evaluation-1"
        exclusions={[exclusion]}
        status="CLOSED"
      />
    );

    expect(screen.queryByRole("button", { name: /late include/i })).not.toBeInTheDocument();
  });
});
