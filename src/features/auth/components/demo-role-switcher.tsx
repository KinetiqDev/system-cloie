"use client";

import { DEDICATED_DEMO_USERS } from "@/lib/constants/demo-users";
import { MobileRoleSwitcher } from "./mobile-role-switcher";
import { RoleSwitcherDropdown } from "./role-switcher-dropdown";
import type { RoleSwitcherUser } from "./role-switcher-list";

type DemoRoleSwitcherProps = {
  enabled: boolean;
  activeEmail?: string | null;
  users?: readonly RoleSwitcherUser[];
};

export function DemoRoleSwitcherDesktop({
  enabled,
  activeEmail,
  users = DEDICATED_DEMO_USERS,
}: DemoRoleSwitcherProps) {
  if (!enabled) return null;

  return (
    <RoleSwitcherDropdown
      activeEmail={activeEmail}
      users={users}
      endpoint="/api/auth/demo-login"
      requestKey="identifier"
      title="Demo"
      description="Switch between dedicated demo accounts"
    />
  );
}

export function DemoRoleSwitcher({
  enabled,
  activeEmail,
  users = DEDICATED_DEMO_USERS,
}: DemoRoleSwitcherProps) {
  if (!enabled) return null;

  return (
    <MobileRoleSwitcher
      activeEmail={activeEmail}
      users={users}
      endpoint="/api/auth/demo-login"
      requestKey="identifier"
      title="Demo Roles"
      description="Switch between dedicated demo accounts"
    />
  );
}

export { DEDICATED_DEMO_USERS };
