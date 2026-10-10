"use client";

import { useState } from "react";

import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { FilterableHead } from "@/components/data-table/filterable-head";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import type { FacetDef } from "@/components/data-table/types";

const SAMPLE_ROWS = [
  { id: "1", course: "IT101", program: "BSIT", year: "1st Year", status: "Active" },
  { id: "2", course: "IT102", program: "BSIT", year: "1st Year", status: "Active" },
  { id: "3", course: "CS201", program: "BSCS", year: "2nd Year", status: "Archived" },
  { id: "4", course: "GEUS", program: "BSBA", year: "2nd Year", status: "Active" },
];

/**
 * The table filter pattern in miniature: a funnel in each column heading that
 * narrows that column, applied values surfacing as chips, and search in the
 * toolbar because it spans columns. State is local static reference state and
 * performs no read or mutation.
 */
export function TableFiltersShowcase() {
  const [program, setProgram] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const programFacet: FacetDef = {
    id: "program",
    label: "Program",
    value: program,
    onChange: setProgram,
    allLabel: "All programs",
    options: [
      { id: "BSIT", label: "BSIT", detail: "Information Technology" },
      { id: "BSCS", label: "BSCS", detail: "Computer Science" },
      { id: "BSBA", label: "BSBA", detail: "Business Administration" },
    ],
  };
  const yearFacet: FacetDef = {
    id: "year",
    label: "Year Level",
    value: year,
    onChange: setYear,
    allLabel: "All year levels",
    options: [
      { id: "1st Year", label: "1st Year" },
      { id: "2nd Year", label: "2nd Year" },
    ],
  };
  const statusFacet: FacetDef = {
    id: "status",
    label: "Status",
    value: status,
    onChange: setStatus,
    allLabel: "All statuses",
    options: [
      { id: "Active", label: "Active" },
      { id: "Archived", label: "Archived" },
    ],
  };
  const facets = [programFacet, yearFacet, statusFacet];

  const rows = SAMPLE_ROWS.filter(
    (row) =>
      (!program || row.program === program) &&
      (!year || row.year === year) &&
      (!status || row.status === status) &&
      (!search || row.course.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-3">
      <TableToolbar
        search={{
          id: "showcase-course-search",
          label: "Search courses",
          placeholder: "Search by code…",
          value: search,
          onChange: setSearch,
        }}
        facets={facets}
        onClearAll={() => {
          setProgram(null);
          setYear(null);
          setStatus(null);
          setSearch("");
        }}
        resultSummary={
          <p className="text-muted-foreground text-xs tabular-nums">
            {rows.length} of {SAMPLE_ROWS.length} courses
          </p>
        }
      />
      <div className="overflow-x-auto rounded-lg border">
        <Table label="Filterable courses" className="min-w-[36rem]">
          <TableHeader>
            <TableRow>
              <FilterableHead label="Course" />
              <FilterableHead label="Program" facets={[programFacet]} />
              <FilterableHead label="Year Level" facets={[yearFacet]} />
              <FilterableHead label="Status" facets={[statusFacet]} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.course}</TableCell>
                <TableCell>{row.program}</TableCell>
                <TableCell>{row.year}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Local static state only; choosing a value narrows the table and returns it to its first
        page.
      </p>
    </div>
  );
}
