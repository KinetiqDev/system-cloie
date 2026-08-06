import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  describe("semantic retokening", () => {
    it("renders with the semantic input surface for the unchecked state", () => {
      render(<Checkbox aria-label="Agree to terms" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveClass("bg-surface-input");
      expect(checkbox).toHaveClass("border-input");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(<Checkbox aria-label="Agree" />);
      const className = screen.getByRole("checkbox").getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("programmatic checked state uses the primary role", () => {
    it("applies primary border and background via Base UI's data-checked state", () => {
      render(<Checkbox defaultChecked aria-label="Agree" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveClass("data-checked:border-primary");
      expect(checkbox).toHaveClass("data-checked:bg-primary");
      expect(checkbox).toHaveClass("data-checked:text-primary-foreground");
      expect(checkbox).toHaveAttribute("data-checked");
    });

    it("exposes the checked state programmatically via aria-checked", () => {
      render(<Checkbox defaultChecked aria-label="Agree" />);
      expect(screen.getByRole("checkbox", { checked: true })).toBeInTheDocument();
    });
  });

  describe("programmatic invalid / disabled state", () => {
    it("exposes aria-invalid and the destructive ring family when invalid", () => {
      render(<Checkbox aria-invalid="true" aria-label="Required" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("aria-invalid", "true");
      expect(checkbox).toHaveClass("aria-invalid:border-destructive");
      expect(checkbox).toHaveClass("aria-invalid:ring-destructive/20");
    });

    it("supports the disabled attribute with a non-color cue (cursor + opacity)", () => {
      render(<Checkbox disabled aria-label="Locked" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveAttribute("data-disabled");
      expect(checkbox).toHaveClass("disabled:cursor-not-allowed");
      expect(checkbox).toHaveClass("disabled:opacity-50");
    });
  });

  describe("focus ring", () => {
    it("uses the dedicated ring semantic role", () => {
      render(<Checkbox aria-label="Agree" />);
      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).toHaveClass("focus-visible:border-ring");
      expect(checkbox).toHaveClass("focus-visible:ring-ring/50");
      expect(checkbox).toHaveClass("focus-visible:ring-3");
    });
  });

  describe("non-color cues", () => {
    it("preserves a visible check affordance via the indicator slot when checked", () => {
      render(<Checkbox defaultChecked aria-label="Agree" />);
      const checkbox = screen.getByRole("checkbox", { checked: true });
      expect(checkbox.querySelector('[data-slot="checkbox-indicator"]')).toBeInTheDocument();
    });
  });

  describe("Base UI exclusive", () => {
    it("does not import Radix primitives", () => {
      render(<Checkbox aria-label="Agree" />);
      // Base UI Checkbox renders role=checkbox on a <span>.
      expect(screen.getByRole("checkbox").tagName.toLowerCase()).toBe("span");
    });
  });
});
