import { Book } from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  ProfileDataPrivacyNotice,
  ProfilePersonalInfoCard,
} from "@/features/users/components/profile-cards";
import { prisma } from "@/lib/db/prisma";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Profile", "Alumni") };

export default async function AlumniProfilePage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
    },
  });

  const fullName = user ? user.name : "Alumni";

  // Try to resolve program context from external invite or any available association
  const invite = await prisma.externalStakeholderInvite.findFirst({
    where: {
      email: user?.email ?? "",
      role: "ALUMNI",
      status: "ACCEPTED",
    },
    include: {
      program: true,
    },
  });

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and program affiliation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfilePersonalInfoCard
          fullName={fullName}
          email={user?.email}
          role="Alumni"
          labelClassName="text-text-muted text-label-sm font-black tracking-widest uppercase"
        />

        {/* Program Context */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-text-secondary rounded-lg p-2">
              <Book className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Program Affiliation</CardTitle>
              <CardDescription>Your graduated program context</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            <div className="space-y-1">
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Program
              </label>
              <p className="flex items-center gap-2">
                <Book className="text-text-muted size-4" />
                {invite?.program?.name ?? "Not specified"}
              </p>
            </div>
            {invite?.program && (
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Program Code
                </label>
                <p>{invite.program.code}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <ProfileDataPrivacyNotice />
      </div>
    </div>
  );
}
