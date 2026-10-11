import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

describe("removed Secretary course mapping administration", () => {
  it("redirects course mapping administration to the Secretary landing page", async () => {
    const Page = (await import("@/app/(app)/secretary/learning-outcomes/alignment/[courseId]/page"))
      .default;

    await expect(Promise.resolve().then(() => Page())).rejects.toThrow(
      "REDIRECT:/secretary/dashboard"
    );
    expect(redirectMock).toHaveBeenCalledWith("/secretary/dashboard");
  });
});
