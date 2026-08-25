"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Archive, Plus } from "lucide-react";
import { CalendarStructureView } from "@/features/academic-calendar/components/calendar-structure-view";
import { SchoolYearForm } from "@/features/academic-calendar/components/school-year-form";
import type { SchoolYearWithTerms } from "@/features/academic-calendar/types";

export type SchoolYearsTab = "active" | "archived";

interface SchoolYearsClientPageProps {
  initialActive: SchoolYearWithTerms[];
  initialArchived: SchoolYearWithTerms[];
  initialTab?: SchoolYearsTab;
}

/**
 * Persist the selected tab to the URL. The canonical default (active) is
 * omitted so shareable URLs stay canonical.
 */
function updateSchoolYearsUrl(tab: SchoolYearsTab) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (tab === "archived") {
    url.searchParams.set("tab", tab);
  } else {
    url.searchParams.delete("tab");
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

export function SchoolYearsClientPage({
  initialActive,
  initialArchived,
  initialTab = "active",
}: SchoolYearsClientPageProps) {
  const [tab, setTab] = useState<SchoolYearsTab>(initialTab);
  const [open, setOpen] = useState(false);

  function handleTabChange(value: string) {
    if (value !== "active" && value !== "archived") return;
    setTab(value);
    updateSchoolYearsUrl(value);
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">School Years</h1>
        <p className="text-muted-foreground mt-1">
          Manage academic years, semesters, and their terms
        </p>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange} className="w-full">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="h-auto gap-4">
            <TabsTrigger value="active" className="px-1 py-2.5 text-sm">
              Active
            </TabsTrigger>
            <TabsTrigger value="archived" className="px-1 py-2.5 text-sm">
              Archived
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create School Year
          </Button>
        </div>

        <TabsContent value="active" className="pt-6">
          <CalendarStructureView schoolYears={initialActive} />
        </TabsContent>

        <TabsContent value="archived" className="pt-6">
          {initialArchived.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Archive aria-hidden />
                </EmptyMedia>
                <EmptyTitle>No archived school years</EmptyTitle>
                <EmptyDescription>
                  Archived years stay here for reference after you archive one.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTabChange("active")}
                >
                  View active school years
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <CalendarStructureView schoolYears={initialArchived} />
          )}
        </TabsContent>
      </Tabs>

      <SchoolYearForm
        open={open}
        onOpenChange={setOpen}
        onSuccess={() => setOpen(false)}
      />
    </div>
  );
}
