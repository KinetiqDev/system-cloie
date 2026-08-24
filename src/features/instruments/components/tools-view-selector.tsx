"use client";

import { LayoutGrid, List } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type ToolsViewMode = "card" | "list";

type ToolsViewSelectorProps = {
  /** Accessible label for the toolbar, e.g. "Templates view". */
  label: string;
  value: ToolsViewMode;
  onValueChange: (value: ToolsViewMode) => void;
};

/**
 * Presentational List/Card toggle for Evaluation Tools collections.
 * The switch is a local state change in the parent; the parent persists the
 * choice to the URL.
 */
export function ToolsViewSelector({ label, value, onValueChange }: ToolsViewSelectorProps) {
  function selectView(nextValues: string[]) {
    const nextView = nextValues[0];
    if ((nextView !== "card" && nextView !== "list") || nextView === value) return;
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
        aria-label="Card view"
        className="pointer-coarse:h-11 pointer-coarse:min-w-11"
        value="card"
      >
        <LayoutGrid data-icon="inline-start" aria-hidden="true" />
        Card
      </ToggleGroupItem>
      <ToggleGroupItem
        aria-label="List view"
        className="pointer-coarse:h-11 pointer-coarse:min-w-11"
        value="list"
      >
        <List data-icon="inline-start" aria-hidden="true" />
        List
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
