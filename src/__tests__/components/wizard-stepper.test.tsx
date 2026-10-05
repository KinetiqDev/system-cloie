import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WizardStepper } from "@/components/ui/wizard-stepper";

const steps = [
  { key: "prepare", label: "Prepare" },
  { key: "review", label: "Review" },
  { key: "confirm", label: "Confirm" },
];

describe("WizardStepper", () => {
  it.each(["prepare", "review", "confirm"])(
    "announces %s and marks completed and upcoming steps",
    (currentStep) => {
      const { container } = render(<WizardStepper steps={steps} currentStep={currentStep} />);
      const index = steps.findIndex((step) => step.key === currentStep);
      expect(screen.getByText(`Step ${index + 1} of 3`)).toBeInTheDocument();
      const desktop = container.querySelector(".md\\:flex")!;
      expect(desktop.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
      expect(desktop.querySelector('[aria-current="step"]')).toHaveTextContent(String(index + 1));
      expect(desktop.querySelectorAll("svg")).toHaveLength(index);
      expect(desktop.querySelectorAll(".text-muted-foreground")).toHaveLength((2 - index) * 2);
    }
  );
  it("falls back to the first step for an unknown key", () => {
    render(<WizardStepper steps={steps} currentStep="missing" />);
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });
  it("handles an empty step list", () => {
    render(<WizardStepper steps={[]} currentStep="missing" />);
    expect(screen.getByText("Current step")).toHaveAttribute("aria-current", "step");
  });
});
