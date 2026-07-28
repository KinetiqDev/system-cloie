import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";

export async function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  const session = await resolveAuthSession();

  const user = session
    ? {
        name: session.email?.split("@")[0] || "User", // Fallback name since AuthSessionSnapshot doesn't have it yet
        email: session.email,
      }
    : undefined;

  return (
    <SessionGuard>
      <AppShell user={user} roles={session?.roles} activeRole={session?.activeRole}>
        {children}
      </AppShell>
    </SessionGuard>
  );
}
