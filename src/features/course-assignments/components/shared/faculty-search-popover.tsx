"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, AlertTriangle, User, ChevronDown } from "lucide-react";
import { searchFacultyPoolAction } from "@/lib/actions/course-assignment-actions";
import { useDebounce } from "@/hooks/use-debounce";
import type { FacultySearchResult } from "@/features/course-assignments/types";

interface FacultySearchPopoverProps {
  id?: string;
  selectedFacultyId: string | null;
  selectedFacultyName: string | null;
  targetProgramId?: string;
  targetProgramName?: string;
  onSelect: (faculty: FacultySearchResult) => void;
  disabled?: boolean;
}

export function FacultySearchPopover({
  id,
  selectedFacultyId,
  selectedFacultyName,
  targetProgramId,
  targetProgramName,
  onSelect,
  disabled = false,
}: FacultySearchPopoverProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FacultySearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchFaculty = useCallback(async (searchQuery: string) => {
    setLoading(true);
    const result = await searchFacultyPoolAction(searchQuery, 0, 20);
    if (result.success) {
      setResults(result.data.items);
      setTotal(result.data.total);
    }
    setLoading(false);
  }, []);

  const debouncedSearch = useDebounce(fetchFaculty, 300);

  const handleOpen = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
    if (results.length === 0 && !loading) {
      fetchFaculty("");
    }
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  const handleSelect = (faculty: FacultySearchResult) => {
    onSelect(faculty);
    setOpen(false);
    setQuery("");
  };

  const isCrossProgram = (faculty: FacultySearchResult) => {
    if (!targetProgramId || !targetProgramName) return false;
    return !faculty.affiliations.includes(targetProgramName);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        id={id}
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={[
          "flex h-9 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors",
          "border-input hover:bg-accent/50 bg-transparent",
          open ? "ring-ring ring-2 ring-offset-1" : "",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        ].join(" ")}
      >
        {selectedFacultyId ? (
          <span className="flex items-center gap-2 truncate">
            <User className="text-muted-foreground h-4 w-4 shrink-0" />
            <span className="truncate font-medium">{selectedFacultyName || "Unknown Faculty"}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">Search faculty...</span>
        )}
        <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0" />
      </button>

      {/* Inline dropdown */}
      {open && (
        <div className="bg-popover absolute top-[calc(100%+4px)] right-0 left-0 z-50 rounded-lg border shadow-md">
          <div className="p-2">
            <Input
              ref={inputRef}
              placeholder="Search by name or email..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <div className="max-h-[260px] overflow-y-auto px-1 pb-1">
            {loading && (
              <div className="space-y-1 p-1">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            )}

            {!loading && results.length === 0 && (
              <div className="text-muted-foreground py-6 text-center text-sm">
                {query.trim() ? `No faculty found matching "${query}"` : "No faculty available."}
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-0.5">
                {results.map((faculty) => {
                  const isSelected = selectedFacultyId === faculty.id;
                  const isDifferentProgram = isCrossProgram(faculty);

                  return (
                    <button
                      key={faculty.id}
                      type="button"
                      onClick={() => handleSelect(faculty)}
                      className={[
                        "hover:bg-accent flex w-full items-start gap-2 rounded-md p-2 text-left transition-colors",
                        isSelected ? "bg-accent" : "",
                      ].join(" ")}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {faculty.firstName} {faculty.lastName}
                          </span>
                          {isSelected && <Check className="text-primary h-3.5 w-3.5 shrink-0" />}
                        </div>
                        <div className="text-muted-foreground truncate text-xs">
                          {faculty.email}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {faculty.primaryAffiliationCode && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                              {faculty.primaryAffiliationCode}
                            </Badge>
                          )}
                          {isDifferentProgram && (
                            <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Different Program
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!loading && total > results.length && (
              <div className="text-muted-foreground border-t px-2 py-1.5 text-center text-xs">
                +{total - results.length} more — type to narrow results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
