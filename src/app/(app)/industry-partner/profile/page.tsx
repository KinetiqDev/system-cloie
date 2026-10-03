import { Book, Building2, Briefcase } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import {
  ProfileDataPrivacyNotice,
  ProfilePersonalInfoCard,
} from "@/features/users/components/profile-cards";
import { prisma } from "@/lib/db/prisma";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = { title: buildPageTitle("Profile", "Industry Partner") };

export default async function IndustryPartnerProfilePage() {
  const session = await resolveAuthSession();

  if (!session) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      name: true,
      email: true,
      industry_partner_profile: {
        include: {
          program: true,
        },
      },
      industry_partner_program_affiliations: {
        include: { program: true },
        orderBy: { program: { code: "asc" } },
      },
    },
  });

  const fullName = user ? user.name : "Industry Partner";

  const profile = user?.industry_partner_profile;

  // The join table is the canonical multi-program record; the legacy single
  // program_id stays the fallback for Secretary-written profiles that predate
  // it. Union both so no affiliation any surface already shows can go missing
  // here — the same set the Secretary users list labels from.
  const affiliatedPrograms = (() => {
    const byId = new Map<string, { id: string; name: string; code: string }>();
    for (const affiliation of user?.industry_partner_program_affiliations ?? []) {
      if (affiliation.program) byId.set(affiliation.program_id, affiliation.program);
    }
    const legacy = profile?.program;
    if (legacy && !byId.has(legacy.id)) byId.set(legacy.id, legacy);
    return [...byId.values()].sort((a, b) => a.code.localeCompare(b.code));
  })();

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and company affiliation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ProfilePersonalInfoCard
          fullName={fullName}
          email={user?.email}
          role="Industry Partner"
          labelClassName="text-text-muted text-label-sm font-black tracking-widest uppercase"
        />

        {/* Company Context */}
        <Card className="border-border min-w-0 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-text-secondary rounded-lg p-2">
              <Building2 className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Company Information</CardTitle>
              <CardDescription>Your organization and program affiliation</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            <div className="space-y-1">
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Company Name
              </label>
              <p className="flex items-center gap-2">
                <Building2 className="text-text-muted size-4" />
                {profile?.company_name ?? "Not specified"}
              </p>
            </div>
            {profile?.position && (
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Position
                </label>
                <p className="flex items-center gap-2">
                  <Briefcase className="text-text-muted size-4" />
                  {profile.position}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Affiliated Program{affiliatedPrograms.length === 1 ? "" : "s"}
              </label>
              {affiliatedPrograms.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {affiliatedPrograms.map((program) => (
                    <li key={program.id} className="max-w-full min-w-0">
                      <Badge
                        variant="secondary"
                        className="bg-primary-soft text-selected-fg h-auto max-w-full items-start gap-1.5 rounded-lg text-left font-bold whitespace-normal"
                      >
                        <Book className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 wrap-anywhere">
                          {program.code} — {program.name}
                        </span>
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2">
                  <Book className="text-text-muted size-4" />
                  Not specified
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <ProfileDataPrivacyNotice />
      </div>
    </div>
  );
}
