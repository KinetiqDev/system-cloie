import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { switchActiveRole } from "@/lib/actions/switch-role-action";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import type { Role } from "@/lib/constants/roles";
import { formatRole, getRoleBadgeClass } from "@/features/users/lib/role-visuals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type RoleCardCopy = {
  frame: string | undefined;
  badge: ReactNode;
  description: string;
  variant: "secondary" | "default";
  action: string;
};

function roleCardCopy(role: Role, isActive: boolean): RoleCardCopy {
  if (isActive) {
    return {
      frame: "border-primary/50",
      badge: <span className="text-caption text-primary font-semibold">Current</span>,
      description: "You are currently working in this role.",
      variant: "secondary",
      action: "Continue",
    };
  }
  return {
    frame: undefined,
    badge: null,
    description: `Continue to System CLOIE as ${formatRole(role).toLowerCase()}.`,
    variant: "default",
    action: `Switch to ${formatRole(role)}`,
  };
}

function RoleSelectCard({ role, isActive }: { role: Role; isActive: boolean }) {
  const copy = roleCardCopy(role, isActive);
  return (
    <Card className={copy.frame}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <Badge className={getRoleBadgeClass(role)}>{formatRole(role)}</Badge>
          {copy.badge}
        </div>
        <CardTitle>{formatRole(role)} workspace</CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={switchActiveRole.bind(null, role)}>
          <Button type="submit" variant={copy.variant}>
            {copy.action}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default async function SelectRolePage() {
  // SessionGuard in the parent layout guarantees a session exists here.
  // resolveAuthSession is cached per render (React cache), so no extra DB call.
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  if (session.roles.length <= 1) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-title-lg text-foreground font-bold tracking-tight">
          Choose your workspace
        </h1>
        <p className="text-body-md text-muted-foreground">
          Your account has more than one role. Select which workspace to continue with — you can
          switch again at any time from the top bar.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {session.roles.map((role) => (
          <RoleSelectCard key={role} role={role} isActive={session.activeRole === role} />
        ))}
      </div>
    </div>
  );
}
