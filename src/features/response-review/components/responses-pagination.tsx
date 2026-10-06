"use client";

import { Pagination } from "@/components/ui/pagination";
import { useResponsesNavigation } from "./responses-workspace";

/**
 * Review-list pagination. Every facet lives in the URL, so paging reuses the
 * owner's own URL builder rather than reconstructing a query here; that keeps
 * an unrecognized facet from being silently dropped on page change.
 */
export function ResponsesPagination({
  buildPageUrl,
  page,
  totalPages,
}: {
  buildPageUrl: (page: number) => string;
  page: number;
  totalPages: number;
}) {
  const { navigate } = useResponsesNavigation();
  return (
    <Pagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={(nextPage) => navigate(buildPageUrl(nextPage))}
    />
  );
}
