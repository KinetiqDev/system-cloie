import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Pagination, buildPageItems } from "@/components/ui/pagination";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }))
  );
}

describe("buildPageItems", () => {
  it("returns all pages when within the slot budget", () => {
    expect(buildPageItems(4, 7, 1, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("desktop: left edge shows leading run, ellipsis, last page", () => {
    expect(buildPageItems(1, 20, 1, 1)).toEqual([1, 2, 3, 4, 5, "ellipsis", 20]);
  });
  it("desktop: middle shows boundary + siblings + ellipsis", () => {
    expect(buildPageItems(10, 20, 1, 1)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });
  it("desktop: right edge is symmetric", () => {
    expect(buildPageItems(20, 20, 1, 1)).toEqual([1, "ellipsis", 16, 17, 18, 19, 20]);
  });
  it("mobile: middle collapses to first/current/last", () => {
    expect(buildPageItems(10, 20, 0, 1)).toEqual([1, "ellipsis", 10, "ellipsis", 20]);
  });
  it("mobile: left edge shows 3 leading + ellipsis + last", () => {
    expect(buildPageItems(1, 20, 0, 1)).toEqual([1, 2, 3, "ellipsis", 20]);
  });
});

describe("Pagination", () => {
  beforeEach(() => {
    mockMatchMedia(true); // desktop: siblingCount = 1
  });

  it("renders prev/next with accessible labels and marks the active page", () => {
    render(<Pagination currentPage={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Go to previous page")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to next page")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to page 2")).toHaveAttribute("aria-current", "page");
  });

  it("calls onPageChange with the clicked page", () => {
    const onPageChange = vi.fn();
    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />);
    screen.getByLabelText("Go to page 3").click();
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("shows a narrower window on mobile (coarse matchMedia = false)", () => {
    mockMatchMedia(false); // mobile: siblingCount = 0
    render(<Pagination currentPage={10} totalPages={20} onPageChange={() => {}} />);
    expect(screen.getByLabelText("Go to page 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to page 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to page 20")).toBeInTheDocument();
    expect(screen.queryByLabelText("Go to page 9")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Go to page 11")).not.toBeInTheDocument();
  });

  it("wraps the page window so narrow viewports do not clip controls", () => {
    mockMatchMedia(false);
    render(<Pagination currentPage={10} totalPages={20} onPageChange={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toHaveClass(
      "flex-wrap",
      "justify-center"
    );
  });
});
