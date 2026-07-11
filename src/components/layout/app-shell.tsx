import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { MobileSidebarDrawer } from "./mobile-sidebar-drawer";
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
}

export function AppShell({ children, user, roles }: AppShellProps) {
  const mobileNavMode = getMobileNavMode(roles ?? []);

  return (
    <div className="bg-background flex min-h-screen w-full">
      {/* Desktop Sidebar (hidden on mobile/tablet) */}
      <Sidebar user={user} roles={roles} />

      {/* Main Content Area */}
      <div className="flex flex-1 min-w-0 flex-col lg:pl-64">
        {/* Top App Bar — includes hamburger trigger for admin/dean/ph/faculty */}
        <Topbar user={user} mobileNavMode={mobileNavMode} roles={roles} />

        {/* Page Content */}
        <main className="mx-auto flex w-full min-w-0 max-w-[1600px] flex-1 flex-col overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation — only for Student/Alumni/Industry Partner */}
        {mobileNavMode === "bottom-nav" && <MobileNav roles={roles} />}
      </div>

      <DevRoleSwitcher activeEmail={user?.email} />
    </div>
  );
}
