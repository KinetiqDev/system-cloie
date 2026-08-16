"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSidebarDrawer } from "./mobile-sidebar-drawer";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { ProgramHeadSwitcher } from "@/features/auth/components/program-head-switcher";
import type { Role } from "@/lib/constants/roles";
import type { MobileNavMode } from "@/lib/constants/navigation";
import type { ProgramHeadProgram } from "@/features/auth/services/resolve-program-head-context";

interface TopbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  mobileNavMode?: MobileNavMode;
  roles?: Role[];
  children?: React.ReactNode;
  appearanceEnabled?: boolean;
  authorizedPrograms?: ProgramHeadProgram[];
}

export function Topbar({
  user,
  mobileNavMode = "bottom-nav",
  roles,
  children,
  appearanceEnabled = false,
  authorizedPrograms = [],
}: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "GET" });
    router.refresh();
  };

  const initials = user?.name?.[0]?.toUpperCase() || "U";
  const showHamburger = mobileNavMode !== "bottom-nav";

  return (
    <header className="border-sidebar-border bg-sidebar sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b px-4 sm:px-6">
      {/* Left side: branding (mobile) or hamburger trigger */}
      <div className="flex items-center gap-3 lg:hidden">
        {showHamburger ? (
          <MobileSidebarDrawer roles={roles} user={user} />
        ) : (
          <>
            <Image
              src="/logos/cloie-logo.png"
              alt="System CLOIE Logo"
              width={486}
              height={513}
              className="border-border h-7 w-auto rounded border bg-white p-0.5"
            />
            <span className="text-title-md text-link font-bold tracking-tight">System CLOIE</span>
          </>
        )}
      </div>
      {/* Program switcher on desktop (left/center) or spacer */}
      <div className="hidden lg:flex lg:items-center lg:gap-3">
        <ProgramHeadSwitcher programs={authorizedPrograms} />
      </div>
      {/* Right side actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Program switcher for mobile/tablet when hamburger/header is visible */}
        <div className="flex lg:hidden">
          <ProgramHeadSwitcher programs={authorizedPrograms} />
        </div>
        {children}
        <AppearanceMenuTrigger enabled={appearanceEnabled} />
        {/* Profile avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-sidebar-accent/40 hover:text-sidebar-foreground focus-visible:outline-ring flex min-h-11 items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2">
            <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full">
              <span className="text-caption font-semibold">{initials}</span>
            </div>
            <ChevronDown className="text-sidebar-foreground/60 size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <div className="px-3 py-2">
              <p className="text-label-md text-text-primary font-semibold">
                {user?.name || "User"}
              </p>
              <p className="text-caption text-text-muted">{user?.email || "No email"}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-danger focus:text-danger cursor-pointer gap-2"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
