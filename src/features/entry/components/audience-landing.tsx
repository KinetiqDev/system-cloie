import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { CloieLogoMark } from "@/components/brand/cloie-logo-mark";
import { buttonVariants } from "@/components/ui/button";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

const textLink =
  "text-link hover:text-primary-hover focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-md font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2";

/**
 * The Help Center is a separate site, so a landing destination that leaves
 * System CLOIE opens in a new tab beside the page: the visitor keeps their
 * place, including a form they were filling, and `noopener noreferrer` gives
 * the opened document no handle back into this one. A same-origin path keeps
 * normal navigation. The in-app page Help link carries the same contract.
 */
function externalLinkAttributes(href: string) {
  return /^https?:\/\//.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

/**
 * Audience landing chrome. Identity stays in the header; the first screen
 * carries content instead: a scoped kicker, the audience, one statement of what
 * signing in does, the single action, and the numbered prerequisites beside it.
 * Body sections are rule-ruled lists; numerals are opt-in per list, because
 * numbering a set of parallel responsibilities asserts a sequence that is not
 * there — see `LandingItems`.
 */
export function AudienceLanding({
  audience,
  scope,
  statement,
  loginHref,
  signInLabel,
  secondaryAction,
  prerequisites,
  guideHref,
  children,
}: {
  audience: string;
  /** Who this entrance is for, in the visitor's own terms. */
  scope: string;
  /** One sentence: what signing in lets the visitor do. */
  statement: string;
  loginHref: string;
  signInLabel: string;
  secondaryAction?: { href: string; label: string };
  /** Short facts the visitor should know before they act. */
  prerequisites: readonly string[];
  guideHref: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <a
        href="#audience-content"
        className="bg-surface focus-visible:ring-ring sr-only rounded-md p-3 focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:ring-2"
      >
        Skip to content
      </a>
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-x-2 px-4 py-3 sm:gap-x-4 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <CloieLogoMark className="h-9" />
            <div className="min-w-0">
              <p className="text-title-md font-bold">System CLOIE</p>
              <p className="text-caption text-muted-foreground hidden md:block">
                Assumption College of Davao
              </p>
            </div>
          </div>
          <nav aria-label="Page navigation" className="flex shrink-0 items-center gap-2 md:gap-5">
            <a href="#before-you-sign-in" className={`${textLink} max-lg:hidden`}>
              Before you sign in
            </a>
            <a
              href={guideHref}
              aria-label="User guide &amp; docs"
              // Below `sm` the visible label is dropped, leaving the icon-only
              // form. The header must hold one row down to 320 px, and a bare
              // glyph beside the bordered appearance control reads as
              // decoration; it takes the icon-button treatment that control and
              // the topbar Help link already use. From `sm` up the labelled
              // link keeps the plain text treatment.
              className={`${textLink} max-sm:border-border max-sm:bg-background max-sm:aspect-square max-sm:min-w-11 max-sm:justify-center max-sm:border max-sm:shadow-2xs`}
              {...externalLinkAttributes(guideHref)}
            >
              <span className="hidden sm:inline">User guide &amp; docs</span>
              <BookOpen className="size-4 shrink-0" aria-hidden="true" />
            </a>
            <AppearanceMenuTrigger enabled={resolveAppearanceAvailability()} />
          </nav>
        </div>
      </header>
      <main id="audience-content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section
          aria-labelledby="audience-heading"
          className="grid gap-8 pt-10 pb-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-16 lg:pt-16 lg:pb-14"
        >
          <div className="max-w-2xl">
            <p className="text-body-sm text-muted-foreground font-medium">{scope}</p>
            <h1
              id="audience-heading"
              className="text-display-md lg:text-display-lg mt-2 tracking-tight text-balance"
            >
              {audience}
            </h1>
            <p className="text-body-lg text-muted-foreground mt-4">{statement}</p>
            <div className="mt-7 flex flex-col items-center gap-y-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
              <Link href={loginHref} className={buttonVariants({ className: "w-full sm:w-auto" })}>
                {signInLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              {secondaryAction ? (
                <Link href={secondaryAction.href} className={`${textLink} text-body-sm`}>
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          </div>
          <div
            id="before-you-sign-in"
            className="lg:border-border scroll-mt-6 lg:border-t lg:pt-6"
            aria-labelledby="before-you-sign-in-heading"
          >
            <h2 id="before-you-sign-in-heading" className="text-heading-lg">
              Before you sign in
            </h2>
            <ol className="mt-3">
              {prerequisites.map((item, index) => (
                <li
                  key={item}
                  className="border-border flex gap-3 border-t py-3 first:border-t-0 first:pt-0"
                >
                  <span className="text-body-sm text-muted-foreground shrink-0 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-body-sm min-w-0">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
        {children}
      </main>
      <footer className="border-border border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p className="text-body-sm text-muted-foreground">
            System CLOIE · Assumption College of Davao
          </p>
          <nav aria-label="Help and legal" className="text-body-sm flex flex-wrap gap-x-6 gap-y-2">
            <a href={guideHref} className={textLink} {...externalLinkAttributes(guideHref)}>
              Help Center
            </a>
            <Link href="/privacy" className={textLink}>
              Privacy Notice
            </Link>
            <Link href="/terms" className={textLink}>
              Terms of Use
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function LandingSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="border-border scroll-mt-6 border-t py-10 sm:py-12"
    >
      <h2 id={`${id}-heading`} className="text-heading-lg text-balance">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Rule-ruled items. A link on an item carries its own visible label: three
 * items whose links all read "Read the guide" are indistinguishable to a
 * visitor scanning the page, so the subject is never left to screen readers.
 *
 * Numerals are opt-in. They are right for prerequisites and lifecycle states,
 * where the order carries information; a set of parallel responsibilities
 * numbered 01/02/03 asserts a sequence the reader will look for and not find.
 */
export function LandingItems({
  items,
  numbered = false,
}: {
  items: readonly {
    title: string;
    description: string;
    link?: { href: string; label: string };
  }[];
  numbered?: boolean;
}) {
  const List = numbered ? "ol" : "ul";
  return (
    <List className="grid gap-x-12 md:grid-cols-2 lg:grid-cols-3">
      {items.map(({ title, description, link }, index) => (
        <li key={title} className="border-border min-w-0 border-t py-5">
          {numbered ? (
            <span className="text-body-sm text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
          ) : null}
          <h3 className={`text-heading-md ${numbered ? "mt-1" : ""}`}>{title}</h3>
          <p className="text-body-md text-muted-foreground mt-2">{description}</p>
          {link ? (
            <a
              href={link.href}
              className={`${textLink} text-body-sm`}
              {...externalLinkAttributes(link.href)}
            >
              {link.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </li>
      ))}
    </List>
  );
}

/** Two labelled columns of detail with one optional in-page action each. */
export function LandingColumns({
  items,
}: {
  items: readonly {
    title: string;
    description: string;
    action?: { href: string; label: string };
  }[];
}) {
  return (
    <div className="grid gap-x-12 gap-y-6 md:grid-cols-2">
      {items.map(({ title, description, action }) => (
        <div key={title} className="border-border min-w-0 border-t pt-5">
          <h3 className="text-heading-md">{title}</h3>
          <p className="text-body-md text-muted-foreground mt-2">{description}</p>
          {action ? (
            <Link
              href={action.href}
              className={`${textLink} text-body-sm`}
              {...externalLinkAttributes(action.href)}
            >
              {action.label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Framed link list: a short lead-in sentence, then rule-ruled destinations. */
export function LandingLinks({
  lead,
  items,
}: {
  lead: string;
  items: readonly { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-body-md text-muted-foreground max-w-2xl text-pretty">{lead}</p>
      <ul className="mt-4 grid gap-x-12 md:grid-cols-2">
        {items.map(({ label, href }) => (
          <li key={href} className="border-border border-t">
            <a href={href} className={textLink} {...externalLinkAttributes(href)}>
              {label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
