import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

const legacyPages = [
  ["courses", "@/app/(app)/program-head/courses/page"],
  ["course assignments", "@/app/(app)/program-head/course-assignments/page"],
  ["outcomes", "@/app/(app)/program-head/outcomes/page"],
  ["outcome mapping", "@/app/(app)/program-head/outcomes/mapping/page"],
  ["tools", "@/app/(app)/program-head/tools/page"],
  ["new tool", "@/app/(app)/program-head/tools/new/page"],
  ["edit tool", "@/app/(app)/program-head/tools/[id]/edit/page"],
  ["publish tool", "@/app/(app)/program-head/tools/publish/page"],
  ["CILO evaluation", "@/app/(app)/program-head/cilo-evaluations/new/page"],
  ["CILO reviews", "@/app/(app)/program-head/cilo-reviews/page"],
  ["CILO review detail", "@/app/(app)/program-head/cilo-reviews/[evaluationId]/page"],
  ["CILO response", "@/app/(app)/program-head/cilo-reviews/[evaluationId]/responses/[responseId]/page"],
  ["analytics", "@/app/(app)/program-head/analytics/page"],
  ["reports", "@/app/(app)/program-head/reports/page"],
] as const;

describe("legacy Program Head routes", () => {
  it.each(legacyPages)("redirects %s to entry without reading a Program", async (_name, path) => {
    const Page = (await import(path)).default;

    await expect(Promise.resolve().then(() => Page())).rejects.toThrow("REDIRECT:/program-head");
    expect(redirectMock).toHaveBeenCalledWith("/program-head");
    redirectMock.mockClear();
  });
});
