import type { Role } from "@/lib/constants/roles";

/** Both roles share one read model; only the route prefix differs. */
export type CollegeOversightRoutes = {
  analytics: string;
  learningOutcomes: string;
  dashboard: string;
};

export const COLLEGE_OVERSIGHT_ROUTES = {
  DEAN: {
    analytics: "/dean/analytics",
    learningOutcomes: "/dean/college-oversight/learning-outcomes",
    dashboard: "/dean/dashboard",
  },
  SECRETARY: {
    analytics: "/secretary/analytics",
    learningOutcomes: "/secretary/learning-outcomes",
    dashboard: "/secretary/dashboard",
  },
} as const satisfies Record<"DEAN" | "SECRETARY", CollegeOversightRoutes>;

export function isCollegeOversightRole(role: Role | null | undefined): boolean {
  return role === "DEAN" || role === "SECRETARY";
}
