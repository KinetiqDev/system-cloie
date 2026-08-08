import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CloseEvaluationDialog } from "@/features/evaluations/components/close-evaluation-dialog";

function renderDialog(overrides: Partial<Parameters<typeof CloseEvaluationDialog>[0]> = {}) {
  const props = {
    deploymentName: "Intro to CS 2026-2027",
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    isPending: false,
    ...overrides,
  };
  render(<CloseEvaluationDialog {...props} />);
  return props;
}

describe("CloseEvaluationDialog", () => {
  it("identifies the destructive consequence and names the action", () => {
    renderDialog();
    const dialog = screen.getByRole("alertdialog", { name: /close evaluation/i });
    expect(dialog).toHaveTextContent(
      /are you sure you want to close Intro to CS 2026-2027\? this action cannot be undone/i
    );
    expect(screen.getByRole("button", { name: /close evaluation/i })).toHaveClass(
      "text-destructive"
    );
  });

  it("cancels safely without confirming", () => {
    const props = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(props.onOpenChange).toHaveBeenCalledWith(false, expect.anything());
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it("confirms the close action", () => {
    const props = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: /close evaluation/i }));
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables both actions while pending", () => {
    renderDialog({ isPending: true });
    expect(screen.getByRole("button", { name: /close evaluation/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();
  });
});
