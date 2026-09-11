"use client";

import * as React from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Years per calendar page, laid out as 3 columns × 4 rows. */
const YEARS_PER_PAGE = 12;
const COLUMNS = 3;

type YearRange = { start: number; end: number };

type YearPage = {
  /** Index of this page's first year in the flat year list. */
  startIndex: number;
  years: number[];
  rows: number[][];
};

type YearModel = {
  years: number[];
  pages: YearPage[];
};

/**
 * Expands selectable ranges into a year list and its calendar pages. Years
 * outside the ranges are never listed, so no invalid year is reachable by
 * pointer or by keyboard. Each range is paged from its newest year backwards:
 * the newest page stays full, and that is where the picker opens.
 */
function buildYearModel(ranges: readonly YearRange[]): YearModel {
  const years: number[] = [];
  const pages: YearPage[] = [];

  for (const range of ranges) {
    const offset = years.length;
    const rangeYears: number[] = [];

    for (let year = range.start; year <= range.end; year += 1) {
      rangeYears.push(year);
    }

    const rangePages: YearPage[] = [];

    for (let end = rangeYears.length - 1; end >= 0; end -= YEARS_PER_PAGE) {
      const start = Math.max(end - YEARS_PER_PAGE + 1, 0);
      const pageYears = rangeYears.slice(start, end + 1);
      const rows: number[][] = [];

      for (let index = 0; index < pageYears.length; index += COLUMNS) {
        rows.push(pageYears.slice(index, index + COLUMNS));
      }

      rangePages.unshift({ startIndex: offset + start, years: pageYears, rows });
    }

    years.push(...rangeYears);
    pages.push(...rangePages);
  }

  return { years, pages };
}

/** Newest selectable year at or before today, used when nothing is selected yet. */
function resolveInitialYear(years: number[], value: number | null | undefined): number {
  if (typeof value === "number" && years.includes(value)) {
    return value;
  }

  const currentYear = new Date().getFullYear();
  const past = years.filter((year) => year <= currentYear);

  if (past.length > 0) {
    return past[past.length - 1];
  }

  return years.length > 0 ? years[0] : currentYear;
}

export type YearPickerProps = {
  id?: string;
  value?: number | null;
  onChange?: (year: number) => void;
  /** Selectable eras, ascending. Years between ranges are never offered. */
  ranges: readonly YearRange[];
  /** Explains a gap between eras to the person choosing. */
  note?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

/**
 * Year-only calendar selector: a popover holding paginated grids of years.
 * Keyboard: arrows move year by year, Home/End jump to the page bounds,
 * PageUp/PageDown step a full page, Enter/Space select.
 */
export function YearPicker({
  id,
  value,
  onChange,
  ranges,
  note,
  placeholder = "Select year",
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: YearPickerProps) {
  const [open, setOpen] = React.useState(false);
  const model = React.useMemo(() => buildYearModel(ranges), [ranges]);
  const [activeYear, setActiveYear] = React.useState(() => resolveInitialYear(model.years, value));
  /** Set when the active year moves, so the year button it lands on takes focus as it renders. */
  const pendingFocus = React.useRef(false);

  const activeIndex = Math.max(model.years.indexOf(activeYear), 0);
  const pageIndex = Math.max(
    model.pages.findIndex(
      (candidate) =>
        activeIndex >= candidate.startIndex &&
        activeIndex < candidate.startIndex + candidate.years.length
    ),
    0
  );
  const page = model.pages[pageIndex];

  if (!page) return null;

  const hasValue = typeof value === "number";
  const pageFirstYear = page.years[0];
  const pageLastYear = page.years[page.years.length - 1];

  const moveToIndex = (index: number) => {
    const nextYear = model.years[Math.min(Math.max(index, 0), model.years.length - 1)];

    if (nextYear === activeYear) return;

    pendingFocus.current = true;
    setActiveYear(nextYear);
  };

  const goToPage = (targetIndex: number) => {
    const target = model.pages[Math.min(Math.max(targetIndex, 0), model.pages.length - 1)];

    if (!target) return;

    const offset = Math.min(Math.max(activeIndex - page.startIndex, 0), target.years.length - 1);
    moveToIndex(target.startIndex + offset);
  };

  const handleOpenChange = (next: boolean) => {
    pendingFocus.current = next;
    setOpen(next);

    if (next) {
      setActiveYear(resolveInitialYear(model.years, value));
    }
  };

  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -COLUMNS,
      ArrowDown: COLUMNS,
    };

    if (event.key in moves) {
      event.preventDefault();
      moveToIndex(activeIndex + moves[event.key]);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveToIndex(page.startIndex);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      moveToIndex(page.startIndex + page.years.length - 1);
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      goToPage(pageIndex - 1);
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      goToPage(pageIndex + 1);
    }
  };

  const selectYear = (year: number) => {
    onChange?.(year);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        type="button"
        id={id}
        data-slot="year-picker-trigger"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          "border-input bg-surface-input text-foreground focus-visible:border-ring focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 flex h-8 w-full touch-manipulation items-center justify-between gap-2 rounded-lg border py-2 pr-2 pl-3 text-sm transition-[border-color,box-shadow,background-color] outline-none select-none focus-visible:ring-3 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:ring-3 motion-reduce:transition-none pointer-coarse:h-11",
          className
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Calendar aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
          <span className={cn("truncate", !hasValue && "text-muted-foreground")}>
            {hasValue ? value : placeholder}
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="start" initialFocus={false} className="gap-2 p-3">
        <div className="flex items-center justify-between gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Previous years"
            disabled={pageIndex === 0}
            onClick={() => goToPage(pageIndex - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="text-foreground text-sm font-semibold tabular-nums">
            {pageFirstYear} – {pageLastYear}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Next years"
            disabled={pageIndex === model.pages.length - 1}
            onClick={() => goToPage(pageIndex + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>

        <div
          role="grid"
          aria-label="Year"
          className="flex flex-col gap-1"
          onKeyDown={handleGridKeyDown}
        >
          {page.rows.map((row) => (
            <div role="row" key={row[0]} className="grid grid-cols-3 gap-1">
              {row.map((year) => {
                const selected = year === value;

                return (
                  <div role="gridcell" key={year} aria-selected={selected} className="flex">
                    <button
                      type="button"
                      ref={(node) => {
                        if (node && pendingFocus.current && year === activeYear) {
                          pendingFocus.current = false;
                          node.focus();
                        }
                      }}
                      tabIndex={year === activeYear ? 0 : -1}
                      onClick={() => selectYear(year)}
                      className={cn(
                        "focus-visible:border-ring focus-visible:ring-ring flex h-9 w-full touch-manipulation items-center justify-center rounded-lg text-sm tabular-nums transition-colors outline-none select-none focus-visible:ring-3 motion-reduce:transition-none pointer-coarse:h-11",
                        selected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-foreground hover:bg-muted font-medium"
                      )}
                    >
                      {year}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {note && <p className="text-caption text-muted-foreground">{note}</p>}
      </PopoverContent>
    </Popover>
  );
}
