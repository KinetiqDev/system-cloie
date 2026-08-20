"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type EvaluationToolsTab = "templates" | "published";

type EvaluationToolsTabsProps = {
  initialTab?: EvaluationToolsTab;
  templates: ReactNode;
  published: ReactNode;
  action?: ReactNode;
};

function updateTabInUrl(tab: EvaluationToolsTab) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("tab", tab);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function EvaluationToolsTabs({
  initialTab = "templates",
  templates,
  published,
  action,
}: EvaluationToolsTabsProps) {
  const [activeTab, setActiveTab] = useState<EvaluationToolsTab>(initialTab);

  function handleTabChange(value: string) {
    if (value !== "templates" && value !== "published") return;

    const tab = value as EvaluationToolsTab;
    setActiveTab(tab);
    updateTabInUrl(tab);
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList variant="line" className="h-auto gap-4">
          <TabsTrigger value="templates" className="px-1 py-2.5 text-sm">
            Templates
          </TabsTrigger>
          <TabsTrigger value="published" className="px-1 py-2.5 text-sm">
            Published
          </TabsTrigger>
        </TabsList>

        {action}
      </div>

      <TabsContent value="templates" className="pt-6">
        {templates}
      </TabsContent>

      <TabsContent value="published" className="pt-6">
        {published}
      </TabsContent>
    </Tabs>
  );
}
