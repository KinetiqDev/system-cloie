import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { DEDICATED_DEMO_USERS } from "@/lib/constants/demo-users";
import { ROLES } from "@/lib/constants/roles";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { getDemoAuthConfig } from "@/features/auth/services/demo-auth";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolveProgramHeadEntry } from "@/features/auth/services/resolve-program-head-context";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

export async function AuthenticatedAppShell({ children }: { children: ReactNode }) {
  const session = await resolveAuthSession();
  const demoConfig = getDemoAuthConfig();
  const demoEnabled = demoConfig !== null;
  const demoUsers = demoConfig
    ? DEDICATED_DEMO_USERS.filter((user) => demoConfig.allowedUsers.has(user.email))
    : [];
  const appearanceEnabled = resolveAppearanceAvailability();

  // Program Head workspaces switch between assigned Programs from the topbar.
  // Only resolve assignments for the active Program Head role; other roles are
  // unaffected. The resolver itself enforces role and session boundaries.
  let programHeadPrograms: ProgramHeadProgram[] | undefined;
  if (session?.activeRole === ROLES.PROGRAM_HEAD) {
    const entry = await resolveProgramHeadEntry();
    if (entry.success) {
      programHeadPrograms = entry.data.authorizedPrograms;
    }
  }

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
        programHeadPrograms={programHeadPrograms}
      >
        {children}
      </AppShell>
    </SessionGuard>
  );
}
