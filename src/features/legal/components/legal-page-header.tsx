import type { LegalDocument } from "../types";

export function LegalPageHeader({ document }: { document: LegalDocument }) {
  return (
    <header className="border-border/80 bg-background border-b">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-link mb-3 text-sm font-semibold tracking-[0.16em] uppercase">
            System CLOIE legal document
          </p>
          <h1 className="text-heading-xl text-text-primary sm:text-display-md font-bold tracking-tight">
            {document.title}
          </h1>
          <p className="text-body-lg text-text-secondary mt-5 max-w-2xl leading-8">
            {document.description}
          </p>
        </div>
        <div className="border-warning/50 bg-warning-soft grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-1">
          <strong className="text-warning font-semibold">Publication status</strong>
          <span className="text-text-secondary">{document.approvalStatus}</span>
          <span className="hidden sm:block" aria-hidden="true" />
          <span className="text-text-secondary leading-6">{document.approvalNote}</span>
        </div>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-text-primary font-semibold">Version</dt>
            <dd className="text-text-secondary mt-1">{document.version}</dd>
          </div>
          <div>
            <dt className="text-text-primary font-semibold">Effective date</dt>
            <dd className="text-text-secondary mt-1">{document.effectiveDate}</dd>
          </div>
          <div>
            <dt className="text-text-primary font-semibold">Last updated</dt>
            <dd className="text-text-secondary mt-1">{document.lastUpdated}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
