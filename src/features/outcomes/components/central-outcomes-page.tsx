"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { PO_CLASSIFICATION_LABELS } from "../po-classification";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from "@/components/ui/responsive-dialog";

type CommonOutcome = CentralOutcomeAdministration["common"][number];
type ProgramOutcome = CentralOutcomeAdministration["programs"][number]["pos"][number];
type AdministrativeClassification = "COMMON" | "INSTITUTION_SPECIFIC";

type Review = OutcomeWriteReview;

type Prepare = (value: unknown) => void;

function CommonCatalogForm({
  editing,
  pending,
  onPrepare,
  onCancelEdit,
}: {
  editing: CommonOutcome | null;
  pending: boolean;
  onPrepare: Prepare;
  onCancelEdit: () => void;
}) {
  return (
    <form
      key={editing?.id ?? "new"}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        onPrepare({
          kind: "COMMON_PO",
          action: editing ? "update" : "create",
          ...(editing ? { id: editing.id } : {}),
          code: fields.get("code"),
          description: fields.get("description"),
          sourceRef: fields.get("sourceRef"),
        });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="common-code">Common PO code</FieldLabel>
          <Input
            id="common-code"
            name="code"
            defaultValue={editing?.code}
            required
            maxLength={20}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="common-description">Approved statement</FieldLabel>
          <Textarea
            id="common-description"
            name="description"
            defaultValue={editing?.description}
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
            defaultValue={editing?.source_ref ?? ""}
            maxLength={1000}
          />
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Review {editing ? "correction" : "new Common PO"}
        </Button>
        {editing && (
          <Button type="button" variant="outline" onClick={onCancelEdit}>
            Cancel edit
          </Button>
        )}
      </div>
    </form>
  );
}

function CommonCatalogRow({
  item,
  index,
  pending,
  onPrepare,
  onEdit,
  onMoveUp,
}: {
  item: CommonOutcome;
  index: number;
  pending: boolean;
  onPrepare: Prepare;
  onEdit: (item: CommonOutcome) => void;
  onMoveUp: () => void;
}) {
  return (
    <li className="border-border flex min-w-0 flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{item.code}</Badge>
        <Badge variant="outline">{item.is_active ? "Active" : "Archived"}</Badge>
        <span className="text-body-sm">
          {item._count.program_pos} program adoptions · {item._count.ge_mappings} GE mappings
        </span>
      </div>
      <p className="text-body-sm break-words">{item.description}</p>
      {item.source_ref && (
        <p className="text-body-sm text-muted-foreground break-words">{item.source_ref}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onEdit(item)}>
          Edit {item.code}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            onPrepare({
              kind: "COMMON_PO",
              action: item.is_active ? "archive" : "restore",
              id: item.id,
            })
          }
        >
          {item.is_active ? "Archive" : "Restore"}
        </Button>
        <Button variant="ghost" disabled={index === 0 || pending} onClick={onMoveUp}>
          Move up
        </Button>
      </div>
    </li>
  );
}

