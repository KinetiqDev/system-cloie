"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, BookOpen, Plus } from "lucide-react";
import {
  cloneCurriculumVersionAction,
  getCurriculumVersionDetailAction,
  listProgramCourseOptionsAction,
  listProgramCurriculaSummaryAction,
  publishCurriculumVersionAction,
  retireCurriculumVersionAction,
} from "@/lib/actions/curriculum-actions";
import { showToast } from "@/components/ui/toast";
import { CurriculumCourseTable } from "./curriculum-course-table";
import { CurriculumVersionForm } from "./curriculum-version-form";
import type {
  CurriculumCourseOption,
  CurriculumPageProgram,
  CurriculumVersionDetail,
  CurriculumVersionSummaryItem,
  SchoolYearOption,
} from "@/features/curriculum/types";

type VersionStatus = CurriculumVersionSummaryItem["status"];
type ConfirmAction = { type: "publish" | "retire" | "clone"; version: CurriculumVersionSummaryItem };

const STATUS_TABS: VersionStatus[] = ["DRAFT", "PUBLISHED", "RETIRED"];

const STATUS_BADGE_VARIANT: Record<VersionStatus, "warning" | "success" | "secondary"> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  RETIRED: "secondary",
};

interface CurriculumVersionListProps {
  programs: CurriculumPageProgram[];
  schoolYears: SchoolYearOption[];
  defaultProgramId?: string;
}

/**
 * Client shell for curriculum management. Owns program selection (Secretary
 * sees all programs; Program Head receives one), the DRAFT/PUBLISHED/RETIRED
 * tabs, per-version lifecycle actions, the create dialog, and the selected
 * version's course table. Curricula and course options load on demand for the
 * selected program rather than preloading the global catalog.
 */
