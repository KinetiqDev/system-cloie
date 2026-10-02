import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import type { Role } from "@/lib/constants/roles";
import { ensureRoleAccess } from "@/features/auth/policies/ensure-role-access";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

type SessionGuardProps = {
  children: ReactNode;
  allowedRoles?: Role[];
};

export async function SessionGuard({ children, allowedRoles = [] }: SessionGuardProps) {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/");
  }

  if (
    session.profileGate.status !== "COMPLETE" &&
    session.profileGate.status !== "DEFERRED_ENROLLMENT"
  ) {
    redirect(
      resolvePostLoginDestination({
        requestedPath: "/dashboard",
        intent: "intent" in session.profileGate ? session.profileGate.intent : null,
        activeRole: session.activeRole,
        profileGate: session.profileGate,
      })
    );
  }

  if (allowedRoles.length > 0) {
    const redirectPath = ensureRoleAccess({
      activeRole: session.activeRole,
      allowedRoles,
    });

    if (redirectPath) {
      redirect(redirectPath);
    }
  }

  return <>{children}</>;
}
