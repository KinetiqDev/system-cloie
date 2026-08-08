"use client";

import { useMemo, useState } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPending = useMemo(
    () => filterItems(pending, searchTerm),
    [pending, searchTerm]
  );
  const filteredInProgress = useMemo(
    () => filterItems(inProgress, searchTerm),
    [inProgress, searchTerm]
  );
  const filteredSubmitted = useMemo(
    () => filterItems(submitted, searchTerm),
    [submitted, searchTerm]
  );

  const searchActive = searchTerm.trim().length > 0;
  const noMatchCopy = searchActive
    ? "No evaluations match your search."
    : undefined;

  return (
    <Tabs defaultValue="pending" className="w-full">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <TabsList variant="pill">
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
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
          emptyCopy={
            noMatchCopy ?? "Your in-progress evaluations will appear here."
          }
        />
      </TabsContent>

      <TabsContent value="submitted" className="pt-6">
        <EvaluationTabList
          items={filteredSubmitted}
          emptyCopy={
            noMatchCopy ?? "Your submitted evaluations will appear here."
          }
        />
      </TabsContent>
    </Tabs>
  );
}