export function CurriculumVersionList({
  programs,
  schoolYears,
  defaultProgramId,
}: CurriculumVersionListProps) {
  const router = useRouter();
  const [selectedProgramId, setSelectedProgramId] = useState<string>(
    defaultProgramId ?? programs[0]?.id ?? ""
  );
  const [curricula, setCurricula] = useState<CurriculumVersionSummaryItem[]>([]);
  const [curriculaLoading, setCurriculaLoading] = useState(
    Boolean(defaultProgramId ?? programs[0]?.id)
  );
  const [activeTab, setActiveTab] = useState<VersionStatus>("DRAFT");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<CurriculumVersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [courseOptions, setCourseOptions] = useState<CurriculumCourseOption[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const detailRequestRef = useRef(0);
  const curriculaRequestRef = useRef(0);
  const courseOptionsRequestRef = useRef(0);
  const selectedProgramIdRef = useRef(
    defaultProgramId ?? programs[0]?.id ?? ""
  );
  const selectedVersionIdRef = useRef<string | null>(null);

  const tabCurricula = curricula.filter((c) => c.status === activeTab);
  const showProgramSelector = programs.length > 1;

  const loadDetail = useCallback(async (versionId: string) => {
    const requestId = ++detailRequestRef.current;
    setDetailLoading(true);
    const result = await getCurriculumVersionDetailAction(versionId);
    if (requestId !== detailRequestRef.current) return;
    if (versionId !== selectedVersionIdRef.current) return;
    setDetailLoading(false);
    if (result.success) {
      setVersionDetail(result.data);
    } else {
      showToast(result.error, "error");
      setVersionDetail(null);
    }
  }, []);

  const loadCurricula = useCallback(async (programId: string) => {
    const requestId = ++curriculaRequestRef.current;
    const result = await listProgramCurriculaSummaryAction(programId);
    if (requestId !== curriculaRequestRef.current) return;
    if (programId !== selectedProgramIdRef.current) return;
    setCurriculaLoading(false);
    if (result.success) {
      setCurricula(result.data);
    } else {
      showToast(result.error, "error");
      setCurricula([]);
    }
  }, []);

  const loadCourseOptions = useCallback(async (programId: string) => {
    const requestId = ++courseOptionsRequestRef.current;
    const result = await listProgramCourseOptionsAction(programId);
    if (requestId !== courseOptionsRequestRef.current) return;
    if (programId !== selectedProgramIdRef.current) return;
    if (result.success) {
      setCourseOptions(result.data);
    } else {
      showToast(result.error, "error");
    }
  }, []);

  useEffect(() => {
    if (!selectedProgramId) return;
    void Promise.resolve().then(() => loadCurricula(selectedProgramId));
  }, [loadCurricula, selectedProgramId]);

  function refreshRoutes() {
    router.refresh();
  }

  function refreshCurricula() {
    const programId = selectedProgramIdRef.current;
    if (programId) void loadCurricula(programId);
  }

  function handleVersionSelect(versionId: string) {
    setSelectedVersionId(versionId);
    selectedVersionIdRef.current = versionId;
    setVersionDetail(null);
    void loadDetail(versionId);
    const programId = selectedProgramIdRef.current;
    if (programId && activeTab === "DRAFT") void loadCourseOptions(programId);
  }

  function runConfirm() {
    if (!confirmAction) return;
    const { type, version } = confirmAction;
    setActionError(null);
    startTransition(async () => {
      const action =
        type === "publish"
          ? publishCurriculumVersionAction
          : type === "retire"
            ? retireCurriculumVersionAction
            : cloneCurriculumVersionAction;

      const result = await action(version.id);
      if (result.success) {
        setConfirmAction(null);
        const message =
          type === "publish"
            ? `${version.code} published`
            : type === "retire"
              ? `${version.code} retired`
              : `Clone of ${version.code} created as a draft`;
        showToast(message, "success");
        refreshRoutes();
        refreshCurricula();
        if (selectedVersionIdRef.current) void loadDetail(selectedVersionIdRef.current);
      } else {
        setActionError(result.error);
      }
    });
  }

  function handleProgramChange(value: string | null) {
    if (!value) return;
    selectedProgramIdRef.current = value;
    setSelectedProgramId(value);
    setCurriculaLoading(true);
    setSelectedVersionId(null);
    selectedVersionIdRef.current = null;
    setVersionDetail(null);
    setCourseOptions([]);
    curriculaRequestRef.current++;
    courseOptionsRequestRef.current++;
    detailRequestRef.current++;
    setActiveTab("DRAFT");
  }

  return (
    <div className="container mx-auto flex flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Curricula</h1>
          <p className="text-muted-foreground mt-1">
            Manage curriculum versions and their course placements
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Curriculum Version
        </Button>
      </div>

      {showProgramSelector && (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Program:</span>
          <Select value={selectedProgramId} onValueChange={handleProgramChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue>
                {programs.find((p) => p.id === selectedProgramId)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.code} — {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {curriculaLoading ? (
        <p className="text-muted-foreground py-10 text-center text-sm">Loading curricula…</p>
      ) : curricula.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <BookOpen />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No curricula yet</EmptyTitle>
            <EmptyDescription>
              Create a curriculum draft to start organizing courses for this
              program.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create Curriculum Version
          </Button>
        </Empty>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as VersionStatus);
            setSelectedVersionId(null);
            selectedVersionIdRef.current = null;
            setVersionDetail(null);
            setDetailLoading(false);
            detailRequestRef.current++;
          }}
        >
          <TabsList>
            {STATUS_TABS.map((status) => (
              <TabsTrigger key={status} value={status}>
                {status}
                <Badge variant="secondary">
                  {curricula.filter((c) => c.status === status).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {STATUS_TABS.map((status) => (
            <TabsContent key={status} value={status} className="mt-4">
              {tabCurricula.length === 0 ? (
                <Empty>
                  <EmptyTitle>No {status.toLowerCase()} curricula</EmptyTitle>
                  <EmptyDescription>
                    {status === "DRAFT"
                      ? "Create a draft or clone a published curriculum."
                      : `No ${status.toLowerCase()} curricula for this program yet.`}
                  </EmptyDescription>
                </Empty>
              ) : (
                <div className="flex flex-col gap-3">
                      {tabCurricula.map((version) => (
                        <VersionRow
                          key={version.id}
                          version={version}
                          selected={version.id === selectedVersionId}
                          onSelect={() => handleVersionSelect(version.id)}
                          onPublish={() => {
                            setActionError(null);
                            setConfirmAction({ type: "publish", version });
                          }}
                          onRetire={() => {
                            setActionError(null);
                            setConfirmAction({ type: "retire", version });
                          }}
                          onClone={() => {
                            setActionError(null);
                            setConfirmAction({ type: "clone", version });
                          }}
                        />
                      ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {selectedVersionId && (
        <div className="flex flex-col gap-2">
          <CurriculumCourseTable
            version={versionDetail}
            courses={courseOptions}
            onChanged={() => {
              refreshRoutes();
              refreshCurricula();
              if (selectedVersionIdRef.current) void loadDetail(selectedVersionIdRef.current);
            }}
          />
          {detailLoading && !versionDetail && (
            <p className="text-muted-foreground text-sm">Loading courses…</p>
          )}
        </div>
      )}

      <CurriculumVersionForm
        key={createOpen ? "open" : "closed"}
        open={createOpen}
        onOpenChange={setCreateOpen}
        programs={programs}
        schoolYears={schoolYears}
        defaultProgramId={selectedProgramId}
        onSuccess={() => {
          refreshRoutes();
          refreshCurricula();
        }}
      />

      <VersionConfirmDialog
        confirmAction={confirmAction}
        actionError={actionError}
        isPending={isPending}
        onOpenChange={(open) => {
          if (!open && !isPending) {
            setConfirmAction(null);
            setActionError(null);
          }
        }}
        onConfirm={runConfirm}
      />
    </div>
  );
}

type ConfirmLabels = {
  title: string;
  description: string;
  button: string;
};

const CONFIRM_LABELS: Record<ConfirmAction["type"], (code: string) => ConfirmLabels> = {
  publish: (code) => ({
    title: `Publish ${code}?`,
    description: "Publishing makes this curriculum immutable and selectable for new course assignments.",
    button: "Publish",
  }),
  retire: (code) => ({
    title: `Retire ${code}?`,
    description: "Retiring keeps this curriculum queryable but removes it from new course assignments.",
    button: "Retire",
  }),
  clone: (code) => ({
    title: `Clone ${code}?`,
    description: "Cloning copies this curriculum into a new draft with the same course placements.",
    button: "Clone",
  }),
};

function VersionConfirmDialog({
  confirmAction,
  actionError,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  confirmAction: ConfirmAction | null;
  actionError: string | null;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  const label = confirmAction
    ? CONFIRM_LABELS[confirmAction.type](confirmAction.version.code)
    : null;

  return (
    <AlertDialog open={!!confirmAction} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        {label && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{label.title}</AlertDialogTitle>
              <AlertDialogDescription>{label.description}</AlertDialogDescription>
            </AlertDialogHeader>
            {actionError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button
                onClick={onConfirm}
                loading={isPending}
                variant={confirmAction?.type === "publish" ? "default" : "outline"}
              >
                {isPending ? "Working…" : label.button}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

function VersionRow({
  version,
  selected,
  onSelect,
  onPublish,
  onRetire,
  onClone,
}: {
  version: CurriculumVersionSummaryItem;
  selected: boolean;
  onSelect: () => void;
  onPublish: () => void;
  onRetire: () => void;
  onClone: () => void;
}) {
  const isDraft = version.status === "DRAFT";
  const isPublished = version.status === "PUBLISHED";

  return (
    <Card className={selected ? "ring-ring ring-2" : ""}>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none rounded-md"
        >
          <span className="min-w-0">
            <span className="block text-base font-semibold">{version.code}</span>
            {version.name && (
              <span className="text-muted-foreground mt-0.5 block truncate">{version.name}</span>
            )}
          </span>
          <Badge variant={STATUS_BADGE_VARIANT[version.status]}>{version.status}</Badge>
          <Badge variant="outline">
            {version.courseCount} course{version.courseCount === 1 ? "" : "s"}
          </Badge>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {isDraft && (
            <Button size="sm" onClick={onPublish}>
              Publish
            </Button>
          )}
          {isPublished && (
            <Button size="sm" variant="outline" onClick={onRetire}>
              Retire
            </Button>
          )}
          {!isDraft && (
            <Button size="sm" variant="outline" onClick={onClone}>
              Clone
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
