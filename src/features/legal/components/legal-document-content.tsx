import type { LegalDocument } from "../types";
import { LegalSectionView } from "./legal-section";

export function LegalDocumentContent({ document }: { document: LegalDocument }) {
  return (
    <article className="legal-prose min-w-0">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-5 sm:p-6">
        <h2 className="!mt-0">Summary</h2>
        <div className="legal-prose-blocks">
          {document.summary.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-8">
        {document.sections.map((section) => <LegalSectionView key={section.id} section={section} />)}
      </div>
    </article>
  );
}
