import { Book, GraduationCap, Mail, ShieldCheck, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";
import { prisma } from "@/lib/db/prisma";

export default async function StudentProfilePage() {
  const session = await resolveAuthSession();

  const [profile, enrollment] = await Promise.all([
    session
      ? prisma.studentAcademicProfile.findUnique({
          where: { user_id: session.userId },
          include: {
            major: true,
            program: true,
            user: { select: { first_name: true, last_name: true, email: true } },
          },
        })
      : Promise.resolve(null),
    session
      ? prisma.studentEnrollment.findFirst({
          where: { student_user_id: session.userId, is_active: true },
          orderBy: { created_at: "desc" },
          include: {
            term: { include: { school_year: true } },
          },
        })
      : Promise.resolve(null),
  ]);

  const fullName = profile ? `${profile.user.first_name} ${profile.user.last_name}` : "Student";

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and academic classification.
        </p>
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
                {profile?.user.email ?? "No email available"}
              </div>
            </div>
            <div className="pt-2">
              <Badge variant="secondary" className="bg-primary-soft text-selected-fg font-bold">
                Role: Student
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-text-secondary rounded-lg p-2">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Academic Context</CardTitle>
              <CardDescription>Your current classification</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Student ID
                </label>
                <p>{profile?.student_id_number ?? "Not set"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Year Level
                </label>
                <p>{getYearLevelDisplay(enrollment?.year_level)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                Program
              </label>
              <p className="flex items-center gap-2">
                <Book className="text-text-muted size-4" />
                {profile?.program.name ?? "Not set"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Major
                </label>
                <p>{profile?.major?.name ?? "Program-wide"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Academic Year
                </label>
                <p>{enrollment?.term.school_year.code ?? "Not set"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-text-muted text-label-sm font-black tracking-widest uppercase">
                  Section
                </label>
                <p>
                  {enrollment?.section
                    ? enrollment.section.charAt(0) + enrollment.section.slice(1).toLowerCase()
                    : "Not set"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
