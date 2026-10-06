"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
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
  RESPONSE_COMPLETION_OPTIONS,
  RESPONSE_STATUS_OPTIONS,
  type ResponseFilterOption,
} from "./response-review-labels";
import { cn } from "@/lib/utils";
import { useResponsesNavigation } from "./responses-workspace";

// ---------------------------------------------------------------------------
// Shared review filter panel (spec §25.2, §27.2)
//
// Program Heads and the General Education Coordinator filter the same
// evaluation rosters, so the primary controls — search, academic period,
// deployment status, response progress — and the responsive shell are one
// component. Only the advanced field set is per-role, so it arrives as a
// render prop: General Education adds Program and ILO, Program Head adds
// Major and the Program-wide instrument/stakeholder dimensions.
//
// The role adapters own URL parsing, serialization, and clear-href building;
// this component only collects form values and hands them back as a raw map.
// ---------------------------------------------------------------------------

/** One facet control the role adapter contributes to the advanced panel. */
export type AdvancedResponseFilterField<State = Record<string, unknown>> = {
  /** Form field name, which is also the URL parameter name. */
  name: keyof State & string;
  /**
   * Builds the field for one mounted form. The desktop form and the mobile
   * Drawer both render these, so the caller receives the prefix and must keep
   * ids unique — duplicate ids would break label association and assistive
   * lookup in the document.
   */
  render: (idPrefix: string) => ReactNode;
};

/** Raw filter state as a URL-facing key/value map, before role parsing. */
export type RawResponseFilters = Record<string, string>;

export type ResponsesFiltersProps<State = Record<string, unknown>> = {
  /** Parsed current state, used for the active-filter count and defaults. */
  activeCount: number;
  advancedCount: number;
  /** Advanced fields for the advanced-count badge and their rendering. */
  advancedFields: AdvancedResponseFilterField<State>[];
  /** Search placeholder wording for this review scope. */
  searchPlaceholder: string;
  /** Current deployment status facet; undefined means "All statuses". */
  status?: string;
  /** Current response-progress facet; undefined means "All progress states". */
  completion?: string;
  /** Helper line under the panel heading. */
  description: string;
  /** URL with every facet cleared; the Coordinator has no view tabs. */
  clearHref: string;
  /** Room for hidden inputs carrying facets this form has no control for. */
  hiddenFields?: ReactNode;
  /**
   * Primary-row fields rendered after search, before status and progress.
   * A render function for the same uniqueness reason as `advancedFields`.
   */
  primaryFields?: (idPrefix: string) => ReactNode;
  /**
   * Parse the submitted form into this role's URL state and build the target
   * href. Returning the href keeps every role's URL contract in one place.
   */
  buildSubmitHref: (raw: RawResponseFilters) => string;
};

export function ResponsesFilters<State = Record<string, unknown>>({
  activeCount,
  advancedCount,
  advancedFields,
  primaryFields,
  searchPlaceholder,
  status,
  completion,
  description,
  clearHref,
  hiddenFields,
  buildSubmitHref,
}: ResponsesFiltersProps<State>) {
  const { isPending, navigate } = useResponsesNavigation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const headingId = useId();

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw: RawResponseFilters = {};
    for (const [key, value] of new FormData(event.currentTarget).entries()) {
      if (typeof value === "string") raw[key] = value;
    }
    setDrawerOpen(false);
    navigate(buildSubmitHref(raw));
  }

  return (
    <section
      aria-labelledby={headingId}
      className="border-border bg-card rounded-xl border shadow-sm"
    >
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="text-muted-foreground" />
            <h2 id={headingId} className="text-title-sm font-semibold">
              Find evaluations
            </h2>
            {activeCount > 0 ? <Badge variant="secondary">{activeCount} active</Badge> : null}
          </div>
          <p className="text-body-sm text-muted-foreground mt-1 hidden sm:block">{description}</p>
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
          formKey={`desktop:${clearHref}:${activeCount}:${advancedCount}`}
          idPrefix="desktop"
          isPending={isPending}
          activeCount={activeCount}
          advancedCount={advancedCount}
          advancedFields={advancedFields}
          primaryFields={primaryFields}
          status={status}
          completion={completion}
          searchPlaceholder={searchPlaceholder}
          hiddenFields={hiddenFields}
          clearHref={clearHref}
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
          {/* max-height plus a safe-area-aware bottom pad keeps the last control
              and the sticky action row reachable above the home indicator. */}
          <DrawerContent className="max-h-[88dvh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Filter evaluations</DrawerTitle>
              <DrawerDescription>
                Choose an academic period, response state, or other details to narrow this view.
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <FilterForm
                formKey={`mobile:${clearHref}:${activeCount}:${advancedCount}`}
                idPrefix="mobile"
                isPending={isPending}
                activeCount={activeCount}
                advancedCount={advancedCount}
                advancedFields={advancedFields}
                primaryFields={primaryFields}
                status={status}
                completion={completion}
                searchPlaceholder={searchPlaceholder}
                hiddenFields={hiddenFields}
                clearHref={clearHref}
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

function FilterForm<State = Record<string, unknown>>({
  formKey,
  idPrefix,
  isPending,
  activeCount,
  advancedCount,
  advancedFields,
  primaryFields,
  searchPlaceholder,
  status,
  completion,
  hiddenFields,
  clearHref,
  onSubmit,
  mobile = false,
}: Omit<ResponsesFiltersProps<State>, "description" | "buildSubmitHref"> & {
  formKey: string;
  idPrefix: string;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  mobile?: boolean;
}) {
  return (
    // Remounting on the committed scope is what keeps the combobox selections
    // and uncontrolled inputs from surviving a soft navigation that the URL
    // has already replaced.
    <form key={formKey} onSubmit={onSubmit} aria-busy={isPending || undefined}>
      {hiddenFields}
      <FieldGroup className="gap-4">
        <div className={cn("grid gap-4", mobile ? "grid-cols-1" : "grid-cols-2 xl:grid-cols-4")}>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-response-search`}>Search</FieldLabel>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <Input
                id={`${idPrefix}-response-search`}
                type="search"
                name="q"
                maxLength={100}
                autoComplete="off"
                placeholder={searchPlaceholder}
                className="pl-9"
              />
            </div>
          </Field>
          {primaryFields?.(idPrefix)}
          <ResponseSelectField
            id={`${idPrefix}-status`}
            name="status"
            label="Status"
            options={RESPONSE_STATUS_OPTIONS}
            value={status}
            blank="All statuses"
          />
          <ResponseSelectField
            id={`${idPrefix}-completion`}
            name="completion"
            label="Response progress"
            options={RESPONSE_COMPLETION_OPTIONS}
            value={completion}
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
            {advancedFields.map((entry) => (
              <div key={entry.name}>{entry.render(idPrefix)}</div>
            ))}
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

/**
 * Searchable single-select. The current value arrives as a hidden input so a
 * cleared selection submits an empty string — dropping the facet instead of
 * re-submitting the previous one.
 */
export function ResponseComboboxField({
  id,
  name,
  label,
  options,
  placeholder,
  emptyMessage,
  value,
}: {
  id: string;
  name: string;
  label: string;
  options: ResponseFilterOption[];
  placeholder: string;
  emptyMessage: string;
  value?: string;
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

/** Short enum select; the blank option means "no facet". */
export function ResponseSelectField({
  id,
  name,
  label,
  options,
  blank,
  value,
}: {
  id: string;
  name: string;
  label: string;
  options: ResponseFilterOption[];
  blank: string;
  value?: string;
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
