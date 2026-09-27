import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ROLES, type Role } from "@/lib/constants/roles";
import { ensureRoleAccess } from "@/features/auth/policies/ensure-role-access";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

type SessionGuardProps = {
  children: ReactNode;
  allowedRoles?: Role[];
};

const STUDENT_ROUTE_ROLES: Role[] = [ROLES.STUDENT];

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

    const isStudentProtectedRoute = allowedRoles.some((role) => STUDENT_ROUTE_ROLES.includes(role));
    const hasStudentLikeRole = session.roles.some((role) => STUDENT_ROUTE_ROLES.includes(role));

    if (isStudentProtectedRoute && hasStudentLikeRole && !session.studentProfileId) {
      redirect(
        resolvePostLoginDestination({
          requestedPath: "/dashboard",
          intent: "student",
          activeRole: ROLES.STUDENT,
          profileGate: { status: "STUDENT_ONBOARDING_REQUIRED", intent: "student" },
        })
      );
    }
  }

  return <>{children}</>;
}
