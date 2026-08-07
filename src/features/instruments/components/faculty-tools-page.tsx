"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FacultyPublishedEvaluationsTable } from "@/features/evaluations/components/faculty-published-evaluations-table";
import type { FacultyTemplateItem } from "../services/list-faculty-templates";
import type { FacultyPublishedEvaluationItem } from "@/features/evaluations/types";
import { TemplatesGrid } from "./templates-grid";

type FacultyToolsPageProps = {
  evaluations: FacultyPublishedEvaluationItem[];
  program: { code: string; id: string; name: string };
  templates: FacultyTemplateItem[];
};

export function FacultyToolsPage({ evaluations, program, templates }: FacultyToolsPageProps) {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-text-primary text-2xl font-black">Evaluation Tools</h1>
        <p className="text-muted-foreground text-sm">
          Manage templates and published evaluations for{" "}
          <span className="text-primary font-semibold">
            {program.code} - {program.name}
          </span>
          .
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList variant="line" className="h-auto gap-4">
          <TabsTrigger value="templates" className="px-1 py-2.5 text-sm">
            Templates
          </TabsTrigger>
          <TabsTrigger value="published" className="px-1 py-2.5 text-sm">
            Published
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-6">
          <TemplatesGrid program={program} templates={templates} />
        </TabsContent>

        <TabsContent value="published" className="pt-6">
          <FacultyPublishedEvaluationsTable evaluations={evaluations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
