"use client";

import { LayoutGrid, List } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type CourseRosterViewMode = "list" | "card";

type CourseRosterViewSelectorProps = {
  value: CourseRosterViewMode;
  onValueChange: (value: CourseRosterViewMode) => void;
};

/**
 * Presentational view toggle. The switch itself is a local state change in
 * the parent; no server round trip is involved.
 */
export function CourseRosterViewSelector({
  value,
  onValueChange,
}: CourseRosterViewSelectorProps) {
  function selectView(nextValues: string[]) {
    const nextView = nextValues[0];
    if ((nextView !== "list" && nextView !== "card") || nextView === value) return;
    onValueChange(nextView);
  }

  return (
    <ToggleGroup
      aria-label="Course roster view"
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
