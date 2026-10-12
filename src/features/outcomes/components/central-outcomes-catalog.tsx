"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Edit, Layers, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { CentralOutcomeAdministration } from "../services/manage-central-outcomes";
import type { OutcomeWriteReview } from "../services/manage-outcome-writes";
import {
  reviewCentralOutcomeAction,
  commitCentralOutcomeAction,
} from "@/lib/actions/central-outcome-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldDescription, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Disclosure, DisclosureContent, DisclosureTrigger } from "@/components/ui/disclosure";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { POClassificationBadge } from "./po-classification-badge";
import {
  countByCategory,
  isProgramHeadCategory,
  matchesPOCategory,
  PO_CATEGORY_TABS,
  PO_CATEGORY_TAB_LABELS,
  type POCategoryFilter,
} from "../po-classification";

type CommonOutcome = CentralOutcomeAdministration["common"][number];
type Program = CentralOutcomeAdministration["programs"][number];
type ProgramOutcome = Program["pos"][number];
type AdministrativeClassification = "COMMON" | "INSTITUTION_SPECIFIC";
type Prepare = (value: unknown) => void;
type Editor =
  | { kind: "common"; item: CommonOutcome | null }
  | { kind: "po"; program: Program; item: ProgramOutcome | null };

// The reviewed payload doubles as the editor draft: taking Back from the
// review dialog restores exactly what the author typed, so a correction does
// not cost a retype. `description` is only the author's own text for the
// fields where they can type one, which is the only place it is restored.
type EditorDraft = {
  code?: string;
  description?: string;
  sourceRef?: string;
  classification?: AdministrativeClassification;
  commonOutcomeId?: string;
};

function toEditorDraft(value: unknown): EditorDraft {
  if (!value || typeof value !== "object") return {};
  const row = value as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === "string" ? row[key] : undefined);
  const classification = row.classification;
  return {
    code: text("code"),
    description: text("description"),
    sourceRef: text("sourceRef"),
    classification:
      classification === "COMMON" || classification === "INSTITUTION_SPECIFIC"
        ? classification
        : undefined,
    commonOutcomeId: text("commonOutcomeId") ?? undefined,
  };
}

const ALL_PROGRAMS = "ALL";

