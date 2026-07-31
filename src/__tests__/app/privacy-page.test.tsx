import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata } from "@/app/(legal)/privacy/page";

describe("PrivacyPage", () => {
  it("renders a public native document with metadata, anchors, and navigation", () => {
    render(<PrivacyPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "System CLOIE Privacy Notice" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to document" })).toHaveAttribute(
      "href",
      "#legal-document"
    );
    expect(screen.getByText("Draft - pending institutional approval")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Terms of Use" })
        .some((link) => link.getAttribute("href") === "/terms")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Portal selection" })
        .some((link) => link.getAttribute("href") === "/")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Retention and Disposal" })
        .some((link) => link.getAttribute("href") === "#retention")
    ).toBe(true);
    expect(screen.getAllByRole("heading", { name: "Retention and Disposal" })[0]).toHaveAttribute(
      "id",
      "retention-heading"
    );
    expect(
      screen.getByRole("button", { name: "Open Privacy Notice section navigation" })
    ).toBeInTheDocument();
    expect(screen.getByText("21 sections")).toBeInTheDocument();
    expect(document.querySelector("summary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Privacy Notice section navigation" }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole("link", { name: "Retention and Disposal" })).toHaveAttribute(
      "href",
      "#retention"
    );
    expect(
      within(drawer).getByRole("button", { name: "Close section navigation" })
    ).toBeInTheDocument();
    expect(metadata.title).toBe("Privacy Notice");
    expect(metadata.description).toContain("personal data");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
