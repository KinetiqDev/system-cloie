import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const removedPages = [
  ["learning outcomes", "@/app/(app)/secretary/learning-outcomes/page"],
  ["course mapping administration", "@/app/(app)/secretary/learning-outcomes/alignment/[courseId]/page"],
] as const;

describe("removed Secretary outcome routes", () => {
  it.each(removedPages)("redirects %s to the Secretary landing page", async (_name, path) => {
    const Page = (await import(path)).default;

    await expect(Promise.resolve().then(() => Page())).rejects.toThrow("REDIRECT:/secretary/dashboard");
    expect(redirectMock).toHaveBeenCalledWith("/secretary/dashboard");
    redirectMock.mockClear();
  });
});