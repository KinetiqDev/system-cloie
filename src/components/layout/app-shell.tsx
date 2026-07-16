import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { DevRoleSwitcher } from "@/features/auth/components/dev-role-switcher";
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
}

export function AppShell({ children, user, roles, activeRole }: AppShellProps) {
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
        {(mobileNavMode === "bottom-nav" || mobileNavMode === "dean-tabs") && <MobileNav roles={activeRoles} />}
      </div>

      <DevRoleSwitcher activeEmail={user?.email} />
    </div>
  );
}
