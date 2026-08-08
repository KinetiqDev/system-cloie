import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

describe("RadioGroup", () => {
  describe("semantic retokening", () => {
    it("renders with the data-slot", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      expect(screen.getByRole("radiogroup")).toHaveAttribute("data-slot", "radio-group");
    });

    it("renders with the semantic input surface for unchecked items", () => {
      render(
        <RadioGroup defaultValue="pro" aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
          <RadioGroupItem value="pro" aria-label="Pro" />
        </RadioGroup>
      );
      const items = screen.getAllByRole("radio");
      items.forEach((item) => {
        expect(item).toHaveClass("bg-surface-input");
        expect(item).toHaveClass("border-input");
      });
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      const item = screen.getByRole("radio");
      const className = item.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("programmatic selected state uses the primary role", () => {
    it("applies primary border and background via Base UI's data-checked state", () => {
      render(
        <RadioGroup defaultValue="pro" aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
          <RadioGroupItem value="pro" aria-label="Pro" />
        </RadioGroup>
      );
      const checked = screen.getByRole("radio", { checked: true });
      expect(checked).toHaveClass("data-checked:border-primary");
      expect(checked).toHaveClass("data-checked:bg-primary");
      expect(checked).toHaveClass("data-checked:text-primary-foreground");
      expect(checked).toHaveAttribute("data-checked");
    });
  });

  describe("programmatic invalid / disabled state", () => {
    it("exposes aria-invalid when invalid", () => {
      render(
        <RadioGroup aria-invalid="true" aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-invalid", "true");
    });

    it("supports the disabled attribute on a single item with non-color cue", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" disabled aria-label="Free" />
        </RadioGroup>
      );
      const radio = screen.getByRole("radio");
      expect(radio).toHaveAttribute("data-disabled");
      expect(radio).toHaveClass("disabled:cursor-not-allowed");
      expect(radio).toHaveClass("disabled:opacity-50");
    });
  });

  describe("focus ring", () => {
    it("uses the dedicated ring semantic role", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      const item = screen.getByRole("radio");
      expect(item).toHaveClass("focus-visible:border-ring");
      expect(item).toHaveClass("focus-visible:ring-ring/50");
      expect(item).toHaveClass("focus-visible:ring-3");
    });
  });

  describe("Base UI exclusive", () => {
    it("renders with native role=radio via Base UI primitives", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      expect(screen.getByRole("radio")).toBeInTheDocument();
    });
  });

  describe("touch targets", () => {
    it("expands the hit area on coarse pointers to reach the 44px floor", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      const item = screen.getByRole("radio");
      expect(item).toHaveClass("pointer-coarse:after:-inset-x-3.5");
      expect(item).toHaveClass("pointer-coarse:after:-inset-y-3.5");
    });
  });

  describe("visual size", () => {
    it("renders 20px radio items", () => {
      render(
        <RadioGroup aria-label="Plan">
          <RadioGroupItem value="free" aria-label="Free" />
        </RadioGroup>
      );
      expect(screen.getByRole("radio")).toHaveClass("size-5");
    });
  });
});
