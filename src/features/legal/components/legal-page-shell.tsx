import Image from "next/image";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import type { LegalDocument } from "../types";
import { LegalDocumentContent } from "./legal-document-content";
import { LegalDocumentNav } from "./legal-document-nav";
import { LegalFooter } from "./legal-footer";
import { LegalPageHeader } from "./legal-page-header";

export function LegalPageShell({ document }: { document: LegalDocument }) {
  const otherDocumentPath = document.kind === "privacy" ? "/terms" : "/privacy";
  const otherDocumentLabel = document.kind === "privacy" ? "Terms of Use" : "Privacy Notice";
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <a
        href="#legal-document"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-md transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Skip to document
      </a>
      <header className="border-b border-border/80 bg-background/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Image src="/logos/cloie-logo.png" alt="CLOIE" width={486} height={513} className="h-9 w-auto" />
            <span className="text-title-md font-bold text-primary">System CLOIE</span>
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-text-secondary underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Portal selection</Link>
            <Link href={otherDocumentPath} className="hidden text-text-secondary underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline">{otherDocumentLabel}</Link>
          </nav>
        </div>
      </header>
      <LegalPageHeader document={document} />
      <Separator />
      <main
        id="legal-document"
        tabIndex={-1}
        className="mx-auto grid max-w-7xl scroll-mt-6 gap-6 px-4 py-8 outline-none sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-12"
      >
        <LegalDocumentNav document={document} />
        <LegalDocumentContent document={document} />
      </main>
      <LegalFooter />
    </div>
  );
}
