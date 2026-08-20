"use client";

import { FacultyPublishedEvaluationsTable } from "@/features/evaluations/components/faculty-published-evaluations-table";
import type { FacultyTemplateItem } from "../services/list-faculty-templates";
import type { FacultyPublishedEvaluationItem } from "@/features/evaluations/types";
import { TemplatesGrid } from "./templates-grid";
import { EvaluationToolsTabs, type EvaluationToolsTab } from "./evaluation-tools-tabs";

type FacultyToolsPageProps = {
  evaluations: FacultyPublishedEvaluationItem[];
  program: { code: string; id: string; name: string };
  templates: FacultyTemplateItem[];
  initialTab?: EvaluationToolsTab;
};

export function FacultyToolsPage({
  evaluations,
  program,
  templates,
  initialTab = "templates",
}: FacultyToolsPageProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Evaluation Tools</h1>
        <p className="text-muted-foreground text-sm">
          Manage templates and published evaluations for{" "}
          <span className="text-link font-semibold">
            {program.code} - {program.name}
          </span>
          .
        </p>
      </div>

      <EvaluationToolsTabs
        initialTab={initialTab}
        templates={<TemplatesGrid program={program} templates={templates} />}
        published={<FacultyPublishedEvaluationsTable evaluations={evaluations} />}
      />
    </div>
  );
}
