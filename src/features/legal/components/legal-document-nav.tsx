import Link from "next/link";
import type { LegalDocument } from "../types";
import {
  MobileLegalDocumentNav,
  type LegalNavigationDocument,
} from "./mobile-legal-document-nav";

export function LegalDocumentNav({ document }: { document: LegalDocument }) {
  const navigation: LegalNavigationDocument = {
    shortTitle: document.shortTitle,
    sections: document.sections.map((section) => ({ id: section.id, title: section.title })),
  };
  return (
    <>
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto">
        <nav aria-label={`${document.shortTitle} sections`}>
          <p className="text-text-primary text-sm font-semibold">On this page</p>
          <ol className="border-border mt-2 flex flex-col gap-0 border-l pl-4 text-sm">
            {document.sections.map((section) => (
              <li key={section.id}>
                <Link
                  href={`#${section.id}`}
                  className="text-text-secondary hover:text-primary focus-visible:ring-ring flex min-h-11 items-center underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
                >
                  {section.title}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </aside>

      <MobileLegalDocumentNav navigation={navigation} />
    </>
  );
}
