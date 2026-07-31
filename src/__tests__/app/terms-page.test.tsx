import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TermsPage, { metadata } from "@/app/(legal)/terms/page";

describe("TermsPage", () => {
  it("renders the Terms of Use and cross-document links", () => {
    render(<TermsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "System CLOIE Terms of Use" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to document" })).toHaveAttribute(
      "href",
      "#legal-document"
    );
    expect(screen.getByText("Draft - pending institutional approval")).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Privacy Notice" })
        .some((link) => link.getAttribute("href") === "/privacy")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Portal selection" })
        .some((link) => link.getAttribute("href") === "/")
    ).toBe(true);
    expect(
      screen
        .getAllByRole("link", { name: "Prohibited Conduct" })
        .some((link) => link.getAttribute("href") === "#prohibited-conduct")
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Open Terms of Use section navigation" })
    ).toBeInTheDocument();
    expect(screen.getByText("32 sections")).toBeInTheDocument();
    expect(document.querySelector("summary")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open Terms of Use section navigation" }));
    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByRole("link", { name: "Electronic Acceptance" })).toHaveAttribute(
      "href",
      "#electronic-acceptance"
    );
    expect(
      within(drawer).getByRole("button", { name: "Close section navigation" })
    ).toBeInTheDocument();
    expect(metadata.title).toBe("Terms of Use");
    expect(metadata.description).toContain("authorized use");
  });
});
