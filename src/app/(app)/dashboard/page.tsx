import { redirect } from "next/navigation";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { resolvePostLoginDestination } from "@/features/auth/services/resolve-post-login-destination";

export default async function DashboardPage() {
  // SessionGuard in the parent layout guarantees a session exists here.
  // resolveAuthSession is cached per render (React cache), so no extra DB call.
  const session = await resolveAuthSession();

  if (!session) {
    // Should be unreachable — SessionGuard redirects unauthenticated users.
    redirect("/");
  }

  redirect(
    resolvePostLoginDestination({
      requestedPath: "/dashboard",
      intent: null,
      activeRole: session.activeRole,
      profileGate: session.profileGate,
    })
  );
}
