import { ArrowRight, Building2, Library, Mail, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { cn } from "@/lib/utils";

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
        <h1 className="text-heading-lg">Profile</h1>
        <p className="text-text-muted text-sm">Review your account information and coordinator scope.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/gen-ed-coordinator/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Back to Dashboard
            <ArrowRight aria-hidden="true" className="size-4" data-icon="inline-end" />
          </Link>
          <Link href="/gen-ed-coordinator/course-assignments" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Manage assignments
            <ArrowRight aria-hidden="true" className="size-4" data-icon="inline-end" />
          </Link>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-primary-soft text-selected-fg rounded-lg p-2">
              <User aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle className="text-title-md">Personal Information</CardTitle>
              <CardDescription>Basic account details</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground tracking-wider uppercase">Full Name</p>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground tracking-wider uppercase">Email Address</p>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail aria-hidden="true" className="text-text-muted size-4" />
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
              <Library aria-hidden="true" className="size-5" />
            </div>
            <div>
              <CardTitle className="text-title-md">Coordinator Scope</CardTitle>
              <CardDescription>General Education stewardship</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground tracking-wider uppercase">Scope</p>
              <p className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="text-text-muted size-4" />
                College-Wide
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground tracking-wider uppercase">Authority</p>
              <p>General Education CourseAssignments across all active programs</p>
            </div>
            <p className="text-text-muted text-xs font-normal">College-wide General Education scope. No portfolio assignment.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
