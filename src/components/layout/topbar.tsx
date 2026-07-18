"use client";

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
import type { Role } from "@/lib/constants/roles";
import type { MobileNavMode } from "@/lib/constants/navigation";

interface TopbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  mobileNavMode?: MobileNavMode;
  roles?: Role[];
}

export function Topbar({ user, mobileNavMode = "bottom-nav", roles }: TopbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "GET" });
    router.refresh();
  };

  const initials = user?.name?.[0]?.toUpperCase() || "U";
  const showHamburger = mobileNavMode !== "bottom-nav";

  return (
    <header className="border-border bg-surface sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b px-4 sm:px-6">
      {/* Left side: branding (mobile) or hamburger trigger */}
      <div className={showHamburger && mobileNavMode === "dean-tabs" ? "flex items-center gap-3 md:hidden" : "flex items-center gap-3 lg:hidden"}>
        {showHamburger ? (
          <MobileSidebarDrawer roles={roles} user={user} />
        ) : (
          <>
            <Image
              src="/logos/cloie-logo.png"
              alt="System CLOIE Logo"
              width={28}
              height={28}
              className="rounded"
            />
            <span className="text-title-md text-primary font-bold tracking-tight">System CLOIE</span>
          </>
        )}
      </div>
      <div className="hidden lg:flex" /> {/* Empty spacer for desktop */}
      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* Profile avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="hover:bg-surface-muted flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors focus:outline-none">
            <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-full text-white">
              <span className="text-caption font-semibold">{initials}</span>
            </div>
            <ChevronDown className="text-text-muted size-4" />
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
