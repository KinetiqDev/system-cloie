import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DEDICATED_DEMO_USERS } from "@/lib/constants/demo-users";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { getDemoAuthConfig } from "@/features/auth/services/demo-auth";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

export async function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  const session = await resolveAuthSession();
  const demoConfig = getDemoAuthConfig();
  const demoEnabled = demoConfig !== null;
  const demoUsers = demoConfig
    ? DEDICATED_DEMO_USERS.filter((user) => demoConfig.allowedUsers.has(user.email))
    : [];
  const appearanceEnabled = resolveAppearanceAvailability();

  const user = session
    ? {
        name: session.email?.split("@")[0] || "User", // Fallback name since AuthSessionSnapshot doesn't have it yet
        email: session.email,
      }
    : undefined;

  return (
    <SessionGuard>
      <AppShell
        user={user}
        roles={session?.roles}
        activeRole={session?.activeRole}
        demoEnabled={demoEnabled}
        demoUsers={demoUsers}
        appearanceEnabled={appearanceEnabled}
      >
        {children}
      </AppShell>
    </SessionGuard>
  );
}
