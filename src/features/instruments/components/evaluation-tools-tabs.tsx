"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ListCardViewMode as ToolsViewMode } from "@/components/layout/view-selector";

export type EvaluationToolsTab = "templates" | "published";

type EvaluationToolsTabsProps = {
  initialTab?: EvaluationToolsTab;
  templates: ReactNode;
  published: ReactNode;
  /** List/Card view toggle rendered in the right-aligned tab toolbar. */
  viewControl?: ReactNode;
};

/**
 * Persist `tab` and `view` to the URL. Each key is written independently so a
 * toggle never wipes the other parameter; the default value is omitted to keep
 * shareable URLs canonical.
 */
export function updateToolsUrl({ tab, view }: { tab?: EvaluationToolsTab; view?: ToolsViewMode }) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (tab) {
    url.searchParams.set("tab", tab);
  }
  if (view) {
    if (view === "card") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", view);
    }
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function EvaluationToolsTabs({
  initialTab = "templates",
  templates,
  published,
  viewControl,
}: EvaluationToolsTabsProps) {
  const [activeTab, setActiveTab] = useState<EvaluationToolsTab>(initialTab);

  function handleTabChange(value: string) {
    if (value !== "templates" && value !== "published") return;

    const tab = value as EvaluationToolsTab;
    setActiveTab(tab);
    updateToolsUrl({ tab });
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <TabsList variant="line" className="self-start">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        {viewControl && <div className="ml-auto shrink-0">{viewControl}</div>}
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
