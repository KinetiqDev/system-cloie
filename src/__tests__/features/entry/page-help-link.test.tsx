import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Renders the one contextual-help action and asserts the markup that actually
 * ships: one anchor, opening externally, with an accessible name in both the
 * roomy and the tight viewport layouts.
 */
const usePathname = vi.fn<() => string>();
vi.mock("next/navigation", () => ({ usePathname: () => usePathname() }));

import { PageHelpLink } from "@/features/entry/components/page-help-link";
import { HELP_CENTER_ORIGIN } from "@/features/entry/help-center-links";

function render(pathname: string, activeRole: Parameters<typeof PageHelpLink>[0] = {}) {
  usePathname.mockReturnValue(pathname);
  return renderToStaticMarkup(<PageHelpLink activeRole={activeRole.activeRole ?? null} />);
}

describe("PageHelpLink", () => {
  it("links the current route to its Help Center article", () => {
    const html = render("/faculty/cilos");
    expect(html).toContain(`href="${HELP_CENTER_ORIGIN}/faculty/cilos/"`);
  });

  it("opens externally and cannot reach back into this window", () => {
    const html = render("/faculty/cilos");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("keeps an accessible name when the visible label is hidden", () => {
    const html = render("/faculty/cilos");
    // Desktop shows the label; mobile hides it and keeps it for screen readers.
    expect(html).toContain("Help with this page");
    expect(html).toContain('class="sr-only sm:hidden"');
  });

  it("falls back to the role landing page, then the role chooser", () => {
    expect(render("/faculty/unmapped", { activeRole: "FACULTY" })).toContain(
      `${HELP_CENTER_ORIGIN}/faculty/`
    );
    expect(render("/login")).toContain(`${HELP_CENTER_ORIGIN}/start/choose-your-role/`);
  });

  it("renders exactly one link, not a control-level help icon", () => {
    expect(render("/faculty/cilos").match(/<a /g)).toHaveLength(1);
  });
});
