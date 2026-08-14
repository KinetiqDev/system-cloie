import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InstitutionalOutcomeFormDialog } from "@/features/outcomes/components/institutional-outcome-form-dialog";
import { prepareCreateInstitutionalOutcomeAction } from "@/lib/actions/institutional-outcome-actions";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));
vi.mock("@/lib/actions/institutional-outcome-actions", () => ({
  commitInstitutionalOutcomeAction: vi.fn(),
  prepareCreateInstitutionalOutcomeAction: vi.fn(),
  prepareUpdateInstitutionalOutcomeAction: vi.fn(),
}));

const prepareCreateMock = vi.mocked(prepareCreateInstitutionalOutcomeAction);

const existingOutcome = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "ILO-1",
  description: "Reason with evidence.",
  order: 0,
  is_active: true,
};

const newOutcome = {
  code: "ILO-2",
  description: "Collaborate across disciplines.",
  order: 1,
  is_active: true,
};

describe("InstitutionalOutcomeFormDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the full current and proposed catalog before confirming a creation", async () => {
    prepareCreateMock.mockResolvedValue({
      success: true,
      review: {
        input: {
          kind: "ILO",
          action: "create",
          code: newOutcome.code,
          description: newOutcome.description,
        },
        before: [existingOutcome],
        after: [existingOutcome, newOutcome],
        freshnessToken: "fresh-catalog",
        signature: "signature",
      },
    });

    render(<InstitutionalOutcomeFormDialog mode="create" open onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Code"), { target: { value: newOutcome.code } });
    fireEvent.change(screen.getByLabelText("Statement"), {
      target: { value: newOutcome.description },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review Changes" }));

    const before = await screen.findByRole("region", { name: "Before" });
    const after = screen.getByRole("region", { name: "After" });

    expect(within(before).getByText(existingOutcome.code)).toBeInTheDocument();
    expect(within(before).queryByText(newOutcome.code)).not.toBeInTheDocument();
    expect(within(before).getByText(existingOutcome.description)).toBeInTheDocument();
    expect(within(after).getByText(existingOutcome.code)).toBeInTheDocument();
    expect(within(after).getByText(newOutcome.code)).toBeInTheDocument();
    expect(within(after).getByText(newOutcome.description)).toBeInTheDocument();
  });
});
