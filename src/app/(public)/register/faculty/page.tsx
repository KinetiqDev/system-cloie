import Link from "next/link";
import { EntryShell, FacultyRegisterForm, GoogleEntryButton } from "@/features/entry";
import { resolveAuthSession } from "@/features/auth/services/resolve-auth-session";
import { prisma } from "@/lib/db/prisma";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Faculty Registration"),
  description: "Submit an explicit Faculty request with program affiliation",
};

export default async function FacultyRegisterPage() {
  const session = await resolveAuthSession();
  const email = session?.email ?? null;

  if (!email) {
    return (
      <EntryShell
        backLink={{ href: "/entry/staff", label: "Staff & Faculty" }}
        title="Faculty registration"
        description="Faculty access starts with your ACD Google account, then an explicit request the institution reviews."
        footer={
          <p className="text-body-sm text-muted-foreground">
            Already have Faculty access?{" "}
            <Link
              href="/login/staff"
              className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
            >
              Sign in through staff entrance
            </Link>
          </p>
        }
      >
        <div className="bg-muted/50 border-border text-body-sm text-muted-foreground rounded-lg border p-4 leading-relaxed">
          Sign in with your ACD Google account first. On the next step you submit your program
          affiliation as a Faculty request — the request itself grants no Faculty access until your
          eligibility is confirmed.
        </div>
        <GoogleEntryButton
          intent="faculty"
          roleTitle="Faculty applicant"
          label="Continue with ACD Google"
          domainNote="ACD email required (@acd.edu.ph or @acdeducation.com). Reaching this page from an email domain never implies approval."
        />
      </EntryShell>
    );
  }

  // Complete sessions stay on the form: a Program Head who also teaches, or
  // any other signed-in holder, may request the Faculty context here. The
  // `requestFacultyAccess` action enforces eligibility server-side (existing
  // Faculty, pending requests, and ineligible accounts receive errors).

  const programs = await prisma.program.findMany({
    where: { is_active: true },
    select: { id: true, name: true, code: true },
    orderBy: { code: "asc" },
  });

  return (
    <EntryShell
      backLink={{ href: "/entry/staff", label: "Staff & Faculty" }}
      title="Faculty registration"
      description="Submit your details and program affiliation. Your request waits for review — it grants nothing until confirmed."
      footer={
        <p className="text-body-sm text-muted-foreground">
          Signed in as {email}.{" "}
          <Link
            href="/login/staff"
            className="text-primary hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Use staff sign-in instead
          </Link>
        </p>
      }
    >
      <FacultyRegisterForm email={email} programs={programs} />
    </EntryShell>
  );
}
