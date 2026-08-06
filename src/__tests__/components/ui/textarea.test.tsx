import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "@/components/ui/textarea";

describe("Textarea", () => {
  describe("semantic retokening", () => {
    it("renders with the semantic input surface and border token", () => {
      render(<Textarea aria-label="Description" />);
      const textarea = screen.getByLabelText("Description");
      expect(textarea).toHaveClass("bg-surface-input");
      expect(textarea).toHaveClass("border-input");
      expect(textarea).toHaveClass("text-foreground");
    });

    it("uses the semantic placeholder role rather than raw muted classes", () => {
      render(<Textarea placeholder="Tell us more" aria-label="Notes" />);
      const textarea = screen.getByLabelText("Notes");
      expect(textarea).toHaveClass("placeholder:text-muted-foreground");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(<Textarea aria-label="Notes" />);
      const textarea = screen.getByLabelText("Notes");
      const className = textarea.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("visible label and a11y wiring", () => {
    it("associates a visible label via aria-label", () => {
      render(<Textarea aria-label="Course description" />);
      expect(screen.getByLabelText("Course description")).toBeInTheDocument();
    });

    it("associates a native label via htmlFor when wrapped", () => {
      render(
        <>
          <label htmlFor="desc">Description</label>
          <Textarea id="desc" />
        </>
      );
      expect(screen.getByLabelText("Description")).toBeInTheDocument();
    });
  });

  describe("programmatic state", () => {
    it("exposes aria-invalid and the destructive ring family when invalid", () => {
      render(<Textarea aria-invalid="true" aria-label="Notes" />);
      const textarea = screen.getByLabelText("Notes");
      expect(textarea).toHaveAttribute("aria-invalid", "true");
      expect(textarea).toHaveClass("aria-invalid:border-destructive");
      expect(textarea).toHaveClass("aria-invalid:ring-destructive/20");
    });

    it("renders a focus ring via the dedicated ring semantic role", () => {
      render(<Textarea aria-label="Notes" />);
      const textarea = screen.getByLabelText("Notes");
      expect(textarea).toHaveClass("focus-visible:border-ring");
      expect(textarea).toHaveClass("focus-visible:ring-ring/50");
      expect(textarea).toHaveClass("focus-visible:ring-3");
    });

    it("changes cursor to not-allowed when disabled (non-color cue)", () => {
      render(<Textarea disabled aria-label="Notes" />);
      const textarea = screen.getByLabelText("Notes");
      expect(textarea).toBeDisabled();
      expect(textarea).toHaveClass("disabled:cursor-not-allowed");
      expect(textarea).toHaveClass("disabled:bg-muted");
    });
  });

  describe("anatomy preserved", () => {
    it("renders a native <textarea> element with field-sizing-content", () => {
      render(<Textarea aria-label="Notes" />);
      const textarea = screen.getByLabelText("Notes");
      expect(textarea.tagName.toLowerCase()).toBe("textarea");
      expect(textarea).toHaveClass("field-sizing-content");
    });
  });
});