function CommonCatalogSection({
  common,
  editing,
  pending,
  onPrepare,
  onEdit,
  onCancelEdit,
}: {
  common: CommonOutcome[];
  editing: CommonOutcome | null;
  pending: boolean;
  onPrepare: Prepare;
  onEdit: (item: CommonOutcome) => void;
  onCancelEdit: () => void;
}) {
  const moveUp = (index: number) => {
    const ids = common.map((row) => row.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    onPrepare({ kind: "COMMON_PO", action: "reorder", orderedIds: ids });
  };
  return (
    <section className="flex flex-col gap-4" aria-labelledby="common-catalog-title">
      <h2 id="common-catalog-title" className="text-heading-lg">
        Shared Common PO catalog
      </h2>
      <CommonCatalogForm
        editing={editing}
        pending={pending}
        onPrepare={onPrepare}
        onCancelEdit={onCancelEdit}
      />
      {common.length === 0 && (
        <p className="text-body-sm text-muted-foreground">
          No Common POs yet. Add a shared definition before adopting it or mapping GE CILOs.
        </p>
      )}
      <ol className="flex flex-col gap-3">
        {common.map((item, index) => (
          <CommonCatalogRow
            key={item.id}
            item={item}
            index={index}
            pending={pending}
            onPrepare={onPrepare}
            onEdit={onEdit}
            onMoveUp={() => moveUp(index)}
          />
        ))}
      </ol>
    </section>
  );
}

function ProgramOutcomeSection({
  programs,
  program,
  programId,
  onProgramChange,
  common,
  selected,
  classification,
  onClassificationChange,
  commonId,
  onCommonChange,
  poEditingId,
  onEditPO,
  onCancelEditPO,
  pending,
  onPrepare,
}: {
  programs: CentralOutcomeAdministration["programs"];
  program: CentralOutcomeAdministration["programs"][number] | undefined;
  programId: string;
  onProgramChange: (programId: string) => void;
  common: CommonOutcome[];
  selected: CommonOutcome | undefined;
  classification: AdministrativeClassification;
  onClassificationChange: (value: AdministrativeClassification) => void;
  commonId: string;
  onCommonChange: (commonId: string) => void;
  poEditingId: string;
  onEditPO: (item: ProgramOutcome) => void;
  onCancelEditPO: () => void;
  pending: boolean;
  onPrepare: Prepare;
}) {
  const editingPO = program?.pos.find((item) => item.id === poEditingId);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="program-adoption-title">
      <h2 id="program-adoption-title" className="text-heading-lg">
        Program Common and Institution-specific POs
      </h2>
      <Field>
        <FieldLabel htmlFor="admin-po-program">Program</FieldLabel>
        <Select value={programId} onValueChange={(value) => onProgramChange(value ?? "")}>
          <SelectTrigger id="admin-po-program" className="w-full">
            <SelectValue>{program?.code ?? "Select program"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {programs.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <ProgramOutcomeForm
        programId={programId}
        editingPO={editingPO}
        poEditingId={poEditingId}
        classification={classification}
        onClassificationChange={onClassificationChange}
        common={common}
        selected={selected}
        commonId={commonId}
        onCommonChange={onCommonChange}
        onCancelEditPO={onCancelEditPO}
        pending={pending}
        onPrepare={onPrepare}
      />
      {program?.pos.map((item) => (
        <ProgramOutcomeRow
          key={item.id}
          item={item}
          pending={pending}
          onEdit={onEditPO}
          onPrepare={onPrepare}
          programId={programId}
        />
      ))}
    </section>
  );
}

function ClassificationFields({
  classification,
  onClassificationChange,
  common,
  selected,
  commonId,
  onCommonChange,
}: {
  classification: AdministrativeClassification;
  onClassificationChange: (value: AdministrativeClassification) => void;
  common: CommonOutcome[];
  selected: CommonOutcome | undefined;
  commonId: string;
  onCommonChange: (commonId: string) => void;
}) {
  const activeCommon = common.filter((item) => item.is_active);
  return (
    <>
      <Field>
        <FieldLabel htmlFor="admin-po-category">Classification</FieldLabel>
        <Select
          value={classification}
          onValueChange={(value) => {
            if (value === "COMMON" || value === "INSTITUTION_SPECIFIC")
              onClassificationChange(value);
          }}
        >
          <SelectTrigger id="admin-po-category" className="w-full">
            <SelectValue>
              {classification === "COMMON" ? "Common" : "Institution-specific"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="COMMON">Common</SelectItem>
              <SelectItem value="INSTITUTION_SPECIFIC">Institution-specific</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      {classification === "COMMON" && (
        <Field>
          <FieldLabel htmlFor="admin-common-reference">Shared Common PO</FieldLabel>
          <Select value={commonId || null} onValueChange={(value) => onCommonChange(value ?? "")}>
            <SelectTrigger id="admin-common-reference" className="w-full">
              <SelectValue>{selected?.code ?? "Select a Common PO"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {activeCommon.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.code} · {item.description}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-body-sm">{selected?.description}</p>
        </Field>
      )}
    </>
  );
}

function ProgramOutcomeForm({
  programId,
  editingPO,
  poEditingId,
  classification,
  onClassificationChange,
  common,
  selected,
  commonId,
  onCommonChange,
  onCancelEditPO,
  pending,
  onPrepare,
}: {
  programId: string;
  editingPO: ProgramOutcome | undefined;
  poEditingId: string;
  classification: AdministrativeClassification;
  onClassificationChange: (value: AdministrativeClassification) => void;
  common: CommonOutcome[];
  selected: CommonOutcome | undefined;
  commonId: string;
  onCommonChange: (commonId: string) => void;
  onCancelEditPO: () => void;
  pending: boolean;
  onPrepare: Prepare;
}) {
  return (
    <form
      key={`${programId}:${poEditingId}`}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        onPrepare({
          kind: "PO",
          action: poEditingId ? "update" : "create",
          ...(poEditingId ? { id: poEditingId } : {}),
          programId,
          code: fields.get("code"),
          description:
            classification === "COMMON" ? selected?.description : fields.get("description"),
          classification,
          commonOutcomeId: classification === "COMMON" ? commonId : null,
        });
      }}
    >
      <FieldGroup>
        <ClassificationFields
          classification={classification}
          onClassificationChange={onClassificationChange}
          common={common}
          selected={selected}
          commonId={commonId}
          onCommonChange={onCommonChange}
        />
        <Field>
          <FieldLabel htmlFor="admin-local-code">Program-local PO code</FieldLabel>
          <Input
            id="admin-local-code"
            name="code"
            required
            maxLength={20}
            defaultValue={editingPO?.code}
          />
        </Field>
        {classification === "INSTITUTION_SPECIFIC" && (
          <Field>
            <FieldLabel htmlFor="admin-local-description">Program outcome statement</FieldLabel>
            <Textarea
              id="admin-local-description"
              name="description"
              required
              minLength={3}
              maxLength={1000}
              defaultValue={editingPO?.description}
            />
          </Field>
        )}
      </FieldGroup>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || !programId} type="submit">
          Review program PO
        </Button>
        {poEditingId && (
          <Button type="button" variant="outline" onClick={onCancelEditPO}>
            Cancel edit
          </Button>
        )}
      </div>
    </form>
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
  onEdit: (item: ProgramOutcome) => void;
  onPrepare: Prepare;
}) {
  return (
    <article className="border-border flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{item.code}</Badge>
        <Badge variant="secondary">{PO_CLASSIFICATION_LABELS[item.classification]}</Badge>
        <Badge variant="outline">{item.is_active ? "Active" : "Archived"}</Badge>
      </div>
      <p className="text-body-sm break-words">{item.description}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => onEdit(item)}>
          Edit
        </Button>
        <Button
          variant="outline"
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
          {item.is_active ? "Archive" : "Restore"}
        </Button>
      </div>
    </article>
  );
}