function SectionHeader({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-3xl min-w-0 flex-col gap-1">
        <h2 id={id} className="text-heading-lg">
          {title}
        </h2>
        <p className="text-body-sm text-text-secondary">{description}</p>
      </div>
      {action}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? null : (
    <Badge variant="outline" className="text-muted-foreground">
      Archived
    </Badge>
  );
}

function CommonCatalogSection({
  common,
  pending,
  onPrepare,
  onEdit,
}: {
  common: CommonOutcome[];
  pending: boolean;
  onPrepare: Prepare;
  onEdit: (item: CommonOutcome | null) => void;
}) {
  const moveUp = (index: number) => {
    const ids = common.map((row) => row.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    onPrepare({ kind: "COMMON_PO", action: "reorder", orderedIds: ids });
  };
  return (
    <section className="flex flex-col gap-4" aria-labelledby="common-catalog-title">
      <SectionHeader
        id="common-catalog-title"
        title="Common to all Schools"
        description="One shared statement per Common PO. Programs adopt it under their own code, and a correction here updates every adopting program. General Education CILOs map to these outcomes."
        action={
          <Button className="w-full sm:w-auto" onClick={() => onEdit(null)}>
            <Plus data-icon="inline-start" aria-hidden="true" />
            Add Common PO
          </Button>
        }
      />
      {common.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No Common POs yet</EmptyTitle>
            <EmptyDescription>
              Add a shared definition before adopting it or mapping GE CILOs.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ol className="bg-card flex flex-col divide-y rounded-xl border">
          {common.map((item, index) => (
            <li key={item.id} className="flex min-w-0 flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="font-semibold">{item.code}</Badge>
                <StatusBadge active={item.is_active} />
                <span className="text-caption text-text-secondary tabular-nums">
                  {item._count.program_pos} program adoptions · {item._count.ge_mappings} GE
                  mappings
                </span>
              </div>
              <p className="text-body-md text-pretty break-words">{item.description}</p>
              {item.source_ref && (
                <p className="text-body-sm text-text-secondary break-words">{item.source_ref}</p>
              )}
              <div className="-ml-2 flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
                  <Edit data-icon="inline-start" aria-hidden="true" />
                  Edit <span className="sr-only">{item.code}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    onPrepare({
                      kind: "COMMON_PO",
                      action: item.is_active ? "archive" : "restore",
                      id: item.id,
                    })
                  }
                >
                  {item.is_active ? (
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                  ) : (
                    <RotateCcw data-icon="inline-start" aria-hidden="true" />
                  )}
                  {item.is_active ? "Archive" : "Restore"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={index === 0 || pending}
                  onClick={() => moveUp(index)}
                >
                  <ArrowUp data-icon="inline-start" aria-hidden="true" />
                  Move up
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ProgramOutcomeRow({
  item,
  programId,
  pending,
  onEdit,
  onPrepare,
}: {
  item: ProgramOutcome;
  programId: string;
  pending: boolean;
  onEdit: () => void;
  onPrepare: Prepare;
}) {
  const managedByProgramHead = isProgramHeadCategory(item.classification);
  return (
    <li className="flex min-w-0 flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-lg">{item.code}</span>
        <POClassificationBadge classification={item.classification} />
        {item.common_outcome_id && <Badge variant="outline">Shared statement</Badge>}
        <StatusBadge active={item.is_active} />
        <span className="text-caption text-text-secondary tabular-nums">
          {item._count.cilo_mappings} {item._count.cilo_mappings === 1 ? "CILO" : "CILOs"} mapped
        </span>
      </div>
      <p className="text-body-sm text-pretty break-words">{item.description}</p>
      {managedByProgramHead ? (
        <p className="text-caption text-text-secondary">Managed by the Program Head</p>
      ) : (
        <div className="-ml-2 flex flex-wrap gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit data-icon="inline-start" aria-hidden="true" />
            {item.classification === "UNCLASSIFIED" ? "Classify" : "Edit"}{" "}
            <span className="sr-only">{item.code}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              onPrepare({
                kind: "PO",
                action: item.is_active ? "archive" : "restore",
                programId,
                id: item.id,
              })
            }
          >
            {item.is_active ? (
              <Trash2 data-icon="inline-start" aria-hidden="true" />
            ) : (
              <RotateCcw data-icon="inline-start" aria-hidden="true" />
            )}
            {item.is_active ? "Archive" : "Restore"} <span className="sr-only">{item.code}</span>
          </Button>
        </div>
      )}
    </li>
  );
}

function ProgramOutcomePanel({
  programs,
  programId,
  category,
  pending,
  onPrepare,
  onEdit,
}: {
  programs: Program[];
  programId: string;
  category: POCategoryFilter;
  pending: boolean;
  onPrepare: Prepare;
  onEdit: (program: Program, item: ProgramOutcome | null) => void;
}) {
  const scoped =
    programId === ALL_PROGRAMS ? programs : programs.filter((program) => program.id === programId);
  const groups = scoped
    .map((program) => ({
      program,
      pos: program.pos.filter((po) => matchesPOCategory(po.classification, category)),
    }))
    .filter((group) => category === "ALL" || group.pos.length > 0);

  if (groups.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Layers aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No matching Program Outcomes</EmptyTitle>
          <EmptyDescription>Choose another program or classification.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ program, pos }) => (
        <Disclosure
          key={`${program.id}:${scoped.length === 1}`}
          open={scoped.length === 1 || undefined}
          className="bg-card rounded-xl border"
        >
          <DisclosureTrigger variant="card" className="px-4 py-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-title-md break-words">
                {program.code} · {program.name}
              </span>
              <span className="text-caption text-text-secondary font-normal tabular-nums">
                {program.pos.length} {program.pos.length === 1 ? "PO" : "POs"}
                {category !== "ALL" && ` · ${pos.length} ${PO_CATEGORY_TAB_LABELS[category]}`}
              </span>
            </span>
          </DisclosureTrigger>
          <DisclosureContent className="border-t p-0">
            {pos.length === 0 ? (
              <p className="text-body-sm text-text-secondary px-4 py-3">
                No Program Outcomes recorded for this program.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {pos.map((item) => (
                  <ProgramOutcomeRow
                    key={item.id}
                    item={item}
                    programId={program.id}
                    pending={pending}
                    onEdit={() => onEdit(program, item)}
                    onPrepare={onPrepare}
                  />
                ))}
              </ul>
            )}
            <div className="border-t px-2 py-2">
              <Button variant="ghost" size="sm" onClick={() => onEdit(program, null)}>
                <Plus data-icon="inline-start" aria-hidden="true" />
                Add PO to {program.code}
              </Button>
            </div>
          </DisclosureContent>
        </Disclosure>
      ))}
    </div>
  );
}

function ProgramOutcomesSection({
  programs,
  pending,
  onPrepare,
  onEdit,
}: {
  programs: Program[];
  pending: boolean;
  onPrepare: Prepare;
  onEdit: (program: Program, item: ProgramOutcome | null) => void;
}) {
  const [programId, setProgramId] = useState(ALL_PROGRAMS);
  const [category, setCategory] = useState<POCategoryFilter>("ALL");
  const counts = countByCategory(
    (programId === ALL_PROGRAMS
      ? programs
      : programs.filter((program) => program.id === programId)
    ).flatMap((program) => program.pos)
  );
  const selectedProgram = programs.find((program) => program.id === programId);

  return (
    <section className="flex flex-col gap-4" aria-labelledby="program-outcomes-title">
      <SectionHeader
        id="program-outcomes-title"
        title="Program Outcomes"
        description="Every PO of every active program. You manage Common adoptions and Institution-specific POs, and classify legacy rows. Program Heads manage Core and Professional POs."
      />
      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as POCategoryFilter)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Field className="w-full lg:max-w-xs">
            <FieldLabel htmlFor="po-program-filter">Program</FieldLabel>
            <Select
              value={programId}
              onValueChange={(value) => setProgramId(value ?? ALL_PROGRAMS)}
            >
              <SelectTrigger id="po-program-filter" className="w-full">
                <SelectValue>
                  {selectedProgram
                    ? `${selectedProgram.code} · ${selectedProgram.name}`
                    : "All programs"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={ALL_PROGRAMS}>All programs</SelectItem>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.code} · {program.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <TabsList variant="line" aria-label="PO classification" className="w-full lg:w-auto">
            {PO_CATEGORY_TABS.map((value) => (
              <TabsTrigger key={value} value={value}>
                {PO_CATEGORY_TAB_LABELS[value]} ({counts[value]})
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {PO_CATEGORY_TABS.map((value) => (
          <TabsContent key={value} value={value}>
            <ProgramOutcomePanel
              programs={programs}
              programId={programId}
              category={value}
              pending={pending}
              onPrepare={onPrepare}
              onEdit={onEdit}
            />
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}

function InstitutionalOutcomesSection({
  outcomes,
}: {
  outcomes: CentralOutcomeAdministration["institutional"];
}) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby="ilo-catalog-title">
      <SectionHeader
        id="ilo-catalog-title"
        title="Institutional Learning Outcomes"
        description="College-wide ILOs, managed by the General Education Coordinator. Shown here for reference."
      />
      {outcomes.length === 0 ? (
        <p className="text-body-sm text-text-secondary">No Institutional Outcomes recorded.</p>
      ) : (
        <ol className="bg-card flex flex-col divide-y rounded-xl border">
          {outcomes.map((outcome) => (
            <li
              key={outcome.id}
              className="text-body-sm flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-3"
            >
              <span className="text-label-lg shrink-0">{outcome.code}</span>
              <span className="text-pretty break-words">{outcome.description}</span>
              <StatusBadge active={outcome.is_active} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CommonOutcomeForm({
  item,
  draft,
  pending,
  error,
  onPrepare,
  onCancel,
}: {
  item: CommonOutcome | null;
  draft: EditorDraft | null;
  pending: boolean;
  error: string | null;
  onPrepare: Prepare;
  onCancel: () => void;
}) {
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        onPrepare({
          kind: "COMMON_PO",
          action: item ? "update" : "create",
          ...(item ? { id: item.id } : {}),
          code: fields.get("code"),
          description: fields.get("description"),
          sourceRef: fields.get("sourceRef"),
        });
      }}
    >
      <ResponsiveDialogBody>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="common-code">Common PO code</FieldLabel>
            <Input
              id="common-code"
              name="code"
              defaultValue={draft ? draft.code : item?.code}
              required
              maxLength={20}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="common-description">Approved statement</FieldLabel>
            <Textarea
              id="common-description"
              name="description"
              defaultValue={draft ? draft.description : item?.description}
              required
              minLength={3}
              maxLength={1000}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="common-source">Source reference</FieldLabel>
            <Input
              id="common-source"
              name="sourceRef"
              defaultValue={draft ? draft.sourceRef : (item?.source_ref ?? "")}
              maxLength={1000}
            />
            <FieldDescription>Optional. Where the approved wording comes from.</FieldDescription>
          </Field>
          <FormErrorAlert error={error} />
        </FieldGroup>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Review {item ? "correction" : "new Common PO"}
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}

// A legacy UNCLASSIFIED row loads as Institution-specific so the reviewer
// authors a real statement; it never arrives pre-linked to a Common PO.
function initialClassification(item: ProgramOutcome | null): AdministrativeClassification {
  return item?.classification === "INSTITUTION_SPECIFIC" || item?.classification === "UNCLASSIFIED"
    ? "INSTITUTION_SPECIFIC"
    : "COMMON";
}

// Seeds the controlled fields and the code default from the restored draft,
// falling back to the stored outcome when the author is not returning from a
// review.
function seedProgramOutcomeForm(item: ProgramOutcome | null, draft: EditorDraft | null) {
  return {
    classification: draft?.classification ?? initialClassification(item),
    commonId: draft?.commonOutcomeId ?? item?.common_outcome_id ?? "",
    code: draft ? draft.code : item?.code,
  };
}

function ClassificationField({
  value,
  onChange,
}: {
  value: AdministrativeClassification;
  onChange: (value: AdministrativeClassification) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="admin-po-category">Classification</FieldLabel>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next === "COMMON" || next === "INSTITUTION_SPECIFIC") onChange(next);
        }}
      >
        <SelectTrigger id="admin-po-category" className="w-full">
          <SelectValue>
            {value === "COMMON" ? "Common to all Schools" : "Institution-specific"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="COMMON">Common to all Schools</SelectItem>
            <SelectItem value="INSTITUTION_SPECIFIC">Institution-specific</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function CommonReferenceField({
  commonId,
  activeCommon,
  selected,
  onChange,
}: {
  commonId: string;
  activeCommon: CommonOutcome[];
  selected: CommonOutcome | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="admin-common-reference">Shared Common PO</FieldLabel>
      <Select value={commonId || null} onValueChange={(value) => onChange(value ?? "")}>
        <SelectTrigger id="admin-common-reference" className="w-full">
          <SelectValue>{selected?.code ?? "Select a Common PO"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {activeCommon.map((row) => (
              <SelectItem key={row.id} value={row.id}>
                {row.code} · {row.description}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {selected && <FieldDescription>{selected.description}</FieldDescription>}
    </Field>
  );
}

function InstitutionStatementField({
  item,
  draft,
}: {
  item: ProgramOutcome | null;
  draft: EditorDraft | null;
}) {
  return (
    <Field>
      <FieldLabel htmlFor="admin-local-description">Program outcome statement</FieldLabel>
      <Textarea
        id="admin-local-description"
        name="description"
        required
        minLength={3}
        maxLength={1000}
        defaultValue={draft ? draft.description : item?.description}
      />
    </Field>
  );
}

function FormErrorAlert({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

function programOutcomePayload({
  program,
  item,
  classification,
  commonId,
  selected,
  fields,
}: {
  program: Program;
  item: ProgramOutcome | null;
  classification: AdministrativeClassification;
  commonId: string;
  selected: CommonOutcome | undefined;
  fields: FormData;
}) {
  const isCommon = classification === "COMMON";
  return {
    kind: "PO",
    action: item ? "update" : "create",
    ...(item ? { id: item.id } : {}),
    programId: program.id,
    code: fields.get("code"),
    description: isCommon ? selected?.description : fields.get("description"),
    classification,
    commonOutcomeId: isCommon ? commonId : null,
  };
}

function ProgramOutcomeForm({
  program,
  item,
  draft,
  common,
  pending,
  error,
  onPrepare,
  onCancel,
}: {
  program: Program;
  item: ProgramOutcome | null;
  draft: EditorDraft | null;
  common: CommonOutcome[];
  pending: boolean;
  error: string | null;
  onPrepare: Prepare;
  onCancel: () => void;
}) {
  const seeded = seedProgramOutcomeForm(item, draft);
  const [classification, setClassification] = useState<AdministrativeClassification>(
    seeded.classification
  );
  const [commonId, setCommonId] = useState(seeded.commonId);
  const selected = common.find((row) => row.id === commonId);
  const activeCommon = common.filter((row) => row.is_active);
  const isCommon = classification === "COMMON";

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        onPrepare(
          programOutcomePayload({
            program,
            item,
            classification,
            commonId,
            selected,
            fields: new FormData(event.currentTarget),
          })
        );
      }}
    >
      <ResponsiveDialogBody>
        <FieldGroup>
          <ClassificationField value={classification} onChange={setClassification} />
          {isCommon && (
            <CommonReferenceField
              commonId={commonId}
              activeCommon={activeCommon}
              selected={selected}
              onChange={setCommonId}
            />
          )}
          <Field>
            <FieldLabel htmlFor="admin-local-code">Program-local PO code</FieldLabel>
            <Input
              id="admin-local-code"
              name="code"
              required
              maxLength={20}
              defaultValue={seeded.code}
            />
          </Field>
          {!isCommon && <InstitutionStatementField item={item} draft={draft} />}
          <FormErrorAlert error={error} />
        </FieldGroup>
      </ResponsiveDialogBody>
      <ResponsiveDialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Review program PO
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}

function editorTitle(editor: Editor | null): string {
  if (!editor) return "";
  if (editor.kind === "common") return editor.item ? `Edit ${editor.item.code}` : "Add Common PO";
  return editor.item
    ? `Edit ${editor.item.code} · ${editor.program.code}`
    : `Add PO to ${editor.program.code}`;
}

const EDITOR_DESCRIPTION: Record<Editor["kind"], string> = {
  common: "You will review the exact change before it is saved.",
  po: "Common adoptions reuse the shared statement. You will review the exact change before it is saved.",
};

function OutcomeEditorForm({
  editor,
  draft,
  common,
  pending,
  error,
  onPrepare,
  onClose,
}: {
  editor: Editor | null;
  draft: EditorDraft | null;
  common: CommonOutcome[];
  pending: boolean;
  error: string | null;
  onPrepare: Prepare;
  onClose: () => void;
}) {
  if (editor?.kind === "common") {
    return (
      <CommonOutcomeForm
        key={editor.item?.id ?? "new"}
        item={editor.item}
        draft={draft}
        pending={pending}
        error={error}
        onPrepare={onPrepare}
        onCancel={onClose}
      />
    );
  }
  if (editor?.kind === "po") {
    return (
      <ProgramOutcomeForm
        key={`${editor.program.id}:${editor.item?.id ?? "new"}`}
        program={editor.program}
        item={editor.item}
        draft={draft}
        common={common}
        pending={pending}
        error={error}
        onPrepare={onPrepare}
        onCancel={onClose}
      />
    );
  }
  return null;
}

function OutcomeEditorDialog({
  editor,
  draft,
  common,
  pending,
  error,
  onPrepare,
  onClose,
}: {
  editor: Editor | null;
  draft: EditorDraft | null;
  common: CommonOutcome[];
  pending: boolean;
  error: string | null;
  onPrepare: Prepare;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog open={!!editor} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{editorTitle(editor)}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {editor ? EDITOR_DESCRIPTION[editor.kind] : ""}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <OutcomeEditorForm
          editor={editor}
          draft={draft}
          common={common}
          pending={pending}
          error={error}
          onPrepare={onPrepare}
          onClose={onClose}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function OutcomeReviewDialog({
  review,
  error,
  pending,
  onClose,
  onConfirm,
}: {
  review: OutcomeWriteReview | null;
  error: string | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ResponsiveDialog open={!!review} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Review outcome change</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Confirm the exact change. Shared statement corrections update all linked program POs.
            Archiving a Common PO removes its GE readiness eligibility but preserves mappings and
            local active states.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogBody className="flex flex-col gap-4">
          {review?.input.kind === "COMMON_PO" && review.input.action === "archive" && (
            <Alert variant="warning">
              <AlertDescription>
                GE courses that depend on this outcome as their only active Common PO mapping will
                become incomplete. New publication will be blocked until Faculty map the affected
                CILOs to another active Common PO. Linked local POs stay active and their historical
                wording stays available.
              </AlertDescription>
            </Alert>
          )}
          <h3 className="text-title-md">Before</h3>
          <pre className="bg-muted text-body-sm overflow-auto rounded-lg p-3 break-all whitespace-pre-wrap">
            {JSON.stringify(review?.before, null, 2)}
          </pre>
          <h3 className="text-title-md">After</h3>
          <pre className="bg-muted text-body-sm overflow-auto rounded-lg p-3 break-all whitespace-pre-wrap">
            {JSON.stringify(review?.after, null, 2)}
          </pre>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </ResponsiveDialogBody>
        <ResponsiveDialogFooter>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            Back
          </Button>
          <Button loading={pending} onClick={onConfirm}>
            Confirm change
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * The college-wide outcome catalog for the Dean and Secretary: the shared
 * Common PO catalog and administrative program POs are editable through the
 * reviewed write boundary; Core/Professional POs and ILOs stay read-only here.
 */
export function CentralOutcomesCatalog({ data }: { data: CentralOutcomeAdministration }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [review, setReview] = useState<OutcomeWriteReview | null>(null);
  const [draft, setDraft] = useState<EditorDraft | null>(null);
  // Each reviewed write carries a token; closing an editor or a review
  // invalidates it, so a late response can never resurrect a cancelled review
  // or close a replacement editor.
  const writeToken = useRef(0);

  function prepare(value: unknown) {
    setError(null);
    const token = ++writeToken.current;
    startTransition(async () => {
      const result = await reviewCentralOutcomeAction(value);
      if (token !== writeToken.current) return;
      if (result.success) {
        setDraft(toEditorDraft(value));
        setReview(result.data);
      } else setError(result.error);
    });
  }
  function save() {
    if (!review) return;
    startTransition(async () => {
      const result = await commitCentralOutcomeAction(review, true);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReview(null);
      setEditor(null);
      setDraft(null);
      router.refresh();
    });
  }
  function openEditor(next: Editor) {
    writeToken.current++;
    setError(null);
    setDraft(null);
    setEditor(next);
  }
  function closeEditor() {
    writeToken.current++;
    setEditor(null);
    setDraft(null);
    setError(null);
  }
  function closeReview() {
    writeToken.current++;
    setReview(null);
    setError(null);
  }
  return (
    <div className="flex min-w-0 flex-col gap-10">
      {error && !editor && !review && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <CommonCatalogSection
        common={data.common}
        pending={pending}
        onPrepare={prepare}
        onEdit={(item) => openEditor({ kind: "common", item })}
      />
      <ProgramOutcomesSection
        programs={data.programs}
        pending={pending}
        onPrepare={prepare}
        onEdit={(program, item) => openEditor({ kind: "po", program, item })}
      />
      <InstitutionalOutcomesSection outcomes={data.institutional} />
      <OutcomeEditorDialog
        editor={review ? null : editor}
        draft={review ? null : draft}
        common={data.common}
        pending={pending}
        error={error}
        onPrepare={prepare}
        onClose={closeEditor}
      />
      <OutcomeReviewDialog
        review={review}
        error={error}
        pending={pending}
        onClose={closeReview}
        onConfirm={save}
      />
    </div>
  );
}
