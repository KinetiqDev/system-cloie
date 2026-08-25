const INVENTORY_DISPOSITIONS = [
  "task",
  "already_compliant",
  "redirect",
  "not_found_placeholder",
  "generated",
  "approved_exception",
] as const;

type InventoryDisposition = (typeof INVENTORY_DISPOSITIONS)[number];

type InventoryCategory =
  | "ui_primitive"
  | "layout"
  | "route"
  | "feature_component"
  | "generated"
  | "tokens";

interface InventoryEntryBase {
  /** Project-relative path (e.g., 'src/components/ui/button.tsx') */
  path: string;
  /** Surface category for reporting */
  category: InventoryCategory;
  /** Mandatory explanatory notes for redirects, placeholders, generated surfaces, or approved exceptions */
  notes?: string;
}

export type InventoryEntry =
  | (InventoryEntryBase & {
      disposition: "task";
      taskId?: number;
    })
  | (InventoryEntryBase & {
      disposition: Exclude<InventoryDisposition, "task">;
      taskId?: never;
    });

const VALID_TASK_IDS: number[] = Array.from({ length: 27 }, (_, i) => i + 1);

export const PRODUCTION_SURFACE_INVENTORY: InventoryEntry[] = [
  {
    path: "src/app/(app)/alumni/dashboard/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/dashboard/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/evaluations/[id]/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/evaluations/[id]/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/evaluations/[id]/submitted/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/evaluations/[id]/submitted/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/evaluations/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/evaluations/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/history/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/history/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/layout.tsx",
    disposition: "task",
    taskId: 24,
    category: "layout",
  },
  {
    path: "src/app/(app)/alumni/profile/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/alumni/profile/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/course-rosters/[assignmentId]/loading.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/course-rosters/[assignmentId]/page.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/dashboard/page.tsx",
    disposition: "redirect",
    category: "route",
    notes: "Redirects authenticated user to role-specific dashboard",
  },
  {
    path: "src/app/(app)/dean/academic-structure/course-assignments/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/course-assignments/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/design-system/layout.tsx",
    disposition: "task",
    taskId: 7,
    category: "layout",
  },
  {
    path: "src/app/(app)/design-system/loading.tsx",
    disposition: "task",
    taskId: 7,
    category: "route",
  },
  {
    path: "src/app/(app)/design-system/not-found.tsx",
    disposition: "task",
    taskId: 7,
    category: "route",
  },
  {
    path: "src/app/(app)/design-system/page.tsx",
    disposition: "task",
    taskId: 7,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/courses/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/courses/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/courses/new/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/courses/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/courses/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/courses/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/instruments/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/instruments/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/instruments/new/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/instruments/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/instruments/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/instruments/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/programs/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/programs/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/programs/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/academic-structure/programs/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/analytics/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/cilo-reviews/[evaluationId]/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/cilo-reviews/[evaluationId]/responses/[responseId]/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/cilo-reviews/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/enrollments/loading.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/enrollments/page.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/enrollments/roster/loading.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/enrollments/roster/page.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/learning-outcomes/loading.tsx",
    disposition: "task",
    taskId: 19,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/learning-outcomes/page.tsx",
    disposition: "task",
    taskId: 19,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/loading.tsx",
    disposition: "task",
    taskId: 19,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/college-oversight/page.tsx",
    disposition: "task",
    taskId: 19,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/course-assignments/page.tsx",
    disposition: "task",
    taskId: 15,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/courses/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/courses/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/courses/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/dashboard/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/dashboard/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/dean-group-landing.tsx",
    disposition: "task",
    taskId: 19,
    category: "feature_component",
  },
  {
    path: "src/app/(app)/dean/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/instruments/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/instruments/new/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/instruments/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/layout.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/app/(app)/dean/page.tsx",
    disposition: "redirect",
    category: "route",
    notes: "Dean landing redirect to dashboard or college oversight",
  },
  {
    path: "src/app/(app)/dean/profile/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/profile/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/programs/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/programs/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/programs/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/dean/reports/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/analytics/loading.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/analytics/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilo-evaluations/[evaluationId]/loading.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilo-evaluations/[evaluationId]/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilo-evaluations/[evaluationId]/responses/[responseId]/loading.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilo-evaluations/[evaluationId]/responses/[responseId]/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilo-evaluations/new/loading.tsx",
    disposition: "task",
    taskId: 21,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilo-evaluations/new/page.tsx",
    disposition: "task",
    taskId: 21,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/[courseId]/alignment/loading.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/[courseId]/alignment/page.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/loading.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/new/add-cilo-form.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/new/loading.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/new/page.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/cilos/page.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/course-rosters/loading.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/course-rosters/page.tsx",
    disposition: "task",
    taskId: 16,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/dashboard/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/dashboard/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/layout.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/app/(app)/faculty/profile/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/profile/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/tools/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/tools/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/tools/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/faculty/tools/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/dashboard/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/dashboard/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/evaluations/[id]/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/evaluations/[id]/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/evaluations/[id]/submitted/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/evaluations/[id]/submitted/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/evaluations/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/evaluations/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/history/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/history/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/layout.tsx",
    disposition: "task",
    taskId: 24,
    category: "layout",
  },
  {
    path: "src/app/(app)/industry-partner/profile/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/industry-partner/profile/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/layout.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/app/(app)/program-head/analytics/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-evaluations/new/loading.tsx",
    disposition: "task",
    taskId: 21,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-evaluations/new/page.tsx",
    disposition: "task",
    taskId: 21,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-reviews/[evaluationId]/loading.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-reviews/[evaluationId]/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-reviews/[evaluationId]/responses/[responseId]/loading.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-reviews/[evaluationId]/responses/[responseId]/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-reviews/loading.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/cilo-reviews/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/course-assignments/loading.tsx",
    disposition: "task",
    taskId: 15,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/course-assignments/page.tsx",
    disposition: "task",
    taskId: 15,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/courses/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/courses/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/dashboard/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/dashboard/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/layout.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/app/(app)/program-head/outcomes/loading.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/outcomes/mapping/loading.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/outcomes/mapping/page.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/outcomes/page.tsx",
    disposition: "task",
    taskId: 17,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/loading.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/page.tsx",
    disposition: "redirect",
    category: "route",
    notes: "Program Head landing redirect to dashboard or active program context",
  },
  {
    path: "src/app/(app)/program-head/profile/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/profile/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/[...path]/page.tsx",
    disposition: "redirect",
    category: "route",
    notes: "ADR 0009 compatibility catch-all redirect to program-head route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/analytics/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/analytics/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-evaluations/new/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-evaluations/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/responses/[responseId]/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-reviews/[evaluationId]/responses/[responseId]/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/loading.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/page.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/loading.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/course/[evaluationId]/responses/[responseId]/page.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/loading.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/page.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/responses/[responseId]/loading.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/program-wide/[deploymentId]/responses/[responseId]/page.tsx",
    disposition: "already_compliant",
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-reviews/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/cilo-reviews/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/responses/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/course-assignments/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/course-assignments/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/course-rosters/[assignmentId]/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/course-rosters/[assignmentId]/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/courses/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/courses/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/dashboard/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/dashboard/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/error.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/layout.tsx",
    disposition: "task",
    taskId: 14,
    category: "layout",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/outcomes/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/outcomes/mapping/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/outcomes/mapping/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/outcomes/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/reports/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/reports/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/new/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/publish/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/programs/[programId]/tools/publish/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/reports/page.tsx",
    disposition: "task",
    taskId: 22,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/new/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/new/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/publish/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/program-head/tools/publish/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/course-assignments/loading.tsx",
    disposition: "task",
    taskId: 15,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/course-assignments/page.tsx",
    disposition: "task",
    taskId: 15,
    category: "route",
    notes:
      "read-only secretary view after ADR 0019; mutation affordances hidden via canManageAssignments=false",
  },
  {
    path: "src/app/(app)/secretary/courses/[id]/edit/page.tsx",
    disposition: "redirect",
    category: "route",
    notes:
      "Secretary course editing moved to a modal on the course catalog; redirects to the catalog",
  },
  {
    path: "src/app/(app)/secretary/courses/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/courses/new/client-wrapper.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/courses/new/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/courses/new/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/courses/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/learning-outcomes/alignment/[courseId]/page.tsx",
    disposition: "redirect",
    category: "route",
    notes: "Secretary outcome surface removed; redirects to Secretary landing",
  },
  {
    path: "src/app/(app)/secretary/learning-outcomes/page.tsx",
    disposition: "redirect",
    category: "route",
    notes: "Secretary outcome surface removed; redirects to Secretary landing",
  },
  {
    path: "src/app/(app)/secretary/dashboard/loading.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/dashboard/page.tsx",
    disposition: "task",
    taskId: 18,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/instruments/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/instruments/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/instruments/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/instruments/new/loading.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/instruments/new/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/instruments/page.tsx",
    disposition: "task",
    taskId: 20,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/layout.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/app/(app)/secretary/programs/[id]/edit/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/programs/[id]/edit/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/programs/loading.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/programs/page.tsx",
    disposition: "task",
    taskId: 14,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/[id]/client-page.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/[id]/loading.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/[id]/page.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/[id]/rollover/loading.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/[id]/rollover/page.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/client-page.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/loading.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/school-years/page.tsx",
    disposition: "task",
    taskId: 13,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/users/loading.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/users/new/loading.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/users/new/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/secretary/users/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/analytics/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/analytics/loading.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/analytics/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/course-assignments/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/dashboard/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/layout.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/loading.tsx",
    disposition: "task",
    taskId: 11,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/profile/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/courses/error.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/courses/loading.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/courses/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/outcomes/error.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/outcomes/loading.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/outcomes/mapping/error.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/outcomes/mapping/loading.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/outcomes/mapping/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/gen-ed-coordinator/outcomes/page.tsx",
    disposition: "task",
    taskId: 12,
    category: "route",
  },
  {
    path: "src/app/(app)/student/dashboard/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/dashboard/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(app)/student/evaluations/[id]/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/evaluations/[id]/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/evaluations/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/evaluations/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/history/[responseId]/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/history/[responseId]/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/history/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/history/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/layout.tsx",
    disposition: "task",
    taskId: 24,
    category: "layout",
  },
  {
    path: "src/app/(app)/student/profile/loading.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(app)/student/profile/page.tsx",
    disposition: "task",
    taskId: 24,
    category: "route",
  },
  {
    path: "src/app/(legal)/layout.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/app/(legal)/privacy/page.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(legal)/terms/page.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/(public)/layout.tsx",
    disposition: "task",
    taskId: 2,
    category: "layout",
    notes: "Public shell layout",
  },
  {
    path: "src/app/(public)/login/loading.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/login/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/onboarding/loading.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/onboarding/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/onboarding/student-profile-form.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/portal/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/portal/respondents/loading.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/portal/respondents/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/portal/staff/loading.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/portal/staff/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/status/[type]/loading.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/(public)/status/[type]/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
  },
  {
    path: "src/app/error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/global-error.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/globals.css",
    disposition: "task",
    taskId: 2,
    category: "tokens",
    notes: "Root CSS semantic design tokens and utilities",
  },
  {
    path: "src/app/layout.tsx",
    disposition: "task",
    taskId: 2,
    category: "layout",
    notes: "Root metadata and font layout",
  },
  {
    path: "src/app/manifest.ts",
    disposition: "task",
    taskId: 2,
    category: "layout",
    notes: "App manifest theme metadata",
  },
  {
    path: "src/app/not-found.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/app/page.tsx",
    disposition: "task",
    taskId: 23,
    category: "route",
    notes: "Public landing page",
  },
  {
    path: "src/app/unauthorized/page.tsx",
    disposition: "task",
    taskId: 25,
    category: "route",
  },
  {
    path: "src/components/error-boundary.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/components/layout/app-shell.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/authenticated-shell-fallback.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/mobile-nav.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/mobile-sidebar-drawer.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/navigation-link.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/navigation-row.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/operational-route-error.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/components/layout/operational-route-loading.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/components/layout/respondent-route-error.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/components/layout/public-route-loading.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/components/layout/respondent-route-loading.tsx",
    disposition: "task",
    taskId: 25,
    category: "layout",
  },
  {
    path: "src/components/layout/sidebar.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/layout/topbar.tsx",
    disposition: "task",
    taskId: 11,
    category: "layout",
  },
  {
    path: "src/components/ui/alert-dialog.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/alert.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/badge.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/button.tsx",
    disposition: "task",
    taskId: 3,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/card.tsx",
    disposition: "task",
    taskId: 3,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/chart.tsx",
    disposition: "task",
    taskId: 9,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/spinner.tsx",
    disposition: "task",
    taskId: 3,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/checkbox.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/combobox.tsx",
    disposition: "already_compliant",
    category: "ui_primitive",
    notes: "New searchable combobox primitive for the CILO course picker; public shadcn inventory",
  },
  {
    path: "src/components/ui/dialog.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/drawer.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/dropdown-menu.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/empty.tsx",
    disposition: "task",
    taskId: 5,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/field.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/input-group.tsx",
    disposition: "already_compliant",
    category: "ui_primitive",
    notes: "New input group primitive for the CILO course picker; public shadcn inventory",
  },
  {
    path: "src/components/ui/input.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/label.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/progress.tsx",
    disposition: "task",
    taskId: 5,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/radio-group.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/select.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/separator.tsx",
    disposition: "task",
    taskId: 5,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/sheet.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/popover.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/pagination.tsx",
    disposition: "already_compliant",
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/skeleton.tsx",
    disposition: "task",
    taskId: 5,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/switch.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/table.tsx",
    disposition: "task",
    taskId: 5,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/tabs.tsx",
    disposition: "task",
    taskId: 5,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/toggle-group.tsx",
    disposition: "already_compliant",
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/toggle.tsx",
    disposition: "already_compliant",
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/textarea.tsx",
    disposition: "task",
    taskId: 4,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/toast.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/components/ui/tooltip.tsx",
    disposition: "task",
    taskId: 6,
    category: "ui_primitive",
  },
  {
    path: "src/features/academic-calendar/components/active-term-badge.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-calendar/components/rollover-exceptions-table.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-calendar/components/rollover-runner.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-calendar/components/calendar-structure-view.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-calendar/components/school-year-form.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-calendar/components/set-active-term-dialog.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-calendar/components/term-instance-picker.tsx",
    disposition: "task",
    taskId: 13,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/create-program-dialog.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/course-edit-dialog.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/course-form.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/manage-majors-dialog.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/management-courses-list.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/program-form.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/gen-ed-courses-catalog.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/program-head-courses-catalog.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/gen-ed-outcomes-page.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/ilo-form-dialog.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/academic-structure/components/secretary-programs-list.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/secretary/components/secretary-dashboard.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/anonymized-response-cards.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/anonymized-response-detail.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/response-review/components/central-evaluation-detail.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/response-review/components/course-evaluation-detail.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/response-review/components/identified-respondents-table.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/response-review/components/response-detail.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/course-bound-review-tabs.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/course-mean-pie-chart.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-analytics-dashboard.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-analytics-filters.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-analytics-summary.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-cilo-analytics-chart.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-dashboard-visualization-fallbacks.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-dashboard-visualizations.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-qualitative-cloud.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/faculty-quantitative-breakdown.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/general-education-analytics-workspace.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/mean-bar-chart.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/published-course-bound-list.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/qualitative-word-cloud.tsx",
    disposition: "task",
    taskId: 10,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/stakeholder-mean-pie-chart.tsx",
    disposition: "task",
    taskId: 9,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/program-head-responses-filters.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/program-head-responses-landing.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/program-head-responses-pagination.tsx",
    disposition: "task",
    taskId: 14,
    category: "feature_component",
  },
  {
    path: "src/features/analytics/components/program-head-dashboard-kpis.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #519 KPI cards: semantic tokens, tabular numerals, accessible popover breakdown, source-separated means",
  },
  {
    path: "src/components/ui/breadcrumbs.tsx",
    disposition: "already_compliant",
    category: "ui_primitive",
    notes:
      "Slice #521 responsive breadcrumb trail: full hierarchy in DOM, middle steps collapse on mobile, aria-current on the current page",
  },
  {
    path: "src/features/analytics/components/how-calculated-popover.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #521 how-calculated disclosure on the shared Base UI popover primitive; spec §41 presentation metadata only",
  },
  {
    path: "src/features/analytics/components/selected-plo-scroll-target.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #521 scrolls the deep-linked PLO row into view after mount; matches data-plo-row by value to avoid selector escaping",
  },
  {
    path: "src/features/analytics/components/program-head-dashboard-completion-popover.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #519 completion breakdown popover on the shared Base UI popover primitive with labelled table",
  },
  {
    path: "src/features/analytics/components/program-head-stakeholder-progress.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #519 keyboard-operable stacked participation bars; counts and percentage visible without hover",
  },
  {
    path: "src/features/analytics/components/program-head-plo-summary.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #519 PLO summary with evidence-source selector and details disclosure; no attainment status",
  },
  {
    path: "src/features/analytics/components/program-head-needs-attention.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Slice #519 needs-attention list carrying text status labels rather than color-only signals",
  },
  {
    path: "src/features/analytics/components/program-head-qualitative-pulse.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "Slice #519 qualitative pulse; slider re-slices server-capped redacted tokens only",
  },
  {
    path: "src/features/analytics/components/stakeholder-mean-comparison.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New client chart replacing mean pie for independent stakeholder means; semantic tokens, exact-value table, reduced-motion safe",
  },
  {
    path: "src/features/analytics/components/program-head-analytics-shell.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "New server component using semantic tokens, no client boundary needed",
  },
  {
    path: "src/features/analytics/components/program-head-analytics-content-fallback.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Accessible Suspense fallback preserving chart and table geometry while selected analytics evidence streams",
  },
  {
    path: "src/features/analytics/components/program-head-analytics-visualizations.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Client-only dynamic visualization boundary with semantic Skeleton fallbacks for Recharts and the qualitative word cloud",
  },
  {
    path: "src/features/analytics/components/program-head-overview-kpis.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "New server component using semantic tokens and shadcn Card primitives",
  },
  {
    path: "src/features/analytics/components/program-head-analytics-filters.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "New server-rendered URL filter controls using semantic tokens",
  },
  {
    path: "src/features/analytics/components/program-head-trend-chart.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New client trend chart using semantic tokens, legends, comparability breaks, and reduced-motion-safe behavior",
  },
  {
    path: "src/features/analytics/components/program-head-trends-view.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "New server component composing trends empty states, chart, and exact-value table",
  },
  {
    path: "src/features/analytics/components/program-head-feedback-view.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Server component composing aggregate-only qualitative feedback, accessible word-cloud alternatives, counts, empty states, and authorized review links",
  },
  {
    path: "src/features/analytics/components/program-head-ai-insights-view.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "Client on-demand AI interpretation view with fixed prompt boundary, validated aggregate-only output, locally computed sentiment counts, stale fingerprints, and recoverable failure states",
  },
  {
    path: "src/features/analytics/components/program-head-outcomes-view.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New server component composing outcome disclosures, ranked chart, exact-value table, and detail rows",
  },
  {
    path: "src/features/analytics/components/program-head-outcome-ranking-chart.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New client ranked outcome chart with data-derived axis domain, legend, insight, and exact-value table",
  },
  {
    path: "src/features/analytics/components/program-head-plo-detail.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New server component exposing full-precision mean, scale-separated distributions, and excluded-rating diagnostics",
  },
  {
    path: "src/features/analytics/components/program-head-likert-distribution.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New server component rendering one accessible per-scale Likert table with snapshot labels",
  },
  {
    path: "src/features/analytics/components/program-head-stakeholder-view.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New server component composing source-separation disclosure, ranked source means, and response composition",
  },
  {
    path: "src/features/analytics/components/program-head-comparison-chart.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New client ranked-bar comparison chart with semantic tokens, insight, legend, and exact-value table",
  },
  {
    path: "src/features/analytics/components/program-head-response-composition-donut.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "New client donut reserved for genuine response composition, never independent means",
  },
  {
    path: "src/features/analytics/components/program-head-breakdowns-view.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes:
      "New server component composing course, instrument, major, and year-level breakdowns with Unspecified attribution",
  },
  {
    path: "src/features/analytics/components/program-head-instrument-breakdown-chart.tsx",
    disposition: "already_compliant",
    category: "feature_component",
    notes: "New client grouped-bar instrument chart keeping every evidence source separate",
  },
  {
    path: "src/features/auth/components/authenticated-app-shell.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/demo-role-switcher.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/dev-role-switcher.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/mobile-role-switcher.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/program-head-selector.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/program-head-switcher.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/role-switcher-dropdown.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/role-switcher-list.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/session-guard.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/auth/components/verification-status-banner.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-assignment-form-dialog.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-assignments-page-shell.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-assignments-table.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/gen-ed-dashboard-loading.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-roster-management.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-roster-pages.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-roster-filters.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/scoped-roster-student-search.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-roster-retry.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-roster-view-selector.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/course-row-assignments-sheet.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/edit-course-assignment-dialog.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/shared/assignment-filters.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/shared/assignment-summary-block.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/shared/class-identity-fields.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/shared/faculty-search-popover.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/course-assignments/components/shared/wizard-stepper.tsx",
    disposition: "task",
    taskId: 15,
    category: "feature_component",
  },
  {
    path: "src/features/dean/components/dean-oversight-loading.tsx",
    disposition: "task",
    taskId: 19,
    category: "feature_component",
  },

  {
    path: "src/features/curriculum/components/curriculum-course-table.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/curriculum/components/curriculum-version-form.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },
  {
    path: "src/features/curriculum/components/curriculum-version-list.tsx",
    disposition: "already_compliant",
    category: "feature_component",
  },

  {
    path: "src/features/enrollments/components/enrollment-editor-dialog.tsx",
    disposition: "task",
    taskId: 16,
    category: "feature_component",
  },
  {
    path: "src/features/enrollments/components/student-enrollment-history.tsx",
    disposition: "task",
    taskId: 16,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/assignment-picker.tsx",
    disposition: "task",
    taskId: 21,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/close-evaluation-dialog.tsx",
    disposition: "task",
    taskId: 22,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/evaluation-detail-dialog.tsx",
    disposition: "task",
    taskId: 22,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/faculty-cilos-course-list.tsx",
    disposition: "task",
    taskId: 21,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/faculty-published-evaluations.tsx",
    disposition: "task",
    taskId: 22,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/late-include-dialog.tsx",
    disposition: "task",
    taskId: 22,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/publish-central-deployment-form.tsx",
    disposition: "task",
    taskId: 21,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/publish-course-bound-evaluation-form-v2.tsx",
    disposition: "task",
    taskId: 21,
    category: "feature_component",
  },
  {
    path: "src/features/evaluations/components/published-deployments-collection.tsx",
    disposition: "task",
    taskId: 22,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/faculty-tools-page.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/evaluation-tools-tabs.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/management-template-builder.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/management-tools-page.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/program-head-template-builder.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/program-head-tools-page.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/template-builder.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/template-collection.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/instruments/components/tools-view-selector.tsx",
    disposition: "task",
    taskId: 20,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-acknowledgement-dialog.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-document-content.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-document-nav.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-footer.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-page-header.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-page-shell.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/legal-section.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/legal/components/mobile-legal-document-nav.tsx",
    disposition: "task",
    taskId: 25,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/course-alignment-editor.tsx",
    disposition: "task",
    taskId: 17,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/manifestation-alignment-content.tsx",
    disposition: "task",
    taskId: 17,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/manifestation-picker.tsx",
    disposition: "task",
    taskId: 17,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/plo-form-dialog.tsx",
    disposition: "task",
    taskId: 17,
    category: "feature_component",
  },
  {
    path: "src/features/outcomes/components/program-head-outcomes-page.tsx",
    disposition: "task",
    taskId: 17,
    category: "feature_component",
  },
  {
    path: "src/features/portals/components/hero-card.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/portals/components/install-app-button.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/portals/components/portal-choice-card.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/portals/components/portal-shell.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/portals/components/role-selection-card.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/portals/components/session-banner.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/responses/components/review-modal.tsx",
    disposition: "task",
    taskId: 24,
    category: "feature_component",
  },
  {
    path: "src/features/responses/components/submitted-response-review.tsx",
    disposition: "task",
    taskId: 24,
    category: "feature_component",
  },
  {
    path: "src/features/responses/components/wizard-shell.tsx",
    disposition: "task",
    taskId: 24,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/alumni-onboarding-form.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/evaluation-list-card.tsx",
    disposition: "task",
    taskId: 24,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/evaluation-list-browser.tsx",
    disposition: "task",
    taskId: 24,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/faculty-onboarding-form.tsx",
    disposition: "task",
    taskId: 18,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/industry-partner-onboarding-form.tsx",
    disposition: "task",
    taskId: 23,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-add-user-form.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-users-list/edit-user-dialog.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-users-list/index.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-users-list/user-dialogs.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-users-list/users-data-table.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-users-list/users-filter-bar.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/secretary-users-list/users-kpi.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/features/users/components/stat-cards.tsx",
    disposition: "task",
    taskId: 12,
    category: "feature_component",
  },
  {
    path: "src/styles/tokens.css",
    disposition: "task",
    taskId: 2,
    category: "tokens",
    notes: "Root CSS semantic design tokens and utilities",
  },
];

function validateTaskOwnership(entry: InventoryEntry, errors: string[]): void {
  if (entry.disposition === "task") {
    if (entry.taskId === undefined || entry.taskId === null) {
      errors.push(`Task-owned entry at ${entry.path} must have a valid taskId`);
    } else if (!VALID_TASK_IDS.includes(entry.taskId)) {
      errors.push(
        `Task ID ${entry.taskId} for ${entry.path} must be between ${VALID_TASK_IDS[0]} and ${
          VALID_TASK_IDS[VALID_TASK_IDS.length - 1]
        }`
      );
    }
  } else if (
    (entry as { taskId?: number }).taskId !== undefined &&
    (entry as { taskId?: number }).taskId !== null
  ) {
    errors.push(`Non-task entry at ${entry.path} must not have a taskId`);
  }
}

function validateExplanatoryNotes(entry: InventoryEntry, errors: string[]): void {
  if (
    entry.disposition === "redirect" ||
    entry.disposition === "not_found_placeholder" ||
    entry.disposition === "generated" ||
    entry.disposition === "approved_exception"
  ) {
    if (!entry.notes || entry.notes.trim().length === 0) {
      errors.push(
        `Entry with disposition "${entry.disposition}" at ${entry.path} must include non-empty explanatory notes`
      );
    }
  }
}

export function validateInventoryEntry(
  entry: InventoryEntry,
  fileExists?: (p: string) => boolean
): string[] {
  const errors: string[] = [];
  const validDispositions: readonly InventoryDisposition[] = INVENTORY_DISPOSITIONS;
  const checkExists =
    fileExists ??
    ((p: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fsModule = require("node:fs");
        return fsModule.existsSync(p);
      } catch {
        return false;
      }
    });

  if (!entry.path || entry.path.trim().length === 0) {
    errors.push("Entry path must not be empty");
  }

  if (!validDispositions.includes(entry.disposition)) {
    errors.push(`Invalid disposition "${entry.disposition}" for path ${entry.path}`);
  }

  validateTaskOwnership(entry, errors);
  validateExplanatoryNotes(entry, errors);

  if (entry.path && !checkExists(entry.path)) {
    errors.push(`Stale inventory path does not exist on disk: ${entry.path}`);
  }

  return errors;
}

export function validateInventory(
  inventory: InventoryEntry[],
  fileExists?: (p: string) => boolean
): string[] {
  const errors: string[] = [];
  const seenPaths = new Set<string>();

  inventory.forEach((entry) => {
    if (seenPaths.has(entry.path)) {
      errors.push(`Duplicate inventory entry path: ${entry.path}`);
    }
    seenPaths.add(entry.path);

    const entryErrors = validateInventoryEntry(entry, fileExists);
    errors.push(...entryErrors);
  });

  return errors;
}
