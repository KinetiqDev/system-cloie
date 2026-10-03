import * as React from "react";
import { cookies } from "next/headers";
import { SidebarShell } from "./sidebar-shell";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import {
  DevRoleSwitcher,
  DevRoleSwitcherDesktop,
} from "@/features/auth/components/dev-role-switcher";
import {
  DemoRoleSwitcher,
  DemoRoleSwitcherDesktop,
} from "@/features/auth/components/demo-role-switcher";
import { ActiveRoleSwitcher } from "@/features/auth/components/active-role-switcher";
import { ProgramHeadSwitcher } from "@/features/auth/components/program-head-switcher";
import type { RoleSwitcherUser } from "@/features/auth/components/role-switcher-list";
import type { Role } from "@/lib/constants/roles";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";
import { getMobileNavMode } from "@/lib/constants/navigation";
import { isSidebarCollapsed, SIDEBAR_COLLAPSED_COOKIE } from "@/lib/preferences/sidebar-preference";

interface AppShellProps {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  roles?: Role[];
  activeRole?: Role | null;
  demoEnabled?: boolean;
  demoUsers?: readonly RoleSwitcherUser[];
  appearanceEnabled?: boolean;
  programHeadPrograms?: ProgramHeadProgram[];
  initialSelectedProgramId?: string | null;
}
export async function AppShell({
  children,
  user,
  roles,
  activeRole,
  demoEnabled = false,
  demoUsers = [],
  appearanceEnabled = false,
  programHeadPrograms,
  initialSelectedProgramId,
}: AppShellProps) {
  const activeRoles = activeRole ? [activeRole] : (roles ?? []);
  const mobileNavMode = getMobileNavMode(activeRoles);
  const isDean = activeRole === "DEAN";
  // Resolved here so the sidebar and the content gutter both start in the
  // remembered state, instead of snapping after hydration.
  const cookieStore = await cookies();
  const sidebarCollapsed = isSidebarCollapsed(cookieStore.get(SIDEBAR_COLLAPSED_COOKIE)?.value);

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* Desktop sidebar (hidden on mobile/tablet) and the gutter it offsets */}
      <SidebarShell
        user={user}
        roles={activeRoles}
        activeProgramId={initialSelectedProgramId ?? null}
        isDean={isDean}
        defaultCollapsed={sidebarCollapsed}
        header={
          <Topbar
            user={user}
            mobileNavMode={mobileNavMode}
            roles={activeRoles}
            appearanceEnabled={appearanceEnabled}
            activeProgramId={initialSelectedProgramId}
          >
            {demoEnabled && (
              <div
                role="status"
                aria-label="Dedicated demo environment"
                className="border-border bg-surface text-text-secondary hidden rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide shadow-xs sm:block"
              >
                Dedicated demo environment
              </div>
            )}
            <ActiveRoleSwitcher roles={roles ?? []} activeRole={activeRole ?? null} />
            {programHeadPrograms && (
              <ProgramHeadSwitcher
                programs={programHeadPrograms}
                activeProgramId={initialSelectedProgramId}
              />
            )}
            <DevRoleSwitcher activeEmail={user?.email} />
            <DemoRoleSwitcher enabled={demoEnabled} activeEmail={user?.email} users={demoUsers} />
            <DevRoleSwitcherDesktop activeEmail={user?.email} />
            <DemoRoleSwitcherDesktop
              enabled={demoEnabled}
              activeEmail={user?.email}
              users={demoUsers}
            />
          </Topbar>
        }
        footer={mobileNavMode === "bottom-nav" ? <MobileNav roles={activeRoles} /> : undefined}
      >
        {/* Page Content */}
        <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-8">
          {children}
        </main>
      </SidebarShell>
    </div>
  );
}
