import Link from "next/link";
import type { LegalDocument } from "../types";

export function LegalDocumentNav({ document }: { document: LegalDocument }) {
  const links = document.sections.map((section) => (
    <li key={section.id}>
      <Link
        href={`#${section.id}`}
        className="flex min-h-11 items-center text-text-secondary underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {section.title}
      </Link>
    </li>
  ));

  return (
    <>
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        <nav aria-label={`${document.shortTitle} sections`}>
          <p className="text-sm font-semibold text-text-primary">On this page</p>
          <ol className="mt-2 flex flex-col gap-0 border-l border-border pl-4 text-sm">
            {links}
          </ol>
        </nav>
      </aside>

      <details className="rounded-lg border border-border bg-surface lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-text-primary marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
          <span>On this page</span>
          <span aria-hidden="true" className="text-lg leading-none text-text-muted">+</span>
        </summary>
        <nav aria-label={`${document.shortTitle} sections`} className="border-t border-border px-4 py-3">
          <ol className="flex max-h-[50vh] flex-col gap-0 overflow-y-auto border-l border-border pl-4 text-sm">
            {links}
          </ol>
        </nav>
      </details>
    </>
  );
}
