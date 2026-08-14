"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis";

export function buildPageItems(
  currentPage: number,
  totalPages: number,
  siblingCount = 1,
  boundaryCount = 1,
): PageItem[] {
  const range = (start: number, end: number): number[] =>
    Array.from({ length: Math.max(end - start + 1, 0) }, (_, i) => start + i);

  const totalNumbers = siblingCount * 2 + 3 + boundaryCount * 2;
  if (totalNumbers >= totalPages) {
    return range(1, totalPages);
  }

  const startPages = range(1, Math.min(boundaryCount, totalPages));
  const endPages = range(
    Math.max(totalPages - boundaryCount + 1, boundaryCount + 1),
    totalPages,
  );

  const siblingsStart = Math.max(
    Math.min(currentPage - siblingCount, totalPages - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(currentPage + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : totalPages - 1,
  );

  const middle: PageItem[] = [
    ...(siblingsStart > boundaryCount + 2
      ? (["ellipsis"] as PageItem[])
      : boundaryCount + 1 < totalPages - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < totalPages - boundaryCount - 1
      ? (["ellipsis"] as PageItem[])
      : totalPages - boundaryCount > boundaryCount
        ? [totalPages - boundaryCount]
        : []),
  ];

  return [...startPages, ...middle, ...endPages];
}

interface PaginationProps {
  /** 1-based current page. */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function useMinWidthSm(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const media = window.matchMedia("(min-width: 640px)");
    media.addEventListener("change", onStoreChange);
    return () => media.removeEventListener("change", onStoreChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const isDesktop = useMinWidthSm();
  const siblingCount = isDesktop ? 1 : 0;
  const boundaryCount = 1;

  if (totalPages <= 1) return null;

  const items = buildPageItems(currentPage, totalPages, siblingCount, boundaryCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-center gap-1", className)}
    >
      <Button
        variant="outline"
        size="sm"
        aria-label="Go to previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="text-muted-foreground px-2 text-sm"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            variant={item === currentPage ? "default" : "outline"}
            size="sm"
            aria-label={`Go to page ${item}`}
            aria-current={item === currentPage ? "page" : undefined}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="sm"
        aria-label="Go to next page"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </nav>
  );
}