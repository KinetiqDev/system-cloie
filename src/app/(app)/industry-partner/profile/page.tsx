import { Book, Building2, Briefcase, Mail, ShieldCheck, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";

export default async function IndustryPartnerProfilePage() {
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
      industry_partner_profile: {
        include: {
          program: true,
        },
      },
    },
  });

  const fullName = user ? `${user.first_name} ${user.last_name}` : "Industry Partner";

  const profile = user?.industry_partner_profile;

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and company affiliation.
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
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Full Name
              </label>
              <p className="text-sm font-semibold">{fullName}</p>
            </div>
            <div className="space-y-1">
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Email Address
              </label>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Mail className="text-text-muted size-4" />
                {user?.email ?? "No email available"}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-bold">
                Role: Industry Partner
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Company Context */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-secondary rounded-lg p-2">
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
            <div className="space-y-1">
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Affiliated Program
              </label>
              <p className="flex items-center gap-2">
                <Book className="text-text-muted size-4" />
                {profile?.program?.name ?? "Not specified"}
              </p>
            </div>
            {profile?.program && (
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Program Code
                </label>
                <p>{profile.program.code}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Privacy Notice */}
        <Card className="border-border border-l-primary border-l-4 shadow-sm md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary-soft text-selected-fg shrink-0 rounded-lg p-2">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-2">
                <h2 className="text-text-primary font-bold">Data Privacy & Responses</h2>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Your evaluation responses are handled confidentially and are reported only in
                  aggregated form. Once an evaluation is finalized and submitted, it cannot be
                  modified to protect the integrity of results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
