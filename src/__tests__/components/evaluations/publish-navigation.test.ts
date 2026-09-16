import { describe, expect, it } from "vitest";

import { resolvePublishBackNavigation } from "@/features/evaluations/components/publish-navigation";

describe("resolvePublishBackNavigation", () => {
  it("returns to the template builder after a save-then-publish handoff", () => {
    expect(
      resolvePublishBackNavigation({
        from: "builder",
        builderHref: "/program-head/programs/program-1/tools/template-1/edit",
        toolsHref: "/program-head/programs/program-1/tools",
      })
    ).toEqual({
      href: "/program-head/programs/program-1/tools/template-1/edit",
      label: "Back to Template Builder",
    });
  });

  it("returns to the tools list when no template was selected", () => {
    expect(
      resolvePublishBackNavigation({
        from: "builder",
        builderHref: undefined,
        toolsHref: "/faculty/tools",
      })
    ).toEqual({ href: "/faculty/tools", label: "Back to Evaluation Tools" });
  });

  it("returns to the tools list for every other entry point", () => {
    expect(
      resolvePublishBackNavigation({
        from: undefined,
        builderHref: "/faculty/tools/template-1/edit",
        toolsHref: "/faculty/tools",
      })
    ).toEqual({ href: "/faculty/tools", label: "Back to Evaluation Tools" });
  });
});
