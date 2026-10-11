import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  POClassificationBadge,
  PO_CLASSIFICATION_CONFIG,
} from "@/features/outcomes/components/po-classification-badge";
import type { POClassification } from "@prisma/client";

describe("POClassificationBadge", () => {
  it.each([
    ["COMMON", "Common to all Schools", "Common"],
    ["CORE", "Core", "Core"],
    ["PROFESSIONAL", "Professional", "Professional"],
    ["INSTITUTION_SPECIFIC", "Institution-specific", "Institution-specific"],
    ["UNCLASSIFIED", "Needs classification", "Needs classification"],
  ] as const)(
    "renders %s classification with descriptive and short format",
    (classification: POClassification, descriptiveLabel, shortLabel) => {
      const { unmount } = render(
        <POClassificationBadge classification={classification} format="descriptive" />
      );

      const badge = screen.getByTitle(`Classification: ${descriptiveLabel}`);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-classification", classification);
      expect(screen.getByText(descriptiveLabel)).toBeInTheDocument();

      unmount();

      render(<POClassificationBadge classification={classification} format="short" />);
      expect(screen.getByText(shortLabel)).toBeInTheDocument();
    }
  );

  it("applies semantic tokens for each classification", () => {
    const classifications: POClassification[] = [
      "COMMON",
      "CORE",
      "PROFESSIONAL",
      "INSTITUTION_SPECIFIC",
      "UNCLASSIFIED",
    ];

    for (const c of classifications) {
      const { unmount } = render(<POClassificationBadge classification={c} />);
      const badge = screen.getByTitle(
        `Classification: ${PO_CLASSIFICATION_CONFIG[c].descriptiveLabel}`
      );
      const expectedClasses = PO_CLASSIFICATION_CONFIG[c].badgeClass.split(" ");
      for (const cls of expectedClasses) {
        expect(badge).toHaveClass(cls);
      }
      unmount();
    }
  });

  it("renders screen-reader text for accessibility", () => {
    render(<POClassificationBadge classification="COMMON" />);
    expect(screen.getByText("(Common to all Schools Program Outcome)")).toHaveClass("sr-only");
  });

  it("optionally renders an indicator dot", () => {
    const { container } = render(<POClassificationBadge classification="PROFESSIONAL" showDot />);
    const dot = container.querySelector("[aria-hidden='true']");
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("size-1.5", "rounded-full");
  });
});
