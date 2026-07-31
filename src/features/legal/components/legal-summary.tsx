import Link from "next/link";
import type { LegalDocument } from "../types";

export function LegalSummary({ document }: { document: LegalDocument }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-6 text-text-secondary">
      {document.summary.paragraphs.slice(0, 2).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      <Link
        href={document.kind === "privacy" ? "/privacy" : "/terms"}
        className="font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Read the full {document.shortTitle}
      </Link>
    </div>
  );
}
