import { describe, expect, it, vi } from "vitest";

import SecretaryCreateCoursePage from "@/app/(app)/secretary/courses/new/page";
import DeanCreateCoursePage from "@/app/(app)/dean/academic-structure/courses/new/page";

const redirectMock = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  })
);

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("new-course redirect stubs", () => {
  it("redirects the secretary /new route to the course catalog", () => {
    expect(() => SecretaryCreateCoursePage()).toThrow("REDIRECT:/secretary/courses");
  });

  it("redirects the dean /new route to the course catalog", () => {
    expect(() => DeanCreateCoursePage()).toThrow("REDIRECT:/dean/academic-structure/courses");
  });
});
