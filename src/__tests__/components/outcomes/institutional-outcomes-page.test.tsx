import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { InstitutionalOutcomesPage } from "@/features/outcomes/components/institutional-outcomes-page";
import {
  commitInstitutionalOutcomeAction,
  prepareArchiveInstitutionalOutcomeAction,
  prepareReorderInstitutionalOutcomesAction,
  prepareRestoreInstitutionalOutcomeAction,
} from "@/lib/actions/institutional-outcome-actions";
import type { InstitutionalOutcomeItem } from "@/features/outcomes/services/manage-institutional-outcomes";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));
vi.mock("@/lib/actions/institutional-outcome-actions", () => ({
  commitInstitutionalOutcomeAction: vi.fn(),
  prepareArchiveInstitutionalOutcomeAction: vi.fn(),
  prepareReorderInstitutionalOutcomesAction: vi.fn(),
  prepareRestoreInstitutionalOutcomeAction: vi.fn(),
  prepareCreateInstitutionalOutcomeAction: vi.fn(),
  prepareUpdateInstitutionalOutcomeAction: vi.fn(),
}));

const commitMock = vi.mocked(commitInstitutionalOutcomeAction);
const prepareArchiveMock = vi.mocked(prepareArchiveInstitutionalOutcomeAction);
const prepareReorderMock = vi.mocked(prepareReorderInstitutionalOutcomesAction);
const prepareRestoreMock = vi.mocked(prepareRestoreInstitutionalOutcomeAction);

function outcome(overrides: Partial<InstitutionalOutcomeItem> = {}): InstitutionalOutcomeItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    code: "ILO-1",
    description: "Reason with evidence.",
    order: 0,
    is_active: true,
    created_at: new Date("2026-08-14T00:00:00Z"),
    updated_at: new Date("2026-08-14T00:00:00Z"),
    ...overrides,
  };
}

function review(action: "archive" | "restore" | "reorder") {
  return {
    input:
      action === "reorder"
        ? {
            kind: "ILO" as const,
            action,
            orderedIds: [
              "22222222-2222-4222-8222-222222222222",
              "11111111-1111-4111-8111-111111111111",
            ],
          }
        : { kind: "ILO" as const, action, id: "11111111-1111-4111-8111-111111111111" },
    before:
      action === "reorder" ? [{ id: "11111111-1111-4111-8111-111111111111", order: 0 }] : outcome(),
    after: action === "archive" ? { ...outcome(), is_active: false } : outcome(),
    freshnessToken: "fresh",
    signature: "aa",
  };
}

describe("InstitutionalOutcomesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commitMock.mockResolvedValue({ success: true });
  });

  it("shows a guided empty state with a create action", () => {
    render(<InstitutionalOutcomesPage outcomes={[]} />);
    expect(screen.getByText("No Institutional Outcomes yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add Outcome" })).toHaveLength(2);
  });

  it("shows archived outcomes and prepares a restore review before committing", async () => {
    prepareRestoreMock.mockResolvedValue({ success: true, review: review("restore") });
    render(<InstitutionalOutcomesPage outcomes={[outcome({ is_active: false })]} />);
    fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(
      await screen.findByRole("heading", { name: "Confirm Institutional Outcome Change" })
    ).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirm Changes" });
    await waitFor(() => expect(confirm).not.toBeDisabled());
    fireEvent.click(confirm);
    await waitFor(() => expect(commitMock).toHaveBeenCalledWith(expect.any(Object), true));
  });

  it("prepares an exact archive review before confirmation", async () => {
    prepareArchiveMock.mockResolvedValue({ success: true, review: review("archive") });
    render(<InstitutionalOutcomesPage outcomes={[outcome()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Archive ILO-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Review Changes" }));
    expect(
      await screen.findByText(
        "Confirm this exact before-and-after change. The save is atomic and rejects stale reviews."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Before")).toHaveTextContent("Active");
    expect(screen.getByLabelText("After")).toHaveTextContent("Archived");
  });

  it("prepares a complete reorder review and rolls back failed preparation", async () => {
    prepareReorderMock.mockResolvedValue({ success: false, error: "Order review failed." });
    render(
      <InstitutionalOutcomesPage
        outcomes={[
          outcome(),
          outcome({ id: "22222222-2222-4222-8222-222222222222", code: "ILO-2", order: 1 }),
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Move ILO-1 down" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Order review failed.");
    expect(prepareReorderMock).toHaveBeenCalledWith([
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(refreshMock).toHaveBeenCalled();
  });

  it("restores the persisted order when a prepared reorder is canceled", async () => {
    prepareReorderMock.mockResolvedValue({ success: true, review: review("reorder") });
    const secondOutcome = outcome({
      id: "22222222-2222-4222-8222-222222222222",
      code: "ILO-2",
      order: 1,
    });
    const { container } = render(
      <InstitutionalOutcomesPage outcomes={[outcome(), secondOutcome]} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Move ILO-1 down" }));
    expect(
      await screen.findByRole("heading", { name: "Confirm Institutional Outcome Change" })
    ).toBeInTheDocument();

    const reviewDialog = screen.getByRole("alertdialog");
    const cancel = within(reviewDialog).getByRole("button", { name: "Cancel" });
    await waitFor(() => expect(cancel).not.toBeDisabled());
    fireEvent.click(cancel);

    await waitFor(() => expect(container.querySelector("article")).toHaveTextContent("ILO-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("restores the persisted order when reorder confirmation is rejected", async () => {
    prepareReorderMock.mockResolvedValue({ success: true, review: review("reorder") });
    commitMock.mockResolvedValue({ success: false, error: "Outcome changed after review." });
    const secondOutcome = outcome({
      id: "22222222-2222-4222-8222-222222222222",
      code: "ILO-2",
      order: 1,
    });
    const { container } = render(
      <InstitutionalOutcomesPage outcomes={[outcome(), secondOutcome]} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Move ILO-1 down" }));
    const confirm = await screen.findByRole("button", { name: "Confirm Changes" });
    await waitFor(() => expect(confirm).not.toBeDisabled());
    fireEvent.click(confirm);

    expect(await screen.findByRole("alert")).toHaveTextContent("Outcome changed after review.");
    expect(container.querySelector("article")).toHaveTextContent("ILO-1");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("reconciles the displayed catalog with refreshed server order", async () => {
    const secondOutcome = outcome({
      id: "22222222-2222-4222-8222-222222222222",
      code: "ILO-2",
      order: 1,
    });
    const { container, rerender } = render(
      <InstitutionalOutcomesPage outcomes={[outcome(), secondOutcome]} />
    );

    rerender(<InstitutionalOutcomesPage outcomes={[secondOutcome, outcome()]} />);

    await waitFor(() => expect(container.querySelector("article")).toHaveTextContent("ILO-2"));
  });
});
