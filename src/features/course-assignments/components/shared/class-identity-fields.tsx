"use client";

import { YearLevel, StudentSection } from "@prisma/client";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { YEAR_LEVEL_OPTIONS, STUDENT_SECTION_OPTIONS } from "@/lib/constants/academic";
import { getYearLevelDisplay } from "@/lib/constants/year-levels";

interface ClassIdentityFieldsProps {
  programId: string;
  yearLevel: YearLevel;
  section: StudentSection | null;
  availablePrograms: Array<{ id: string; code: string; name: string }>;
  onProgramChange: (value: string) => void;
  onYearLevelChange: (value: YearLevel) => void;
  onSectionChange: (value: StudentSection | null) => void;
  disabled?: boolean;
  programDisabled?: boolean;
  suggestedYearLevel?: YearLevel | null;
}

export function ClassIdentityFields({
  programId,
  yearLevel,
  section,
  availablePrograms,
  onProgramChange,
  onYearLevelChange,
  onSectionChange,
  disabled = false,
  programDisabled = false,
  suggestedYearLevel,
}: ClassIdentityFieldsProps) {
  const hasHint = suggestedYearLevel != null;
  const hintMatches = hasHint && yearLevel === suggestedYearLevel;

  return (
    <div className="space-y-5">
      <Field className="min-w-0">
        <FieldLabel htmlFor="program">Program</FieldLabel>
        <FieldContent className="min-w-0">
          <Combobox
            value={availablePrograms.find((p) => p.id === programId) ?? null}
            onValueChange={(value) => value && onProgramChange(value.id)}
            disabled={disabled || programDisabled}
            items={availablePrograms}
            filter={(program, query) =>
              !query ||
              [program.code, program.name].some((v) =>
                v.toLowerCase().includes(query.toLowerCase())
              )
            }
            itemToStringLabel={(p) => `${p.code} — ${p.name}`}
            itemToStringValue={(p) => p.id}
            autoHighlight
          >
            <ComboboxInput
              id="program"
              className="w-full min-w-0 truncate"
              placeholder="Search program…"
              disabled={disabled || programDisabled}
            />
            <ComboboxContent>
              <ComboboxEmpty>No programs match your search.</ComboboxEmpty>
              <ComboboxList>
                {(program) => (
                  <ComboboxItem
                    key={program.id}
                    value={program}
                    className="items-start py-2"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5 py-0.5 text-left">
                      <span className="text-sm font-medium leading-snug">
                        {program.code}
                      </span>
                      <span className="text-muted-foreground text-xs leading-normal">
                        {program.name}
                      </span>
                    </span>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </FieldContent>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field className="min-w-0">
          <FieldLabel htmlFor="year-level" className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="shrink-0">Year Level</span>
              {hasHint && (
                <Badge
                  variant={hintMatches ? "secondary" : "warning"}
                  className="max-w-full shrink text-xs break-words whitespace-normal"
                >
                  {hintMatches
                    ? `Course default: ${getYearLevelDisplay(suggestedYearLevel)}`
                    : `Course default: ${getYearLevelDisplay(
                        suggestedYearLevel
                      )} (selected: ${getYearLevelDisplay(yearLevel)})`}
                </Badge>
              )}
            </span>
          </FieldLabel>
          <FieldContent className="min-w-0">
            <Select
              value={yearLevel}
              onValueChange={(value) => onYearLevelChange(value as YearLevel)}
              disabled={disabled}
            >
              <SelectTrigger id="year-level" className="w-full min-w-0">
                <SelectValue placeholder="Select year">
                  {yearLevel
                    ? (YEAR_LEVEL_OPTIONS.find((o) => o.value === yearLevel)?.label ?? null)
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {YEAR_LEVEL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>

        <Field className="min-w-0">
          <FieldLabel htmlFor="section">Section</FieldLabel>
          <FieldContent className="min-w-0">
            <Select
              value={section ?? ""}
              onValueChange={(value) => onSectionChange(value as StudentSection)}
              disabled={disabled}
            >
              <SelectTrigger id="section" className="w-full min-w-0">
                <SelectValue placeholder="Select section">
                  {section
                    ? (STUDENT_SECTION_OPTIONS.find((o) => o.value === section)?.label ?? null)
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {STUDENT_SECTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
      </div>
    </div>
  );
}
