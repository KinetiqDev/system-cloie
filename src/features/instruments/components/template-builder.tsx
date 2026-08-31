"use client";

import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  CloudAlert,
  GripVertical,
  Plus,
  Save,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toast";
import type {
  FacultyCourseContext,
  FacultyManagedCiloContext,
  FacultyManagedCiloLoadResult,
} from "@/features/evaluations/types";
import type {
  TemplateStructure,
  TemplateSection,
  TemplateQuestion,
  QuestionType,
  LikertDescriptor,
  EvaluationTemplateType,
  TemplateCiloQuestionBinding,
  ProgramPloOption,
  TemplatePloQuestionBinding,
} from "../types";
import { DEFAULT_LIKERT_5_DESCRIPTORS } from "../types";

// ─── Types ───────────────────────────────────────────────────────────────────

type ActionResult<T = void> = { success: true; data?: T } | { success: false; error: string };

const EMPTY_FACULTY_COURSE_CONTEXTS: FacultyCourseContext[] = [];

type FacultyBuilderConfig = {
  courseContexts: FacultyCourseContext[];
  initialBindings: TemplateCiloQuestionBinding[];
  loadManagedCilosAction: (
    payload: FacultyManagedCiloContext
  ) => Promise<FacultyManagedCiloLoadResult>;
  validatePublishReadinessAction: (templateId: string) => Promise<ActionResult<{ id: string }>>;
};

export interface TemplateBuilderProps {
  initialData?: {
    id?: string;
    name: string;
    description: string;
    template_type: EvaluationTemplateType;
    is_active: boolean;
    is_faculty_accessible: boolean;
    bound_course_id?: string | null;
    bound_program_id?: string | null;
    bound_major_id?: string | null;
    structure: TemplateStructure;
  };
  facultyConfig?: FacultyBuilderConfig;
  onSave: (data: FormData) => Promise<ActionResult<{ id: string }>>;
  programLabel: string;
  saveSuccessConfig?: {
    toastMessage: string;
  };
  toolsHref?: string;
  onSaveResult?: (
    result: { success: true; id: string } | { success: false; error: string }
  ) => void;
  isInstitutionalBaseline?: boolean;
  onSaveAsCopy?: (
    baselineId: string,
    customName: string,
    structure: TemplateStructure,
    ploBindings: TemplatePloQuestionBinding[]
  ) => Promise<ActionResult<{ id: string }>>;
  onPublish?: (templateId: string) => void;
  /**
   * Server-prepared active PLOs (canonical order) offered to Program-wide
   * templates. Absent in faculty/COURSE_BOUND mode.
   */
  ploOptions?: ProgramPloOption[];
  /** Existing Program-wide question–PLO bindings loaded for this template. */
  initialPloBindings?: TemplatePloQuestionBinding[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createSection(
  order: number,
  key = crypto.randomUUID(),
  questionKey?: string
): TemplateSection {
  return {
    key,
    title: "",
    description: undefined,
    order,
    questions: [createQuestion(0, questionKey)],
  };
}

function createQuestion(order: number, key = crypto.randomUUID()): TemplateQuestion {
  return {
    key,
    prompt: "",
    type: "likert",
    order,
    required: true,
    likertDescriptors: [...DEFAULT_LIKERT_5_DESCRIPTORS],
  };
}

function hasDuplicateSuggestedResponse(existingResponses: string[] | undefined, response: string) {
  const normalizedResponse = response.trim();

  if (!normalizedResponse) {
    return false;
  }

  return (existingResponses ?? []).some(
    (existingResponse) => existingResponse.trim() === normalizedResponse
  );
}

function normalizeTemplateStructure(structure: TemplateStructure): TemplateStructure {
  return structure.map((section, sectionIndex) => ({
    ...section,
    order: sectionIndex,
    questions: section.questions.map((question, questionIndex) => ({
      ...question,
      order: questionIndex,
    })),
  }));
}

/**
 * Opaque sortable identifier. Never parsed: persisted section/question keys are
 * arbitrary nonempty strings that may contain separators, so the identifier is
 * derived structurally with JSON.stringify and keys are only ever resolved
 * through the current-list map.
 */
function toSortableId(
  kind: "section" | "question",
  sectionKey: string,
  questionKey?: string
): string {
  return JSON.stringify([kind, sectionKey, questionKey]);
}

type SortableEntity =
  | { kind: "section"; sectionKey: string }
  | { kind: "question"; sectionKey: string; questionKey: string };

function buildSortableIndex(structure: TemplateStructure): Map<UniqueIdentifier, SortableEntity> {
  const index = new Map<UniqueIdentifier, SortableEntity>();

  for (const section of structure) {
    index.set(toSortableId("section", section.key), { kind: "section", sectionKey: section.key });

    for (const question of section.questions) {
      index.set(toSortableId("question", section.key, question.key), {
        kind: "question",
        sectionKey: section.key,
        questionKey: question.key,
      });
    }
  }

  return index;
}

/**
 * A section drag only collides with sections, and a question drag only with
 * questions from the same originating section (which also keeps keyboard
 * movement inside the current list). Active container comes from the sortable
 * metadata attached by useSortable; droppables from other lists are filtered
 * out before closestCenter runs.
 */
export const filteredContainerCollisionDetection: CollisionDetection = (args) => {
  const activeContainerId = args.active.data.current?.sortable?.containerId;

  const filteredContainers =
    activeContainerId === undefined
      ? []
      : args.droppableContainers.filter(
          (container) => container.data.current?.sortable?.containerId === activeContainerId
        );

  return closestCenter({ ...args, droppableContainers: filteredContainers });
};

/**
 * Keyboard movement stays inside the active item's own sortable container.
 * `sortableKeyboardCoordinates` measures against every registered droppable,
 * so the nearest candidate below a section is usually one of that section's
 * own descendant questions, whose coordinate then resolves back to the
 * originating container and Arrow keys never move the section. Restricting
 * candidates to the active container before the geometry pass keeps sections
 * moving among sections and questions within their own section.
 */
export const sameContainerKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { context } = args;
  const active = context.active;

  if (!active) {
    return sortableKeyboardCoordinates(event, args);
  }

  const activeDroppable = context.droppableContainers.get(active.id);
  const containerId = activeDroppable?.data.current?.sortable?.containerId;

  if (containerId === undefined) {
    return sortableKeyboardCoordinates(event, args);
  }

  const sameContainer = context.droppableContainers
    .getEnabled()
    .filter(
      (container) =>
        !container.disabled && container.data.current?.sortable?.containerId === containerId
    );

  const activeIndex = sameContainer.findIndex((container) => container.id === active.id);
  if (activeIndex < 0) {
    return sortableKeyboardCoordinates(event, args);
  }

  const direction =
    event.code === "ArrowDown" || event.code === "ArrowRight"
      ? 1
      : event.code === "ArrowUp" || event.code === "ArrowLeft"
        ? -1
        : 0;
  const nextIndex = activeIndex + direction;

  if (direction === 0 || nextIndex < 0 || nextIndex >= sameContainer.length) {
    return;
  }

  if (nextIndex < 0 || nextIndex >= sameContainer.length) {
    return;
  }

  const target = sameContainer[nextIndex];
  const rect = context.droppableRects.get(target.id);

  const activeRect = context.droppableRects.get(active.id);

  if (!rect || !activeRect) {
    return;
  }
  const offset = nextIndex > activeIndex ? activeRect.height - rect.height : 0;

  return { x: rect.left, y: rect.top - offset };
};
/**
 * Faculty CILO binding map keys. The legacy `${sectionKey}:${itemKey}` encoding
 * broke keys that contain separators, so bindings are keyed by the JSON-encoded
 * pair and decoded structurally (never split).
 */
function encodeBindingKey(sectionKey: string, itemKey: string): string {
  return JSON.stringify([sectionKey, itemKey]);
}

/**
 * Collects Program-wide question–PLO bindings from the live structure:
 * deleting a question or switching it to open-ended automatically drops its
 * bindings. Shared by the save-draft and save-as-copy payloads.
 */
function collectPloBindings(
  structure: TemplateStructure,
  ploQuestionBindings: Record<string, string[]>
): TemplatePloQuestionBinding[] {
  return structure.flatMap((section) =>
    section.questions.flatMap((question) => {
      if (question.type !== "likert") return [];
      const ploIds = ploQuestionBindings[encodeBindingKey(section.key, question.key)] ?? [];
      return ploIds
        .filter(Boolean)
        .map((ploId) => ({ itemKey: question.key, ploId, sectionKey: section.key }));
    })
  );
}

function decodeBindingKey(encodedKey: string): { sectionKey: string; itemKey: string } {
  const [sectionKey, itemKey] = JSON.parse(encodedKey) as [string, string];

  return { sectionKey, itemKey };
}

function formatCourseContextLabel(
  context: Pick<FacultyCourseContext, "courseCode" | "courseTitle" | "scopeLabel">
) {
  return `${context.courseCode} - ${context.courseTitle} (${context.scopeLabel})`;
}

function formatCiloOptionLabel(cilo: { description: string }, index: number) {
  return `CILO ${index + 1}: ${cilo.description}`;
}

function formatTemplateTypeLabel(type: EvaluationTemplateType): string {
  return type === "COURSE_BOUND" ? "Course-bound" : "Program-wide";
}

const HISTORY_GUARD_KEY = "cloie-instrument-template-dirty-entry";

function currentHistoryEntryIndex(): number | undefined {
  return window.navigation?.currentEntry?.index;
}

function isHistoryGuardEntry(marker: string): boolean {
  const state: unknown = window.history.state;
  return (
    typeof state === "object" && state !== null && Reflect.get(state, HISTORY_GUARD_KEY) === marker
  );
}

type SaveState = "unchanged" | "unsaved" | "saving" | "saved" | "error";

function serializeBuilderDraft(draft: {
  boundCourseId: string;
  boundMajorId: string;
  boundProgramId: string;
  ciloQuestionBindings: Record<string, string>;
  description: string;
  isActive: boolean;
  isFacultyAccessible: boolean;
  name: string;
  ploQuestionBindings: Record<string, string[]>;
  sections: TemplateStructure;
  templateType: EvaluationTemplateType;
}) {
  return JSON.stringify({
    ...draft,
    sections: normalizeTemplateStructure(draft.sections),
  });
}

function formatQuestionTypeLabel(type: QuestionType): string {
  return type === "likert" ? "Likert" : "Guided Open-Ended";
}

const TEMPLATE_HISTORY_GUARD_KEY = "cloie-template-builder-dirty-entry";

function currentHistoryEntryIndex(): number | undefined {
  return window.navigation?.currentEntry?.index;
}

function isTemplateHistoryGuardEntry(marker: string): boolean {
  const state: unknown = window.history.state;
  return (
    typeof state === "object" &&
    state !== null &&
    Reflect.get(state, TEMPLATE_HISTORY_GUARD_KEY) === marker
  );
}

function useDirtyTemplateNavigationGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const confirmDiscard = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0) return;

      const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(
        Boolean
      );
      if (hasModifier || link.target || link.origin !== window.location.origin) return;
      if (window.confirm("Discard unsaved template changes?")) return;

      event.preventDefault();
      event.stopPropagation();
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    const editorHistoryIndex = currentHistoryEntryIndex();
    const editorHistoryState = window.history.state;
    const historyMarker = `${Date.now()}-${Math.random()}`;
    window.history.replaceState(
      { ...editorHistoryState, [TEMPLATE_HISTORY_GUARD_KEY]: historyMarker },
      "",
      window.location.href
    );

    let revertingHistoryNavigation = false;
    let fallbackSearchDirection: 1 | -1 = 1;
    let fallbackSearchTimer: ReturnType<typeof setTimeout> | null = null;
    const clearFallbackSearchTimer = () => {
      if (fallbackSearchTimer === null) return;
      clearTimeout(fallbackSearchTimer);
      fallbackSearchTimer = null;
    };
    const searchForMarkedEditor = () => {
      clearFallbackSearchTimer();
      window.history.go(fallbackSearchDirection);
      fallbackSearchTimer = setTimeout(() => {
        fallbackSearchTimer = null;
        if (fallbackSearchDirection === 1) {
          fallbackSearchDirection = -1;
          searchForMarkedEditor();
          return;
        }
        revertingHistoryNavigation = false;
      }, 0);
    };
    const confirmHistoryNavigation = () => {
      if (revertingHistoryNavigation) {
        clearFallbackSearchTimer();
        if (isTemplateHistoryGuardEntry(historyMarker)) {
          revertingHistoryNavigation = false;
          return;
        }
        searchForMarkedEditor();
        return;
      }
      if (window.confirm("Discard unsaved template changes?")) return;

      const currentHistoryIndex = currentHistoryEntryIndex();
      if (editorHistoryIndex !== undefined && currentHistoryIndex !== undefined) {
        const stepsBackToEditor = editorHistoryIndex - currentHistoryIndex;
        if (stepsBackToEditor === 0) return;
        revertingHistoryNavigation = true;
        window.history.go(stepsBackToEditor);
        return;
      }

      // Without Navigation API indices, search forward first. A canceled Back
      // traversal reaches the marked editor directly. A canceled Forward
      // traversal reaches the forward boundary, then searches backward until
      // the marked editor entry is restored.
      revertingHistoryNavigation = true;
      fallbackSearchDirection = 1;
      searchForMarkedEditor();
    };

    window.addEventListener("popstate", confirmHistoryNavigation);
    document.addEventListener("click", confirmDiscard, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      document.removeEventListener("click", confirmDiscard, true);
      window.removeEventListener("popstate", confirmHistoryNavigation);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      clearFallbackSearchTimer();
      if (isTemplateHistoryGuardEntry(historyMarker)) {
        window.history.replaceState(editorHistoryState, "", window.location.href);
      }
    };
  }, [isDirty]);
}

