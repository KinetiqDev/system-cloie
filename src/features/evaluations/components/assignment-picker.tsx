"use client";

import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { YearLevel, StudentSection } from "@prisma/client";
import { formatTermInstanceLabel } from "@/lib/utils/date-format";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

/**
 * Faculty course assignment with display info.
 * Issue #43: facultyId/facultyName for on-behalf deployment banner.
 */
export type AssignmentOption = {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  programId: string;
  programCode: string;
  yearLevel: YearLevel;
  section: StudentSection | null;
  termInstanceId: string;
  termInstanceLabel?: string;
  isActive: boolean;
  facultyId?: string;
  facultyName?: string;
};

interface AssignmentPickerProps {
  assignments: AssignmentOption[];
  allAssignments?: AssignmentOption[];
  value?: string | null;
  onChange: (value: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
}

/**
 * Format a class identity label for display.
 * Example: "CS101 - 1st Year - Section A (BSIT)"
 */
function formatClassIdentityLabel(
  courseCode: string,
  courseTitle: string,
  yearLevel: YearLevel,
  section: StudentSection | null,
  programCode: string
): string {
  const sectionPart = section ? ` - ${section}` : "";
  return `${courseCode} - ${courseTitle} — ${formatYearLevel(yearLevel)}${sectionPart} (${programCode})`;
}

function formatYearLevel(level: YearLevel): string {
  const map: Record<YearLevel, string> = {
    FIRST_YEAR: "1st Year",
    SECOND_YEAR: "2nd Year",
    THIRD_YEAR: "3rd Year",
    FOURTH_YEAR: "4th Year",
  };
  return map[level] || level;
}

/**
 * Phase 6: A picker for selecting a faculty's course assignment.
 * Displays assignments with class identity labels.
 */
export function AssignmentPicker({
  assignments,
  allAssignments,
  value,
  onChange,
  label = "Class Assignment",
  placeholder = "Select a class assignment...",
  disabled = false,
  allowClear = false,
}: AssignmentPickerProps) {
  const pickerId = useId();
  const labelSource = allAssignments ?? assignments;
  // Sort by course code, then year level
  const sortedAssignments = [...assignments]
    .filter((a) => a.isActive)
    .sort((a, b) => {
      if (a.courseCode !== b.courseCode) {
        return a.courseCode.localeCompare(b.courseCode);
      }
      const yearOrder = {
        FIRST_YEAR: 0,
        SECOND_YEAR: 1,
        THIRD_YEAR: 2,
        FOURTH_YEAR: 3,
      };
      return yearOrder[a.yearLevel] - yearOrder[b.yearLevel];
    });

  return (
    <Field>
      {label && <FieldLabel htmlFor={pickerId}>{label}</FieldLabel>}
      <FieldContent>
        <Select
          value={value ?? ""}
          onValueChange={(val) => onChange(val || null)}
          disabled={disabled || sortedAssignments.length === 0}
        >
          <SelectTrigger id={pickerId} className="w-full">
            <SelectValue placeholder={placeholder}>
              {value
                ? (() => {
                    const a = labelSource.find((a) => a.id === value);
                    return a
                      ? formatClassIdentityLabel(
                          a.courseCode,
                          a.courseTitle,
                          a.yearLevel,
                          a.section,
                          a.programCode
                        )
                      : null;
                  })()
                : null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {allowClear && (
              <SelectItem value="">Clear selection</SelectItem>
            )}
            {sortedAssignments.length === 0 ? (
              <SelectItem value="" disabled>
                No assignments available
              </SelectItem>
            ) : (
              sortedAssignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  <span className="flex flex-col">
                    <span>
                      {formatClassIdentityLabel(
                        assignment.courseCode,
                        assignment.courseTitle,
                        assignment.yearLevel,
                        assignment.section,
                        assignment.programCode
                      )}
                    </span>
                    {assignment.termInstanceLabel && (
                      <span className="text-muted-foreground text-xs">
                        {assignment.termInstanceLabel}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  );
}

/**
 * Grouped assignment picker with term filtering.
 */
interface GroupedAssignmentPickerProps extends Omit<AssignmentPickerProps, "assignments"> {
  assignments: AssignmentOption[];
  termInstances: TermInstanceItem[];
  selectedTermId?: string | null;
  onTermChange?: (termId: string | null) => void;
}

/**
 * Assignment picker with term filter.
 * Shows term selector above assignment selector.
 */
export function GroupedAssignmentPicker({
  assignments,
  termInstances,
  selectedTermId,
  onTermChange,
  ...pickerProps
}: GroupedAssignmentPickerProps) {
  const termPickerId = useId();
  // Filter assignments by selected term
  const filteredAssignments = selectedTermId
    ? assignments.filter((a) => a.termInstanceId === selectedTermId)
    : assignments;

  // Sort term instances (newest first)
  const sortedTerms = [...termInstances].sort((a, b) => {
    return b.schoolYearCode.localeCompare(a.schoolYearCode);
  });

  return (
    <div className="space-y-4">
      <Field>
        <FieldLabel htmlFor={termPickerId}>Academic Term</FieldLabel>
        <FieldContent>
          <Select
            value={selectedTermId ?? ""}
            onValueChange={(val) => onTermChange?.(val || null)}
            disabled={sortedTerms.length === 0}
          >
            <SelectTrigger id={termPickerId} className="w-full">
              <SelectValue placeholder="All Terms">
                {selectedTermId
                  ? (() => {
                      const t = sortedTerms.find((t) => t.id === selectedTermId);
                      return t
                        ? formatTermInstanceLabel(t.schoolYearCode, t.semester, t.term)
                        : null;
                    })()
                  : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Terms</SelectItem>
              {sortedTerms.map((term) => (
                <SelectItem key={term.id} value={term.id}>
                  <span className="flex items-center gap-2">
                    {term.status === "ACTIVE" && (
                      <span className="bg-primary h-2 w-2 rounded-full" />
                    )}
                    {formatTermInstanceLabel(
                      term.schoolYearCode,
                      term.semester,
                      term.term
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      <AssignmentPicker
        {...pickerProps}
        assignments={filteredAssignments}
        allAssignments={assignments}
        placeholder={
          filteredAssignments.length === 0
            ? "No assignments for selected term"
            : pickerProps.placeholder
        }
      />
    </div>
  );
}
