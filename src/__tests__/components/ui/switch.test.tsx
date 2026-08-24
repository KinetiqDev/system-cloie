import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Switch } from "@/components/ui/switch";

describe("Switch", () => {
  describe("semantic retokening", () => {
    it("renders with the semantic input surface for the unchecked state", () => {
      render(<Switch aria-label="Email me about new courses" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveClass("bg-surface-input");
      expect(sw).toHaveClass("data-unchecked:bg-surface-input");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens on the root", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      const rootClasses = sw.getAttribute("class") ?? "";
      expect(rootClasses).not.toMatch(/\bdark:/);
    });

    it("keeps the thumb visually distinct from the track through semantic surface contrast", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      const thumb = sw.querySelector('[data-slot="switch-thumb"]');
      expect(thumb).toBeInTheDocument();
      expect(thumb).toHaveClass("bg-background");
      expect(thumb).toHaveClass("shadow-sm");
    });
  });

  describe("programmatic checked state uses the primary role", () => {
    it("applies primary background via Base UI data-checked state", () => {
      render(<Switch defaultChecked aria-label="Notify" />);
      const sw = screen.getByRole("switch", { checked: true });
      expect(sw).toHaveClass("data-checked:bg-primary");
      expect(sw).toHaveAttribute("data-checked");
    });

    it("exposes the checked state via aria-checked", () => {
      render(<Switch defaultChecked aria-label="Notify" />);
      expect(screen.getByRole("switch", { checked: true })).toBeInTheDocument();
    });
  });

  describe("programmatic invalid / disabled state", () => {
    it("exposes aria-invalid and the destructive ring family when invalid", () => {
      render(<Switch aria-invalid="true" aria-label="Required" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("aria-invalid", "true");
      expect(sw).toHaveClass("aria-invalid:border-destructive");
      expect(sw).toHaveClass("aria-invalid:ring-destructive/20");
    });

    it("supports the disabled attribute with non-color cue", () => {
      render(<Switch disabled aria-label="Locked" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveAttribute("data-disabled");
      expect(sw).toHaveClass("data-disabled:cursor-not-allowed");
      expect(sw).toHaveClass("data-disabled:opacity-60");
    });
  });

  describe("focus ring", () => {
    it("uses the dedicated ring semantic role", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveClass("focus-visible:border-ring");
      expect(sw).toHaveClass("focus-visible:ring-ring");
      expect(sw).toHaveClass("focus-visible:ring-3");
    });
  });

  describe("size variants", () => {
    it("applies the sm data-size for compact switches", () => {
      render(<Switch size="sm" aria-label="Compact" />);
      expect(screen.getByRole("switch")).toHaveAttribute("data-size", "sm");
    });

    it("defaults to the default data-size", () => {
      render(<Switch aria-label="Default" />);
      expect(screen.getByRole("switch")).toHaveAttribute("data-size", "default");
    });
  });

  describe("Base UI exclusive", () => {
    it("renders via Base UI with role=switch", () => {
      render(<Switch aria-label="Notify" />);
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });
  });

  describe("touch targets", () => {
    it("expands the hit area on coarse pointers to reach the 44px floor", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveClass("pointer-coarse:data-[size=default]:after:-inset-y-[12px]");
      render(<Switch size="sm" aria-label="Notify compact" />);
      expect(screen.getAllByRole("switch")[1]).toHaveClass(
        "pointer-coarse:data-[size=sm]:after:-inset-y-[14px]"
      );
    });
  });

  describe("visual size", () => {
    it("renders a 20x40 default track and 16x32 compact track", () => {
      render(<Switch aria-label="Notify" />);
      const sw = screen.getByRole("switch");
      expect(sw).toHaveClass("data-[size=default]:h-5", "data-[size=default]:w-10");

      render(<Switch size="sm" aria-label="Notify compact" />);
      expect(screen.getAllByRole("switch")[1]).toHaveClass(
        "data-[size=sm]:h-4",
        "data-[size=sm]:w-8"
      );
    });

    it("travels the checked thumb flush to the track edge (track - thumb - 2px gap)", () => {
      render(<Switch defaultChecked aria-label="Notify" />);
      const thumb = screen.getByRole("switch").querySelector("[data-slot='switch-thumb']");
      expect(thumb).toHaveClass("group-data-[size=default]/switch:data-checked:translate-x-[22px]");

      render(<Switch size="sm" defaultChecked aria-label="Notify compact" />);
      const compactThumb = screen
        .getAllByRole("switch")[1]
        .querySelector("[data-slot='switch-thumb']");
      expect(compactThumb).toHaveClass(
        "group-data-[size=sm]/switch:data-checked:translate-x-[18px]"
      );
    });
  });
});
