import Link from "next/link";
import { BookOpen, FilePlus2 } from "lucide-react";

import { BackLink } from "@/components/ui/back-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { EvaluationTemplateType } from "../types";

/**
 * A template a role may start a new template from: an institutional baseline for
 * Program Heads, or any template shared with faculty for faculty members. The
 * chooser never copies anything — it routes into the builder, and the first save
 * derives the owned template.
 */
export type TemplateStartSource = {
  id: string;
  name: string;
  description: string | null;
  templateType: EvaluationTemplateType;
  facultyAccessible: boolean;
  /**
   * Provenance marker, mirroring the tools list. Omitted when every source on
   * the page shares one origin and the section heading already says it.
   */
  origin?: "institutional" | "program-owned";
  /** Optional extra source detail, e.g. the owning Program code. */
  originMeta?: string;
  /** Bound course code on shared course-bound templates. */
  boundCourseCode?: string | null;
  sectionCount: number;
  questionCount: number;
  /** Verb on the card action, e.g. "Use this baseline" or "Use this template". */
  actionLabel: string;
  /** Builder entry that pre-fills this source's structure. */
  href: string;
};

type TemplateStartChooserProps = {
  backHref: string;
  /** Context line above the heading, normally the Program label. */
  eyebrow: string;
  heading: string;
  intro: string;
  blankDescription: string;
  blankHref: string;
  sourcesHeading: string;
  sourcesDescription: string;
  sources: TemplateStartSource[];
  emptySourcesTitle: string;
  emptySourcesDescription: string;
};

function StartBlankOption({ description, href }: { description: string; href: string }) {
  return (
    <section aria-labelledby="start-blank-heading">
      <div className="border-input flex flex-col gap-4 rounded-xl border border-dashed p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
          >
            <FilePlus2 className="size-4.5" />
          </span>
          <div className="space-y-1">
            <h2 id="start-blank-heading" className="text-title-md text-text-primary">
              Blank template
            </h2>
            <p className="text-body-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full shrink-0 sm:w-auto"
          render={<Link href={href} />}
        >
          Start blank
        </Button>
      </div>
    </section>
  );
}

function SourceBadges({ source }: { source: TemplateStartSource }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="text-xs">
        {source.templateType === "PROGRAM_WIDE" ? "Program-wide" : "Course-bound"}
      </Badge>
      {source.boundCourseCode && (
        <Badge
          variant="information"
          className="max-w-[10rem] text-xs"
          title={`Bound course: ${source.boundCourseCode}`}
        >
          <BookOpen aria-hidden="true" />
          <span className="truncate">{source.boundCourseCode}</span>
        </Badge>
      )}
      {source.facultyAccessible && (
        <Badge variant="outline" className="text-xs">
          Faculty Access
        </Badge>
      )}
      {source.origin && (
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              source.origin === "institutional" ? "bg-brand-accent" : "bg-primary"
            )}
          />
          <span className="text-xs">
            {source.origin === "institutional" ? "Institutional baseline" : "Program-owned"}
          </span>
          {source.originMeta && (
            <span className="text-muted-foreground text-xs">· {source.originMeta}</span>
          )}
        </span>
      )}
    </div>
  );
}

function StartSourceCard({ source }: { source: TemplateStartSource }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-title-md">{source.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {source.description && (
          <p className="text-body-sm text-muted-foreground">{source.description}</p>
        )}
        <SourceBadges source={source} />
      </CardContent>
      <CardFooter className="mt-auto flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-foreground tabular-nums">
          {source.sectionCount} section{source.sectionCount === 1 ? "" : "s"} ·{" "}
          {source.questionCount} question{source.questionCount === 1 ? "" : "s"}
        </p>
        <Button className="w-full sm:w-auto" render={<Link href={source.href} />}>
          {source.actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Two-path starting-point chooser shared by the Program Head and faculty
 * template-creation flows. The blank path stays first and compact so neither
 * role has to scroll past a growing baseline catalog to build from scratch.
 */
export function TemplateStartChooser({
  backHref,
  eyebrow,
  heading,
  intro,
  blankDescription,
  blankHref,
  sourcesHeading,
  sourcesDescription,
  sources,
  emptySourcesTitle,
  emptySourcesDescription,
}: TemplateStartChooserProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="space-y-3">
        <BackLink href={backHref}>Back to Evaluation Tools</BackLink>
        <div className="space-y-2">
          <p className="text-label-sm text-muted-foreground tracking-wider uppercase">{eyebrow}</p>
          <h1 className="text-heading-xl text-text-primary">{heading}</h1>
          <p className="text-body-sm text-muted-foreground">{intro}</p>
        </div>
      </div>

      <StartBlankOption description={blankDescription} href={blankHref} />

      <section aria-labelledby="start-sources-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="start-sources-heading" className="text-heading-md text-text-primary">
            {sourcesHeading}
          </h2>
          {sources.length > 0 && (
            <Badge variant="outline" className="text-xs tabular-nums">
              {sources.length} available
            </Badge>
          )}
        </div>
        <p className="text-body-sm text-muted-foreground">{sourcesDescription}</p>

        {sources.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilePlus2 aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>{emptySourcesTitle}</EmptyTitle>
              <EmptyDescription>{emptySourcesDescription}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="grid gap-4 lg:grid-cols-2">
            {sources.map((source) => (
              <li key={source.id} className="flex">
                <StartSourceCard source={source} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
