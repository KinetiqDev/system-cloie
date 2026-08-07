import { Book, Mail, User } from "lucide-react";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";

export default async function FacultyProfilePage() {
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
      faculty_program_affiliations: {
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

  const fullName = user ? `${user.first_name} ${user.last_name}` : "Faculty";

  const affiliations = user?.faculty_program_affiliations ?? [];

  return (
    <div className="motion-safe:animate-in motion-safe:fade-in max-w-4xl space-y-8 motion-safe:duration-500">
      <div>
        <h1 className="font-heading text-text-primary text-2xl font-black">Profile</h1>
        <p className="text-text-muted text-sm">
          Review your account information and program affiliations.
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
                Role: Faculty
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Program Affiliations */}
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <div className="bg-secondary-soft text-secondary rounded-lg p-2">
              <Book className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">Program Affiliations</CardTitle>
              <CardDescription>Programs you are affiliated with</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm font-semibold">
            {affiliations.length === 0 ? (
              <p className="text-text-muted">No active program affiliations.</p>
            ) : (
              affiliations.map((aff) => (
                <div key={aff.program.id} className="space-y-1">
                  <label className="text-text-muted text-[10px] font-black tracking-widest uppercase">
                    {aff.program.code}
                  </label>
                  <p className="flex items-center gap-2">
                    <Book className="text-text-muted size-4" />
                    {aff.program.name}
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
