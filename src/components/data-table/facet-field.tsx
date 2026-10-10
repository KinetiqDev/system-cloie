"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { FacetDef, OptionFacetDef } from "./types";

/**
 * One facet's control, shared by the column-header popover and the mobile
 * drawer, so both surfaces always offer exactly the same choices.
 */
export function FacetField({ facet, idPrefix }: { facet: FacetDef; idPrefix: string }) {
  if (facet.kind === "toggle") {
    return (
      <label className="hover:bg-surface-hover flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
        <Checkbox
          checked={facet.value === facet.onValue}
          disabled={facet.disabled === true}
          onCheckedChange={(checked) => facet.onChange(checked ? facet.onValue : null)}
          className="mt-0.5"
        />
        <span className="min-w-0 leading-snug">{facet.toggleLabel}</span>
      </label>
    );
  }

  return (facet.searchable ?? facet.options.length >= 12) ? (
    <SearchableOptionFacet facet={facet} idPrefix={idPrefix} />
  ) : (
    <OptionFacet facet={facet} idPrefix={idPrefix} options={facet.options} />
  );
}

/** A facet whose option list is short enough to scan without a search box. */
export function OptionFacet({
  facet,
  idPrefix,
  options,
}: {
  facet: OptionFacetDef;
  idPrefix: string;
  options: OptionFacetDef["options"];
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <RadioGroup
        value={facet.value ?? ""}
        onValueChange={(value) => facet.onChange(value === "" ? null : (value as string))}
        aria-label={facet.label}
        className="gap-0.5"
      >
        <FacetOptionRow
          id={`${idPrefix}-${facet.id}-all`}
          checked={facet.value === null}
          label={facet.allLabel}
        />
        {/*
          The row id feeds Base UI's generated `aria-labelledby`, which is a
          space-separated IDREF list. Deriving it from the option's index keeps
          that reference resolvable when an option id contains spaces, while
          `value` still carries the id the list state stores.
        */}
        {options.map((option, index) => (
          <FacetOptionRow
            key={option.id}
            id={`${idPrefix}-${facet.id}-${index}`}
            checked={facet.value === option.id}
            label={option.label}
            detail={option.detail}
            badges={option.badges}
            value={option.id}
          />
        ))}
      </RadioGroup>
      {options.length === 0 && (
        <p className="text-muted-foreground px-2 py-3 text-xs">
          {facet.emptyMessage ?? "No matches."}
        </p>
      )}
    </div>
  );
}

/** A facet whose option list is long enough to be worth filtering as you type. */
function SearchableOptionFacet({ facet, idPrefix }: { facet: OptionFacetDef; idPrefix: string }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const options = normalizedQuery
    ? facet.options.filter((option) =>
        [option.label, option.detail, ...(option.badges ?? [])]
          .filter((text): text is string => Boolean(text))
          .some((text) => text.toLowerCase().includes(normalizedQuery))
      )
    : facet.options;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="relative pb-1">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          aria-label={`Search ${facet.label} options`}
          placeholder={facet.searchPlaceholder ?? "Search…"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="pl-9"
          autoComplete="off"
        />
      </div>
      <OptionFacet facet={facet} idPrefix={idPrefix} options={options} />
    </div>
  );
}

function FacetOptionRow({
  id,
  checked,
  label,
  detail,
  badges,
  value,
}: {
  id: string;
  checked: boolean;
  label: string;
  detail?: string;
  badges?: string[];
  value?: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm",
        checked ? "bg-selected-bg text-selected-fg" : "hover:bg-surface-hover"
      )}
    >
      <RadioGroupItem id={id} value={value ?? ""} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate leading-snug">{label}</span>
        {detail && (
          <span className="text-muted-foreground truncate text-xs leading-normal">{detail}</span>
        )}
      </span>
      {badges?.length ? (
        <span className="text-muted-foreground shrink-0 text-xs">{badges.join(" · ")}</span>
      ) : null}
    </label>
  );
}
