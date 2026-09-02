"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RESPONSE_COMPLETION_OPTIONS,
  RESPONSE_SECTION_OPTIONS,
  RESPONSE_STAKEHOLDER_OPTIONS,
  RESPONSE_STATUS_OPTIONS,
  RESPONSE_YEAR_LEVEL_OPTIONS,
  type ResponseFilterOption,
} from "@/features/analytics/program-head-responses-labels";
import type { ResponseFilterOptions } from "@/features/analytics/services/list-program-head-response-deployments";
import type { ProgramHeadResponsesFilterState } from "@/features/analytics/services/program-head-responses-state";
import { buildProgramHeadResponsesUrl } from "@/features/analytics/services/program-head-responses-state";
import { buildProgramHeadProgramPath } from "@/lib/constants/program-head-routes";
import { cn } from "@/lib/utils";

type FilterOption = ResponseFilterOption;

type Props = {
  programId: string;
  state: ProgramHeadResponsesFilterState;
  options: ResponseFilterOptions;
};

export function ProgramHeadResponsesFilters({ programId, state, options }: Props) {
  const activeCount = countActiveFilters(state);
  const clearHref = buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 });

  return (
    <section
      aria-labelledby="response-filters-heading"
      className="border-border bg-card rounded-xl border shadow-sm"
    >
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="text-muted-foreground" />
            <h2 id="response-filters-heading" className="text-title-sm font-semibold">
              Find evaluations
            </h2>
            {activeCount > 0 ? <Badge variant="secondary">{activeCount} active</Badge> : null}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1 hidden sm:block">
            Search the selected view or narrow it by academic period and response state.
          </p>
        </div>
        {activeCount > 0 ? (
          <Link
            href={clearHref}
            className={cn(buttonVariants({ variant: "ghost" }), "hidden lg:inline-flex")}
          >
            <X data-icon="inline-start" aria-hidden="true" />
            Clear filters
          </Link>
        ) : null}
      </div>

      <div className="border-border hidden border-t p-4 lg:block">
        <FilterForm
          key={`desktop:${buildProgramHeadResponsesUrl(programId, state)}`}
          programId={programId}
          state={state}
          options={options}
          idPrefix="desktop"
        />
      </div>

      <div className="border-border border-t p-3 lg:hidden">
        <Drawer showSwipeHandle>
          <DrawerTrigger render={<Button variant="outline" className="w-full justify-between" />}>
            <span>Filters</span>
            <span className="text-muted-foreground font-normal">
              {activeCount > 0 ? `${activeCount} active` : "All evaluations"}
            </span>
          </DrawerTrigger>
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Filter evaluations</DrawerTitle>
              <DrawerDescription>
                Choose an academic period, response state, or other details to narrow this view.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <FilterForm
                key={`mobile:${buildProgramHeadResponsesUrl(programId, state)}`}
                programId={programId}
                state={state}
                options={options}
                idPrefix="mobile"
                mobile
              />
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </section>
  );
}

function FilterForm({
  programId,
  state,
  options,
  idPrefix,
  mobile = false,
}: Props & { idPrefix: string; mobile?: boolean }) {
  const activeCount = countActiveFilters(state);
  const clearHref = buildProgramHeadResponsesUrl(programId, { tab: state.tab, page: 1 });
  const advancedCount = countAdvancedFilters(state);

  return (
    <form method="get" action={buildProgramHeadProgramPath(programId, "responses")}>
      {state.tab !== "course" ? <input type="hidden" name="tab" value={state.tab} /> : null}
      <FieldGroup className="gap-4">
        <div className={cn("grid gap-4", mobile ? "grid-cols-1" : "grid-cols-2 xl:grid-cols-4")}>
          <SearchField id={`${idPrefix}-response-search`} state={state} />
          <SearchableField
            id={`${idPrefix}-academic-period`}
            label="Academic period"
            name="termInstanceId"
            value={state.termInstanceId}
            options={options.periodOptions.termInstances}
            placeholder="All academic periods"
            emptyMessage="No academic periods match your search."
          />
          <SimpleSelect
            id={`${idPrefix}-status`}
            label="Status"
            name="status"
            value={state.status}
            options={RESPONSE_STATUS_OPTIONS}
            blank="All statuses"
          />
          <SimpleSelect
            id={`${idPrefix}-completion`}
            label="Response progress"
            name="completion"
            value={state.completion}
            options={RESPONSE_COMPLETION_OPTIONS}
            blank="All progress states"
          />
        </div>

        <details className="group" open={mobile && advancedCount > 0}>
          <summary className="focus-visible:ring-ring flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold focus-visible:ring-3 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
            More filters
            {advancedCount > 0 ? <Badge variant="secondary">{advancedCount}</Badge> : null}
            <ChevronDown
              aria-hidden="true"
              className="text-muted-foreground ml-auto transition-transform group-open:rotate-180 motion-reduce:transition-none"
            />
          </summary>
          <div
            className={cn("grid gap-4 pt-3", mobile ? "grid-cols-1" : "grid-cols-2 xl:grid-cols-4")}
          >
            <AdvancedFilterFields
              tab={state.tab}
              state={state}
              options={options}
              idPrefix={idPrefix}
            />
          </div>
        </details>

        <FilterActions activeCount={activeCount} clearHref={clearHref} mobile={mobile} />
      </FieldGroup>
    </form>
  );
}

