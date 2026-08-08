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
    <div className="bg-background text-text-primary min-h-screen">
      <a
        href="#legal-document"
        className="bg-primary text-primary-foreground focus-visible:ring-ring fixed top-2 left-2 z-50 -translate-y-20 rounded-md px-4 py-2 text-sm font-medium shadow-md transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:outline-none"
      >
        Skip to document
      </a>
      <header className="border-border/80 bg-background/95 border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="focus-visible:ring-ring flex items-center gap-3 rounded-md focus-visible:ring-2 focus-visible:outline-none"
          >
            <Image
              src="/logos/cloie-logo.png"
              alt="CLOIE"
              width={486}
              height={513}
              className="h-9 w-auto"
            />
            <span className="text-title-md text-link font-bold">System CLOIE</span>
          </Link>
          <nav aria-label="Public navigation" className="flex items-center gap-4 text-sm">
            <Link
              href="/"
              className="text-text-secondary hover:text-primary focus-visible:ring-ring underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              Portal selection
            </Link>
            <Link
              href={otherDocumentPath}
              className="text-text-secondary hover:text-primary focus-visible:ring-ring hidden underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none sm:inline"
            >
              {otherDocumentLabel}
            </Link>
          </nav>
        </div>
      </header>
      <LegalPageHeader document={document} />
      <Separator />
      <main
        id="legal-document"
        tabIndex={-1}
        className="mx-auto grid max-w-7xl scroll-mt-6 gap-6 px-4 pt-8 pb-28 outline-none sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:px-8 lg:py-12"
      >
        <LegalDocumentNav document={document} />
        <LegalDocumentContent document={document} />
      </main>
      <LegalFooter />
    </div>
  );
}