function draftSignature(value: unknown): string {
  return JSON.stringify(value);
}

// ─── Component ───────────────────────────────────────────────────────────────

// fallow-ignore-next-line complexity
export function TemplateBuilder({
  facultyConfig,
  initialData,
  onSave,
  programLabel,
  saveSuccessConfig,
  toolsHref = "/program-head/tools",
  onSaveResult,
  isInstitutionalBaseline = false,
  onSaveAsCopy,
  onPublish,
  ploOptions,
  initialPloBindings,
}: TemplateBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const templateId = initialData?.id;

  const initialSectionKey = useId();
  const initialQuestionKey = useId();
  // Template metadata state
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [templateType, setTemplateType] = useState<EvaluationTemplateType>(
    initialData?.template_type ?? "PROGRAM_WIDE"
  );
  const [isActive, setIsActive] = useState(initialData?.is_active ?? true);
  const [isFacultyAccessible, setIsFacultyAccessible] = useState(
    initialData?.is_faculty_accessible ?? false
  );

  // Structure state
  const [sections, setSections] = useState<TemplateStructure>(() =>
    normalizeTemplateStructure(
      initialData?.structure?.length
        ? initialData.structure
        : [createSection(0, initialSectionKey, initialQuestionKey)]
    )
  );
  const [boundProgramId, setBoundProgramId] = useState(initialData?.bound_program_id ?? "");
  const [boundMajorId, setBoundMajorId] = useState(initialData?.bound_major_id ?? "");
  const [boundCourseId, setBoundCourseId] = useState(initialData?.bound_course_id ?? "");
  const [ciloQuestionBindings, setCiloQuestionBindings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (facultyConfig?.initialBindings ?? []).map((binding) => [
        encodeBindingKey(binding.sectionKey, binding.itemKey),
        binding.ciloId,
      ])
    )
  );
  const [ploQuestionBindings, setPloQuestionBindings] = useState<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const binding of initialPloBindings ?? []) {
      const key = encodeBindingKey(binding.sectionKey, binding.itemKey);
      if (!map[key]) map[key] = [];
      map[key].push(binding.ploId);
    }
    return map;
  });
  const [initialDraftSignature] = useState(() =>
    draftSignature({
      boundCourseId,
      boundMajorId,
      boundProgramId,
      ciloQuestionBindings,
      description,
      isActive,
      isFacultyAccessible,
      name,
      ploQuestionBindings,
      sections,
      templateType,
    })
  );
  const currentDraftSignature = draftSignature({
    boundCourseId,
    boundMajorId,
    boundProgramId,
    ciloQuestionBindings,
    description,
    isActive,
    isFacultyAccessible,
    name,
    ploQuestionBindings,
    sections,
    templateType,
  });
  useDirtyTemplateNavigationGuard(currentDraftSignature !== initialDraftSignature);

  /** Archived PLOs bound to questions: rendered as removable archived chips. */
  const archivedPloLookup = useMemo(() => {
    const lookup = new Map<string, ProgramPloOption>();
    const activeIds = new Set((ploOptions ?? []).map((plo) => plo.id));
    for (const binding of initialPloBindings ?? []) {
      if (activeIds.has(binding.ploId)) continue;
      lookup.set(binding.ploId, {
        id: binding.ploId,
        code: binding.ploCodeSnapshot ?? "Archived PLO",
        description: binding.ploDescriptionSnapshot ?? "",
      });
    }
    return lookup;
  }, [initialPloBindings, ploOptions]);
  const [loadedCilos, setLoadedCilos] = useState<Array<{ description: string; id: string }>>([]);
  const [isLoadingCilos, setIsLoadingCilos] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Copy name dialog state for institutional baselines
  const [copyNameDialogOpen, setCopyNameDialogOpen] = useState(false);
  const [copyName, setCopyName] = useState(initialData?.name ?? "");
  const [isCopyPending, setIsCopyPending] = useState(false);

  const facultyMode = Boolean(facultyConfig);
  const effectiveTemplateType: EvaluationTemplateType = facultyMode ? "COURSE_BOUND" : templateType;
  /** PLO question bindings are a Program-owned template concern only.
   *  Program heads editing an institutional baseline may bind PLOs before
   *  saving a program-owned copy (`onSaveAsCopy` marks that flow). */
  const programWideMode =
    !facultyMode &&
    effectiveTemplateType === "PROGRAM_WIDE" &&
    (!isInstitutionalBaseline || Boolean(onSaveAsCopy));
  const currentDraftSnapshot = useMemo(
    () =>
      serializeBuilderDraft({
        boundCourseId,
        boundMajorId,
        boundProgramId,
        ciloQuestionBindings,
        description,
        isActive,
        isFacultyAccessible,
        name,
        ploQuestionBindings,
        sections,
        templateType: effectiveTemplateType,
      }),
    [
      boundCourseId,
      boundMajorId,
      boundProgramId,
      ciloQuestionBindings,
      description,
      effectiveTemplateType,
      isActive,
      isFacultyAccessible,
      name,
      ploQuestionBindings,
      sections,
    ]
  );
  const [savedDraftSnapshot, setSavedDraftSnapshot] = useState(currentDraftSnapshot);
  const [saveState, setSaveState] = useState<SaveState>("unchanged");
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [pendingNavigationHref, setPendingNavigationHref] = useState<string | null>(null);
  const isDirty = currentDraftSnapshot !== savedDraftSnapshot;

  useEffect(() => {
    if (!isDirty) return;

    const confirmInternalNavigation = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!link || event.defaultPrevented || event.button !== 0) return;
      const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(
        Boolean
      );
      if (hasModifier || link.target || link.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingNavigationHref(`${link.pathname}${link.search}${link.hash}`);
      setDiscardDialogOpen(true);
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    const editorHistoryIndex = currentHistoryEntryIndex();
    const editorHistoryState = window.history.state;
    const marker = `${Date.now()}-${Math.random()}`;
    window.history.replaceState(
      { ...editorHistoryState, [HISTORY_GUARD_KEY]: marker },
      "",
      window.location.href
    );

    let revertingHistoryNavigation = false;
    const confirmHistoryNavigation = () => {
      if (revertingHistoryNavigation) {
        if (!isHistoryGuardEntry(marker)) {
          window.history.go(1);
          return;
        }
        revertingHistoryNavigation = false;
        return;
      }
      window.history.go(1);

      const currentHistoryIndex = currentHistoryEntryIndex();
      const stepsBackToEditor =
        editorHistoryIndex === undefined || currentHistoryIndex === undefined
          ? 1
          : editorHistoryIndex - currentHistoryIndex;
      if (stepsBackToEditor === 0) return;

      revertingHistoryNavigation = true;
      window.history.go(stepsBackToEditor);
    };

    window.addEventListener("popstate", confirmHistoryNavigation);
    document.addEventListener("click", confirmInternalNavigation, true);
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("popstate", confirmHistoryNavigation);
      document.removeEventListener("click", confirmInternalNavigation, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (isHistoryGuardEntry(marker)) {
        window.history.replaceState(editorHistoryState, "", window.location.href);
      }
    };
  }, [isDirty]);

  const requestBackNavigation = useCallback(() => {
    if (isDirty) {
      setPendingNavigationHref(toolsHref);
      setDiscardDialogOpen(true);
      return;
    }
    router.push(toolsHref);
  }, [isDirty, router, toolsHref]);

  const discardAndLeave = useCallback(() => {
    const destination = pendingNavigationHref ?? toolsHref;
    setDiscardDialogOpen(false);
    setPendingNavigationHref(null);
    router.push(destination);
  }, [pendingNavigationHref, router, toolsHref]);
  const programPloOptions = ploOptions ?? [];
  const facultyCourseContexts = facultyConfig?.courseContexts ?? EMPTY_FACULTY_COURSE_CONTEXTS;
  const loadManagedCilosAction = facultyConfig?.loadManagedCilosAction;
  const selectedCourseContext =
    facultyCourseContexts.find((context) => context.courseId === boundCourseId) ?? null;
  const selectedCiloLabels = useMemo(() => {
    const labels = new Map<string, string>();

    loadedCilos.forEach((cilo, index) => {
      labels.set(cilo.id, formatCiloOptionLabel(cilo, index));
    });

    for (const binding of facultyConfig?.initialBindings ?? []) {
      if (!binding.ciloId || labels.has(binding.ciloId) || !binding.ciloDescriptionSnapshot) {
        continue;
      }

      labels.set(binding.ciloId, binding.ciloDescriptionSnapshot);
    }

    return labels;
  }, [facultyConfig?.initialBindings, loadedCilos]);
  const selectedCiloIds = useMemo(
    () => new Set(Object.values(ciloQuestionBindings).filter(Boolean)),
    [ciloQuestionBindings]
  );

  useEffect(() => {
    if (!facultyMode) {
      return;
    }

    // boundProgramId is "" for General Education courses (no owning program),
    // so only boundCourseId distinguishes "no course selected".
    if (!boundCourseId) {
      queueMicrotask(() => {
        setLoadedCilos((current) => (current.length === 0 ? current : []));
        setIsLoadingCilos(false);
      });
      return;
    }

    const context = facultyCourseContexts.find(
      (candidate) =>
        candidate.courseId === boundCourseId &&
        candidate.programId === boundProgramId &&
        candidate.majorId === (boundMajorId || null)
    );

    if (!context) {
      queueMicrotask(() => {
        setLoadedCilos((current) => (current.length === 0 ? current : []));
        setIsLoadingCilos(false);
      });
      return;
    }

    if (!loadManagedCilosAction) {
      return;
    }

    let isStale = false;
    queueMicrotask(() => setIsLoadingCilos(true));

    loadManagedCilosAction({
      courseId: context.courseId,
      majorId: context.majorId,
      programId: context.programId,
    })
      .then((result) => {
        if (isStale) {
          return;
        }

        if (!result.success) {
          setLoadedCilos([]);
          showToast(result.error, "error");
          return;
        }

        setLoadedCilos(result.data.items);
      })
      .catch(() => {
        if (!isStale) {
          setLoadedCilos([]);
          showToast("Unable to load saved CILOs.", "error");
        }
      })
      .finally(() => {
        if (!isStale) {
          setIsLoadingCilos(false);
        }
      });

    return () => {
      isStale = true;
    };
  }, [
    boundCourseId,
    boundMajorId,
    boundProgramId,
    facultyMode,
    facultyCourseContexts,
    loadManagedCilosAction,
  ]);

  // ─── Section Operations ──────────────────────────────────────────────

  const addSection = useCallback((insertIndex?: number) => {
    setSections((prev) => {
      const idx = insertIndex ?? prev.length;
      const newSection = createSection(idx);
      const updated = [...prev.slice(0, idx), newSection, ...prev.slice(idx)];
      return normalizeTemplateStructure(updated);
    });
  }, []);

  const removeSection = useCallback((key: string) => {
    setSections((prev) => {
      const removed = prev.find((s) => s.key === key);
      if (removed) {
        setPloQuestionBindings((current) => {
          const next = { ...current };
          for (const question of removed.questions) {
            delete next[encodeBindingKey(key, question.key)];
          }
          return next;
        });
      }
      return normalizeTemplateStructure(prev.filter((s) => s.key !== key));
    });
  }, []);

  const updateSection = useCallback(
    (key: string, updates: Partial<Pick<TemplateSection, "title" | "description">>) => {
      setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...updates } : s)));
    },
    []
  );

  // ─── Question Operations ─────────────────────────────────────────────

  const addQuestion = useCallback((sectionKey: string) => {
    setSections((prev) =>
      normalizeTemplateStructure(
        prev.map((s) => {
          if (s.key !== sectionKey) return s;
          const newQuestion = createQuestion(s.questions.length);
          return { ...s, questions: [...s.questions, newQuestion] };
        })
      )
    );
  }, []);

  const removeQuestion = useCallback((sectionKey: string, questionKey: string) => {
    setPloQuestionBindings((current) => {
      const next = { ...current };
      delete next[encodeBindingKey(sectionKey, questionKey)];
      return next;
    });
    setSections((prev) =>
      normalizeTemplateStructure(
        prev.map((s) => {
          if (s.key !== sectionKey) return s;
          return { ...s, questions: s.questions.filter((q) => q.key !== questionKey) };
        })
      )
    );
  }, []);

  const updateQuestion = useCallback(
    (sectionKey: string, questionKey: string, updates: Partial<TemplateQuestion>) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.key !== sectionKey) return s;
          return {
            ...s,
            questions: s.questions.map((q) => (q.key === questionKey ? { ...q, ...updates } : q)),
          };
        })
      );
    },
    []
  );

  const changeQuestionType = useCallback(
    (sectionKey: string, questionKey: string, newType: QuestionType) => {
      setPloQuestionBindings((current) => {
        const next = { ...current };
        delete next[encodeBindingKey(sectionKey, questionKey)];
        return next;
      });
      setSections((prev) =>
        prev.map((s) => {
          if (s.key !== sectionKey) return s;
          return {
            ...s,
            questions: s.questions.map((q) => {
              if (q.key !== questionKey) return q;
              if (newType === "likert") {
                return {
                  ...q,
                  type: newType,
                  likertDescriptors: [...DEFAULT_LIKERT_5_DESCRIPTORS],
                  suggestedResponses: undefined,
                };
              }
              return {
                ...q,
                type: newType,
                likertDescriptors: undefined,
                suggestedResponses: [],
              };
            }),
          };
        })
      );
    },
    []
  );

  // ─── Likert Descriptor Operations ────────────────────────────────────

  const updateLikertDescriptor = useCallback(
    (sectionKey: string, questionKey: string, index: number, label: string) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.key !== sectionKey) return s;
          return {
            ...s,
            questions: s.questions.map((q) => {
              if (q.key !== questionKey || !q.likertDescriptors) return q;
              const updated = [...q.likertDescriptors];
              updated[index] = { ...updated[index], label };
              return { ...q, likertDescriptors: updated };
            }),
          };
        })
      );
    },
    []
  );
  // ─── Suggested Response Operations ───────────────────────────────────

  const addSuggestedResponse = useCallback(
    (sectionKey: string, questionKey: string, response: string) => {
      const normalizedResponse = response.trim();

      if (!normalizedResponse) return;

      let hasDuplicate = false;

      setSections((prev) =>
        normalizeTemplateStructure(
          prev.map((s) => {
            if (s.key !== sectionKey) return s;
            return {
              ...s,
              questions: s.questions.map((q) => {
                if (q.key !== questionKey) return q;

                if (hasDuplicateSuggestedResponse(q.suggestedResponses, normalizedResponse)) {
                  hasDuplicate = true;
                  return q;
                }

                return {
                  ...q,
                  suggestedResponses: [...(q.suggestedResponses ?? []), normalizedResponse],
                };
              }),
            };
          })
        )
      );

      if (hasDuplicate) {
        setError("Predefined responses must be unique within a question.");
        return;
      }

      setError(null);
    },
    []
  );

  const removeSuggestedResponse = useCallback(
    (sectionKey: string, questionKey: string, index: number) => {
      setSections((prev) =>
        normalizeTemplateStructure(
          prev.map((s) => {
            if (s.key !== sectionKey) return s;
            return {
              ...s,
              questions: s.questions.map((q) => {
                if (q.key !== questionKey) return q;
                const updated = [...(q.suggestedResponses ?? [])];
                updated.splice(index, 1);
                return { ...q, suggestedResponses: updated };
              }),
            };
          })
        )
      );
    },
    []
  );

  // ─── Drag Reordering ─────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sameContainerKeyboardCoordinates })
  );

  const sortableMap = useMemo(() => buildSortableIndex(sections), [sections]);
  const sectionIds = useMemo(
    () => sections.map((section) => toSortableId("section", section.key)),
    [sections]
  );

  const handleSectionDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const activeEntity = sortableMap.get(active.id);
      const overEntity = sortableMap.get(over.id);

      if (activeEntity?.kind !== "section" || overEntity?.kind !== "section") return;

      setSections((prev) => {
        const fromIndex = prev.findIndex((s) => s.key === activeEntity.sectionKey);
        const toIndex = prev.findIndex((s) => s.key === overEntity.sectionKey);

        if (fromIndex < 0 || toIndex < 0) return prev;

        return normalizeTemplateStructure(arrayMove(prev, fromIndex, toIndex));
      });
    },
    [sortableMap]
  );

  const handleQuestionDragEnd = useCallback(
    (sectionKey: string, event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const activeEntity = sortableMap.get(active.id);
      const overEntity = sortableMap.get(over.id);

      if (activeEntity?.kind !== "question" || overEntity?.kind !== "question") return;
      if (activeEntity.sectionKey !== sectionKey || overEntity.sectionKey !== sectionKey) return;

      setSections((prev) => {
        const section = prev.find((s) => s.key === sectionKey);
        if (!section) return prev;

        const fromIndex = section.questions.findIndex((q) => q.key === activeEntity.questionKey);
        const toIndex = section.questions.findIndex((q) => q.key === overEntity.questionKey);

        if (fromIndex < 0 || toIndex < 0) return prev;

        return normalizeTemplateStructure(
          prev.map((s) =>
            s.key === sectionKey
              ? { ...s, questions: arrayMove(s.questions, fromIndex, toIndex) }
              : s
          )
        );
      });
    },
    [sortableMap]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeEntity = sortableMap.get(event.active.id);

      if (activeEntity?.kind === "section") {
        handleSectionDragEnd(event);
        return;
      }

      if (activeEntity?.kind === "question") {
        handleQuestionDragEnd(activeEntity.sectionKey, event);
      }
    },
    [handleQuestionDragEnd, handleSectionDragEnd, sortableMap]
  );

  // ─── Save Handler ────────────────────────────────────────────────────

  const buildFormData = useCallback(() => {
    const formData = new FormData();

    if (templateId) {
      formData.set("id", templateId);
    }

    formData.set("name", name);
    formData.set("description", description);
    formData.set("template_type", effectiveTemplateType);
    formData.set("is_active", isActive ? "true" : "false");
    formData.set(
      "is_faculty_accessible",
      effectiveTemplateType === "COURSE_BOUND" && isFacultyAccessible ? "true" : "false"
    );
    formData.set("structure", JSON.stringify(normalizeTemplateStructure(sections)));

    if (programWideMode) {
      formData.set(
        "program_question_plo_bindings",
        JSON.stringify(
          collectPloBindings(normalizeTemplateStructure(sections), ploQuestionBindings)
        )
      );
    }

    if (facultyMode) {
      formData.set("bound_course_id", boundCourseId);
      formData.set("bound_major_id", boundMajorId);
      formData.set("bound_program_id", boundProgramId);
      formData.set(
        "cilo_question_bindings",
        JSON.stringify(
          Object.entries(ciloQuestionBindings)
            .filter(([, ciloId]) => ciloId)
            .map(([encodedKey, ciloId]) => {
              const { sectionKey, itemKey } = decodeBindingKey(encodedKey);
              return { ciloId, itemKey, sectionKey };
            })
        )
      );
    }

    return formData;
  }, [
    boundCourseId,
    boundMajorId,
    boundProgramId,
    ciloQuestionBindings,
    description,
    effectiveTemplateType,
    facultyMode,
    isActive,
    isFacultyAccessible,
    name,
    ploQuestionBindings,
    programWideMode,
    sections,
    templateId,
  ]);

  const saveDraft = useCallback(async () => {
    setError(null);
    setSaveState("saving");

    const result = await onSave(buildFormData());

    if (!result.success) {
      setError(result.error);
      setSaveState("error");
      showToast(result.error, "error");
      return { success: false as const, error: result.error };
    }

    setSavedDraftSnapshot(currentDraftSnapshot);
    setSaveState("saved");
    const id = result.data?.id ?? templateId ?? null;
    return { success: true as const, id };
  }, [buildFormData, currentDraftSnapshot, onSave, templateId]);

  const handleSaveAsCopy = useCallback(async () => {
    if (!templateId || !onSaveAsCopy) return;

    setIsCopyPending(true);
    const structure = normalizeTemplateStructure(sections);
    const ploBindings = programWideMode ? collectPloBindings(structure, ploQuestionBindings) : [];
    const result = await onSaveAsCopy(templateId, copyName, structure, ploBindings);
    setIsCopyPending(false);
    setCopyNameDialogOpen(false);

    if (!result.success) {
      showToast(result.error, "error");
      onSaveResult?.({ success: false, error: result.error });
      return;
    }

    showToast("Template saved as program copy successfully.", "success");
    onSaveResult?.({ success: true, id: result.data!.id });
    router.push(toolsHref ?? "/");
  }, [
    templateId,
    onSaveAsCopy,
    copyName,
    sections,
    toolsHref,
    router,
    onSaveResult,
    programWideMode,
    ploQuestionBindings,
  ]);

  const handleSave = useCallback(() => {
    if (isInstitutionalBaseline && templateId && onSaveAsCopy) {
      setCopyName(name);
      setCopyNameDialogOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await saveDraft();
      if (!result.success) {
        onSaveResult?.({ success: false, error: result.error });
        return;
      }

      onSaveResult?.({ success: true, id: result.id! });
      showToast(saveSuccessConfig?.toastMessage ?? "Instrument template saved.", "success");
      if (!templateId && result.id) {
        router.push(`${toolsHref}/${encodeURIComponent(result.id)}/edit`);
      }
    });
  }, [
    isInstitutionalBaseline,
    templateId,
    onSaveAsCopy,
    router,
    toolsHref,
    name,
    saveDraft,
    saveSuccessConfig,
    onSaveResult,
  ]);

  const handleContinueToPublish = useCallback(() => {
    startTransition(async () => {
      const saveResult = await saveDraft();

      if (!saveResult.success || !saveResult.id) return;

      if (facultyConfig) {
        const result = await facultyConfig.validatePublishReadinessAction(saveResult.id);

        if (!result.success) {
          showToast(result.error, "error");
          setError(result.error);
          return;
        }

        router.push(`/faculty/cilo-evaluations/new?templateId=${saveResult.id}`);
        return;
      }

      onPublish?.(saveResult.id);
    });
  }, [facultyConfig, onPublish, router, saveDraft]);

  const visibleSaveState: SaveState = isPending ? "saving" : isDirty ? "unsaved" : saveState;
  const saveStateContent = {
    unchanged: { icon: Check, label: "No pending changes" },
    unsaved: { icon: CloudAlert, label: "Unsaved changes" },
    saving: { icon: Save, label: "Saving..." },
    saved: { icon: Check, label: "Saved" },
    error: { icon: CloudAlert, label: "Save failed" },
  }[visibleSaveState];
  const SaveStateIcon = saveStateContent.icon;
  const canContinueToPublish = (facultyMode || Boolean(onPublish)) && !isInstitutionalBaseline;
  const saveActionLabel =
    isInstitutionalBaseline && onSaveAsCopy
      ? "Create program copy"
      : templateId
        ? facultyMode || onPublish
          ? "Save draft"
          : "Save template"
        : "Create template";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-28 sm:pb-8">
      <div className="border-border bg-background/95 sticky top-0 z-30 -mx-4 border-b px-4 py-3 sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-xl lg:border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={requestBackNavigation}
              className="text-link focus-visible:ring-ring inline-flex min-h-8 items-center gap-2 rounded-md text-sm font-medium hover:underline focus-visible:ring-3 focus-visible:outline-none pointer-coarse:min-h-11"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Tools
            </button>
            <p className="text-muted-foreground mt-1 truncate text-xs font-semibold tracking-wide uppercase">
              {programLabel}
            </p>
            <h1 className="text-heading-lg">
              {initialData?.id ? "Edit Template" : "New Template"}
            </h1>
          </div>

          <div
            role="toolbar"
            aria-label="Template actions"
            className="border-border bg-background fixed inset-x-0 bottom-0 z-40 flex shrink-0 flex-col gap-2 border-t px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:static sm:items-end sm:border-0 sm:bg-transparent sm:p-0 [&_[data-slot=button]]:min-h-11 sm:[&_[data-slot=button]]:min-h-0"
          >
            <p
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
              role="status"
              aria-live="polite"
            >
              <SaveStateIcon className="size-3.5" aria-hidden="true" />
              {saveStateContent.label}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                className={
                  canContinueToPublish ? "w-full sm:w-auto" : "col-span-2 w-full sm:w-auto"
                }
                variant="outline"
                onClick={handleSave}
                loading={isPending || isCopyPending}
              >
                {saveActionLabel}
              </Button>
              {canContinueToPublish && (
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleContinueToPublish}
                  loading={isPending}
                >
                  <span className="sm:hidden">Continue</span>
                  <span className="sr-only sm:not-sr-only"> to publish</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error / Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Template Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
          <CardDescription>
            Define the identity and governance state of this template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g. Industry Partners Evaluation Tool"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-description">
              Template Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="template-description"
              rows={3}
              placeholder="Describe the purpose and scope of this evaluation tool."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-type">Template Type</Label>
            <Select
              value={effectiveTemplateType}
              disabled={facultyMode}
              onValueChange={(value) => {
                if (facultyMode) {
                  return;
                }

                const nextType = value as EvaluationTemplateType;
                setTemplateType(nextType);
                if (nextType !== "COURSE_BOUND") {
                  setIsFacultyAccessible(false);
                }
                if (nextType !== "PROGRAM_WIDE") {
                  setPloQuestionBindings({});
                }
              }}
            >
              <SelectTrigger id="template-type">
                <SelectValue>{formatTemplateTypeLabel(effectiveTemplateType)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COURSE_BOUND">Course-bound</SelectItem>
                {!facultyMode && <SelectItem value="PROGRAM_WIDE">Program-wide</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-3">
              <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="is-active" className="cursor-pointer">
                Active
              </Label>
            </div>
            {!facultyMode && (
              <div className="flex items-center gap-3">
                <Switch
                  id="is-faculty-accessible"
                  checked={isFacultyAccessible}
                  disabled={templateType !== "COURSE_BOUND"}
                  onCheckedChange={setIsFacultyAccessible}
                />
                <Label htmlFor="is-faculty-accessible" className="cursor-pointer">
                  Faculty Access
                </Label>
              </div>
            )}
          </div>
          {!facultyMode && effectiveTemplateType !== "COURSE_BOUND" && (
            <p className="text-muted-foreground text-xs">
              Faculty access is available only for course-bound templates.
            </p>
          )}
          {facultyMode && (
            <div className="border-border space-y-2 rounded-lg border p-4">
              <Label htmlFor="faculty-course-context">Course</Label>
              <Combobox
                items={facultyCourseContexts}
                value={selectedCourseContext}
                onValueChange={(value) => {
                  const next = value as FacultyCourseContext | null;
                  setBoundCourseId(next?.courseId ?? "");
                  setBoundProgramId(next?.programId ?? "");
                  setBoundMajorId(next?.majorId ?? "");
                  setCiloQuestionBindings({});
                }}
                filter={(ctx: FacultyCourseContext, query: string) =>
                  !query ||
                  [
                    ctx.courseCode,
                    ctx.courseTitle,
                    ctx.scopeLabel,
                    ctx.programCode,
                    ctx.programName,
                    ctx.majorName,
                  ]
                    .filter((v): v is string => Boolean(v))
                    .some((v) => v.toLowerCase().includes(query.toLowerCase()))
                }
                itemToStringLabel={formatCourseContextLabel}
                itemToStringValue={(ctx: FacultyCourseContext) => ctx.courseId}
                autoHighlight
              >
                <ComboboxInput
                  id="faculty-course-context"
                  className="w-full"
                  placeholder={
                    facultyCourseContexts.length === 0
                      ? "No courses available"
                      : "Search by code or title..."
                  }
                  disabled={facultyCourseContexts.length === 0}
                />
                <ComboboxContent>
                  <ComboboxEmpty>No courses match your search.</ComboboxEmpty>
                  <ComboboxList>
                    {(ctx) => (
                      <ComboboxItem
                        key={`${ctx.programId}-${ctx.courseId}-${ctx.majorId ?? "shared"}`}
                        value={ctx}
                        className="items-start py-2"
                      >
                        <span className="flex min-w-0 flex-col gap-0.5 py-0.5 text-left">
                          <span className="text-sm leading-snug">
                            {formatCourseContextLabel(ctx)}
                          </span>
                          <span className="text-caption text-muted-foreground">
                            {ctx.programName}
                          </span>
                        </span>
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <p className="text-muted-foreground text-xs">
                {isLoadingCilos
                  ? "Loading saved CILOs..."
                  : loadedCilos.length > 0
                    ? `${loadedCilos.length} saved CILO(s) available for binding.`
                    : "Select a course with saved CILOs before publishing."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Section Button (top) */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => addSection(0)}
          className="text-link hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          <Plus className="size-5" />
          Add Section
        </button>
      </div>

      {/* Section Cards */}
      <DndContext
        id="template-builder-sections"
        sensors={sensors}
        collisionDetection={filteredContainerCollisionDetection}
        onDragEnd={handleDragEnd}
        accessibility={{
          screenReaderInstructions: {
            draggable:
              "To pick up a section or question, press the space bar. While dragging, use the arrow keys to move it: sections reorder among sections, and questions reorder within their current section. Press the space bar to drop the item in its new position, or press escape to cancel.",
          },
          announcements: {
            onDragStart({ active }) {
              const item = sortableMap.get(active.id);

              if (!item) return;

              return item.kind === "section"
                ? "Picked up a section. Use the arrow keys to move it among sections, press space or enter to drop, or press escape to cancel."
                : "Picked up a question. Use the arrow keys to move it within the current section, press space or enter to drop, or press escape to cancel.";
            },
            // fallow-ignore-next-line complexity
            onDragOver({ active, over }) {
              if (!over) return;

              const activeItem = sortableMap.get(active.id);
              const overItem = sortableMap.get(over.id);

              if (!activeItem || !overItem) return;

              if (activeItem.kind === "section" && overItem.kind === "section") {
                const position = sections.findIndex((s) => s.key === overItem.sectionKey) + 1;
                return `Section moved to position ${position} of ${sections.length}.`;
              }

              if (
                activeItem.kind === "question" &&
                overItem.kind === "question" &&
                activeItem.sectionKey === overItem.sectionKey
              ) {
                const section = sections.find((s) => s.key === activeItem.sectionKey);
                const position = section
                  ? section.questions.findIndex((q) => q.key === overItem.questionKey) + 1
                  : 0;
                const sectionPosition =
                  sections.findIndex((s) => s.key === activeItem.sectionKey) + 1;
                return `Question moved to position ${position} within section ${sectionPosition}.`;
              }

              return;
            },
            // fallow-ignore-next-line complexity
            onDragEnd({ active, over }) {
              const activeItem = sortableMap.get(active.id);
              const overItem = over ? sortableMap.get(over.id) : undefined;

              if (activeItem?.kind === "section" && overItem?.kind === "section") {
                const position = sections.findIndex((s) => s.key === overItem.sectionKey) + 1;
                return `Section dropped at position ${position} of ${sections.length}.`;
              }

              if (
                activeItem?.kind === "question" &&
                overItem?.kind === "question" &&
                activeItem.sectionKey === overItem.sectionKey
              ) {
                const section = sections.find((s) => s.key === activeItem.sectionKey);
                const position = section
                  ? section.questions.findIndex((q) => q.key === overItem.questionKey) + 1
                  : 0;
                const sectionPosition =
                  sections.findIndex((s) => s.key === activeItem.sectionKey) + 1;
                return `Question dropped at position ${position} within section ${sectionPosition}.`;
              }

              return "Dropped.";
            },
            onDragCancel() {
              return "Dragging cancelled.";
            },
          },
        }}
      >
        <SortableContext id="sections" items={sectionIds} strategy={verticalListSortingStrategy}>
          {sections.map((section, sectionIndex) => (
            <div key={section.key} className="space-y-4">
              <SectionCard
                section={section}
                sectionIndex={sectionIndex}
                sortableId={toSortableId("section", section.key)}
                questionIds={section.questions.map((question) =>
                  toSortableId("question", section.key, question.key)
                )}
                onUpdateSection={updateSection}
                onRemoveSection={removeSection}
                onAddQuestion={addQuestion}
                onRemoveQuestion={removeQuestion}
                onUpdateQuestion={updateQuestion}
                onChangeQuestionType={changeQuestionType}
                onUpdateLikertDescriptor={updateLikertDescriptor}
                onAddSuggestedResponse={addSuggestedResponse}
                onRemoveSuggestedResponse={removeSuggestedResponse}
                ciloOptions={loadedCilos}
                ciloQuestionBindings={ciloQuestionBindings}
                selectedCiloLabels={selectedCiloLabels}
                facultyMode={facultyMode}
                onCiloBindingChange={(questionKey, ciloId) =>
                  setCiloQuestionBindings((current) => ({
                    ...current,
                    [questionKey]: ciloId,
                  }))
                }
                ploOptions={programPloOptions}
                ploQuestionBindings={ploQuestionBindings}
                programWideMode={programWideMode}
                archivedPloLookup={archivedPloLookup}
                onPloBindingsChange={(questionKey, ploIds) =>
                  setPloQuestionBindings((current) => ({
                    ...current,
                    [questionKey]: ploIds,
                  }))
                }
                selectedCiloIds={selectedCiloIds}
                canRemove={sections.length > 1}
              />
              {sectionIndex < sections.length - 1 && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => addSection(sectionIndex + 1)}
                    className="text-muted-foreground hover:text-primary hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <Plus className="size-4" />
                    Insert Section
                  </button>
                </div>
              )}
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {/* Add Section Button (bottom) */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => addSection()}
          className="text-link hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          <Plus className="size-5" />
          Add Section
        </button>
      </div>

      {/* Copy Name Dialog for Institutional Baselines */}
      <Dialog open={copyNameDialogOpen} onOpenChange={setCopyNameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as Program Copy</DialogTitle>
            <DialogDescription>
              You are editing an institutional baseline. Saving will create a program-owned copy.
              Enter a name for your copy:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="copy-name">Template Name</Label>
            <Input
              id="copy-name"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              placeholder="Enter template name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsCopy} disabled={!copyName.trim()} loading={isCopyPending}>
              Create Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardDialogOpen} onOpenChange={setDiscardDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              Changes made after the last save will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discardAndLeave}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Drag Handle ─────────────────────────────────────────────────────────────

type SortableDragHandleProps = {
  label: string;
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
};

/**
 * 44px handle that carries the sortable keyboard/pointer listeners. The Button,
 * not the glyph, owns the accessible name; the icon is decorative.
 */
function SortableDragHandle({ label, attributes, listeners }: SortableDragHandleProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 cursor-grab touch-none active:cursor-grabbing"
      aria-label={label}
      title={label}
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" />
    </Button>
  );
}

// ─── Section Card Sub-component ──────────────────────────────────────────────

interface SectionCardProps {
  ciloOptions: Array<{ description: string; id: string }>;
  ciloQuestionBindings: Record<string, string>;
  selectedCiloLabels: Map<string, string>;
  ploOptions: ProgramPloOption[];
  ploQuestionBindings: Record<string, string[]>;
  programWideMode: boolean;
  archivedPloLookup: Map<string, ProgramPloOption>;
  section: TemplateSection;
  sectionIndex: number;
  sortableId: string;
  questionIds: string[];
  facultyMode: boolean;
  onUpdateSection: (
    key: string,
    updates: Partial<Pick<TemplateSection, "title" | "description">>
  ) => void;
  onRemoveSection: (key: string) => void;
  onAddQuestion: (sectionKey: string) => void;
  onRemoveQuestion: (sectionKey: string, questionKey: string) => void;
  onUpdateQuestion: (
    sectionKey: string,
    questionKey: string,
    updates: Partial<TemplateQuestion>
  ) => void;
  onChangeQuestionType: (sectionKey: string, questionKey: string, type: QuestionType) => void;
  onUpdateLikertDescriptor: (
    sectionKey: string,
    questionKey: string,
    index: number,
    label: string
  ) => void;
  onAddSuggestedResponse: (sectionKey: string, questionKey: string, response: string) => void;
  onCiloBindingChange: (questionKey: string, ciloId: string) => void;
  onPloBindingsChange: (questionKey: string, ploIds: string[]) => void;
  onRemoveSuggestedResponse: (sectionKey: string, questionKey: string, index: number) => void;
  selectedCiloIds: Set<string>;
  canRemove: boolean;
}

function SectionCard({
  ciloOptions,
  ciloQuestionBindings,
  selectedCiloLabels,
  ploOptions,
  ploQuestionBindings,
  programWideMode,
  archivedPloLookup,
  section,
  sectionIndex,
  sortableId,
  questionIds,
  facultyMode,
  onUpdateSection,
  onRemoveSection,
  onAddQuestion,
  onRemoveQuestion,
  onUpdateQuestion,
  onChangeQuestionType,
  onUpdateLikertDescriptor,
  onAddSuggestedResponse,
  onCiloBindingChange,
  onPloBindingsChange,
  onRemoveSuggestedResponse,
  selectedCiloIds,
  canRemove,
}: SectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "section", sectionKey: section.key },
  });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative overflow-visible ${isDragging ? "opacity-90 shadow-lg" : ""}`}
    >
      {/* Left accent bar */}
      <div className="bg-primary absolute top-8 -left-3 h-12 w-1 rounded-r" />

      <CardContent className="space-y-6 pt-6">
        {/* Section Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
            <SortableDragHandle
              label={`Drag section: ${section.title || `Section ${sectionIndex + 1}`}`}
              attributes={attributes}
              listeners={listeners}
            />
            <div className="min-w-0 flex-1 space-y-3">
              <input
                type="text"
                className="placeholder:text-muted-foreground/50 hover:border-border focus:border-primary w-full border-0 border-b border-transparent bg-transparent py-1 text-lg font-semibold transition-colors focus:outline-none"
                placeholder={`Section ${sectionIndex + 1} title`}
                value={section.title}
                onChange={(e) => onUpdateSection(section.key, { title: e.target.value })}
              />
              <Textarea
                rows={2}
                placeholder="Section description (optional)"
                className="resize-none text-sm"
                value={section.description ?? ""}
                onChange={(e) =>
                  onUpdateSection(section.key, {
                    description: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2">
            {canRemove && (
              <button
                type="button"
                onClick={() => onRemoveSection(section.key)}
                className="text-muted-foreground hover:bg-danger-soft hover:text-danger focus-visible:ring-ring mt-1 rounded-md p-1.5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
                title="Remove section"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Questions */}
        <SortableContext id={sortableId} items={questionIds} strategy={verticalListSortingStrategy}>
          <div className="bg-muted space-y-4 rounded-xl p-4">
            {section.questions.map((question, questionIndex) => (
              <QuestionCard
                key={question.key}
                sectionKey={section.key}
                sectionIndex={sectionIndex}
                question={question}
                questionIndex={questionIndex}
                sortableId={questionIds[questionIndex]}
                onUpdate={onUpdateQuestion}
                onRemove={onRemoveQuestion}
                onChangeType={onChangeQuestionType}
                onUpdateLikertDescriptor={onUpdateLikertDescriptor}
                onAddSuggestedResponse={onAddSuggestedResponse}
                onRemoveSuggestedResponse={onRemoveSuggestedResponse}
                ciloOptions={ciloOptions}
                facultyMode={facultyMode}
                onCiloBindingChange={onCiloBindingChange}
                selectedCiloLabel={selectedCiloLabels.get(
                  ciloQuestionBindings[encodeBindingKey(section.key, question.key)] ?? ""
                )}
                selectedCiloIds={selectedCiloIds}
                selectedCiloId={
                  ciloQuestionBindings[encodeBindingKey(section.key, question.key)] ?? ""
                }
                ploOptions={ploOptions}
                selectedPloIds={
                  ploQuestionBindings[encodeBindingKey(section.key, question.key)] ?? []
                }
                programWideMode={programWideMode}
                archivedPloLookup={archivedPloLookup}
                onPloBindingsChange={onPloBindingsChange}
                canRemove={section.questions.length > 1}
              />
            ))}

            {/* Add Question Button */}
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => onAddQuestion(section.key)}
                className="text-link hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
              >
                <Plus className="size-4" />
                Add Question
              </button>
            </div>
          </div>
        </SortableContext>
      </CardContent>
    </Card>
  );
}

// ─── Question Card Sub-component ─────────────────────────────────────────────

interface QuestionCardProps {
  ciloOptions: Array<{ description: string; id: string }>;
  sectionKey: string;
  sectionIndex: number;
  question: TemplateQuestion;
  questionIndex: number;
  sortableId: string;
  facultyMode: boolean;
  onUpdate: (sectionKey: string, questionKey: string, updates: Partial<TemplateQuestion>) => void;
  onRemove: (sectionKey: string, questionKey: string) => void;
  onChangeType: (sectionKey: string, questionKey: string, type: QuestionType) => void;
  onUpdateLikertDescriptor: (
    sectionKey: string,
    questionKey: string,
    index: number,
    label: string
  ) => void;
  onAddSuggestedResponse: (sectionKey: string, questionKey: string, response: string) => void;
  onCiloBindingChange: (questionKey: string, ciloId: string) => void;
  onPloBindingsChange: (questionKey: string, ploIds: string[]) => void;
  onRemoveSuggestedResponse: (sectionKey: string, questionKey: string, index: number) => void;
  ploOptions: ProgramPloOption[];
  selectedPloIds: string[];
  programWideMode: boolean;
  archivedPloLookup: Map<string, ProgramPloOption>;
  selectedCiloLabel?: string;
  selectedCiloId: string;
  selectedCiloIds: Set<string>;
  canRemove: boolean;
}

// fallow-ignore-next-line complexity
function QuestionCard({
  ciloOptions,
  sectionKey,
  sectionIndex,
  question,
  questionIndex,
  sortableId,
  facultyMode,
  onUpdate,
  onRemove,
  onChangeType,
  onUpdateLikertDescriptor,
  onAddSuggestedResponse,
  onCiloBindingChange,
  onPloBindingsChange,
  onRemoveSuggestedResponse,
  ploOptions,
  selectedPloIds,
  programWideMode,
  archivedPloLookup,
  selectedCiloLabel,
  selectedCiloId,
  selectedCiloIds,
  canRemove,
}: QuestionCardProps) {
  const [newResponse, setNewResponse] = useState("");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { kind: "question", sectionKey, questionKey: question.key },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group border-border bg-background space-y-4 rounded-lg border p-4 ${
        isDragging ? "opacity-90 shadow-lg" : ""
      }`}
    >
      {/* Question Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SortableDragHandle
            label={`Drag question ${questionIndex + 1} in section ${sectionIndex + 1}`}
            attributes={attributes}
            listeners={listeners}
          />
          <p className="text-label-sm text-muted-foreground tracking-wider uppercase">
            Question {questionIndex + 1}
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Select
            value={question.type}
            onValueChange={(value) => onChangeType(sectionKey, question.key, value as QuestionType)}
          >
            <SelectTrigger className="w-full sm:w-48" aria-label="Question type">
              <SelectValue>{formatQuestionTypeLabel(question.type)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="likert">Likert</SelectItem>
              <SelectItem value="guided_open_ended">Guided Open-Ended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <Label className="text-sm">Question title</Label>
        <Textarea
          placeholder="Enter question"
          rows={1}
          className="resize-none"
          value={question.prompt}
          onChange={(e) => onUpdate(sectionKey, question.key, { prompt: e.target.value })}
        />
      </div>

      {/* Type-specific UI */}
      {question.type === "likert" && question.likertDescriptors && (
        <>
          <LikertDescriptorsEditor
            descriptors={question.likertDescriptors}
            sectionKey={sectionKey}
            questionKey={question.key}
            onUpdate={onUpdateLikertDescriptor}
          />
          {facultyMode && (
            <div className="space-y-2">
              <Label htmlFor={`cilo-binding-${question.key}`} className="text-sm">
                CILO Binding
              </Label>
              <Select
                value={selectedCiloId || "none"}
                onValueChange={(value) => {
                  const ciloId = !value || value === "none" ? "" : value;

                  // Update CILO binding
                  onCiloBindingChange(encodeBindingKey(sectionKey, question.key), ciloId);

                  // Auto-populate question title with CILO description
                  if (ciloId) {
                    const selectedCilo = ciloOptions.find((c) => c.id === ciloId);
                    if (selectedCilo) {
                      onUpdate(sectionKey, question.key, {
                        prompt: selectedCilo.description,
                      });
                    }
                  }
                }}
              >
                <SelectTrigger
                  id={`cilo-binding-${question.key}`}
                  className="h-auto min-h-8 w-full whitespace-normal data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none *:data-[slot=select-value]:items-start *:data-[slot=select-value]:whitespace-normal"
                >
                  <SelectValue placeholder="Select a CILO…">
                    {selectedCiloId ? selectedCiloLabel : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No CILO assigned</SelectItem>
                  {ciloOptions.map((cilo, index) => {
                    const usedByAnotherQuestion =
                      selectedCiloIds.has(cilo.id) && selectedCiloId !== cilo.id;

                    return (
                      <SelectItem key={cilo.id} value={cilo.id} disabled={usedByAnotherQuestion}>
                        {formatCiloOptionLabel(cilo, index)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          {programWideMode && (
            <div className="space-y-2">
              <span id={`plo-binding-label-${question.key}`} className="text-sm font-medium">
                PLO Binding
              </span>
              <PloMultiSelect
                options={ploOptions}
                selectedIds={selectedPloIds}
                questionKey={question.key}
                labelId={`plo-binding-label-${question.key}`}
                archivedPloLookup={archivedPloLookup}
                onChange={(ploIds) =>
                  onPloBindingsChange(encodeBindingKey(sectionKey, question.key), ploIds)
                }
              />
              {selectedPloIds.length === 0 && (
                <p role="status" className="text-muted-foreground text-xs">
                  Not bound to a PLO yet. Drafts save without bindings, but this Likert question
                  must be bound to at least one PLO before publishing.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {question.type === "guided_open_ended" && (
        <div className="space-y-3">
          <Label className="text-sm">Predefined Responses</Label>

          {/* Existing responses */}
          {question.suggestedResponses && question.suggestedResponses.length > 0 && (
            <div className="space-y-2">
              {question.suggestedResponses.map((resp, idx) => (
                <div
                  key={idx}
                  className="border-border bg-card flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="flex-1">{resp}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSuggestedResponse(sectionKey, question.key, idx)}
                    className="text-muted-foreground hover:text-danger focus-visible:ring-ring shrink-0 rounded p-0.5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add response input */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Label htmlFor={`predefined-response-${question.key}`} className="sr-only">
              Add a predefined response
            </Label>
            <div className="min-w-0 flex-1">
              <Textarea
                id={`predefined-response-${question.key}`}
                rows={2}
                placeholder="Add a predefined response…"
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    onAddSuggestedResponse(sectionKey, question.key, newResponse);
                    setNewResponse("");
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto sm:shrink-0"
              onClick={() => {
                onAddSuggestedResponse(sectionKey, question.key, newResponse);
                setNewResponse("");
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Hover-reveal footer */}
      <div className="border-border/50 flex items-center justify-between border-t pt-3">
        <div>
          {canRemove && (
            <button
              type="button"
              onClick={() => onRemove(sectionKey, question.key)}
              className="text-danger hover:bg-danger-soft focus-visible:ring-ring inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label
            htmlFor={`required-${question.key}`}
            className="text-muted-foreground cursor-pointer text-xs"
          >
            Required
          </Label>
          <Switch
            id={`required-${question.key}`}
            checked={question.required}
            onCheckedChange={(checked) => onUpdate(sectionKey, question.key, { required: checked })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Likert Descriptors Editor ───────────────────────────────────────────────

interface LikertDescriptorsEditorProps {
  descriptors: LikertDescriptor[];
  sectionKey: string;
  questionKey: string;
  onUpdate: (sectionKey: string, questionKey: string, index: number, label: string) => void;
}

function LikertDescriptorsEditor({
  descriptors,
  sectionKey,
  questionKey,
  onUpdate,
}: LikertDescriptorsEditorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm">Scale Descriptors</Label>
      <div className="flex items-end gap-2">
        {descriptors.map((descriptor, idx) => (
          <div key={descriptor.value} className="flex-1 space-y-2 text-center">
            <div className="flex justify-center">
              <div className="border-primary/40 bg-card text-link flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold">
                {descriptor.value}
              </div>
            </div>
            {/* Editable label */}
            <input
              type="text"
              className="text-muted-foreground hover:border-border focus:border-primary w-full border-0 border-b border-transparent bg-transparent text-center text-xs transition-colors focus:outline-none"
              value={descriptor.label}
              onChange={(e) => onUpdate(sectionKey, questionKey, idx, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PLO Multi-Select ────────────────────────────────────────────────────────

interface PloMultiSelectProps {
  options: ProgramPloOption[];
  selectedIds: string[];
  questionKey: string;
  labelId: string;
  archivedPloLookup: Map<string, ProgramPloOption>;
  onChange: (ploIds: string[]) => void;
}

/**
 * Likert question PLO multi-select for Program-wide templates. Desktop shows a
 * searchable popover; mobile shows a bottom drawer surface. Selection is
 * keyboard-accessible (real checkboxes), chips are individually removable,
 * and a Clear action empties the selection.
 */
function PloMultiSelect({
  options,
  selectedIds,
  questionKey,
  labelId,
  archivedPloLookup,
  onChange,
}: PloMultiSelectProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const searchInputId = `plo-search-${questionKey}`;
  const listboxId = `plo-listbox-${questionKey}`;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter(
      (plo) =>
        plo.code.toLowerCase().includes(normalizedQuery) ||
        plo.description.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const toggle = useCallback(
    (ploId: string) => {
      onChange(
        selectedSet.has(ploId) ? selectedIds.filter((id) => id !== ploId) : [...selectedIds, ploId]
      );
    },
    [onChange, selectedIds, selectedSet]
  );

  // Removing a chip unmounts its remove button; return focus to the trigger so
  // keyboard users are not left with focus on the document body.
  const removeChip = useCallback(
    (ploId: string) => {
      toggle(ploId);
      document.getElementById(`plo-binding-${questionKey}`)?.focus();
    },
    [questionKey, toggle]
  );

  const selectedPlos = useMemo(
    () =>
      selectedIds
        .map((id) => options.find((plo) => plo.id === id) ?? archivedPloLookup.get(id))
        .filter((plo): plo is ProgramPloOption => Boolean(plo)),
    [archivedPloLookup, options, selectedIds]
  );

  const trigger = (
    <Button
      id={`plo-binding-${questionKey}`}
      type="button"
      variant="outline"
      className="w-full justify-between text-left font-normal"
      aria-labelledby={labelId}
      aria-controls={listboxId}
      aria-haspopup="listbox"
    >
      <span className="min-w-0 flex-1 truncate">
        {selectedIds.length === 0
          ? "Select PLOs…"
          : `${selectedIds.length} PLO${selectedIds.length === 1 ? "" : "s"} selected`}
      </span>
      <SearchIcon className="text-muted-foreground size-4 shrink-0" />
    </Button>
  );

  const searchField = (
    <div className="space-y-1 px-1">
      <Input
        id={searchInputId}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search PLOs by code or description…"
        aria-label="Search PLOs"
      />
    </div>
  );
  const optionList = (
    <div
      id={listboxId}
      role="listbox"
      aria-label="Program Learning Outcomes"
      className="h-64 overflow-y-auto"
    >
      {options.length === 0 ? (
        <p className="text-muted-foreground px-3 py-4 text-center text-sm">
          No active PLOs available for this program.
        </p>
      ) : filteredOptions.length === 0 ? (
        <p className="text-muted-foreground px-3 py-4 text-center text-sm">
          No PLOs match your search.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {filteredOptions.map((plo) => {
            const isSelected = selectedSet.has(plo.id);
            return (
              <li
                key={plo.id}
                className="hover:bg-accent flex items-start gap-2 rounded-md px-2 py-1.5"
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(plo.id)}
                    className="accent-primary mt-0.5 size-4 shrink-0"
                    aria-label={`${plo.code}: ${plo.description}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="text-sm font-semibold">{plo.code}</span>
                    <span className="text-muted-foreground ml-2 text-sm">{plo.description}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  const footer = (
    <div className="border-border flex items-center justify-between border-t pt-2">
      <span className="text-muted-foreground text-xs">{selectedIds.length} selected</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={selectedIds.length === 0}
        onClick={() => onChange([])}
      >
        Clear
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      {isDesktop ? (
        <Popover>
          <PopoverTrigger render={trigger} />
          <PopoverContent className="w-96 p-0" align="start">
            <div className="flex h-[24rem] flex-col overflow-hidden">
              <div className="shrink-0 px-1 pt-2">{searchField}</div>
              <div className="min-h-0 flex-1 overflow-hidden px-1">{optionList}</div>
              <div className="border-border shrink-0 border-t px-3 py-2">{footer}</div>
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Drawer>
          <DrawerTrigger render={trigger} />
          <DrawerContent className="flex h-[85dvh] max-h-[85dvh] flex-col overflow-hidden">
            <DrawerHeader className="flex shrink-0 items-start justify-between gap-4 text-left">
              <div className="min-w-0 space-y-1">
                <DrawerTitle>PLO Binding</DrawerTitle>
                <DrawerDescription>
                  Choose one or more active Program Learning Outcomes this Likert question covers.
                </DrawerDescription>
              </div>
              <DrawerClose
                render={<Button variant="ghost" size="icon-sm" aria-label="Close PLO binding" />}
              >
                <XIcon aria-hidden="true" />
              </DrawerClose>
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
              <div className="shrink-0">{searchField}</div>
              <div className="min-h-0 flex-1 overflow-hidden">{optionList}</div>
              <div className="shrink-0">{footer}</div>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {selectedPlos.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Selected PLOs">
          {selectedPlos.map((plo) => {
            const isArchived = archivedPloLookup.has(plo.id);
            return (
              <li
                key={plo.id}
                className={`${isArchived ? "border-destructive/40 bg-destructive/10" : "bg-muted"} text-foreground inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-xs font-medium`}
              >
                <span className="font-semibold">{plo.code}</span>
                {isArchived && <span className="text-destructive">Archived</span>}
                <button
                  type="button"
                  onClick={() => removeChip(plo.id)}
                  className="text-muted-foreground hover:text-danger focus-visible:ring-ring rounded-sm p-0.5 transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  aria-label={`Remove ${plo.code}`}
                >
                  <XIcon className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
