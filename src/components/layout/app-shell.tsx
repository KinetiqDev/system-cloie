import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { DevRoleSwitcher } from "@/features/auth/components/dev-role-switcher";
import { DemoRoleSwitcher } from "@/features/auth/components/demo-role-switcher";
import type { RoleSwitcherUser } from "@/features/auth/components/role-switcher";
import type { Role } from "@/lib/constants/roles";
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
}

export function AppShell({
  children,
  user,
  roles,
  activeRole,
  demoEnabled = false,
  demoUsers = [],
}: AppShellProps) {
  const activeRoles = activeRole ? [activeRole] : roles ?? [];
  const mobileNavMode = getMobileNavMode(activeRoles);
  const isDean = activeRole === "DEAN";

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* Desktop Sidebar (hidden on mobile/tablet) */}
      <Sidebar user={user} roles={activeRoles} />

      {/* Main Content Area */}
      <div className={isDean ? "flex min-w-0 flex-1 flex-col md:pl-16 lg:pl-64" : "flex min-w-0 flex-1 flex-col lg:pl-64"}>
        {/* Top App Bar — includes hamburger trigger for admin/dean/ph/faculty */}
        <Topbar user={user} mobileNavMode={mobileNavMode} roles={activeRoles} />

        {/* Page Content */}
        <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation — only for Student/Alumni/Industry Partner */}
        {mobileNavMode === "bottom-nav" && <MobileNav roles={activeRoles} />}
      </div>

      <DevRoleSwitcher activeEmail={user?.email} />
      <DemoRoleSwitcher enabled={demoEnabled} activeEmail={user?.email} users={demoUsers} />
      {demoEnabled && (
        <div
          role="status"
          aria-label="Dedicated demo environment"
          className="border-border bg-surface/95 text-text-secondary fixed top-3 right-3 z-[60] rounded-full border px-3 py-1 text-[10px] font-semibold tracking-wide shadow-sm"
        >
          Dedicated demo environment
        </div>
      )}
    </div>
  );
}
