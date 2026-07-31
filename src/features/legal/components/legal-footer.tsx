import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function LegalFooter() {
  return (
    <footer className="bg-surface mt-16">
      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-8 pb-28 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:pb-8 lg:px-8">
        <p className="text-text-muted">System CLOIE · Assumption College of Davao</p>
        <nav aria-label="Legal and portal links" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/privacy"
            className="text-text-secondary hover:text-primary focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Privacy Notice
          </Link>
          <Link
            href="/terms"
            className="text-text-secondary hover:text-primary focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Terms of Use
          </Link>
          <Link
            href="/"
            className="text-text-secondary hover:text-primary focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Portal selection
          </Link>
        </nav>
      </div>
    </footer>
  );
}
