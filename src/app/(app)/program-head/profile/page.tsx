import { ArrowRight, Book, Mail, User } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";

export default async function ProgramHeadProfilePage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/portal/respondents");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      program_head_assignments: {
        where: { is_active: true },
        include: {
          program: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { program: { code: "asc" } },
      },
    },
  });

  const fullName = user ? user.name : "Program Head";

  const assignments = user?.program_head_assignments ?? [];

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and program assignments.
        </p>
        <Link
          href="/program-head"
          className={buttonVariants({ variant: "outline", className: "mt-4" })}
        >
          Choose a Program to manage
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        </Link>
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
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                Full Name
              </label>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="text-text-muted size-4" />
                {user?.email ?? "No email available"}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-bold">
                Role: Program Head
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Program Assignments */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-text-secondary rounded-lg p-2">
              <Book className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Program Assignments</CardTitle>
              <CardDescription>Programs you are assigned to manage</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            {assignments.length === 0 ? (
              <p className="text-text-muted">No active program assignments.</p>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.program.id} className="space-y-1">
                  <label className="text-label-sm text-muted-foreground tracking-wider uppercase">
                    {assignment.program.code}
                  </label>
                  <p className="flex items-center gap-2">
                    <Book className="text-text-muted size-4" />
                    {assignment.program.name}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
