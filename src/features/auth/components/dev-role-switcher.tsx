"use client";

import { DEMO_USERS } from "@/lib/constants/demo-users";
import { MobileRoleSwitcher } from "./mobile-role-switcher";
import { RoleSwitcherDropdown } from "./role-switcher-dropdown";

type DevRoleSwitcherProps = {
  activeEmail?: string | null;
};

export function DevRoleSwitcherDesktop({ activeEmail }: DevRoleSwitcherProps) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <RoleSwitcherDropdown
      activeEmail={activeEmail}
      users={DEMO_USERS}
      endpoint="/api/auth/dev-login"
      requestKey="email"
      title="Dev"
      description="Instant sign-in for demo accounts"
    />
  );
}

export function DevRoleSwitcher({ activeEmail }: DevRoleSwitcherProps) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <MobileRoleSwitcher
      activeEmail={activeEmail}
      users={DEMO_USERS}
      endpoint="/api/auth/dev-login"
      requestKey="email"
      title="Dev Roles"
      description="Instant sign-in for demo accounts"
    />
  );
}
