"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
    redirectTo: string;
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
    structure: TemplateStructure
  ) => Promise<ActionResult<{ id: string }>>;
  onPublish?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createSection(order: number): TemplateSection {
  return {
    key: crypto.randomUUID(),
    title: "",
    description: undefined,
    order,
    questions: [createQuestion(0)],
  };
}

function createQuestion(order: number): TemplateQuestion {
  return {
    key: crypto.randomUUID(),
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

function formatQuestionTypeLabel(type: QuestionType): string {
  return type === "likert" ? "Likert" : "Guided Open-Ended";
}

// ─── Component ───────────────────────────────────────────────────────────────

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
}: TemplateBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const templateId = initialData?.id;

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
  const [sections, setSections] = useState<TemplateStructure>(
    initialData?.structure?.length ? initialData.structure : [createSection(0)]
  );
  const [boundProgramId, setBoundProgramId] = useState(initialData?.bound_program_id ?? "");
  const [boundMajorId, setBoundMajorId] = useState(initialData?.bound_major_id ?? "");
  const [boundCourseId, setBoundCourseId] = useState(initialData?.bound_course_id ?? "");
  const [ciloQuestionBindings, setCiloQuestionBindings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (facultyConfig?.initialBindings ?? []).map((binding) => [
        `${binding.sectionKey}:${binding.itemKey}`,
        binding.ciloId,
      ])
    )
  );
  const [loadedCilos, setLoadedCilos] = useState<Array<{ description: string; id: string }>>([]);
  const [isLoadingCilos, setIsLoadingCilos] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Copy name dialog state for institutional baselines
  const [copyNameDialogOpen, setCopyNameDialogOpen] = useState(false);
  const [copyName, setCopyName] = useState(initialData?.name ?? "");
  const [isCopyPending, setIsCopyPending] = useState(false);

  const facultyMode = Boolean(facultyConfig);
  const effectiveTemplateType: EvaluationTemplateType = facultyMode ? "COURSE_BOUND" : templateType;
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

    if (!boundCourseId || !boundProgramId) {
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
      return updated.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const removeSection = useCallback((key: string) => {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.key !== key);
      return filtered.map((s, i) => ({ ...s, order: i }));
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
      prev.map((s) => {
        if (s.key !== sectionKey) return s;
        const newQuestion = createQuestion(s.questions.length);
        return { ...s, questions: [...s.questions, newQuestion] };
      })
    );
  }, []);

  const removeQuestion = useCallback((sectionKey: string, questionKey: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.key !== sectionKey) return s;
        const filtered = s.questions.filter((q) => q.key !== questionKey);
        return {
          ...s,
          questions: filtered.map((q, i) => ({ ...q, order: i })),
        };
      })
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
      );
    },
    []
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
    formData.set(
      "is_faculty_accessible",
      effectiveTemplateType === "COURSE_BOUND" && isFacultyAccessible ? "true" : "false"
    );
    formData.set("structure", JSON.stringify(sections));

    if (facultyMode) {
      formData.set("bound_course_id", boundCourseId);
      formData.set("bound_major_id", boundMajorId);
      formData.set("bound_program_id", boundProgramId);
      formData.set(
        "cilo_question_bindings",
        JSON.stringify(
          Object.entries(ciloQuestionBindings)
            .filter(([, ciloId]) => ciloId)
            .map(([questionKey, ciloId]) => {
              const [sectionKey, itemKey] = questionKey.split(":");
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
    isFacultyAccessible,
    name,
    sections,
    templateId,
    templateType,
  ]);

  const saveDraft = useCallback(async () => {
    setError(null);

    const result = await onSave(buildFormData());

    if (!result.success) {
      setError(result.error);
      showToast(result.error, "error");
      return { success: false as const, error: result.error };
    }

    const id = result.data?.id ?? templateId ?? null;
    return { success: true as const, id };
  }, [buildFormData, onSave, templateId]);

  const handleSaveAsCopy = useCallback(async () => {
    if (!templateId || !onSaveAsCopy) return;

    setIsCopyPending(true);
    const result = await onSaveAsCopy(templateId, copyName, sections);
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
  }, [templateId, onSaveAsCopy, copyName, sections, toolsHref, router, onSaveResult]);

  const handleSave = useCallback(() => {
    // If editing an institutional baseline, show copy name dialog
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

      if (saveSuccessConfig) {
        showToast(saveSuccessConfig.toastMessage, "success");
        router.push(saveSuccessConfig.redirectTo);
        return;
      }

      showToast("Template saved successfully.", "success");
      router.push(toolsHref);
    });
  }, [
    isInstitutionalBaseline,
    templateId,
    onSaveAsCopy,
    name,
    router,
    saveDraft,
    saveSuccessConfig,
    toolsHref,
    onSaveResult,
  ]);

  const handlePublish = useCallback(() => {
    if (!facultyConfig) {
      return;
    }

    startTransition(async () => {
      const saveResult = await saveDraft();

      if (!saveResult.success) {
        return;
      }

      const result = await facultyConfig.validatePublishReadinessAction(saveResult.id!);

      if (!result.success) {
        showToast(result.error, "error");
        setError(result.error);
        return;
      }

      router.push(`/faculty/cilo-evaluations/new?templateId=${saveResult.id}`);
    });
  }, [facultyConfig, router, saveDraft]);

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-label-sm text-muted-foreground tracking-wider uppercase">
          {programLabel}
        </p>
        <h1 className="font-heading text-text-primary text-2xl font-black">
          {initialData?.id ? "Edit Template" : "New Template"}
        </h1>
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
              <Select
                value={boundCourseId}
                disabled={facultyCourseContexts.length === 0}
                onValueChange={(value) => {
                  const context = facultyCourseContexts.find(
                    (candidate) => candidate.courseId === value
                  );
                  setBoundCourseId(value ?? "");
                  setBoundProgramId(context?.programId ?? "");
                  setBoundMajorId(context?.majorId ?? "");
                  setCiloQuestionBindings({});
                }}
              >
                <SelectTrigger id="faculty-course-context">
                  <SelectValue placeholder="Select a course">
                    {selectedCourseContext
                      ? formatCourseContextLabel(selectedCourseContext)
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {facultyCourseContexts.map((context) => (
                    <SelectItem
                      key={`${context.programId}-${context.courseId}-${context.majorId ?? "shared"}`}
                      value={context.courseId}
                    >
                      {formatCourseContextLabel(context)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          className="text-primary hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          <Plus className="size-5" />
          Add Section
        </button>
      </div>

      {/* Section Cards */}
      {sections.map((section, sectionIndex) => (
        <div key={section.key} className="space-y-4">
          <SectionCard
            section={section}
            sectionIndex={sectionIndex}
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

      {/* Add Section Button (bottom) */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => addSection()}
          className="text-primary hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          <Plus className="size-5" />
          Add Section
        </button>
      </div>

      {/* Save Actions */}
      <div className="flex justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => router.push(toolsHref)} disabled={isPending}>
          Cancel
        </Button>
        {(facultyMode || onPublish) && (
          <Button
            variant="brand-accent"
            onClick={facultyMode ? handlePublish : onPublish}
            loading={isPending}
          >
            Publish
          </Button>
        )}
        <Button onClick={handleSave} loading={isPending}>
          {isInstitutionalBaseline ? "Save as Program Copy" : "Save Template"}
        </Button>
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
    </div>
  );
}

// ─── Section Card Sub-component ──────────────────────────────────────────────

interface SectionCardProps {
  ciloOptions: Array<{ description: string; id: string }>;
  ciloQuestionBindings: Record<string, string>;
  selectedCiloLabels: Map<string, string>;
  section: TemplateSection;
  sectionIndex: number;
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
  onRemoveSuggestedResponse: (sectionKey: string, questionKey: string, index: number) => void;
  selectedCiloIds: Set<string>;
  canRemove: boolean;
}

function SectionCard({
  ciloOptions,
  ciloQuestionBindings,
  selectedCiloLabels,
  section,
  sectionIndex,
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
  onRemoveSuggestedResponse,
  selectedCiloIds,
  canRemove,
}: SectionCardProps) {
  return (
    <Card className="relative overflow-visible">
      {/* Left accent bar */}
      <div className="bg-primary absolute top-8 -left-3 h-12 w-1 rounded-r" />

      <CardContent className="space-y-6 pt-6">
        {/* Section Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
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

        {/* Questions */}
        <div className="bg-muted space-y-4 rounded-xl p-4">
          {section.questions.map((question, questionIndex) => (
            <QuestionCard
              key={question.key}
              sectionKey={section.key}
              question={question}
              questionIndex={questionIndex}
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
                ciloQuestionBindings[`${section.key}:${question.key}`] ?? ""
              )}
              selectedCiloIds={selectedCiloIds}
              selectedCiloId={ciloQuestionBindings[`${section.key}:${question.key}`] ?? ""}
              canRemove={section.questions.length > 1}
            />
          ))}

          {/* Add Question Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => onAddQuestion(section.key)}
              className="text-primary hover:bg-primary/5 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none"
            >
              <Plus className="size-4" />
              Add Question
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Question Card Sub-component ─────────────────────────────────────────────

interface QuestionCardProps {
  ciloOptions: Array<{ description: string; id: string }>;
  sectionKey: string;
  question: TemplateQuestion;
  questionIndex: number;
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
  onRemoveSuggestedResponse: (sectionKey: string, questionKey: string, index: number) => void;
  selectedCiloLabel?: string;
  selectedCiloId: string;
  selectedCiloIds: Set<string>;
  canRemove: boolean;
}

function QuestionCard({
  ciloOptions,
  sectionKey,
  question,
  questionIndex,
  facultyMode,
  onUpdate,
  onRemove,
  onChangeType,
  onUpdateLikertDescriptor,
  onAddSuggestedResponse,
  onCiloBindingChange,
  onRemoveSuggestedResponse,
  selectedCiloLabel,
  selectedCiloId,
  selectedCiloIds,
  canRemove,
}: QuestionCardProps) {
  const [newResponse, setNewResponse] = useState("");

  return (
    <div className="group border-border bg-background space-y-4 rounded-lg border p-4">
      {/* Question Header */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-label-sm text-muted-foreground tracking-wider uppercase">
          Question {questionIndex + 1}
        </p>
        <Select
          value={question.type}
          onValueChange={(value) => onChangeType(sectionKey, question.key, value as QuestionType)}
        >
          <SelectTrigger className="w-48">
            <SelectValue>{formatQuestionTypeLabel(question.type)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="likert">Likert</SelectItem>
            <SelectItem value="guided_open_ended">Guided Open-Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Prompt Input */}
      <div className="space-y-2">
        <Label className="text-sm">Question title</Label>
        <Input
          placeholder="Enter question"
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
                  onCiloBindingChange(`${sectionKey}:${question.key}`, ciloId);

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
                <SelectTrigger id={`cilo-binding-${question.key}`}>
                  <SelectValue placeholder="Select a CILO">
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
          <div className="flex gap-2">
            <Input
              placeholder="Add a predefined response…"
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddSuggestedResponse(sectionKey, question.key, newResponse);
                  setNewResponse("");
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
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
            {/* Radio circle visual */}
            <div className="flex justify-center">
              <div className="relative">
                {/* Connecting line */}
                {idx < descriptors.length - 1 && (
                  <div className="bg-border absolute top-1/2 left-full h-px w-full" />
                )}
                <div className="border-primary/40 bg-card text-primary/60 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-semibold">
                  {descriptor.value}
                </div>
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
