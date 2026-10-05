"use client";

import { LayoutGrid, List } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ListCardViewMode = "list" | "card";

type ViewSelectorProps = {
  /** Accessible label for the toolbar, e.g. "Rosters view". */
  label: string;
  value: ListCardViewMode;
  onValueChange: (value: ListCardViewMode) => void;
};

/**
 * Presentational List/Card toggle shared by every collection that offers both
 * presentations. The switch itself is a local state change in the parent; the
 * parent decides whether to persist it and to what.
 */
export function ViewSelector({ label, value, onValueChange }: ViewSelectorProps) {
  function selectView(nextValues: string[]) {
    const nextView = nextValues[0];
    if ((nextView !== "list" && nextView !== "card") || nextView === value) return;
    onValueChange(nextView);
  }

  return (
    <ToggleGroup
      aria-label={`${label} view`}
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
