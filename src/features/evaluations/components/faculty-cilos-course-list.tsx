"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, ClipboardList, Eye, MoreVertical, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TermInstancePicker } from "@/features/academic-calendar/components/term-instance-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/components/ui/use-media-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ToolsViewSelector,
  type ToolsViewMode,
} from "@/features/instruments/components/tools-view-selector";

import type { FacultyCourseWithCiloCount } from "@/features/evaluations/services/list-faculty-courses-with-cilos";
import type { TermInstanceItem } from "@/features/academic-calendar/types";

// ---------------------------------------------------------------------------
// Types for the CILO modal
// ---------------------------------------------------------------------------

type CiloItem = {
  id: string;
  description: string;
  isNew?: boolean;
};

type ViewEditCilosModalProps = {
  course: FacultyCourseWithCiloCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadCilosAction: (courseId: string) => Promise<{
    success: boolean;
    cilos?: Array<{ id: string; description: string }>;
    error?: string;
  }>;
  saveCilosAction: (
    courseId: string,
    cilos: Array<{ id?: string; description: string }>
  ) => Promise<{ success: boolean; error?: string }>;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type FacultyCilosCourseListProps = {
  courses: FacultyCourseWithCiloCount[];
  termInstances: TermInstanceItem[];
  selectedTermId?: string;
  initialTypeFilter?: string;
  initialSearch?: string;
  initialView?: ToolsViewMode;
  loadCilosAction: ViewEditCilosModalProps["loadCilosAction"];
  saveCilosAction: ViewEditCilosModalProps["saveCilosAction"];
};

// ---------------------------------------------------------------------------
// View/Edit CILOs Modal
// ---------------------------------------------------------------------------

function ViewEditCilosModal({
  course,
  open,
  onOpenChange,
  loadCilosAction,
  saveCilosAction,
}: ViewEditCilosModalProps) {
  const [cilos, setCilos] = useState<CiloItem[]>([]);
  const [newCiloText, setNewCiloText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Set after a successful save until the reload reconciles local entries
  // with persisted IDs; while set, a second save would resubmit entries
  // without IDs and duplicate them.
  const [needsReconcile, setNeedsReconcile] = useState(false);

  // Load CILOs when modal opens
  const handleLoad = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await loadCilosAction(course.id);
      if (result.success && result.cilos) {
        setCilos(
          result.cilos.map((c) => ({
            id: c.id,
            description: c.description,
          }))
        );
        setLoaded(true);
        setNeedsReconcile(false);
      } else {
        setError(result.error ?? "Failed to load CILOs.");
      }
    } catch {
      setError("Failed to load CILOs.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && !loaded && !isLoading) {
      queueMicrotask(() => {
        void handleLoad();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset when closing
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCilos([]);
      setLoaded(false);
      setNeedsReconcile(false);
      setError(null);
      setSuccessMessage(null);
      setNewCiloText("");
    }
    onOpenChange(nextOpen);
  };

  const handleAddCilo = () => {
    if (!newCiloText.trim()) return;
    setCilos((prev) => [
      ...prev,
      {
        id: `new-${crypto.randomUUID()}`,
        description: newCiloText.trim(),
        isNew: true,
      },
    ]);
    setNewCiloText("");
  };

  const handleRemoveCilo = (id: string) => {
    setCilos((prev) => {
      return prev.filter((c) => c.id !== id);
    });
  };

  const handleUpdateCilo = (id: string, description: string) => {
    setCilos((prev) => prev.map((c) => (c.id === id ? { ...c, description } : c)));
  };

  const handleSave = async () => {
    // An empty payload would archive every active CILO, so saving is only
    // meaningful once the initial load has populated the list. Entries also
    // stay isNew until the post-save reload assigns persisted IDs, so a
    // second save before that reconciliation would duplicate them.
    if (isLoading || !loaded || needsReconcile) return;
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const payload = cilos.map((c) => ({
        id: c.isNew ? undefined : c.id,
        description: c.description,
      }));
      const result = await saveCilosAction(course.id, payload);
      if (result.success) {
        setSuccessMessage("CILOs saved successfully.");
        // Entries stay isNew until the reload below assigns persisted IDs;
        // fence Save until that reconciliation lands.
        setNeedsReconcile(true);
        // Reload to get fresh IDs
        await handleLoad();
      } else {
        setError(result.error ?? "Failed to save CILOs.");
      }
    } catch {
      setError("Failed to save CILOs.");
    } finally {
      setIsSaving(false);
    }
  };

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const body = (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert variant="success" role="status">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      {needsReconcile && !isLoading && (
        <Alert variant="warning">
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              Your changes were saved, but the list could not be refreshed. Saving again before
              refreshing would create duplicates.
            </span>
            <Button variant="outline" size="sm" onClick={() => void handleLoad()}>
              Retry refresh
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center text-sm">Loading CILOs...</div>
      ) : !loaded ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="text-muted-foreground text-sm">
            CILOs could not be loaded. Retry to enable editing — nothing you type before a
            successful load can be saved.
          </p>
          <Button variant="outline" onClick={() => void handleLoad()}>
            Retry loading CILOs
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Existing CILOs */}
          {cilos.length === 0 ? (
            <div className="border-border text-muted-foreground rounded-lg border border-dashed py-8 text-center text-sm">
              No CILOs defined for this course yet.
            </div>
          ) : (
            <div className="space-y-2">
              {cilos.map((cilo, index) => (
                <div
                  key={cilo.id}
                  className="border-border bg-surface flex items-start gap-3 rounded-lg border p-3"
                >
                  <span className="bg-primary/10 text-link mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <Textarea
                    value={cilo.description}
                    aria-label={`CILO ${index + 1} description`}
                    onChange={(e) => handleUpdateCilo(cilo.id, e.target.value)}
                    className="min-h-12 min-w-0 flex-1 text-sm"
                    disabled={needsReconcile}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove CILO ${index + 1}`}
                    className="text-destructive hover:bg-destructive/10 min-h-11 min-w-11 shrink-0"
                    onClick={() => handleRemoveCilo(cilo.id)}
                    disabled={needsReconcile}
                  >
                    <span aria-hidden="true">Remove</span>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add new CILO */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor={`new-cilo-${course.id}`}
                className="text-label-md mb-1 block font-medium"
              >
                New CILO description
              </label>
              <Textarea
                id={`new-cilo-${course.id}`}
                placeholder="Type a new CILO description..."
                value={newCiloText}
                onChange={(e) => setNewCiloText(e.target.value)}
                className="max-h-56 min-w-0"
                disabled={needsReconcile}
              />
            </div>
            <Button
              variant="outline"
              onClick={handleAddCilo}
              className="shrink-0"
              disabled={needsReconcile}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const footer = (
    <div className="border-border flex justify-end gap-2 border-t pt-4">
      <Button variant="outline" onClick={() => handleOpenChange(false)}>
        Close
      </Button>
      <Button
        onClick={handleSave}
        loading={isSaving}
        disabled={isLoading || !loaded || needsReconcile}
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange} showSwipeHandle>
        <DrawerContent className="flex max-h-[85dvh] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DrawerHeader className="shrink-0 px-0 pt-4 pb-2 text-left">
            <DrawerTitle>
              CILOs — {course.code}: {course.title}
            </DrawerTitle>
            <DrawerDescription className="line-clamp-2">
              View and manage Course-Intended Learning Outcomes for this course.
            </DrawerDescription>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">{body}</div>
          <div className="shrink-0 pt-3">{footer}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            CILOs — {course.code}: {course.title}
          </DialogTitle>
          <DialogDescription>
            View and manage Course-Intended Learning Outcomes for this course.
          </DialogDescription>
        </DialogHeader>
        {body}
        {footer}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Preparation status
// ---------------------------------------------------------------------------
function readinessLabel(course: FacultyCourseWithCiloCount): string {
  if (course.readiness === "ready") return "Ready";
  if (course.readiness === "missing-cilos") return "Missing CILOs";
  return `Incomplete mapping ${course.coveredCiloCount} of ${course.ciloCount}`;
}

function nextActionFor(course: FacultyCourseWithCiloCount, returnTo: string) {
  const encodedReturn = encodeURIComponent(returnTo);
  if (course.ciloCount === 0) {
    return {
      label: "Add CILOs",
      href: `/faculty/cilos/new?course=${course.id}&returnTo=${encodedReturn}`,
    };
  }
  if (course.readiness !== "ready") {
    return {
      label: "Map CILOs",
      href: `/faculty/cilos/${course.id}/alignment?returnTo=${encodedReturn}`,
    };
  }
  return { label: "Prepare questions", href: "/faculty/tools" };
}

function mapHrefFor(course: FacultyCourseWithCiloCount, returnTo: string): string | null {
  if (course.ciloCount === 0) return null;
  return `/faculty/cilos/${course.id}/alignment?returnTo=${encodeURIComponent(returnTo)}`;
}

function CourseKebab({
  course,
  mapHref,
  onView,
}: {
  course: FacultyCourseWithCiloCount;
  mapHref: string | null;
  onView: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${course.code}`} />}
      >
        <MoreVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuItem onClick={onView}>
          <Eye className="size-4" />
          View CILOs
        </DropdownMenuItem>
        {mapHref && (
          <DropdownMenuItem render={<Link href={mapHref} />}>
            <ArrowRightLeft className="size-4" />
            Map CILOs
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/faculty/tools" />}>
          <ClipboardList className="size-4" />
          Prepare questions
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type FacultyCilosUrlUpdate = {
  term?: string | null;
  type?: string;
  q?: string;
  view?: ToolsViewMode;
};

function updateFacultyCilosUrlParams(params: URLSearchParams, next: FacultyCilosUrlUpdate): void {
  const updates: Array<[string, string | null | undefined, string]> = [
    ["term", next.term, ""],
    ["type", next.type, "__all__"],
    ["q", next.q?.trim(), ""],
    ["view", next.view, "card"],
  ];

  for (const [key, value, defaultValue] of updates) {
    if (value === undefined) continue;
    if (!value || value === defaultValue) params.delete(key);
    else params.set(key, value);
  }
  params.delete("page");
}

function filterFacultyCourses(
  courses: FacultyCourseWithCiloCount[],
  typeFilter: string,
  searchTerm: string
): FacultyCourseWithCiloCount[] {
  let result = courses;

  if (typeFilter === "program_specific") {
    result = result.filter(
      (course) => course.courseScope === "PROGRAM_SPECIFIC" && !course.majorId
    );
  } else if (typeFilter === "general_education") {
    result = result.filter((course) => course.courseScope === "GENERAL_EDUCATION");
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (normalizedSearch) {
    result = result.filter(
      (course) =>
        course.code.toLowerCase().includes(normalizedSearch) ||
        course.title.toLowerCase().includes(normalizedSearch)
    );
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type FacultyCilosCourseResultsProps = {
  courses: FacultyCourseWithCiloCount[];
  totalCourseCount: number;
  filteredCourseCount: number;
  view: ToolsViewMode;
  returnTo: string;
  isFiltered: boolean;
  onClearFilters: () => void;
  onViewCourse: (course: FacultyCourseWithCiloCount) => void;
};

function EmptyCourseState({
  totalCourseCount,
  returnTo,
  isFiltered,
  onClearFilters,
}: Pick<
  FacultyCilosCourseResultsProps,
  "totalCourseCount" | "returnTo" | "isFiltered" | "onClearFilters"
>) {
  return (
    <div className="border-border rounded-xl border border-dashed p-8 text-center">
      <h2 className="text-title-md">
        {totalCourseCount === 0 ? "No assigned courses yet" : "No courses found"}
      </h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
        {totalCourseCount === 0
          ? "CILOs belong to a course. Ask the department office to assign you a course for the current term."
          : "Try a different search, or clear the course type and search filters."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {isFiltered && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
        <Button
          render={<Link href={`/faculty/cilos/new?returnTo=${encodeURIComponent(returnTo)}`} />}
        >
          Add New CILO
        </Button>
      </div>
    </div>
  );
}

function CourseCardGrid({
  courses,
  returnTo,
  onViewCourse,
}: Pick<FacultyCilosCourseResultsProps, "courses" | "returnTo" | "onViewCourse">) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const next = nextActionFor(course, returnTo);
        const mapHref = mapHrefFor(course, returnTo);
        return (
          <li key={course.id}>
            <Card className="flex h-full flex-col">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{course.courseScopeLabel}</Badge>
                  <Badge variant={course.readiness === "ready" ? "default" : "outline"}>
                    {readinessLabel(course)}
                  </Badge>
                </div>
                <CardTitle className="mt-3 leading-snug">
                  {course.code} — {course.title}
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {[course.programCode, course.majorName].filter(Boolean).join(" · ") ||
                    "General Education"}
                  {" · "}
                  {course.ciloCount} {course.ciloCount === 1 ? "CILO" : "CILOs"}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm">
                  {course.ciloCount === 0
                    ? "Start by adding the first outcome for this course."
                    : course.readiness === "ready"
                      ? "Outcomes and alignment are complete. Continue to questions."
                      : "Some outcomes still need alignment before publication."}
                </p>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewCourse(course)}
                  aria-label={`View CILOs for ${course.code}`}
                >
                  View CILOs
                </Button>
                {mapHref ? (
                  <Button
                    size="sm"
                    variant={course.readiness === "ready" ? "outline" : "default"}
                    render={<Link href={mapHref} />}
                    aria-label={`Map CILOs for ${course.code}`}
                  >
                    Map CILOs
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    render={<Link href={next.href} />}
                    aria-label={`${next.label} for ${course.code}`}
                  >
                    {next.label}
                  </Button>
                )}
                {course.readiness === "ready" && (
                  <Button
                    size="sm"
                    render={<Link href="/faculty/tools" />}
                    aria-label={`Prepare questions for ${course.code}`}
                  >
                    Prepare questions
                  </Button>
                )}
              </CardFooter>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function CourseListViews({
  courses,
  returnTo,
  onViewCourse,
}: Pick<FacultyCilosCourseResultsProps, "courses" | "returnTo" | "onViewCourse">) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">CILOs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => {
              const next = nextActionFor(course, returnTo);
              const mapHref = mapHrefFor(course, returnTo);
              return (
                <TableRow key={course.id}>
                  <TableCell>
                    <p className="font-bold">{course.code}</p>
                    <p className="text-muted-foreground text-sm">{course.title}</p>
                    <p className="mt-1">
                      <Badge variant="outline">{course.courseScopeLabel}</Badge>
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={course.readiness === "ready" ? "default" : "outline"}>
                      {readinessLabel(course)}
                    </Badge>
                    {course.majorName && (
                      <p className="text-muted-foreground mt-1 text-xs">{course.majorName}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{course.ciloCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        render={<Link href={next.href} />}
                        aria-label={`${next.label} for ${course.code}`}
                      >
                        {next.label}
                      </Button>
                      <CourseKebab
                        course={course}
                        mapHref={mapHref}
                        onView={() => onViewCourse(course)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {courses.map((course) => {
          const next = nextActionFor(course, returnTo);
          const mapHref = mapHrefFor(course, returnTo);
          return (
            <li
              key={course.id}
              className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{course.courseScopeLabel}</Badge>
                <Badge variant={course.readiness === "ready" ? "default" : "outline"}>
                  {readinessLabel(course)}
                </Badge>
              </div>
              <div>
                <p className="font-bold">{course.code}</p>
                <p className="text-muted-foreground text-sm">{course.title}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {course.ciloCount} {course.ciloCount === 1 ? "CILO" : "CILOs"}
                  {course.majorName ? ` · ${course.majorName}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => onViewCourse(course)}
                  aria-label={`View CILOs for ${course.code}`}
                >
                  View
                </Button>
                {mapHref ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    variant={course.readiness === "ready" ? "outline" : "default"}
                    render={<Link href={mapHref} />}
                    aria-label={`Map CILOs for ${course.code}`}
                  >
                    Map CILOs
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1"
                    render={<Link href={next.href} />}
                    aria-label={`${next.label} for ${course.code}`}
                  >
                    {next.label}
                  </Button>
                )}
              </div>
              {course.readiness === "ready" && (
                <Button
                  size="sm"
                  className="w-full"
                  render={<Link href="/faculty/tools" />}
                  aria-label={`Prepare questions for ${course.code}`}
                >
                  Prepare questions
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function FacultyCilosCourseResults({
  courses,
  totalCourseCount,
  view,
  returnTo,
  isFiltered,
  onClearFilters,
  onViewCourse,
}: FacultyCilosCourseResultsProps) {
  if (courses.length === 0) {
    return (
      <EmptyCourseState
        totalCourseCount={totalCourseCount}
        returnTo={returnTo}
        isFiltered={isFiltered}
        onClearFilters={onClearFilters}
      />
    );
  }
  return view === "card" ? (
    <CourseCardGrid courses={courses} returnTo={returnTo} onViewCourse={onViewCourse} />
  ) : (
    <CourseListViews courses={courses} returnTo={returnTo} onViewCourse={onViewCourse} />
  );
}
export function FacultyCilosCourseList({
  courses,
  termInstances,
  selectedTermId,
  initialTypeFilter = "__all__",
  initialSearch = "",
  initialView = "card",
  loadCilosAction,
  saveCilosAction,
}: FacultyCilosCourseListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [view, setView] = useState<ToolsViewMode>(initialView);
  const [currentPage, setCurrentPage] = useState(1);
  const [modalCourse, setModalCourse] = useState<FacultyCourseWithCiloCount | null>(null);

  const updateUrl = (next: FacultyCilosUrlUpdate) => {
    const params = new URLSearchParams(searchParams.toString());
    updateFacultyCilosUrlParams(params, next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };
  const handleTermChange = (value: string) => {
    updateUrl({ term: value || null });
    setCurrentPage(1);
  };
  const filteredCourses = useMemo(
    () => filterFacultyCourses(courses, typeFilter, searchTerm),
    [courses, typeFilter, searchTerm]
  );
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedCourses = filteredCourses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const handleTypeChange = (value: string | null) => {
    const next = value ?? "__all__";
    setTypeFilter(next);
    setCurrentPage(1);
    updateUrl({ type: next });
  };
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    updateUrl({ q: value });
  };
  const handleViewChange = (next: ToolsViewMode) => {
    setView(next);
    updateUrl({ view: next });
  };
  const handleClearFilters = () => {
    setTypeFilter("__all__");
    setSearchTerm("");
    setCurrentPage(1);
    updateUrl({ type: "__all__", q: "" });
  };
  const returnTo = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
  const isFiltered = typeFilter !== "__all__" || searchTerm.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-heading-lg">Manage CILOs</h1>
          <p className="text-body-md text-muted-foreground">
            Choose a course to continue its evaluation preparation. Outcomes, alignment, and
            questions stay connected.
          </p>
        </div>
        <Button
          render={<Link href={`/faculty/cilos/new?returnTo=${encodeURIComponent(returnTo)}`} />}
          className="shrink-0"
        >
          <Plus className="mr-2 size-4" />
          Add New CILO
        </Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full min-w-0 sm:w-auto sm:min-w-72 sm:shrink-0">
          <TermInstancePicker
            termInstances={termInstances}
            value={selectedTermId ?? ""}
            onChange={handleTermChange}
            placeholder="Select period"
            label="Academic period"
          />
        </div>
        <div className="w-full sm:w-48 sm:shrink-0">
          <label htmlFor="cilo-type-filter" className="text-label-md mb-2 block font-medium">
            Course type
          </label>
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger id="cilo-type-filter" aria-label="Course type" className="w-full">
              <SelectValue>
                {typeFilter === "__all__"
                  ? "All Course Types"
                  : typeFilter === "program_specific"
                    ? "Program-Specific"
                    : "General Education"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
              <SelectItem value="__all__">All Course Types</SelectItem>
              <SelectItem value="program_specific">Program-Specific</SelectItem>
              <SelectItem value="general_education">General Education</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full sm:ml-auto sm:max-w-xs">
          <label htmlFor="cilo-search" className="sr-only">
            Search by code or title
          </label>
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="cilo-search"
            placeholder="Search by code or title..."
            aria-label="Search by code or title"
            value={searchTerm}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex w-full justify-end sm:w-auto">
          <ToolsViewSelector label="Courses" value={view} onValueChange={handleViewChange} />
        </div>
      </div>
      <p className="text-muted-foreground text-sm" role="status">
        {filteredCourses.length === 0
          ? "No courses match the current filters."
          : `${filteredCourses.filter((course) => course.readiness === "ready").length} of ${filteredCourses.length} courses ready`}
      </p>
      <FacultyCilosCourseResults
        courses={paginatedCourses}
        totalCourseCount={courses.length}
        filteredCourseCount={filteredCourses.length}
        view={view}
        returnTo={returnTo}
        isFiltered={isFiltered}
        onClearFilters={handleClearFilters}
        onViewCourse={setModalCourse}
      />
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-xs">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredCourses.length)} of {filteredCourses.length}
          </span>
          <Pagination
            currentPage={safePage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {modalCourse && (
        <ViewEditCilosModal
          course={modalCourse}
          open
          onOpenChange={(open) => {
            if (!open) setModalCourse(null);
          }}
          loadCilosAction={loadCilosAction}
          saveCilosAction={saveCilosAction}
        />
      )}
    </div>
  );
}
