import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress";

describe("Progress", () => {
  describe("semantic retokening", () => {
    it("renders the track with the semantic muted surface", () => {
      render(<Progress value={50} aria-label="Loading" />);
      const track = document.querySelector('[data-slot="progress-track"]');
      expect(track).not.toBeNull();
      expect(track).toHaveClass("bg-muted");
    });

    it("renders the indicator with the primary role for the fill", () => {
      render(<Progress value={50} aria-label="Loading" />);
      const indicator = document.querySelector('[data-slot="progress-indicator"]');
      expect(indicator).not.toBeNull();
      expect(indicator).toHaveClass("bg-primary");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(<Progress value={50} aria-label="Loading" />);
      const track = document.querySelector('[data-slot="progress-track"]');
      const className = track?.getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("text/value support API", () => {
    it("exposes a ProgressLabel with the semantic foreground role", () => {
      render(
        <Progress value={50} aria-label="Loading">
          <ProgressLabel>Uploading</ProgressLabel>
        </Progress>
      );
      const label = screen.getByText("Uploading");
      expect(label).toHaveAttribute("data-slot", "progress-label");
      expect(label).toHaveClass("text-foreground");
      expect(label).toHaveClass("font-medium");
    });

    it("exposes a ProgressValue with the semantic muted foreground role and tabular figures", () => {
      render(
        <Progress value={50} aria-label="Loading">
          <ProgressValue>{(formattedValue) => formattedValue}</ProgressValue>
        </Progress>
      );
      const value = screen.getByText("50%");
      expect(value).toHaveAttribute("data-slot", "progress-value");
      expect(value).toHaveClass("text-muted-foreground");
      expect(value).toHaveClass("tabular-nums");
    });

    it("composes label, value, and indicator inside the root", () => {
      render(
        <Progress value={25} aria-label="Loading">
          <ProgressLabel>Uploading</ProgressLabel>
          <ProgressValue>{(formattedValue) => formattedValue}</ProgressValue>
        </Progress>
      );
      expect(screen.getByText("Uploading")).toBeInTheDocument();
      expect(screen.getByText("25%")).toBeInTheDocument();
      expect(document.querySelector('[data-slot="progress-indicator"]')).toBeInTheDocument();
    });
  });

  describe("non-color cues for state", () => {
    it("the indicator transitions via the transition utility for an animated state", () => {
      render(<Progress value={50} aria-label="Loading" />);
      const indicator = document.querySelector('[data-slot="progress-indicator"]');
      expect(indicator).toHaveClass("transition-all");
    });
  });

  describe("Base UI exclusive", () => {
    it("does not import Radix primitives (Base UI Progress renders role=progressbar)", () => {
      render(<Progress value={50} aria-label="Loading" />);
      const root = screen.getByRole("progressbar");
      expect(root).toHaveAttribute("data-slot", "progress");
    });

    it("exposes the current value to assistive technology via aria-valuenow", () => {
      render(<Progress value={50} aria-label="Loading" />);
      const root = screen.getByRole("progressbar");
      expect(root).toHaveAttribute("aria-valuenow", "50");
    });
  });

  describe("exported subcomponent API", () => {
    it("exports ProgressTrack and ProgressIndicator for advanced composition", () => {
      expect(ProgressTrack).toBeDefined();
      expect(ProgressIndicator).toBeDefined();
      expect(ProgressLabel).toBeDefined();
      expect(ProgressValue).toBeDefined();
    });
  });
});
