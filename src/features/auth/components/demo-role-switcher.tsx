"use client";

import { DEDICATED_DEMO_USERS } from "@/lib/constants/demo-users";
import { MobileRoleSwitcher } from "./mobile-role-switcher";
import { RoleSwitcher, type RoleSwitcherUser } from "./role-switcher";

type DemoRoleSwitcherProps = {
  enabled: boolean;
  activeEmail?: string | null;
  users?: readonly RoleSwitcherUser[];
};

export function DemoRoleSwitcher({ enabled, activeEmail, users = DEDICATED_DEMO_USERS }: DemoRoleSwitcherProps) {
  if (!enabled) return null;

  return (
    <>
      <RoleSwitcher
        activeEmail={activeEmail}
        users={users}
        endpoint="/api/auth/demo-login"
        requestKey="identifier"
        storageKey="cloie-demo-switcher-pos"
        expandedStorageKey="cloie-demo-role-switcher-expanded"
        title="Demo Roles"
        description="Switch between dedicated demo accounts"
        visibilityClassName="hidden lg:block"
      />
      <MobileRoleSwitcher
        activeEmail={activeEmail}
        users={users}
        endpoint="/api/auth/demo-login"
        requestKey="identifier"
        title="Demo Roles"
        description="Switch between dedicated demo accounts"
      />
    </>
  );
}

export { DEDICATED_DEMO_USERS };
