import { Building2, Library, Mail, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";

export default async function GenEdCoordinatorProfilePage() {
  const session = await resolveAuthSession();
  if (!session) redirect("/portal/respondents");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });
  const fullName = user ? user.name : "Gen Ed Coordinator";

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">Review your account information and coordinator scope.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
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
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">Full Name</label>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">Email Address</label>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="text-text-muted size-4" />
                {user?.email ?? "No email available"}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-bold">
                Role: Gen Ed Coordinator
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-text-secondary rounded-lg p-2">
              <Library className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Coordinator Scope</CardTitle>
              <CardDescription>General Education stewardship</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            <div className="space-y-1">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">Scope</label>
              <p className="flex items-center gap-2">
                <Building2 className="text-text-muted size-4" />
                College-Wide
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">Authority</label>
              <p>General Education CourseAssignments across all active programs</p>
            </div>
            <p className="text-text-muted text-xs font-normal">
              Scope derived from <code className="bg-muted rounded px-1 py-0.5">course.course_scope == GENERAL_EDUCATION</code>.
              No portfolio assignment table.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
