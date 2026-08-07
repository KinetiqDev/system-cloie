import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFoundMock, resolveShowcaseAccessMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  resolveShowcaseAccessMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/design-system/services/resolve-showcase-access", () => ({
  resolveShowcaseAccess: resolveShowcaseAccessMock,
}));

import { render, screen } from "@testing-library/react";

describe("Design System showcase route boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails closed with not-found when access is denied", async () => {
    resolveShowcaseAccessMock.mockReturnValue(false);

    const Layout = await loadLayout();
    await expect(Promise.resolve().then(() => Layout({ children: null }))).rejects.toThrow(
      "NOT_FOUND"
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("renders children when access is granted", async () => {
    resolveShowcaseAccessMock.mockReturnValue(true);

    const Layout = await loadLayout();
    const element = await Promise.resolve().then(() => Layout({ children: <div>showcase-child</div> }));
    render(element);
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(screen.getByText("showcase-child")).toBeDefined();
  });

  it("renders a not-found page with a dashboard recovery link", async () => {
    const NotFoundPage = await loadNotFoundPage();
    render(<NotFoundPage />);

    expect(screen.getByText("Page Not Found")).toBeDefined();
    const link = screen.getByRole("button", { name: "Return to Dashboard" });
    expect(link.getAttribute("href")).toBe("/dashboard");
  });

  it("renders a loading state using the shared operational loading primitive", async () => {
    const Loading = await loadLoading();
    render(<Loading />);

    expect(screen.getByRole("status")).toBeDefined();
  });
});

async function loadLayout() {
  const { default: Layout } = await import("@/app/(app)/design-system/layout");
  return Layout;
}

async function loadNotFoundPage() {
  const { default: NotFoundPage } = await import("@/app/(app)/design-system/not-found");
  return NotFoundPage;
}

async function loadLoading() {
  const { default: Loading } = await import("@/app/(app)/design-system/loading");
  return Loading;
}
