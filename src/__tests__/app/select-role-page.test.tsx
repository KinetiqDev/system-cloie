import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ROLES } from "@/lib/constants/roles";

/**
 * Renders the workspace chooser for a dual-role account (Gen Ed Coordinator +
 * Faculty) and pins the action-alignment contract shipped for it: card actions
 * are bottom-anchored and every action button is full-width, so buttons line
 * up across cards regardless of how the role title and description wrap.
 */
const { resolveAuthSession } = vi.hoisted(() => ({ resolveAuthSession: vi.fn() }));

vi.mock("@/features/auth/services/resolve-auth-session", () => ({
  resolveAuthSession: () => resolveAuthSession(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import SelectRolePage from "@/app/(app)/select-role/page";

async function renderChooser(activeRole: string | null = null) {
  resolveAuthSession.mockResolvedValue({
    activeRole,
    roles: [ROLES.GEN_ED_COORDINATOR, ROLES.FACULTY],
  });
  return renderToStaticMarkup(await SelectRolePage());
}

function buttonClasses(html: string) {
  return [...html.matchAll(/<button [^>]*class="([^"]+)"/g)].map((match) => match[1]);
}

function cardContentClasses(html: string) {
  return [...html.matchAll(/<div data-slot="card-content" class="([^"]+)"/g)].map(
    (match) => match[1]
  );
}

describe("SelectRolePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers one full-width action per role", async () => {
    const html = await renderChooser();

    expect(html).toContain("Switch to Gen Ed Coordinator");
    expect(html).toContain("Switch to Faculty");
    const classes = buttonClasses(html);
    expect(classes).toHaveLength(2);
    for (const buttonClass of classes) {
      expect(buttonClass).toMatch(/(^|\s)w-full(\s|$)/);
    }
  });

  it("anchors every card action to the bottom so buttons align across cards", async () => {
    const classes = cardContentClasses(await renderChooser());

    expect(classes).toHaveLength(2);
    for (const contentClass of classes) {
      expect(contentClass).toMatch(/(^|\s)mt-auto(\s|$)/);
    }
  });

  it("keeps the continue action full-width on the card holding the active role", async () => {
    const html = await renderChooser(ROLES.GEN_ED_COORDINATOR);

    expect(html).toContain("Continue");
    const classes = buttonClasses(html);
    expect(classes).toHaveLength(2);
    for (const buttonClass of classes) {
      expect(buttonClass).toMatch(/(^|\s)w-full(\s|$)/);
    }
  });
});
