import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { EntryShell } from "@/features/entry";
import { buttonVariants } from "@/components/ui/button";
import { buildPageTitle } from "@/lib/page-title";

export const metadata = {
  title: buildPageTitle("Staff & Faculty"),
  description: "Staff and faculty access to evaluation management in System CLOIE.",
};

export default function StaffLandingPage() {
  return (
    <EntryShell
      title="Staff & Faculty"
      description="Manage evaluations and learning-outcome evidence with System CLOIE."
      backLink={{ href: "/", label: "Choose another audience" }}
      footer={
        <p className="text-body-sm text-muted-foreground">
          New faculty member?{" "}
          <Link
            href="/register/faculty"
            className="text-link hover:text-primary-hover font-medium underline-offset-4 hover:underline"
          >
            Submit a Faculty request
          </Link>
        </p>
      }
    >
      <p className="text-body-md text-muted-foreground leading-relaxed">
        Use your ACD Google account to open your assigned workspace. If you have more than one role,
        choose a workspace after sign-in.
      </p>
      <Link href="/login/staff" className={buttonVariants({ className: "w-full" })}>
        Staff &amp; faculty sign in
        <ArrowRight aria-hidden="true" />
      </Link>
      <p className="text-body-sm text-muted-foreground leading-relaxed">
        For Secretary, Dean, Program Head, General Education Coordinator, and Faculty accounts.
      </p>
    </EntryShell>
  );
}
