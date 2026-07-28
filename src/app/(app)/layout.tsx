import * as React from "react";
import { Suspense } from "react";
import { AuthenticatedShellFallback } from "@/components/layout/authenticated-shell-fallback";
import { AuthenticatedAppShell } from "@/features/auth/components/authenticated-app-shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AuthenticatedShellFallback />}>
      <AuthenticatedAppShell>{children}</AuthenticatedAppShell>
    </Suspense>
  );
}