function OutcomeReviewDialog({
  review,
  error,
  pending,
  onClose,
  onConfirm,
}: {
  review: Review | null;
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
          <h3 className="text-heading-md">Before</h3>
          <pre className="bg-muted text-body-sm overflow-auto rounded-lg p-3 break-all whitespace-pre-wrap">
            {JSON.stringify(review?.before, null, 2)}
          </pre>
          <h3 className="text-heading-md">After</h3>
          <pre className="bg-muted text-body-sm overflow-auto rounded-lg p-3 break-all whitespace-pre-wrap">
            {JSON.stringify(review?.after, null, 2)}
          </pre>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={pending} onClick={onClose}>
              Back
            </Button>
            <Button loading={pending} onClick={onConfirm}>
              Confirm change
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function CentralOutcomesPage({ data }: { data: CentralOutcomeAdministration }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [editing, setEditing] = useState<CommonOutcome | null>(null);
  const [programId, setProgramId] = useState(data.programs[0]?.id ?? "");
  const [poEditingId, setPOEditingId] = useState("");
  const program = data.programs.find((item) => item.id === programId);
  const [classification, setClassification] = useState<AdministrativeClassification>("COMMON");
  const [commonId, setCommonId] = useState("");
  const selected = data.common.find((item) => item.id === commonId);

  function prepare(value: unknown) {
    setError(null);
    startTransition(async () => {
      const result = await reviewCentralOutcomeAction(value);
      if (result.success) setReview(result.data);
      else setError(result.error);
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
      setEditing(null);
      setPOEditingId("");
      setCommonId("");
      router.refresh();
    });
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header>
        <h1 className="text-heading-xl">Common and Institution-specific outcomes</h1>
        <p className="text-body-sm text-muted-foreground mt-1">
          Secretary and Dean manage the shared Common PO catalog and its program adoptions.
          Institutional Learning Outcomes remain separate.
        </p>
      </header>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <CommonCatalogSection
        common={data.common}
        editing={editing}
        pending={pending}
        onPrepare={prepare}
        onEdit={setEditing}
        onCancelEdit={() => setEditing(null)}
      />
      <ProgramOutcomeSection
        programs={data.programs}
        program={program}
        programId={programId}
        onProgramChange={(next) => {
          setProgramId(next);
          setPOEditingId("");
        }}
        common={data.common}
        selected={selected}
        classification={classification}
        onClassificationChange={setClassification}
        commonId={commonId}
        onCommonChange={setCommonId}
        poEditingId={poEditingId}
        onEditPO={(item) => {
          setPOEditingId(item.id);
          // A legacy UNCLASSIFIED row adopts as Institution-specific by
          // default; the reviewer can still choose Common.
          setClassification(item.classification === "COMMON" ? "COMMON" : "INSTITUTION_SPECIFIC");
          setCommonId(item.common_outcome_id ?? "");
        }}
        onCancelEditPO={() => setPOEditingId("")}
        pending={pending}
        onPrepare={prepare}
      />
      <OutcomeReviewDialog
        review={review}
        error={error}
        pending={pending}
        onClose={() => setReview(null)}
        onConfirm={save}
      />
    </div>
  );
}
