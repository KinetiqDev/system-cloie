"use client";

import type { ReactNode } from "react";
import { ListFilter, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** Sentinel for "no narrowing"; never a real option id. */
export const ALL_OPTION_ID = "__all__";

type SearchableFilterOption = {
  id: string;
  label: string;
  detail?: string;
  badges?: string[];
};

type FilterBarShellProps = {
  title: string;
  description: string;
  /** Number of narrowing facets currently applied. */
  activeCount?: number;
  onReset: () => void;
  /** Reset stays visible but disabled when nothing is applied. */
  canReset?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * The frame every Course-assignment list filter bar wears: an icon tile, a
 * title, the active-filter count, and a reset control above the controls
 * themselves. Sibling lists share it so the two surfaces read as one system.
 */
export function FilterBarShell({
  title,
  description,
  activeCount = 0,
  onReset,
  canReset = activeCount > 0,
  children,
  className,
}: FilterBarShellProps) {
  return (
    <section
      aria-label={title}
      className={cn(
        "bg-card flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border p-4 shadow-xs sm:p-5",
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="bg-primary/5 text-primary ring-primary/20 hidden size-8 shrink-0 items-center justify-center rounded-lg ring-1 sm:inline-flex"
            aria-hidden="true"
          >
            <ListFilter className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-title-sm flex flex-wrap items-center gap-2 leading-tight">
              {title}
              {activeCount > 0 ? <Badge variant="secondary">{activeCount} active</Badge> : null}
            </h2>
            <p className="text-muted-foreground text-xs leading-normal break-words">
              {description}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          disabled={!canReset}
          className="shrink-0 gap-1.5"
        >
          <X className="size-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>
      {children}
    </section>
  );
}

type FilterSelectProps = {
  label: string;
  id: string;
  value: string;
  displayValue?: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

/** A labelled single-choice narrowing control. */
export function FilterSelect({
  label,
  id,
  value,
  displayValue,
  onChange,
  children,
}: FilterSelectProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
        <SelectTrigger id={id} className="bg-background w-full">
          <SelectValue>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>{children}</SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

type SearchableFilterSelectProps = {
  label: string;
  id: string;
  value: string | null;
  options: SearchableFilterOption[];
  placeholder: string;
  emptyMessage: string;
  onChange: (value: string | null) => void;
};

/**
 * A narrowing control for option sets too long to scan, so it filters its own
 * list by label, detail, and badges as the operator types.
 */
export function SearchableFilterSelect({
  label,
  id,
  value,
  options,
  placeholder,
  emptyMessage,
  onChange,
}: SearchableFilterSelectProps) {
  const selectedOption = value ? (options.find((option) => option.id === value) ?? null) : null;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Combobox
        value={selectedOption}
        onValueChange={(option) => {
          const nextOption = option as SearchableFilterOption | null;
          onChange(!nextOption || nextOption.id === ALL_OPTION_ID ? null : nextOption.id);
        }}
        items={options}
        filter={(option, query) => {
          if (!query) return true;
          const normalizedQuery = query.toLowerCase();
          return [option.label, option.detail, ...(option.badges ?? [])]
            .filter((text): text is string => Boolean(text))
            .some((text) => text.toLowerCase().includes(normalizedQuery));
        }}
        itemToStringLabel={(option) => option?.label ?? ""}
        itemToStringValue={(option) => option.id}
        autoHighlight
      >
        <ComboboxInput
          id={id}
          className="w-full"
          placeholder={placeholder}
          showClear={Boolean(value)}
        />
        <ComboboxContent className="max-w-[calc(100vw-2rem)]">
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.id} value={option} className="items-start py-2">
                <span className="flex min-w-0 flex-1 flex-col gap-1 py-0.5 text-left">
                  <span className="truncate text-sm leading-snug font-medium">{option.label}</span>
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {option.badges?.map((badge: string) => (
                      <Badge key={badge} variant="outline" className="bg-background">
                        {badge}
                      </Badge>
                    ))}
                    {option.detail && (
                      <span className="text-muted-foreground min-w-0 truncate text-xs leading-normal">
                        {option.detail}
                      </span>
                    )}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

/**
 * The search box every list filter bar leads with. Search is its own utility
 * rather than one more dropdown, so it carries the magnifying glass and the
 * clear affordance the raw `Input` cannot.
 */
export function FilterSearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
  onFocus,
  onBlur,
  className,
  type = "text",
  maxLength,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  className?: string;
  /** `search` adds the platform's own clear affordance. */
  type?: "text" | "search";
  maxLength?: number;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id={id}
          type={type}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="pl-9"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
