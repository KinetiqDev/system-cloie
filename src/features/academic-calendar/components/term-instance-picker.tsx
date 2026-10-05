// fallow-ignore-file code-duplication
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
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
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
  /** Sentinel selecting only the active period. Defaults to `"current"`. */
  currentValue?: string;
  allowActiveOnly?: boolean;
  activeOnlyLabel?: string;
  id?: string;
}

function compareTermInstances(a: TermInstanceItem, b: TermInstanceItem): number {
  if (a.schoolYearCode !== b.schoolYearCode) {
    return b.schoolYearCode.localeCompare(a.schoolYearCode);
  }
  const semesterOrder = { FIRST: 0, SECOND: 1, SUMMER: 2 };
  const semesterDifference = semesterOrder[a.semester] - semesterOrder[b.semester];
  if (semesterDifference) return semesterDifference;
  if (!a.term || !b.term) return 0;
  const termOrder = { FIRST_TERM: 0, SECOND_TERM: 1 };
  return termOrder[a.term] - termOrder[b.term];
}

function termInstanceTriggerLabel(
  value: string | undefined,
  instances: TermInstanceItem[],
  isActiveOnly: boolean,
  activeOnlyLabel: string
): string | null {
  if (isActiveOnly) return activeOnlyLabel;
  if (value === "all") return "All Academic Periods";
  const instance = instances.find((item) => item.id === value);
  if (!instance) return null;
  const label = formatTermInstanceLabel(instance.schoolYearCode, instance.semester, instance.term);
  return instance.status === "ACTIVE" ? `${label} — Current` : label;
}

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
  currentValue = "current",
  allowActiveOnly = false,
  activeOnlyLabel = "Active Academic Period",
  id,
}: TermInstancePickerProps) {
  const generatedId = useId();
  const pickerId = id ?? `term-instance-picker-${generatedId.replaceAll(":", "")}`;
  const filteredInstances = showOnlyActive
    ? termInstances.filter((t) => t.status === "ACTIVE")
    : termInstances;

  const sortedInstances = [...filteredInstances].sort(compareTermInstances);

  const isActiveOnly = allowActiveOnly && value === currentValue;
  const triggerLabel = termInstanceTriggerLabel(
    value,
    sortedInstances,
    isActiveOnly,
    activeOnlyLabel
  );

  return (
    <Field className="min-w-0">
      {label && <FieldLabel htmlFor={pickerId}>{label}</FieldLabel>}
      <FieldContent className="min-w-0">
        <Select value={value} onValueChange={(val) => onChange(val ?? "")} disabled={disabled}>
          <SelectTrigger
            id={pickerId}
            className="w-full min-w-0 truncate pointer-coarse:h-11"
            title={triggerLabel ?? undefined}
          >
            <SelectValue placeholder={placeholder} className="block min-w-0 truncate text-left">
              {triggerLabel}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {allowActiveOnly && <SelectItem value={currentValue}>{activeOnlyLabel}</SelectItem>}
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
                  {formatTermInstanceLabel(
                    instance.schoolYearCode,
                    instance.semester,
                    instance.term
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
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
