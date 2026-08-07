import { Building2, Mail, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";

export default async function DeanProfilePage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      first_name: true,
      last_name: true,
      email: true,
    },
  });

  const fullName = user ? `${user.first_name} ${user.last_name}` : "College Dean";

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and institutional role.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-primary-soft text-selected-fg rounded-lg p-2">
              <User className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Personal Information</CardTitle>
              <CardDescription>Basic account details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <label className="text-text-muted text-[10px] font-black tracking-widest uppercase">
                Full Name
              </label>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-text-muted text-[10px] font-black tracking-widest uppercase">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="text-text-muted size-4" />
                {user?.email ?? "No email available"}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-bold">
                Role: College Dean
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Institutional Scope */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-secondary rounded-lg p-2">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Institutional Scope</CardTitle>
              <CardDescription>Your oversight and governance context</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            <div className="space-y-1">
              <label className="text-text-muted text-[10px] font-black tracking-widest uppercase">
                Scope
              </label>
              <p className="flex items-center gap-2">
                <Building2 className="text-text-muted size-4" />
                College-Wide
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-text-muted text-[10px] font-black tracking-widest uppercase">
                Access Level
              </label>
              <p>All programs and academic outcomes</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
