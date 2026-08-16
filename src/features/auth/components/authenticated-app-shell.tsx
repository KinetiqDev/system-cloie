import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DEDICATED_DEMO_USERS } from "@/lib/constants/demo-users";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { getDemoAuthConfig } from "@/features/auth/services/demo-auth";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";
import { resolveAuthorizedPrograms } from "@/features/auth/services/resolve-program-head-context";
import { ROLES } from "@/lib/constants/roles";

export async function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  const session = await resolveAuthSession();
  const demoConfig = getDemoAuthConfig();
  const demoEnabled = demoConfig !== null;
  const demoUsers = demoConfig
    ? DEDICATED_DEMO_USERS.filter((user) => demoConfig.allowedUsers.has(user.email))
    : [];
  const appearanceEnabled = resolveAppearanceAvailability();
  const isProgramHead = session?.activeRole === ROLES.PROGRAM_HEAD;
  const authorizedPrograms = isProgramHead && session?.userId
    ? await resolveAuthorizedPrograms(session.userId)
    : [];

  // Only surface identity when a canonical domain name is present. Never invent
  // a display name from the email local-part or a generic placeholder.
  const user =
    session?.name != null
      ? {
          name: session.name,
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
        authorizedPrograms={authorizedPrograms}
      >
        {children}
      </AppShell>
    </SessionGuard>
  );
}
