import { Building2, Library } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { ProfilePersonalInfoCard } from "@/features/users/components/profile-cards";
import { prisma } from "@/lib/db/prisma";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Profile", "Gen Ed Coordinator") };

// fallow-ignore-next-line complexity
export default async function GenEdCoordinatorProfilePage() {
  const session = await resolveAuthSession();
  if (!session) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true, email: true },
  });
  const fullName = user ? user.name : "Gen Ed Coordinator";

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="text-heading-xl text-foreground text-pretty">Profile</h1>
        <p className="text-body-sm text-muted-foreground">
          Review your account information and coordinator scope.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ProfilePersonalInfoCard
          fullName={fullName}
          email={user?.email}
          role="Gen Ed Coordinator"
          titleClassName="text-title-md"
          labelTag="p"
        />
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
          <CardContent className="text-body-sm space-y-4 pt-4 font-semibold">
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground tracking-wider uppercase">Scope</p>
              <p className="flex items-center gap-2">
                <Building2 aria-hidden="true" className="text-muted-foreground size-4" />
                College-Wide
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-label-sm text-muted-foreground tracking-wider uppercase">
                Authority
              </p>
              <p>General Education CourseAssignments across all active programs</p>
            </div>
            <p className="text-caption text-muted-foreground font-normal">
              College-wide General Education scope. No portfolio assignment.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
