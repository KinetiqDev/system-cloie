"use client";

import { useTransition } from "react";
import { LayoutGrid, List } from "lucide-react";
import { useRouter } from "next/navigation";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type CourseRosterViewMode = "list" | "card";

type CourseRosterViewSelectorProps = {
  value: CourseRosterViewMode;
  search: string;
  includeHistory: boolean;
};

export function CourseRosterViewSelector({
  value,
  search,
  includeHistory,
}: CourseRosterViewSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function selectView(nextValues: string[]) {
    const nextView = nextValues[0];
    if ((nextView !== "list" && nextView !== "card") || nextView === value) return;

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (includeHistory) params.set("history", "1");
    if (nextView === "card") params.set("view", "card");
    const query = params.toString();

    startTransition(() => {
      router.replace(`/faculty/course-rosters${query ? `?${query}` : ""}`);
    });
  }

  return (
    <ToggleGroup
      aria-label="Course roster view"
      aria-busy={isPending || undefined}
      disabled={isPending}
      onValueChange={selectView}
      role="toolbar"
      spacing={0}
      value={[value]}
      variant="outline"
    >
      <ToggleGroupItem
        aria-label="List view"
        className="pointer-coarse:h-11 pointer-coarse:min-w-11"
        value="list"
      >
        <List data-icon="inline-start" aria-hidden="true" />
        List
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label="Card view"
        className="pointer-coarse:h-11 pointer-coarse:min-w-11"
        value="card"
      >
        <LayoutGrid data-icon="inline-start" aria-hidden="true" />
        Card
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
