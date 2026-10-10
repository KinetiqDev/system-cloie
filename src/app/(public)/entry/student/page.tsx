import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EntryShell } from "@/features/entry";
import { buttonVariants } from "@/components/ui/button";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Students"),
  description: "Student access to course evaluations in System CLOIE.",
};

export default function StudentLandingPage() {
  return (
    <EntryShell
      title="Students"
      description="Answer your course evaluations with System CLOIE."
      backLink={{ href: "/", label: "Choose another audience" }}
    >
      <p className="text-body-md text-muted-foreground leading-relaxed">
        Sign in with your ACD Google account to view available evaluations and continue your saved
        responses.
      </p>
      <Link href="/login/student" className={buttonVariants({ className: "w-full" })}>
        Student sign in
        <ArrowRight aria-hidden="true" />
      </Link>
      <p className="text-body-sm text-muted-foreground leading-relaxed">
        The Secretary&apos;s office sets up your account. If you cannot sign in, contact the office
        for help.
      </p>
    </EntryShell>
  );
}
