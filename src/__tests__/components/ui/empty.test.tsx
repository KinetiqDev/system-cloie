import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

describe("Empty", () => {
  describe("semantic retokening", () => {
    it("renders the root with the data-slot", () => {
      render(<Empty>body</Empty>);
      expect(screen.getByText("body")).toHaveAttribute("data-slot", "empty");
    });

    it("uses the semantic input border on the dashed container", () => {
      render(<Empty>body</Empty>);
      const root = screen.getByText("body");
      expect(root).toHaveClass("border-input");
      expect(root).toHaveClass("border-dashed");
    });

    it("does not retain raw-theme dark palette selectors that bypass the semantic tokens", () => {
      render(<Empty>body</Empty>);
      const className = screen.getByText("body").getAttribute("class") ?? "";
      expect(className).not.toMatch(/\bdark:/);
    });
  });

  describe("title uses the semantic foreground role", () => {
    it("renders the title with the dedicated text-foreground role", () => {
      render(<EmptyTitle>No results</EmptyTitle>);
      const title = screen.getByText("No results");
      expect(title).toHaveAttribute("data-slot", "empty-title");
      expect(title).toHaveClass("text-foreground");
    });
  });

  describe("description uses the semantic muted foreground role", () => {
    it("renders the description with the dedicated text-muted-foreground role", () => {
      render(<EmptyDescription>Try again later.</EmptyDescription>);
      const description = screen.getByText("Try again later.");
      expect(description).toHaveAttribute("data-slot", "empty-description");
      expect(description).toHaveClass("text-muted-foreground");
    });
  });

  describe("icon media variant uses the semantic muted surface and foreground role", () => {
    it("applies the muted background and foreground color to the icon slot", () => {
      render(
        <EmptyMedia variant="icon" data-testid="empty-media">
          <span>★</span>
        </EmptyMedia>
      );
      const media = screen.getByTestId("empty-media");
      expect(media).toHaveAttribute("data-variant", "icon");
      expect(media).toHaveClass("bg-muted");
      expect(media).toHaveClass("text-foreground");
    });
  });

  describe("non-color cues for state", () => {
    it("uses an underline selector for actionable links (non-color cue)", () => {
      render(
        <EmptyDescription>
          Please <a href="/x">contact support</a>.
        </EmptyDescription>
      );
      const description = document.querySelector('[data-slot="empty-description"]');
      expect(description).not.toBeNull();
      const className = description?.getAttribute("class") ?? "";
      expect(className).toMatch(/\[&>a\]:underline/);
      expect(className).toMatch(/\[&>a\]:underline-offset-4/);
    });
  });

  describe("actionable recovery", () => {
    it("exposes a content slot for the recovery CTA", () => {
      render(
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>Add your first record.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <button type="button">Create</button>
          </EmptyContent>
        </Empty>
      );
      expect(screen.getByText("Nothing here")).toBeInTheDocument();
      expect(screen.getByText("Add your first record.")).toBeInTheDocument();
      expect(screen.getByText("Create")).toBeInTheDocument();
    });
  });
});
