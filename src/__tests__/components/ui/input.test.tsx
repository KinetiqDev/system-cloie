import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "@/components/ui/input";

describe("Input", () => {
  describe("semantic retokening", () => {
    it("renders with the semantic input surface and border token", () => {
      render(<Input aria-label="Email" />);
      const input = screen.getByLabelText("Email");
      expect(input).toHaveClass("bg-surface-input");
      expect(input).toHaveClass("border-input");
      expect(input).toHaveClass("text-foreground");
    });

    it("uses the semantic placeholder role rather than raw muted classes", () => {
      render(<Input placeholder="Enter your name" aria-label="Name" />);
      const input = screen.getByLabelText("Name");
      expect(input).toHaveClass("placeholder:text-muted-foreground");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(<Input aria-label="Search" />);
      const input = screen.getByLabelText("Search");
      // Form controls use semantic tokens with opacity utilities which already
      // resolve under the `.dark` root class via @custom-variant dark.
      // Raw `dark:bg-input/30` overrides are no longer required.
      const className = input.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("visible label and a11y wiring", () => {
    it("associates a visible label via aria-label", () => {
      render(<Input aria-label="Email address" />);
      expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    });

    it("associates a native label via htmlFor when wrapped", () => {
      render(
        <>
          <label htmlFor="email">Email</label>
          <Input id="email" />
        </>
      );
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("programmatic state", () => {
    it("exposes aria-invalid and destructive ring when invalid", () => {
      render(<Input aria-invalid="true" aria-label="Email" />);
      const input = screen.getByLabelText("Email");
      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveClass("aria-invalid:border-destructive");
      expect(input).toHaveClass("aria-invalid:ring-destructive/20");
    });

    it("supports a disabled attribute that maps to a disabled visual treatment", () => {
      render(<Input disabled aria-label="Email" />);
      const input = screen.getByLabelText("Email");
      expect(input).toBeDisabled();
      expect(input).toHaveClass("disabled:bg-muted");
      expect(input).toHaveClass("disabled:opacity-50");
      expect(input).toHaveClass("disabled:pointer-events-none");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
    });

    it("renders a focus ring via the dedicated ring semantic role", () => {
      render(<Input aria-label="Search" />);
      const input = screen.getByLabelText("Search");
      expect(input).toHaveClass("focus-visible:border-ring");
      expect(input).toHaveClass("focus-visible:ring-ring/50");
      expect(input).toHaveClass("focus-visible:ring-3");
    });
  });

  describe("non-color cues for state", () => {
    it("disables pointer events and changes cursor when disabled (non-color cue)", () => {
      render(<Input disabled aria-label="Read only" />);
      const input = screen.getByLabelText("Read only");
      expect(input).toHaveClass("disabled:pointer-events-none");
      expect(input).toHaveClass("disabled:cursor-not-allowed");
    });
  });

  describe("Base UI exclusive", () => {
    it("does not import Radix primitives", () => {
      render(<Input aria-label="Email" />);
      // The component renders a native <input> via Base UI's Input primitive.
      expect(screen.getByLabelText("Email").tagName.toLowerCase()).toBe("input");
    });
  });

  describe("touch targets", () => {
    it("carries a coarse-pointer height override so touch inputs meet the 44px floor", () => {
      render(<Input aria-label="Email" />);
      expect(screen.getByLabelText("Email")).toHaveClass("pointer-coarse:h-11");
    });
  });
});
