import type { EvaluationToolsTab } from "./evaluation-tools-tabs";
import type { ToolsViewMode } from "./tools-view-selector";

type ToolsRouteSearchParams = Record<string, string | string[] | undefined>;

/**
 * Derive the persisted tab/view defaults from the URL. Canonical URLs omit
 * default values (see updateToolsUrl), so anything unrecognized falls back to
 * the defaults. Shared by the faculty and program-head tools routes.
 */
export function parseToolsViewState(searchParams: ToolsRouteSearchParams): {
  initialTab: EvaluationToolsTab;
  initialView: ToolsViewMode;
} {
  return {
    initialTab: searchParams.tab === "published" ? "published" : "templates",
    initialView: searchParams.view === "list" ? "list" : "card",
  };
}
