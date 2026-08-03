"use client";

import { DEMO_USERS } from "@/lib/constants/demo-users";
import { MobileRoleSwitcher } from "./mobile-role-switcher";
import { RoleSwitcher } from "./role-switcher";

type DevRoleSwitcherProps = {
  activeEmail?: string | null;
};

export function DevRoleSwitcher({ activeEmail }: DevRoleSwitcherProps) {
  if (process.env.NODE_ENV !== "development") return null;

  return (
    <>
      <RoleSwitcher
        activeEmail={activeEmail}
        users={DEMO_USERS}
        endpoint="/api/auth/dev-login"
        requestKey="email"
        storageKey="cloie-dev-switcher-pos"
        expandedStorageKey="cloie-dev-role-switcher-expanded"
        title="Dev Roles"
        description="Instant sign-in for demo accounts"
        visibilityClassName="hidden lg:block"
      />
      <MobileRoleSwitcher
        activeEmail={activeEmail}
        users={DEMO_USERS}
        endpoint="/api/auth/dev-login"
        requestKey="email"
        title="Dev Roles"
        description="Instant sign-in for demo accounts"
      />
    </>
  );
}
