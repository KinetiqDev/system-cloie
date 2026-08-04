import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("legacy Program Head dashboard route", () => {
  it("redirects to the Program Head entry without reading an assignment", async () => {
    const { default: ProgramHeadDashboardPage } = await import(
      "@/app/(app)/program-head/dashboard/page"
    );

    await expect(Promise.resolve().then(() => ProgramHeadDashboardPage())).rejects.toThrow(
      "REDIRECT:/program-head"
    );
  });
});
