"use client";

import { useId } from "react";
import { AcademicSemester, AcademicTerm } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import { SEMESTER_OPTIONS, TERM_OPTIONS } from "@/lib/constants/academic";
import type { TermInstanceItem } from "../types";

interface TermInstancePickerProps {
  termInstances: TermInstanceItem[];
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showOnlyActive?: boolean;
  allowClear?: boolean;
  allowAll?: boolean;
  id?: string;
}

/**
 * A reusable picker for selecting an academic term instance.
 * Displays term instances with formatted labels (e.g., "2025-2026 — 1st Semester — 1st Term").
 */
export function TermInstancePicker({
  termInstances,
  value,
  onChange,
  label = "Academic Period",
  placeholder = "Select a term...",
  disabled = false,
  showOnlyActive = false,
  allowClear = false,
  allowAll = false,
  id,
}: TermInstancePickerProps) {
  const generatedId = useId();
  const pickerId = id ?? `term-instance-picker-${generatedId.replaceAll(":", "")}`;
  const filteredInstances = showOnlyActive
    ? termInstances.filter((t) => t.status === "ACTIVE")
    : termInstances;

  // Sort by school year code desc, then semester order, then term order
  const sortedInstances = [...filteredInstances].sort((a, b) => {
    // School year desc (newest first)
    if (a.schoolYearCode !== b.schoolYearCode) {
      return b.schoolYearCode.localeCompare(a.schoolYearCode);
    }
    // Semester order: FIRST, SECOND, SUMMER
    const semOrder = { FIRST: 0, SECOND: 1, SUMMER: 2 };
    if (semOrder[a.semester] !== semOrder[b.semester]) {
      return semOrder[a.semester] - semOrder[b.semester];
    }
    // Term order: FIRST_TERM, SECOND_TERM
    if (a.term && b.term) {
      const termOrder = { FIRST_TERM: 0, SECOND_TERM: 1 };
      return termOrder[a.term] - termOrder[b.term];
    }
    return 0;
  });

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={pickerId}>{label}</Label>}
      <Select value={value} onValueChange={(val) => onChange(val ?? "")} disabled={disabled}>
        <SelectTrigger id={pickerId} className="w-full">
          <SelectValue placeholder={placeholder}>
            {value === "all"
              ? "All Academic Periods"
              : value
                ? (() => {
                    const selected = sortedInstances.find((i) => i.id === value);
                    return selected
                      ? `${formatTermInstanceLabel(
                          selected.schoolYearCode,
                          selected.semester,
                          selected.term
                        )}${selected.status === "ACTIVE" ? " — Current" : ""}`
                      : null;
                  })()
                : null}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allowAll && <SelectItem value="all">All Academic Periods</SelectItem>}
          {allowClear && <SelectItem value="">Clear selection</SelectItem>}
          {sortedInstances.map((instance) => (
            <SelectItem key={instance.id} value={instance.id}>
              <span className="flex items-center gap-2">
                {instance.status === "ACTIVE" && (
                  <span className="flex items-center gap-1.5">
                    <span className="bg-primary h-2 w-2 rounded-full" aria-hidden="true" />
                    <span className="sr-only">Active</span>
                  </span>
                )}
                {formatTermInstanceLabel(instance.schoolYearCode, instance.semester, instance.term)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Picker specifically for semester and term selection (for creating new term instances).
 */
interface SemesterTermValue {
  semester: AcademicSemester | null;
  term: AcademicTerm | null;
}

interface SemesterTermPickerProps {
  value: SemesterTermValue;
  onChange: (value: SemesterTermValue) => void;
  disabled?: boolean;
}

export function SemesterTermPicker({ value, onChange, disabled = false }: SemesterTermPickerProps) {
  const isSummer = value.semester === AcademicSemester.SUMMER;

  function handleSemesterChange(next: string | null) {
    const semester = (next ?? "") as AcademicSemester;
    onChange({
      semester,
      term: semester === AcademicSemester.SUMMER ? null : value.term,
    });
  }

  function handleTermChange(next: string | null) {
    onChange({
      ...value,
      term: next ? (next as AcademicTerm) : null,
    });
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="semester">Semester</Label>
        <Select
          value={value.semester ?? ""}
          onValueChange={handleSemesterChange}
          disabled={disabled}
        >
          <SelectTrigger id="semester">
            <SelectValue placeholder="Select semester">
              {value.semester
                ? (SEMESTER_OPTIONS.find((o) => o.value === value.semester)?.label ?? null)
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={AcademicSemester.FIRST}>1st Semester</SelectItem>
            <SelectItem value={AcademicSemester.SECOND}>2nd Semester</SelectItem>
            <SelectItem value={AcademicSemester.SUMMER}>Summer</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="term">Term</Label>
        <Select
          value={value.term ?? ""}
          onValueChange={handleTermChange}
          disabled={disabled || isSummer}
        >
          <SelectTrigger id="term">
            <SelectValue placeholder={isSummer ? "N/A" : "Select term"}>
              {value.term
                ? (TERM_OPTIONS.find((o) => o.value === value.term)?.label ?? null)
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {!isSummer && (
              <>
                <SelectItem value={AcademicTerm.FIRST_TERM}>1st Term</SelectItem>
                <SelectItem value={AcademicTerm.SECOND_TERM}>2nd Term</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {isSummer && <p className="text-muted-foreground text-xs">Summer semester has no terms</p>}
      </div>
    </div>
  );
}
