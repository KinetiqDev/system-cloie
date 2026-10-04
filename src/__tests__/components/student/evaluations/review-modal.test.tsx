import { fireEvent, render, screen, within } from "@testing-library/react";
import { ReviewModal } from "@/features/responses/components/review-modal";

const { viewport } = vi.hoisted(() => ({ viewport: { desktop: true } }));
vi.mock("@/components/ui/use-media-query", () => ({
  useMediaQuery: () => viewport.desktop,
}));

const sections = [
  {
    id: "feedback",
    name: "Feedback",
    description: "Review your feedback",
    items: [
      {
        kind: "quantitative" as const,
        itemKey: "rating",
        prompt: "Overall rating",
        scale: [1, 2, 3, 4, 5],
      },
      { kind: "qualitative" as const, promptKey: "remarks", prompt: "What could improve?" },
    ],
  },
];
const response =
  "More opportunities to practice would help. ".repeat(40) + "\n\nPlease retain the workshops.";

describe.each([true, false])("ReviewModal desktop=%s", (desktop) => {
  test("keeps the complete written response and explicit submission controls", () => {
    viewport.desktop = desktop;
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <ReviewModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        sections={sections}
        answers={{ "feedback:quantitative:rating": 4, "feedback:qualitative:remarks": response }}
      />
    );
    const dialog = screen.getByRole("dialog", { name: "Review Your Answers" });
    const body = within(dialog).getByRole("region", { name: "Review answers" });
    expect(
      within(body).getByText(
        (_, element) => element?.tagName === "P" && element.textContent === response
      )
    ).toBeInTheDocument();
    expect(within(body).getByText("4")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Go Back" }));
    expect(onClose).toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm & Submit" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});