function FilterActions({
  activeCount,
  clearHref,
  mobile,
}: {
  activeCount: number;
  clearHref: string;
  mobile: boolean;
}) {
  return (
    <div
      className={cn("flex items-center gap-2", mobile && "bg-popover sticky bottom-0 -mx-1 py-2")}
    >
      <Button type="submit" className={cn(mobile && "flex-1")}>
        Apply filters
      </Button>
      {activeCount > 0 ? (
        <Link
          href={clearHref}
          className={buttonVariants({ variant: mobile ? "outline" : "ghost" })}
        >
          <X data-icon="inline-start" aria-hidden="true" />
          Clear
        </Link>
      ) : null}
    </div>
  );
}

function AdvancedFilterFields({
  tab,
  state,
  options,
  idPrefix,
}: Pick<ProgramHeadResponsesFilterState, "tab"> & {
  state: ProgramHeadResponsesFilterState;
  options: ResponseFilterOptions;
  idPrefix: string;
}) {
  if (tab === "course") {
    return (
      <>
        <SearchableField
          id={`${idPrefix}-course`}
          label="Course"
          name="courseId"
          value={state.courseId}
          options={options.courses}
          placeholder="All courses"
          emptyMessage="No courses match your search."
        />
        <SearchableField
          id={`${idPrefix}-faculty`}
          label="Faculty"
          name="facultyId"
          value={state.facultyId}
          options={options.faculty}
          placeholder="All faculty"
          emptyMessage="No faculty match your search."
        />
        <SearchableField
          id={`${idPrefix}-major`}
          label="Major"
          name="majorId"
          value={state.majorId}
          options={options.majors}
          placeholder="All majors"
          emptyMessage="No majors match your search."
        />
        <SimpleSelect
          id={`${idPrefix}-year-level`}
          label="Year level"
          name="yearLevel"
          value={state.yearLevel}
          options={RESPONSE_YEAR_LEVEL_OPTIONS}
          blank="All year levels"
        />
        <SimpleSelect
          id={`${idPrefix}-section`}
          label="Section"
          name="section"
          value={state.section}
          options={RESPONSE_SECTION_OPTIONS}
          blank="All sections"
        />
      </>
    );
  }

  return (
    <>
      <SimpleSelect
        id={`${idPrefix}-stakeholder`}
        label="Stakeholder"
        name="stakeholder"
        value={state.stakeholder}
        options={RESPONSE_STAKEHOLDER_OPTIONS}
        blank="All stakeholders"
      />
      <SearchableField
        id={`${idPrefix}-major`}
        label="Major"
        name="majorId"
        value={state.majorId}
        options={options.majors}
        placeholder="All majors"
        emptyMessage="No majors match your search."
      />
      <SimpleSelect
        id={`${idPrefix}-year-level`}
        label="Year level"
        name="yearLevel"
        value={state.yearLevel}
        options={RESPONSE_YEAR_LEVEL_OPTIONS}
        blank="All year levels"
      />
      <SearchableField
        id={`${idPrefix}-instrument`}
        label="Evaluation instrument"
        name="instrumentTemplateId"
        value={state.instrumentTemplateId}
        options={options.instruments}
        placeholder="All instruments"
        emptyMessage="No instruments match your search."
      />
    </>
  );
}

function SearchField({ id, state }: { id: string; state: ProgramHeadResponsesFilterState }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>Search</FieldLabel>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
        />
        <Input
          id={id}
          type="search"
          name="q"
          defaultValue={state.q ?? ""}
          maxLength={100}
          autoComplete="off"
          placeholder={
            state.tab === "course" ? "Evaluation, course, or faculty" : "Evaluation or stakeholder"
          }
          className="pl-9"
        />
      </div>
    </Field>
  );
}

function SearchableField({
  id,
  label,
  name,
  value,
  options,
  placeholder,
  emptyMessage,
}: {
  id: string;
  label: string;
  name: string;
  value?: string;
  options: FilterOption[];
  placeholder: string;
  emptyMessage: string;
}) {
  const selected = options.find((option) => option.id === value) ?? null;
  const [selection, setSelection] = useState<FilterOption | null>(selected);
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        items={options}
        value={selection}
        onValueChange={setSelection}
        itemToStringLabel={(option: FilterOption) => option.label}
        itemToStringValue={(option: FilterOption) => option.id}
        autoHighlight
      >
        <input type="hidden" name={name} value={selection?.id ?? ""} />
        <ComboboxInput id={id} placeholder={placeholder} showClear={Boolean(selection)} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(option: FilterOption) => (
              <ComboboxItem key={option.id} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </Field>
  );
}

function SimpleSelect({
  id,
  label,
  name,
  value,
  options,
  blank,
}: {
  id: string;
  label: string;
  name: string;
  value?: string;
  options: FilterOption[];
  blank: string;
}) {
  const items = [{ id: "", label: blank }, ...options];
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        name={name}
        defaultValue={value ?? ""}
        items={items.map((option) => ({ value: option.id, label: option.label }))}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((option) => (
              <SelectItem key={option.id || "all"} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function countActiveFilters(state: ProgramHeadResponsesFilterState): number {
  return [
    state.q,
    state.termInstanceId,
    state.courseId,
    state.facultyId,
    state.majorId,
    state.yearLevel,
    state.section,
    state.stakeholder,
    state.instrumentTemplateId,
    state.status,
    state.completion,
  ].filter(Boolean).length;
}

function countAdvancedFilters(state: ProgramHeadResponsesFilterState): number {
  return [
    state.courseId,
    state.facultyId,
    state.majorId,
    state.yearLevel,
    state.section,
    state.stakeholder,
    state.instrumentTemplateId,
  ].filter(Boolean).length;
}
