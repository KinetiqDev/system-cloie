import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage, { metadata } from "@/app/(legal)/privacy/page";

describe("PrivacyPage", () => {
  it("renders a public native document with metadata, anchors, and navigation", () => {
    render(<PrivacyPage />);

    expect(screen.getByRole("heading", { level: 1, name: "System CLOIE Privacy Notice" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to document" })).toHaveAttribute("href", "#legal-document");
    expect(screen.getByText("Draft - pending institutional approval")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Terms of Use" }).some((link) => link.getAttribute("href") === "/terms")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Portal selection" }).some((link) => link.getAttribute("href") === "/")).toBe(true);
    expect(screen.getAllByRole("link", { name: "Retention and Disposal" }).some((link) => link.getAttribute("href") === "#retention")).toBe(true);
    expect(screen.getAllByRole("heading", { name: "Retention and Disposal" })[0]).toHaveAttribute("id", "retention-heading");
    expect(screen.getAllByText("On this page")).toHaveLength(2);
    expect(document.querySelector("summary")?.closest("details")).toBeInTheDocument();
    expect(metadata.title).toBe("Privacy Notice");
    expect(metadata.description).toContain("personal data");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
