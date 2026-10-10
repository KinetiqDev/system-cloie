import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { CloieLogoMark } from "@/components/brand/cloie-logo-mark";
import { buttonVariants } from "@/components/ui/button";
import { AppearanceMenuTrigger } from "@/features/design-system/components/appearance-menu-trigger";
import { resolveAppearanceAvailability } from "@/features/design-system/services/resolve-appearance-availability";

const textLink =
  "text-link hover:text-primary-hover focus-visible:ring-ring inline-flex min-h-11 items-center gap-2 rounded-md font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2";

export function AudienceLanding({
  audience,
  introduction,
  loginHref,
  signInLabel,
  guideHref,
  children,
}: {
  audience: string;
  introduction: string;
  loginHref: string;
  signInLabel: string;
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <CloieLogoMark className="h-9" />
            <div>
              <p className="text-title-md font-bold">System CLOIE</p>
              <p className="text-body-sm text-muted-foreground">Assumption College of Davao</p>
            </div>
          </div>
          <nav aria-label="Page navigation" className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="#getting-started" className={textLink}>
              Getting started
            </a>
            <a href={guideHref} className={textLink}>
              User guide &amp; docs <BookOpen className="size-4" aria-hidden="true" />
            </a>
            <AppearanceMenuTrigger enabled={resolveAppearanceAvailability()} />
          </nav>
        </div>
      </header>
      <main id="audience-content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <section
          aria-labelledby="audience-heading"
          className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20 lg:py-24"
        >
          <div className="max-w-3xl">
            <h1
              id="audience-heading"
              className="text-display-md sm:text-display-lg font-extrabold tracking-tight text-balance"
            >
              {audience}
            </h1>
            <p className="text-body-lg text-muted-foreground mt-5 max-w-2xl leading-relaxed">
              {introduction}
            </p>
            <Link
              href={loginHref}
              className={buttonVariants({ className: "mt-8 w-full sm:w-auto" })}
            >
              {signInLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <div className="border-border flex size-28 shrink-0 items-center justify-center rounded-full border bg-white sm:size-32 lg:size-40">
              <Image
                src="/logos/acd-logo.png"
                alt="Assumption College of Davao seal"
                width={120}
                height={120}
                className="size-20 object-contain sm:size-24 lg:size-30"
                priority
              />
            </div>
            <CloieLogoMark className="size-28 sm:size-32 lg:size-40" priority />
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
            <a href={guideHref} className={textLink}>
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
      className="border-border scroll-mt-6 border-t py-10 sm:py-14"
    >
      <h2 id={`${id}-heading`} className="text-heading-xl font-bold text-balance">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function LandingTopics({
  items,
}: {
  items: readonly { title: string; description: string; href?: string }[];
}) {
  return (
    <ul className="grid gap-8 md:grid-cols-3 md:gap-10">
      {items.map(({ title, description, href }) => (
        <li key={title} className="min-w-0">
          <h3 className="text-heading-md font-semibold">{title}</h3>
          <p className="text-body-md text-muted-foreground mt-3 leading-relaxed">{description}</p>
          {href ? (
            <a href={href} className={`${textLink} text-body-sm mt-3`}>
              Read the guide<span className="sr-only">: {title}</span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
