"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  GraduationCap,
  Layers,
  MoreVertical,
  Plus,
  Search,
  Users,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pagination } from "@/components/ui/pagination";
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
import {
  deleteProgramAction,
  preflightProgramDeletionAction,
  toggleProgramActiveAction,
} from "@/lib/actions/admin-program-actions";
import { showToast } from "@/components/ui/toast";
import { ManageMajorsDialog } from "./manage-majors-dialog";
import type { ProgramDeletionPreflight } from "../services/manage-programs";

import type {
  SecretaryProgramSummaryItem,
  SecretaryProgramsKPI,
} from "@/features/academic-structure/services/list-secretary-programs-summary";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 15;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SecretaryProgramsListProps = {
  programs: SecretaryProgramSummaryItem[];
  kpi: SecretaryProgramsKPI;
  basePath?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SecretaryProgramsList({
  programs,
  kpi,
  basePath = "/secretary/programs",
}: SecretaryProgramsListProps) {
  // ---- Filter state -------------------------------------------------------
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [lifecycleProgram, setLifecycleProgram] = useState<SecretaryProgramSummaryItem | null>(
    null
  );
  const [preflight, setPreflight] = useState<ProgramDeletionPreflight | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmDeactivation, setConfirmDeactivation] = useState(false);
  const preflightRequest = useRef(0);

  // ---- Manage Majors dialog state -----------------------------------------
  const [majorsDialogProgram, setMajorsDialogProgram] =
    useState<SecretaryProgramSummaryItem | null>(null);

  // ---- Filtered programs ---------------------------------------------------
  const filteredPrograms = useMemo(() => {
    let result = programs;

    if (statusFilter === "active") {
      result = result.filter((p) => p.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((p) => !p.isActive);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) => p.code.toLowerCase().includes(term) || p.name.toLowerCase().includes(term)
      );
    }

    return result;
  }, [programs, statusFilter, searchTerm]);

  // ---- Pagination ----------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(filteredPrograms.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPrograms = filteredPrograms.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleStatusChange = (value: string | null) => {
    setStatusFilter(value ?? "__all__");
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // ---- Action handlers -----------------------------------------------------
  const handleToggleActive = (programId: string, currentActive: boolean) => {
    startTransition(async () => {
      const result = await toggleProgramActiveAction(programId, !currentActive);
      if (!result.success) showToast(result.error, "error");
      else showToast(currentActive ? "Program deactivated." : "Program activated.");
    });
  };

  const handleDeactivate = (program: SecretaryProgramSummaryItem) => {
    startTransition(async () => {
      const result = await toggleProgramActiveAction(program.id, false, true);
      if (!result.success) {
        setLifecycleError(result.error);
        return;
      }
      closeLifecycleDialog();
      showToast("Program deactivated.");
    });
  };

  const openDeletionPreflight = (program: SecretaryProgramSummaryItem) => {
    const request = ++preflightRequest.current;
    setLifecycleProgram(program);
    setPreflight(null);
    setLifecycleError(null);
    setConfirmationCode("");
    startTransition(async () => {
      const result = await preflightProgramDeletionAction(program.id);
      if (request !== preflightRequest.current) return;
      if (!result.success) setLifecycleError(result.error);
      else if ("dependencies" in result.data) setPreflight(result.data);
    });
  };

  const closeLifecycleDialog = () => {
    preflightRequest.current++;
    setLifecycleProgram(null);
    setPreflight(null);
    setLifecycleError(null);
    setConfirmationCode("");
    setConfirmDeactivation(false);
  };

  const handleDelete = () => {
    if (!lifecycleProgram || !preflight || confirmationCode.trim() !== preflight.code) return;
    startTransition(async () => {
      const result = await deleteProgramAction({
        id: preflight.id,
        confirmationCode,
        revision: preflight.revision,
      });
      if (!result.success) {
        setLifecycleError(result.error);
        if ("data" in result && result.data) setPreflight(result.data);
        return;
      }
      closeLifecycleDialog();
      router.refresh();
      showToast(`Program ${preflight.code} deleted.`);
    });
  };

  // ---- Shared row actions (used by both card + table) ---------------------
  function renderRowActions(program: SecretaryProgramSummaryItem) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="text-text-muted hover:bg-surface-muted hover:text-text-primary inline-flex size-9 items-center justify-center rounded-md transition-colors">
          <MoreVertical className="size-4" />
          <span className="sr-only">Actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`${basePath}/${program.id}/edit`} />}>
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setMajorsDialogProgram(program)}>
            Manage Majors
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => {
              if (program.isActive) {
                setLifecycleProgram(program);
                setConfirmDeactivation(true);
                setLifecycleError(null);
              } else {
                handleToggleActive(program.id, false);
              }
            }}
          >
            {program.isActive ? "Deactivate" : "Activate"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={isPending}
            onClick={() => openDeletionPreflight(program)}
          >
            Delete program
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // ---- Render --------------------------------------------------------------
  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-heading-lg">Academic Programs</h1>
          <p className="text-body-sm text-text-secondary hidden sm:block">
            Manage academic programs, their majors, and program metadata across the college.
          </p>
        </div>
        {/* CTA — always visible, top-right */}
        <Button render={<Link href={`${basePath}/new`} />} className="shrink-0">
          <Plus className="size-4 sm:hidden" data-icon="inline-start" />
          <span className="hidden sm:inline">Create Program</span>
          <span className="sr-only sm:hidden">Create Program</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KPICard
          label="Total Programs"
          value={kpi.totalPrograms}
          icon={<BookOpen className="text-muted-foreground size-4 sm:size-5" />}
        />
        <KPICard
          label="Active"
          value={kpi.activePrograms}
          icon={<Layers className="text-muted-foreground size-4 sm:size-5" />}
        />
        <KPICard
          label="With Majors"
          value={kpi.programsWithMajors}
          icon={<GraduationCap className="text-muted-foreground size-4 sm:size-5" />}
        />
        <KPICard
          label="Total Majors"
          value={kpi.totalMajors}
          icon={<Users className="text-muted-foreground size-4 sm:size-5" />}
        />
      </div>

      {/* Filter bar — stacks on mobile, inline on sm+ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue>
              {statusFilter === "__all__"
                ? "All Statuses"
                : statusFilter === "active"
                  ? "Active"
                  : "Inactive"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search by code or name..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8"
          />
        </div>
      </div>

      {/* ---- Mobile card list (hidden md+) -------------------------------- */}
      <div className="flex flex-col gap-3 md:hidden">
        {paginatedPrograms.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">No programs found.</p>
        ) : (
          paginatedPrograms.map((program) => (
            <div
              key={program.id}
              className="bg-surface border-border flex items-start justify-between gap-3 rounded-xl border p-4 shadow-xs"
            >
              {/* Left: info */}
              <div className="min-w-0 flex-1 space-y-2">
                {/* Code + status */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-label-md text-text-primary font-bold">{program.code}</span>
                  <Badge variant={program.isActive ? "success" : "secondary"}>
                    {program.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {/* Name */}
                <p className="text-body-sm text-text-secondary leading-snug">{program.name}</p>
                {/* Majors */}
                {program.majorNames.length > 0 && (
                  <p className="text-caption text-text-muted truncate">
                    {program.majorNames.join(", ")}
                  </p>
                )}
                {/* Stats row */}
                <div className="text-text-muted flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
                  <span>
                    <span className="text-text-secondary font-medium">{program.courseCount}</span>{" "}
                    courses
                  </span>
                  <span>
                    <span className="text-text-secondary font-medium">{program.studentCount}</span>{" "}
                    students
                  </span>
                  <span>
                    <span className="text-text-secondary font-medium">{program.facultyCount}</span>{" "}
                    faculty
                  </span>
                  <span>
                    <span className="text-text-secondary font-medium">{program.goCount}</span> GOs
                  </span>
                </div>
              </div>
              {/* Right: actions */}
              {renderRowActions(program)}
            </div>
          ))
        )}
      </div>

      {/* ---- Desktop table (hidden below md) ------------------------------ */}
      <div className="hidden md:block">
        <div className="overflow-x-auto rounded-lg border">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Program Name</TableHead>
                <TableHead>Majors</TableHead>
                <TableHead className="text-right">Courses</TableHead>
                <TableHead className="text-right">GOs</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Faculty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPrograms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground h-24 text-center">
                    No programs found.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPrograms.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-bold">{program.code}</TableCell>
                    <TableCell>{program.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {program.majorNames.length > 0 ? program.majorNames.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right">{program.courseCount}</TableCell>
                    <TableCell className="text-right">{program.goCount}</TableCell>
                    <TableCell className="text-right">{program.studentCount}</TableCell>
                    <TableCell className="text-right">{program.facultyCount}</TableCell>
                    <TableCell>
                      <Badge variant={program.isActive ? "success" : "secondary"}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderRowActions(program)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          className="justify-center"
        />
      )}

      {/* Result count */}
      <p className="text-muted-foreground text-center text-xs">
        Showing {(safePage - 1) * PAGE_SIZE + 1}–
        {Math.min(safePage * PAGE_SIZE, filteredPrograms.length)} of {filteredPrograms.length}{" "}
        program
        {filteredPrograms.length !== 1 ? "s" : ""}
      </p>

      {/* Manage Majors Dialog */}
      {majorsDialogProgram && (
        <ManageMajorsDialog
          program={{
            id: majorsDialogProgram.id,
            code: majorsDialogProgram.code,
            name: majorsDialogProgram.name,
          }}
          majors={majorsDialogProgram.majors}
          open={!!majorsDialogProgram}
          onOpenChange={(open) => {
            if (!open) setMajorsDialogProgram(null);
          }}
        />
      )}

      <AlertDialog
        open={!!lifecycleProgram}
        onOpenChange={(open) => !open && closeLifecycleDialog()}
      >
        <AlertDialogContent className="max-h-[min(90dvh,42rem)] overflow-y-auto sm:max-w-lg">
          {confirmDeactivation && lifecycleProgram ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Deactivate {lifecycleProgram.code}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Records and history remain. New active-Program selections exclude this Program,
                  and Program Heads lose program-scoped tools while it is inactive.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {lifecycleError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{lifecycleError}</AlertDescription>
                </Alert>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    handleDeactivate(lifecycleProgram);
                  }}
                >
                  Deactivate
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {preflight ? `Delete ${preflight.code}?` : "Check deletion eligibility"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {preflight
                    ? `${preflight.name} (${preflight.code}) can only be permanently deleted while inactive and empty.`
                    : "Checking current Program status and linked records."}
                </AlertDialogDescription>
              </AlertDialogHeader>

              {!preflight && !lifecycleError && (
                <p role="status" aria-live="polite" className="text-muted-foreground text-sm">
                  Checking current blockers…
                </p>
              )}
              {lifecycleError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{lifecycleError}</AlertDescription>
                </Alert>
              )}
              {preflight && (
                <div className="flex flex-col gap-4 text-sm">
                  {(preflight.blockers.inactive || preflight.blockers.linkedRecords) && (
                    <div className="border-destructive/30 bg-destructive/5 rounded-md border p-3">
                      <p className="font-medium">Deletion blocked</p>
                      {preflight.blockers.inactive && <p>Program must be inactive first.</p>}
                      {preflight.blockers.linkedRecords && (
                        <p>
                          Linked records remain. Review counts below before choosing a safe action.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-4">
                    {Object.entries(preflight.dependencies).map(([group, values]) => {
                      const entries = Object.entries(values).filter(([, count]) => count > 0);
                      if (entries.length === 0) return null;
                      const title =
                        group === "academicSetup"
                          ? "Academic setup"
                          : group === "peopleAndHistory"
                            ? "People and history"
                            : group === "externalLinks"
                              ? "External links"
                              : group[0].toUpperCase() + group.slice(1);
                      return (
                        <section key={group} aria-label={title}>
                          <h3 className="mb-2 font-medium">{title}</h3>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {entries.map(([label, count]) => (
                              <div
                                key={`${group}-${label}`}
                                className="flex justify-between gap-3 rounded-md border px-3 py-2"
                              >
                                <span>{label.replaceAll(/([A-Z])/g, " $1")}</span>
                                <strong>{count}</strong>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                  {!preflight.blockers.inactive && !preflight.blockers.linkedRecords && (
                    <label
                      className="flex flex-col gap-2 font-medium"
                      htmlFor="program-delete-code"
                    >
                      Type <code>{preflight.code}</code> to confirm permanent deletion.
                      <Input
                        id="program-delete-code"
                        value={confirmationCode}
                        onChange={(event) => setConfirmationCode(event.target.value)}
                        placeholder={preflight.code}
                        autoComplete="off"
                        aria-describedby="program-delete-warning"
                      />
                    </label>
                  )}
                  <p id="program-delete-warning" className="text-muted-foreground">
                    System checks status, revision, and linked records again immediately before
                    deletion.
                  </p>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending && !!preflight}>Cancel</AlertDialogCancel>
                {preflight && (preflight.blockers.inactive || preflight.blockers.linkedRecords) ? (
                  <Button
                    disabled={isPending}
                    onClick={() => openDeletionPreflight(lifecycleProgram!)}
                  >
                    Check again
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    disabled={isPending || !preflight || confirmationCode.trim() !== preflight.code}
                    onClick={handleDelete}
                  >
                    Delete permanently
                  </Button>
                )}
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card sub-component
// ---------------------------------------------------------------------------

function KPICard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <CardDescription className="text-label-sm text-muted-foreground truncate tracking-wider uppercase">
            {label}
          </CardDescription>
          <div className="shrink-0">{icon}</div>
        </div>
        <CardTitle className="font-heading text-heading-xl text-foreground tabular-nums">
          {value.toLocaleString()}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
