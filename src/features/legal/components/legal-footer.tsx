import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function LegalFooter() {
  return (
    <footer className="mt-16 bg-surface">
      <Separator />
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-text-muted">System CLOIE · Assumption College of Davao</p>
        <nav aria-label="Legal and portal links" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacy" className="text-text-secondary underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Privacy Notice</Link>
          <Link href="/terms" className="text-text-secondary underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Terms of Use</Link>
          <Link href="/" className="text-text-secondary underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Portal selection</Link>
        </nav>
      </div>
    </footer>
  );
}
