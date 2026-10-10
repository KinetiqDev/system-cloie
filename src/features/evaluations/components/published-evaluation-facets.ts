import type { FacetDef } from "@/components/data-table/types";
import type { PublishedEvaluationFilters } from "@/features/instruments/components/tools-view-state";
import type {
  CourseFilterOption,
  PeriodFilterOption,
  TargetFilterOption,
} from "./filter-published-evaluations";

export type PublishedFacetColumn = "course" | "target" | "period";

export type PublishedFacets = {
  /** The facets that hang off a column heading. Only offered columns appear. */
  byColumn: Partial<Record<PublishedFacetColumn, FacetDef[]>>;
  /** Every facet this list offers, so applied ones can show as removable chips. */
  all: FacetDef[];
};

export type PublishedFacetUpdate = (
  next: PublishedEvaluationFilters,
  navigation?: "push" | "replace"
) => void;

/**
 * Every narrowing control the Published lists offer, expressed once as facets.
 * The column headings, the toolbar chips and the mobile sheet all read from
 * this, so no control can drift from its siblings.
 *
 * Search is deliberately absent: it spans Name, Course, Target and Academic
 * Period, so it belongs to the toolbar rather than to any one column. The
 * lifecycle facet is absent too — `PublishedDeploymentsCollection` owns the
 * status chip row and derives its counts, and narrowing by status anywhere else
 * would hide deployments from that row.
 */
export function buildPublishedFacets(
  filters: PublishedEvaluationFilters,
  update: PublishedFacetUpdate,
  options: {
    periods: readonly PeriodFilterOption[];
    /** Faculty evaluation records; absent on central-deployment records. */
    courses?: readonly CourseFilterOption[];
    /** Central-deployment records; absent on faculty evaluation records. */
    targets?: readonly TargetFilterOption[];
  }
): PublishedFacets {
  const byColumn: PublishedFacets["byColumn"] = {};

  byColumn.period = [
    {
      id: "periodId",
      label: "Academic Period",
      value: filters.periodId,
      onChange: (value) => update({ ...filters, periodId: value }),
      allLabel: "All academic periods",
      searchable: true,
      searchPlaceholder: "Search academic periods…",
      emptyMessage: "No academic periods match your search.",
      options: options.periods.map((period) => ({ id: period.id, label: period.label })),
    },
  ];

  if (options.courses) {
    byColumn.course = [
      {
        id: "courseId",
        label: "Course",
        value: filters.courseId,
        onChange: (value) => update({ ...filters, courseId: value }),
        allLabel: "All courses",
        searchable: true,
        searchPlaceholder: "Search courses…",
        emptyMessage: "No courses match your search.",
        options: options.courses.map((course) => ({
          id: course.id,
          label: course.code,
          detail: course.title,
        })),
      },
    ];
  }

  if (options.targets) {
    byColumn.target = [
      {
        id: "target",
        label: "Target",
        value: filters.target,
        onChange: (value) => update({ ...filters, target: value }),
        allLabel: "All target stakeholders",
        emptyMessage: "No target stakeholders to filter by.",
        options: options.targets.map((target) => ({ id: target.id, label: target.label })),
      },
    ];
  }

  return { byColumn, all: Object.values(byColumn).flat() };
}
