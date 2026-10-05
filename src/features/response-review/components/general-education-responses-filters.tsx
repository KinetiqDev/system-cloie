"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RESPONSE_SECTION_OPTIONS,
  RESPONSE_YEAR_LEVEL_OPTIONS,
  type ResponseFilterOption,
} from "@/features/analytics/program-head-responses-labels";
import type { GeneralEducationEvaluationFilterOptions } from "@/features/response-review/services/list-general-education-evaluations";
import {
  buildGeneralEducationResponsesUrl,
  parseGeneralEducationResponsesSearchParams,
  type GeneralEducationResponsesFilterState,
} from "@/features/response-review/services/general-education-responses-state";
import { cn } from "@/lib/utils";
import { useGeneralEducationResponsesNavigation } from "./general-education-responses-workspace";

type Props = {
  state: GeneralEducationResponsesFilterState;
  options: GeneralEducationEvaluationFilterOptions;
};

export function GeneralEducationResponsesFilters({ state, options }: Props) {
  const { isPending, navigate } = useGeneralEducationResponsesNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeCount = countActiveFilters(state);
  const advancedCount = countAdvancedFilters(state);
  const clearHref = buildGeneralEducationResponsesUrl({ page: 1 });

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entries = [...new FormData(event.currentTarget).entries()].filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    );
    const parsed = parseGeneralEducationResponsesSearchParams(Object.fromEntries(entries));
    setDrawerOpen(false);
    navigate(buildGeneralEducationResponsesUrl(parsed));
  }

  return (
    <section
      aria-labelledby="gen-ed-response-filters-heading"
      className="border-border bg-card rounded-xl border shadow-sm"
    >
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="text-muted-foreground" />
            <h2 id="gen-ed-response-filters-heading" className="text-title-sm font-semibold">
              Find evaluations
            </h2>
            {activeCount > 0 ? <Badge variant="secondary">{activeCount} active</Badge> : null}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1 hidden sm:block">
            Search General Education evaluations or narrow them by academic period and class.
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
          key={`desktop:${buildGeneralEducationResponsesUrl(state)}`}
          state={state}
          options={options}
          idPrefix="desktop"
          isPending={isPending}
          advancedCount={advancedCount}
          onSubmit={applyFilters}
        />
      </div>

      <div className="border-border border-t p-3 lg:hidden">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} showSwipeHandle>
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
                Choose an academic period, course, or class to narrow this view.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <FilterForm
                key={`mobile:${buildGeneralEducationResponsesUrl(state)}`}
                state={state}
                options={options}
                idPrefix="mobile"
                isPending={isPending}
                advancedCount={advancedCount}
                onSubmit={applyFilters}
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
  state,
  options,
  idPrefix,
  isPending,
  advancedCount,
  onSubmit,
  mobile = false,
}: Props & {
  idPrefix: string;
  isPending: boolean;
  advancedCount: number;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  mobile?: boolean;
}) {
  const activeCount = countActiveFilters(state);
  const clearHref = buildGeneralEducationResponsesUrl({ page: 1 });

  return (
    <form onSubmit={onSubmit} aria-busy={isPending || undefined}>
      {/* School Year and Semester scope arrives on the URL from upward
          navigation and has no visible control here, so the form must carry
          it forward or applying any other filter silently widens the scope. */}
      {state.schoolYearId ? (
        <input type="hidden" name="schoolYearId" value={state.schoolYearId} />
      ) : null}
      {state.semester ? <input type="hidden" name="semester" value={state.semester} /> : null}
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
          </div>
        </details>

        <FilterActions
          isPending={isPending}
          mobile={mobile}
          activeCount={activeCount}
          clearHref={clearHref}
        />
      </FieldGroup>
    </form>
  );
}

function FilterActions({
  isPending,
  mobile,
  activeCount,
  clearHref,
}: {
  isPending: boolean;
  mobile: boolean;
  activeCount: number;
  clearHref: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2",
        mobile && "bg-popover sticky bottom-0 -mx-1 py-2"
      )}
    >
      <Button type="submit" disabled={isPending} className={cn(mobile && "flex-1")}>
        {isPending ? <Spinner data-icon="inline-start" /> : null}
        {isPending ? "Applying filters" : "Apply filters"}
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

function SearchField({ id, state }: { id: string; state: GeneralEducationResponsesFilterState }) {
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
          placeholder="Evaluation, course, or faculty"
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
  options: ResponseFilterOption[];
  placeholder: string;
  emptyMessage: string;
}) {
  const [selection, setSelection] = useState<ResponseFilterOption | null>(
    options.find((option) => option.id === value) ?? null
  );
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        items={options}
        value={selection}
        onValueChange={setSelection}
        itemToStringLabel={(option: ResponseFilterOption) => option.label}
        itemToStringValue={(option: ResponseFilterOption) => option.id}
        autoHighlight
      >
        <input type="hidden" name={name} value={selection?.id ?? ""} />
        <ComboboxInput id={id} placeholder={placeholder} showClear={Boolean(selection)} />
        <ComboboxContent>
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(option: ResponseFilterOption) => (
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
  options: ResponseFilterOption[];
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

function countActiveFilters(state: GeneralEducationResponsesFilterState): number {
  return [
    state.q,
    state.termInstanceId,
    state.schoolYearId,
    state.semester,
    state.courseId,
    state.facultyId,
    state.yearLevel,
    state.section,
  ].filter(Boolean).length;
}

function countAdvancedFilters(state: GeneralEducationResponsesFilterState): number {
  return [state.courseId, state.facultyId, state.yearLevel, state.section].filter(Boolean).length;
}
