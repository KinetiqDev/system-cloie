import * as React from "react";
import { Sidebar } from "./sidebar";
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
import { ProgramHeadSwitcher } from "@/features/auth/components/program-head-switcher";
import type { RoleSwitcherUser } from "@/features/auth/components/role-switcher-list";
import type { Role } from "@/lib/constants/roles";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";
import { getMobileNavMode } from "@/lib/constants/navigation";

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
export function AppShell({
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

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* Desktop Sidebar (hidden on mobile/tablet) */}
      <Sidebar user={user} roles={activeRoles} activeProgramId={initialSelectedProgramId} />
      {/* Main Content Area */}
      <div
        className={
          isDean
            ? "flex min-w-0 flex-1 flex-col md:pl-16 lg:pl-64"
            : "flex min-w-0 flex-1 flex-col lg:pl-64"
        }
      >
        {/* Top App Bar — includes hamburger trigger for admin/dean/ph/faculty */}
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
          {programHeadPrograms && (
            <ProgramHeadSwitcher
              programs={programHeadPrograms}
              activeProgramId={initialSelectedProgramId}
            />
          )}
          <DemoRoleSwitcher enabled={demoEnabled} activeEmail={user?.email} users={demoUsers} />
          <DevRoleSwitcherDesktop activeEmail={user?.email} />
          <DemoRoleSwitcherDesktop
            enabled={demoEnabled}
            activeEmail={user?.email}
            users={demoUsers}
          />
        </Topbar>

        {/* Page Content */}
        <main className="mx-auto flex w-full max-w-[1600px] min-w-0 flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation — only for Student/Alumni/Industry Partner */}
        {mobileNavMode === "bottom-nav" && <MobileNav roles={activeRoles} />}
      </div>
    </div>
  );
}
