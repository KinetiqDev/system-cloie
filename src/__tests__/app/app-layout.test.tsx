import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import AppLayout, { dynamic } from "@/app/(app)/layout";
import { AuthenticatedShellFallback } from "@/components/layout/authenticated-shell-fallback";

describe("authenticated application layout", () => {
  it("places the server auth boundary behind a role-neutral Suspense fallback", () => {
    const protectedContent = <div>Protected route content</div>;
    const result = AppLayout({ children: protectedContent });

    expect(result.type).toBe(Suspense);
    expect(result.props.fallback.type).toBe(AuthenticatedShellFallback);
    expect(result.props.children.type).toBeDefined();
    expect(result.props.children.props.children).toBe(protectedContent);
  });

  it("keeps authenticated routes request-time rendered", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});
