import { redirect } from "next/navigation";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/constants/page-sizes";
import {
  courseAssignmentListPath,
  isCanonicalCourseAssignmentListState,
  parseCourseAssignmentListState,
  toAssignmentFiltersState,
  toCourseAssignmentListOptions,
  type CourseAssignmentListRole,
  type CourseAssignmentSearchParams,
} from "../course-assignment-list-state";
import { listCourseAssignments } from "./list-course-assignments";

export async function loadCourseAssignmentListPage({
  pathname,
  rawSearchParams,
  role,
  programId,
  defaultTermInstanceId,
}: {
  pathname: string;
  rawSearchParams: CourseAssignmentSearchParams;
  role: CourseAssignmentListRole;
  programId?: string;
  defaultTermInstanceId?: string | null;
}) {
  const state = parseCourseAssignmentListState(rawSearchParams, role, defaultTermInstanceId);

  if (!isCanonicalCourseAssignmentListState(rawSearchParams, state, role)) {
    redirect(courseAssignmentListPath(pathname, state, role));
  }

  const result = await listCourseAssignments(state.filters, {
    ...toCourseAssignmentListOptions(state),
    pageSize: DEFAULT_TABLE_PAGE_SIZE,
    ...(role === "program-head" && programId ? { programId } : {}),
  });

  if (result.success) {
    const totalPages = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));
    if (state.page > totalPages) {
      redirect(courseAssignmentListPath(pathname, { ...state, page: totalPages }, role));
    }
  }

  return {
    state,
    result,
    initialFilters: toAssignmentFiltersState(state),
  };
}
