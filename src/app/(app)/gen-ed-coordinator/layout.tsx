import type { ReactNode } from "react";
import { ROLES } from "@/lib/constants/roles";
import { SessionGuard } from "@/features/auth/components/session-guard";

export default function GenEdCoordinatorLayout({ children }: { children: ReactNode }) {
  return <SessionGuard allowedRoles={[ROLES.GEN_ED_COORDINATOR]}>{children}</SessionGuard>;
}
