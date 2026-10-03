"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Empty } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { StudentEvaluationListItem } from "@/features/responses/types";
import { EvaluationListCard } from "./evaluation-list-card";

interface EvaluationListBrowserProps {
  pending: StudentEvaluationListItem[];
  inProgress: StudentEvaluationListItem[];
  submitted: StudentEvaluationListItem[];
}

const EVALUATION_TABS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "submitted", label: "Submitted" },
] as const;

type EvaluationTab = (typeof EVALUATION_TABS)[number]["value"];

function isEvaluationTab(value: string | null): value is EvaluationTab {
  return EVALUATION_TABS.some((tab) => tab.value === value);
}

const SEARCHABLE_FIELDS: ReadonlyArray<keyof StudentEvaluationListItem> = [
  "evaluationTitle",
  "courseTitle",
  "programLabel",
  "facultyName",
];

function filterItems(
  items: StudentEvaluationListItem[],
  term: string
): StudentEvaluationListItem[] {
  if (!term.trim()) {
    return items;
  }
  const needle = term.trim().toLowerCase();
  return items.filter((item) =>
    SEARCHABLE_FIELDS.some((field) => {
      const value = item[field];
      return typeof value === "string" && value.toLowerCase().includes(needle);
    })
  );
}

function EvaluationTabList({
  items,
  emptyCopy,
}: {
  items: StudentEvaluationListItem[];
  emptyCopy: string;
}) {
  if (items.length === 0) {
    return (
      <Empty>
        <p className="text-muted-foreground font-medium">{emptyCopy}</p>
      </Empty>
    );
  }
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <EvaluationListCard key={item.assignmentId} {...item} />
      ))}
    </div>
  );
}

export function EvaluationListBrowser({
  pending,
  inProgress,
  submitted,
}: EvaluationListBrowserProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");

  const urlTab = searchParams.get("tab");
  const resolvedUrlTab: EvaluationTab = isEvaluationTab(urlTab) ? urlTab : "pending";

  function selectTab(value: string) {
    if (!isEvaluationTab(value) || value === resolvedUrlTab) return;

    // Native history updates Next's search params without rerunning the server read.
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    const query = params.toString();
    window.history.pushState(null, "", `${pathname}?${query}${window.location.hash}`);
  }

  const filteredPending = useMemo(() => filterItems(pending, searchTerm), [pending, searchTerm]);
  const filteredInProgress = useMemo(
    () => filterItems(inProgress, searchTerm),
    [inProgress, searchTerm]
  );
  const filteredSubmitted = useMemo(
    () => filterItems(submitted, searchTerm),
    [submitted, searchTerm]
  );

  const searchActive = searchTerm.trim().length > 0;
  const noMatchCopy = searchActive ? "No evaluations match your search." : undefined;

  return (
    <Tabs value={resolvedUrlTab} onValueChange={selectTab} className="w-full">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <TabsList
          variant="pill"
          aria-label="Evaluation status"
          className="max-w-full justify-start overflow-x-auto"
        >
          {EVALUATION_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="relative w-full md:w-64">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search evaluations..."
            aria-label="Search evaluations"
            className="min-h-11 pl-9"
          />
        </div>
      </div>

      <TabsContent value="pending" className="pt-6">
        <EvaluationTabList
          items={filteredPending}
          emptyCopy={noMatchCopy ?? "No pending evaluations found."}
        />
      </TabsContent>

      <TabsContent value="in-progress" className="pt-6">
        <EvaluationTabList
          items={filteredInProgress}
          emptyCopy={noMatchCopy ?? "Your in-progress evaluations will appear here."}
        />
      </TabsContent>

      <TabsContent value="submitted" className="pt-6">
        <EvaluationTabList
          items={filteredSubmitted}
          emptyCopy={noMatchCopy ?? "Your submitted evaluations will appear here."}
        />
      </TabsContent>
    </Tabs>
  );
}
